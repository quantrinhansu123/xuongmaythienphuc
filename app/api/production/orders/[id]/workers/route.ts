import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - Lấy danh sách nhân viên được phân công vào đơn sản xuất
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const result = await query(
            `SELECT 
                pow.*,
                w.worker_code,
                w.full_name,
                w.phone,
                c.category_name
            FROM production_order_workers pow
            JOIN production_workers w ON pow.worker_id = w.id
            LEFT JOIN production_worker_categories c ON w.category_id = c.id
            WHERE pow.production_order_id = $1
            ORDER BY pow.assigned_at DESC`,
            [id]
        );

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Error fetching order workers:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi lấy danh sách nhân viên" },
            { status: 500 }
        );
    }
}

// POST - Thêm nhân viên vào đơn sản xuất
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { workerId, assignedStep, notes, createdBy } = body;

        if (!workerId) {
            return NextResponse.json(
                { success: false, error: "Vui lòng chọn nhân viên" },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO production_order_workers 
            (production_order_id, worker_id, assigned_step, notes, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [id, workerId, assignedStep || null, notes || null, createdBy || null]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error: any) {
        console.error("Error adding worker to order:", error);
        if (error.code === "23505") {
            return NextResponse.json(
                { success: false, error: "Nhân viên đã được phân công vào công đoạn này" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Lỗi khi thêm nhân viên" },
            { status: 500 }
        );
    }
}

// DELETE - Xóa nhân viên khỏi đơn sản xuất
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const assignmentId = searchParams.get("assignmentId");

        if (!assignmentId) {
            return NextResponse.json(
                { success: false, error: "Thiếu ID phân công" },
                { status: 400 }
            );
        }

        const result = await query(
            "DELETE FROM production_order_workers WHERE id = $1 RETURNING *",
            [assignmentId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy phân công" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Đã xóa phân công",
        });
    } catch (error) {
        console.error("Error removing worker from order:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi xóa phân công" },
            { status: 500 }
        );
    }
}
