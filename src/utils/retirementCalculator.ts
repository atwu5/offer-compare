/**
 * 退休倒计时（纯函数，零 DOM 依赖）。
 *
 * 当前只开放「自定义退休年龄」模式（可准确计算）；
 * 「按中国大陆法定退休年龄估算」涉及渐进式延迟退休的复杂规则，在取得可验证的政策数据前标记为待完善，不开放。
 */
import { addYears, diffCalendarDays, diffYMD, parseYMD, type YMD } from './dateMath'

export interface RetirementInput {
  /** YYYY-MM-DD */
  birth: string
  /** 计划退休年龄（周岁），1–100 */
  retireAge: number
}

export interface RetirementResult {
  valid: boolean
  error?: string
  birth: YMD
  retireDate: YMD
  /** 距退休自然日数；负值表示已超过 */
  daysUntil: number
  /** 距退休的年/月/日（exceeded 时为已退休时长） */
  ymd: { years: number; months: number; days: number }
  /** 从出生到预计退休日的走过进度（0–100） */
  progressPct: number
  exceeded: boolean
  /** exceeded 时：已过天数 */
  daysPast: number
}

export function calcRetirement(input: RetirementInput, today: YMD): RetirementResult {
  const birth = parseYMD(input.birth)
  if (!birth) {
    return invalid(today, '请填写正确的出生日期')
  }
  const age = Math.round(input.retireAge)
  if (!Number.isFinite(age) || age < 1 || age > 100) {
    return invalid(today, '退休年龄需在 1–100 岁之间')
  }
  if (diffCalendarDays(birth, today) > 0) {
    return invalid(today, '出生日期不能晚于今天')
  }

  // 2/29 出生的用户按 2/28 落点计算（工具内统一约定，页面有说明）
  const retireDate = addYears(birth, age, 'day28')
  const totalSpanDays = diffCalendarDays(retireDate, birth)
  const elapsed = diffCalendarDays(today, birth)
  const daysUntil = diffCalendarDays(retireDate, today)
  const exceeded = daysUntil < 0

  return {
    valid: true,
    birth,
    retireDate,
    daysUntil,
    ymd: exceeded ? diffYMD(retireDate, today) : diffYMD(today, retireDate),
    progressPct: totalSpanDays > 0 ? Math.min(100, Math.max(0, (elapsed / totalSpanDays) * 100)) : 100,
    exceeded,
    daysPast: exceeded ? -daysUntil : 0,
  }
}

function invalid(today: YMD, error: string): RetirementResult {
  return {
    valid: false,
    error,
    birth: today,
    retireDate: today,
    daysUntil: 0,
    ymd: { years: 0, months: 0, days: 0 },
    progressPct: 0,
    exceeded: false,
    daysPast: 0,
  }
}
