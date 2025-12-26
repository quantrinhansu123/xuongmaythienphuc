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
      staleTime: 1 * 60 * 1000, // 1 phút - data stale nhanh hơn
      gcTime: 10 * 60 * 1000, // 10 phút cache
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
