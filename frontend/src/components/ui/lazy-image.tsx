"use client"

import { useState } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  className?: string;
}

export function LazyImage({
  src,
  alt,
  placeholderSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3C/svg%3E",
  className,
  ...props
}: LazyImageProps) {
  const [imageRef, isVisible] = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div ref={imageRef} className={cn("relative overflow-hidden", className)}>
      <img
        src={isVisible ? src : placeholderSrc}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
