import { format, parse } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface WorklogFilterBarProps {
  initialStartDate?: string
  initialEndDate?: string
  statusFilter?: string
  onDateFilter: (filters: { startDate?: string; endDate?: string }) => void
  onStatusFilter: (status: string | undefined) => void
}

function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined
  return parse(dateStr, "yyyy-MM-dd", new Date())
}

function DatePicker({
  date,
  onSelect,
  placeholder,
}: {
  date: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 w-40 justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 size-3.5" />
          {date ? format(date, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(day) => {
            onSelect(day)
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function WorklogFilterBar({
  initialStartDate,
  initialEndDate,
  statusFilter,
  onDateFilter,
  onStatusFilter,
}: WorklogFilterBarProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    parseDate(initialStartDate),
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    parseDate(initialEndDate),
  )

  const stableDateFilter = useCallback(onDateFilter, [])

  useEffect(() => {
    if (startDate && endDate) {
      stableDateFilter({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
      })
    }
  }, [startDate, endDate, stableDateFilter])

  const handleClear = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    onDateFilter({})
  }

  const hasDateFilters = startDate || endDate

  return (
    <div className="flex items-end gap-2">
      <Select
        value={statusFilter ?? "all"}
        onValueChange={(value) =>
          onStatusFilter(value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">From</span>
        <DatePicker
          date={startDate}
          onSelect={setStartDate}
          placeholder="Start date"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">To</span>
        <DatePicker
          date={endDate}
          onSelect={setEndDate}
          placeholder="End date"
        />
      </div>
      {hasDateFilters && (
        <Button size="sm" variant="ghost" onClick={handleClear} className="h-9">
          <X className="mr-1.5 size-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
