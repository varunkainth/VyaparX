"use client";

import { ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "success";
}

interface SwipeableItemProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
}

export function SwipeableItem({
  children,
  leftActions = [],
  rightActions = [],
  className,
}: SwipeableItemProps) {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const maxSwipe = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limit swipe distance
    const newOffset = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setOffset(newOffset);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    // Snap to action or reset
    if (Math.abs(offset) > maxSwipe / 2) {
      setOffset(offset > 0 ? maxSwipe : -maxSwipe);
    } else {
      setOffset(0);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    setOffset(0);
  };

  const getActionColor = (variant?: string) => {
    switch (variant) {
      case "destructive":
        return "bg-destructive text-destructive-foreground";
      case "success":
        return "bg-green-600 text-white";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  return (
    <div className="relative overflow-hidden md:overflow-visible">
      {/* Left actions */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center">
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "h-full px-4 flex items-center gap-2 transition-all",
                getActionColor(action.variant)
              )}
              style={{
                transform: `translateX(${Math.min(0, offset - maxSwipe)}px)`,
              }}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center">
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "h-full px-4 flex items-center gap-2 transition-all",
                getActionColor(action.variant)
              )}
              style={{
                transform: `translateX(${Math.max(0, offset + maxSwipe)}px)`,
              }}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative bg-background transition-transform touch-pan-y",
          className
        )}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
