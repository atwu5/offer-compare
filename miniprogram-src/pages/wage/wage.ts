/** 时薪计算器（小程序版）：时/分/秒/日薪 + 反向计算 + 可选按秒收入计数器 */
import {
  calcHourlyWage,
  reverseMonthlyIncome,
} from '../../engine/utils/hourlyWageCalculator'
import { fmtCNY } from '../../engine/utils/money'
import { fmtInt, fmtRate, money2 } from '../../utils/toolboxFormat'
import { loadStore, removeStore, saveStore } from '../../utils/toolboxStorage'

interface WagePersist {
  draft: { monthly: string; bonus: string; days: string; hours: string; weeks: string; annualDays: string }
  useAnnualDays: boolean
  basis: 'gross' | 'net'
}

interface WageData {
  draft: { monthly: string; bonus: string; days: string; hours: string; weeks: string; annualDays: string }
  useAnnualDays: boolean
  basis: 'gross' | 'net'
  vm: {
    hourlyText: string
    hourlySub: string
    perMinuteText: string
    perSecondText: string
    perDayText: string
    annualIncomeText: string
    annualHoursText: string
    annualDaysText: string
  } | null
  error: string
  reverseOn: boolean
  reverseTarget: string
  reverseVm: { annualText: string; monthlyText: string } | null
  reverseError: string
  counterOn: boolean
  counterEarnedText: string
}

/** 每次返回全新对象，避免 Page data 与常量共享引用被 setData 路径更新污染 */
function defaultPersist(): WagePersist {
  return {
    draft: { monthly: '', bonus: '', days: '5', hours: '8', weeks: '52', annualDays: '250' },
    useAnnualDays: false,
    basis: 'gross',
  }
}

function parseNum(raw: string): number | null {
  const t = String(raw == null ? '' : raw).trim()
  if (!t) return null
  const n = Number(t)
  return isFinite(n) ? n : null
}



