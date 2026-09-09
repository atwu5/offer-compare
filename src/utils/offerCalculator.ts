import {
  BonusInput,
  CalculationItem,
  CityPolicy,
  HousingFundPolicy,
  InsuranceRateInput,
  LivingCostItem,
  LivingCostKey,
  Offer,
  OfferResult,
  RateRange,
  ScenarioKey,
  Subsidy,
  YearResult,
} from '../types'
import { InsuranceAnnualResult, calcInsuranceAnnual } from './socialInsuranceCalculator'
import { HousingFundAnnualResult, calcHousingFundAnnual } from './housingFundCalculator'
import { AnnualTaxResult, ANNUAL_BASIC_DEDUCTION, calcAnnualTax } from './incomeTaxCalculator'
import { clamp, fmtCNY, fmtPct, fmtPctPlain, rateLabel, round2 } from './money'

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  conservative: '保守',
  expected: '正常',
  optimistic: '乐观',
}

export const LIVING_COST_LABELS: Record<LivingCostKey, string> = {
  housing: '房租',
  commute: '通勤',
  food: '餐饮',
  travel: '异地往返',
  other: '其他',
}

export const LIVING_COST_KEYS: LivingCostKey[] = ['housing', 'commute', 'food', 'travel', 'other']

const TAX_SOURCE = {
  name: '《中华人民共和国个人所得税法》综合所得年度税率表',
  url: 'https://flk.npc.gov.cn/',
}

const TAX_METHODOLOGY_NOTICE =
  '个税按全年综合所得「年度汇算」口径估算（未采用累计预扣法），年终奖并入综合所得计税。'

/** 奖金金额：mode = months 时按月薪折算 */
export function bonusAmount(b: BonusInput | undefined, monthlySalary: number): number {
  if (!b || b.value == null || !isFinite(b.value) || b.value <= 0) return 0
  return round2(b.mode === 'months' ? b.value * monthlySalary : b.value)
}

/**
 * 补贴在某一年度的计入金额。
 * 规则：
 *  - 「可能获得」的补贴默认不计入，用户勾选 included 后才计入；
 *  - 一次性补贴只计入第一年；
 *  - 仅第一年 / 指定年数 / 长期持续分别按规则映射到首年与稳定年。
 */
export function subsidyAnnualForYear(s: Subsidy, year: 1 | 2): number {
  const counted = s.certainty === 'confirmed' || s.included
  if (!counted) return 0
  const amt = s.amount != null && isFinite(s.amount) && s.amount > 0 ? s.amount : 0
  if (amt === 0) return 0
  if (s.frequency === 'once') return year === 1 ? round2(amt) : 0
  const applies =
    s.duration === 'permanent'
      ? true
      : s.duration === 'firstYearOnly'
        ? year === 1
        : year <= Math.max(1, Math.floor(s.durationYears || 1))
  if (!applies) return 0
  return round2(s.frequency === 'monthly' ? amt * 12 : amt)
}

/* ------------------------- 校验 ------------------------- */

export function validateOffer(offer: Offer, hasPolicy: boolean): { errors: string[] } {
  const errors: string[] = []
  const s = offer.monthlySalary
  if (s == null || !isFinite(s)) errors.push('请填写税前月薪。')
  else if (s <= 0) errors.push('税前月薪必须大于 0。')
  else if (s > 2000000) errors.push('税前月薪数值异常（超过 200 万），请检查。')

  const m = offer.fixedSalaryMonths
  if (!Number.isInteger(m) || m < 12 || m > 24) errors.push('全年固定工资月数应为 12～24 的整数。')

  const pm = offer.probation.months
  if (!Number.isInteger(pm) || pm < 0 || pm > 12) errors.push('试用期月数应为 0～12 的整数。')

  const pr = offer.probation.salaryRatio
  if (!isFinite(pr) || pr < 0.5 || pr > 1) errors.push('试用期工资比例应在 50%～100% 之间。')

  if (offer.monthlySpecialTaxDeduction != null && offer.monthlySpecialTaxDeduction < 0)
    errors.push('每月专项附加扣除不能为负数。')

  if (offer.cityCode === 'custom') {
    if (offer.socialInsurance.useCityDefault) {
      errors.push('当前没有找到该城市已核验的社保政策，请在「五险一金」中手动填写参数后继续计算。')
    } else {
      const si = offer.socialInsurance
      const missing: string[] = []
      if (si.pensionBase == null) missing.push('养老基数')
      if (si.medicalBase == null) missing.push('医疗基数')
      if (si.unemploymentBase == null) missing.push('失业基数')
      if (!si.pensionRates || si.pensionRates.employee == null || si.pensionRates.employer == null)
        missing.push('养老比例')
      if (!si.medicalRates || si.medicalRates.employee == null || si.medicalRates.employer == null)
        missing.push('医疗比例')
      if (
        !si.unemploymentRates ||
        si.unemploymentRates.employee == null ||
        si.unemploymentRates.employer == null
      )
        missing.push('失业比例')
      if (offer.housingFund.base == null) missing.push('公积金基数')
      if (offer.housingFund.employeeRate == null || offer.housingFund.employerRate == null)
        missing.push('公积金比例')
      if (missing.length > 0)
        errors.push(`请先补全手动填写的五险一金参数：${missing.join('、')}。`)
    }
  } else if (!hasPolicy) {
    errors.push('当前没有找到该城市已核验的社保政策，请手动填写参数后继续计算。')
  }

  return { errors }
}

