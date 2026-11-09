/**
 * 纪念日计算（纯函数，零 DOM 依赖）。
 * 口径统一约定（与出生天数一致）：
 *  - 「已经走过 N 天」= 今天 − 开始日期的自然日差（开始当天为 0 天）；
 *  - 「第 N 天」= 开始日 + (N−1) 天；
 *  - 「第 N 个周年」= 按年份序号计（开始日当年为第 0 周年，满一年为第 1 周年）。
 */
import {
  diffCalendarDays,
  diffYMD,
  nextYearlyOccurrence,
  parseYMD,
  upcomingDayMilestones,
  type LeapPreference,
  type Milestone,
  type NextOccurrence,
  type YMD,
} from './dateMath'

export interface AnniversaryRecord {
  id: string
  name: string
  /** YYYY-MM-DD（允许未来日期：用于倒计时） */
  date: string
  /** 是否每年重复（默认开启） */
  repeatYearly: boolean
  /** 2/29 在非闰年的落点偏好 */
  leapPref: LeapPreference
  createdAt: number
}

export interface AnniversaryView {
  record: AnniversaryRecord
  valid: boolean
  error?: string
  start: YMD
  /** 今天 − 开始日期（负值 = 未来日期） */
  elapsedDays: number
  /** 经过完整天数 ≥ 0 时才有年/月/日差 */
  ymd: { years: number; months: number; days: number } | null
  isFuture: boolean
  /** 第 N 天（仅经过天数 ≥ 0 时有意义） */
  dayOrdinal: number
  /** repeatYearly 或未来日期时存在：下一次节点 */
  nextOccurrence: NextOccurrence | null
  milestones: Milestone[]
}

export function buildAnniversaryView(record: AnniversaryRecord, today: YMD): AnniversaryView {
  const start = parseYMD(record.date)
  if (!start) {
    return invalidView(record, today, '日期格式不正确')
  }
  const elapsedDays = diffCalendarDays(today, start)
  const isFuture = elapsedDays < 0
  const view: AnniversaryView = {
    record,
    valid: true,
    start,
    elapsedDays,
    ymd: elapsedDays >= 0 ? diffYMD(start, today) : null,
    isFuture,
    dayOrdinal: elapsedDays >= 0 ? elapsedDays + 1 : 0,
    nextOccurrence: null,
    milestones: [],
  }

  if (record.repeatYearly) {
    view.nextOccurrence = nextYearlyOccurrence(start, today, record.leapPref)
    if (!isFuture) {
      view.milestones = upcomingDayMilestones(start, elapsedDays, 3)
    }
  } else if (isFuture) {
    view.nextOccurrence = {
      date: start,
      nth: 0,
      daysUntil: -elapsedDays,
      isToday: false,
    }
  } else {
    view.milestones = upcomingDayMilestones(start, elapsedDays, 3)
  }

  return view
}

/** 首页「最近纪念日」：返回最近一个将到的节点（今天恰好是纪念日也算） */
export function pickNextUpcoming(views: AnniversaryView[]): AnniversaryView | null {
  let best: AnniversaryView | null = null
  for (const v of views) {
    if (!v.valid || !v.nextOccurrence) continue
    if (best == null || v.nextOccurrence.daysUntil < best.nextOccurrence!.daysUntil) {
      best = v
    }
  }
  return best
}

function invalidView(record: AnniversaryRecord, today: YMD, error: string): AnniversaryView {
  return {
    record,
    valid: false,
    error,
    start: today,
    elapsedDays: 0,
    ymd: null,
    isFuture: false,
    dayOrdinal: 0,
    nextOccurrence: null,
    milestones: [],
  }
}
