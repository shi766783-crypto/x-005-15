<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { PROJECT_CATEGORIES, type ProjectCategory } from '../types'
import { useExpenseStats, CATEGORY_COLORS, type ExpenseRange, type ExpenseRecord } from '../composables/useExpenseStats'
import ExpenseBarChart from '../components/ExpenseBarChart.vue'
import ExpenseDonutChart from '../components/ExpenseDonutChart.vue'
import { formatMoney } from '../utils/format'

const router = useRouter()
const { expenseRecords, monthlyBuckets, categoryTotals, totalCost, expenseProjectCount } = useExpenseStats()

const range = ref<ExpenseRange>(12)
const rangeOptions: { label: string; value: ExpenseRange }[] = [
  { label: '近 6 个月', value: 6 },
  { label: '近 12 个月', value: 12 },
  { label: '全部', value: 0 },
]

const buckets = computed(() => monthlyBuckets(range.value))
const categories = computed(() => categoryTotals(range.value))
const rangeTotal = computed(() => buckets.value.reduce((s, b) => s + b.total, 0))

const rangeText = computed(() =>
  buckets.value.length ? `${buckets.value[0].month} 至 ${buckets.value[buckets.value.length - 1].month}` : '暂无数据',
)

/** 当前自然月 / 上月花费（不受时间范围选择影响） */
function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const thisMonth = currentMonthKey()
const lastMonth = shiftMonth(thisMonth, -1)

const monthCost = (key: string) =>
  expenseRecords.value.filter((r) => r.month === key).reduce((s, r) => s + r.cost, 0)
const thisMonthCost = computed(() => monthCost(thisMonth))
const lastMonthCost = computed(() => monthCost(lastMonth))

/** 环比变化百分比：上月为 0 时无法计算 */
const momDelta = computed(() => {
  if (lastMonthCost.value <= 0) return null
  return ((thisMonthCost.value - lastMonthCost.value) / lastMonthCost.value) * 100
})

const recordsDesc = computed(() => [...expenseRecords.value].sort((a, b) => (a.month < b.month ? 1 : -1)))

function categoryPercent(amount: number): number {
  return rangeTotal.value > 0 ? Math.round((amount / rangeTotal.value) * 100) : 0
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">花费统计</h2>
      <el-radio-group v-model="range" size="small">
        <el-radio-button v-for="o in rangeOptions" :key="o.value" :value="o.value">{{ o.label }}</el-radio-button>
      </el-radio-group>
    </div>

    <div class="stat-grid">
      <div class="card stat-card">
        <div class="stat-label">本月花费</div>
        <div class="stat-value">¥{{ formatMoney(thisMonthCost) }}</div>
        <div class="stat-foot" v-if="momDelta !== null">
          较上月
          <span :class="momDelta > 0 ? 'up' : momDelta < 0 ? 'down' : 'flat'">
            <el-icon v-if="momDelta > 0"><Top /></el-icon>
            <el-icon v-else-if="momDelta < 0"><Bottom /></el-icon>
            {{ Math.abs(momDelta).toFixed(1) }}%
          </span>
        </div>
        <div class="stat-foot muted" v-else>上月无花费，暂无环比</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">区间花费合计</div>
        <div class="stat-value" style="color: #409eff">¥{{ formatMoney(rangeTotal) }}</div>
        <div class="stat-foot muted">{{ rangeText }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">累计花费</div>
        <div class="stat-value" style="color: #e6a23c">¥{{ formatMoney(totalCost) }}</div>
        <div class="stat-foot muted">全部已记录项目</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">有花费的项目</div>
        <div class="stat-value" style="color: #67c23a">{{ expenseProjectCount }} 个</div>
        <div class="stat-foot muted">平均 ¥{{ formatMoney(expenseProjectCount ? totalCost / expenseProjectCount : 0) }}/项</div>
      </div>
    </div>

    <section class="card" style="margin-bottom: 16px">
      <div class="section-head">
        <span class="section-title">每月花费趋势（按项目类别堆叠）</span>
        <div class="legend">
          <span v-for="c in PROJECT_CATEGORIES" :key="c" class="legend-item">
            <i class="legend-dot" :style="{ background: CATEGORY_COLORS[c] }" />{{ c }}
          </span>
        </div>
      </div>
      <ExpenseBarChart :buckets="buckets" />
    </section>

    <div class="two-col">
      <section class="card">
        <div class="section-title">类别花费占比</div>
        <ExpenseDonutChart :data="categories" :total="rangeTotal" center-label="区间花费" />
      </section>

      <section class="card">
        <div class="section-title">类别花费明细</div>
        <div v-if="categories.length">
          <div v-for="c in categories" :key="c.category" class="dist-row">
            <span class="dist-name">
              <i class="legend-dot" :style="{ background: CATEGORY_COLORS[c.category] }" />{{ c.category }}
            </span>
            <el-progress :percentage="categoryPercent(c.amount)" />
            <span class="dist-amt">¥{{ formatMoney(c.amount) }}</span>
          </div>
        </div>
        <el-empty v-else description="所选范围内暂无花费" :image-size="70" />
      </section>
    </div>

    <section class="card">
      <div class="section-title">花费明细（共 {{ recordsDesc.length }} 条）</div>
      <el-table
        v-if="recordsDesc.length"
        :data="recordsDesc"
        size="small"
        border
        max-height="360"
        @row-click="(row: ExpenseRecord) => router.push({ name: 'project-detail', params: { id: row.project.id } })"
      >
        <el-table-column prop="month" label="月份" width="110" />
        <el-table-column label="项目" min-width="180">
          <template #default="{ row }">
            {{ row.project.name }}
            <el-tag size="small" :style="{ marginLeft: '8px', color: CATEGORY_COLORS[row.project.category as ProjectCategory], borderColor: CATEGORY_COLORS[row.project.category as ProjectCategory] }">
              {{ row.project.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.project.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="实际花费" width="130" align="right">
          <template #default="{ row }">
            <span class="cost">¥{{ formatMoney(row.cost) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="还没有项目记录实际花费，去项目详情中填写吧" :image-size="70" />
    </section>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin: 6px 0 4px;
}
.stat-foot {
  font-size: 12px;
}
.stat-foot .up {
  color: var(--danger);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.stat-foot .down {
  color: var(--success);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.stat-foot .flat {
  color: var(--text-secondary);
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}
.section-title {
  font-weight: 600;
  font-size: 15px;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
.dist-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.dist-name {
  width: 86px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
}
.dist-row .el-progress {
  flex: 1;
}
.dist-amt {
  width: 100px;
  text-align: right;
  font-weight: 600;
  flex-shrink: 0;
}
.cost {
  font-weight: 600;
  color: var(--warning);
}
</style>
