import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - Lấy danh sách nhân viên sản xuất
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId");
        const branchId = searchParams.get("branchId");
        const isActive = searchParams.get("isActive");
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "20");

        let sql = `
            SELECT 
                w.*,
                c.category_name,
                c.category_code,
                b.branch_name
            FROM production_workers w
            LEFT JOIN production_worker_categories c ON w.category_id = c.id
            LEFT JOIN branches b ON w.branch_id = b.id
            WHERE 1=1
        `;
        let countSql = `SELECT COUNT(*) FROM production_workers w WHERE 1=1`;
        const params: any[] = [];
        const countParams: any[] = [];

        if (search) {
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
            sql += ` AND (w.full_name ILIKE $${params.length} OR w.worker_code ILIKE $${params.length} OR w.phone ILIKE $${params.length})`;
            countSql += ` AND (w.full_name ILIKE $${countParams.length} OR w.worker_code ILIKE $${countParams.length} OR w.phone ILIKE $${countParams.length})`;
        }

        if (categoryId) {
            params.push(categoryId);
            countParams.push(categoryId);
            sql += ` AND w.category_id = $${params.length}`;
            countSql += ` AND w.category_id = $${countParams.length}`;
        }

        if (branchId) {
            params.push(branchId);
            countParams.push(branchId);
            sql += ` AND w.branch_id = $${params.length}`;
            countSql += ` AND w.branch_id = $${countParams.length}`;
        }

        if (isActive !== null && isActive !== "") {
            params.push(isActive === "true");
            countParams.push(isActive === "true");
            sql += ` AND w.is_active = $${params.length}`;
            countSql += ` AND w.is_active = $${countParams.length}`;
        }

        // Count total
        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);

        // Add pagination
        sql += ` ORDER BY w.full_name ASC`;
        sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(pageSize, (page - 1) * pageSize);

        const result = await query(sql, params);

        return NextResponse.json({
            success: true,
            data: result.rows,
            total,
            page,
            pageSize,
        });
    } catch (error) {
        console.error("Error fetching workers:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi lấy danh sách nhân viên" },
            { status: 500 }
        );
    }
}

// POST - Tạo nhân viên mới
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fullName, phone, email, address, categoryId, branchId, hireDate, hourlyRate, notes } = body;

        if (!fullName) {
            return NextResponse.json(
                { success: false, error: "Tên nhân viên là bắt buộc" },
                { status: 400 }
            );
        }

        // Tự động tạo mã nhân viên: NV + YYMMDD + số thứ tự 3 chữ số
        const codeResult = await query(
            `SELECT 'NV' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(worker_code FROM 9)::INTEGER), 0) + 1)::TEXT, 3, '0') as code
             FROM production_workers 
             WHERE worker_code LIKE 'NV' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
        );
        const workerCode = codeResult.rows[0].code;

        // Nếu có categoryId và không có hourlyRate, lấy hourlyRate từ category
        let finalHourlyRate = hourlyRate;
        if (categoryId && (hourlyRate === undefined || hourlyRate === null || hourlyRate === 0)) {
            const categoryResult = await query(
                `SELECT hourly_rate FROM production_worker_categories WHERE id = $1`,
                [categoryId]
            );
            if (categoryResult.rows.length > 0) {
                finalHourlyRate = categoryResult.rows[0].hourly_rate || 0;
            }
        }

        const result = await query(
            `INSERT INTO production_workers 
            (worker_code, full_name, phone, email, address, category_id, branch_id, hire_date, hourly_rate, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [workerCode, fullName, phone || null, email || null, address || null, 
             categoryId || null, branchId || null, hireDate || null, finalHourlyRate || 0, notes || null]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error: any) {
        console.error("Error creating worker:", error);
        if (error.code === "23505") {
            return NextResponse.json(
                { success: false, error: "Mã nhân viên đã tồn tại" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Lỗi khi tạo nhân viên" },
            { status: 500 }
        );
    }
}
