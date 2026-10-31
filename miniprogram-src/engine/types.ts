/** 核心类型定义：Offer 数据模型、城市政策、计算结果 */

export type ScenarioKey = 'conservative' | 'expected' | 'optimistic'

export type BonusMode = 'months' | 'amount'

/** 奖金输入：支持「X 个月工资」或固定金额 */
export interface BonusInput {
  mode: BonusMode
  value: number | null
}

export type SubsidyFrequency = 'monthly' | 'yearly' | 'once'
export type SubsidyDuration = 'firstYearOnly' | 'permanent' | 'years'
export type SubsidyCertainty = 'confirmed' | 'possible'

export interface Subsidy {
  id: string
  name: string
  amount: number | null
  frequency: SubsidyFrequency
  duration: SubsidyDuration
  /** duration === 'years' 时生效 */
  durationYears: number
  certainty: SubsidyCertainty
  /** certainty === 'possible' 时，用户主动勾选后才计入核心结果 */
  included: boolean
}

export type LivingCostKey = 'housing' | 'commute' | 'food' | 'travel' | 'other'

export type LivingCosts = Record<LivingCostKey, number | null>

export interface InsuranceRateInput {
  employee: number | null
  employer: number | null
}

export interface OfferSocialInsurance {
  /** true：按城市政策 + 当月实际工资自动估算；false：使用用户手动填写的基数 */
  useCityDefault: boolean
  pensionBase?: number | null
  medicalBase?: number | null
  unemploymentBase?: number | null
  /** 其他城市（无政策数据）时的手动比例 */
  pensionRates?: InsuranceRateInput
  medicalRates?: InsuranceRateInput
  unemploymentRates?: InsuranceRateInput
}

export interface OfferHousingFund {
  base?: number | null
  /** null 表示使用政策默认比例；小数存储，如 0.12 */
  employeeRate?: number | null
  employerRate?: number | null
}

/** Offer 数据模型（数组化设计，MVP 只渲染前两个，但架构支持多个 Offer） */
export interface Offer {
  id: string
  name: string
  companyName: string
  /** cityPolicies 的 key，或 'custom'（其他城市，手动填写参数） */
  cityCode: string
  cityCustomName?: string
  monthlySalary: number | null
  /** 全年固定工资月数：12 / 13 / 14 / 15 / 16 或自定义 */
  fixedSalaryMonths: number
  fixedBonus: BonusInput
  hasVariableBonus: boolean
  variableBonus: {
    conservative: BonusInput
    expected: BonusInput
    optimistic: BonusInput
  }
  /** 试用期：months = 0 表示无试用期；salaryRatio = 1 表示无折扣 */
  probation: {
    months: number
    salaryRatio: number
  }
  subsidies: Subsidy[]
  socialInsurance: OfferSocialInsurance
  housingFund: OfferHousingFund
  /** 每月专项附加扣除（个税） */
  monthlySpecialTaxDeduction: number | null
  /** 工作变化带来的额外生活成本（元/月） */
  livingCosts: LivingCosts
}

/* ------------------------- 城市政策 ------------------------- */

export interface RateRange {
  employeeRate: number
  employerRate: number
  baseMin: number
  baseMax: number
}

export interface HousingFundPolicy {
  employeeRateDefault: number
  employerRateDefault: number
  rateMin: number
  rateMax: number
  baseMin: number
  baseMax: number
}

export interface PolicySource {
  name: string
  url: string
}

/** 城市政策数据结构：与计算逻辑完全分离，更新政策只改数据不改代码 */
export interface CityPolicy {
  cityCode: string
  cityName: string
  /** 如 "2026" */
  version: string
  /** YYYY-MM-DD */
  effectiveDate: string
  /** YYYY-MM-DD */
  updatedAt: string
  verified: boolean
  /** true = 演示数据，未核验 */
  demo: boolean
  pension: RateRange
  medical: RateRange
  unemployment: RateRange
  housingFund: HousingFundPolicy
  sources: PolicySource[]
  notes?: string
}

/* ------------------------- 计算结果 ------------------------- */

export type ItemGroup = 'income' | 'insurance' | 'cost' | 'result'

/** 可解释的计算明细项：结果页点击金额 → 展示计算依据 */
export interface CalculationItem {
  key: string
  name: string
  group: ItemGroup
  /** 年度金额（正数表示该项的绝对值） */
  amount: number
  /** 1 = 收入/增加，-1 = 扣除/减少 */
  displaySign: 1 | -1
  formula: string
  parameters: { label: string; value: string }[]
  policySource?: PolicySource
  notices?: string[]
  emphasis?: 'subtotal' | 'total'
}

export interface LivingCostItem {
  key: LivingCostKey
  label: string
  monthly: number
  annual: number
}

export interface YearResult {
  year: 1 | 2
  fixedSalary: number
  fixedBonus: number
  variableBonus: number
  subsidiesTotal: number
  grossIncome: number
  employeeSocialInsurance: number
  employeeHousingFund: number
  employerSocialInsurance: number
  employerHousingFund: number
  specialDeductionAnnual: number
  taxableIncome: number
  estimatedIncomeTax: number
  taxRate: number
  taxQuickDeduction: number
  livingCosts: number
  livingItems: LivingCostItem[]
  disposableCash: number
  housingFundAssetIncrease: number
}

export interface OfferResult {
  offerId: string
  offerName: string
  cityCode: string
  cityName: string
  scenario: ScenarioKey
  valid: boolean
  errors: string[]
  hasVariableBonus: boolean
  /** 基数截断、政策版本等提示（不静默处理） */
  notices: string[]
  monthlyGrossSalary: number
  /** 稳定年税前年收入 */
  grossAnnualIncome: number
  firstYear: YearResult
  steadyYear: YearResult
  /** 稳定年月均可支配现金 */
  monthlyDisposable: number
  /** 稳定年公积金账户年度增加（个人 + 单位） */
  housingFundAssetIncrease: number
  /** 稳定年单位养老缴费（仅作长期保障参考，不计入收入） */
  employerPensionAnnual: number
  /** 稳定年有效养老缴费基数 */
  effectivePensionBase: number
  effectiveHousingFundBase: number
  /** 稳定年计算明细 */
  breakdown: CalculationItem[]
  /** 首年计算明细 */
  firstBreakdown: CalculationItem[]
}
