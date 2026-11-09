import test from 'node:test'
import assert from 'node:assert/strict'
import { diffCalendarDays, formatYMD, type YMD } from '../../src/utils/dateMath'
import { buildAnniversaryView, pickNextUpcoming, type AnniversaryRecord } from '../../src/utils/anniversaryCalculator'

const today: YMD = { year: 2026, month: 11, day: 9 }

const rec = (over: Partial<AnniversaryRecord>): AnniversaryRecord => ({
  id: 'r1',
  name: '恋爱纪念日',
  date: '2020-06-01',
  repeatYearly: true,
  leapPref: 'day28',
  createdAt: 0,
  ...over,
})

test('每年重复：经过天数 / 年月日 / 下一个周年', () => {
  const v = buildAnniversaryView(rec({}), today)
  const elapsed = diffCalendarDays(today, { year: 2020, month: 6, day: 1 })
  assert.equal(v.valid, true)
  assert.equal(v.elapsedDays, elapsed)
  assert.deepEqual(v.ymd, { years: 6, months: 5, days: 8 })
  assert.equal(v.dayOrdinal, elapsed + 1)
  assert.equal(formatYMD(v.nextOccurrence!.date), '2027-06-01')
  assert.equal(v.nextOccurrence!.nth, 7)
  assert.equal(v.nextOccurrence!.daysUntil, diffCalendarDays({ year: 2027, month: 6, day: 1 }, today))
})

test('当天就是周年：显示「就是今天」口径', () => {
  const v = buildAnniversaryView(rec({ date: '2025-11-09' }), today)
  assert.equal(v.elapsedDays, 365)
  assert.equal(v.nextOccurrence!.isToday, true)
  assert.equal(v.nextOccurrence!.nth, 1)
  assert.equal(v.nextOccurrence!.daysUntil, 0)
})

test('未来日期 + 不重复：纯倒计时', () => {
  const v = buildAnniversaryView(rec({ date: '2026-12-01', repeatYearly: false }), today)
  assert.equal(v.isFuture, true)
  assert.equal(v.ymd, null)
  assert.equal(v.nextOccurrence!.daysUntil, diffCalendarDays({ year: 2026, month: 12, day: 1 }, today))
  assert.equal(v.nextOccurrence!.nth, 0)
  assert.equal(v.milestones.length, 0)
})

test('过去日期 + 不重复：经过天数与里程碑', () => {
  const v = buildAnniversaryView(rec({ date: '2020-01-15', repeatYearly: false }), today)
  assert.equal(v.isFuture, false)
  assert.equal(v.elapsedDays, diffCalendarDays(today, { year: 2020, month: 1, day: 15 }))
  assert.equal(v.nextOccurrence, null)
  assert.ok(v.milestones.length > 0)
})

test('2/29 纪念日：按偏好落到 2/28 或 3/1', () => {
  const a = buildAnniversaryView(rec({ date: '2020-02-29', leapPref: 'day28' }), today)
  assert.equal(formatYMD(a.nextOccurrence!.date), '2027-02-28')
  const b = buildAnniversaryView(rec({ date: '2020-02-29', leapPref: 'mar1' }), today)
  assert.equal(formatYMD(b.nextOccurrence!.date), '2027-03-01')
})

test('非法日期 → 报错视图', () => {
  const v = buildAnniversaryView(rec({ date: '2026-13-01' }), today)
  assert.equal(v.valid, false)
  assert.match(v.error ?? '', /日期/)
})

test('pickNextUpcoming：取最近的下一个节点', () => {
  const views = [
    buildAnniversaryView(rec({ id: 'a', date: '2020-01-01' }), today),
    buildAnniversaryView(rec({ id: 'b', date: '2025-11-09' }), today),
  ]
  const next = pickNextUpcoming(views)
  assert.equal(next!.record.id, 'b')
})
