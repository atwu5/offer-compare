/**
 * 工具箱引擎副本自测（小程序分支）：验证从 main 拷贝的计算模块在本分支行为一致。
 * 运行：npm run mini:sanity:toolbox
 */
import { diffCalendarDays, addYears, diffYMD, formatYMD, ageYears } from '../miniprogram-src/engine/utils/dateMath'
import { simulateWithholding, compareBonusMethods, calcBonusTaxSeparate, calcAnnualComprehensiveTax } from '../miniprogram-src/engine/utils/cumulativeTaxCalculator'
import { calcDaysAlive } from '../miniprogram-src/engine/utils/daysAliveCalculator'
import { buildAnniversaryView } from '../miniprogram-src/engine/utils/anniversaryCalculator'
import { calcRetirement } from '../miniprogram-src/engine/utils/retirementCalculator'
import { calcHourlyWage, reverseMonthlyIncome } from '../miniprogram-src/engine/utils/hourlyWageCalculator'

let failed = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`✅ ${name}`)
  else {
    failed += 1
    console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}
function near(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(a - b) <= tol
}

/* 日期 */
check('闰年自然日差 2 天', diffCalendarDays({ year: 2024, month: 3, day: 1 }, { year: 2024, month: 2, day: 28 }) === 2)
check('addYears 2/29 非闰年落 2/28', formatYMD(addYears({ year: 2000, month: 2, day: 29 }, 25, 'day28')) === '2025-02-28')
check('diffYMD 月末锚点（1/31→3/1 = 1月1天）', (() => { const r = diffYMD({ year: 2020, month: 1, day: 31 }, { year: 2020, month: 3, day: 1 }); return r.years === 0 && r.months === 1 && r.days === 1 })())
check('ageYears 2/29 偏好口径', ageYears({ year: 2000, month: 2, day: 29 }, { year: 2026, month: 2, day: 28 }, 'day28') === 26)

/* 个税：经典曲线 */
const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, salary: 10000, socialInsurance: 0, housingFund: 0, specialDeduction: 0, otherDeduction: 0 }))
const tax = simulateWithholding(months)
check('累计预扣 第1月 150', tax.rows[0].taxWithheld === 150)
check('累计预扣 第8月 430', tax.rows[7].taxWithheld === 430)
check('累计预扣 全年 3480', near(tax.annual.tax, 3480))
check('年度税率表边界 960001', near(calcAnnualComprehensiveTax(960001), 250080.45))
check('年终奖单独计税 36000 → 1080', near(calcBonusTaxSeparate(36000), 1080))
const cmp = compareBonusMethods(3480, 60000, 36000)
check('年终奖两方式差额 2520', near(cmp.savingIfSeparate, 2520))

/* 出生天数（需求书示例） */
const days = calcDaysAlive({ birth: '2026-11-01', birthTime: '', leapPref: 'day28' }, { year: 2026, month: 11, day: 4 }, 0)
check('出生天数 3 天', days.valid && days.daysElapsed === 3 && days.dayOrdinal === 4)

/* 纪念日：当天就是周年 */
const anniv = buildAnniversaryView({ id: 'a', name: 'x', date: '2025-11-09', repeatYearly: true, leapPref: 'day28', createdAt: 0 }, { year: 2026, month: 11, day: 9 })
check('纪念日就是今天', anniv.valid && anniv.nextOccurrence?.isToday === true && anniv.nextOccurrence.nth === 1)

/* 退休：闰年与非闰年落点 */
const r1 = calcRetirement({ birth: '2000-02-29', retireAge: 60 }, { year: 2026, month: 11, day: 9 })
const r2 = calcRetirement({ birth: '2000-02-29', retireAge: 61 }, { year: 2026, month: 11, day: 9 })
check('退休日 2060-02-29 / 2061-02-28', formatYMD(r1.retireDate) === '2060-02-29' && formatYMD(r2.retireDate) === '2061-02-28')

/* 时薪 */
const wage = calcHourlyWage({ monthlyIncome: 20000, annualBonus: 24000, daysPerWeek: 5, hoursPerDay: 8, paidWeeksPerYear: 52, useAnnualDays: false, annualWorkDays: 250, basis: 'gross' })
check('时薪 126.92', near(wage.hourly, 126.92, 0.005))
check('秒薪 > 0', wage.perSecond > 0.035 && wage.perSecond < 0.036)
const rev = reverseMonthlyIncome(200, { daysPerWeek: 5, hoursPerDay: 8, paidWeeksPerYear: 52, useAnnualDays: false, annualWorkDays: 250 }, 0)
check('反向月薪 34666.67', near(rev.monthlyIncome, 34666.67, 0.005))

console.log(failed === 0 ? '\n🎉 工具箱引擎副本自测全部通过' : `\n💥 ${failed} 项失败`)
