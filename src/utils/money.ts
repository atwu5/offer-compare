/** 金额与格式化工具 */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

export function fmtNum(n: number, digits = 0): string {
  if (!isFinite(n)) return '-'
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function fmtCNY(n: number, digits = 0): string {
  return `¥${fmtNum(n, digits)}`
}

/** 124000 -> "12.4万" */
export function fmtWan(n: number): string {
  const sign = n < 0 ? '-' : ''
  const wan = Math.round(Math.abs(n) / 1000) / 100
  const s = Number.isInteger(wan) ? wan.toFixed(0) : wan.toFixed(1)
  return `${sign}¥${s}万`
}

/** +¥40,000 / -¥12,000 */
export function fmtSignedCNY(n: number, digits = 0): string {
  if (Math.abs(n) < 0.005) return `¥${fmtNum(0, digits)}`
  const sign = n > 0 ? '+' : '-'
  return `${sign}¥${fmtNum(Math.abs(n), digits)}`
}

/** +8.6% / -3.2% */
export function fmtPct(x: number, digits = 1): string {
  if (!isFinite(x)) return '-'
  const v = x * 100
  const sign = v > 0 ? '+' : v < 0 ? '-' : ''
  return `${sign}${Math.abs(v).toFixed(digits)}%`
}

/** 8.6% （不带符号） */
export function fmtPctPlain(x: number, digits = 1): string {
  if (!isFinite(x)) return '-'
  return `${Math.abs(x * 100).toFixed(digits)}%`
}

/** 0.08 -> "8%"，0.065 -> "6.5%" */
export function rateLabel(r: number): string {
  const v = Math.round(r * 10000) / 100
  return Number.isInteger(v) ? `${v.toFixed(0)}%` : `${v}%`
}
