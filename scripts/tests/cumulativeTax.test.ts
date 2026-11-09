import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calcAnnualComprehensiveTax,
  calcBonusTaxSeparate,
  compareBonusMethods,
  projectTwelveMonths,
  simulateWithholding,
  type MonthTaxInput,
} from '../../src/utils/cumulativeTaxCalculator'

const m = (month: number, salary: number, si = 0, hf = 0, special = 0, other = 0): MonthTaxInput => ({
  month,
  salary,
  socialInsurance: si,
  housingFund: hf,
  specialDeduction: special,
  otherDeduction: other,
})

test('年度综合所得税额：税率表边界', () => {
  assert.equal(calcAnnualComprehensiveTax(36000), 1080)
  assert.equal(calcAnnualComprehensiveTax(144000), 11880)
  assert.equal(calcAnnualComprehensiveTax(300000), 43080)
  assert.equal(calcAnnualComprehensiveTax(960000), 250080)
  assert.equal(calcAnnualComprehensiveTax(960001), 250080.45)
  assert.equal(calcAnnualComprehensiveTax(0), 0)
  assert.equal(calcAnnualComprehensiveTax(-5000), 0)
})

test('累计预扣：月薪 1 万无扣除的经典曲线', () => {
  const res = simulateWithholding(Array.from({ length: 12 }, (_, i) => m(i + 1, 10000)))
  // 第 1 月：累计 5000 → 3% = 150
  assert.equal(res.rows[0].taxWithheld, 150)
  assert.equal(res.rows[0].netSalary, 9850)
  // 第 8 月：累计 40000 → 40000×10%−2520 = 1480，减去已预扣 1050 → 430
  assert.equal(res.rows[7].cumulativeTaxable, 40000)
  assert.equal(res.rows[7].taxWithheld, 430)
  assert.equal(res.rows[7].netSalary, 9570)
  // 第 12 月：累计 60000 → 3480，当月 500
  assert.equal(res.rows[11].taxWithheld, 500)
  assert.equal(res.totals.tax, 3480)
  assert.equal(res.annual.tax, 3480)
  assert.equal(res.annual.net, 120000 - 3480)
})

test('累计预扣：年初低收入为负、后续补回，当月税不为负', () => {
  const res = simulateWithholding([m(1, 3000), m(2, 20000)])
  assert.equal(res.rows[0].cumulativeTaxable, -2000)
  assert.equal(res.rows[0].taxWithheld, 0)
  assert.equal(res.rows[0].netSalary, 3000)
  // 第 2 月累计 13000 → 390
  assert.equal(res.rows[1].cumulativeTaxable, 13000)
  assert.equal(res.rows[1].taxWithheld, 390)
  assert.equal(res.rows[1].netSalary, 19610)
})

test('外推：剩余月份重复最近已填月份', () => {
  const projected = projectTwelveMonths([m(1, 8000, 500, 600, 1000)])
  assert.equal(projected.length, 12)
  assert.equal(projected[11].salary, 8000)
  assert.equal(projected[11].specialDeduction, 1000)
  const res = simulateWithholding([m(1, 8000)])
  assert.equal(res.annual.income, 96000)
})

test('年终奖单独计税：查月度税率表（与累计预扣表不同）', () => {
  // 36000 ÷ 12 = 3000 → 3%
  assert.equal(calcBonusTaxSeparate(36000), 1080)
  // 144000 ÷ 12 = 12000 → 10% − 210
  assert.equal(calcBonusTaxSeparate(144000), 14190)
  // 36001 ÷ 12 ≈ 3000.83 → 落入 10% 档
  assert.equal(calcBonusTaxSeparate(36001), 3390.1)
  assert.equal(calcBonusTaxSeparate(0), 0)
})

test('年终奖两种方式对比：本例单独计税省 2520', () => {
  const cmp = compareBonusMethods(3480, 60000, 36000)
  assert.equal(cmp.bonusTaxSeparate, 1080)
  // 并入后：96000 → 7080；工资单独 60000 → 3480；增量 3600
  assert.equal(cmp.bonusTaxCombined, 3600)
  assert.equal(cmp.annualTaxWithSeparate, 4560)
  assert.equal(cmp.annualTaxWithCombined, 7080)
  assert.equal(cmp.savingIfSeparate, 2520)
})

test('扣除项会降低累计应纳税所得额', () => {
  const withDeduction = simulateWithholding([m(1, 20000, 2000, 2400, 1500, 300)])
  // 20000 − 5000 − 2000 − 2400 − 1500 − 300 = 8800 → 3% = 264
  assert.equal(withDeduction.rows[0].cumulativeTaxable, 8800)
  assert.equal(withDeduction.rows[0].taxWithheld, 264)
})
