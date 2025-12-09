"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string | null
  onChange: (time: string | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Generate hours (1-12)
const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

// Generate minutes (00, 15, 30, 45 for quick selection, or all for granular)
const quickMinutes = ['00', '15', '30', '45']
const allMinutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

type Period = 'AM' | 'PM'

function parse24HourTime(time: string | null): { hour: string; minute: string; period: Period } {
  if (!time) {
    return { hour: '12', minute: '00', period: 'AM' }
  }
  
  const [h, m] = time.split(':').map(Number)
  let hour = h % 12
  if (hour === 0) hour = 12
  const period: Period = h >= 12 ? 'PM' : 'AM'
  
  return {
    hour: String(hour).padStart(2, '0'),
    minute: String(m).padStart(2, '0'),
    period
  }
}

function to24HourTime(hour: string, minute: string, period: Period): string {
  let h = parseInt(hour, 10)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${minute}`
}

function formatDisplayTime(time: string | null): string {
  if (!time) return ''
  const { hour, minute, period } = parse24HourTime(time)
  return `${hour}:${minute} ${period}`
}

interface TimeSelectorsProps {
  hour: string
  minute: string
  period: Period
  onHourChange: (h: string) => void
  onMinuteChange: (m: string) => void
  onPeriodChange: (p: Period) => void
  showAllMinutes?: boolean
}

function TimeSelectors({
  hour,
  minute,
  period,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
  showAllMinutes = false
}: TimeSelectorsProps) {
  const minutes = showAllMinutes ? allMinutes : quickMinutes
  
  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={onHourChange}>
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <span className="text-lg font-semibold">:</span>
      
      <Select value={minute} onValueChange={onMinuteChange}>
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  className,
  disabled = false
}: TimePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  
  const parsed = parse24HourTime(value)
  const [hour, setHour] = React.useState(parsed.hour)
  const [minute, setMinute] = React.useState(parsed.minute)
  const [period, setPeriod] = React.useState<Period>(parsed.period)
  
  // Update local state when value changes externally
  React.useEffect(() => {
    const p = parse24HourTime(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])
  
  const handleConfirm = () => {
    const time = to24HourTime(hour, minute, period)
    onChange(time)
    setOpen(false)
  }
  
  const handleClear = () => {
    onChange(null)
    setOpen(false)
  }
  
  const displayValue = formatDisplayTime(value)
  
  const TriggerButton = (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
      disabled={disabled}
    >
      <Clock className="mr-2 h-4 w-4" />
      {displayValue || placeholder}
    </Button>
  )
  
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select Time</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 flex justify-center">
            <TimeSelectors
              hour={hour}
              minute={minute}
              period={period}
              onHourChange={setHour}
              onMinuteChange={setMinute}
              onPeriodChange={setPeriod}
              showAllMinutes
            />
          </div>
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" onClick={handleClear} className="flex-1">
              Clear
            </Button>
            <DrawerClose asChild>
              <Button onClick={handleConfirm} className="flex-1">
                Confirm
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <TimeSelectors
            hour={hour}
            minute={minute}
            period={period}
            onHourChange={setHour}
            onMinuteChange={setMinute}
            onPeriodChange={setPeriod}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClear} className="flex-1">
              Clear
            </Button>
            <Button size="sm" onClick={handleConfirm} className="flex-1">
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Compact inline version for forms (no modal/drawer)
export function TimePickerInline({
  value,
  onChange,
  className,
  disabled = false
}: Omit<TimePickerProps, 'placeholder'>) {
  const parsed = parse24HourTime(value)
  const [hour, setHour] = React.useState(parsed.hour)
  const [minute, setMinute] = React.useState(parsed.minute)
  const [period, setPeriod] = React.useState<Period>(parsed.period)
  
  React.useEffect(() => {
    const p = parse24HourTime(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])
  
  const handleChange = (newHour: string, newMinute: string, newPeriod: Period) => {
    const time = to24HourTime(newHour, newMinute, newPeriod)
    onChange(time)
  }
  
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <Select 
        value={hour} 
        onValueChange={(h) => {
          setHour(h)
          handleChange(h, minute, period)
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[52px] h-8 text-xs px-2">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <span className="text-muted-foreground text-xs">:</span>
      
      <Select 
        value={minute} 
        onValueChange={(m) => {
          setMinute(m)
          handleChange(hour, m, period)
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[52px] h-8 text-xs px-2">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {quickMinutes.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select 
        value={period} 
        onValueChange={(p) => {
          setPeriod(p as Period)
          handleChange(hour, minute, p as Period)
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[52px] h-8 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
