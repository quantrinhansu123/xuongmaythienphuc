/**
 * Format số với dấu chấm phân cách hàng nghìn (kiểu Việt Nam)
 * Ví dụ: 1000000 -> 1.000.000
 * @param num - Số nguyên cần format
 * @returns Chuỗi đã format với dấu chấm phân cách
 */
function formatThousands(num: number): string {
  // Chuyển thành số nguyên và format
  const intNum = Math.floor(Math.abs(num));
  const formatted = intNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return num < 0 ? `-${formatted}` : formatted;
}

/**
 * Format số tiền theo định dạng Việt Nam (x.xxx.xxx đ)
 * Luôn làm tròn về số nguyên, không hiển thị phần thập phân
 * Ví dụ: 1000000 -> "1.000.000 đ", 1.5 -> "2 đ", 1000.99 -> "1.001 đ"
 * @param value - Giá trị cần format (number, string, Decimal)
 * @param suffix - Hậu tố (mặc định là "đ")
 * @returns Chuỗi đã format
 */
export function formatCurrency(value: number | string | null | undefined, suffix: string = "đ"): string {
  if (value === null || value === undefined) return "-";
  
  // Ép kiểu về number, xử lý cả Decimal từ Prisma
  const num = Number(value);
  
  if (isNaN(num)) return "-";
  
  // Làm tròn về số nguyên
  const rounded = Math.round(num);
  const formatted = formatThousands(rounded);
  
  return suffix ? `${formatted} ${suffix}` : formatted;
}

/**
 * Format số không có hậu tố (dùng cho số tiền trong input, bảng)
 * @param value - Giá trị cần format
 * @returns Chuỗi đã format (chỉ số, không có đơn vị)
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  
  const num = Number(value);
  
  if (isNaN(num)) return "0";
  
  return formatThousands(Math.round(num));
}

/**
 * Format ngày giờ theo định dạng Việt Nam
 * @param date - Ngày cần format
 * @returns Chuỗi ngày giờ đã format
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return "-";
  
  return d.toLocaleString("vi-VN");
}

/**
 * Format ngày theo định dạng Việt Nam (dd/mm/yyyy)
 * @param date - Ngày cần format
 * @returns Chuỗi ngày đã format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return "-";
  
  return d.toLocaleDateString("vi-VN");
}

/**
 * Format số lượng - giữ phần thập phân có ý nghĩa
 * Ví dụ: 
 *   - 2 -> "2" (không phải "2,00" hay "2.000")
 *   - 1000 -> "1.000"
 *   - 1.5 -> "1,5"
 *   - 10.25 -> "10,25"
 *   - 2.000 (từ DB) -> "2"
 * @param value - Giá trị cần format (number, string, Decimal)
 * @param unit - Đơn vị tính (tùy chọn)
 * @returns Chuỗi đã format
 */
export function formatQuantity(value: number | string | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return "0";
  
  // Ép kiểu về number, xử lý cả Decimal từ Prisma
  const num = Number(value);
  
  if (isNaN(num)) return "0";
  
  // Làm tròn 3 chữ số thập phân để tránh lỗi floating point
  const rounded = Math.round(num * 1000) / 1000;
  
  let formatted: string;
  
  // Kiểm tra xem có phải số nguyên không (sau khi làm tròn)
  if (rounded === Math.floor(rounded)) {
    // Số nguyên: chỉ format phần nghìn, không có phần thập phân
    formatted = formatThousands(rounded);
  } else {
    // Số thập phân: tách phần nguyên và thập phân
    const intPart = Math.floor(Math.abs(rounded));
    const decPart = Math.abs(rounded) - intPart;
    
    // Chuyển phần thập phân thành string và loại bỏ số 0 thừa ở cuối
    // Ví dụ: 0.500 -> "5", 0.250 -> "25", 0.125 -> "125"
    let decStr = decPart.toFixed(3).substring(2).replace(/0+$/, "");
    
    const sign = rounded < 0 ? "-" : "";
    formatted = `${sign}${formatThousands(intPart)},${decStr}`;
  }
  
  return unit ? `${formatted} ${unit}` : formatted;
}
