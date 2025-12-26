import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem tồn kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const showAll = searchParams.get('showAll') !== 'false'; // Mặc định hiển thị tất cả

    if (!warehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu warehouseId'
      }, { status: 400 });
    }

    // Lấy thông tin kho
    const warehouseInfo = await query(
      'SELECT id, warehouse_name, warehouse_type, branch_id FROM warehouses WHERE id = $1',
      [parseInt(warehouseId)]
    );

    if (warehouseInfo.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho'
      }, { status: 404 });
    }

    const warehouse = warehouseInfo.rows[0];
    const warehouseType = warehouse.warehouse_type;
    const warehouseBranchId = warehouse.branch_id;

    // Kiểm tra quyền truy cập kho
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId !== warehouseBranchId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không có quyền truy cập kho này'
      }, { status: 403 });
    }

    console.log('🔍 [Inventory Balance] Fetching data for:', {
      warehouseId: parseInt(warehouseId),
      warehouseName: warehouse.warehouse_name,
      warehouseType,
      branchId: warehouseBranchId,
      showAll,
      userRole: currentUser.roleCode
    });

    let details;
    let summary;

    if (warehouseType === 'NVL') {
      if (showAll) {
        details = await query(
          `SELECT 
            $1::INTEGER as "warehouseId",
            $3 as "warehouseName",
            m.id as "materialId",
            NULL::INTEGER as "productId",
            m.material_code as "itemCode",
            m.material_name as "itemName",
            'NVL' as "itemType",
            CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
            m.unit,
            COALESCE(bi.custom_price, i.cost_price, 0) as "unitPrice"
           FROM items i
           JOIN materials m ON i.material_id = m.id
           JOIN branch_items bi ON bi.item_id = i.id AND bi.branch_id = $2 AND bi.is_available = true
           LEFT JOIN inventory_balances ib ON ib.material_id = m.id AND ib.warehouse_id = $1
           WHERE i.item_type = 'MATERIAL'
           ORDER BY m.material_name`,
          [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]
        );
      } else {
        details = await query(
          `SELECT 
            ib.warehouse_id as "warehouseId",
            $3 as "warehouseName",
            m.id as "materialId",
            NULL::INTEGER as "productId",
            m.material_code as "itemCode",
            m.material_name as "itemName",
            'NVL' as "itemType",
            CAST(ib.quantity AS DECIMAL(10,3)) as quantity,
            m.unit,
            COALESCE(bi.custom_price, i.cost_price, 0) as "unitPrice"
           FROM inventory_balances ib
           JOIN materials m ON m.id = ib.material_id
           JOIN items i ON i.material_id = m.id
           JOIN branch_items bi ON bi.item_id = i.id AND bi.branch_id = $2 AND bi.is_available = true
           WHERE ib.warehouse_id = $1 AND ib.quantity > 0
           ORDER BY m.material_name`,
          [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]
        );
      }

      console.log(`📊 [Inventory Balance] Found ${details.rows.length} materials for warehouse ${warehouseId}`);

      // Summary cho NVL
      summary = await query(
        `SELECT 
          m.material_code as "itemCode",
          m.material_name as "itemName",
          'NVL' as "itemType",
          CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as "totalQuantity",
          m.unit
         FROM materials m
         LEFT JOIN inventory_balances ib ON ib.material_id = m.id AND ib.warehouse_id = $1
         WHERE m.branch_id = $2
         GROUP BY m.id, m.material_code, m.material_name, m.unit
         ORDER BY m.material_name`,
        [parseInt(warehouseId), warehouseBranchId]
      );

    } else if (warehouseType === 'HON_HOP') {
      // Kho hỗn hợp: hiển thị cả NVL và thành phẩm
      if (showAll) {
        details = await query(
          `SELECT * FROM (
            SELECT 
              $1::INTEGER as "warehouseId",
              $3 as "warehouseName",
              m.id as "materialId",
              NULL::INTEGER as "productId",
              m.material_code as "itemCode",
              m.material_name as "itemName",
              'NVL' as "itemType",
              CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
              m.unit,
              COALESCE(bi.custom_price, i.cost_price, 0) as "unitPrice"
            FROM items i
            JOIN materials m ON i.material_id = m.id
            JOIN branch_items bi ON bi.item_id = i.id AND bi.branch_id = $2 AND bi.is_available = true
            LEFT JOIN inventory_balances ib ON ib.material_id = m.id AND ib.warehouse_id = $1
            WHERE i.item_type = 'MATERIAL'
            UNION ALL
            SELECT 
              $1::INTEGER as "warehouseId",
              $3 as "warehouseName",
              NULL::INTEGER as "materialId",
              p.id as "productId",
              p.product_code as "itemCode",
              p.product_name as "itemName",
              'THANH_PHAM' as "itemType",
              CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
              p.unit,
              COALESCE(bi.custom_price, i.cost_price, p.cost_price, 0) as "unitPrice"
            FROM items i
            JOIN products p ON i.product_id = p.id
            JOIN branch_items bi ON bi.item_id = i.id AND bi.branch_id = $2 AND bi.is_available = true
            LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = $1
            WHERE i.item_type = 'PRODUCT' AND p.is_active = true
          ) combined
          ORDER BY "itemType", "itemName"`,
          [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]
        );
      } else {
        details = await query(
          `SELECT * FROM (
            SELECT 
              ib.warehouse_id as "warehouseId",
              $3 as "warehouseName",
              m.id as "materialId",
              NULL::INTEGER as "productId",
              m.material_code as "itemCode",
              m.material_name as "itemName",
              'NVL' as "itemType",
              CAST(ib.quantity AS DECIMAL(10,3)) as quantity,
              m.unit,
              COALESCE(bi.custom_price, i.cost_price, 0) as "unitPrice"
            FROM inventory_balances ib
            JOIN materials m ON m.id = ib.material_id
            JOIN items i ON i.material_id = m.id
            JOIN branch_items bi ON bi.item_id = i.id AND bi.branch_id = $2 AND bi.is_available = true
            WHERE ib.warehouse_id = $1 AND ib.quantity > 0
            UNION ALL
            SELECT 
              ib.warehouse_id as "warehouseId",
              $3 as "warehouseName",
              NULL::INTEGER as "materialId",
              p.id as "productId",
              p.product_code as "itemCode",
              p.product_name as "itemName",
              'THANH_PHAM' as "itemType",
              CAST(ib.quantity AS DECIMAL(10,3)) as quantity,
              p.unit,
              COALESCE(bi.custom_price, i.cost_price, p.cost_price, 0) as "unitPrice"
            FROM inventory_balances ib
            JOIN products p ON p.id = ib.product_id
            JOIN items i ON i.product_id = p.id
            JOIN branch_items bi ON bi.item_id = i.id AND bi.branch_id = $2 AND bi.is_available = true
            WHERE ib.warehouse_id = $1 AND p.is_active = true AND ib.quantity > 0
          ) combined
          ORDER BY "itemType", "itemName"`,
          [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]
        );
      }

      console.log(`📊 [Inventory Balance] Found ${details.rows.length} items (mixed) for warehouse ${warehouseId}`);

      // Summary cho kho hỗn hợp
      summary = await query(
        `SELECT * FROM (
          SELECT 
            m.material_code as "itemCode",
            m.material_name as "itemName",
            'NVL' as "itemType",
            CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as "totalQuantity",
            m.unit
          FROM materials m
          LEFT JOIN inventory_balances ib ON ib.material_id = m.id AND ib.warehouse_id = $1
          WHERE m.branch_id = $2
          GROUP BY m.id, m.material_code, m.material_name, m.unit
          UNION ALL
          SELECT 
            p.product_code as "itemCode",
            p.product_name as "itemName",
            'THANH_PHAM' as "itemType",
            CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as "totalQuantity",
            p.unit
          FROM products p
          LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = $1
          WHERE p.branch_id = $2 AND p.is_active = true
          GROUP BY p.id, p.product_code, p.product_name, p.unit
        ) combined
        ORDER BY "itemType", "itemName"`,
        [parseInt(warehouseId), warehouseBranchId]
      );

    } else {
      // Kho thành phẩm (THANH_PHAM)
      if (showAll) {
        details = await query(
          `SELECT 
            $1::INTEGER as "warehouseId",
            $3 as "warehouseName",
            NULL::INTEGER as "materialId",
            p.id as "productId",
            p.product_code as "itemCode",
            p.product_name as "itemName",
            'THANH_PHAM' as "itemType",
            CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
            p.unit,
            COALESCE(bi.custom_price, i.cost_price, p.cost_price, 0) as "unitPrice"
           FROM items i
           JOIN products p ON i.product_id = p.id
           JOIN branch_items bi ON bi.item_id = i.id AND bi.branch_id = $2 AND bi.is_available = true
           LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = $1
           WHERE i.item_type = 'PRODUCT' AND p.is_active = true
           ORDER BY p.product_name`,
          [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]
        );
      } else {
        details = await query(
          `SELECT 
            ib.warehouse_id as "warehouseId",
            $3 as "warehouseName",
            NULL::INTEGER as "materialId",
            p.id as "productId",
            p.product_code as "itemCode",
            p.product_name as "itemName",
            'THANH_PHAM' as "itemType",
            CAST(ib.quantity AS DECIMAL(10,3)) as quantity,
            p.unit,
            COALESCE(bi.custom_price, i.cost_price, p.cost_price, 0) as "unitPrice"
           FROM inventory_balances ib
           JOIN products p ON p.id = ib.product_id
           JOIN items i ON i.product_id = p.id
           JOIN branch_items bi ON bi.item_id = i.id AND bi.branch_id = $2 AND bi.is_available = true
           WHERE ib.warehouse_id = $1 AND p.is_active = true AND ib.quantity > 0
           ORDER BY p.product_name`,
          [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]
        );
      }

      console.log(`📊 [Inventory Balance] Found ${details.rows.length} products for warehouse ${warehouseId}`);

      // Summary cho products
      summary = await query(
        `SELECT 
          p.product_code as "itemCode",
          p.product_name as "itemName",
          'THANH_PHAM' as "itemType",
          CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as "totalQuantity",
          p.unit
         FROM products p
         LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = $1
         WHERE p.branch_id = $2 AND p.is_active = true
         GROUP BY p.id, p.product_code, p.product_name, p.unit
         ORDER BY p.product_name`,
        [parseInt(warehouseId), warehouseBranchId]
      );
    }

    console.log(`✅ [Inventory Balance] Returning ${details.rows.length} details and ${summary.rows.length} summary items`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        details: details.rows,
        summary: summary.rows
      }
    });

  } catch (error) {
    console.error('❌ [Inventory Balance] Error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi server'
    }, { status: 500 });
  }
}
