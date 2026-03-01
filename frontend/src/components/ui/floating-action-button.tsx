"use client";

import { ReactNode, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FABAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  onClick?: () => void;
  icon?: ReactNode;
  label?: string;
  className?: string;
}

export function FloatingActionButton({
  actions = [],
  onClick,
  icon = <Plus className="h-6 w-6" />,
  label,
  className,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMainClick = () => {
    if (actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else if (onClick) {
      onClick();
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action buttons */}
      {isExpanded && actions.length > 0 && (
        <div className="fixed right-4 bottom-24 z-50 flex flex-col-reverse gap-3 md:hidden">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className="flex items-center gap-3 bg-background border border-border rounded-full shadow-lg hover:shadow-xl transition-all animate-in slide-in-from-bottom-2"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                  {action.icon}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <Button
        onClick={handleMainClick}
        size="icon"
        className={cn(
          "fixed right-4 bottom-20 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all md:hidden",
          isExpanded && "rotate-45",
          className
        )}
      >
        {isExpanded ? <X className="h-6 w-6" /> : icon}
        {label && <span className="sr-only">{label}</span>}
      </Button>
    </>
  );
}
