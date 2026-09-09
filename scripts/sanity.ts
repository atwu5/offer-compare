/**
 * 核心计算引擎自测脚本：npm run sanity
 * 验证个税表、社保基数截断、试用期、差异拆解一致性、谈薪反推单调性等关键逻辑。
 */
import { cityPolicies } from '../src/data/cityPolicies'
import { createDefaultOffers } from '../src/data/defaults'
import {
  buildDiffRows,
  computeOfferResult,
  diffTotal,
} from '../src/utils/offerCalculator'
import { calcAnnualTax } from '../src/utils/incomeTaxCalculator'
import { computeMinSalaryForTarget } from '../src/utils/reverseCalculator'
import { round2 } from '../src/utils/money'

let failed = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`✅ ${name}`)
  } else {
    failed += 1
    console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}
function eq(name: string, actual: number, expected: number, tol = 0.02) {
  check(name, Math.abs(actual - expected) <= tol, `actual=${actual}, expected=${expected}`)
}

/* 1. 个税年度税率表 */
eq('税: 30,000 → 900', calcAnnualTax(30000).tax, 900)
eq('税: 50,000 → 2,480', calcAnnualTax(50000).tax, 2480)
eq('税: 100,000 → 7,480', calcAnnualTax(100000).tax, 7480)
eq('税: 300,000 → 43,080', calcAnnualTax(300000).tax, 43080)
eq('税: 1,000,000 → 268,080', calcAnnualTax(1000000).tax, 268080)
eq('税: 负数 → 0', calcAnnualTax(-5000).tax, 0)

/* 2. 默认 Demo：广州 20k vs 深圳 25k */
const [offerA, offerB] = createDefaultOffers()
const resA = computeOfferResult(offerA, cityPolicies.guangzhou, 'expected')
const resB = computeOfferResult(offerB, cityPolicies.shenzhen, 'expected')

check('A/B 均有效', resA.valid && resB.valid, resA.errors.concat(resB.errors).join(';'))
eq('A 税前年收入 = 280,000', resA.grossAnnualIncome, 280000)
eq('B 税前年收入 = 350,000', resB.grossAnnualIncome, 350000)

// 广州 20k：养老 20000×8%×12=19200；医疗 20000×2%×12=4800；失业 20000×0.2%×12=480；公积金 20000×12%×12=28800
eq('A 养老个人/年 = 19,200', resA.breakdown.find((x) => x.key === 'pension')!.amount, 19200)
eq('A 公积金个人/年 = 28,800', resA.breakdown.find((x) => x.key === 'housingFund')!.amount, 28800)
// A 应纳税所得额 = 280000 − 60000 − (19200+4800+480) − 28800 = 166,720 → 20% − 16920 = 16,424
eq('A 个税 = 16,424', resA.steadyYear.estimatedIncomeTax, 16424)
// A 可支配 = 280000 − 53280 − 16424 = 210,296
eq('A 稳定年可支配 = 210,296', resA.steadyYear.disposableCash, 210296)

// 深圳 25k：养老 24000；医疗 6000；失业 900；公积金 36000 → 个人合计 66900
// 应纳税所得额 = 350000 − 60000 − 66900 = 223,100 → 20% − 16920 = 27,700
eq('B 个税 = 27,700', resB.steadyYear.estimatedIncomeTax, 27700)
// B 可支配 = 350000 − 66900 − 27700 = 255,400
eq('B 稳定年可支配 = 255,400', resB.steadyYear.disposableCash, 255400)

/* 3. 基数超限：深圳 100k 月薪 → 养老基数按上限 34,000 */
const highSalaryOffer = { ...offerB, monthlySalary: 100000 }
const resHigh = computeOfferResult(highSalaryOffer, cityPolicies.shenzhen, 'expected')
eq('深圳 100k → 养老基数按 34,000', resHigh.effectivePensionBase, 34000)
check('超限提示非空', resHigh.notices.some((n) => n.includes('34,000')), resHigh.notices.join(';'))

/* 4. 试用期：B 试用期 6 个月 80% → 首年固定工资 = 25000×6 + 20000×6 = 270,000（不含奖金） */
const probationOffer = { ...offerB, probation: { months: 6, salaryRatio: 0.8 } }
const resProb = computeOfferResult(probationOffer, cityPolicies.shenzhen, 'expected')
eq('试用期首年固定工资 = 270,000', resProb.firstYear.fixedSalary, 270000)
eq('试用期首年税前收入（含奖金）= 320,000', resProb.firstYear.grossIncome, 320000)
eq('稳定年固定工资不受试用期影响 = 300,000', resProb.steadyYear.fixedSalary, 300000)
eq('稳定年税前收入 = 350,000', resProb.steadyYear.grossIncome, 350000)
check('首年可支配 < 稳定年可支配', resProb.firstYear.disposableCash < resProb.steadyYear.disposableCash)

