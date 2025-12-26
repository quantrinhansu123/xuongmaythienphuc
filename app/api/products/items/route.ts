import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem hàng hoá'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const itemType = searchParams.get('type') || '';
    const sellableOnly = searchParams.get('sellable') === 'true';

    let sql = `
      SELECT DISTINCT ON (i.id)
        i.id,
        i.item_code as "itemCode",
        i.item_name as "itemName",
        i.item_type as "itemType",
        i.product_id as "productId",
        i.material_id as "materialId",
        i.category_id as "categoryId",
        i.unit,
        COALESCE(bi.custom_price, i.cost_price) as "costPrice",
        i.is_active as "isActive",
        COALESCE(i.is_sellable, i.item_type = 'PRODUCT') as "isSellable",
        i.created_at as "createdAt",
        CASE 
          WHEN i.item_type = 'PRODUCT' THEN p.product_name
          WHEN i.item_type = 'MATERIAL' THEN m.material_name
        END as "sourceName",
        CASE 
          WHEN i.item_type = 'PRODUCT' THEN p.product_code
          WHEN i.item_type = 'MATERIAL' THEN m.material_code
        END as "sourceCode",
        ic.category_name as "categoryName",
        bi.branch_id as "branchId",
        i.brand,
        i.model,
        i.color,
        i.size,
        i.length,
        i.width,
        i.height,
        i.weight,
        i.thickness,
        i.other_specs as "otherSpecs"
      FROM items i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN materials m ON i.material_id = m.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      LEFT JOIN branch_items bi ON bi.item_id = i.id
      WHERE 1=1
    `;
    const params: (string | boolean | number)[] = [];
    let paramIndex = 1;

    // Data segregation: Lọc theo branch_items (trừ ADMIN)
    if (currentUser.roleCode !== 'ADMIN') {
      sql += ` AND bi.branch_id = $${paramIndex} AND bi.is_available = true`;
      params.push(currentUser.branchId);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (i.item_code ILIKE $${paramIndex} OR i.item_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (itemType) {
      sql += ` AND i.item_type = $${paramIndex}`;
      params.push(itemType);
      paramIndex++;
    }

    if (sellableOnly) {
      sql += ` AND COALESCE(i.is_sellable, i.item_type = 'PRODUCT') = true`;
    }

    sql += ` ORDER BY i.id, i.created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get items error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo hàng hoá'
      }, { status: 403 });
    }

    const body = await request.json();
    let {
      itemCode, itemName, itemType, categoryId, unit, costPrice, isSellable,
      brand, model, color, size, length, width, height, weight, thickness, otherSpecs
    } = body;

    if (!itemName || !itemType || !unit) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin bắt buộc (tên, loại, đơn vị)'
      }, { status: 400 });
    }

    // Tự động tạo mã nếu không có
    if (!itemCode) {
      const prefix = 'HH';

      // Get the latest code from ALL tables (items, products, materials)
      const lastCodeResult = await query(
        `SELECT code FROM (
          SELECT item_code as code FROM items WHERE item_code ~ '^HH[0-9]+$'
          UNION ALL
          SELECT product_code as code FROM products WHERE product_code ~ '^HH[0-9]+$'
          UNION ALL
          SELECT material_code as code FROM materials WHERE material_code ~ '^HH[0-9]+$'
        ) combined
        ORDER BY SUBSTRING(code FROM 3)::INTEGER DESC 
        LIMIT 1`
      );

      let sequence = 1;
      if (lastCodeResult.rows.length > 0) {
        const lastCode = lastCodeResult.rows[0].code;
        const lastSeq = parseInt(lastCode.substring(2));
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }

      itemCode = `${prefix}${sequence.toString().padStart(4, '0')}`;
    }

    if (!['PRODUCT', 'MATERIAL'].includes(itemType)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Loại hàng hoá không hợp lệ'
      }, { status: 400 });
    }

    const branchId = currentUser.branchId;

    await query('BEGIN');

    try {
      let productId = null;
      let materialId = null;

      // Tạo product hoặc material (không cần branch_id nữa - master data)
      if (itemType === 'PRODUCT') {
        const productResult = await query(
          `INSERT INTO products (product_code, product_name, unit, cost_price, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id`,
          [itemCode, itemName, unit, costPrice || 0]
        );
        productId = productResult.rows[0].id;
      } else {
        const materialResult = await query(
          `INSERT INTO materials (material_code, material_name, unit)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [itemCode, itemName, unit]
        );
        materialId = materialResult.rows[0].id;
      }

      const sellable = isSellable !== undefined ? isSellable : (itemType === 'PRODUCT');

      // Tạo item (master data)
      const result = await query(
        `INSERT INTO items (
          item_code, item_name, item_type, product_id, material_id, category_id, unit, cost_price, is_sellable,
          brand, model, color, size, length, width, height, weight, thickness, other_specs
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING id, item_code as "itemCode", item_name as "itemName", item_type as "itemType", is_sellable as "isSellable", cost_price as "costPrice"`,
        [
          itemCode, itemName, itemType, productId, materialId, categoryId || null, unit, costPrice || 0, sellable,
          brand, model, color, size, length, width, height, weight, thickness, otherSpecs
        ]
      );

      // Tạo branch_items để enable cho chi nhánh hiện tại
      await query(
        `INSERT INTO branch_items (item_id, branch_id, is_available)
         VALUES ($1, $2, true)`,
        [result.rows[0].id, branchId]
      );

      await query('COMMIT');

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result.rows[0],
        message: `Tạo hàng hoá thành công`
      });

    } catch (innerError) {
      await query('ROLLBACK');
      throw innerError;
    }

  } catch (error: any) {
    console.error('Create item error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã hàng hoá đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Unknown error')
    }, { status: 500 });
  }
}
