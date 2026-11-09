import test from 'node:test'
import assert from 'node:assert/strict'
import { diffCalendarDays, formatYMD } from '../../src/utils/dateMath'
import { calcRetirement } from '../../src/utils/retirementCalculator'

const today = { year: 2026, month: 11, day: 9 }

test('基础：出生 + 自定义退休年龄 → 真实日历退休日', () => {
  const r = calcRetirement({ birth: '1990-05-15', retireAge: 60 }, today)
  assert.equal(r.valid, true)
  assert.equal(formatYMD(r.retireDate), '2050-05-15')
  assert.equal(r.daysUntil, diffCalendarDays({ year: 2050, month: 5, day: 15 }, today))
  assert.equal(r.exceeded, false)
  assert.ok(r.progressPct > 55 && r.progressPct < 65)
})

test('明天退休 / 今天退休 / 已退休', () => {
  const tomorrow = calcRetirement({ birth: '1966-11-10', retireAge: 60 }, today)
  assert.equal(tomorrow.daysUntil, 1)
  const todayRetire = calcRetirement({ birth: '1966-11-09', retireAge: 60 }, today)
  assert.equal(todayRetire.daysUntil, 0)
  assert.equal(todayRetire.exceeded, false)
  const past = calcRetirement({ birth: '1956-11-08', retireAge: 60 }, today)
  assert.equal(past.exceeded, true)
  assert.equal(past.daysPast, diffCalendarDays(today, { year: 2016, month: 11, day: 8 }))
})

test('2/29 出生：闰年保持 2/29，非闰年按 2/28 落点', () => {
  // 2060 是闰年 → 2/29 真实存在
  const leap = calcRetirement({ birth: '2000-02-29', retireAge: 60 }, today)
  assert.equal(formatYMD(leap.retireDate), '2060-02-29')
  // 2061 非闰年 → 按约定落到 2/28
  const nonLeap = calcRetirement({ birth: '2000-02-29', retireAge: 61 }, today)
  assert.equal(formatYMD(nonLeap.retireDate), '2061-02-28')
})

test('非法输入', () => {
  assert.equal(calcRetirement({ birth: '2026-11-10', retireAge: 60 }, today).valid, false)
  assert.equal(calcRetirement({ birth: '1990-05-15', retireAge: 0 }, today).valid, false)
  assert.equal(calcRetirement({ birth: '1990-05-15', retireAge: 101 }, today).valid, false)
  assert.equal(calcRetirement({ birth: 'bad-date', retireAge: 60 }, today).valid, false)
})
