import { useSiteTitleStore } from '@/stores/setSiteTitle';
import { useLayoutEffect } from 'react';

export const useSetTitlePage = (title: string | null) => {
    const setTitleSite = useSiteTitleStore((s) => s.setSiteTitle);
    useLayoutEffect(() => {
        setTitleSite(title);
    }, [title]);
};

