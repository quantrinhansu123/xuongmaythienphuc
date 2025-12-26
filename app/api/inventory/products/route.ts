import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy tồn kho thành phẩm theo warehouse
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

    if (!warehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu warehouseId'
      }, { status: 400 });
    }

    // Data segregation - Kiểm tra quyền truy cập kho
    let additionalWhere = '';
    let params: any[] = [warehouseId];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      // User chỉ xem được sản phẩm thuộc chi nhánh của mình
      additionalWhere = ' AND p.branch_id = $2';
      params.push(currentUser.branchId);
    }

    // ✅ CHỈ hiển thị sản phẩm có tồn kho thực tế (quantity > 0)
    // Điều này quan trọng cho chức năng xuất kho - không thể xuất những gì không có
    console.log(`🔍 [Inventory Products] Query params:`, { warehouseId, additionalWhere, params });
    
    const result = await query(
      `SELECT 
        p.id,
        p.product_code as "itemCode",
        p.product_name as "itemName",
        CAST(ib.quantity AS DECIMAL(10,3)) as quantity,
        p.unit
       FROM inventory_balances ib
       JOIN products p ON p.id = ib.product_id
       WHERE ib.warehouse_id = $1 AND ib.quantity > 0 AND ib.product_id IS NOT NULL AND p.is_active = true${additionalWhere}
       ORDER BY p.product_name`,
      params
    );

    console.log(`📦 [Inventory Products] Found ${result.rows.length} products with stock in warehouse ${warehouseId}`);
    console.log(`📦 [Inventory Products] Data:`, result.rows);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get inventory products error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
