<script setup lang="ts">
import { computed } from 'vue'
import { PROJECT_CATEGORIES, type ProjectCategory } from '../types'
import type { MonthBucket } from '../composables/useExpenseStats'
import { CATEGORY_COLORS } from '../composables/useExpenseStats'
import { formatMoney, formatMoneyShort } from '../utils/format'

const props = defineProps<{
  buckets: MonthBucket[]
}>()

/** Y 轴最大值：取月度总花费的向上取整值（至少 100，避免全矮柱） */
const maxTotal = computed(() => {
  const max = Math.max(100, ...props.buckets.map((b) => b.total))
  const mag = Math.pow(10, Math.floor(Math.log10(max)))
  return Math.ceil(max / mag) * mag
})

/** Y 轴 4 档刻度（0 起） */
const ticks = computed(() => {
  const max = maxTotal.value
  return [0, 0.25, 0.5, 0.75, 1].map((r) => ({ value: max * r, bottom: r * 100 }))
})

function amountOf(b: MonthBucket, category: ProjectCategory): number {
  return b.byCategory.find((x) => x.category === category)?.amount ?? 0
}

function segmentHeight(amount: number): string {
  return `${(amount / maxTotal.value) * 100}%`
}
</script>

<template>
  <div v-if="buckets.length" class="stacked-chart">
    <div class="chart-body">
      <div class="y-axis">
        <div v-for="t in [...ticks].reverse()" :key="t.value" class="tick" :style="{ bottom: t.bottom + '%' }">
          {{ formatMoneyShort(t.value) }}
        </div>
      </div>
      <div class="plot">
        <div class="grid-lines">
          <div v-for="t in ticks" :key="t.value" class="grid-line" :style="{ bottom: t.bottom + '%' }" />
        </div>
        <div class="bars">
          <el-tooltip v-for="b in buckets" :key="b.month" placement="top" :show-after="100">
            <div class="bar-col">
              <div class="bar">
                <div
                  v-for="category in PROJECT_CATEGORIES"
                  :key="category"
                  class="bar-seg"
                  :style="{
                    height: segmentHeight(amountOf(b, category)),
                    background: CATEGORY_COLORS[category],
                  }"
                />
              </div>
            </div>
            <template #content>
              <div class="tip">
                <div class="tip-title">{{ b.month }} · ¥{{ formatMoney(b.total) }}</div>
                <div v-for="c in b.byCategory" :key="c.category" class="tip-row">
                  <span class="tip-dot" :style="{ background: CATEGORY_COLORS[c.category] }" />
                  <span>{{ c.category }}</span>
                  <span class="tip-amt">¥{{ formatMoney(c.amount) }}</span>
                </div>
                <div v-if="!b.byCategory.length" class="tip-empty">本月无花费</div>
              </div>
            </template>
          </el-tooltip>
        </div>
      </div>
    </div>
    <div class="x-axis">
      <span v-for="(b, i) in buckets" :key="b.month" class="x-label">
        <!-- 12 个月时每隔一个显示标签，避免拥挤；6 个月全部显示 -->
        <template v-if="buckets.length <= 6 || i % 2 === 0">{{ b.label }}</template>
      </span>
    </div>
  </div>
  <el-empty v-else description="所选范围内暂无花费记录" :image-size="70" />
</template>

<style scoped>
.stacked-chart {
  width: 100%;
}
.chart-body {
  display: flex;
  height: 300px;
}
.y-axis {
  position: relative;
  width: 52px;
  flex-shrink: 0;
  height: 100%;
}
.tick {
  position: absolute;
  right: 8px;
  transform: translateY(50%);
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.plot {
  position: relative;
  flex: 1;
  height: 100%;
}
.grid-lines {
  position: absolute;
  inset: 0;
}
.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed var(--border);
}
.bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
}
.bar-col {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  padding: 0 4px;
  min-width: 0;
}
.bar {
  width: 100%;
  max-width: 42px;
  margin: 0 auto;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 4px 4px 0 0;
  overflow: hidden;
}
.bar-seg {
  width: 100%;
  transition: filter 0.15s;
}
.bar:hover .bar-seg {
  filter: brightness(1.1);
}
.x-axis {
  display: flex;
  margin-left: 52px;
  margin-top: 8px;
}
.x-label {
  flex: 1;
  text-align: center;
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 0;
}
.tip {
  font-size: 12px;
}
.tip-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.8;
}
.tip-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.tip-amt {
  margin-left: auto;
  padding-left: 12px;
}
.tip-empty {
  color: #fff;
  opacity: 0.8;
}
</style>