/* ------------------------- 有效参数 ------------------------- */

interface EffectiveInsuranceParams {
  pension: RateRange
  medical: RateRange
  unemployment: RateRange
  housingFund: HousingFundPolicy
}

/** 其他城市（无政策数据）时，用用户手动填写的比例构造无上下限的参数 */
function buildEffectiveInsuranceParams(
  offer: Offer,
  policy: CityPolicy | null,
): EffectiveInsuranceParams {
  if (policy) {
    return {
      pension: policy.pension,
      medical: policy.medical,
      unemployment: policy.unemployment,
      housingFund: policy.housingFund,
    }
  }
  const si = offer.socialInsurance
  const mk = (rates?: InsuranceRateInput): RateRange => ({
    employeeRate: rates?.employee ?? 0,
    employerRate: rates?.employer ?? 0,
    baseMin: 0,
    baseMax: Infinity,
  })
  return {
    pension: mk(si.pensionRates),
    medical: mk(si.medicalRates),
    unemployment: mk(si.unemploymentRates),
    housingFund: {
      employeeRateDefault: offer.housingFund.employeeRate ?? 0,
      employerRateDefault: offer.housingFund.employerRate ?? 0,
      rateMin: 0,
      rateMax: 1,
      baseMin: 0,
      baseMax: Infinity,
    },
  }
}

interface SIYearResult {
  pension: InsuranceAnnualResult
  medical: InsuranceAnnualResult
  unemployment: InsuranceAnnualResult
}

/* ------------------------- 明细构建 ------------------------- */

interface BreakdownCtx {
  offer: Offer
  policy: CityPolicy | null
  cityName: string
  scenario: ScenarioKey
  probM: number
  ratio: number
  extraMonths: number
  salary: number
  year: 1 | 2
  fixedSalary: number
  fixedBonusAmt: number
  variableAmt: number
  subsidiesTotal: number
  gross: number
  si: SIYearResult
  hf: HousingFundAnnualResult
  tax: AnnualTaxResult
  specialAnnual: number
  livingItems: LivingCostItem[]
  livingAnnual: number
  siEmployeeTotal: number
  hfEmployee: number
  disposable: number
}

