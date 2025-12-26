import { useEffect, useState } from 'react';

/**
 * Hook để debounce một giá trị
 * Giúp giảm số lần gọi API khi user đang gõ search
 * 
 * @param value - Giá trị cần debounce
 * @param delay - Thời gian delay (ms), mặc định 500ms
 * @returns Giá trị đã được debounce
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search, 500);
 * 
 * // Chỉ search sau 500ms user ngừng gõ
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchData(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout để update giá trị sau delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear timeout nếu value thay đổi trước khi delay hết
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
