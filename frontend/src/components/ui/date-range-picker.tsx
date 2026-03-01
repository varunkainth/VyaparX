"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [fromDate, setFromDate] = React.useState<string>(
    value?.from ? formatDateForInput(value.from) : ""
  );
  const [toDate, setToDate] = React.useState<string>(
    value?.to ? formatDateForInput(value.to) : ""
  );

  const presets = [
    {
      label: "Today",
      getValue: () => {
        const today = new Date();
        return { from: today, to: today };
      },
    },
    {
      label: "Yesterday",
      getValue: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: yesterday };
      },
    },
    {
      label: "Last 7 Days",
      getValue: () => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 6);
        return { from, to };
      },
    },
    {
      label: "Last 30 Days",
      getValue: () => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 29);
        return { from, to };
      },
    },
    {
      label: "This Week",
      getValue: () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const from = new Date(today);
        from.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const to = new Date(from);
        to.setDate(from.getDate() + 6);
        return { from, to };
      },
    },
    {
      label: "This Month",
      getValue: () => {
        const today = new Date();
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { from, to };
      },
    },
    {
      label: "Last Month",
      getValue: () => {
        const today = new Date();
        const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const to = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from, to };
      },
    },
    {
      label: "This Year",
      getValue: () => {
        const today = new Date();
        const from = new Date(today.getFullYear(), 0, 1);
        const to = new Date(today.getFullYear(), 11, 31);
        return { from, to };
      },
    },
  ];

  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    setFromDate(formatDateForInput(range.from));
    setToDate(formatDateForInput(range.to));
    onChange(range);
    setOpen(false);
  };

  const handleApply = () => {
    if (fromDate && toDate) {
      onChange({
        from: new Date(fromDate),
        to: new Date(toDate),
      });
      setOpen(false);
    }
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    onChange(undefined);
    setOpen(false);
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder;
    if (!range.to) return formatDateForDisplay(range.from);
    if (range.from.getTime() === range.to.getTime()) {
      return formatDateForDisplay(range.from);
    }
    return `${formatDateForDisplay(range.from)} - ${formatDateForDisplay(range.to)}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal cursor-pointer",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
          {value && (
            <X
              className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="border-b sm:border-b-0 sm:border-r p-3 space-y-1">
            <div className="text-sm font-medium mb-2">Quick Select</div>
            <div className="space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start cursor-pointer text-sm"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                className="cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex-1 cursor-pointer"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!fromDate || !toDate}
                className="flex-1 cursor-pointer"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
