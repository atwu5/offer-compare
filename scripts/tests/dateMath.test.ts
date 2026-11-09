import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addYears,
  ageYears,
  diffCalendarDays,
  diffYMD,
  formatYMD,
  isLeapYear,
  nextYearlyOccurrence,
  nthDayDate,
  upcomingDayMilestones,
  type YMD,
} from '../../src/utils/dateMath'

const d = (year: number, month: number, day: number): YMD => ({ year, month, day })

test('自然日差：闰年二月', () => {
  assert.equal(diffCalendarDays(d(2024, 3, 1), d(2024, 2, 28)), 2)
  assert.equal(diffCalendarDays(d(2023, 3, 1), d(2023, 2, 28)), 1)
})

test('自然日差：世纪闰年规则（2000 闰 / 1900 不闰）', () => {
  assert.equal(diffCalendarDays(d(2000, 3, 1), d(2000, 2, 28)), 2)
  assert.equal(diffCalendarDays(d(1900, 3, 1), d(1900, 2, 28)), 1)
})

test('isLeapYear', () => {
  assert.equal(isLeapYear(2024), true)
  assert.equal(isLeapYear(2000), true)
  assert.equal(isLeapYear(1900), false)
  assert.equal(isLeapYear(2023), false)
})

test('addYears：2/29 在非闰年的落点偏好', () => {
  assert.equal(formatYMD(addYears(d(2000, 2, 29), 24)), '2024-02-29')
  assert.equal(formatYMD(addYears(d(2000, 2, 29), 25, 'day28')), '2025-02-28')
  assert.equal(formatYMD(addYears(d(2000, 2, 29), 25, 'mar1')), '2025-03-01')
})

test('diffYMD：跨月借位与日历钳制', () => {
  // 2020-01-31 → 2020-03-01：满 1 个月（钳制到 2/29）后再 1 天
  assert.deepEqual(diffYMD(d(2020, 1, 31), d(2020, 3, 1)), { years: 0, months: 1, days: 1 })
  assert.deepEqual(diffYMD(d(2026, 11, 1), d(2026, 11, 4)), { years: 0, months: 0, days: 3 })
  assert.deepEqual(diffYMD(d(2020, 1, 1), d(2021, 1, 1)), { years: 1, months: 0, days: 0 })
  assert.deepEqual(diffYMD(d(2020, 6, 1), d(2026, 11, 9)), { years: 6, months: 5, days: 8 })
  // 1 月 31 → 2 月 29：不满一个整月，按 29 天
  assert.deepEqual(diffYMD(d(2024, 1, 31), d(2024, 2, 29)), { years: 0, months: 0, days: 29 })
  // 2/29 → 次年 2/28
  assert.deepEqual(diffYMD(d(2020, 2, 29), d(2021, 2, 28)), { years: 0, months: 11, days: 30 })
})

test('nextYearlyOccurrence：普通周年', () => {
  const occ = nextYearlyOccurrence(d(2020, 6, 1), d(2026, 11, 9))
  assert.equal(formatYMD(occ.date), '2027-06-01')
  assert.equal(occ.nth, 7)
  assert.equal(occ.isToday, false)
  assert.equal(occ.daysUntil, diffCalendarDays(d(2027, 6, 1), d(2026, 11, 9)))
})

test('nextYearlyOccurrence：当天就是周年', () => {
  const occ = nextYearlyOccurrence(d(2025, 11, 9), d(2026, 11, 9))
  assert.equal(occ.isToday, true)
  assert.equal(occ.nth, 1)
  assert.equal(occ.daysUntil, 0)
})

test('nextYearlyOccurrence：2/29 生日两种偏好', () => {
  const a = nextYearlyOccurrence(d(2000, 2, 29), d(2026, 11, 9), 'day28')
  assert.equal(formatYMD(a.date), '2027-02-28')
  assert.equal(a.nth, 27)
  const b = nextYearlyOccurrence(d(2000, 2, 29), d(2026, 11, 9), 'mar1')
  assert.equal(formatYMD(b.date), '2027-03-01')
})

test('ageYears：2/29 用户按偏好口径计岁', () => {
  assert.equal(ageYears(d(2000, 2, 29), d(2026, 2, 28), 'day28'), 26)
  assert.equal(ageYears(d(2000, 2, 29), d(2026, 2, 27), 'day28'), 25)
  assert.equal(ageYears(d(1990, 5, 15), d(2026, 11, 9)), 36)
})

test('nthDayDate 与里程碑', () => {
  assert.equal(formatYMD(nthDayDate(d(2026, 11, 1), 1)), '2026-11-01')
  assert.equal(formatYMD(nthDayDate(d(2026, 11, 1), 100)), '2027-02-08')
  const ms = upcomingDayMilestones(d(2026, 11, 1), 3, 3)
  assert.deepEqual(
    ms.map((m) => m.n),
    [100, 200, 300],
  )
  assert.equal(ms[0].daysUntil, 96)
})
