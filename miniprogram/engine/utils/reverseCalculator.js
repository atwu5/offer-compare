"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMinSalaryForTarget = computeMinSalaryForTarget;
const offerCalculator_1 = require("./offerCalculator");
const money_1 = require("./money");
/**
 * 谈薪反推：假设城市、奖金结构、补贴、生活成本与五险一金规则不变，
 * 用二分法求 Offer B 月薪至少多少，才能使「稳定年可支配现金」相对 Offer A 提升 targetPct。
 */
function computeMinSalaryForTarget(offerA, policyA, offerB, policyB, targetPct) {
    var _a;
    const base = (0, offerCalculator_1.computeOfferResult)(offerA, policyA, 'expected');
    const current = (0, offerCalculator_1.computeOfferResult)(offerB, policyB, 'expected');
    const baseDisposable = base.steadyYear.disposableCash;
    const currentReal = baseDisposable > 0 ? current.steadyYear.disposableCash / baseDisposable - 1 : NaN;
    if (!base.valid || !current.valid || baseDisposable <= 0) {
        return { reachable: false, currentReal, target: targetPct, baseDisposable };
    }
    const targetCash = baseDisposable * (1 + targetPct);
    const f = (salary) => (0, offerCalculator_1.computeOfferResult)({ ...offerB, monthlySalary: salary }, policyB, 'expected').steadyYear
        .disposableCash;
    // 可支配现金关于月薪单调递增（社保公积金有上限封顶，个税边际税率 < 100%），可用二分法
    let lo = 0;
    let hi = Math.max(((_a = offerB.monthlySalary) !== null && _a !== void 0 ? _a : 0) * 20, 500000);
    if (f(hi) < targetCash) {
        return { reachable: false, currentReal, target: targetPct, baseDisposable };
    }
    for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < targetCash)
            lo = mid;
        else
            hi = mid;
    }
    const minSalary = Math.ceil(hi / 100) * 100;
    return { reachable: true, minSalary, currentReal: (0, money_1.round2)(currentReal), target: targetPct, baseDisposable };
}
