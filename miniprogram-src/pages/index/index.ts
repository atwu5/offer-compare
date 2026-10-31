/**
 * 抖音小程序主页面：Offer 输入 + 实时对比结果。
 *
 * 与 Web 版（src/App.tsx）的结构一一对应：
 *  - 计算引擎复用 miniprogram-src/engine（与 src/utils、src/data 同源，逐字拷贝）；
 *  - 输入层使用 draft（原始字符串）+ offers（规范模型）双层状态：
 *    输入过程不回写格式化值（避免光标跳动），TTML 中每个输入框
 *    通过 data-path（模型路径）+ data-dp（草稿路径）双路径提交；
 *  - 结果层每次变更重算并构建 vm（视图模型），TTML 只做纯展示。
 */
import {
  BonusMode,
  CalculationItem,
  CityPolicy,
  Offer,
  OfferResult,
  ScenarioKey,
  Subsidy,
  SubsidyCertainty,
  SubsidyDuration,
  SubsidyFrequency,
} from '../../engine/types'
import { CITY_OPTIONS, POLICY_DATA_NOTICE, getPolicy } from '../../engine/data/cityPolicies'
import { cloneOffers, createDefaultOffers, newSubsidyId } from '../../engine/data/defaults'
import {
  LIVING_COST_KEYS,
  SCENARIO_LABELS,
  buildDiffRows,
  buildHeadline,
  buildScenarioNote,
  computeOfferResult,
  diffTotal,
} from '../../engine/utils/offerCalculator'
import { computeMinSalaryForTarget } from '../../engine/utils/reverseCalculator'
import {
  fmtCNY,
  fmtPct,
  fmtPctPlain,
  fmtSignedCNY,
  fmtWan,
  rateLabel,
  round2,
} from '../../engine/utils/money'

type YearView = 'first' | 'steady'

/* ------------------------- 常量 ------------------------- */

const MONTHS_OPTIONS = ['12 个月', '13 个月', '14 个月', '15 个月', '16 个月', '自定义']
const MONTHS_VALUES = ['12', '13', '14', '15', '16', 'custom']

const RATIO_OPTIONS = ['无折扣（100%）', '90%', '80%', '自定义']
const RATIO_VALUES = ['1', '0.9', '0.8', 'custom']

const FREQ_OPTIONS = ['每月', '每年', '一次性']
const FREQ_VALUES: SubsidyFrequency[] = ['monthly', 'yearly', 'once']

const DUR_OPTIONS = ['仅第一年', '长期持续', '指定年数']
const DUR_VALUES: SubsidyDuration[] = ['firstYearOnly', 'permanent', 'years']

const CERT_OPTIONS = ['确定获得', '可能获得']
const CERT_VALUES: SubsidyCertainty[] = ['confirmed', 'possible']

const CITY_LABELS = CITY_OPTIONS.map((o) => o.label)
const CITY_VALUES = CITY_OPTIONS.map((o) => o.value)

