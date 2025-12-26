import { query } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { ApiResponse } from "@/types";
import { NextRequest, NextResponse } from "next/server";

// PUT - Cập nhật kho nguồn và kho đích cho đơn sản xuất
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission(
      "production.orders",
      "edit"
    );
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: error || "Không có quyền cập nhật đơn sản xuất",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { sourceWarehouseId, targetWarehouseId } = body;

    // Kiểm tra đơn sản xuất tồn tại
    const checkResult = await query(
      "SELECT id, status FROM production_orders WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Không tìm thấy đơn sản xuất",
        },
        { status: 404 }
      );
    }

    // Cập nhật kho
    await query(
      `UPDATE production_orders 
       SET source_warehouse_id = $1, target_warehouse_id = $2
       WHERE id = $3`,
      [sourceWarehouseId || null, targetWarehouseId || null, id]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Đã cập nhật thông tin kho",
    });
  } catch (error) {
    console.error("Update production warehouses error:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Lỗi server",
      },
      { status: 500 }
    );
  }
}
