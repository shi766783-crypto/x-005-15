<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryExpense } from '../composables/useExpenseStats'
import { formatMoney } from '../utils/format'

const props = defineProps<{ data: CategoryExpense[]; total: number }>()

/** 与 Element Plus 主色系一致的分类配色 */
const COLORS = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#9c27b0']

const R = 60
const C = 2 * Math.PI * R

/** 用 stroke-dasharray 把圆周按比例切分给各类别 */
const segments = computed(() => {
  let acc = 0
  return props.data.map((d, i) => {
    const len = (d.percent / 100) * C
    const seg = { ...d, color: COLORS[i % COLORS.length], dash: `${len} ${C - len}`, offset: -acc }
    acc += len
    return seg
  })
})
</script>

<template>
  <div class="donut-wrap">
    <svg viewBox="0 0 160 160" class="donut" role="img" aria-label="项目类别花费构成">
      <circle cx="80" cy="80" :r="R" class="donut-bg" />
      <g transform="rotate(-90 80 80)">
        <circle
          v-for="s in segments"
          :key="s.category"
          cx="80"
          cy="80"
          :r="R"
          class="donut-seg"
          :stroke="s.color"
          :stroke-dasharray="s.dash"
          :stroke-dashoffset="s.offset"
        >
          <title>{{ `${s.category}：${formatMoney(s.total)}（${Math.round(s.percent)}%）` }}</title>
        </circle>
      </g>
      <text x="80" y="76" class="donut-total" text-anchor="middle">{{ formatMoney(total) }}</text>
      <text x="80" y="96" class="donut-caption" text-anchor="middle">累计花费</text>
    </svg>

    <ul class="donut-legend">
      <li v-for="s in segments" :key="s.category">
        <i class="dot" :style="{ background: s.color }" />
        <span class="name">{{ s.category }}</span>
        <span class="count muted">{{ s.count }} 个项目</span>
        <span class="amount">{{ formatMoney(s.total) }}</span>
        <span class="percent">{{ Math.round(s.percent) }}%</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.donut-wrap {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.donut {
  width: 160px;
  height: 160px;
  flex-shrink: 0;
}
.donut-bg {
  fill: none;
  stroke: #f0f2f5;
  stroke-width: 26;
}
.donut-seg {
  fill: none;
  stroke-width: 26;
  transition: stroke-width 0.15s;
}
.donut-seg:hover {
  stroke-width: 30;
}
.donut-total {
  font-size: 15px;
  font-weight: 700;
  fill: var(--text);
}
.donut-caption {
  font-size: 11px;
  fill: var(--text-secondary);
}
.donut-legend {
  flex: 1;
  min-width: 220px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.donut-legend li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.name {
  font-weight: 500;
}
.count {
  flex: 1;
  font-size: 12px;
}
.amount {
  font-weight: 600;
}
.percent {
  width: 42px;
  text-align: right;
  color: var(--text-secondary);
}
</style>
