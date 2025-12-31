import * as React from "react";

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Khởi tạo với giá trị dựa trên SSR-safe check
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // SSR: return false as default
    if (typeof window === 'undefined') return false;
    // Client: check immediately
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    // Double check on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Check immediately
    checkMobile();
    
    // Also check after a small delay (for some mobile browsers)
    const timeoutId = setTimeout(checkMobile, 100);

    // Listen for resize
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      checkMobile();
    };
    
    mql.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    
    // Also listen for orientation change (important for mobile)
    window.addEventListener("orientationchange", () => {
      // Delay check after orientation change
      setTimeout(checkMobile, 100);
    });

    return () => {
      clearTimeout(timeoutId);
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  return isMobile;
}
