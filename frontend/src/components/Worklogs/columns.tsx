import type { Column, ColumnDef } from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CreditCard,
  Eye,
  MoreHorizontal,
  X,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { WorklogStatus, WorklogWithFreelancer } from "@/services/types"
import { WorklogStatusBadge } from "./WorklogStatusBadge"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function SortableHeader({
  column,
  label,
}: {
  column: Column<WorklogWithFreelancer, unknown>
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 size-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 size-3" />
      ) : (
        <ArrowUpDown className="ml-1 size-3 text-muted-foreground/50" />
      )}
    </Button>
  )
}

export interface TableMeta {
  onProcessPayment?: (id: string) => void
  onStatusChange?: (id: string, status: WorklogStatus) => void
}

export const columns: ColumnDef<WorklogWithFreelancer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all approved"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className={!row.getCanSelect() ? "opacity-30" : ""}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "freelancer",
    header: "Freelancer",
    cell: ({ row }) => {
      const { freelancer } = row.original
      return (
        <a
          href={`/worklogs/${row.original.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar className="size-7">
            <AvatarImage src={freelancer.avatar} alt={freelancer.name} />
            <AvatarFallback className="text-xs">
              {getInitials(freelancer.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{freelancer.name}</span>
        </a>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "taskName",
    header: "Task",
    cell: ({ row }) => (
      <span className="font-medium max-w-[200px] truncate block">
        {row.original.taskName}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "project",
    header: "Project",
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[150px] truncate block">
        {row.original.project}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "totalHours",
    header: ({ column }) => <SortableHeader column={column} label="Hours" />,
    cell: ({ row }) => (
      <div className="text-right">{row.original.totalHours}h</div>
    ),
  },
  {
    accessorKey: "totalEarnings",
    header: ({ column }) => <SortableHeader column={column} label="Earnings" />,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatCurrency(row.original.totalEarnings)}
      </div>
    ),
  },
  {
    id: "period",
    header: "Period",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.periodStart} &ndash; {row.original.periodEnd}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <WorklogStatusBadge status={row.original.status} />,
    filterFn: (row, _columnId, filterValue) => {
      return row.original.status === filterValue
    },
    enableSorting: false,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta | undefined
      const { status, id } = row.original
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/worklogs/${id}`}>
                  <Eye className="mr-2 size-4" />
                  View Details
                </a>
              </DropdownMenuItem>

              {status !== "paid" && status !== "rejected" && (
                <>
                  <DropdownMenuSeparator />

                  {status === "pending" && (
                    <>
                      <DropdownMenuItem
                        onClick={() => meta?.onStatusChange?.(id, "approved")}
                      >
                        <Check className="mr-2 size-4" />
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => meta?.onStatusChange?.(id, "rejected")}
                        className="text-destructive"
                      >
                        <X className="mr-2 size-4" />
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}

                  {status === "approved" && (
                    <DropdownMenuItem
                      onClick={() => meta?.onProcessPayment?.(id)}
                    >
                      <CreditCard className="mr-2 size-4" />
                      Process Payment
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: false,
  },
]
