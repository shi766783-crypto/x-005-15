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

/** 金额格式化：保留两位小数并加千分位，如 1234.5 → 1,234.50 */
export function formatMoney(v: number): string {
  return toNumber(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 金额简写：坐标轴/标签用，如 12345 → 1.2万，4500 → 4500 */
export function formatMoneyShort(v: number): string {
  const n = toNumber(v)
  if (Math.abs(n) >= 10000) return `${(n / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 1 })}万`
  if (Number.isInteger(n)) return String(n)
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 1 })
}
