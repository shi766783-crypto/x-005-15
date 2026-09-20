import { computed } from 'vue'
import {
  PROJECT_CATEGORIES,
  type Project,
  type ProjectCategory,
} from '../types'
import { useProjectStore } from '../stores/useProjectStore'
import { toNumber } from '../utils/format'

/** 各类别在图表中的配色（类别常量顺序一致） */
export const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  家具制作: '#409eff',
  水电维修: '#67c23a',
  电子制作: '#e6a23c',
  家居改造: '#9c27b0',
  其他: '#909399',
}

export interface ExpenseRecord {
  project: Project
  month: string // YYYY-MM
  cost: number
}

export interface CategoryAmount {
  category: ProjectCategory
  amount: number
}

export interface MonthBucket {
  month: string // YYYY-MM
  label: string // M月
  total: number
  byCategory: CategoryAmount[] // 仅包含当月有花费的类别，按金额降序
}

export type ExpenseRange = 6 | 12 | 0 // 0 表示全部

/** 时间戳 → YYYY-MM */
function monthKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 当前月份 YYYY-MM */
function currentMonthKey(): string {
  return monthKey(Date.now())
}

/** 将月份键整体平移 delta 个月（delta 为负即向前） */
function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** YYYY-MM → 展示标签 */
function monthLabel(key: string): string {
  return `${Number(key.slice(5))}月`
}

/**
 * 花费归属时间：
 * - 已完成项目按完成时间计入完成月份
 * - 未完成（进行中/搁置等）项目实际花费已发生，按最近更新时间计入
 */
function expenseMonth(p: Project): string {
  return monthKey(p.completedAt ?? p.updatedAt ?? p.createdAt)
}

/**
 * 花费统计派生数据：
 * 以项目记录的「实际花费」为来源，按月与按项目类别两个维度聚合。
 */
export function useExpenseStats() {
  const projectStore = useProjectStore()

  /** 所有已记录实际花费的项目（花费 > 0） */
  const expenseRecords = computed<ExpenseRecord[]>(() =>
    projectStore.projects.value
      .map((p) => ({ project: p, month: expenseMonth(p), cost: toNumber(p.actualCost) }))
      .filter((r) => r.cost > 0)
      .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0)),
  )

  /** 有花费的最早 / 最近月份 */
  const firstMonth = computed(() => expenseRecords.value[0]?.month ?? currentMonthKey())
  const lastMonth = computed(() =>
    expenseRecords.value.length
      ? expenseRecords.value[expenseRecords.value.length - 1].month
      : currentMonthKey(),
  )

  /** 生成从 start 到 end（含端点）的连续月份键，无花费的月份补零 */
  function buildMonthRange(start: string, end: string): string[] {
    const keys: string[] = []
    let cur = start
    // 月份键可直接字典序比较，安全上限避免异常数据导致死循环
    let guard = 0
    while (cur <= end && guard < 1200) {
      keys.push(cur)
      cur = shiftMonth(cur, 1)
      guard++
    }
    return keys
  }

  /**
   * 按月聚合的花费桶。
   * range 为 6/12 时取最近 N 个月（含当月），为 0 时取数据覆盖的全部月份。
   */
  function monthlyBuckets(range: ExpenseRange): MonthBucket[] {
    if (!expenseRecords.value.length) return []
    const end = lastMonth.value
    const start = range === 0 ? firstMonth.value : shiftMonth(end, -(range - 1))
    const rangeKeys = buildMonthRange(start, end)

    const monthMap = new Map<string, Map<ProjectCategory, number>>()
    for (const r of expenseRecords.value) {
      if (r.month < start || r.month > end) continue
      if (!monthMap.has(r.month)) monthMap.set(r.month, new Map())
      const catMap = monthMap.get(r.month)!
      catMap.set(r.project.category, (catMap.get(r.project.category) ?? 0) + r.cost)
    }

    return rangeKeys.map((month) => {
      const catMap = monthMap.get(month)
      const byCategory: CategoryAmount[] = catMap
        ? PROJECT_CATEGORIES.map((category) => ({ category, amount: catMap.get(category) ?? 0 }))
            .filter((x) => x.amount > 0)
            .sort((a, b) => b.amount - a.amount)
        : []
      return {
        month,
        label: monthLabel(month),
        total: byCategory.reduce((s, x) => s + x.amount, 0),
        byCategory,
      }
    })
  }

  /** 指定月份范围内的按类别聚合（堆叠图与环形图共用同一口径） */
  function categoryTotals(range: ExpenseRange): CategoryAmount[] {
    const buckets = monthlyBuckets(range)
    const map = new Map<ProjectCategory, number>()
    for (const b of buckets) {
      for (const c of b.byCategory) {
        map.set(c.category, (map.get(c.category) ?? 0) + c.amount)
      }
    }
    return PROJECT_CATEGORIES.map((category) => ({ category, amount: map.get(category) ?? 0 }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }

  /** 累计花费总额 */
  const totalCost = computed(() => expenseRecords.value.reduce((s, r) => s + r.cost, 0))

  /** 有花费记录的项目数 */
  const expenseProjectCount = computed(() => expenseRecords.value.length)

  return {
    expenseRecords,
    monthlyBuckets,
    categoryTotals,
    totalCost,
    expenseProjectCount,
  }
}
