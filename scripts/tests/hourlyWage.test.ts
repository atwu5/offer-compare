import test from 'node:test'
import assert from 'node:assert/strict'
import { calcHourlyWage, reverseMonthlyIncome, type WageInput } from '../../src/utils/hourlyWageCalculator'

const base: WageInput = {
  monthlyIncome: 20000,
  annualBonus: 24000,
  daysPerWeek: 5,
  hoursPerDay: 8,
  paidWeeksPerYear: 52,
  useAnnualDays: false,
  annualWorkDays: 250,
  basis: 'gross',
}

test('标准口径：年收入 / 年工时 / 时分秒', () => {
  const r = calcHourlyWage(base)
  assert.equal(r.valid, true)
  assert.equal(r.annualIncome, 264000)
  assert.equal(r.annualWorkDays, 260)
  assert.equal(r.annualHours, 2080)
  assert.equal(Math.round(r.hourly * 100) / 100, 126.92)
  assert.equal(Math.round(r.perMinute * 100) / 100, 2.12)
  // 秒薪必须显著大于 0（避免显示 0.00）
  assert.ok(r.perSecond > 0.035 && r.perSecond < 0.036)
  assert.equal(Math.round(r.perDay * 100) / 100, 1015.38)
})

test('按全年工作天数口径', () => {
  const r = calcHourlyWage({ ...base, useAnnualDays: true, annualWorkDays: 250 })
  assert.equal(r.annualHours, 2000)
  assert.equal(r.hourly, 132)
})

test('非法输入不产生 NaN/Infinity', () => {
  assert.equal(calcHourlyWage({ ...base, monthlyIncome: null }).valid, false)
  assert.equal(calcHourlyWage({ ...base, monthlyIncome: 0 }).valid, false)
  assert.equal(calcHourlyWage({ ...base, hoursPerDay: 0 }).valid, false)
  assert.equal(calcHourlyWage({ ...base, daysPerWeek: 8 }).valid, false)
  assert.equal(calcHourlyWage({ ...base, useAnnualDays: true, annualWorkDays: 0 }).valid, false)
})

test('反向计算：期望时薪 → 月收入', () => {
  const r = reverseMonthlyIncome(200, base, 0)
  assert.equal(r.valid, true)
  assert.equal(r.annualHours, 2080)
  assert.equal(r.annualIncome, 416000)
  assert.equal(Math.round(r.monthlyIncome * 100) / 100, 34666.67)
  const withBonus = reverseMonthlyIncome(200, base, 24000)
  assert.equal(Math.round(withBonus.monthlyIncome * 100) / 100, 32666.67)
})

test('反向计算守卫：奖金高于目标年收入 → 报错', () => {
  const r = reverseMonthlyIncome(100, base, 500000)
  assert.equal(r.valid, false)
  assert.match(r.error ?? '', /奖金/)
  assert.equal(reverseMonthlyIncome(0, base, 0).valid, false)
})
