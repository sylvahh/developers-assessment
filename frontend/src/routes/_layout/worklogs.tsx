import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Search,
} from "lucide-react"
import { useCallback, useState } from "react"

import PendingWorklogs from "@/components/Worklogs/PendingWorklogs"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { columns } from "@/components/Worklogs/columns"
import { PaymentReview } from "@/components/Worklogs/PaymentReview"
import { WorklogFilterBar } from "@/components/Worklogs/WorklogDateFilter"
import useCustomToast from "@/hooks/useCustomToast"
import type { WorklogStatus, WorklogWithFreelancer } from "@/services/types"
import { WorklogService } from "@/services/worklog-service"

type WorklogSearchParams = {
  startDate?: string
  endDate?: string
}

export const Route = createFileRoute("/_layout/worklogs")({
  component: Worklogs,
  validateSearch: (search: Record<string, unknown>): WorklogSearchParams => ({
    startDate: (search.startDate as string) || undefined,
    endDate: (search.endDate as string) || undefined,
  }),
  head: () => ({
    meta: [
      {
        title: "Worklogs - WorkLog Dashboard",
      },
    ],
  }),
})

function WorklogsTableContent({
  filters,
  rowSelection,
  onRowSelectionChange,
  columnFilters,
  onColumnFiltersChange,
  onProcessPayment,
  onStatusChange,
}: {
  filters: { startDate?: string; endDate?: string }
  rowSelection: RowSelectionState
  onRowSelectionChange: (value: RowSelectionState) => void
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: (value: ColumnFiltersState) => void
  onProcessPayment: (worklogId: string) => void
  onStatusChange: (id: string, status: WorklogStatus) => void
}) {
  const { data, isLoading } = useQuery({
    queryFn: () => WorklogService.getWorklogs(filters),
    queryKey: ["worklogs", filters],
  })

  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: data?.data ?? [],
    columns: columns as ColumnDef<WorklogWithFreelancer, unknown>[],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) => {
      const newState =
        typeof updater === "function" ? updater(columnFilters) : updater
      onColumnFiltersChange(newState)
    },
    onRowSelectionChange: (updater) => {
      const newState =
        typeof updater === "function" ? updater(rowSelection) : updater
      onRowSelectionChange(newState)
    },
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    getRowId: (row) => row.id,
    enableRowSelection: (row) => row.original.status === "approved",
    meta: {
      onProcessPayment,
      onStatusChange,
    },
  })

  if (isLoading) {
    return <PendingWorklogs />
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No worklogs found</h3>
        <p className="text-muted-foreground">
          Try adjusting your date range filter
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No results match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-t bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}{" "}
              to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}
              entries
            </div>
            <div className="flex items-center gap-x-2">
              <p className="text-sm text-muted-foreground">Rows per page</p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 25, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-x-6">
            <div className="flex items-center gap-x-1 text-sm text-muted-foreground">
              <span>Page</span>
              <span className="font-medium text-foreground">
                {table.getState().pagination.pageIndex + 1}
              </span>
              <span>of</span>
              <span className="font-medium text-foreground">
                {table.getPageCount()}
              </span>
            </div>

            <div className="flex items-center gap-x-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Worklogs() {
  const { startDate, endDate } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [paymentOpen, setPaymentOpen] = useState(false)

  const filters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorklogStatus }) =>
      WorklogService.updateStatus(id, status),
    onSuccess: (_data, { status }) => {
      showSuccessToast(`Worklog ${status} successfully`)
      queryClient.invalidateQueries({ queryKey: ["worklogs"] })
    },
    onError: () => {
      showErrorToast("Failed to update worklog status")
    },
  })

  const handleDateFilter = useCallback(
    (newFilters: { startDate?: string; endDate?: string }) => {
      navigate({
        to: "/worklogs",
        search: {
          startDate: newFilters.startDate,
          endDate: newFilters.endDate,
        },
      })
    },
    [navigate],
  )

  const handleStatusFilter = (status: string | undefined) => {
    setColumnFilters((prev) => {
      const without = prev.filter((f) => f.id !== "status")
      if (status) {
        return [...without, { id: "status", value: status }]
      }
      return without
    })
  }

  const currentStatusFilter = columnFilters.find((f) => f.id === "status")
    ?.value as string | undefined

  const selectedCount = Object.keys(rowSelection).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Worklogs</h1>
          <p className="text-muted-foreground">
            Review and manage freelancer work logs
          </p>
        </div>
        <div className="flex items-end gap-2">
          {selectedCount > 0 && (
            <Button onClick={() => setPaymentOpen(true)} className="h-9">
              <CreditCard className="mr-2 size-4" />
              Review Payment ({selectedCount})
            </Button>
          )}
          <WorklogFilterBar
            initialStartDate={startDate}
            initialEndDate={endDate}
            statusFilter={currentStatusFilter}
            onDateFilter={handleDateFilter}
            onStatusFilter={handleStatusFilter}
          />
        </div>
      </div>

      <WorklogsTableContent
        filters={filters}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        onProcessPayment={(worklogId) => {
          setRowSelection({ [worklogId]: true })
          setPaymentOpen(true)
        }}
        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
      />

      <PaymentReview
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        selectedWorklogIds={Object.keys(rowSelection)}
        onPaymentProcessed={() => {
          setRowSelection({})
          setPaymentOpen(false)
        }}
      />
    </div>
  )
}
