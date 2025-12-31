import { useEffect, useState, useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

// Store để quản lý state mobile
const mobileStore = {
  listeners: new Set<() => void>(),
  isMobile: false,
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  
  getSnapshot() {
    return this.isMobile;
  },
  
  getServerSnapshot() {
    return false; // Server luôn trả về false
  },
  
  update() {
    if (typeof window === 'undefined') return;
    const newValue = window.innerWidth < MOBILE_BREAKPOINT;
    if (this.isMobile !== newValue) {
      this.isMobile = newValue;
      this.listeners.forEach(listener => listener());
    }
  }
};

// Khởi tạo listeners một lần
if (typeof window !== 'undefined') {
  // Check ngay lập tức
  mobileStore.isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  
  // Listeners
  const handleChange = () => mobileStore.update();
  
  window.addEventListener('resize', handleChange);
  window.addEventListener('orientationchange', () => {
    setTimeout(handleChange, 100);
  });
  
  // MediaQuery listener
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener('change', handleChange);
}

/**
 * Hook để detect mobile device
 * Sử dụng useSyncExternalStore để tránh hydration mismatch
 */
export function useIsMobile(): boolean {
  const isMobile = useSyncExternalStore(
    (callback) => mobileStore.subscribe(callback),
    () => mobileStore.getSnapshot(),
    () => mobileStore.getServerSnapshot()
  );
  
  // Force update sau khi mount để đảm bảo giá trị đúng
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    mobileStore.update();
    forceUpdate(n => n + 1);
  }, []);
  
  return isMobile;
}

/**
 * Hook alternative - dùng CSS media query qua matchMedia
 * Đáng tin cậy hơn trên một số thiết bị
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Set initial value
    setMatches(mql.matches);
    
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook đơn giản hơn - check trực tiếp window.innerWidth
 * Dùng khi cần giá trị chính xác nhất
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return 1024;
    return window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    
    // Set initial
    handleResize();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100);
    });
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return width;
}
