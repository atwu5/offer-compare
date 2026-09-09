import { round2 } from './money'

/**
 * 个人所得税计算器（模块化，与城市政策、社保计算分离）。
 *
 * 口径说明：采用全年综合所得「年度汇算」口径——
 * 应纳税所得额 = 全年税前现金收入 − 60,000 基本减除费用 − 五险一金个人缴纳 − 专项附加扣除 × 12，
 * 按年度税率表一次性计算。未模拟累计预扣法的月度差异，但全年合计更接近汇算清缴结果。
 * 年终奖按并入综合所得计税（未使用全年一次性奖金单独计税方式）。
 */

export const ANNUAL_BASIC_DEDUCTION = 60000

export interface TaxBracket {
  upTo: number
  rate: number
  quickDeduction: number
  label: string
}

/** 综合所得年度税率表 */
export const ANNUAL_TAX_BRACKETS: TaxBracket[] = [
  { upTo: 36000, rate: 0.03, quickDeduction: 0, label: '全年应纳税所得额不超过 36,000 元' },
  { upTo: 144000, rate: 0.1, quickDeduction: 2520, label: '超过 36,000 元至 144,000 元' },
  { upTo: 300000, rate: 0.2, quickDeduction: 16920, label: '超过 144,000 元至 300,000 元' },
  { upTo: 420000, rate: 0.25, quickDeduction: 31920, label: '超过 300,000 元至 420,000 元' },
  { upTo: 660000, rate: 0.3, quickDeduction: 52920, label: '超过 420,000 元至 660,000 元' },
  { upTo: 960000, rate: 0.35, quickDeduction: 85920, label: '超过 660,000 元至 960,000 元' },
  { upTo: Infinity, rate: 0.45, quickDeduction: 181920, label: '超过 960,000 元' },
]

export interface AnnualTaxResult {
  taxableIncome: number
  tax: number
  rate: number
  quickDeduction: number
  bracketLabel: string
}

export function calcAnnualTax(taxableIncome: number): AnnualTaxResult {
  if (!isFinite(taxableIncome) || taxableIncome <= 0) {
    return {
      taxableIncome: Math.max(0, round2(taxableIncome || 0)),
      tax: 0,
      rate: 0,
      quickDeduction: 0,
      bracketLabel: '低于基本减除费用，全年无需缴纳',
    }
  }
  const bracket =
    ANNUAL_TAX_BRACKETS.find((b) => taxableIncome <= b.upTo) ??
    ANNUAL_TAX_BRACKETS[ANNUAL_TAX_BRACKETS.length - 1]
  const tax = Math.max(0, round2(taxableIncome * bracket.rate - bracket.quickDeduction))
  return {
    taxableIncome: round2(taxableIncome),
    tax,
    rate: bracket.rate,
    quickDeduction: bracket.quickDeduction,
    bracketLabel: bracket.label,
  }
}