const SUBSIDY_PRESETS: Omit<Subsidy, 'id' | 'amount'>[] = [
  { name: '餐补', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '交通补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '通讯补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '租房补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '人才补贴', frequency: 'yearly', duration: 'firstYearOnly', durationYears: 1, certainty: 'possible', included: false },
  { name: '签字费', frequency: 'once', duration: 'firstYearOnly', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '搬家补贴', frequency: 'once', duration: 'firstYearOnly', durationYears: 1, certainty: 'confirmed', included: false },
]

const SUBSIDY_PRESET_LABELS = SUBSIDY_PRESETS.map((p) => p.name)

const GROUP_TITLES: Record<string, string> = {
  income: '收入',
  insurance: '五险一金与个税（个人部分）',
  cost: '工作相关成本',
  result: '结果',
}

/* ------------------------- 小工具 ------------------------- */

function numStr(v: number | null | undefined): string {
  return v == null || !isFinite(v) ? '' : String(Math.round(v * 1e6) / 1e6)
}

function pctStr(v: number | null | undefined): string {
  return v == null || !isFinite(v) ? '' : String(Math.round(v * 1000) / 10)
}

function parseNum(raw: string): number | null {
  const t = String(raw == null ? '' : raw).trim()
  if (!t) return null
  const n = Number(t)
  return isFinite(n) ? n : null
}

function parseIntOrNull(raw: string): number | null {
  const n = parseNum(raw)
  return n == null ? null : Math.round(n)
}

/** 不可变深设置：返回带新路径值的克隆对象（不修改原对象） */
function setPath<T>(obj: T, path: string, value: any): T {
  const segs = path.split('.')
  const clone: any = Array.isArray(obj) ? (obj as any).slice() : { ...(obj as any) }
  let cur = clone
  for (let k = 0; k < segs.length - 1; k++) {
    const key = segs[k]
    const nxt = cur[key]
    cur[key] = Array.isArray(nxt) ? nxt.slice() : { ...(nxt ?? {}) }
    cur = cur[key]
  }
  cur[segs[segs.length - 1]] = value
  return clone
}

function buildHfRateOptions(policy: CityPolicy | null): { options: string[]; values: string[] } {
  if (!policy) return { options: ['默认比例'], values: ['default'] }
  const min = Math.round(policy.housingFund.rateMin * 100)
  const max = Math.round(policy.housingFund.rateMax * 100)
  const options = [`默认 ${Math.round(policy.housingFund.employeeRateDefault * 100)}%`]
  const values = ['default']
  for (let p = min; p <= max; p++) {
    options.push(`${p}%`)
    values.push(String(p))
  }
  return { options, values }
}

/* ------------------------- 草稿（输入层） ------------------------- */

interface DraftSubsidy {
  id: string
  name: string
  amount: string
  durationYears: string
  freq: SubsidyFrequency
  dur: SubsidyDuration
  cert: SubsidyCertainty
  included: boolean
  freqIndex: number
  durIndex: number
  certIndex: number
  freqLabel: string
  durLabel: string
  certLabel: string
}

interface DraftOffer {
  name: string
  companyName: string
  cityCustomName: string
  /* UI 状态 */
  isCustom: boolean
  hasPolicy: boolean
  cityIndex: number
  cityLabel: string
  monthsIndex: number
  monthsMode: string
  monthsLabel: string
  ratioIndex: number
  ratioMode: string
  ratioLabel: string
  hfRateIndex: number
  hfRateOptions: string[]
  hfRateValues: string[]
  /* 与 Offer 同路径的原始输入（字符串） */
  monthlySalary: string
  monthsCustom: string
  bonusMode: BonusMode
  bonusValue: string
  hasVariableBonus: boolean
  vbMode: BonusMode
  vb: string[]
  probationMonths: string
  ratioCustom: string
  useCityDefault: boolean
  pensionBase: string
  medicalBase: string
  unemploymentBase: string
  hfBase: string
  hfRateLabel: string
  rates: {
    pensionEmp: string
    pensionEr: string
    medicalEmp: string
    medicalEr: string
    unempEmp: string
    unempEr: string
    hfEmp: string
    hfEr: string
  }
  specialDeduction: string
  subsidies: DraftSubsidy[]
  living: string[]
}

function buildDraftSubsidy(s: Subsidy): DraftSubsidy {
  const freqIndex = Math.max(0, FREQ_VALUES.indexOf(s.frequency))
  const durIndex = Math.max(0, DUR_VALUES.indexOf(s.duration))
  const certIndex = Math.max(0, CERT_VALUES.indexOf(s.certainty))
  return {
    id: s.id,
    name: s.name,
    amount: numStr(s.amount),
    durationYears: String(s.durationYears),
    freq: s.frequency,
    dur: s.duration,
    cert: s.certainty,
    included: s.included,
    freqIndex,
    durIndex,
    certIndex,
    freqLabel: FREQ_OPTIONS[freqIndex],
    durLabel: DUR_OPTIONS[durIndex],
    certLabel: CERT_OPTIONS[certIndex],
  }
}

function buildDraft(o: Offer): DraftOffer {
  const policy = getPolicy(o.cityCode)
  const hf = buildHfRateOptions(policy)
  const monthsMode = MONTHS_VALUES.includes(String(o.fixedSalaryMonths))
    ? String(o.fixedSalaryMonths)
    : 'custom'
  const monthsIndex = Math.max(0, MONTHS_VALUES.indexOf(monthsMode))
  const ratio = o.probation.salaryRatio
  const ratioMode = ratio === 1 ? '1' : ratio === 0.8 ? '0.8' : ratio === 0.9 ? '0.9' : 'custom'
  const ratioIndex = Math.max(0, RATIO_VALUES.indexOf(ratioMode))
  const hfRateMode =
    o.housingFund.employeeRate == null
      ? 'default'
      : String(Math.round(o.housingFund.employeeRate * 100))
  let hfRateIndex = hf.values.indexOf(hfRateMode)
  if (hfRateIndex < 0) hfRateIndex = 0
  const cityIndex = Math.max(0, CITY_VALUES.indexOf(o.cityCode))
  const si = o.socialInsurance
  return {
    name: o.name,
    companyName: o.companyName,
    cityCustomName: o.cityCustomName ?? '',
    isCustom: o.cityCode === 'custom',
    hasPolicy: !!policy,
    cityIndex,
    cityLabel: CITY_LABELS[cityIndex],
    monthsIndex,
    monthsMode,
    monthsLabel: MONTHS_OPTIONS[monthsIndex],
    ratioIndex,
    ratioMode,
    ratioLabel: RATIO_OPTIONS[ratioIndex],
    hfRateIndex,
    hfRateOptions: hf.options,
    hfRateValues: hf.values,
    monthlySalary: numStr(o.monthlySalary),
    monthsCustom: numStr(o.fixedSalaryMonths),
    bonusMode: o.fixedBonus.mode,
    bonusValue: numStr(o.fixedBonus.value),
    hasVariableBonus: o.hasVariableBonus,
    vbMode: o.variableBonus.expected.mode,
    vb: [
      numStr(o.variableBonus.conservative.value),
      numStr(o.variableBonus.expected.value),
      numStr(o.variableBonus.optimistic.value),
    ],
    probationMonths: String(o.probation.months ?? 0),
    ratioCustom: pctStr(ratio),
    useCityDefault: si.useCityDefault,
    pensionBase: numStr(si.pensionBase ?? null),
    medicalBase: numStr(si.medicalBase ?? null),
    unemploymentBase: numStr(si.unemploymentBase ?? null),
    hfBase: numStr(o.housingFund.base ?? null),
    hfRateLabel: hf.options[hfRateIndex],
    rates: {
      pensionEmp: pctStr(si.pensionRates?.employee ?? null),
      pensionEr: pctStr(si.pensionRates?.employer ?? null),
      medicalEmp: pctStr(si.medicalRates?.employee ?? null),
      medicalEr: pctStr(si.medicalRates?.employer ?? null),
      unempEmp: pctStr(si.unemploymentRates?.employee ?? null),
      unempEr: pctStr(si.unemploymentRates?.employer ?? null),
      hfEmp: pctStr(o.housingFund.employeeRate ?? null),
      hfEr: pctStr(o.housingFund.employerRate ?? null),
    },
    specialDeduction: numStr(o.monthlySpecialTaxDeduction),
    subsidies: o.subsidies.map(buildDraftSubsidy),
    living: LIVING_COST_KEYS.map((k) => numStr(o.livingCosts[k])),
  }
}

/* ------------------------- 视图模型（结果层） ------------------------- */

interface MetricVm {
  label: string
  sub: string
  value: string
  cls: string
  hl: boolean
}

interface WalletCashRow {
  name: string
  amountText: string
  sub: string
  emphasize: boolean
}

interface WalletFundRow {
  name: string
  totalText: string
  sub: string
}

interface WalletSecRow {
  label: string
  aText: string
  bText: string
}

interface DiffRowVm {
  key: string
  label: string
  amountText: string
  cls: string
  widthPct: number
  mlPct: number
}

interface DetailPanelVm {
  amountText: string
  neg: boolean
  formula: string
  params: { label: string; value: string }[]
  notices: string[]
  sourceLine: string
  url: string
}

interface DetailRowVm {
  key: string
  name: string
  groupTitle: string
  emphasisCls: string
  hasDot: boolean
  aPresent: boolean
  bPresent: boolean
  aText: string
  bText: string
  open: boolean
  panelA: DetailPanelVm | null
  panelB: DetailPanelVm | null
}

interface Vm {
  offerNames: string[]
  colA: string
  colB: string
  badges: { text: string; tone: string; cityName: string; hasPolicy: boolean; salaryInvalid: boolean }[]
  headline: { hasData: boolean; title: string; explanation: string; metrics: MetricVm[] }
  hasResults: boolean
  scenarioRows: { key: string; label: string; active: boolean; aText: string; bText: string }[]
  scenarioNote: string
  diffTitle: string
  wallets: {
    cash: { rows: WalletCashRow[]; diffText: string; diffCls: string }
    fund: { rows: WalletFundRow[]; diffText: string; diffCls: string }
    security: { rows: WalletSecRow[]; verdict: string }
  }
  diff: {
    empty: boolean
    rows: DiffRowVm[]
    totalText: string
    totalCls: string
    verifyText: string
    subtitle: string
  }
  details: { subtitle: string; notices: string[]; rows: DetailRowVm[] }
  reverse: { enabled: boolean; state: 'ok' | 'nocash' | 'unreachable'; line1: string; big: string; line3: string }
  policyCards: {
    i: number
    cityCode: string
    cityName: string
    hasPolicy: boolean
    demo: boolean
    version: string
    effectiveDate: string
    updatedAt: string
  }[]
}

function buildPanel(item: CalculationItem, policy: CityPolicy | null): DetailPanelVm {
  const src = item.policySource
  const sourceLine = src
    ? `政策来源：${src.name}${policy?.version ? ` · ${policy.version}` : ''}${
        policy ? ` · 生效 ${policy.effectiveDate} · 更新 ${policy.updatedAt}` : ''
      }`
    : '来源：用户输入 / 通用税务规则'
  return {
    amountText: `${item.displaySign === -1 ? '−' : ''}${fmtCNY(item.amount)}`,
    neg: item.displaySign === -1,
    formula: item.formula,
    params: item.parameters.map((p) => ({ label: p.label, value: p.value })),
    notices: item.notices ?? [],
    sourceLine,
    url: src?.url ?? '',
  }
}

function buildDetailsVm(
  a: OfferResult,
  b: OfferResult,
  yearView: YearView,
  scenario: ScenarioKey,
  expanded: IAnyObject,
  policyA: CityPolicy | null,
  policyB: CityPolicy | null,
): Vm['details'] {
  const itemsA = yearView === 'first' ? a.firstBreakdown : a.breakdown
  const itemsB = yearView === 'first' ? b.firstBreakdown : b.breakdown

  const keys: string[] = []
  for (const it of itemsA) if (!keys.includes(it.key)) keys.push(it.key)
  for (const it of itemsB) if (!keys.includes(it.key)) keys.push(it.key)
  const mapA = new Map(itemsA.map((i) => [i.key, i] as [string, CalculationItem]))
  const mapB = new Map(itemsB.map((i) => [i.key, i] as [string, CalculationItem]))

  const notices: string[] = []
  const seen = new Set<string>()
  for (const it of [...itemsA, ...itemsB]) {
    for (const n of it.notices ?? []) {
      if (!seen.has(n) && !n.includes('年度汇算')) {
        seen.add(n)
        notices.push(n)
      }
    }
  }

  const rows: DetailRowVm[] = []
  keys.forEach((key, idx) => {
    const ia = mapA.get(key)
    const ib = mapB.get(key)
    if (!ia && !ib) return
    const item = (ia ?? ib) as CalculationItem
    const prevKey = idx > 0 ? keys[idx - 1] : null
    const prevItem = prevKey ? mapA.get(prevKey) ?? mapB.get(prevKey) ?? null : null
    const showGroupTitle = !prevItem || prevItem.group !== item.group
    const emphasisCls =
      item.emphasis === 'total' ? 'row-strong' : item.emphasis === 'subtotal' ? 'row-sub' : ''
    rows.push({
      key,
      name: item.name,
      groupTitle: showGroupTitle ? GROUP_TITLES[item.group] ?? '' : '',
      emphasisCls,
      hasDot: !!(ia?.notices?.length || ib?.notices?.length),
      aPresent: !!ia,
      bPresent: !!ib,
      aText: ia ? `${ia.displaySign === -1 ? '−' : ''}${fmtCNY(ia.amount)}` : '—',
      bText: ib ? `${ib.displaySign === -1 ? '−' : ''}${fmtCNY(ib.amount)}` : '—',
      open: !!expanded[key],
      panelA: ia ? buildPanel(ia, policyA) : null,
      panelB: ib ? buildPanel(ib, policyB) : null,
    })
  })

  const yearLabel = yearView === 'first' ? '首年' : '稳定年'
  return { subtitle: `${yearLabel} · ${SCENARIO_LABELS[scenario]}场景`, notices, rows }
}

function buildWalletsVm(a: OfferResult, b: OfferResult, yearView: YearView): Vm['wallets'] {
  const ya = yearView === 'first' ? a.firstYear : a.steadyYear
  const yb = yearView === 'first' ? b.firstYear : b.steadyYear

  const cashDiff = round2(yb.disposableCash - ya.disposableCash)
  const hfDiff = round2(yb.housingFundAssetIncrease - ya.housingFundAssetIncrease)

  let pensionVerdict = '两份 Offer 缴费基础相同'
  if (b.effectivePensionBase > a.effectivePensionBase) pensionVerdict = `${b.offerName} 缴费基础更高`
  else if (b.effectivePensionBase < a.effectivePensionBase) pensionVerdict = `${a.offerName} 缴费基础更高`

  const hfRate = (r: OfferResult) =>
    rateLabel(
      (r.steadyYear.employeeHousingFund + r.steadyYear.employerHousingFund) /
        Math.max(1, r.effectiveHousingFundBase * 12),
    )
  const pensionEmp = (r: OfferResult) =>
    fmtCNY(
      r.steadyYear.employeeSocialInsurance > 0
        ? r.breakdown.find((x) => x.key === 'pension')?.amount ?? 0
        : 0,
    )

  return {
    cash: {
      rows: [
        {
          name: a.offerName,
          amountText: fmtCNY(ya.disposableCash),
          sub: `月均 ${fmtCNY(ya.disposableCash / 12)}`,
          emphasize: false,
        },
        {
          name: b.offerName,
          amountText: fmtCNY(yb.disposableCash),
          sub: `月均 ${fmtCNY(yb.disposableCash / 12)}`,
          emphasize: true,
        },
      ],
      diffText: fmtSignedCNY(cashDiff),
      diffCls: cashDiff >= 0 ? 'pos' : 'neg',
    },
    fund: {
      rows: [
        {
          name: a.offerName,
          totalText: `${fmtCNY(ya.housingFundAssetIncrease)} / 年`,
          sub: `个人 ${fmtCNY(ya.employeeHousingFund)} · 单位 ${fmtCNY(ya.employerHousingFund)}`,
        },
        {
          name: b.offerName,
          totalText: `${fmtCNY(yb.housingFundAssetIncrease)} / 年`,
          sub: `个人 ${fmtCNY(yb.employeeHousingFund)} · 单位 ${fmtCNY(yb.employerHousingFund)}`,
        },
      ],
      diffText: fmtSignedCNY(hfDiff),
      diffCls: hfDiff >= 0 ? 'pos' : 'neg',
    },
    security: {
      rows: [
        {
          label: '养老缴费基数',
          aText: fmtCNY(a.effectivePensionBase),
          bText: fmtCNY(b.effectivePensionBase),
        },
        {
          label: '养老个人缴费 / 年',
          aText: pensionEmp(a),
          bText: pensionEmp(b),
        },
        {
          label: '养老单位缴费 / 年',
          aText: fmtCNY(a.employerPensionAnnual),
          bText: fmtCNY(b.employerPensionAnnual),
        },
        {
          label: '公积金月缴存基数',
          aText: `${fmtCNY(a.effectiveHousingFundBase)} × ${hfRate(a)}`,
          bText: `${fmtCNY(b.effectiveHousingFundBase)} × ${hfRate(b)}`,
        },
      ],
      verdict: pensionVerdict,
    },
  }
}

function buildDiffVm(
  a: OfferResult,
  b: OfferResult,
  yearView: YearView,
  scenario: ScenarioKey,
): Vm['diff'] {
  const rows = buildDiffRows(a, b, yearView)
  const total = diffTotal(a, b, yearView)
  const yearLabel = yearView === 'first' ? '首年' : '稳定年'
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.amount)), 1)
  const ya = yearView === 'first' ? a.firstYear : a.steadyYear
  const yb = yearView === 'first' ? b.firstYear : b.steadyYear

  return {
    empty: rows.length === 0,
    rows: rows.map((r) => {
      const positive = r.amount > 0
      const widthPct = Math.min(100, (Math.abs(r.amount) / maxAbs) * 100)
      return {
        key: r.key,
        label: r.label,
        amountText: fmtSignedCNY(r.amount),
        cls: positive ? 'pos' : 'neg',
        widthPct,
        mlPct: positive ? 0 : 100 - widthPct,
      }
    }),
    totalText: fmtSignedCNY(total),
    totalCls: total >= 0 ? 'pos' : 'neg',
    verifyText: `验证：${a.offerName} ${fmtCNY(ya.disposableCash)} → ${b.offerName} ${fmtCNY(yb.disposableCash)}`,
    subtitle: `${yearLabel} · ${SCENARIO_LABELS[scenario]}场景 · 可支配现金口径`,
  }
}

