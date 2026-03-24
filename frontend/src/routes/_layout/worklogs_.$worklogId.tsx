import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Clock,
  CreditCard,
  DollarSign,
  ThumbsUp,
  X,
} from "lucide-react"
import { useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/Common/DataTable"
import { PaymentReview } from "@/components/Worklogs/PaymentReview"
import { WorklogStatusBadge } from "@/components/Worklogs/WorklogStatusBadge"
import { timeEntryColumns } from "@/components/Worklogs/timeEntryColumns"
import useCustomToast from "@/hooks/useCustomToast"
import type { WorklogStatus } from "@/services/types"
import { WorklogService } from "@/services/worklog-service"

export const Route = createFileRoute("/_layout/worklogs_/$worklogId")({
  component: WorklogDetail,
  head: () => ({
    meta: [
      {
        title: "Worklog Details - WorkLog Dashboard",
      },
    ],
  }),
})

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

function WorklogDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-24" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-48" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function WorklogDetail() {
  const { worklogId } = Route.useParams()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [paymentOpen, setPaymentOpen] = useState(false)

  const {
    data: worklog,
    isLoading,
    isError,
  } = useQuery({
    queryFn: () => WorklogService.getWorklogById(worklogId),
    queryKey: ["worklog", worklogId],
  })

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: WorklogStatus }) =>
      WorklogService.updateStatus(worklogId, status),
    onSuccess: (_data, { status }) => {
      showSuccessToast(`Worklog ${status} successfully`)
      queryClient.invalidateQueries({ queryKey: ["worklog", worklogId] })
      queryClient.invalidateQueries({ queryKey: ["worklogs"] })
    },
    onError: () => {
      showErrorToast("Failed to update worklog status")
    },
  })

  if (isLoading) {
    return <WorklogDetailSkeleton />
  }

  if (isError || !worklog) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold">Worklog not found</h3>
        <p className="text-muted-foreground mb-4">
          The worklog you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" asChild>
          <Link to="/worklogs">Back to Worklogs</Link>
        </Button>
      </div>
    )
  }

  const { freelancer, timeEntries, status } = worklog
  const billableHours = timeEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.hours, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to="/worklogs">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Worklogs
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {worklog.taskName}
            </h1>
            <p className="text-muted-foreground">{worklog.project}</p>
          </div>
          <div className="flex items-center gap-2">
            {status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => statusMutation.mutate({ status: "approved" })}
                  disabled={statusMutation.isPending}
                >
                  <ThumbsUp className="mr-1.5 size-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => statusMutation.mutate({ status: "rejected" })}
                  disabled={statusMutation.isPending}
                >
                  <X className="mr-1.5 size-4" />
                  Reject
                </Button>
              </>
            )}
            {status === "approved" && (
              <Button
                size="sm"
                onClick={() => setPaymentOpen(true)}
                disabled={statusMutation.isPending}
              >
                <CreditCard className="mr-1.5 size-4" />
                Process Payment
              </Button>
            )}
            <WorklogStatusBadge status={status} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Worklog Summary</CardTitle>
          <CardDescription>{worklog.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Freelancer</p>
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
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
                    <p className="text-sm text-muted-foreground">
                      {freelancer.email}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Hourly Rate
                </p>
                <p className="font-medium">
                  {formatCurrency(freelancer.hourlyRate)}/hr
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Period</p>
                <p className="font-medium">
                  {worklog.periodStart} &ndash; {worklog.periodEnd}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="rounded-md bg-muted p-2">
                    <Clock className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-lg font-semibold">
                      {worklog.totalHours}h
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="rounded-md bg-muted p-2">
                    <DollarSign className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Earnings
                    </p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(worklog.totalEarnings)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Billable: {billableHours}h of {worklog.totalHours}h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Time Entries ({timeEntries.length})
        </h2>
        <DataTable columns={timeEntryColumns} data={timeEntries} />

        <Separator className="my-4" />

        <div className="flex justify-end gap-8 text-sm">
          <div>
            <span className="text-muted-foreground">Total Hours: </span>
            <span className="font-semibold">{worklog.totalHours}h</span>
          </div>
          <div>
            <span className="text-muted-foreground">Billable Hours: </span>
            <span className="font-semibold">{billableHours}h</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">
              {formatCurrency(worklog.totalEarnings)}
            </span>
          </div>
        </div>
      </div>

      <PaymentReview
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        selectedWorklogIds={[worklogId]}
        onPaymentProcessed={() => {
          setPaymentOpen(false)
          queryClient.invalidateQueries({ queryKey: ["worklog", worklogId] })
        }}
      />
    </div>
  )
}
