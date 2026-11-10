/** 个税计算器（小程序版）：累计预扣法，简易 / 逐月双模式 + 年终奖两种计税方式对比 */
import {
  compareBonusMethods,
  simulateWithholding,
  type MonthTaxInput,
} from '../../engine/utils/cumulativeTaxCalculator'
import { money2 } from '../../utils/toolboxFormat'
import { fmtCNY } from '../../engine/utils/money'
import { loadStore, removeStore, saveStore } from '../../utils/toolboxStorage'
import { BONUS_POLICY_NOTE, TAX_SIMULATION_NOTE } from '../../engine/config/taxPolicy'

interface TaxPersist {
  mode: 'simple' | 'monthly'
  uptoMonth: number
  draft: { salary: string; si: string; hf: string; special: string; other: string; bonus: string }
  monthlyDraft: { salary: string; deduction: string }[]
}

interface TaxRowVm {
  month: number
  salaryText: string
  taxText: string
  netText: string
}

interface BonusCmpVm {
  sepAnnualText: string
  combAnnualText: string
  savingText: string
  sepBetter: boolean
  sepTaxText: string
  combTaxText: string
}

interface TaxData {
  mode: 'simple' | 'monthly'
  uptoMonth: number
  draft: { salary: string; si: string; hf: string; special: string; other: string; bonus: string }
  monthlyDraft: { salary: string; deduction: string }[]
  showDetails: boolean
  bonusPolicyNote: string
  simulationNote: string
  vm: {
    heroLabel: string
    heroNet: string
    heroSub: string
    taxText: string
    siHfText: string
    annualIncomeText: string
    annualTaxText: string
    annualNetText: string
    rows: TaxRowVm[]
    bonusCmp: BonusCmpVm | null
  } | null
}

/** 每次返回全新对象，避免 Page data 与常量共享引用被 setData 路径更新污染 */
function defaultPersist(): TaxPersist {
  return {
    mode: 'simple',
    uptoMonth: new Date().getMonth() + 1,
    draft: { salary: '20000', si: '', hf: '', special: '', other: '', bonus: '' },
    monthlyDraft: [],
  }
}

function parseNum(raw: string): number | null {
  const t = String(raw == null ? '' : raw).trim()
  if (!t) return null
  const n = Number(t)
  return isFinite(n) ? n : null
}

function buildMonths(p: TaxPersist): MonthTaxInput[] {
  const upto = Math.min(12, Math.max(1, Math.round(p.uptoMonth || 1)))
  if (p.mode === 'simple') {
    const salary = parseNum(p.draft.salary) ?? 0
    const si = parseNum(p.draft.si) ?? 0
    const hf = parseNum(p.draft.hf) ?? 0
    const special = parseNum(p.draft.special) ?? 0
    const other = parseNum(p.draft.other) ?? 0
    return Array.from({ length: upto }, (_, i) => ({
      month: i + 1,
      salary,
      socialInsurance: si,
      housingFund: hf,
      specialDeduction: special,
      otherDeduction: other,
    }))
  }
  const globalDeduction =
    (parseNum(p.draft.si) ?? 0) +
    (parseNum(p.draft.hf) ?? 0) +
    (parseNum(p.draft.special) ?? 0) +
    (parseNum(p.draft.other) ?? 0)
  return Array.from({ length: upto }, (_, i) => {
    const row = p.monthlyDraft[i]
    return {
      month: i + 1,
      salary: parseNum(row?.salary ?? '') ?? parseNum(p.draft.salary) ?? 0,
      socialInsurance: 0,
      housingFund: 0,
      specialDeduction: parseNum(row?.deduction ?? '') ?? globalDeduction,
      otherDeduction: 0,
    }
  })
}

