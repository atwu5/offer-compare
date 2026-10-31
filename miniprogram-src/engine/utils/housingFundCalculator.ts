import { HousingFundPolicy } from '../types'
import { clamp, round2, rateLabel } from './money'
import { resolveBase } from './socialInsuranceCalculator'

export interface HousingFundAnnualResult {
  annualEmployee: number
  annualEmployer: number
  steadyBase: number
  employeeRate: number
  employerRate: number
  notices: string[]
}

/**
 * 住房公积金年度计算。
 * 个人与单位缴纳均进入个人公积金账户。
 * 比例超出当地允许区间时按区间边界计算并给出提示。
 */
export function calcHousingFundAnnual(
  policy: HousingFundPolicy,
  monthSalaries: number[],
  customBase: number | null | undefined,
  customEmployeeRate: number | null | undefined,
  customEmployerRate: number | null | undefined,
): HousingFundAnnualResult {
  const notices: string[] = []

  const rawEmployeeRate =
    customEmployeeRate != null && isFinite(customEmployeeRate) && customEmployeeRate > 0
      ? customEmployeeRate
      : policy.employeeRateDefault
  const rawEmployerRate =
    customEmployerRate != null && isFinite(customEmployerRate) && customEmployerRate > 0
      ? customEmployerRate
      : policy.employerRateDefault

  const clampRate = (r: number, which: string): number => {
    if (policy.rateMax > policy.rateMin && (r < policy.rateMin || r > policy.rateMax)) {
      const c = clamp(r, policy.rateMin, policy.rateMax)
      notices.push(
        `公积金${which}比例 ${rateLabel(r)} 超出当地允许区间（${rateLabel(policy.rateMin)}～${rateLabel(policy.rateMax)}），按 ${rateLabel(c)} 计算。`,
      )
      return c
    }
    return r
  }
  const employeeRate = clampRate(rawEmployeeRate, '个人')
  const employerRate = clampRate(rawEmployerRate, '单位')

  const useCustom = customBase != null && isFinite(customBase) && customBase > 0
  let annualEmployee = 0
  let annualEmployer = 0
  for (const s of monthSalaries) {
    const target = useCustom ? (customBase as number) : s
    const { base, notice } = resolveBase(target, policy.baseMin, policy.baseMax, {
      source: useCustom ? 'custom' : 'salary',
      label: '公积金',
    })
    if (notice && !notices.includes(notice)) notices.push(notice)
    annualEmployee += base * employeeRate
    annualEmployer += base * employerRate
  }
  const steadyTarget = useCustom ? (customBase as number) : monthSalaries[monthSalaries.length - 1] ?? 0
  const steady = resolveBase(steadyTarget, policy.baseMin, policy.baseMax, {
    source: useCustom ? 'custom' : 'salary',
    label: '公积金',
  })

  return {
    annualEmployee: round2(annualEmployee),
    annualEmployer: round2(annualEmployer),
    steadyBase: steady.base,
    employeeRate,
    employerRate,
    notices,
  }
}