/* 5. 差异拆解一致性：各分项之和 = 总差额 */
const rows = buildDiffRows(resA, resB, 'steady')
const rowSum = round2(rows.reduce((a, r) => a + r.amount, 0))
eq('差异拆解分项之和 = 总差额', rowSum, diffTotal(resA, resB, 'steady'))

/* 6. 补贴规则：签字费只进首年；人才补贴（可能获得）默认不计入 */
const subsidyOffer = {
  ...offerB,
  subsidies: [
    { id: 's1', name: '签字费', amount: 30000, frequency: 'once' as const, duration: 'firstYearOnly' as const, durationYears: 1, certainty: 'confirmed' as const, included: false },
    { id: 's2', name: '人才补贴', amount: 20000, frequency: 'yearly' as const, duration: 'firstYearOnly' as const, durationYears: 1, certainty: 'possible' as const, included: false },
  ],
}
const resSub = computeOfferResult(subsidyOffer, cityPolicies.shenzhen, 'expected')
eq('签字费 30,000 只计入首年补贴', resSub.firstYear.subsidiesTotal, 30000)
eq('稳定年不含一次性补贴', resSub.steadyYear.subsidiesTotal, 0)
const resSubIncluded = computeOfferResult(
  { ...subsidyOffer, subsidies: [{ ...subsidyOffer.subsidies[1], included: true }] },
  cityPolicies.shenzhen,
  'expected',
)
eq('人才补贴勾选后计入首年', resSubIncluded.firstYear.subsidiesTotal, 20000)

/* 7. 场景：浮动奖金 1/2/4 个月 → 三场景可支配现金单调递增 */
const scenarioOffer = {
  ...offerB,
  hasVariableBonus: true,
  variableBonus: {
    conservative: { mode: 'months' as const, value: 1 },
    expected: { mode: 'months' as const, value: 2 },
    optimistic: { mode: 'months' as const, value: 4 },
  },
}
const rc = computeOfferResult(scenarioOffer, cityPolicies.shenzhen, 'conservative')
const re = computeOfferResult(scenarioOffer, cityPolicies.shenzhen, 'expected')
const ro = computeOfferResult(scenarioOffer, cityPolicies.shenzhen, 'optimistic')
check(
  '保守 < 正常 < 乐观',
  rc.steadyYear.disposableCash < re.steadyYear.disposableCash &&
    re.steadyYear.disposableCash < ro.steadyYear.disposableCash,
)

/* 8. 无政策数据（custom 城市未填参数）→ 报错而非套用其他城市 */
const customOffer = { ...offerA, cityCode: 'custom', cityCustomName: '某小城' }
const resCustom = computeOfferResult(customOffer, null, 'expected')
check('custom 城市未填参数时应报错', !resCustom.valid && resCustom.errors.length > 0)

/* 9. 谈薪反推：目标 +10% → 反推月薪重算后实际涨幅 ≥ 10% */
const rev = computeMinSalaryForTarget(offerA, cityPolicies.guangzhou, offerB, cityPolicies.shenzhen, 0.1)
check('反推可达', rev.reachable && rev.minSalary != null)
if (rev.reachable && rev.minSalary != null) {
  const verify = computeOfferResult({ ...offerB, monthlySalary: rev.minSalary }, cityPolicies.shenzhen, 'expected')
  const realRaise = verify.steadyYear.disposableCash / resA.steadyYear.disposableCash - 1
  check(`反推月薪 ${rev.minSalary} 实际涨幅 ≥ 10%`, realRaise >= 0.1 - 1e-6, `real=${realRaise}`)
  const below = computeOfferResult({ ...offerB, monthlySalary: rev.minSalary - 100 }, cityPolicies.shenzhen, 'expected')
  const realBelow = below.steadyYear.disposableCash / resA.steadyYear.disposableCash - 1
  check('低于反推月薪 100 元则达不到 10%', realBelow < 0.1 + 1e-6, `real=${realBelow}`)
}

console.log(failed === 0 ? '\n🎉 全部通过' : `\n💥 ${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
