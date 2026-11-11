/** 出生天数（小程序版）：自然日口径 + 周岁/周数/下次生日/里程碑 + 可选真实时分差 */
import { calcDaysAlive } from '../../engine/utils/daysAliveCalculator'
import { formatCN, formatYMD, ymdOfLocal, type LeapPreference } from '../../engine/utils/dateMath'
import { fmtInt } from '../../utils/toolboxFormat'
import { loadStore, removeStore, saveStore } from '../../utils/toolboxStorage'

interface DaysPersist {
  birth: string
  time: string
  leapPref: LeapPreference
}

interface DaysData {
  birth: string
  time: string
  leapPref: LeapPreference
  todayStr: string
  isFeb29: boolean
  vm: {
    daysText: string
    ordinalText: string
    ageText: string
    weeksText: string
    ymdText: string
    birthdayMain: string
    birthdaySub: string
    hoursText: string
    minutesText: string
    hasTime: boolean
    milestones: { nText: string; whenText: string }[]
  } | null
  error: string
}

Page<DaysData, {
  onLoad(): void
  persist(): void
  recompute(): void
  onDatePick(e: MiniEvent.PickerChange): void
  onTimePick(e: MiniEvent.PickerChange): void
  onLeapPrefTap(e: MiniEvent.Tap): void
  onReset(): void
}>({
  data: {
    birth: '',
    time: '',
    leapPref: 'day28',
    todayStr: formatYMD(ymdOfLocal(new Date())),
    isFeb29: false,
    vm: null,
    error: '',
  },

  onLoad() {
    const saved = loadStore<DaysPersist | null>('days.v1', null)
    if (saved) {
      this.setData({
        birth: saved.birth ?? '',
        time: saved.time ?? '',
        leapPref: saved.leapPref === 'mar1' ? 'mar1' : 'day28',
      })
    }
    this.recompute()
  },

  persist() {
    saveStore('days.v1', {
      birth: this.data.birth,
      time: this.data.time,
      leapPref: this.data.leapPref,
    } as DaysPersist)
  },

  recompute() {
    const { birth, time, leapPref } = this.data
    if (!birth) {
      this.setData({ vm: null, error: '', isFeb29: false })
      return
    }
    const r = calcDaysAlive({ birth, birthTime: time, leapPref }, ymdOfLocal(new Date()), Date.now())
    if (!r.valid) {
      this.setData({ vm: null, error: r.error ?? '请检查输入', isFeb29: false })
      return
    }
    const nb = r.nextBirthday
    this.setData({
      error: '',
      isFeb29: r.birth.month === 2 && r.birth.day === 29,
      vm: {
        daysText: fmtInt(r.daysElapsed),
        ordinalText:
          r.daysElapsed === 0 ? '今天是来到世界的第 1 天 🎂' : `今天是来到世界的第 ${fmtInt(r.dayOrdinal)} 天`,
        ageText: `${r.age} 岁`,
        weeksText: `${fmtInt(r.weeks)} 周`,
        ymdText: `${r.ageYMD.years} 岁 ${r.ageYMD.months} 个月 ${r.ageYMD.days} 天`,
        birthdayMain: nb.isToday ? '今天生日 🎉' : `${nb.daysUntil} 天`,
        birthdaySub: nb.isToday ? `满 ${nb.turning} 岁` : `${formatCN(nb.date)} · 满 ${nb.turning} 岁`,
        hasTime: r.hoursAlive != null,
        hoursText: `${fmtInt(r.hoursAlive ?? 0)} 小时`,
        minutesText: `${fmtInt(r.minutesAlive ?? 0)} 分钟`,
        milestones: r.milestones.map((m) => ({
          nText: `第 ${fmtInt(m.n)} 天`,
          whenText: m.daysUntil === 0 ? '就是今天 🎉' : `${formatCN(m.date)} · 还有 ${m.daysUntil} 天`,
        })),
      },
    })
  },

  onDatePick(e: MiniEvent.PickerChange) {
    const v = String(e.detail.value)
    this.setData({ birth: v })
    this.persist()
    this.recompute()
  },

  onTimePick(e: MiniEvent.PickerChange) {
    const v = String(e.detail.value)
    this.setData({ time: v })
    this.persist()
    this.recompute()
  },

  onLeapPrefTap(e: MiniEvent.Tap) {
    const v = String(e.currentTarget.dataset.v) === 'mar1' ? 'mar1' : 'day28'
    this.setData({ leapPref: v })
    this.persist()
    this.recompute()
  },

  onReset() {
    removeStore('days.v1')
    this.setData({ birth: '', time: '', leapPref: 'day28' })
    this.recompute()
  },
})
