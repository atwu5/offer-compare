/**
 * 出生天数计算（纯函数，零 DOM 依赖）。
 * 口径统一约定：
 *  - 「已经出生 N 天」= 今天 − 出生日的自然日差（出生当天为 0 天）；
 *  - 「第 N 天」= 来到世界的第 N 个自然日 = 出生日 + (N−1) 天（出生当天是第 1 天）。
 */
import {
  ageYears,
  diffCalendarDays,
  diffYMD,
  nextYearlyOccurrence,
  parseYMD,
  upcomingDayMilestones,
  type LeapPreference,
  type Milestone,
  type YMD,
} from './dateMath'

export interface DaysAliveInput {
  /** YYYY-MM-DD */
  birth: string
  /** 'HH:mm' 或 '' */
  birthTime: string
  /** 2/29 出生在非闰年的生日落点偏好 */
  leapPref: LeapPreference
}

export interface DaysAliveResult {
  valid: boolean
  error?: string
  birth: YMD
  /** 已经出生的自然日数（出生当天 = 0） */
  daysElapsed: number
  /** 第 N 天 = daysElapsed + 1 */
  dayOrdinal: number
  age: number
  ageYMD: { years: number; months: number; days: number }
  weeks: number
  nextBirthday: { date: YMD; daysUntil: number; turning: number; isToday: boolean }
  milestones: Milestone[]
  /** 填写出生时间时才有：按真实时间差的完整小时 / 分钟数 */
  hoursAlive?: number
  minutesAlive?: number
}

export function calcDaysAlive(input: DaysAliveInput, today: YMD, nowMs: number): DaysAliveResult {
  const birth = parseYMD(input.birth)
  if (!birth) {
    return invalid(input.birth, today, '请填写正确的出生日期')
  }
  if (diffCalendarDays(birth, today) > 0) {
    return invalid(input.birth, today, '出生日期不能晚于今天')
  }

  const daysElapsed = diffCalendarDays(today, birth)
  const age = ageYears(birth, today, input.leapPref)
  const ageYMD = diffYMD(birth, today)
  const occ = nextYearlyOccurrence(birth, today, input.leapPref)
  const nextBirthday = {
    date: occ.date,
    daysUntil: occ.daysUntil,
    turning: occ.isToday ? age : occ.nth,
    isToday: occ.isToday,
  }

  const result: DaysAliveResult = {
    valid: true,
    birth,
    daysElapsed,
    dayOrdinal: daysElapsed + 1,
    age,
    ageYMD,
    weeks: Math.floor(daysElapsed / 7),
    nextBirthday,
    milestones: upcomingDayMilestones(birth, daysElapsed, 3),
  }

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(String(input.birthTime ?? '').trim())
  if (timeMatch) {
    const hh = Number(timeMatch[1])
    const mm = Number(timeMatch[2])
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      const birthMs = new Date(birth.year, birth.month - 1, birth.day, hh, mm).getTime()
      const aliveMs = nowMs - birthMs
      if (aliveMs >= 0) {
        result.hoursAlive = Math.floor(aliveMs / 3600000)
        result.minutesAlive = Math.floor(aliveMs / 60000)
      }
    }
  }

  return result
}

function invalid(birth: string, today: YMD, error: string): DaysAliveResult {
  return {
    valid: false,
    error,
    birth: parseYMD(birth) ?? today,
    daysElapsed: 0,
    dayOrdinal: 0,
    age: 0,
    ageYMD: { years: 0, months: 0, days: 0 },
    weeks: 0,
    nextBirthday: { date: today, daysUntil: 0, turning: 0, isToday: false },
    milestones: [],
  }
}
