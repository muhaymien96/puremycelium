"use client"

import * as React from "react"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"

interface Props {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[240px] justify-start text-left", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {value.from.toLocaleDateString()} –{" "}
                {value.to.toLocaleDateString()}
              </>
            ) : (
              value.from.toLocaleDateString()
            )
          ) : (
            "Pick a date range"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