Page<WageData, {
  /** 计数器定时器句柄（挂在页面实例上） */
  _counterTimer?: number | null
  onLoad(): void
  persist(): void
  recompute(): void
  onFieldInput(e: MiniEvent.Input): void
  onUseAnnualDaysTap(): void
  onBasisTap(e: MiniEvent.Tap): void
  onReverseToggle(): void
  onReverseTargetInput(e: MiniEvent.Input): void
  onCounterToggle(): void
  stopCounter(): void
  onUnload(): void
  onHide(): void
  onReset(): void
}>({
  data: {
    ...defaultPersist(),
    vm: null,
    error: '',
    reverseOn: false,
    reverseTarget: '',
    reverseVm: null,
    reverseError: '',
    counterOn: false,
    counterEarnedText: money2(0),
  },

  onLoad() {
    const saved = loadStore<WagePersist | null>('wage.v1', null)
    if (saved && saved.draft) {
      this.setData({
        draft: saved.draft,
        useAnnualDays: !!saved.useAnnualDays,
        basis: saved.basis === 'net' ? 'net' : 'gross',
      })
    }
    this.recompute()
  },

  persist() {
    saveStore('wage.v1', {
      draft: this.data.draft,
      useAnnualDays: this.data.useAnnualDays,
      basis: this.data.basis,
    } as WagePersist)
  },

  recompute() {
    const d = this.data.draft
    const result = calcHourlyWage({
      monthlyIncome: parseNum(d.monthly),
      annualBonus: parseNum(d.bonus),
      daysPerWeek: parseNum(d.days) ?? 5,
      hoursPerDay: parseNum(d.hours) ?? 8,
      paidWeeksPerYear: parseNum(d.weeks) ?? 52,
      useAnnualDays: this.data.useAnnualDays,
      annualWorkDays: parseNum(d.annualDays) ?? 250,
      basis: this.data.basis,
    })

    if (result.valid) {
      this.setData({
        error: '',
        vm: {
          hourlyText: money2(result.hourly),
          hourlySub: `按全年工作 ${fmtInt(result.annualHours)} 小时折算`,
          perMinuteText: `¥${fmtRate(result.perMinute)}`,
          perSecondText: `¥${fmtRate(result.perSecond)}`,
          perDayText: money2(result.perDay),
          annualIncomeText: fmtCNY(result.annualIncome),
          annualHoursText: `${fmtInt(result.annualHours)} 小时`,
          annualDaysText: `${fmtInt(result.annualWorkDays)} 天`,
        },
      })
    } else {
      this.setData({ vm: null, error: result.error ?? '请先填写月收入' })
    }

    // 反向计算联动
    if (this.data.reverseOn) {
      const rev = reverseMonthlyIncome(
        parseNum(this.data.reverseTarget),
        {
          daysPerWeek: parseNum(d.days) ?? 5,
          hoursPerDay: parseNum(d.hours) ?? 8,
          paidWeeksPerYear: parseNum(d.weeks) ?? 52,
          useAnnualDays: this.data.useAnnualDays,
          annualWorkDays: parseNum(d.annualDays) ?? 250,
        },
        parseNum(d.bonus) ?? 0,
      )
      if (rev.valid) {
        this.setData({ reverseVm: { annualText: fmtCNY(rev.annualIncome), monthlyText: money2(rev.monthlyIncome) }, reverseError: '' })
      } else {
        this.setData({ reverseVm: null, reverseError: rev.error ?? '' })
      }
    }
  },

  onFieldInput(e: MiniEvent.Input) {
    const f = String(e.currentTarget.dataset.f)
    const raw = e.detail.value
    if (!(f in this.data.draft)) return
    this.setData({ [`draft.${f}`]: raw } as IAnyObject)
    this.persist()
    this.recompute()
  },

  onUseAnnualDaysTap() {
    this.setData({ useAnnualDays: !this.data.useAnnualDays })
    this.persist()
    this.recompute()
  },

  onBasisTap(e: MiniEvent.Tap) {
    const v = String(e.currentTarget.dataset.v) === 'net' ? 'net' : 'gross'
    this.setData({ basis: v })
    this.persist()
  },

  onReverseToggle() {
    const on = !this.data.reverseOn
    this.setData({ reverseOn: on })
    if (on) this.recompute()
  },

  onReverseTargetInput(e: MiniEvent.Input) {
    this.setData({ reverseTarget: e.detail.value })
    this.recompute()
  },

  onCounterToggle() {
    if (this.data.counterOn) {
      this.stopCounter()
      return
    }
    if (!this.data.vm) return
    this.setData({ counterOn: true, counterEarnedText: money2(0) })
    const timer = setInterval(() => {
      // 每秒累计当前秒薪；perSecond 从 vm 中取不不出来，这里用反向解法：直接重算
      const d = this.data.draft
      const r = calcHourlyWage({
        monthlyIncome: parseNum(d.monthly),
        annualBonus: parseNum(d.bonus),
        daysPerWeek: parseNum(d.days) ?? 5,
        hoursPerDay: parseNum(d.hours) ?? 8,
        paidWeeksPerYear: parseNum(d.weeks) ?? 52,
        useAnnualDays: this.data.useAnnualDays,
        annualWorkDays: parseNum(d.annualDays) ?? 250,
        basis: this.data.basis,
      })
      if (!r.valid) return
      const current = Number(String(this.data.counterEarnedText).replace(/[^\d.]/g, '')) || 0
      this.setData({ counterEarnedText: money2(current + r.perSecond) })
    }, 1000)
    this._counterTimer = timer as unknown as number
  },

  stopCounter() {
    if (this._counterTimer) {
      clearInterval(this._counterTimer)
      this._counterTimer = null
    }
    this.setData({ counterOn: false, counterEarnedText: money2(0) })
  },

  onUnload() {
    if (this._counterTimer) clearInterval(this._counterTimer)
  },

  onHide() {
    if (this._counterTimer) {
      clearInterval(this._counterTimer)
      this._counterTimer = null
      this.setData({ counterOn: false, counterEarnedText: money2(0) })
    }
  },

  onReset() {
    this.stopCounter()
    removeStore('wage.v1')
    this.setData({
      ...defaultPersist(),
      reverseOn: false,
      reverseTarget: '',
      reverseVm: null,
      reverseError: '',
    })
    this.recompute()
  },
})