function buildReverseVm(
  offers: Offer[],
  policyA: CityPolicy | null,
  policyB: CityPolicy | null,
  resA: OfferResult,
  resB: OfferResult,
  reverseMode: string,
  reverseCustom: string,
): Vm['reverse'] {
  const enabled = resA.valid && resB.valid
  if (!enabled) return { enabled: false, state: 'unreachable', line1: '', big: '', line3: '' }

  const custom = parseNum(reverseCustom)
  const target = (reverseMode === 'custom' ? custom ?? 20 : Number(reverseMode) || 0) / 100
  const result = computeMinSalaryForTarget(offers[0], policyA, offers[1], policyB, target)

  if (!isFinite(result.currentReal)) {
    return { enabled: true, state: 'nocash', line1: '', big: '', line3: '' }
  }
  const bSalary = offers[1].monthlySalary ?? 0
  if (result.reachable && result.minSalary != null) {
    const line3 =
      result.minSalary <= bSalary
        ? `当前月薪 ${fmtCNY(bSalary)}，已能满足目标（当前实际涨幅 ${fmtPctPlain(result.currentReal)}）`
        : `当前月薪 ${fmtCNY(bSalary)}，还需月薪增加 ${fmtCNY(result.minSalary - bSalary)}`
    return {
      enabled: true,
      state: 'ok',
      line1: `要实现稳定年实际可支配收入提升 ${fmtPctPlain(target, 0)}：`,
      big: `${resB.offerName} 月薪至少约 ${fmtCNY(result.minSalary)}`,
      line3,
    }
  }
  return { enabled: true, state: 'unreachable', line1: '', big: '', line3: '' }
}

