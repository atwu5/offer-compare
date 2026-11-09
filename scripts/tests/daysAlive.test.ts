import test from 'node:test'
import assert from 'node:assert/strict'
import { formatYMD } from '../../src/utils/dateMath'
import { calcDaysAlive } from '../../src/utils/daysAliveCalculator'

const today = { year: 2026, month: 11, day: 9 }
const nowMs = new Date(2026, 10, 9, 20, 45).getTime()

test('需求书示例：11-01 出生，11-04 查询 → 3 天', () => {
  const r = calcDaysAlive({ birth: '2026-11-01', birthTime: '', leapPref: 'day28' }, { year: 2026, month: 11, day: 4 }, nowMs)
  assert.equal(r.valid, true)
  assert.equal(r.daysElapsed, 3)
  assert.equal(r.dayOrdinal, 4)
  assert.equal(r.age, 0)
  assert.equal(r.weeks, 0)
})

test('当天出生：0 天，即第 1 天', () => {
  const r = calcDaysAlive({ birth: '2026-11-04', birthTime: '', leapPref: 'day28' }, { year: 2026, month: 11, day: 4 }, nowMs)
  assert.equal(r.daysElapsed, 0)
  assert.equal(r.dayOrdinal, 1)
  assert.equal(r.nextBirthday.isToday, true)
})

test('出生日期晚于今天 → 报错', () => {
  const r = calcDaysAlive({ birth: '2026-11-05', birthTime: '', leapPref: 'day28' }, { year: 2026, month: 11, day: 4 }, nowMs)
  assert.equal(r.valid, false)
  assert.match(r.error ?? '', /不能晚于今天/)
})

test('非法日期 → 报错（含 2 月 30 日）', () => {
  const r1 = calcDaysAlive({ birth: '2026-02-30', birthTime: '', leapPref: 'day28' }, today, nowMs)
  assert.equal(r1.valid, false)
  const r2 = calcDaysAlive({ birth: 'abc', birthTime: '', leapPref: 'day28' }, today, nowMs)
  assert.equal(r2.valid, false)
})

test('2/29 出生：两种生日偏好', () => {
  const a = calcDaysAlive({ birth: '2000-02-29', birthTime: '', leapPref: 'day28' }, today, nowMs)
  assert.equal(a.age, 26)
  assert.equal(formatYMD(a.nextBirthday.date), '2027-02-28')
  const b = calcDaysAlive({ birth: '2000-02-29', birthTime: '', leapPref: 'mar1' }, today, nowMs)
  assert.equal(formatYMD(b.nextBirthday.date), '2027-03-01')
})

test('填写出生时间：按真实时间差给小时/分钟', () => {
  const birthMs = new Date(1990, 5, 15, 8, 30).getTime()
  const expectedMinutes = Math.floor((nowMs - birthMs) / 60000)
  const expectedHours = Math.floor((nowMs - birthMs) / 3600000)
  const r = calcDaysAlive({ birth: '1990-06-15', birthTime: '08:30', leapPref: 'day28' }, today, nowMs)
  assert.equal(r.hoursAlive, expectedHours)
  assert.equal(r.minutesAlive, expectedMinutes)
  assert.equal(r.minutesAlive >= (r.hoursAlive ?? 0) * 60, true)
})

test('里程碑：给出接下来的节点', () => {
  const r = calcDaysAlive({ birth: '2026-11-01', birthTime: '', leapPref: 'day28' }, { year: 2026, month: 11, day: 4 }, nowMs)
  assert.equal(r.milestones[0].n, 100)
  assert.equal(r.milestones[0].daysUntil, 96)
})
