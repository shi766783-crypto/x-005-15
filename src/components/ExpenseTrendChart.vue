<script setup lang="ts">
import { computed } from 'vue'
import type { MonthExpense } from '../composables/useExpenseStats'
import { formatMoney } from '../utils/format'

const props = defineProps<{ data: MonthExpense[] }>()

const W = 720
const H = 280
const PAD = { top: 24, right: 16, bottom: 30, left: 52 }
const innerW = W - PAD.left - PAD.right
const innerH = H - PAD.top - PAD.bottom

/** 纵轴上限向上取到「好看」的刻度（1/2/2.5/5/10 × 10ⁿ） */
function niceCeil(v: number): number {
  if (v <= 0) return 100
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return nice * pow
}

/** 轴刻度用的紧凑金额：12000 → 1.2万 */
function compactMoney(v: number): string {
  if (v >= 10000) return `${+(v / 10000).toFixed(1)}万`
  return `${Math.round(v)}`
}

const yMax = computed(() => niceCeil(Math.max(0, ...props.data.map((d) => d.total))))
const maxTotal = computed(() => Math.max(0, ...props.data.map((d) => d.total)))

function y(v: number): number {
  return PAD.top + innerH - (v / yMax.value) * innerH
}

const gridLines = computed(() =>
  [0, 1, 2, 3, 4].map((i) => {
    const v = (yMax.value / 4) * i
    return { v, y: y(v), label: compactMoney(v) }
  }),
)

const bars = computed(() => {
  const n = Math.max(1, props.data.length)
  const bw = (innerW / n) * 0.52
  return props.data.map((d, i) => {
    const cx = PAD.left + (innerW / n) * (i + 0.5)
    return {
      ...d,
      cx,
      x: cx - bw / 2,
      w: bw,
      y: y(d.total),
      h: (d.total / yMax.value) * innerH,
      isMax: d.total > 0 && d.total === maxTotal.value,
    }
  })
})

/** 3 个月移动平均，用于叠加趋势线 */
const avgPoints = computed(() => {
  const n = Math.max(1, props.data.length)
  return props.data.map((_, i) => {
    const win = props.data.slice(Math.max(0, i - 2), i + 1)
    const avg = win.reduce((s, x) => s + x.total, 0) / win.length
    return { x: PAD.left + (innerW / n) * (i + 0.5), y: y(avg) }
  })
})

const avgPath = computed(() =>
  avgPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '),
)
</script>

<template>
  <div class="trend-chart">
    <div class="legend">
      <span class="legend-item"><i class="swatch swatch-bar" />月度花费</span>
      <span class="legend-item"><i class="swatch swatch-line" />3 个月移动平均</span>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" class="chart" role="img" aria-label="月度花费趋势图">
      <g v-for="g in gridLines" :key="g.v">
        <line :x1="PAD.left" :x2="W - PAD.right" :y1="g.y" :y2="g.y" class="grid" />
        <text :x="PAD.left - 8" :y="g.y + 4" class="axis-label" text-anchor="end">{{ g.label }}</text>
      </g>

      <g v-for="b in bars" :key="b.key">
        <rect :x="b.x" :y="b.y" :width="b.w" :height="Math.max(0, b.h)" rx="3" :class="['bar', { 'bar-max': b.isMax }]">
          <title>{{ `${b.key}：${formatMoney(b.total)}（${b.count} 个项目）` }}</title>
        </rect>
        <text v-if="b.total > 0" :x="b.cx" :y="b.y - 6" class="bar-value" text-anchor="middle">
          {{ compactMoney(b.total) }}
        </text>
        <text :x="b.cx" :y="H - 10" class="axis-label" text-anchor="middle">{{ b.label }}</text>
      </g>

      <path :d="avgPath" class="avg-line" fill="none" />
      <circle v-for="(p, i) in avgPoints" :key="i" :cx="p.x" :cy="p.y" r="3" class="avg-dot" />
    </svg>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.swatch-bar {
  background: #a0cfff;
}
.swatch-line {
  width: 14px;
  height: 3px;
  border-radius: 2px;
  background: #e6a23c;
}
.chart {
  display: block;
  width: 100%;
  height: auto;
}
.grid {
  stroke: var(--border);
  stroke-dasharray: 3 4;
}
.axis-label {
  font-size: 11px;
  fill: var(--text-secondary);
}
.bar {
  fill: #a0cfff;
}
.bar:hover {
  fill: #79b1ff;
}
.bar-max {
  fill: #409eff;
}
.bar-value {
  font-size: 10px;
  fill: var(--text-secondary);
}
.avg-line {
  stroke: #e6a23c;
  stroke-width: 2;
  stroke-dasharray: 5 4;
}
.avg-dot {
  fill: #e6a23c;
}
</style>
