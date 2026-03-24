import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronDown, ChevronRight, Minus } from "lucide-react"
import { useMemo, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingButton } from "@/components/ui/loading-button"
import { Separator } from "@/components/ui/separator"
import useCustomToast from "@/hooks/useCustomToast"
import type { TimeEntry, WorklogWithFreelancer } from "@/services/types"
import { PaymentService, WorklogService } from "@/services/worklog-service"

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

function TimeEntriesPanel({ entries }: { entries: TimeEntry[] }) {
  return (
    <div className="ml-8 mt-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Time Entries
      </p>
      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20">{entry.date}</span>
              <span className="max-w-[250px] truncate">
                {entry.description}
              </span>
              {entry.billable ? (
                <Check className="size-3 text-green-600" />
              ) : (
                <Minus className="size-3 text-muted-foreground" />
              )}
            </div>
            <span className="text-muted-foreground">{entry.hours}h</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface PaymentReviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedWorklogIds: string[]
  onPaymentProcessed: () => void
}

export function PaymentReview({
  open,
  onOpenChange,
  selectedWorklogIds,
  onPaymentProcessed,
}: PaymentReviewProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [excludedWorklogIds, setExcludedWorklogIds] = useState<Set<string>>(
    new Set(),
  )
  const [excludedFreelancerIds, setExcludedFreelancerIds] = useState<
    Set<string>
  >(new Set())
  const [expandedWorklogs, setExpandedWorklogs] = useState<Set<string>>(
    new Set(),
  )

  const { data } = useQuery({
    queryFn: () => WorklogService.getWorklogs(),
    queryKey: ["worklogs", {}],
    enabled: open,
  })

  const timeEntriesQueries = useQuery({
    queryFn: async () => {
      const results = await Promise.all(
        selectedWorklogIds.map(async (id) => ({
          id,
          entries: await WorklogService.getTimeEntries(id),
        })),
      )
      const entries: Record<string, TimeEntry[]> = {}
      for (const { id, entries: e } of results) {
        entries[id] = e
      }
      return entries
    },
    queryKey: ["timeEntries", selectedWorklogIds],
    enabled: open && selectedWorklogIds.length > 0,
  })

  const selectedWorklogs = useMemo(() => {
    if (!data) return []
    return data.data.filter((w) => selectedWorklogIds.includes(w.id))
  }, [data, selectedWorklogIds])

  const groupedByFreelancer = useMemo(() => {
    const groups = new Map<string, WorklogWithFreelancer[]>()
    for (const worklog of selectedWorklogs) {
      const id = worklog.freelancerId
      if (!groups.has(id)) {
        groups.set(id, [])
      }
      groups.get(id)!.push(worklog)
    }
    return groups
  }, [selectedWorklogs])

  const includedWorklogs = useMemo(() => {
    return selectedWorklogs.filter(
      (w) =>
        !excludedWorklogIds.has(w.id) &&
        !excludedFreelancerIds.has(w.freelancerId),
    )
  }, [selectedWorklogs, excludedWorklogIds, excludedFreelancerIds])

  const totalAmount = includedWorklogs.reduce(
    (sum, w) => sum + w.totalEarnings,
    0,
  )
  const totalHours = includedWorklogs.reduce((sum, w) => sum + w.totalHours, 0)

  const toggleWorklog = (worklogId: string) => {
    setExcludedWorklogIds((prev) => {
      const next = new Set(prev)
      if (next.has(worklogId)) {
        next.delete(worklogId)
      } else {
        next.add(worklogId)
      }
      return next
    })
  }

  const toggleFreelancer = (freelancerId: string) => {
    setExcludedFreelancerIds((prev) => {
      const next = new Set(prev)
      if (next.has(freelancerId)) {
        next.delete(freelancerId)
      } else {
        next.add(freelancerId)
      }
      return next
    })
  }

  const toggleExpanded = (worklogId: string) => {
    setExpandedWorklogs((prev) => {
      const next = new Set(prev)
      if (next.has(worklogId)) {
        next.delete(worklogId)
      } else {
        next.add(worklogId)
      }
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const dates = includedWorklogs
        .flatMap((w) => [w.periodStart, w.periodEnd])
        .sort()
      const result = await PaymentService.processPayment({
        worklogIds: includedWorklogs.map((w) => w.id),
        excludedWorklogIds: Array.from(excludedWorklogIds),
        excludedFreelancerIds: Array.from(excludedFreelancerIds),
        periodStart: dates[0] ?? "",
        periodEnd: dates[dates.length - 1] ?? "",
      })

      // Mark included worklogs as paid
      for (const worklog of includedWorklogs) {
        await WorklogService.updateStatus(worklog.id, "paid")
      }

      return result
    },
    onSuccess: (result) => {
      showSuccessToast(
        `Payment processed: ${formatCurrency(result.totalAmount)} for ${result.totalHours}h`,
      )
      setExcludedWorklogIds(new Set())
      setExcludedFreelancerIds(new Set())
      setExpandedWorklogs(new Set())
      onPaymentProcessed()
    },
    onError: () => {
      showErrorToast("Failed to process payment")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["worklogs"] })
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setExcludedWorklogIds(new Set())
          setExcludedFreelancerIds(new Set())
          setExpandedWorklogs(new Set())
        }
        onOpenChange(value)
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Payment</DialogTitle>
          <DialogDescription>
            Review the selected worklogs and time entries before processing
            payment. Uncheck to exclude specific worklogs or freelancers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {Array.from(groupedByFreelancer.entries()).map(
            ([freelancerId, worklogs]) => {
              const freelancer = worklogs[0].freelancer
              const isFreelancerExcluded =
                excludedFreelancerIds.has(freelancerId)
              const freelancerTotal = worklogs
                .filter(
                  (w) => !excludedWorklogIds.has(w.id) && !isFreelancerExcluded,
                )
                .reduce((sum, w) => sum + w.totalEarnings, 0)

              return (
                <div key={freelancerId} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={!isFreelancerExcluded}
                        onCheckedChange={() => toggleFreelancer(freelancerId)}
                        aria-label={`Include ${freelancer.name}`}
                      />
                      <Avatar className="size-7">
                        <AvatarImage
                          src={freelancer.avatar}
                          alt={freelancer.name}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(freelancer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{freelancer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(freelancer.hourlyRate)}/hr
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(freelancerTotal)}
                    </p>
                  </div>

                  <div className="ml-8 flex flex-col gap-1">
                    {worklogs.map((worklog) => {
                      const isExcluded =
                        excludedWorklogIds.has(worklog.id) ||
                        isFreelancerExcluded
                      const isExpanded = expandedWorklogs.has(worklog.id)
                      const entries =
                        timeEntriesQueries.data?.[worklog.id] ?? []

                      return (
                        <div key={worklog.id}>
                          <div className="flex items-center justify-between text-sm py-1">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={!isExcluded}
                                disabled={isFreelancerExcluded}
                                onCheckedChange={() =>
                                  toggleWorklog(worklog.id)
                                }
                                aria-label={`Include ${worklog.taskName}`}
                              />
                              <button
                                type="button"
                                onClick={() => toggleExpanded(worklog.id)}
                                className="flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors"
                                aria-label={
                                  isExpanded
                                    ? "Collapse time entries"
                                    : "Expand time entries"
                                }
                              >
                                {isExpanded ? (
                                  <ChevronDown className="size-3.5" />
                                ) : (
                                  <ChevronRight className="size-3.5" />
                                )}
                              </button>
                              <span
                                className={
                                  isExcluded
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }
                              >
                                {worklog.taskName}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <span>{worklog.totalHours}h</span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(worklog.totalEarnings)}
                              </span>
                            </div>
                          </div>

                          {isExpanded && entries.length > 0 && (
                            <TimeEntriesPanel entries={entries} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            },
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-muted-foreground">
            {includedWorklogs.length} worklog
            {includedWorklogs.length !== 1 && "s"} &middot; {totalHours}h
          </div>
          <div className="text-lg font-bold">{formatCurrency(totalAmount)}</div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={includedWorklogs.length === 0}
          >
            Confirm Payment
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