function buildVm(
  offers: Offer[],
  resultSets: Record<ScenarioKey, [OfferResult, OfferResult]>,
  resA: OfferResult,
  resB: OfferResult,
  policyA: CityPolicy | null,
  policyB: CityPolicy | null,
  scenario: ScenarioKey,
  yearView: YearView,
  expanded: IAnyObject,
  reverseMode: string,
  reverseCustom: string,
): Vm {
  const headline = buildHeadline(resA, resB)

  const metrics: MetricVm[] = [
    {
      label: '名义涨薪',
      sub: '按税前年收入',
      value: fmtPct(headline.nominal),
      cls: headline.nominal >= 0 ? 'neutral' : 'neg',
      hl: false,
    },
    {
      label: '实际可支配收入涨幅',
      sub: '按稳定年可支配现金',
      value: fmtPct(headline.real),
      cls: headline.real >= 0 ? 'pos' : 'neg',
      hl: true,
    },
    {
      label: '首年多到手',
      sub: '含签字费等一次性项目',
      value: fmtSignedCNY(headline.firstDiff),
      cls: headline.firstDiff >= 0 ? 'pos' : 'neg',
      hl: false,
    },
    {
      label: '稳定年多到手',
      sub: '排除一次性收入与成本',
      value: fmtSignedCNY(headline.steadyDiff),
      cls: headline.steadyDiff >= 0 ? 'pos' : 'neg',
      hl: true,
    },
  ]

  const scenarios: ScenarioKey[] = ['conservative', 'expected', 'optimistic']
  const scenarioRows = scenarios.map((s) => {
    const ra = resultSets[s][0]
    const rb = resultSets[s][1]
    return {
      key: s,
      label: SCENARIO_LABELS[s],
      active: scenario === s,
      aText: fmtWan(ra.steadyYear.disposableCash),
      bText: fmtWan(rb.steadyYear.disposableCash),
    }
  })

  return {
    offerNames: [resA.offerName, resB.offerName],
    colA: `${resA.offerName}（${resA.cityName}）`,
    colB: `${resB.offerName}（${resB.cityName}）`,
    badges: [0, 1].map((i) => {
      const p = getPolicy(offers[i].cityCode)
      const errors = i === 0 ? resA.errors : resB.errors
      return {
        hasPolicy: !!p,
        text: p ? `${p.demo ? '演示数据' : '已核验'} · ${p.cityName}` : '无政策数据',
        cityName: p?.cityName ?? '',
        tone: p ? (p.demo ? 'badge-amber' : 'badge-green') : 'badge-red',
        salaryInvalid: errors.some((e) => e.includes('月薪')),
      }
    }),
    headline: {
      hasData: headline.hasData,
      title: headline.title,
      explanation: headline.explanation,
      metrics,
    },
    hasResults: resA.valid && resB.valid,
    scenarioRows,
    scenarioNote: buildScenarioNote(resultSets, resA.offerName, resB.offerName),
    diffTitle: `从「${resA.offerName}」到「${resB.offerName}」，钱差在哪？`,
    wallets: buildWalletsVm(resA, resB, yearView),
    diff: buildDiffVm(resA, resB, yearView, scenario),
    details: buildDetailsVm(resA, resB, yearView, scenario, expanded, policyA, policyB),
    reverse: buildReverseVm(offers, policyA, policyB, resA, resB, reverseMode, reverseCustom),
    policyCards: [0, 1].map((i) => {
      const o = offers[i]
      const p = getPolicy(o.cityCode)
      return {
        i,
        cityCode: o.cityCode,
        cityName: p ? p.cityName : o.cityCustomName?.trim() || '其他城市',
        hasPolicy: !!p,
        demo: !!p?.demo,
        version: p?.version ?? '',
        effectiveDate: p?.effectiveDate ?? '',
        updatedAt: p?.updatedAt ?? '',
      }
    }),
  }
}

