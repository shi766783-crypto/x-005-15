import { computed } from 'vue'
import { PROJECT_CATEGORIES, type Project, type ProjectCategory, type ProjectStatus } from '../types'
import { useProjectStore } from '../stores/useProjectStore'
import { monthKey, lastMonthKeys, toNumber } from '../utils/format'

export interface MonthExpense {
  key: string // YYYY-MM
  label: string // 坐标轴短标签，如 26/09
  total: number // 当月花费合计
  count: number // 当月有花费记录的项目数
}

export interface CategoryExpense {
  category: ProjectCategory
  total: number
  count: number
  percent: number // 0-100
}

export interface TopExpenseProject {
  id: string
  name: string
  category: ProjectCategory
  status: ProjectStatus
  cost: number
  month: string // 花费归集月份 YYYY-MM
}

/** 趋势图覆盖的月份窗口 */
export const EXPENSE_MONTHS_WINDOW = 12

/**
 * 花费统计派生数据：把散落在各项目上的实际花费按「月 / 项目类别」聚合。
 * 纯派生逻辑，不写数据，与视图解耦。
 *
 * 归月规则：已完成项目按完成时间归月，其余项目按最近更新时间（即花费最后编辑的时间）归月。
 */
export function useExpenseStats() {
  const projectStore = useProjectStore()

  /** 有实际花费记录的项目 */
  const expenseProjects = computed(() =>
    projectStore.projects.value.filter((p) => toNumber(p.actualCost) > 0),
  )

  /** 项目花费的归属月份 */
  function expenseMonth(p: Project): string {
    return monthKey(p.completedAt ?? p.updatedAt)
  }

  /** 累计花费（全部历史） */
  const totalCost = computed(() =>
    expenseProjects.value.reduce((s, p) => s + toNumber(p.actualCost), 0),
  )

  /** 近 12 个月月度聚合（保留无花费的月份，保证趋势连续） */
  const monthly = computed<MonthExpense[]>(() => {
    const bucket = new Map<string, MonthExpense>(
      lastMonthKeys(EXPENSE_MONTHS_WINDOW).map((key) => {
        const [y, m] = key.split('-')
        return [key, { key, label: `${(y ?? '').slice(2)}/${m}`, total: 0, count: 0 }]
      }),
    )
    for (const p of expenseProjects.value) {
      const item = bucket.get(expenseMonth(p))
      if (item) {
        item.total += toNumber(p.actualCost)
        item.count += 1
      }
    }
    return [...bucket.values()]
  })

  /** 本月花费 */
  const thisMonthCost = computed(() => monthly.value[monthly.value.length - 1]?.total ?? 0)

  /** 上月花费 */
  const prevMonthCost = computed(() => monthly.value[monthly.value.length - 2]?.total ?? 0)

  /** 环比上月（%）：上月无花费时返回 null，表示无可比基数 */
  const monthOverMonth = computed<number | null>(() => {
    if (prevMonthCost.value <= 0) return null
    return ((thisMonthCost.value - prevMonthCost.value) / prevMonthCost.value) * 100
  })

  /** 近 12 个月月均花费 */
  const avgMonthlyCost = computed(
    () => monthly.value.reduce((s, m) => s + m.total, 0) / EXPENSE_MONTHS_WINDOW,
  )

  /** 按项目类别聚合（按花费降序，仅保留有花费的类别） */
  const byCategory = computed<CategoryExpense[]>(() => {
    const total = totalCost.value
    return PROJECT_CATEGORIES.map((category) => {
      const list = expenseProjects.value.filter((p) => p.category === category)
      const sum = list.reduce((s, p) => s + toNumber(p.actualCost), 0)
      return {
        category,
        total: sum,
        count: list.length,
        percent: total > 0 ? (sum / total) * 100 : 0,
      }
    })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
  })

  /** 花费最高的项目 TOP 5 */
  const topProjects = computed<TopExpenseProject[]>(() =>
    [...expenseProjects.value]
      .sort((a, b) => toNumber(b.actualCost) - toNumber(a.actualCost))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        status: p.status,
        cost: toNumber(p.actualCost),
        month: expenseMonth(p),
      })),
  )

  return {
    expenseProjects,
    totalCost,
    monthly,
    thisMonthCost,
    prevMonthCost,
    monthOverMonth,
    avgMonthlyCost,
    byCategory,
    topProjects,
  }
}
