
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.orders', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền thanh toán đơn đặt hàng'
            }, { status: 403 });
        }

        const resolvedParams = await params;
        const poId = parseInt(resolvedParams.id);
        const body = await request.json();
        const { paymentAmount, paymentMethod, bankAccountId, notes } = body;

        if (!paymentAmount || paymentAmount <= 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Số tiền thanh toán không hợp lệ'
            }, { status: 400 });
        }

        // Lấy thông tin đơn hàng hiện tại
        const poResult = await query(
            `SELECT po_code, branch_id, total_amount, COALESCE(paid_amount, 0) as paid_amount 
       FROM purchase_orders WHERE id = $1`,
            [poId]
        );

        if (poResult.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy đơn đặt hàng'
            }, { status: 404 });
        }

        const { po_code, branch_id, total_amount, paid_amount } = poResult.rows[0];
        const remainingAmount = total_amount - paid_amount;

        if (paymentAmount > remainingAmount) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: `Số tiền thanh toán (${paymentAmount}) lớn hơn số tiền còn nợ (${remainingAmount})`
            }, { status: 400 });
        }

        // 1. Tạo phiếu chi (Cash Book)
        // Tạo mã giao dịch SQ + YYMMDD + XXXX
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const prefix = `SQ${dateStr}`;
        const codeResult = await query(
            `SELECT transaction_code FROM cash_books 
       WHERE transaction_code LIKE $1 
       ORDER BY transaction_code DESC LIMIT 1`,
            [`${prefix}%`]
        );

        let sequence = 1;
        if (codeResult.rows.length > 0) {
            const lastCode = codeResult.rows[0].transaction_code;
            const lastSeq = parseInt(lastCode.slice(-4));
            sequence = lastSeq + 1;
        }
        const transactionCode = `${prefix}${sequence.toString().padStart(4, '0')}`;

        // Lưu phiếu chi
        await query(
            `INSERT INTO cash_books (
        transaction_code, transaction_date, amount, transaction_type, 
        payment_method, bank_account_id, reference_type, reference_id, 
        description, branch_id, created_by
      ) VALUES ($1, CURRENT_DATE, $2, 'CHI', $3, $4, 'PURCHASE_ORDER', $5, $6, $7, $8)`,
            [
                transactionCode,
                paymentAmount,
                paymentMethod,
                bankAccountId || null,
                poId,
                notes || `Thanh toán cho đơn đặt hàng ${po_code}`,
                branch_id,
                currentUser.id
            ]
        );

        // 2. Cập nhật số dư tài khoản ngân hàng (nếu có)
        if (bankAccountId) {
            await query(
                `UPDATE bank_accounts SET balance = balance - $1 WHERE id = $2`,
                [paymentAmount, bankAccountId]
            );
        }

        // 3. Cập nhật trạng thái thanh toán đơn hàng
        const newPaidAmount = parseFloat(paid_amount) + parseFloat(paymentAmount);
        let newPaymentStatus = 'PARTIAL';
        if (newPaidAmount >= total_amount) {
            newPaymentStatus = 'PAID';
        }

        await query(
            `UPDATE purchase_orders 
       SET paid_amount = $1, payment_status = $2 
       WHERE id = $3`,
            [newPaidAmount, newPaymentStatus, poId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Thanh toán thành công'
        });

    } catch (error) {
        console.error('Payment error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