function buildBreakdown(ctx: BreakdownCtx): CalculationItem[] {
  const {
    offer,
    policy,
    scenario,
    probM,
    ratio,
    extraMonths,
    salary,
    year,
    fixedSalary,
    fixedBonusAmt,
    variableAmt,
    subsidiesTotal,
    gross,
    si,
    hf,
    tax,
    specialAnnual,
    livingItems,
    livingAnnual,
    siEmployeeTotal,
    hfEmployee,
    disposable,
  } = ctx
  const items: CalculationItem[] = []
  const source: { name: string; url: string } | undefined = policy?.sources?.[0]
  const isYear1 = year === 1

  // 税前工资收入
  const monthsDesc = isYear1
    ? `${12 - probM} 个月全额 + 试用期 ${probM} 个月 × ${rateLabel(ratio)}${
        extraMonths > 0 ? ` + 年终多发 ${extraMonths} 个月` : ''
      }`
    : `${offer.fixedSalaryMonths} 个月`
  items.push({
    key: 'salary',
    name: '税前工资收入',
    group: 'income',
    amount: fixedSalary,
    displaySign: 1,
    formula: `月薪 ${fmtCNY(salary)} × ${monthsDesc}`,
    parameters: [
      { label: '税前月薪', value: fmtCNY(salary) },
      { label: '全年固定工资月数', value: `${offer.fixedSalaryMonths} 个月` },
      ...(probM > 0
        ? [
            {
              label: '试用期',
              value: `${probM} 个月 × ${rateLabel(ratio)}（仅首年生效）`,
            },
          ]
        : []),
      ...(extraMonths > 0
        ? [{ label: '年终多发月份', value: `${extraMonths} 个月，按全额月薪发放` }]
        : []),
    ],
    notices: isYear1 && probM > 0 ? ['首年工资已按试用期折扣计算。'] : [],
  })

  // 固定奖金
  items.push({
    key: 'fixedBonus',
    name: '固定奖金',
    group: 'income',
    amount: fixedBonusAmt,
    displaySign: 1,
    formula:
      offer.fixedBonus.mode === 'months'
        ? `${offer.fixedBonus.value ?? 0} 个月月薪 × ${fmtCNY(salary)}`
        : `固定金额 ${fmtCNY(fixedBonusAmt)}`,
    parameters: [{ label: '输入方式', value: offer.fixedBonus.mode === 'months' ? '按月数' : '按金额' }],
  })

  // 浮动奖金
  if (offer.hasVariableBonus) {
    items.push({
      key: 'variableBonus',
      name: `浮动奖金（${SCENARIO_LABELS[scenario]}场景）`,
      group: 'income',
      amount: variableAmt,
      displaySign: 1,
      formula:
        offer.variableBonus[scenario].mode === 'months'
          ? `${offer.variableBonus[scenario].value ?? 0} 个月月薪 × ${fmtCNY(salary)}`
          : `固定金额 ${fmtCNY(variableAmt)}`,
      parameters: [
        {
          label: '场景',
          value: `保守 ${offer.variableBonus.conservative.value ?? 0} / 正常 ${
            offer.variableBonus.expected.value ?? 0
          } / 乐观 ${offer.variableBonus.optimistic.value ?? 0}（${
            offer.variableBonus[scenario].mode === 'months' ? '月数' : '元'
          }）`,
        },
      ],
    })
  }

  // 现金补贴
  const countedSubsidies = offer.subsidies
    .map((s) => ({ s, amt: subsidyAnnualForYear(s, year) }))
    .filter((x) => x.amt > 0)
  if (countedSubsidies.length > 0) {
    items.push({
      key: 'subsidies',
      name: '现金补贴',
      group: 'income',
      amount: subsidiesTotal,
      displaySign: 1,
      formula: countedSubsidies.map((x) => `${x.s.name} ${fmtCNY(x.amt)}`).join(' + '),
      parameters: countedSubsidies.flatMap(({ s, amt }) => [
        {
          label: s.name,
          value: `${fmtCNY(s.amount ?? 0)} / ${
            s.frequency === 'monthly' ? '月' : s.frequency === 'yearly' ? '年' : '一次性'
          } → 本年度计入 ${fmtCNY(amt)}`,
        },
      ]),
      notices:
        year === 1
          ? ['一次性补贴（如签字费）仅计入首年。']
          : ['稳定年已排除一次性补贴与仅首年补贴。'],
    })
  }

  // 税前收入合计
  items.push({
    key: 'grossSubtotal',
    name: '税前收入合计',
    group: 'income',
    amount: gross,
    displaySign: 1,
    emphasis: 'subtotal',
    formula: '以上收入项之和',
    parameters: [],
  })

  // 养老 / 医疗 / 失业（个人）
  const siRows: { key: string; name: string; r: InsuranceAnnualResult }[] = [
    { key: 'pension', name: '养老保险（个人）', r: si.pension },
    { key: 'medical', name: '医疗保险（个人）', r: si.medical },
    { key: 'unemployment', name: '失业保险（个人）', r: si.unemployment },
  ]
  const siPolicies: Record<string, RateRange | undefined> = policy
    ? { pension: policy.pension, medical: policy.medical, unemployment: policy.unemployment }
    : {}
  for (const row of siRows) {
    const p = siPolicies[row.key]
    items.push({
      key: row.key,
      name: row.name,
      group: 'insurance',
      amount: row.r.annualEmployee,
      displaySign: -1,
      formula: `${fmtCNY(row.r.steadyBase)}（月缴费基数） × ${rateLabel(
        p?.employeeRate ?? 0,
      )}（个人比例） × 12 个月`,
      parameters: [
        { label: '税前月薪', value: fmtCNY(salary) },
        {
          label: '月有效缴费基数',
          value: `${fmtCNY(row.r.steadyBase)}${
            row.r.notices.length > 0 ? '（已按政策上下限调整）' : ''
          }`,
        },
        { label: '个人比例', value: rateLabel(p?.employeeRate ?? 0) },
        {
          label: '单位比例',
          value: `${rateLabel(p?.employerRate ?? 0)}（单位缴费不计入个人收入）`,
        },
        ...(p
          ? [
              { label: '当地基数范围', value: `${fmtCNY(p.baseMin)} ～ ${fmtCNY(p.baseMax)}` },
            ]
          : [{ label: '基数来源', value: '手动填写' }]),
      ],
      policySource: source,
      notices: row.r.notices,
    })
  }

  // 公积金（个人）
  items.push({
    key: 'housingFund',
    name: '住房公积金（个人）',
    group: 'insurance',
    amount: hf.annualEmployee,
    displaySign: -1,
    formula: `${fmtCNY(hf.steadyBase)}（月缴存基数） × ${rateLabel(hf.employeeRate)}（个人比例） × 12 个月`,
    parameters: [
      { label: '税前月薪', value: fmtCNY(salary) },
      {
        label: '月有效缴存基数',
        value: `${fmtCNY(hf.steadyBase)}${hf.notices.length > 0 ? '（已按政策上下限调整）' : ''}`,
      },
      { label: '个人比例', value: rateLabel(hf.employeeRate) },
      {
        label: '单位比例',
        value: `${rateLabel(hf.employerRate)}（单位缴存一并进入你的公积金账户）`,
      },
      ...(policy
        ? [
            {
              label: '当地基数范围',
              value: `${fmtCNY(policy.housingFund.baseMin)} ～ ${fmtCNY(policy.housingFund.baseMax)}`,
            },
          ]
        : [{ label: '基数来源', value: '手动填写' }]),
    ],
    policySource: source,
    notices: hf.notices,
  })

  // 五险一金个人合计
  items.push({
    key: 'insuranceSubtotal',
    name: '五险一金个人缴纳合计',
    group: 'insurance',
    amount: siEmployeeTotal + hfEmployee,
    displaySign: -1,
    emphasis: 'subtotal',
    formula: '养老 + 医疗 + 失业 + 公积金（个人部分）',
    parameters: [{ label: '月均', value: fmtCNY((siEmployeeTotal + hfEmployee) / 12) }],
  })

  // 个人所得税
  items.push({
    key: 'incomeTax',
    name: '个人所得税',
    group: 'insurance',
    amount: tax.tax,
    displaySign: -1,
    formula:
      tax.taxableIncome <= 0
        ? '全年应纳税所得额 ≤ 0，无需缴纳个人所得税'
        : `（全年税前收入 ${fmtCNY(gross)} − 基本减除费用 ${fmtCNY(
            ANNUAL_BASIC_DEDUCTION,
          )} − 五险一金个人 ${fmtCNY(siEmployeeTotal + hfEmployee)} − 专项附加扣除 ${fmtCNY(
            specialAnnual,
          )}） × 税率 ${rateLabel(tax.rate)} − 速算扣除数 ${fmtCNY(tax.quickDeduction)}`,
    parameters: [
      { label: '全年应纳税所得额', value: fmtCNY(tax.taxableIncome) },
      { label: '适用税档', value: tax.bracketLabel },
      { label: '专项附加扣除', value: `${fmtCNY(specialAnnual / 12)} / 月 × 12` },
      { label: '计算口径', value: '年度汇算口径（非累计预扣）' },
    ],
    policySource: TAX_SOURCE,
    notices: [TAX_METHODOLOGY_NOTICE],
  })

  // 生活成本
  for (const li of livingItems) {
    items.push({
      key: `living_${li.key}`,
      name: li.label,
      group: 'cost',
      amount: li.annual,
      displaySign: -1,
      formula: `每月 ${fmtCNY(li.monthly)} × 12 个月`,
      parameters: [{ label: '说明', value: '仅计入你填写的工作相关成本变化' }],
    })
  }
  if (livingItems.length > 1) {
    items.push({
      key: 'livingSubtotal',
      name: '工作相关成本合计',
      group: 'cost',
      amount: livingAnnual,
      displaySign: -1,
      emphasis: 'subtotal',
      formula: '房租 + 通勤 + 餐饮 + 异地往返 + 其他',
      parameters: [],
    })
  }

  // 最终可支配收入
  items.push({
    key: 'disposable',
    name: isYear1 ? '首年可支配现金' : '稳定年可支配现金',
    group: 'result',
    amount: disposable,
    displaySign: 1,
    emphasis: 'total',
    formula: `税前收入 ${fmtCNY(gross)} − 五险一金个人 ${fmtCNY(
      siEmployeeTotal + hfEmployee,
    )} − 个人所得税 ${fmtCNY(tax.tax)} − 工作相关成本 ${fmtCNY(livingAnnual)}`,
    parameters: [
      { label: '月均', value: fmtCNY(disposable / 12) },
      {
        label: '口径',
        value: '可支配现金 = 工资 + 奖金 + 已确认补贴 − 五险一金个人 − 个税 − 工作新增生活成本',
      },
    ],
  })

  return items
}

