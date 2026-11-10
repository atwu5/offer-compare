"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcDaysAlive = calcDaysAlive;
/**
 * 出生天数计算（纯函数，零 DOM 依赖）。
 * 口径统一约定：
 *  - 「已经出生 N 天」= 今天 − 出生日的自然日差（出生当天为 0 天）；
 *  - 「第 N 天」= 来到世界的第 N 个自然日 = 出生日 + (N−1) 天（出生当天是第 1 天）。
 */
const dateMath_1 = require("./dateMath");
function calcDaysAlive(input, today, nowMs) {
    var _a;
    const birth = (0, dateMath_1.parseYMD)(input.birth);
    if (!birth) {
        return invalid(input.birth, today, '请填写正确的出生日期');
    }
    if ((0, dateMath_1.diffCalendarDays)(birth, today) > 0) {
        return invalid(input.birth, today, '出生日期不能晚于今天');
    }
    const daysElapsed = (0, dateMath_1.diffCalendarDays)(today, birth);
    const age = (0, dateMath_1.ageYears)(birth, today, input.leapPref);
    const ageYMD = (0, dateMath_1.diffYMD)(birth, today);
    const occ = (0, dateMath_1.nextYearlyOccurrence)(birth, today, input.leapPref);
    const nextBirthday = {
        date: occ.date,
        daysUntil: occ.daysUntil,
        turning: occ.isToday ? age : occ.nth,
        isToday: occ.isToday,
    };
    const result = {
        valid: true,
        birth,
        daysElapsed,
        dayOrdinal: daysElapsed + 1,
        age,
        ageYMD,
        weeks: Math.floor(daysElapsed / 7),
        nextBirthday,
        milestones: (0, dateMath_1.upcomingDayMilestones)(birth, daysElapsed, 3),
    };
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(String((_a = input.birthTime) !== null && _a !== void 0 ? _a : '').trim());
    if (timeMatch) {
        const hh = Number(timeMatch[1]);
        const mm = Number(timeMatch[2]);
        if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
            const birthMs = new Date(birth.year, birth.month - 1, birth.day, hh, mm).getTime();
            const aliveMs = nowMs - birthMs;
            if (aliveMs >= 0) {
                result.hoursAlive = Math.floor(aliveMs / 3600000);
                result.minutesAlive = Math.floor(aliveMs / 60000);
            }
        }
    }
    return result;
}
function invalid(birth, today, error) {
    var _a;
    return {
        valid: false,
        error,
        birth: (_a = (0, dateMath_1.parseYMD)(birth)) !== null && _a !== void 0 ? _a : today,
        daysElapsed: 0,
        dayOrdinal: 0,
        age: 0,
        ageYMD: { years: 0, months: 0, days: 0 },
        weeks: 0,
        nextBirthday: { date: today, daysUntil: 0, turning: 0, isToday: false },
        milestones: [],
    };
}
