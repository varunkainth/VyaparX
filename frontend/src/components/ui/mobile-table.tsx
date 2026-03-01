"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface MobileTableProps {
  children: ReactNode;
  className?: string;
}

interface MobileTableRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

interface MobileTableCellProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function MobileTable({ children, className }: MobileTableProps) {
  return (
    <div className={cn("space-y-3 md:hidden", className)}>
      {children}
    </div>
  );
}

export function MobileTableRow({ children, onClick, className }: MobileTableRowProps) {
  return (
    <Card
      className={cn(
        "p-4 space-y-2",
        onClick && "cursor-pointer hover:bg-accent/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  );
}

export function MobileTableCell({ label, children, className }: MobileTableCellProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <span className="text-sm text-muted-foreground font-medium">{label}:</span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

// Desktop table wrapper with horizontal scroll
interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn("hidden md:block overflow-x-auto", className)}>
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  );
}
