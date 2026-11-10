/** 工具箱页面层格式化小工具（不含 tt.* 依赖） */
import { fmtCNY } from '../engine/utils/money'

/** 金额两位小数（千分位） */
export function money2(n: number): string {
  return fmtCNY(n, 2)
}

/** 整数千分位 */
export function fmtInt(n: number): string {
  if (!isFinite(n)) return '-'
  return Math.round(n).toLocaleString('zh-CN')
}

/** 小费率：秒薪较小时保留更多小数位，避免错误显示 0.00 */
export function fmtRate(n: number): string {
  if (!isFinite(n)) return '—'
  if (n >= 0.01) return n.toFixed(2)
  if (n >= 0.0001) return n.toFixed(4)
  return n.toFixed(6)
}
