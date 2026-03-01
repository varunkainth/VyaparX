"use client";

import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  Wallet,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BarChart3, Settings, Receipt } from "lucide-react";

const mainNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    label: "Parties",
    href: "/parties",
    icon: Users,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
  },
];

const moreNavItems = [
  {
    label: "Payments",
    href: "/payments",
    icon: Wallet,
  },
  {
    label: "Reports",
    href: "/reports/sales",
    icon: BarChart3,
  },
  {
    label: "Ledger",
    href: "/ledger",
    icon: Receipt,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setShowMore(false);
  };

  return (
    <>
      {/* Bottom Navigation - Only visible on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border w-full max-w-[100vw]">
        <div className="flex items-center justify-around h-16 px-2 w-full">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
          
          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Sheet */}
      <Sheet open={showMore} onOpenChange={setShowMore}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 mt-6 mb-4">
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Button
                  key={item.href}
                  variant={active ? "default" : "outline"}
                  onClick={() => handleNavigation(item.href)}
                  className="h-20 flex-col gap-2"
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="md:hidden h-16 w-full" />
    </>
  );
}