/* ------------------------- 页面 ------------------------- */

interface PageData {
  offers: Offer[]
  draft: DraftOffer[]
  cityLabels: string[]
  monthsOptions: string[]
  ratioOptions: string[]
  freqOptions: string[]
  durOptions: string[]
  certOptions: string[]
  subsidyPresets: string[]
  errors: string[][]
  scenario: ScenarioKey
  yearView: YearView
  expanded: IAnyObject
  reverseMode: string
  reverseCustom: string
  vmReady: boolean
  policyNotice: string
  vm: Vm | null
}

Page<PageData, {
  onLoad(): void
  recompute(): void
  rebuildAll(offers: Offer[]): void
  commitEdit(
    i: number,
    modelPath: string | null,
    modelValue: any,
    draftPath?: string,
    draftValue?: any,
  ): void
  onTextInput(e: MiniEvent.Input): void
  onNumInput(e: MiniEvent.Input): void
  onRateInput(e: MiniEvent.Input): void
  onMonthsCustom(e: MiniEvent.Input): void
  onProbationMonths(e: MiniEvent.Input): void
  onRatioCustom(e: MiniEvent.Input): void
  onCityPick(e: MiniEvent.PickerChange): void
  onMonthsPick(e: MiniEvent.PickerChange): void
  onRatioPick(e: MiniEvent.PickerChange): void
  onHfRatePick(e: MiniEvent.PickerChange): void
  onBonusModeTap(e: MiniEvent.Tap): void
  onVbToggleTap(e: MiniEvent.Tap): void
  onVbModeTap(e: MiniEvent.Tap): void
  onSiModeTap(e: MiniEvent.Tap): void
  onSubsidyAdd(e: MiniEvent.Tap): void
  onSubsidyName(e: MiniEvent.Input): void
  onSubsidyAmount(e: MiniEvent.Input): void
  onSubsidyFreqPick(e: MiniEvent.PickerChange): void
  onSubsidyDurPick(e: MiniEvent.PickerChange): void
  onSubsidyCertPick(e: MiniEvent.PickerChange): void
  onSubsidyYears(e: MiniEvent.Input): void
  onSubsidyIncludedTap(e: MiniEvent.Tap): void
  onSubsidyRemove(e: MiniEvent.Tap): void
  onSwap(): void
  onReset(): void
  onScenarioTap(e: MiniEvent.Tap): void
  onYearTap(e: MiniEvent.Tap): void
  onDetailToggle(e: MiniEvent.Tap): void
  onReverseModeTap(e: MiniEvent.Tap): void
  onReverseCustom(e: MiniEvent.Input): void
  onGoResults(): void
  onOpenPolicy(e: MiniEvent.Tap): void
  onCopyLink(e: MiniEvent.Tap): void
}>({
  data: {
    offers: [],
    draft: [],
    cityLabels: CITY_LABELS,
    monthsOptions: MONTHS_OPTIONS,
    ratioOptions: RATIO_OPTIONS,
    freqOptions: FREQ_OPTIONS,
    durOptions: DUR_OPTIONS,
    certOptions: CERT_OPTIONS,
    subsidyPresets: SUBSIDY_PRESET_LABELS,
    errors: [[], []],
    scenario: 'expected',
    yearView: 'steady',
    expanded: {},
    reverseMode: '10',
    reverseCustom: '20',
    vmReady: false,
    policyNotice: POLICY_DATA_NOTICE,
    vm: null,
  },

  onLoad() {
    this.rebuildAll(createDefaultOffers())
  },

  /** 用给定的 offers 全量重建草稿与结果（载入 / 交换 / 重置 / 切城市时用） */
  rebuildAll(offers: Offer[]) {
    this.setData({
      offers,
      draft: offers.map(buildDraft),
    })
    this.recompute()
  },

  /** 变更 offers[i] 的某个路径后重算；draftPath/draftValue 可同步草稿字段 */
  commitEdit(
    i: number,
    modelPath: string | null,
    modelValue: any,
    draftPath?: string,
    draftValue?: any,
  ) {
    const update: IAnyObject = {}
    if (modelPath != null) {
      const offers = this.data.offers.slice()
      offers[i] = setPath(offers[i], modelPath, modelValue)
      update[`offers.${i}`] = offers[i]
    }
    if (draftPath != null) update[`draft.${i}.${draftPath}`] = draftValue
    this.setData(update)
    this.recompute()
  },

  recompute() {
    const { offers, scenario, yearView, expanded, reverseMode, reverseCustom } = this.data
    const policyA = getPolicy(offers[0].cityCode)
    const policyB = getPolicy(offers[1].cityCode)
    const scenarios: ScenarioKey[] = ['conservative', 'expected', 'optimistic']
    const resultSets = {} as Record<ScenarioKey, [OfferResult, OfferResult]>
    for (const s of scenarios) {
      resultSets[s] = [
        computeOfferResult(offers[0], policyA, s),
        computeOfferResult(offers[1], policyB, s),
      ]
    }
    const resA = resultSets[scenario][0]
    const resB = resultSets[scenario][1]
    const vm = buildVm(
      offers,
      resultSets,
      resA,
      resB,
      policyA,
      policyB,
      scenario,
      yearView,
      expanded,
      reverseMode,
      reverseCustom,
    )
    this.setData({
      errors: [resA.errors, resB.errors],
      vmReady: true,
      vm,
    })
  },

  /* -------- 文本 / 数字输入（data-i + data-path 模型路径 + data-dp 草稿路径） -------- */

  onTextInput(e: MiniEvent.Input) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const path = String(ds.path)
    const dp = String(ds.dp ?? path)
    const v = e.detail.value
    this.commitEdit(i, path, v, dp, v)
  },

  onNumInput(e: MiniEvent.Input) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const path = String(ds.path)
    const dp = String(ds.dp ?? path)
    const raw = e.detail.value
    this.commitEdit(i, path, parseNum(raw), dp, raw)
  },

  /** 百分比输入（模型存小数）：data-f 草稿 rates 键，data-mp 模型路径 */
  onRateInput(e: MiniEvent.Input) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const f = String(ds.f)
    const mp = String(ds.mp)
    const raw = e.detail.value
    const n = parseNum(raw)
    this.commitEdit(i, mp, n == null ? null : n / 100, `rates.${f}`, raw)
  },

  onMonthsCustom(e: MiniEvent.Input) {
    const raw = e.detail.value
    const n = parseIntOrNull(raw)
    const v = n == null ? 12 : Math.max(1, n)
    this.commitEdit(Number(e.currentTarget.dataset.i), 'fixedSalaryMonths', v, 'monthsCustom', raw)
  },

  onProbationMonths(e: MiniEvent.Input) {
    const raw = e.detail.value
    const n = parseIntOrNull(raw)
    const v = n == null ? 0 : Math.max(0, n)
    this.commitEdit(
      Number(e.currentTarget.dataset.i),
      'probation.months',
      v,
      'probationMonths',
      raw,
    )
  },

  onRatioCustom(e: MiniEvent.Input) {
    const raw = e.detail.value
    const n = parseNum(raw)
    const v = n == null ? 0.9 : n / 100
    this.commitEdit(
      Number(e.currentTarget.dataset.i),
      'probation.salaryRatio',
      v,
      'ratioCustom',
      raw,
    )
  },

  /* -------- 选择器 -------- */

  onCityPick(e: MiniEvent.PickerChange) {
    const i = Number(e.currentTarget.dataset.i)
    const idx = Number(e.detail.value)
    const code = CITY_VALUES[idx] ?? 'custom'
    const offers = this.data.offers.slice()
    const prev = offers[i]
    const next: Offer = {
      ...prev,
      cityCode: code,
      cityCustomName: code === 'custom' ? prev.cityCustomName || '' : '',
      socialInsurance: {
        useCityDefault: code !== 'custom',
        pensionBase: null,
        medicalBase: null,
        unemploymentBase: null,
        ...(code === 'custom'
          ? {
              pensionRates: { employee: null, employer: null },
              medicalRates: { employee: null, employer: null },
              unemploymentRates: { employee: null, employer: null },
            }
          : {}),
      },
      housingFund: { base: null, employeeRate: null, employerRate: null },
    }
    offers[i] = next
    const draft = this.data.draft.slice()
    draft[i] = buildDraft(next)
    this.setData({ [`offers.${i}`]: next, [`draft.${i}`]: draft[i] })
    this.recompute()
  },

  onMonthsPick(e: MiniEvent.PickerChange) {
    const i = Number(e.currentTarget.dataset.i)
    const idx = Number(e.detail.value)
    const mode = MONTHS_VALUES[idx] ?? '12'
    const monthsIndex = Math.max(0, MONTHS_VALUES.indexOf(mode))
    const updates: IAnyObject = {
      [`draft.${i}.monthsIndex`]: monthsIndex,
      [`draft.${i}.monthsMode`]: mode,
      [`draft.${i}.monthsLabel`]: MONTHS_OPTIONS[monthsIndex],
    }
    if (mode !== 'custom') {
      const offers = this.data.offers.slice()
      offers[i] = setPath(offers[i], 'fixedSalaryMonths', Number(mode))
      updates[`offers.${i}`] = offers[i]
    } else {
      updates[`draft.${i}.monthsCustom`] = numStr(this.data.offers[i].fixedSalaryMonths)
    }
    this.setData(updates)
    this.recompute()
  },

  onRatioPick(e: MiniEvent.PickerChange) {
    const i = Number(e.currentTarget.dataset.i)
    const idx = Number(e.detail.value)
    const mode = RATIO_VALUES[idx] ?? '1'
    const ratioIndex = Math.max(0, RATIO_VALUES.indexOf(mode))
    const updates: IAnyObject = {
      [`draft.${i}.ratioIndex`]: ratioIndex,
      [`draft.${i}.ratioMode`]: mode,
      [`draft.${i}.ratioLabel`]: RATIO_OPTIONS[ratioIndex],
    }
    if (mode !== 'custom') {
      const offers = this.data.offers.slice()
      offers[i] = setPath(offers[i], 'probation.salaryRatio', Number(mode))
      updates[`offers.${i}`] = offers[i]
    } else {
      updates[`draft.${i}.ratioCustom`] = pctStr(this.data.offers[i].probation.salaryRatio) || '90'
    }
    this.setData(updates)
    this.recompute()
  },

  onHfRatePick(e: MiniEvent.PickerChange) {
    const i = Number(e.currentTarget.dataset.i)
    const idx = Number(e.detail.value)
    const draft = this.data.draft[i]
    const value = draft.hfRateValues[idx] ?? 'default'
    const offers = this.data.offers.slice()
    if (value === 'default') {
      offers[i] = setPath(offers[i], 'housingFund', {
        ...offers[i].housingFund,
        employeeRate: null,
        employerRate: null,
      })
    } else {
      const rate = Number(value) / 100
      offers[i] = setPath(offers[i], 'housingFund', {
        ...offers[i].housingFund,
        employeeRate: rate,
        employerRate: rate,
      })
    }
    this.setData({
      [`offers.${i}`]: offers[i],
      [`draft.${i}.hfRateIndex`]: idx,
      [`draft.${i}.hfRateLabel`]: draft.hfRateOptions[idx] ?? '',
    })
    this.recompute()
  },

  /* -------- 开关与分段 -------- */

  onBonusModeTap(e: MiniEvent.Tap) {
    const i = Number(e.currentTarget.dataset.i)
    const mode = String(e.currentTarget.dataset.mode) as BonusMode
    this.commitEdit(i, 'fixedBonus', { ...this.data.offers[i].fixedBonus, mode }, 'bonusMode', mode)
  },

  onVbToggleTap(e: MiniEvent.Tap) {
    const i = Number(e.currentTarget.dataset.i)
    const next = !this.data.offers[i].hasVariableBonus
    this.commitEdit(i, 'hasVariableBonus', next, 'hasVariableBonus', next)
  },

  onVbModeTap(e: MiniEvent.Tap) {
    const i = Number(e.currentTarget.dataset.i)
    const mode = String(e.currentTarget.dataset.mode) as BonusMode
    const vb = this.data.offers[i].variableBonus
    this.commitEdit(
      i,
      'variableBonus',
      {
        conservative: { ...vb.conservative, mode },
        expected: { ...vb.expected, mode },
        optimistic: { ...vb.optimistic, mode },
      },
      'vbMode',
      mode,
    )
  },

  onSiModeTap(e: MiniEvent.Tap) {
    const i = Number(e.currentTarget.dataset.i)
    const useCityDefault = String(e.currentTarget.dataset.v) === '1'
    this.commitEdit(
      i,
      'socialInsurance',
      { ...this.data.offers[i].socialInsurance, useCityDefault },
      'useCityDefault',
      useCityDefault,
    )
  },

  /* -------- 补贴 -------- */

  onSubsidyAdd(e: MiniEvent.Tap) {
    const i = Number(e.currentTarget.dataset.i)
    const preset = SUBSIDY_PRESETS[Number(e.currentTarget.dataset.p)]
    if (!preset) return
    const subsidy: Subsidy = { ...preset, id: newSubsidyId(), amount: null }
    const offers = this.data.offers.slice()
    offers[i] = setPath(offers[i], 'subsidies', [...offers[i].subsidies, subsidy])
    const draft = this.data.draft.slice()
    draft[i] = setPath(draft[i], 'subsidies', [...draft[i].subsidies, buildDraftSubsidy(subsidy)])
    this.setData({ [`offers.${i}`]: offers[i], [`draft.${i}`]: draft[i] })
    this.recompute()
  },

  onSubsidyName(e: MiniEvent.Input) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const si = Number(ds.si)
    const v = e.detail.value
    this.commitEdit(i, `subsidies.${si}.name`, v, `subsidies.${si}.name`, v)
  },

  onSubsidyAmount(e: MiniEvent.Input) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const si = Number(ds.si)
    const raw = e.detail.value
    this.commitEdit(i, `subsidies.${si}.amount`, parseNum(raw), `subsidies.${si}.amount`, raw)
  },

  onSubsidyFreqPick(e: MiniEvent.PickerChange) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const si = Number(ds.si)
    const idx = Number(e.detail.value)
    const v = FREQ_VALUES[idx] ?? 'monthly'
    const offers = this.data.offers.slice()
    offers[i] = setPath(offers[i], `subsidies.${si}.frequency`, v)
    this.setData({
      [`offers.${i}`]: offers[i],
      [`draft.${i}.subsidies.${si}.freqIndex`]: idx,
      [`draft.${i}.subsidies.${si}.freqLabel`]: FREQ_OPTIONS[idx] ?? '',
    })
    this.recompute()
  },

  onSubsidyDurPick(e: MiniEvent.PickerChange) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const si = Number(ds.si)
    const idx = Number(e.detail.value)
    const v = DUR_VALUES[idx] ?? 'firstYearOnly'
    const offers = this.data.offers.slice()
    offers[i] = setPath(offers[i], `subsidies.${si}.duration`, v)
    this.setData({
      [`offers.${i}`]: offers[i],
      [`draft.${i}.subsidies.${si}.durIndex`]: idx,
      [`draft.${i}.subsidies.${si}.durLabel`]: DUR_OPTIONS[idx] ?? '',
    })
    this.recompute()
  },

  onSubsidyCertPick(e: MiniEvent.PickerChange) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const si = Number(ds.si)
    const idx = Number(e.detail.value)
    const v = CERT_VALUES[idx] ?? 'confirmed'
    const offers = this.data.offers.slice()
    offers[i] = setPath(offers[i], `subsidies.${si}.certainty`, v)
    this.setData({
      [`offers.${i}`]: offers[i],
      [`draft.${i}.subsidies.${si}.certIndex`]: idx,
      [`draft.${i}.subsidies.${si}.certLabel`]: CERT_OPTIONS[idx] ?? '',
    })
    this.recompute()
  },

  onSubsidyYears(e: MiniEvent.Input) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const si = Number(ds.si)
    const raw = e.detail.value
    const n = parseIntOrNull(raw)
    const v = n == null ? 1 : Math.max(1, n)
    this.commitEdit(i, `subsidies.${si}.durationYears`, v, `subsidies.${si}.durationYears`, raw)
  },

  onSubsidyIncludedTap(e: MiniEvent.Tap) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const si = Number(ds.si)
    const s = this.data.offers[i].subsidies[si]
    if (!s || s.certainty !== 'possible') return
    const next = !s.included
    this.commitEdit(i, `subsidies.${si}.included`, next, `subsidies.${si}.included`, next)
  },

  onSubsidyRemove(e: MiniEvent.Tap) {
    const ds = e.currentTarget.dataset
    const i = Number(ds.i)
    const si = Number(ds.si)
    const offers = this.data.offers.slice()
    offers[i] = setPath(
      offers[i],
      'subsidies',
      offers[i].subsidies.filter((_, k) => k !== si),
    )
    const draft = this.data.draft.slice()
    draft[i] = setPath(
      draft[i],
      'subsidies',
      draft[i].subsidies.filter((_, k) => k !== si),
    )
    this.setData({ [`offers.${i}`]: offers[i], [`draft.${i}`]: draft[i] })
    this.recompute()
  },

  /* -------- 顶栏动作 -------- */

  onSwap() {
    const offers = this.data.offers
    this.rebuildAll([cloneOffers([offers[1]])[0], cloneOffers([offers[0]])[0]])
  },

  onReset() {
    this.rebuildAll(createDefaultOffers())
  },

  /* -------- 结果区交互 -------- */

  onScenarioTap(e: MiniEvent.Tap) {
    const s = String(e.currentTarget.dataset.s) as ScenarioKey
    if (s !== 'conservative' && s !== 'expected' && s !== 'optimistic') return
    this.setData({ scenario: s })
    this.recompute()
  },

  onYearTap(e: MiniEvent.Tap) {
    const y = String(e.currentTarget.dataset.y)
    if (y !== 'first' && y !== 'steady') return
    this.setData({ yearView: y })
    this.recompute()
  },

  onDetailToggle(e: MiniEvent.Tap) {
    const key = String(e.currentTarget.dataset.key)
    const cur = !!this.data.expanded[key]
    this.setData({ [`expanded.${key}`]: !cur })
    this.recompute()
  },

  onReverseModeTap(e: MiniEvent.Tap) {
    this.setData({ reverseMode: String(e.currentTarget.dataset.v) })
    this.recompute()
  },

  onReverseCustom(e: MiniEvent.Input) {
    this.setData({ reverseCustom: e.detail.value })
    this.recompute()
  },

  onGoResults() {
    const q = tt.createSelectorQuery()
    q.selectViewport().scrollOffset()
    q.select('#results').boundingClientRect()
    q.exec((res) => {
      const offset = res && res[0]
      const rect = res && res[1]
      if (offset && rect) {
        tt.pageScrollTo({ scrollTop: Math.max(0, offset.scrollTop + rect.top - 12), duration: 300 })
      } else {
        tt.pageScrollTo({ scrollTop: 999999, duration: 300 })
      }
    })
  },

  onOpenPolicy(e: MiniEvent.Tap) {
    const city = String(e.currentTarget.dataset.city ?? '')
    tt.navigateTo({ url: `/pages/policy/policy?cityCode=${encodeURIComponent(city)}` })
  },

  onCopyLink(e: MiniEvent.Tap) {
    const url = String(e.currentTarget.dataset.url ?? '')
    if (!url) return
    tt.setClipboardData({ data: url })
    tt.showToast({ title: '已复制链接', icon: 'none' })
  },
})
