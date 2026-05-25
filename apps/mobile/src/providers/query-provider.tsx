import { QueryClientProvider } from "@tanstack/react-query";

import { mobileQueryClient } from "@/lib/query";

export function MobileQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={mobileQueryClient}>{children}</QueryClientProvider>;
}
