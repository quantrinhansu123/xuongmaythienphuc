import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PUT - Cập nhật các ngày của đơn sản xuất
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { workerHandoverDate, fittingDate, completionDate, salePerson } = body;

        const result = await query(
            `UPDATE production_orders 
            SET worker_handover_date = $1,
                fitting_date = $2,
                completion_date = $3,
                sale_person = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *`,
            [workerHandoverDate || null, fittingDate || null, completionDate || null, salePerson || null, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Không tìm thấy đơn sản xuất" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Error updating production dates:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi cập nhật thông tin" },
            { status: 500 }
        );
    }
}
