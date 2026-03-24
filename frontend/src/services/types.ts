export type FreelancerStatus = "active" | "inactive"

export interface Freelancer {
  id: string
  name: string
  email: string
  avatar: string
  hourlyRate: number
  specialty: string
  status: FreelancerStatus
  lastSignIn: string
  createdAt: string
}

export type WorklogStatus = "pending" | "approved" | "paid" | "rejected"

export interface Worklog {
  id: string
  freelancerId: string
  taskName: string
  project: string
  description: string
  status: WorklogStatus
  totalHours: number
  totalEarnings: number
  periodStart: string
  periodEnd: string
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  worklogId: string
  description: string
  date: string
  startTime: string
  endTime: string
  hours: number
  billable: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PaymentBatch {
  id: string
  worklogIds: string[]
  excludedWorklogIds: string[]
  excludedFreelancerIds: string[]
  totalAmount: number
  totalHours: number
  periodStart: string
  periodEnd: string
  status: "pending" | "processed"
  processedAt: string | null
  createdAt: string
}

export interface WorklogWithFreelancer extends Worklog {
  freelancer: Freelancer
}

export interface WorklogDetail extends WorklogWithFreelancer {
  timeEntries: TimeEntry[]
}
