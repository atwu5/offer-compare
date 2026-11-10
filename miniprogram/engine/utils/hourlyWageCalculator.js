"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcHourlyWage = calcHourlyWage;
exports.reverseMonthlyIncome = reverseMonthlyIncome;
function calcHourlyWage(input) {
    const monthly = input.monthlyIncome;
    if (monthly == null || !Number.isFinite(monthly) || monthly <= 0) {
        return invalidWage('请先填写大于 0 的月收入');
    }
    const daysPerWeek = input.daysPerWeek;
    const hoursPerDay = input.hoursPerDay;
    const weeks = input.paidWeeksPerYear;
    if (!Number.isFinite(daysPerWeek) || daysPerWeek <= 0 || daysPerWeek > 7) {
        return invalidWage('每周工作天数需在 1–7 天之间');
    }
    if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0 || hoursPerDay > 24) {
        return invalidWage('每天工作小时数需大于 0（不超过 24）');
    }
    if (!Number.isFinite(weeks) || weeks <= 0 || weeks > 53) {
        return invalidWage('每年工作周数需在 1–53 之间');
    }
    if (input.useAnnualDays) {
        const d = input.annualWorkDays;
        if (!Number.isFinite(d) || d <= 0 || d > 366) {
            return invalidWage('全年工作天数需在 1–366 天之间');
        }
    }
    const bonus = input.annualBonus != null && Number.isFinite(input.annualBonus) && input.annualBonus > 0 ? input.annualBonus : 0;
    const annualIncome = monthly * 12 + bonus;
    const annualWorkDays = input.useAnnualDays ? input.annualWorkDays : daysPerWeek * weeks;
    const annualHours = annualWorkDays * hoursPerDay;
    if (!(annualHours > 0)) {
        return invalidWage('年工作小时数需大于 0');
    }
    const hourly = annualIncome / annualHours;
    return {
        valid: true,
        annualIncome,
        annualWorkDays,
        annualHours,
        hourly,
        perMinute: hourly / 60,
        perSecond: hourly / 3600,
        perDay: annualWorkDays > 0 ? annualIncome / annualWorkDays : 0,
    };
}
/** 反向计算：期望时薪 + 工作制度 → 对应年收入与月收入 */
function reverseMonthlyIncome(targetHourly, schedule, annualBonus) {
    if (targetHourly == null || !Number.isFinite(targetHourly) || targetHourly <= 0) {
        return { valid: false, error: '请先填写大于 0 的期望时薪', annualIncome: 0, monthlyIncome: 0, annualHours: 0 };
    }
    const daysPerWeek = schedule.daysPerWeek;
    const hoursPerDay = schedule.hoursPerDay;
    if (!Number.isFinite(daysPerWeek) || daysPerWeek <= 0) {
        return { valid: false, error: '每周工作天数需大于 0', annualIncome: 0, monthlyIncome: 0, annualHours: 0 };
    }
    if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
        return { valid: false, error: '每天工作小时数需大于 0', annualIncome: 0, monthlyIncome: 0, annualHours: 0 };
    }
    const annualWorkDays = schedule.useAnnualDays ? schedule.annualWorkDays : daysPerWeek * schedule.paidWeeksPerYear;
    if (!Number.isFinite(annualWorkDays) || annualWorkDays <= 0) {
        return { valid: false, error: '全年工作天数需大于 0', annualIncome: 0, monthlyIncome: 0, annualHours: 0 };
    }
    const annualHours = annualWorkDays * hoursPerDay;
    const annualIncome = targetHourly * annualHours;
    const bonus = Number.isFinite(annualBonus) && annualBonus > 0 ? annualBonus : 0;
    const monthlyIncome = (annualIncome - bonus) / 12;
    if (monthlyIncome < 0) {
        return { valid: false, error: '年度奖金高于目标年收入，请检查奖金填写', annualIncome, monthlyIncome: 0, annualHours };
    }
    return { valid: true, annualIncome, monthlyIncome, annualHours };
}
function invalidWage(error) {
    return { valid: false, error, annualIncome: 0, annualWorkDays: 0, annualHours: 0, hourly: 0, perMinute: 0, perSecond: 0, perDay: 0 };
}
