import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - Lấy chi tiết nhân viên
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const result = await query(
            `SELECT 
                w.*,
                w.user_id as "userId",
                c.category_name,
                c.category_code,
                b.branch_name,
                u.username,
                u.full_name as "systemFullName"
            FROM production_workers w
            LEFT JOIN production_worker_categories c ON w.category_id = c.id
            LEFT JOIN branches b ON w.branch_id = b.id
            LEFT JOIN users u ON w.user_id = u.id
            WHERE w.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy nhân viên" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Error fetching worker:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi lấy thông tin nhân viên" },
            { status: 500 }
        );
    }
}

// PUT - Cập nhật nhân viên
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { workerCode, fullName, phone, email, address, categoryId, branchId, hireDate, hourlyRate, notes, isActive, userId } = body;

        const result = await query(
            `UPDATE production_workers 
            SET worker_code = COALESCE($1, worker_code),
                full_name = COALESCE($2, full_name),
                phone = $3,
                email = $4,
                address = $5,
                category_id = $6,
                branch_id = $7,
                hire_date = $8,
                hourly_rate = COALESCE($9, hourly_rate),
                notes = $10,
                is_active = COALESCE($11, is_active),
                user_id = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *`,
            [workerCode, fullName, phone, email, address, categoryId, branchId, hireDate, hourlyRate, notes, isActive, userId, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy nhân viên" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error: any) {
        console.error("Error updating worker:", error);
        if (error.code === "23505") {
            return NextResponse.json(
                { success: false, error: "Mã nhân viên đã tồn tại" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Lỗi khi cập nhật nhân viên" },
            { status: 500 }
        );
    }
}

// DELETE - Xóa nhân viên
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Kiểm tra nhân viên có đang được phân công không
        const checkResult = await query(
            "SELECT COUNT(*) FROM production_order_workers WHERE worker_id = $1",
            [id]
        );

        if (parseInt(checkResult.rows[0].count) > 0) {
            // Nếu có phân công, chuyển sang trạng thái Ngừng hoạt động thay vì xóa
            await query(
                "UPDATE production_workers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [id]
            );
            return NextResponse.json({
                success: true,
                message: "Nhân viên đã có lịch sử phân công nên đã được chuyển sang trạng thái 'Ngừng hoạt động' thay vì xóa",
                deactivated: true
            });
        }

        const result = await query(
            "DELETE FROM production_workers WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy nhân viên" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Đã xóa nhân viên",
        });
    } catch (error) {
        console.error("Error deleting worker:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi xóa nhân viên" },
            { status: 500 }
        );
    }
}