/* ------------------------- 主计算 ------------------------- */

function emptyYear(year: 1 | 2): YearResult {
  return {
    year,
    fixedSalary: 0,
    fixedBonus: 0,
    variableBonus: 0,
    subsidiesTotal: 0,
    grossIncome: 0,
    employeeSocialInsurance: 0,
    employeeHousingFund: 0,
    employerSocialInsurance: 0,
    employerHousingFund: 0,
    specialDeductionAnnual: 0,
    taxableIncome: 0,
    estimatedIncomeTax: 0,
    taxRate: 0,
    taxQuickDeduction: 0,
    livingCosts: 0,
    livingItems: [],
    disposableCash: 0,
    housingFundAssetIncrease: 0,
  }
}

export function computeOfferResult(
  offer: Offer,
  policy: CityPolicy | null,
  scenario: ScenarioKey,
): OfferResult {
  const cityName = policy ? policy.cityName : offer.cityCustomName?.trim() || '自定义城市'
  const { errors } = validateOffer(offer, !!policy)
  if (errors.length > 0) {
    return {
      offerId: offer.id,
      offerName: offer.name,
      cityCode: offer.cityCode,
      cityName,
      scenario,
      valid: false,
      errors,
      notices: [],
      hasVariableBonus: offer.hasVariableBonus,
      monthlyGrossSalary: offer.monthlySalary ?? 0,
      grossAnnualIncome: 0,
      firstYear: emptyYear(1),
      steadyYear: emptyYear(2),
      monthlyDisposable: 0,
      housingFundAssetIncrease: 0,
      employerPensionAnnual: 0,
      effectivePensionBase: 0,
      effectiveHousingFundBase: 0,
      breakdown: [],
      firstBreakdown: [],
    }
  }

  const salary = offer.monthlySalary as number
  const notices: string[] = []
  const pushNotice = (n: string) => {
    if (n && !notices.includes(n)) notices.push(n)
  }

  if (policy && policy.demo) {
    pushNotice(`${cityName}当前使用演示政策数据（${policy.version}），结果仅供功能演示。`)
  }
  if (policy && policy.effectiveDate && policy.effectiveDate < '2026-01-01') {
    pushNotice(`${cityName}政策版本生效日期较早，可能已过期，请核对最新政策。`)
  }

  const probM = Math.min(Math.max(Math.floor(offer.probation.months || 0), 0), 12)
  const ratio = clamp(offer.probation.salaryRatio || 1, 0.5, 1)
  const extraMonths = Math.max(0, offer.fixedSalaryMonths - 12)

  // 12 个日历月的当月实际工资（试用期折扣仅首年生效）
  const monthSalariesYear1: number[] = []
  for (let i = 0; i < 12; i++) monthSalariesYear1.push(i < probM ? round2(salary * ratio) : salary)
  const monthSalariesSteady: number[] = new Array(12).fill(salary)

  const si = offer.socialInsurance
  const useCustomBase = !si.useCityDefault
  const eff = buildEffectiveInsuranceParams(offer, policy)

  const calcSI = (ms: number[]): SIYearResult => ({
    pension: calcInsuranceAnnual('养老保险', eff.pension, ms, useCustomBase ? si.pensionBase : null),
    medical: calcInsuranceAnnual('医疗保险', eff.medical, ms, useCustomBase ? si.medicalBase : null),
    unemployment: calcInsuranceAnnual(
      '失业保险',
      eff.unemployment,
      ms,
      useCustomBase ? si.unemploymentBase : null,
    ),
  })
  const siY1 = calcSI(monthSalariesYear1)
  const siS = calcSI(monthSalariesSteady)
  ;[...Object.values(siY1), ...Object.values(siS)].forEach((r) => r.notices.forEach(pushNotice))

  const hf = offer.housingFund
  const hfY1 = calcHousingFundAnnual(
    eff.housingFund,
    monthSalariesYear1,
    useCustomBase ? hf.base : null,
    hf.employeeRate,
    hf.employerRate,
  )
  const hfS = calcHousingFundAnnual(
    eff.housingFund,
    monthSalariesSteady,
    useCustomBase ? hf.base : null,
    hf.employeeRate,
    hf.employerRate,
  )
  ;[hfY1, hfS].forEach((r) => r.notices.forEach(pushNotice))

  const siEmployeeOf = (r: SIYearResult) =>
    round2(r.pension.annualEmployee + r.medical.annualEmployee + r.unemployment.annualEmployee)
  const siEmployerOf = (r: SIYearResult) =>
    round2(r.pension.annualEmployer + r.medical.annualEmployer + r.unemployment.annualEmployer)

  const siEmp1 = siEmployeeOf(siY1)
  const siEmpS = siEmployeeOf(siS)

  // 收入项
  const fixedBonusAmt = bonusAmount(offer.fixedBonus, salary)
  const variableAmt = offer.hasVariableBonus ? bonusAmount(offer.variableBonus[scenario], salary) : 0
  const subsidiesYear1 = round2(
    offer.subsidies.reduce((acc, s) => acc + subsidyAnnualForYear(s, 1), 0),
  )
  const subsidiesSteady = round2(
    offer.subsidies.reduce((acc, s) => acc + subsidyAnnualForYear(s, 2), 0),
  )

  // 首年固定工资：试用期月按折扣，其余月份全额；13～16 薪按全额月薪
  const year1FixedSalary = round2(
    salary * (12 - probM) + salary * ratio * probM + salary * extraMonths,
  )
  const steadyFixedSalary = round2(salary * offer.fixedSalaryMonths)

  const grossYear1 = round2(year1FixedSalary + fixedBonusAmt + variableAmt + subsidiesYear1)
  const grossSteady = round2(steadyFixedSalary + fixedBonusAmt + variableAmt + subsidiesSteady)

  // 生活成本
  const lc = offer.livingCosts
  const livingItems: LivingCostItem[] = LIVING_COST_KEYS.map((k) => ({
    key: k,
    label: LIVING_COST_LABELS[k],
    monthly: Math.max(0, lc[k] ?? 0),
    annual: round2(Math.max(0, lc[k] ?? 0) * 12),
  })).filter((x) => x.monthly > 0)
  const livingAnnual = round2(livingItems.reduce((a, b) => a + b.annual, 0))

  // 个税
  const specialAnnual = round2(Math.max(0, offer.monthlySpecialTaxDeduction ?? 0) * 12)
  const hfEmp1 = hfY1.annualEmployee
  const hfEmpS = hfS.annualEmployee
  const taxYear1 = calcAnnualTax(round2(grossYear1 - ANNUAL_BASIC_DEDUCTION - siEmp1 - hfEmp1 - specialAnnual))
  const taxSteady = calcAnnualTax(round2(grossSteady - ANNUAL_BASIC_DEDUCTION - siEmpS - hfEmpS - specialAnnual))

  const year1: YearResult = {
    year: 1,
    fixedSalary: year1FixedSalary,
    fixedBonus: fixedBonusAmt,
    variableBonus: variableAmt,
    subsidiesTotal: subsidiesYear1,
    grossIncome: grossYear1,
    employeeSocialInsurance: siEmp1,
    employeeHousingFund: hfEmp1,
    employerSocialInsurance: siEmployerOf(siY1),
    employerHousingFund: hfY1.annualEmployer,
    specialDeductionAnnual: specialAnnual,
    taxableIncome: taxYear1.taxableIncome,
    estimatedIncomeTax: taxYear1.tax,
    taxRate: taxYear1.rate,
    taxQuickDeduction: taxYear1.quickDeduction,
    livingCosts: livingAnnual,
    livingItems,
    disposableCash: round2(grossYear1 - siEmp1 - hfEmp1 - taxYear1.tax - livingAnnual),
    housingFundAssetIncrease: round2(hfEmp1 + hfY1.annualEmployer),
  }
  const steadyYear: YearResult = {
    year: 2,
    fixedSalary: steadyFixedSalary,
    fixedBonus: fixedBonusAmt,
    variableBonus: variableAmt,
    subsidiesTotal: subsidiesSteady,
    grossIncome: grossSteady,
    employeeSocialInsurance: siEmpS,
    employeeHousingFund: hfEmpS,
    employerSocialInsurance: siEmployerOf(siS),
    employerHousingFund: hfS.annualEmployer,
    specialDeductionAnnual: specialAnnual,
    taxableIncome: taxSteady.taxableIncome,
    estimatedIncomeTax: taxSteady.tax,
    taxRate: taxSteady.rate,
    taxQuickDeduction: taxSteady.quickDeduction,
    livingCosts: livingAnnual,
    livingItems,
    disposableCash: round2(grossSteady - siEmpS - hfEmpS - taxSteady.tax - livingAnnual),
    housingFundAssetIncrease: round2(hfEmpS + hfS.annualEmployer),
  }

  const baseCtx = {
    offer,
    policy,
    cityName,
    scenario,
    probM,
    ratio,
    extraMonths,
    salary,
    fixedBonusAmt,
    variableAmt,
    specialAnnual,
    livingItems,
    livingAnnual,
  }
  const breakdown = buildBreakdown({
    ...baseCtx,
    year: 2,
    fixedSalary: steadyFixedSalary,
    subsidiesTotal: subsidiesSteady,
    gross: grossSteady,
    si: siS,
    hf: hfS,
    tax: taxSteady,
    siEmployeeTotal: siEmpS,
    hfEmployee: hfEmpS,
    disposable: steadyYear.disposableCash,
  })
  const firstBreakdown = buildBreakdown({
    ...baseCtx,
    year: 1,
    fixedSalary: year1FixedSalary,
    subsidiesTotal: subsidiesYear1,
    gross: grossYear1,
    si: siY1,
    hf: hfY1,
    tax: taxYear1,
    siEmployeeTotal: siEmp1,
    hfEmployee: hfEmp1,
    disposable: year1.disposableCash,
  })

  return {
    offerId: offer.id,
    offerName: offer.name,
    cityCode: offer.cityCode,
    cityName,
    scenario,
    valid: true,
    errors: [],
    notices,
    hasVariableBonus: offer.hasVariableBonus,
    monthlyGrossSalary: salary,
    grossAnnualIncome: grossSteady,
    firstYear: year1,
    steadyYear,
    monthlyDisposable: round2(steadyYear.disposableCash / 12),
    housingFundAssetIncrease: steadyYear.housingFundAssetIncrease,
    employerPensionAnnual: siS.pension.annualEmployer,
    effectivePensionBase: siS.pension.steadyBase,
    effectiveHousingFundBase: hfS.steadyBase,
    breakdown,
    firstBreakdown,
  }
}

