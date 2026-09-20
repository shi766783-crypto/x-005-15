<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryAmount } from '../composables/useExpenseStats'
import { CATEGORY_COLORS } from '../composables/useExpenseStats'
import { formatMoney } from '../utils/format'

const props = defineProps<{
  data: CategoryAmount[]
  total: number
  centerLabel?: string
}>()

interface Segment {
  category: string
  amount: number
  color: string
  dash: string
  offset: number
  percent: number
}

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const segments = computed<Segment[]>(() => {
  let acc = 0
  return props.data.map((d) => {
    const percent = props.total > 0 ? d.amount / props.total : 0
    const seg = {
      category: d.category,
      amount: d.amount,
      color: CATEGORY_COLORS[d.category],
      dash: `${percent * CIRCUMFERENCE} ${CIRCUMFERENCE}`,
      offset: -acc * CIRCUMFERENCE,
      percent: Math.round(percent * 100),
    }
    acc += percent
    return seg
  })
})
</script>

<template>
  <div class="donut-wrap">
    <svg viewBox="0 0 140 140" class="donut-svg">
      <circle cx="70" cy="70" :r="RADIUS" fill="none" stroke="var(--border)" stroke-width="16" />
      <circle
        v-for="s in segments"
        :key="s.category"
        cx="70"
        cy="70"
        :r="RADIUS"
        fill="none"
        :stroke="s.color"
        stroke-width="16"
        :stroke-dasharray="s.dash"
        :stroke-dashoffset="s.offset"
        transform="rotate(-90 70 70)"
      >
        <title>{{ s.category }}：¥{{ formatMoney(s.amount) }}（{{ s.percent }}%）</title>
      </circle>
    </svg>
    <div class="donut-center">
      <div class="center-value">¥{{ formatMoney(total) }}</div>
      <div class="center-label">{{ centerLabel ?? '累计花费' }}</div>
    </div>
  </div>
</template>

<style scoped>
.donut-wrap {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto;
}
.donut-svg {
  width: 100%;
  height: 100%;
}
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}
.center-value {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}
.center-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}
</style>
