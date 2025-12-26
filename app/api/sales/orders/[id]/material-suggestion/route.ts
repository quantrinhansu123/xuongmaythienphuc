import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem gợi ý nhập hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);

    // Lấy chi tiết đơn hàng (hàng hóa - items)
    const orderDetails = await query(
      `SELECT 
        od.item_id as "itemId",
        od.product_id as "productId",
        i.item_type as "itemType",
        i.material_id as "materialId",
        COALESCE(i.item_name, p.product_name) as "itemName",
        od.quantity as "orderQuantity"
       FROM order_details od
       LEFT JOIN items i ON i.id = od.item_id
       LEFT JOIN products p ON p.id = od.product_id
       WHERE od.order_id = $1`,
      [orderId]
    );

    if (orderDetails.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy hàng hóa trong đơn hàng'
      }, { status: 404 });
    }

    // Tính toán nguyên liệu cần thiết
    const materialNeeds: any = {};

    for (const detail of orderDetails.rows) {
      // Nếu item là MATERIAL (NVL) → chính nó là nguyên liệu cần
      if (detail.itemType === 'MATERIAL' && detail.materialId) {
        // Lấy thông tin NVL
        const materialResult = await query(
          `SELECT 
            id as "materialId",
            material_code as "materialCode",
            material_name as "materialName",
            unit
           FROM materials
           WHERE id = $1`,
          [detail.materialId]
        );

        if (materialResult.rows.length > 0) {
          const mat = materialResult.rows[0];
          if (!materialNeeds[mat.materialId]) {
            materialNeeds[mat.materialId] = {
              materialId: mat.materialId,
              materialCode: mat.materialCode,
              materialName: mat.materialName,
              unit: mat.unit,
              totalNeeded: 0,
              currentStock: 0,
              needToImport: 0,
              items: []
            };
          }
          materialNeeds[mat.materialId].totalNeeded += detail.orderQuantity;
          materialNeeds[mat.materialId].items.push({
            itemName: detail.itemName,
            quantity: detail.orderQuantity,
            materialPerItem: 1 // 1:1 vì bán trực tiếp NVL
          });
        }
      }
      // Nếu item là PRODUCT → tìm BOM của product
      else if (detail.productId) {
        // Lấy BOM của sản phẩm
        const bomResult = await query(
          `SELECT 
            b.material_id as "materialId",
            m.material_code as "materialCode",
            m.material_name as "materialName",
            b.quantity as "quantityPerProduct",
            b.unit,
            m.unit as "materialUnit"
           FROM bom b
           JOIN materials m ON m.id = b.material_id
           WHERE b.product_id = $1`,
          [detail.productId]
        );

        // Tính tổng nguyên liệu cần
        for (const bom of bomResult.rows) {
          const totalNeeded = bom.quantityPerProduct * detail.orderQuantity;
          
          if (!materialNeeds[bom.materialId]) {
            materialNeeds[bom.materialId] = {
              materialId: bom.materialId,
              materialCode: bom.materialCode,
              materialName: bom.materialName,
              unit: bom.unit || bom.materialUnit,
              totalNeeded: 0,
              currentStock: 0,
              needToImport: 0,
              items: []
            };
          }
          
          materialNeeds[bom.materialId].totalNeeded += totalNeeded;
          materialNeeds[bom.materialId].items.push({
            itemName: detail.itemName,
            quantity: detail.orderQuantity,
            materialPerItem: bom.quantityPerProduct
          });
        }
      }
    }

    // Lấy tồn kho hiện tại của các nguyên liệu trong chi nhánh
    const materialIds = Object.keys(materialNeeds).map(id => parseInt(id));
    
    if (materialIds.length > 0) {
      let stockResult;
      if (currentUser.roleCode === 'ADMIN') {
        // ADMIN xem tồn kho tất cả chi nhánh
        stockResult = await query(
          `SELECT 
            ib.material_id as "materialId",
            SUM(ib.quantity) as "totalStock"
           FROM inventory_balances ib
           WHERE ib.material_id = ANY($1)
           GROUP BY ib.material_id`,
          [materialIds]
        );
      } else {
        // User thường chỉ xem tồn kho trong chi nhánh
        stockResult = await query(
          `SELECT 
            ib.material_id as "materialId",
            SUM(ib.quantity) as "totalStock"
           FROM inventory_balances ib
           JOIN warehouses w ON w.id = ib.warehouse_id
           WHERE ib.material_id = ANY($1)
             AND w.branch_id = $2
           GROUP BY ib.material_id`,
          [materialIds, currentUser.branchId]
        );
      }

      // Cập nhật tồn kho và tính cần nhập
      for (const stock of stockResult.rows) {
        if (materialNeeds[stock.materialId]) {
          materialNeeds[stock.materialId].currentStock = parseFloat(stock.totalStock) || 0;
          materialNeeds[stock.materialId].needToImport = Math.max(
            0,
            materialNeeds[stock.materialId].totalNeeded - materialNeeds[stock.materialId].currentStock
          );
        }
      }
    }

    // Lấy danh sách kho trong chi nhánh (hoặc tất cả nếu ADMIN)
    let warehousesResult;
    if (currentUser.roleCode === 'ADMIN') {
      // ADMIN xem tất cả kho
      warehousesResult = await query(
        `SELECT 
          id,
          warehouse_code as "warehouseCode",
          warehouse_name as "warehouseName"
         FROM warehouses
         WHERE is_active = true
         ORDER BY warehouse_name`
      );
    } else {
      // User thường chỉ xem kho trong chi nhánh
      warehousesResult = await query(
        `SELECT 
          id,
          warehouse_code as "warehouseCode",
          warehouse_name as "warehouseName"
         FROM warehouses
         WHERE branch_id = $1 AND is_active = true
         ORDER BY warehouse_name`,
        [currentUser.branchId]
      );
    }

    console.log('Warehouses found:', warehousesResult.rows.length, 'for user:', currentUser.username, 'role:', currentUser.roleCode);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        materials: Object.values(materialNeeds),
        warehouses: warehousesResult.rows
      }
    });

  } catch (error) {
    console.error('Get material suggestion error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
