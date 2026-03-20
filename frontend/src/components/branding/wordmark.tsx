"use client"

import { cn } from "@/lib/utils"

export function Wordmark({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn("inline-flex flex-col", className)}>
      <span
        className={cn(
          "tracking-[0.28em] uppercase text-[0.62rem] font-medium text-stone-400/80",
          compact && "text-[0.58rem]"
        )}
      >
        Business OS
      </span>
      <span
        className={cn(
          "font-serif text-4xl leading-none italic text-white",
          compact && "text-2xl",
          "bg-gradient-to-r from-white via-orange-200 to-amber-400 bg-clip-text text-transparent"
        )}
      >
        VyaparX
      </span>
    </div>
  )
}
