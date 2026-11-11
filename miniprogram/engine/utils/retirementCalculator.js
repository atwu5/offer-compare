"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcRetirement = calcRetirement;
/**
 * 退休倒计时（纯函数，零 DOM 依赖）。
 *
 * 当前只开放「自定义退休年龄」模式（可准确计算）；
 * 「按中国大陆法定退休年龄估算」涉及渐进式延迟退休的复杂规则，在取得可验证的政策数据前标记为待完善，不开放。
 */
const dateMath_1 = require("./dateMath");
function calcRetirement(input, today) {
    const birth = (0, dateMath_1.parseYMD)(input.birth);
    if (!birth) {
        return invalid(today, '请填写正确的出生日期');
    }
    const age = Math.round(input.retireAge);
    if (!Number.isFinite(age) || age < 1 || age > 100) {
        return invalid(today, '退休年龄需在 1–100 岁之间');
    }
    if ((0, dateMath_1.diffCalendarDays)(birth, today) > 0) {
        return invalid(today, '出生日期不能晚于今天');
    }
    // 2/29 出生的用户按 2/28 落点计算（工具内统一约定，页面有说明）
    const retireDate = (0, dateMath_1.addYears)(birth, age, 'day28');
    const totalSpanDays = (0, dateMath_1.diffCalendarDays)(retireDate, birth);
    const elapsed = (0, dateMath_1.diffCalendarDays)(today, birth);
    const daysUntil = (0, dateMath_1.diffCalendarDays)(retireDate, today);
    const exceeded = daysUntil < 0;
    return {
        valid: true,
        birth,
        retireDate,
        daysUntil,
        ymd: exceeded ? (0, dateMath_1.diffYMD)(retireDate, today) : (0, dateMath_1.diffYMD)(today, retireDate),
        progressPct: totalSpanDays > 0 ? Math.min(100, Math.max(0, (elapsed / totalSpanDays) * 100)) : 100,
        exceeded,
        daysPast: exceeded ? -daysUntil : 0,
    };
}
function invalid(today, error) {
    return {
        valid: false,
        error,
        birth: today,
        retireDate: today,
        daysUntil: 0,
        ymd: { years: 0, months: 0, days: 0 },
        progressPct: 0,
        exceeded: false,
        daysPast: 0,
    };
}
