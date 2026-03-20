import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import "@/lib/debug-utils"; // Load debug utilities in development

export const metadata: Metadata = {
  title: {
    default: "VyaparX",
    template: "%s | VyaparX",
  },
  description: "Inventory Management, Billing & Ledger Handler Application",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
