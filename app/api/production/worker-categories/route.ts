import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - Lấy danh sách danh mục nhân viên
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const isActive = searchParams.get("isActive");

        let sql = `
            SELECT * FROM production_worker_categories
            WHERE 1=1
        `;
        const params: any[] = [];

        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (category_name ILIKE $${params.length} OR category_code ILIKE $${params.length})`;
        }

        if (isActive !== null && isActive !== "") {
            params.push(isActive === "true");
            sql += ` AND is_active = $${params.length}`;
        }

        sql += ` ORDER BY category_name ASC`;

        const result = await query(sql, params);

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Error fetching worker categories:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi lấy danh sách danh mục" },
            { status: 500 }
        );
    }
}

// POST - Tạo danh mục mới
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { categoryCode, categoryName, description, hourlyRate } = body;

        if (!categoryCode || !categoryName) {
            return NextResponse.json(
                { success: false, error: "Mã và tên danh mục là bắt buộc" },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO production_worker_categories 
            (category_code, category_name, description, hourly_rate)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [categoryCode, categoryName, description || null, hourlyRate || 0]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error: any) {
        console.error("Error creating worker category:", error);
        if (error.code === "23505") {
            return NextResponse.json(
                { success: false, error: "Mã danh mục đã tồn tại" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Lỗi khi tạo danh mục" },
            { status: 500 }
        );
    }
}
