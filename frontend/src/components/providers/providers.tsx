"use client"

import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Analytics } from "@vercel/analytics/next"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
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
  );
}
