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
    // const showAll = searchParams.get('showAll') !== 'false'; // Loại bỏ showAll cũ
    const status = searchParams.get('status') || 'all'; // all, in_stock, out_of_stock, low_stock

    if (!warehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu warehouseId'
      }, { status: 400 });
    }

    let details;
    let summary;

    // Helper: Generate SQL conditions based on status
    const getStatusCondition = (tableAlias: string, isAggregate: boolean = false) => {
      const col = isAggregate ? `COALESCE(SUM(${tableAlias}.quantity), 0)` : `COALESCE(${tableAlias}.quantity, 0)`;

      switch (status) {
        case 'in_stock':
          return isAggregate ? `HAVING ${col} > 0` : `AND ${col} > 0`;
        case 'out_of_stock':
          return isAggregate ? `HAVING ${col} <= 0` : `AND ${col} <= 0`;
        case 'low_stock':
          return isAggregate ? `HAVING ${col} > 0 AND ${col} <= 10` : `AND ${col} > 0 AND ${col} <= 10`;
        case 'all':
        default:
          return ''; // No filter
      }
    };

    // Xử lý trường hợp "Toàn hệ thống" (warehouseId = 0)
    if (warehouseId === '0') {
      if (currentUser.roleCode !== 'ADMIN') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Chỉ Admin mới được xem toàn hệ thống'
        }, { status: 403 });
      }

      console.log('🔍 [Inventory Balance] Fetching ALL SYSTEM data with status:', status);

      const havingClause = getStatusCondition('ib', true);
      console.log('🔍 [Inventory Balance] Generated HAVING clause:', havingClause);

      const allQuery = `
          SELECT * FROM (
            SELECT 
              0 as "warehouseId",
              'Toàn hệ thống' as "warehouseName",
              m.id as "materialId",
              NULL::INTEGER as "productId",
              m.material_code as "itemCode",
              m.material_name as "itemName",
              'NVL' as "itemType",
              CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as quantity,
              m.unit,
              COALESCE(MAX(i.cost_price), 0) as "unitPrice"
            FROM items i
            JOIN materials m ON i.material_id = m.id
            LEFT JOIN inventory_balances ib ON ib.material_id = m.id
            WHERE i.item_type = 'MATERIAL'
            GROUP BY m.id, m.material_code, m.material_name, m.unit
            ${havingClause}

            UNION ALL

            SELECT 
              0 as "warehouseId",
              'Toàn hệ thống' as "warehouseName",
              NULL::INTEGER as "materialId",
              p.id as "productId",
              p.product_code as "itemCode",
              p.product_name as "itemName",
              'THANH_PHAM' as "itemType",
              CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as quantity,
              p.unit,
              COALESCE(MAX(p.cost_price), 0) as "unitPrice"
            FROM items i
            JOIN products p ON i.product_id = p.id
            LEFT JOIN inventory_balances ib ON ib.product_id = p.id
            WHERE i.item_type = 'PRODUCT' AND p.is_active = true
            GROUP BY p.id, p.product_code, p.product_name, p.unit
            ${havingClause}
          ) combined
          ORDER BY "itemType", "itemName"
      `;

      details = await query(allQuery);

      summary = await query(`
         SELECT * FROM (
          SELECT 
            m.material_code as "itemCode",
            m.material_name as "itemName",
            'NVL' as "itemType",
            CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as "totalQuantity",
            m.unit
          FROM materials m
          LEFT JOIN inventory_balances ib ON ib.material_id = m.id
          GROUP BY m.id, m.material_code, m.material_name, m.unit
          ${havingClause}
          
          UNION ALL
          
          SELECT 
            p.product_code as "itemCode",
            p.product_name as "itemName",
            'THANH_PHAM' as "itemType",
            CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as "totalQuantity",
            p.unit
          FROM products p
          LEFT JOIN inventory_balances ib ON ib.product_id = p.id
          WHERE p.is_active = true
          GROUP BY p.id, p.product_code, p.product_name, p.unit
          ${havingClause}
        ) combined
        ORDER BY "itemType", "itemName"
      `);

    } else {
      // Logic cũ cho từng kho cụ thể
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
        status
      });

      const whereClause = getStatusCondition('ib', false);
      const summaryHavingClause = getStatusCondition('ib', true);

      if (warehouseType === 'NVL') {
        const queryText = `
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
               ${whereClause}
               ORDER BY m.material_name
           `;

        details = await query(queryText, [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]);

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
             ${summaryHavingClause}
             ORDER BY m.material_name`,
          [parseInt(warehouseId), warehouseBranchId]
        );

      } else if (warehouseType === 'HON_HOP') {
        // Kho hỗn hợp: hiển thị cả NVL và thành phẩm
        const queryText = `
            SELECT * FROM (
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
                ${whereClause}
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
                ${whereClause}
              ) combined
              ORDER BY "itemType", "itemName"
           `;

        details = await query(queryText, [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]);

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
              ${summaryHavingClause}
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
              ${summaryHavingClause}
            ) combined
            ORDER BY "itemType", "itemName"`,
          [parseInt(warehouseId), warehouseBranchId]
        );

      } else {
        // Kho thành phẩm (THANH_PHAM)
        const queryText = `
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
               ${whereClause}
               ORDER BY p.product_name
           `;

        details = await query(queryText, [parseInt(warehouseId), warehouseBranchId, warehouse.warehouse_name]);

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
             ${summaryHavingClause}
             ORDER BY p.product_name`,
          [parseInt(warehouseId), warehouseBranchId]
        );
      }
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