/* ------------------------- 差异拆解 ------------------------- */

export interface DiffRow {
  key: string
  label: string
  amount: number
  kind: 'income' | 'deduction'
}

export function buildDiffRows(a: OfferResult, b: OfferResult, year: 'first' | 'steady'): DiffRow[] {
  const ya = year === 'first' ? a.firstYear : a.steadyYear
  const yb = year === 'first' ? b.firstYear : b.steadyYear
  const rows: DiffRow[] = []
  const push = (key: string, label: string, diff: number, kind: 'income' | 'deduction') => {
    if (Math.abs(diff) >= 0.5) rows.push({ key, label, amount: round2(diff), kind })
  }
  push('salary', '税前工资', yb.fixedSalary - ya.fixedSalary, 'income')
  push('fixedBonus', '固定奖金', yb.fixedBonus - ya.fixedBonus, 'income')
  push('variableBonus', '浮动奖金', yb.variableBonus - ya.variableBonus, 'income')
  push('subsidies', '现金补贴', yb.subsidiesTotal - ya.subsidiesTotal, 'income')
  push('incomeTax', '个人所得税', -(yb.estimatedIncomeTax - ya.estimatedIncomeTax), 'deduction')
  push('si', '社保个人缴纳', -(yb.employeeSocialInsurance - ya.employeeSocialInsurance), 'deduction')
  push('hf', '公积金个人缴纳', -(yb.employeeHousingFund - ya.employeeHousingFund), 'deduction')
  for (const k of LIVING_COST_KEYS) {
    const av = ya.livingItems.find((i) => i.key === k)?.annual ?? 0
    const bv = yb.livingItems.find((i) => i.key === k)?.annual ?? 0
    push(`living_${k}`, LIVING_COST_LABELS[k], -(bv - av), 'deduction')
  }
  return rows
}

