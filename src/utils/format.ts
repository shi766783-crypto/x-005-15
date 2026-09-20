/** 数字安全解析：非法/空值回退到 0 */
export function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 时间戳 → YYYY-MM-DD */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 判断某个时间戳是否属于本月 */
export function isCurrentMonth(ts: number): boolean {
  const d = new Date(ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/** 时间戳 → YYYY-MM（按月归集键） */
export function monthKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

/** 最近 n 个月的归集键（含本月，时间升序） */
export function lastMonthKeys(n: number): string[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1).getTime()))
  }
  return keys
}

/** 金额格式化：¥1,234.5（最多两位小数） */
export function formatMoney(v: number): string {
  return `¥${toNumber(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

/** 判断 ISO 日期字符串 a 是否 <= b（YYYY-MM-DD 可直接字典序比较） */
export function isOnOrBefore(a: string, b: string): boolean {
  return a <= b
}

/** 当前日期 YYYY-MM-DD */
export function today(): string {
  return formatDate(Date.now())
}

/** 判断是否已逾期：期望归还日期 < 今天且未归还 */
export function isOverdue(expectedReturnDate: string): boolean {
  return expectedReturnDate < today()
}
