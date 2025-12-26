"use client";

import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: true, // Refetch khi mount để dữ liệu luôn mới
      refetchOnWindowFocus: false, // Không refetch khi focus window
      retry: 2,
      staleTime: 3 * 60 * 1000, // 3 phút - giảm API calls khi chuyển trang
      gcTime: 15 * 60 * 1000, // 15 phút cache - giữ data lâu hơn
      placeholderData: keepPreviousData,
    },
  },
});

export default function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
