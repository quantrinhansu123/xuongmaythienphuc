import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - Lấy chi tiết danh mục
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const result = await query(
            "SELECT * FROM production_worker_categories WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy danh mục" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Error fetching worker category:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi lấy thông tin danh mục" },
            { status: 500 }
        );
    }
}

// PUT - Cập nhật danh mục
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { categoryCode, categoryName, description, hourlyRate, isActive } = body;

        const result = await query(
            `UPDATE production_worker_categories 
            SET category_code = COALESCE($1, category_code),
                category_name = COALESCE($2, category_name),
                description = $3,
                hourly_rate = COALESCE($4, hourly_rate),
                is_active = COALESCE($5, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *`,
            [categoryCode, categoryName, description, hourlyRate, isActive, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy danh mục" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error: any) {
        console.error("Error updating worker category:", error);
        if (error.code === "23505") {
            return NextResponse.json(
                { success: false, error: "Mã danh mục đã tồn tại" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Lỗi khi cập nhật danh mục" },
            { status: 500 }
        );
    }
}

// DELETE - Xóa danh mục
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Kiểm tra có nhân viên nào đang dùng danh mục này không
        const checkResult = await query(
            "SELECT COUNT(*) FROM production_workers WHERE category_id = $1",
            [id]
        );

        if (parseInt(checkResult.rows[0].count) > 0) {
            return NextResponse.json(
                { success: false, error: "Không thể xóa danh mục đang được sử dụng" },
                { status: 400 }
            );
        }

        const result = await query(
            "DELETE FROM production_worker_categories WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy danh mục" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Đã xóa danh mục",
        });
    } catch (error) {
        console.error("Error deleting worker category:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi xóa danh mục" },
            { status: 500 }
        );
    }
}
