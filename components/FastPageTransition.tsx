'use client';

import { memo } from 'react';

/**
 * Component wrapper đơn giản - không có animation để tránh lag
 * Trước đây có transition 150ms gây delay khi chuyển trang
 */
function FastPageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default memo(FastPageTransition);
