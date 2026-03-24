import freelancersData from "@/mock-data/freelancers.json"
import timeEntriesData from "@/mock-data/time-entries.json"
import worklogsData from "@/mock-data/worklogs.json"
import type {
  Freelancer,
  PaymentBatch,
  TimeEntry,
  Worklog,
  WorklogDetail,
  WorklogStatus,
  WorklogWithFreelancer,
} from "./types"

const freelancers = freelancersData as Freelancer[]
const worklogs = [...worklogsData] as Worklog[]
const timeEntries = timeEntriesData as TimeEntry[]

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms))

const fallbackFreelancer: Freelancer = {
  id: "unknown",
  name: "Unknown Freelancer",
  email: "unknown@email.com",
  avatar: "",
  hourlyRate: 0,
  specialty: "Unknown",
  status: "inactive",
  lastSignIn: "",
  createdAt: "",
}

function attachFreelancer(worklog: Worklog): WorklogWithFreelancer {
  const freelancer =
    freelancers.find((f) => f.id === worklog.freelancerId) ?? fallbackFreelancer
  return { ...worklog, freelancer }
}

export class WorklogService {
  static async getWorklogs(filters?: {
    startDate?: string
    endDate?: string
    status?: string
  }): Promise<{ data: WorklogWithFreelancer[]; count: number }> {
    await delay()
    let data = worklogs
    if (filters?.startDate) {
      data = data.filter((w) => w.periodEnd >= filters.startDate!)
    }
    if (filters?.endDate) {
      data = data.filter((w) => w.periodStart <= filters.endDate!)
    }
    if (filters?.status) {
      data = data.filter((w) => w.status === filters.status)
    }
    const enriched = data.map(attachFreelancer)
    return { data: enriched, count: enriched.length }
  }

  static async getWorklogById(id: string): Promise<WorklogDetail> {
    await delay()
    const worklog = worklogs.find((w) => w.id === id)
    if (!worklog) {
      throw new Error(`Worklog ${id} not found`)
    }
    const entries = timeEntries.filter((e) => e.worklogId === id)
    return { ...attachFreelancer(worklog), timeEntries: entries }
  }

  static async getTimeEntries(worklogId: string): Promise<TimeEntry[]> {
    await delay()
    return timeEntries.filter((e) => e.worklogId === worklogId)
  }

  static async updateStatus(
    id: string,
    status: WorklogStatus,
  ): Promise<WorklogWithFreelancer> {
    await delay()
    const index = worklogs.findIndex((w) => w.id === id)
    if (index === -1) {
      throw new Error(`Worklog ${id} not found`)
    }
    worklogs[index] = {
      ...worklogs[index],
      status,
      updatedAt: new Date().toISOString(),
    }
    return attachFreelancer(worklogs[index])
  }
}

export class PaymentService {
  static async processPayment(batch: {
    worklogIds: string[]
    excludedWorklogIds: string[]
    excludedFreelancerIds: string[]
    periodStart: string
    periodEnd: string
  }): Promise<PaymentBatch> {
    await delay(500)

    const includedWorklogs = worklogs.filter(
      (w) =>
        batch.worklogIds.includes(w.id) &&
        !batch.excludedWorklogIds.includes(w.id) &&
        !batch.excludedFreelancerIds.includes(w.freelancerId),
    )

    const totalAmount = includedWorklogs.reduce(
      (sum, w) => sum + w.totalEarnings,
      0,
    )
    const totalHours = includedWorklogs.reduce(
      (sum, w) => sum + w.totalHours,
      0,
    )

    return {
      id: `pb-${crypto.randomUUID().slice(0, 8)}`,
      worklogIds: includedWorklogs.map((w) => w.id),
      excludedWorklogIds: batch.excludedWorklogIds,
      excludedFreelancerIds: batch.excludedFreelancerIds,
      totalAmount,
      totalHours,
      periodStart: batch.periodStart,
      periodEnd: batch.periodEnd,
      status: "processed",
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
  }
}