export function diffTotal(a: OfferResult, b: OfferResult, year: 'first' | 'steady'): number {
  return round2(
    (year === 'first' ? b.firstYear.disposableCash : b.steadyYear.disposableCash) -
      (year === 'first' ? a.firstYear.disposableCash : a.steadyYear.disposableCash),
  )
}

/* ------------------------- 结论生成（纯规则，无 AI） ------------------------- */

export interface Headline {
  hasData: boolean
  title: string
  explanation: string
  nominal: number
  real: number
  firstDiff: number
  steadyDiff: number
}

export function buildHeadline(a: OfferResult, b: OfferResult): Headline {
  const aSteady = a.steadyYear.disposableCash
  const bSteady = b.steadyYear.disposableCash
  const nominal = a.grossAnnualIncome > 0 ? b.grossAnnualIncome / a.grossAnnualIncome - 1 : NaN
  const real = aSteady > 0 ? bSteady / aSteady - 1 : NaN
  const firstDiff = round2(b.firstYear.disposableCash - a.firstYear.disposableCash)
  const steadyDiff = round2(bSteady - aSteady)

  if (!a.valid || !b.valid || !isFinite(nominal) || !isFinite(real) || aSteady <= 0) {
    return {
      hasData: false,
      title: '',
      explanation: '',
      nominal: NaN,
      real: NaN,
      firstDiff,
      steadyDiff,
    }
  }

  const aName = a.offerName
  const bName = b.offerName
  let title: string
  if (Math.abs(steadyDiff) < 1200) {
    title = '两个 Offer 实际到手基本相当'
  } else if (steadyDiff > 0) {
    if (nominal - real > 0.02) title = `${bName} 收入更高，但没有名义涨薪看起来那么多`
    else if (real - nominal > 0.02) title = `${bName} 收入更高，实际到手涨幅超过名义涨薪`
    else title = `${bName} 收入更高`
  } else {
    if (nominal > 0.02 && real < -0.02) title = `${bName} 名义涨薪更高，但实际到手反而更少`
    else title = `${aName} 实际到手更高`
  }

  const direction = real >= 0 ? '提升' : '下降'
  const explanation = `名义税前年收入相差 ${fmtPct(nominal)}，但考虑个税、五险一金、公积金以及工作成本后，稳定年实际可自由支配收入${direction}约 ${fmtPctPlain(real)}。`

  return { hasData: true, title, explanation, nominal, real, firstDiff, steadyDiff }
}

/** 场景波动总结（仅基于输入数值的规则判断） */
export function buildScenarioNote(
  resultSets: Record<ScenarioKey, [OfferResult, OfferResult]>,
  aName: string,
  bName: string,
): string {
  const a = resultSets.expected[0]
  const b = resultSets.expected[1]
  if (!a.valid || !b.valid) return ''
  if (!a.hasVariableBonus && !b.hasVariableBonus) {
    return '未填写浮动奖金，当前仅按正常场景计算。'
  }
  const spreadA = round2(
    resultSets.optimistic[0].steadyYear.disposableCash - resultSets.conservative[0].steadyYear.disposableCash,
  )
  const spreadB = round2(
    resultSets.optimistic[1].steadyYear.disposableCash - resultSets.conservative[1].steadyYear.disposableCash,
  )
  if (spreadA <= 0 && spreadB <= 0) return '浮动奖金未产生实际差异，三个场景结果一致。'
  if (spreadB > spreadA * 1.05) return `${bName} 收入上限更高，但收入波动也更明显。`
  if (spreadA > spreadB * 1.05) return `${aName} 收入上限更高，但收入波动也更明显。`
  return '两个 Offer 的收入波动幅度接近。'
}
