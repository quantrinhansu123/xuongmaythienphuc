'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = BreakpointEnum;

export enum BreakpointEnum {
    SM = 'sm',
    MD = 'md',
    LG = 'lg',
    XL = 'xl',
}

export const BREAK_POINT_WIDTH: Record<Breakpoint, number> = {
    [BreakpointEnum.SM]: 640,
    [BreakpointEnum.MD]: 768,
    [BreakpointEnum.LG]: 1024,
    [BreakpointEnum.XL]: 1280,
};

function getBreakpoint(width: number): Breakpoint {
    if (width < BREAK_POINT_WIDTH[BreakpointEnum.SM]) return BreakpointEnum.SM;
    if (width < BREAK_POINT_WIDTH[BreakpointEnum.MD]) return BreakpointEnum.MD;
    if (width < BREAK_POINT_WIDTH[BreakpointEnum.LG]) return BreakpointEnum.LG;
    return BreakpointEnum.XL;
}

export function useWindowBreakpoint() {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
        typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : BreakpointEnum.SM
    );


    useEffect(() => {
        function handleResize() {
            setBreakpoint(getBreakpoint(window.innerWidth));
        }
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
}
