"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBase = resolveBase;
exports.calcInsuranceAnnual = calcInsuranceAnnual;
const money_1 = require("./money");
/**
 * 社保缴费基数解析。
 * 超出政策上下限时不静默截断，而是返回明确的提示文案。
 */
function resolveBase(target, min, max, opts) {
    if (!isFinite(target) || target <= 0)
        return { base: 0 };
    if (!(max > min))
        return { base: target }; // 无有效上下限（如手动模式）
    if (target < min) {
        return {
            base: min,
            notice: opts.source === 'custom'
                ? `你输入 ${(0, money_1.fmtCNY)(target)} 元，低于${opts.label}政策下限，本项实际计费基数按 ${(0, money_1.fmtCNY)(min)} 元计算。`
                : `${opts.label}：工资 ${(0, money_1.fmtCNY)(target)} 元低于政策下限，本项实际计费基数按 ${(0, money_1.fmtCNY)(min)} 元计算。`,
        };
    }
    if (target > max) {
        return {
            base: max,
            notice: opts.source === 'custom'
                ? `你输入 ${(0, money_1.fmtCNY)(target)} 元，根据当地政策，本项实际计费基数按 ${(0, money_1.fmtCNY)(max)} 元计算。`
                : `${opts.label}：工资 ${(0, money_1.fmtCNY)(target)} 元高于政策上限，本项实际计费基数按 ${(0, money_1.fmtCNY)(max)} 元计算。`,
        };
    }
    return { base: target };
}
/**
 * 按月计算某项社保的年度个人 / 单位缴费。
 * monthSalaries：12 个月的当月实际工资（首年含试用期折扣月）；
 * customBase：手动填写的缴费基数（优先于工资）。
 */
function calcInsuranceAnnual(label, policy, monthSalaries, customBase) {
    var _a;
    const notices = [];
    const useCustom = customBase != null && isFinite(customBase) && customBase > 0;
    let annualEmployee = 0;
    let annualEmployer = 0;
    for (const s of monthSalaries) {
        const target = useCustom ? customBase : s;
        const { base, notice } = resolveBase(target, policy.baseMin, policy.baseMax, {
            source: useCustom ? 'custom' : 'salary',
            label,
        });
        if (notice && !notices.includes(notice))
            notices.push(notice);
        annualEmployee += base * policy.employeeRate;
        annualEmployer += base * policy.employerRate;
    }
    const steadyTarget = useCustom ? customBase : (_a = monthSalaries[monthSalaries.length - 1]) !== null && _a !== void 0 ? _a : 0;
    const steady = resolveBase(steadyTarget, policy.baseMin, policy.baseMax, {
        source: useCustom ? 'custom' : 'salary',
        label,
    });
    return {
        annualEmployee: (0, money_1.round2)(annualEmployee),
        annualEmployer: (0, money_1.round2)(annualEmployer),
        steadyBase: steady.base,
        notices,
    };
}
