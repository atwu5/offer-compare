"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcHousingFundAnnual = calcHousingFundAnnual;
const money_1 = require("./money");
const socialInsuranceCalculator_1 = require("./socialInsuranceCalculator");
/**
 * 住房公积金年度计算。
 * 个人与单位缴纳均进入个人公积金账户。
 * 比例超出当地允许区间时按区间边界计算并给出提示。
 */
function calcHousingFundAnnual(policy, monthSalaries, customBase, customEmployeeRate, customEmployerRate) {
    var _a;
    const notices = [];
    const rawEmployeeRate = customEmployeeRate != null && isFinite(customEmployeeRate) && customEmployeeRate > 0
        ? customEmployeeRate
        : policy.employeeRateDefault;
    const rawEmployerRate = customEmployerRate != null && isFinite(customEmployerRate) && customEmployerRate > 0
        ? customEmployerRate
        : policy.employerRateDefault;
    const clampRate = (r, which) => {
        if (policy.rateMax > policy.rateMin && (r < policy.rateMin || r > policy.rateMax)) {
            const c = (0, money_1.clamp)(r, policy.rateMin, policy.rateMax);
            notices.push(`公积金${which}比例 ${(0, money_1.rateLabel)(r)} 超出当地允许区间（${(0, money_1.rateLabel)(policy.rateMin)}～${(0, money_1.rateLabel)(policy.rateMax)}），按 ${(0, money_1.rateLabel)(c)} 计算。`);
            return c;
        }
        return r;
    };
    const employeeRate = clampRate(rawEmployeeRate, '个人');
    const employerRate = clampRate(rawEmployerRate, '单位');
    const useCustom = customBase != null && isFinite(customBase) && customBase > 0;
    let annualEmployee = 0;
    let annualEmployer = 0;
    for (const s of monthSalaries) {
        const target = useCustom ? customBase : s;
        const { base, notice } = (0, socialInsuranceCalculator_1.resolveBase)(target, policy.baseMin, policy.baseMax, {
            source: useCustom ? 'custom' : 'salary',
            label: '公积金',
        });
        if (notice && !notices.includes(notice))
            notices.push(notice);
        annualEmployee += base * employeeRate;
        annualEmployer += base * employerRate;
    }
    const steadyTarget = useCustom ? customBase : (_a = monthSalaries[monthSalaries.length - 1]) !== null && _a !== void 0 ? _a : 0;
    const steady = (0, socialInsuranceCalculator_1.resolveBase)(steadyTarget, policy.baseMin, policy.baseMax, {
        source: useCustom ? 'custom' : 'salary',
        label: '公积金',
    });
    return {
        annualEmployee: (0, money_1.round2)(annualEmployee),
        annualEmployer: (0, money_1.round2)(annualEmployer),
        steadyBase: steady.base,
        employeeRate,
        employerRate,
        notices,
    };
}
