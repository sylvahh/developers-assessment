import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { WorklogStatus } from "@/services/types"

const statusConfig: Record<
  WorklogStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline"
    className?: string
  }
> = {
  pending: { variant: "secondary" },
  approved: { variant: "default" },
  paid: { variant: "outline", className: "text-green-600 border-green-600/30" },
  rejected: { variant: "destructive" },
}

export function WorklogStatusBadge({ status }: { status: WorklogStatus }) {
  const config = statusConfig[status]
  return (
    <Badge
      variant={config.variant}
      className={cn("capitalize", config.className)}
    >
      {status}
    </Badge>
  )
}
