"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcAnnualComprehensiveTax = calcAnnualComprehensiveTax;
exports.calcBonusTaxSeparate = calcBonusTaxSeparate;
exports.simulateWithholding = simulateWithholding;
exports.projectTwelveMonths = projectTwelveMonths;
exports.compareBonusMethods = compareBonusMethods;
/**
 * 居民个人工资薪金个税：累计预扣法（纯函数，零 DOM 依赖）。
 *
 * 内部全部用「分」做整数运算，避免浮点误差；对外输出以「元」为单位（最多两位小数）。
 * 公式（口径：个人所得税累计预扣预缴）：
 *   累计应预扣预缴应纳税所得额 = 累计收入 − 累计基本减除费用(5000×月数) − 累计个人社保公积金 − 累计专项附加扣除 − 累计其他依法扣除
 *   本期应预扣预缴税额 = (累计应纳税所得额 × 预扣率 − 速算扣除数) − 累计已预扣税额
 *   本期结果 < 0 时按 0 处理，负值差额不作为当月退税（按适用规则后续处理）。
 */
const taxPolicy_1 = require("../config/taxPolicy");
const toFen = (yuan) => Math.round(yuan * 100);
const toYuan = (fen) => fen / 100;
function bracketTaxFen(taxableFen, brackets) {
    if (taxableFen <= 0)
        return 0;
    const yuan = taxableFen / 100;
    for (const b of brackets) {
        if (yuan <= b.upper) {
            return Math.max(0, Math.round(taxableFen * b.rate) - toFen(b.quickDeduction));
        }
    }
    return 0;
}
/** 年度综合所得应纳税额（元）——用于「并入综合所得」口径的全年汇算模拟 */
function calcAnnualComprehensiveTax(annualTaxableYuan) {
    return toYuan(bracketTaxFen(toFen(annualTaxableYuan), taxPolicy_1.CUMULATIVE_BRACKETS));
}
/** 全年一次性奖金单独计税应纳税额（元）：奖金 ÷ 12 查月度税率表，按奖金全额计算 */
function calcBonusTaxSeparate(bonusYuan) {
    if (!(bonusYuan > 0))
        return 0;
    const perMonthYuan = bonusYuan / 12;
    let rate = 0;
    let quickDeduction = 0;
    for (const b of taxPolicy_1.MONTHLY_BONUS_BRACKETS) {
        if (perMonthYuan <= b.upper) {
            rate = b.rate;
            quickDeduction = b.quickDeduction;
            break;
        }
    }
    return Math.max(0, Math.round(toFen(bonusYuan) * rate) / 100 - quickDeduction);
}
function rowOf(input, cumTaxableRawFen, paidFen) {
    const cumForTax = Math.max(0, cumTaxableRawFen);
    const taxCumFen = bracketTaxFen(cumForTax, taxPolicy_1.CUMULATIVE_BRACKETS);
    const taxFen = Math.max(0, taxCumFen - paidFen);
    const salaryF = toFen(input.salary);
    const siF = toFen(input.socialInsurance);
    const hfF = toFen(input.housingFund);
    const row = Object.assign(Object.assign({}, input), { cumulativeTaxable: toYuan(cumTaxableRawFen), taxCumulative: toYuan(taxCumFen), taxWithheld: toYuan(taxFen), netSalary: toYuan(salaryF - siF - hfF - taxFen) });
    return { row, taxFen };
}
/** 累计预扣法模拟：months 为按月序号升序的已填月份（1..M）；返回逐月明细、累计与全年推算 */
function simulateWithholding(months) {
    const ordered = [...months].sort((a, b) => a.month - b.month);
    const rows = [];
    let cumTaxableRawFen = 0;
    let paidFen = 0;
    for (const m of ordered) {
        const taxableFen = toFen(m.salary) -
            toFen(taxPolicy_1.BASIC_DEDUCTION_MONTHLY) -
            toFen(m.socialInsurance) -
            toFen(m.housingFund) -
            toFen(m.specialDeduction) -
            toFen(m.otherDeduction);
        cumTaxableRawFen += taxableFen;
        const { row, taxFen } = rowOf(m, cumTaxableRawFen, paidFen);
        paidFen += taxFen;
        rows.push(row);
    }
    // 已填月份累计
    const totals = {
        income: rows.reduce((s, r) => s + r.salary, 0),
        tax: toYuan(paidFen),
        net: rows.reduce((s, r) => s + r.netSalary, 0),
    };
    // 全年推算：剩余月份重复「最近一个已填月份」的月度数据
    const projected = projectTwelveMonths(ordered);
    let annualCumFen = 0;
    let annualPaidFen = 0;
    let annualIncomeFen = 0;
    let annualNetFen = 0;
    let annualTaxableFen = 0;
    for (const m of projected) {
        const taxableFen = toFen(m.salary) -
            toFen(taxPolicy_1.BASIC_DEDUCTION_MONTHLY) -
            toFen(m.socialInsurance) -
            toFen(m.housingFund) -
            toFen(m.specialDeduction) -
            toFen(m.otherDeduction);
        annualCumFen += taxableFen;
        annualTaxableFen += taxableFen;
        annualIncomeFen += toFen(m.salary);
        const { taxFen, row } = rowOf(m, annualCumFen, annualPaidFen);
        annualPaidFen += taxFen;
        annualNetFen += toFen(row.netSalary);
    }
    const annual = {
        income: toYuan(annualIncomeFen),
        tax: toYuan(annualPaidFen),
        net: toYuan(annualNetFen),
        taxable: toYuan(annualTaxableFen),
    };
    return { rows, totals, annual };
}
/** 将已填月份外推为完整 12 个月（按最近一个已填月份的月度数据重复） */
function projectTwelveMonths(filled) {
    if (filled.length === 0)
        return [];
    const last = filled[filled.length - 1];
    const out = [...filled];
    for (let m = filled.length + 1; m <= 12; m++) {
        out.push(Object.assign(Object.assign({}, last), { month: m }));
    }
    return out;
}
/**
 * 年终奖两种计税方式对比。
 * @param wageAnnualTax 12 个月工资的累计预扣合计税额（元）
 * @param annualTaxableWithoutBonus 全年工资部分应纳税所得额合计（元，不含奖金）
 * @param bonusYuan 年终奖金额（元）
 */
function compareBonusMethods(wageAnnualTax, annualTaxableWithoutBonus, bonusYuan) {
    const bonusTaxSeparate = calcBonusTaxSeparate(bonusYuan);
    const annualTaxWithSeparate = wageAnnualTax + bonusTaxSeparate;
    const combinedTotal = calcAnnualComprehensiveTax(annualTaxableWithoutBonus + Math.max(0, bonusYuan));
    const wageOnlyTotal = calcAnnualComprehensiveTax(annualTaxableWithoutBonus);
    const bonusTaxCombined = Math.max(0, combinedTotal - wageOnlyTotal);
    const annualTaxWithCombined = wageOnlyTotal + bonusTaxCombined;
    return {
        bonus: bonusYuan,
        bonusTaxSeparate,
        bonusTaxCombined,
        annualTaxWithSeparate,
        annualTaxWithCombined,
        savingIfSeparate: Math.round((annualTaxWithCombined - annualTaxWithSeparate) * 100) / 100,
    };
}
