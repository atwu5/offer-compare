/** 退休倒计时（小程序版）：出生日期 + 自定义退休年龄；法定退休模式待完善不开放 */
import { calcRetirement } from '../../engine/utils/retirementCalculator'
import { formatCN, formatYMD, ymdOfLocal } from '../../engine/utils/dateMath'
import { loadStore, removeStore, saveStore } from '../../utils/toolboxStorage'

interface RetirePersist {
  birth: string
  ageDraft: string
}

interface RetireData {
  birth: string
  ageDraft: string
  todayStr: string
  vm: {
    exceeded: boolean
    heroLabel: string
    heroValue: string
    heroSub: string
    retireDateText: string
    ymdText: string
    progressPct: number
    ageText: string
  } | null
  error: string
}

function parseNum(raw: string): number | null {
  const t = String(raw == null ? '' : raw).trim()
  if (!t) return null
  const n = Number(t)
  return isFinite(n) ? n : null
}

Page<RetireData, {
  onLoad(): void
  persist(): void
  recompute(): void
  onDatePick(e: MiniEvent.PickerChange): void
  onAgeInput(e: MiniEvent.Input): void
  onReset(): void
}>({
  data: {
    birth: '',
    ageDraft: '60',
    todayStr: formatYMD(ymdOfLocal(new Date())),
    vm: null,
    error: '',
  },

  onLoad() {
    const saved = loadStore<RetirePersist | null>('retire.v1', null)
    if (saved) {
      this.setData({ birth: saved.birth ?? '', ageDraft: saved.ageDraft ?? '60' })
    }
    this.recompute()
  },

  persist() {
    saveStore('retire.v1', { birth: this.data.birth, ageDraft: this.data.ageDraft } as RetirePersist)
  },

  recompute() {
    const birth = this.data.birth
    if (!birth) {
      this.setData({ vm: null, error: '' })
      return
    }
    const age = parseNum(this.data.ageDraft) ?? 60
    const r = calcRetirement({ birth, retireAge: age }, ymdOfLocal(new Date()))
    if (!r.valid) {
      this.setData({ vm: null, error: r.error ?? '请检查输入' })
      return
    }
    this.setData({
      error: '',
      vm: {
        exceeded: r.exceeded,
        heroLabel: r.exceeded ? '已到达预计退休日期' : '距离退休还有',
        heroValue: r.exceeded ? `已过 ${r.daysPast} 天` : `${r.daysUntil} 天`,
        heroSub:
          r.exceeded
            ? `预计退休日期：${formatCN(r.retireDate)}（按退休年龄 ${age} 岁计算）`
            : r.ymd.years > 0 || r.ymd.months > 0
              ? `约 ${r.ymd.years} 年 ${r.ymd.months} 个月 ${r.ymd.days} 天`
              : '就在眼前啦',
        retireDateText: formatCN(r.retireDate),
        ymdText: r.exceeded
          ? `已退休 ${r.ymd.years} 年 ${r.ymd.months} 月 ${r.ymd.days} 天`
          : `${r.ymd.years} 年 ${r.ymd.months} 月 ${r.ymd.days} 天`,
        progressPct: Math.round(r.progressPct * 10) / 10,
        ageText: `${age} 岁`,
      },
    })
  },

  onDatePick(e: MiniEvent.PickerChange) {
    const v = String(e.detail.value)
    this.setData({ birth: v })
    this.persist()
    this.recompute()
  },

  onAgeInput(e: MiniEvent.Input) {
    const cleaned = e.detail.value.replace(/[^\d]/g, '').slice(0, 3)
    this.setData({ ageDraft: cleaned })
    this.persist()
    this.recompute()
  },

  onReset() {
    removeStore('retire.v1')
    this.setData({ birth: '', ageDraft: '60' })
    this.recompute()
  },
})
