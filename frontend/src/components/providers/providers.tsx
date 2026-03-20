"use client"

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Analytics } from "@vercel/analytics/next";
import { queryClient } from "@/lib/react-query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <TooltipProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Analytics />
        </TooltipProvider>
        <Toaster />
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
