import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - Lấy danh sách nhân viên sản xuất
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId");
        const branchId = searchParams.get("branchId");
        const isActive = searchParams.get("isActive") || "true";
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "20");

        let sql = `
            SELECT 
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

        if (isActive !== "all") {
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

// DELETE - Xóa hàng loạt nhân viên
export async function DELETE(request: NextRequest) {
    try {
        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, error: "Thiếu danh sách ID cần xóa" },
                { status: 400 }
            );
        }

        let deletedCount = 0;
        let deactivatedCount = 0;

        for (const id of ids) {
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
                deactivatedCount++;
            } else {
                await query("DELETE FROM production_workers WHERE id = $1", [id]);
                deletedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Thành công: Đã xóa ${deletedCount} và chuyển trạng thái 'Ngừng hoạt động' cho ${deactivatedCount} nhân viên.`,
            deletedCount,
            deactivatedCount
        });
    } catch (error) {
        console.error("Error bulk deleting workers:", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi xóa nhân viên hàng loạt" },
            { status: 500 }
        );
    }
}

// POST - Tạo nhân viên mới (hỗ trợ cả đơn lẻ và hàng loạt)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const inputData = Array.isArray(body) ? body : [body];
        const results = [];

        for (const item of inputData) {
            const { fullName, phone, email, address, categoryId, branchId, hireDate, hourlyRate, notes, userId } = item;

            if (!fullName) continue;

            // Kiểm tra xem user này đã được tạo làm nhân viên sản xuất chưa
            if (userId) {
                const existing = await query(
                    'SELECT id FROM production_workers WHERE user_id = $1',
                    [userId]
                );

                if (existing.rows.length > 0) {
                    // Nếu đã tồn tại, tiến hành cập nhật thông tin mới nhất (Sync)
                    const updated = await query(
                        `UPDATE production_workers 
                        SET full_name = $1, 
                            phone = $2, 
                            email = $3, 
                            address = $4,
                            branch_id = $5,
                            category_id = COALESCE($6, category_id),
                            is_active = true,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = $7
                        RETURNING *`,
                        [fullName, phone || null, email || null, address || null, branchId || null, categoryId || null, userId]
                    );
                    results.push(updated.rows[0]);
                    continue;
                }
            }

            // Tự động tạo mã nhân viên: NV + YYMMDD + số thứ tự 3 chữ số
            // Lưu ý: Trong vòng lặp bulk có thể bị trùng nếu query cùng lúc, nhưng ở đây dùng await tuần tự nên tạm ổn
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
                (worker_code, full_name, phone, email, address, category_id, branch_id, hire_date, hourly_rate, notes, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *`,
                [workerCode, fullName, phone || null, email || null, address || null,
                    categoryId || null, branchId || null, hireDate || null, finalHourlyRate || 0, notes || null, userId || null]
            );
            results.push(result.rows[0]);
        }

        return NextResponse.json({
            success: true,
            data: Array.isArray(body) ? results : results[0],
            count: results.length
        });
    } catch (error: any) {
        console.error("Error creating worker(s):", error);
        return NextResponse.json(
            { success: false, error: "Lỗi khi tạo nhân viên" },
            { status: 500 }
        );
    }
}
