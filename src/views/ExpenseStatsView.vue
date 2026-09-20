<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseStats } from '../composables/useExpenseStats'
import { STATUS_TAG, type ProjectStatus } from '../types'
import { formatMoney } from '../utils/format'
import StatCard from '../components/StatCard.vue'
import ExpenseTrendChart from '../components/ExpenseTrendChart.vue'
import CategoryDonut from '../components/CategoryDonut.vue'

const router = useRouter()
const {
  expenseProjects,
  totalCost,
  monthly,
  thisMonthCost,
  monthOverMonth,
  avgMonthlyCost,
  byCategory,
  topProjects,
} = useExpenseStats()

const hasData = computed(() => expenseProjects.value.length > 0)

/** 环比文案：上涨红、下降绿（花费降了是好事），无可比基数显示 — */
function formatMom(v: number | null): string {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(0)}%`
}

function momColor(v: number | null): string {
  if (v === null) return '#909399'
  return v > 0 ? '#f56c6c' : '#67c23a'
}

const momCardColor = computed(() => momColor(monthOverMonth.value))

/** 月度明细行（时间倒序），逐行附带环比 */
const monthlyRows = computed(() =>
  monthly.value
    .map((m, i, arr) => {
      const prev = i > 0 ? (arr[i - 1]?.total ?? 0) : 0
      const mom = i > 0 && prev > 0 ? ((m.total - prev) / prev) * 100 : null
      return { ...m, mom }
    })
    .reverse(),
)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">花费统计</h2>
      <span class="muted">已完成项目按完成时间归月，其余按最近更新时间归月</span>
    </div>

    <div class="stat-grid">
      <StatCard label="累计花费" :value="formatMoney(totalCost)" color="#409eff" icon="Wallet" />
      <StatCard label="本月花费" :value="formatMoney(thisMonthCost)" color="#e6a23c" icon="Coin" />
      <StatCard label="近 12 个月月均" :value="formatMoney(avgMonthlyCost)" color="#67c23a" icon="DataAnalysis" />
      <StatCard label="本月环比" :value="formatMom(monthOverMonth)" :color="momCardColor" icon="TrendCharts" />
    </div>

    <section v-if="!hasData" class="card">
      <el-empty description="还没有花费记录，在项目详情的「进度记录」中填写实际花费后，会自动汇总到这里">
        <el-button type="primary" @click="router.push({ name: 'projects' })">去看看项目</el-button>
      </el-empty>
    </section>

    <template v-else>
      <section class="card" style="margin-bottom: 16px">
        <div class="section-title">月度花费趋势（近 12 个月）</div>
        <ExpenseTrendChart :data="monthly" />
      </section>

      <div class="two-col">
        <section class="card">
          <div class="section-title">项目类别构成</div>
          <CategoryDonut :data="byCategory" :total="totalCost" />
        </section>

        <section class="card">
          <div class="section-title">花费最高的项目 TOP 5</div>
          <el-table :data="topProjects" size="small" border>
            <el-table-column label="项目" min-width="130">
              <template #default="{ row }">
                <router-link :to="{ name: 'project-detail', params: { id: row.id } }">{{ row.name }}</router-link>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="类别" width="96" align="center" />
            <el-table-column label="状态" width="86" align="center">
              <template #default="{ row }">
                <el-tag :type="STATUS_TAG[row.status as ProjectStatus]" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="month" label="归集月份" width="96" align="center" />
            <el-table-column label="花费" width="110" align="right">
              <template #default="{ row }">{{ formatMoney(row.cost) }}</template>
            </el-table-column>
          </el-table>
        </section>
      </div>

      <section class="card">
        <div class="section-title">月度明细</div>
        <el-table :data="monthlyRows" size="small" border>
          <el-table-column prop="key" label="月份" width="120" />
          <el-table-column label="花费" min-width="120" align="right">
            <template #default="{ row }">{{ formatMoney(row.total) }}</template>
          </el-table-column>
          <el-table-column prop="count" label="花费项目数" width="110" align="center" />
          <el-table-column label="环比上月" width="110" align="center">
            <template #default="{ row }">
              <span :style="{ color: row.mom === null ? undefined : momColor(row.mom) }">{{ formatMom(row.mom) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
.section-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 12px;
}
</style>
