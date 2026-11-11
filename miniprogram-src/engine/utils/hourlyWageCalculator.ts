/**
 * 时薪计算（纯函数，零 DOM 依赖）。
 * 口径：
 *  - 年收入 = 月收入 × 12 + 年度奖金（口径标签「税前/税后」仅表示你填写的月收入口径，工具不会自动换算税后）；
 *  - 年工作小时 = 全年工作天数 × 每天小时；全年工作天数默认按「每周天数 × 带薪周数」估算，也可手动输入精确扣除假期；
 *  - 所有除法都有 > 0 守卫，不会出现 NaN / Infinity。
 */
export interface WageInput {
  monthlyIncome: number | null
  annualBonus: number | null
  /** 每周工作天数 1–7 */
  daysPerWeek: number
  /** 每天工作小时 0.5–16 */
  hoursPerDay: number
  /** 每年带薪工作周数 1–53（表示纳入计算的工作周数） */
  paidWeeksPerYear: number
  /** true：直接使用全年工作天数（扣除假期更准） */
  useAnnualDays: boolean
  /** 全年工作天数 1–366 */
  annualWorkDays: number
  /** 收入口径标签 */
  basis: 'gross' | 'net'
}

export interface WageResult {
  valid: boolean
  error?: string
  annualIncome: number
  annualWorkDays: number
  annualHours: number
  hourly: number
  perMinute: number
  perSecond: number
  perDay: number
}

export function calcHourlyWage(input: WageInput): WageResult {
  const monthly = input.monthlyIncome
  if (monthly == null || !Number.isFinite(monthly) || monthly <= 0) {
    return invalidWage('请先填写大于 0 的月收入')
  }
  const daysPerWeek = input.daysPerWeek
  const hoursPerDay = input.hoursPerDay
  const weeks = input.paidWeeksPerYear
  if (!Number.isFinite(daysPerWeek) || daysPerWeek <= 0 || daysPerWeek > 7) {
    return invalidWage('每周工作天数需在 1–7 天之间')
  }
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0 || hoursPerDay > 24) {
    return invalidWage('每天工作小时数需大于 0（不超过 24）')
  }
  if (!Number.isFinite(weeks) || weeks <= 0 || weeks > 53) {
    return invalidWage('每年工作周数需在 1–53 之间')
  }
  if (input.useAnnualDays) {
    const d = input.annualWorkDays
    if (!Number.isFinite(d) || d <= 0 || d > 366) {
      return invalidWage('全年工作天数需在 1–366 天之间')
    }
  }

  const bonus = input.annualBonus != null && Number.isFinite(input.annualBonus) && input.annualBonus > 0 ? input.annualBonus : 0
  const annualIncome = monthly * 12 + bonus
  const annualWorkDays = input.useAnnualDays ? input.annualWorkDays : daysPerWeek * weeks
  const annualHours = annualWorkDays * hoursPerDay
  if (!(annualHours > 0)) {
    return invalidWage('年工作小时数需大于 0')
  }

  const hourly = annualIncome / annualHours
  return {
    valid: true,
    annualIncome,
    annualWorkDays,
    annualHours,
    hourly,
    perMinute: hourly / 60,
    perSecond: hourly / 3600,
    perDay: annualWorkDays > 0 ? annualIncome / annualWorkDays : 0,
  }
}

export interface ReverseWageResult {
  valid: boolean
  error?: string
  annualIncome: number
  monthlyIncome: number
  annualHours: number
}

/** 反向计算：期望时薪 + 工作制度 → 对应年收入与月收入 */
export function reverseMonthlyIncome(
  targetHourly: number | null,
  schedule: Pick<WageInput, 'daysPerWeek' | 'hoursPerDay' | 'paidWeeksPerYear' | 'useAnnualDays' | 'annualWorkDays'>,
  annualBonus: number,
): ReverseWageResult {
  if (targetHourly == null || !Number.isFinite(targetHourly) || targetHourly <= 0) {
    return { valid: false, error: '请先填写大于 0 的期望时薪', annualIncome: 0, monthlyIncome: 0, annualHours: 0 }
  }
  const daysPerWeek = schedule.daysPerWeek
  const hoursPerDay = schedule.hoursPerDay
  if (!Number.isFinite(daysPerWeek) || daysPerWeek <= 0) {
    return { valid: false, error: '每周工作天数需大于 0', annualIncome: 0, monthlyIncome: 0, annualHours: 0 }
  }
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
    return { valid: false, error: '每天工作小时数需大于 0', annualIncome: 0, monthlyIncome: 0, annualHours: 0 }
  }
  const annualWorkDays = schedule.useAnnualDays ? schedule.annualWorkDays : daysPerWeek * schedule.paidWeeksPerYear
  if (!Number.isFinite(annualWorkDays) || annualWorkDays <= 0) {
    return { valid: false, error: '全年工作天数需大于 0', annualIncome: 0, monthlyIncome: 0, annualHours: 0 }
  }
  const annualHours = annualWorkDays * hoursPerDay
  const annualIncome = targetHourly * annualHours
  const bonus = Number.isFinite(annualBonus) && annualBonus > 0 ? annualBonus : 0
  const monthlyIncome = (annualIncome - bonus) / 12
  if (monthlyIncome < 0) {
    return { valid: false, error: '年度奖金高于目标年收入，请检查奖金填写', annualIncome, monthlyIncome: 0, annualHours }
  }
  return { valid: true, annualIncome, monthlyIncome, annualHours }
}

function invalidWage(error: string): WageResult {
  return { valid: false, error, annualIncome: 0, annualWorkDays: 0, annualHours: 0, hourly: 0, perMinute: 0, perSecond: 0, perDay: 0 }
}
