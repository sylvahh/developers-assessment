import type { ColumnDef } from "@tanstack/react-table"
import { Check, Minus } from "lucide-react"

import type { TimeEntry } from "@/services/types"

export const timeEntryColumns: ColumnDef<TimeEntry>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.date}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.description}</span>
    ),
  },
  {
    id: "time",
    header: "Time",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.startTime} &ndash; {row.original.endTime}
      </span>
    ),
  },
  {
    accessorKey: "hours",
    header: () => <div className="text-right">Hours</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.original.hours}h</div>
    ),
  },
  {
    accessorKey: "billable",
    header: () => <div className="text-center">Billable</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.billable ? (
          <Check className="size-4 text-green-600 mx-auto" />
        ) : (
          <Minus className="size-4 text-muted-foreground mx-auto" />
        )}
      </div>
    ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm max-w-xs truncate block">
        {row.original.notes || <span className="italic">No notes</span>}
      </span>
    ),
  },
]