Page<TaxData, {
  onLoad(): void
  persist(): void
  recompute(): void
  onModeTap(e: MiniEvent.Tap): void
  onMonthTap(e: MiniEvent.Tap): void
  onFieldInput(e: MiniEvent.Input): void
  onMonthlyInput(e: MiniEvent.Input): void
  onToggleDetails(): void
  onReset(): void
}>({
  data: {
    ...defaultPersist(),
    showDetails: false,
    bonusPolicyNote: BONUS_POLICY_NOTE,
    simulationNote: TAX_SIMULATION_NOTE,
    vm: null,
  },

  onLoad() {
    const saved = loadStore<TaxPersist | null>('tax.v1', null)
    if (saved && saved.draft) {
      const rows = Array.isArray(saved.monthlyDraft) ? saved.monthlyDraft.slice(0, 12) : []
      while (rows.length < 12) rows.push({ salary: '', deduction: '' })
      this.setData({
        mode: saved.mode === 'monthly' ? 'monthly' : 'simple',
        uptoMonth: saved.uptoMonth,
        draft: saved.draft,
        monthlyDraft: rows,
      })
    } else {
      const rows: { salary: string; deduction: string }[] = []
      for (let i = 0; i < 12; i++) rows.push({ salary: '', deduction: '' })
      this.setData({ monthlyDraft: rows })
    }
    this.recompute()
  },

  persist() {
    const { mode, uptoMonth, draft, monthlyDraft } = this.data
    saveStore('tax.v1', { mode, uptoMonth, draft, monthlyDraft } as TaxPersist)
  },

  recompute() {
    const p: TaxPersist = {
      mode: this.data.mode,
      uptoMonth: this.data.uptoMonth,
      draft: this.data.draft,
      monthlyDraft: this.data.monthlyDraft,
    }
    const months = buildMonths(p)
    const result = simulateWithholding(months)
    const currentRow = result.rows[result.rows.length - 1]
    const siHf =
      p.mode === 'simple'
        ? (parseNum(p.draft.si) ?? 0) + (parseNum(p.draft.hf) ?? 0)
        : NaN

    let bonusCmp: BonusCmpVm | null = null
    const bonus = parseNum(p.draft.bonus) ?? 0
    if (bonus > 0) {
      const cmp = compareBonusMethods(result.annual.tax, result.annual.taxable, bonus)
      bonusCmp = {
        sepAnnualText: fmtCNY(cmp.annualTaxWithSeparate),
        combAnnualText: fmtCNY(cmp.annualTaxWithCombined),
        sepTaxText: fmtCNY(cmp.bonusTaxSeparate),
        combTaxText: fmtCNY(cmp.bonusTaxCombined),
        savingText:
          cmp.savingIfSeparate >= 0
            ? `本例「单独计税」更划算：全年少缴 ${fmtCNY(cmp.savingIfSeparate)} 个税。`
            : `本例「并入综合所得」更划算：全年少缴 ${fmtCNY(-cmp.savingIfSeparate)} 个税。`,
        sepBetter: cmp.savingIfSeparate >= 0,
      }
    }

    this.setData({
      vm: {
        heroLabel: `${months.length} 月预计到手工资`,
        heroNet: money2(currentRow?.netSalary ?? 0),
        heroSub: `当月预计个税 ${money2(currentRow?.taxWithheld ?? 0)} · 税前 ${money2(currentRow?.salary ?? 0)}`,
        taxText: money2(currentRow?.taxWithheld ?? 0),
        siHfText: isFinite(siHf) ? `${fmtCNY(siHf, 2)} / 月` : '逐月模式按行填写',
        annualIncomeText: fmtCNY(result.annual.income),
        annualTaxText: fmtCNY(result.annual.tax),
        annualNetText: fmtCNY(result.annual.net),
        rows: result.rows.map((r) => ({
          month: r.month,
          salaryText: fmtCNY(r.salary),
          taxText: money2(r.taxWithheld),
          netText: money2(r.netSalary),
        })),
        bonusCmp,
      },
    })
  },

  onModeTap(e: MiniEvent.Tap) {
    const mode = String(e.currentTarget.dataset.mode) === 'monthly' ? 'monthly' : 'simple'
    this.setData({ mode })
    this.persist()
    this.recompute()
  },

  onMonthTap(e: MiniEvent.Tap) {
    const m = Number(e.currentTarget.dataset.m)
    if (!(m >= 1 && m <= 12)) return
    this.setData({ uptoMonth: m })
    this.persist()
    this.recompute()
  },

  onFieldInput(e: MiniEvent.Input) {
    const f = String(e.currentTarget.dataset.f)
    const raw = e.detail.value
    if (!(f in this.data.draft)) return
    this.setData({ [`draft.${f}`]: raw } as IAnyObject)
    this.persist()
    this.recompute()
  },

  onMonthlyInput(e: MiniEvent.Input) {
    const i = Number(e.currentTarget.dataset.i)
    const f = String(e.currentTarget.dataset.f)
    const raw = e.detail.value
    if (!(f === 'salary' || f === 'deduction')) return
    const monthlyDraft = this.data.monthlyDraft.slice()
    const cur = monthlyDraft[i] ?? { salary: '', deduction: '' }
    monthlyDraft[i] = f === 'salary' ? { ...cur, salary: raw } : { ...cur, deduction: raw }
    this.setData({ monthlyDraft })
    this.persist()
    this.recompute()
  },

  onToggleDetails() {
    this.setData({ showDetails: !this.data.showDetails })
  },

  onReset() {
    removeStore('tax.v1')
    this.setData({
      ...defaultPersist(),
      showDetails: false,
    })
    this.recompute()
  },
})
