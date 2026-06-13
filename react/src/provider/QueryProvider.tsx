import React, { type ReactNode, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: ReactNode }) {
  // Sử dụng useState để khởi tạo QueryClient trên client-side
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            // Dữ liệu được coi là fresh trong 1 phút → không gọi lại API khi component re-mount
            staleTime: 60 * 1000,
            // Cache tồn tại 5 phút sau khi component unmount
            gcTime: 5 * 60 * 1000,
            // Không refetch khi tab được focus lại
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
