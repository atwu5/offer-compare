"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIVING_COST_KEYS = exports.LIVING_COST_LABELS = exports.SCENARIO_LABELS = void 0;
exports.bonusAmount = bonusAmount;
exports.subsidyAnnualForYear = subsidyAnnualForYear;
exports.validateOffer = validateOffer;
exports.computeOfferResult = computeOfferResult;
exports.buildDiffRows = buildDiffRows;
exports.diffTotal = diffTotal;
exports.buildHeadline = buildHeadline;
exports.buildScenarioNote = buildScenarioNote;
const socialInsuranceCalculator_1 = require("./socialInsuranceCalculator");
const housingFundCalculator_1 = require("./housingFundCalculator");
const incomeTaxCalculator_1 = require("./incomeTaxCalculator");
const money_1 = require("./money");
exports.SCENARIO_LABELS = {
    conservative: '保守',
    expected: '正常',
    optimistic: '乐观',
};
exports.LIVING_COST_LABELS = {
    housing: '房租',
    commute: '通勤',
    food: '餐饮',
    travel: '异地往返',
    other: '其他',
};
exports.LIVING_COST_KEYS = ['housing', 'commute', 'food', 'travel', 'other'];
const TAX_SOURCE = {
    name: '《中华人民共和国个人所得税法》综合所得年度税率表',
    url: 'https://flk.npc.gov.cn/',
};
const TAX_METHODOLOGY_NOTICE = '个税按全年综合所得「年度汇算」口径估算（未采用累计预扣法），年终奖并入综合所得计税。';
/** 奖金金额：mode = months 时按月薪折算 */
function bonusAmount(b, monthlySalary) {
    if (!b || b.value == null || !isFinite(b.value) || b.value <= 0)
        return 0;
    return (0, money_1.round2)(b.mode === 'months' ? b.value * monthlySalary : b.value);
}
/**
 * 补贴在某一年度的计入金额。
 * 规则：
 *  - 「可能获得」的补贴默认不计入，用户勾选 included 后才计入；
 *  - 一次性补贴只计入第一年；
 *  - 仅第一年 / 指定年数 / 长期持续分别按规则映射到首年与稳定年。
 */
function subsidyAnnualForYear(s, year) {
    const counted = s.certainty === 'confirmed' || s.included;
    if (!counted)
        return 0;
    const amt = s.amount != null && isFinite(s.amount) && s.amount > 0 ? s.amount : 0;
    if (amt === 0)
        return 0;
    if (s.frequency === 'once')
        return year === 1 ? (0, money_1.round2)(amt) : 0;
    const applies = s.duration === 'permanent'
        ? true
        : s.duration === 'firstYearOnly'
            ? year === 1
            : year <= Math.max(1, Math.floor(s.durationYears || 1));
    if (!applies)
        return 0;
    return (0, money_1.round2)(s.frequency === 'monthly' ? amt * 12 : amt);
}
/* ------------------------- 校验 ------------------------- */
function validateOffer(offer, hasPolicy) {
    const errors = [];
    const s = offer.monthlySalary;
    if (s == null || !isFinite(s))
        errors.push('请填写税前月薪。');
    else if (s <= 0)
        errors.push('税前月薪必须大于 0。');
    else if (s > 2000000)
        errors.push('税前月薪数值异常（超过 200 万），请检查。');
    const m = offer.fixedSalaryMonths;
    if (!Number.isInteger(m) || m < 12 || m > 24)
        errors.push('全年固定工资月数应为 12～24 的整数。');
    const pm = offer.probation.months;
    if (!Number.isInteger(pm) || pm < 0 || pm > 12)
        errors.push('试用期月数应为 0～12 的整数。');
    const pr = offer.probation.salaryRatio;
    if (!isFinite(pr) || pr < 0.5 || pr > 1)
        errors.push('试用期工资比例应在 50%～100% 之间。');
    if (offer.monthlySpecialTaxDeduction != null && offer.monthlySpecialTaxDeduction < 0)
        errors.push('每月专项附加扣除不能为负数。');
    if (offer.cityCode === 'custom') {
        if (offer.socialInsurance.useCityDefault) {
            errors.push('当前没有找到该城市已核验的社保政策，请在「五险一金」中手动填写参数后继续计算。');
        }
        else {
            const si = offer.socialInsurance;
            const missing = [];
            if (si.pensionBase == null)
                missing.push('养老基数');
            if (si.medicalBase == null)
                missing.push('医疗基数');
            if (si.unemploymentBase == null)
                missing.push('失业基数');
            if (!si.pensionRates || si.pensionRates.employee == null || si.pensionRates.employer == null)
                missing.push('养老比例');
            if (!si.medicalRates || si.medicalRates.employee == null || si.medicalRates.employer == null)
                missing.push('医疗比例');
            if (!si.unemploymentRates ||
                si.unemploymentRates.employee == null ||
                si.unemploymentRates.employer == null)
                missing.push('失业比例');
            if (offer.housingFund.base == null)
                missing.push('公积金基数');
            if (offer.housingFund.employeeRate == null || offer.housingFund.employerRate == null)
                missing.push('公积金比例');
            if (missing.length > 0)
                errors.push(`请先补全手动填写的五险一金参数：${missing.join('、')}。`);
        }
    }
    else if (!hasPolicy) {
        errors.push('当前没有找到该城市已核验的社保政策，请手动填写参数后继续计算。');
    }
    return { errors };
}
/** 其他城市（无政策数据）时，用用户手动填写的比例构造无上下限的参数 */
function buildEffectiveInsuranceParams(offer, policy) {
    var _a, _b;
    if (policy) {
        return {
            pension: policy.pension,
            medical: policy.medical,
            unemployment: policy.unemployment,
            housingFund: policy.housingFund,
        };
    }
    const si = offer.socialInsurance;
    const mk = (rates) => {
        var _a, _b;
        return ({
            employeeRate: (_a = rates === null || rates === void 0 ? void 0 : rates.employee) !== null && _a !== void 0 ? _a : 0,
            employerRate: (_b = rates === null || rates === void 0 ? void 0 : rates.employer) !== null && _b !== void 0 ? _b : 0,
            baseMin: 0,
            baseMax: Infinity,
        });
    };
    return {
        pension: mk(si.pensionRates),
        medical: mk(si.medicalRates),
        unemployment: mk(si.unemploymentRates),
        housingFund: {
            employeeRateDefault: (_a = offer.housingFund.employeeRate) !== null && _a !== void 0 ? _a : 0,
            employerRateDefault: (_b = offer.housingFund.employerRate) !== null && _b !== void 0 ? _b : 0,
            rateMin: 0,
            rateMax: 1,
            baseMin: 0,
            baseMax: Infinity,
        },
    };
}
function buildBreakdown(ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { offer, policy, scenario, probM, ratio, extraMonths, salary, year, fixedSalary, fixedBonusAmt, variableAmt, subsidiesTotal, gross, si, hf, tax, specialAnnual, livingItems, livingAnnual, siEmployeeTotal, hfEmployee, disposable, } = ctx;
    const items = [];
    const source = (_a = policy === null || policy === void 0 ? void 0 : policy.sources) === null || _a === void 0 ? void 0 : _a[0];
    const isYear1 = year === 1;
    // 税前工资收入
    const monthsDesc = isYear1
        ? `${12 - probM} 个月全额 + 试用期 ${probM} 个月 × ${(0, money_1.rateLabel)(ratio)}${extraMonths > 0 ? ` + 年终多发 ${extraMonths} 个月` : ''}`
        : `${offer.fixedSalaryMonths} 个月`;
    items.push({
        key: 'salary',
        name: '税前工资收入',
        group: 'income',
        amount: fixedSalary,
        displaySign: 1,
        formula: `月薪 ${(0, money_1.fmtCNY)(salary)} × ${monthsDesc}`,
        parameters: [
            { label: '税前月薪', value: (0, money_1.fmtCNY)(salary) },
            { label: '全年固定工资月数', value: `${offer.fixedSalaryMonths} 个月` },
            ...(probM > 0
                ? [
                    {
                        label: '试用期',
                        value: `${probM} 个月 × ${(0, money_1.rateLabel)(ratio)}（仅首年生效）`,
                    },
                ]
                : []),
            ...(extraMonths > 0
                ? [{ label: '年终多发月份', value: `${extraMonths} 个月，按全额月薪发放` }]
                : []),
        ],
        notices: isYear1 && probM > 0 ? ['首年工资已按试用期折扣计算。'] : [],
    });
    // 固定奖金
    items.push({
        key: 'fixedBonus',
        name: '固定奖金',
        group: 'income',
        amount: fixedBonusAmt,
        displaySign: 1,
        formula: offer.fixedBonus.mode === 'months'
            ? `${(_b = offer.fixedBonus.value) !== null && _b !== void 0 ? _b : 0} 个月月薪 × ${(0, money_1.fmtCNY)(salary)}`
            : `固定金额 ${(0, money_1.fmtCNY)(fixedBonusAmt)}`,
        parameters: [{ label: '输入方式', value: offer.fixedBonus.mode === 'months' ? '按月数' : '按金额' }],
    });
    // 浮动奖金
    if (offer.hasVariableBonus) {
        items.push({
            key: 'variableBonus',
            name: `浮动奖金（${exports.SCENARIO_LABELS[scenario]}场景）`,
            group: 'income',
            amount: variableAmt,
            displaySign: 1,
            formula: offer.variableBonus[scenario].mode === 'months'
                ? `${(_c = offer.variableBonus[scenario].value) !== null && _c !== void 0 ? _c : 0} 个月月薪 × ${(0, money_1.fmtCNY)(salary)}`
                : `固定金额 ${(0, money_1.fmtCNY)(variableAmt)}`,
            parameters: [
                {
                    label: '场景',
                    value: `保守 ${(_d = offer.variableBonus.conservative.value) !== null && _d !== void 0 ? _d : 0} / 正常 ${(_e = offer.variableBonus.expected.value) !== null && _e !== void 0 ? _e : 0} / 乐观 ${(_f = offer.variableBonus.optimistic.value) !== null && _f !== void 0 ? _f : 0}（${offer.variableBonus[scenario].mode === 'months' ? '月数' : '元'}）`,
                },
            ],
        });
    }
    // 现金补贴
    const countedSubsidies = offer.subsidies
        .map((s) => ({ s, amt: subsidyAnnualForYear(s, year) }))
        .filter((x) => x.amt > 0);
    if (countedSubsidies.length > 0) {
        items.push({
            key: 'subsidies',
            name: '现金补贴',
            group: 'income',
            amount: subsidiesTotal,
            displaySign: 1,
            formula: countedSubsidies.map((x) => `${x.s.name} ${(0, money_1.fmtCNY)(x.amt)}`).join(' + '),
            parameters: countedSubsidies.flatMap(({ s, amt }) => {
                var _a;
                return [
                    {
                        label: s.name,
                        value: `${(0, money_1.fmtCNY)((_a = s.amount) !== null && _a !== void 0 ? _a : 0)} / ${s.frequency === 'monthly' ? '月' : s.frequency === 'yearly' ? '年' : '一次性'} → 本年度计入 ${(0, money_1.fmtCNY)(amt)}`,
                    },
                ];
            }),
            notices: year === 1
                ? ['一次性补贴（如签字费）仅计入首年。']
                : ['稳定年已排除一次性补贴与仅首年补贴。'],
        });
    }
    // 税前收入合计
    items.push({
        key: 'grossSubtotal',
        name: '税前收入合计',
        group: 'income',
        amount: gross,
        displaySign: 1,
        emphasis: 'subtotal',
        formula: '以上收入项之和',
        parameters: [],
    });
    // 养老 / 医疗 / 失业（个人）
    const siRows = [
        { key: 'pension', name: '养老保险（个人）', r: si.pension },
        { key: 'medical', name: '医疗保险（个人）', r: si.medical },
        { key: 'unemployment', name: '失业保险（个人）', r: si.unemployment },
    ];
    const siPolicies = policy
        ? { pension: policy.pension, medical: policy.medical, unemployment: policy.unemployment }
        : {};
    for (const row of siRows) {
        const p = siPolicies[row.key];
        items.push({
            key: row.key,
            name: row.name,
            group: 'insurance',
            amount: row.r.annualEmployee,
            displaySign: -1,
            formula: `${(0, money_1.fmtCNY)(row.r.steadyBase)}（月缴费基数） × ${(0, money_1.rateLabel)((_g = p === null || p === void 0 ? void 0 : p.employeeRate) !== null && _g !== void 0 ? _g : 0)}（个人比例） × 12 个月`,
            parameters: [
                { label: '税前月薪', value: (0, money_1.fmtCNY)(salary) },
                {
                    label: '月有效缴费基数',
                    value: `${(0, money_1.fmtCNY)(row.r.steadyBase)}${row.r.notices.length > 0 ? '（已按政策上下限调整）' : ''}`,
                },
                { label: '个人比例', value: (0, money_1.rateLabel)((_h = p === null || p === void 0 ? void 0 : p.employeeRate) !== null && _h !== void 0 ? _h : 0) },
                {
                    label: '单位比例',
                    value: `${(0, money_1.rateLabel)((_j = p === null || p === void 0 ? void 0 : p.employerRate) !== null && _j !== void 0 ? _j : 0)}（单位缴费不计入个人收入）`,
                },
                ...(p
                    ? [
                        { label: '当地基数范围', value: `${(0, money_1.fmtCNY)(p.baseMin)} ～ ${(0, money_1.fmtCNY)(p.baseMax)}` },
                    ]
                    : [{ label: '基数来源', value: '手动填写' }]),
            ],
            policySource: source,
            notices: row.r.notices,
        });
    }
    // 公积金（个人）
    items.push({
        key: 'housingFund',
        name: '住房公积金（个人）',
        group: 'insurance',
        amount: hf.annualEmployee,
        displaySign: -1,
        formula: `${(0, money_1.fmtCNY)(hf.steadyBase)}（月缴存基数） × ${(0, money_1.rateLabel)(hf.employeeRate)}（个人比例） × 12 个月`,
        parameters: [
            { label: '税前月薪', value: (0, money_1.fmtCNY)(salary) },
            {
                label: '月有效缴存基数',
                value: `${(0, money_1.fmtCNY)(hf.steadyBase)}${hf.notices.length > 0 ? '（已按政策上下限调整）' : ''}`,
            },
            { label: '个人比例', value: (0, money_1.rateLabel)(hf.employeeRate) },
            {
                label: '单位比例',
                value: `${(0, money_1.rateLabel)(hf.employerRate)}（单位缴存一并进入你的公积金账户）`,
            },
            ...(policy
                ? [
                    {
                        label: '当地基数范围',
                        value: `${(0, money_1.fmtCNY)(policy.housingFund.baseMin)} ～ ${(0, money_1.fmtCNY)(policy.housingFund.baseMax)}`,
                    },
                ]
                : [{ label: '基数来源', value: '手动填写' }]),
        ],
        policySource: source,
        notices: hf.notices,
    });
    // 五险一金个人合计
    items.push({
        key: 'insuranceSubtotal',
        name: '五险一金个人缴纳合计',
        group: 'insurance',
        amount: siEmployeeTotal + hfEmployee,
        displaySign: -1,
        emphasis: 'subtotal',
        formula: '养老 + 医疗 + 失业 + 公积金（个人部分）',
        parameters: [{ label: '月均', value: (0, money_1.fmtCNY)((siEmployeeTotal + hfEmployee) / 12) }],
    });
    // 个人所得税
    items.push({
        key: 'incomeTax',
        name: '个人所得税',
        group: 'insurance',
        amount: tax.tax,
        displaySign: -1,
        formula: tax.taxableIncome <= 0
            ? '全年应纳税所得额 ≤ 0，无需缴纳个人所得税'
            : `（全年税前收入 ${(0, money_1.fmtCNY)(gross)} − 基本减除费用 ${(0, money_1.fmtCNY)(incomeTaxCalculator_1.ANNUAL_BASIC_DEDUCTION)} − 五险一金个人 ${(0, money_1.fmtCNY)(siEmployeeTotal + hfEmployee)} − 专项附加扣除 ${(0, money_1.fmtCNY)(specialAnnual)}） × 税率 ${(0, money_1.rateLabel)(tax.rate)} − 速算扣除数 ${(0, money_1.fmtCNY)(tax.quickDeduction)}`,
        parameters: [
            { label: '全年应纳税所得额', value: (0, money_1.fmtCNY)(tax.taxableIncome) },
            { label: '适用税档', value: tax.bracketLabel },
            { label: '专项附加扣除', value: `${(0, money_1.fmtCNY)(specialAnnual / 12)} / 月 × 12` },
            { label: '计算口径', value: '年度汇算口径（非累计预扣）' },
        ],
        policySource: TAX_SOURCE,
        notices: [TAX_METHODOLOGY_NOTICE],
    });
    // 生活成本
    for (const li of livingItems) {
        items.push({
            key: `living_${li.key}`,
            name: li.label,
            group: 'cost',
            amount: li.annual,
            displaySign: -1,
            formula: `每月 ${(0, money_1.fmtCNY)(li.monthly)} × 12 个月`,
            parameters: [{ label: '说明', value: '仅计入你填写的工作相关成本变化' }],
        });
    }
    if (livingItems.length > 1) {
        items.push({
            key: 'livingSubtotal',
            name: '工作相关成本合计',
            group: 'cost',
            amount: livingAnnual,
            displaySign: -1,
            emphasis: 'subtotal',
            formula: '房租 + 通勤 + 餐饮 + 异地往返 + 其他',
            parameters: [],
        });
    }
    // 最终可支配收入
    items.push({
        key: 'disposable',
        name: isYear1 ? '首年可支配现金' : '稳定年可支配现金',
        group: 'result',
        amount: disposable,
        displaySign: 1,
        emphasis: 'total',
        formula: `税前收入 ${(0, money_1.fmtCNY)(gross)} − 五险一金个人 ${(0, money_1.fmtCNY)(siEmployeeTotal + hfEmployee)} − 个人所得税 ${(0, money_1.fmtCNY)(tax.tax)} − 工作相关成本 ${(0, money_1.fmtCNY)(livingAnnual)}`,
        parameters: [
            { label: '月均', value: (0, money_1.fmtCNY)(disposable / 12) },
            {
                label: '口径',
                value: '可支配现金 = 工资 + 奖金 + 已确认补贴 − 五险一金个人 − 个税 − 工作新增生活成本',
            },
        ],
    });
    return items;
}
/* ------------------------- 主计算 ------------------------- */
function emptyYear(year) {
    return {
        year,
        fixedSalary: 0,
        fixedBonus: 0,
        variableBonus: 0,
        subsidiesTotal: 0,
        grossIncome: 0,
        employeeSocialInsurance: 0,
        employeeHousingFund: 0,
        employerSocialInsurance: 0,
        employerHousingFund: 0,
        specialDeductionAnnual: 0,
        taxableIncome: 0,
        estimatedIncomeTax: 0,
        taxRate: 0,
        taxQuickDeduction: 0,
        livingCosts: 0,
        livingItems: [],
        disposableCash: 0,
        housingFundAssetIncrease: 0,
    };
}
function computeOfferResult(offer, policy, scenario) {
    var _a, _b, _c;
    const cityName = policy ? policy.cityName : ((_a = offer.cityCustomName) === null || _a === void 0 ? void 0 : _a.trim()) || '自定义城市';
    const { errors } = validateOffer(offer, !!policy);
    if (errors.length > 0) {
        return {
            offerId: offer.id,
            offerName: offer.name,
            cityCode: offer.cityCode,
            cityName,
            scenario,
            valid: false,
            errors,
            notices: [],
            hasVariableBonus: offer.hasVariableBonus,
            monthlyGrossSalary: (_b = offer.monthlySalary) !== null && _b !== void 0 ? _b : 0,
            grossAnnualIncome: 0,
            firstYear: emptyYear(1),
            steadyYear: emptyYear(2),
            monthlyDisposable: 0,
            housingFundAssetIncrease: 0,
            employerPensionAnnual: 0,
            effectivePensionBase: 0,
            effectiveHousingFundBase: 0,
            breakdown: [],
            firstBreakdown: [],
        };
    }
    const salary = offer.monthlySalary;
    const notices = [];
    const pushNotice = (n) => {
        if (n && !notices.includes(n))
            notices.push(n);
    };
    if (policy && policy.demo) {
        pushNotice(`${cityName}当前使用演示政策数据（${policy.version}），结果仅供功能演示。`);
    }
    if (policy && policy.effectiveDate && policy.effectiveDate < '2026-01-01') {
        pushNotice(`${cityName}政策版本生效日期较早，可能已过期，请核对最新政策。`);
    }
    const probM = Math.min(Math.max(Math.floor(offer.probation.months || 0), 0), 12);
    const ratio = (0, money_1.clamp)(offer.probation.salaryRatio || 1, 0.5, 1);
    const extraMonths = Math.max(0, offer.fixedSalaryMonths - 12);
    // 12 个日历月的当月实际工资（试用期折扣仅首年生效）
    const monthSalariesYear1 = [];
    for (let i = 0; i < 12; i++)
        monthSalariesYear1.push(i < probM ? (0, money_1.round2)(salary * ratio) : salary);
    const monthSalariesSteady = new Array(12).fill(salary);
    const si = offer.socialInsurance;
    const useCustomBase = !si.useCityDefault;
    const eff = buildEffectiveInsuranceParams(offer, policy);
    const calcSI = (ms) => ({
        pension: (0, socialInsuranceCalculator_1.calcInsuranceAnnual)('养老保险', eff.pension, ms, useCustomBase ? si.pensionBase : null),
        medical: (0, socialInsuranceCalculator_1.calcInsuranceAnnual)('医疗保险', eff.medical, ms, useCustomBase ? si.medicalBase : null),
        unemployment: (0, socialInsuranceCalculator_1.calcInsuranceAnnual)('失业保险', eff.unemployment, ms, useCustomBase ? si.unemploymentBase : null),
    });
    const siY1 = calcSI(monthSalariesYear1);
    const siS = calcSI(monthSalariesSteady);
    [...Object.values(siY1), ...Object.values(siS)].forEach((r) => r.notices.forEach(pushNotice));
    const hf = offer.housingFund;
    const hfY1 = (0, housingFundCalculator_1.calcHousingFundAnnual)(eff.housingFund, monthSalariesYear1, useCustomBase ? hf.base : null, hf.employeeRate, hf.employerRate);
    const hfS = (0, housingFundCalculator_1.calcHousingFundAnnual)(eff.housingFund, monthSalariesSteady, useCustomBase ? hf.base : null, hf.employeeRate, hf.employerRate);
    [hfY1, hfS].forEach((r) => r.notices.forEach(pushNotice));
    const siEmployeeOf = (r) => (0, money_1.round2)(r.pension.annualEmployee + r.medical.annualEmployee + r.unemployment.annualEmployee);
    const siEmployerOf = (r) => (0, money_1.round2)(r.pension.annualEmployer + r.medical.annualEmployer + r.unemployment.annualEmployer);
    const siEmp1 = siEmployeeOf(siY1);
    const siEmpS = siEmployeeOf(siS);
    // 收入项
    const fixedBonusAmt = bonusAmount(offer.fixedBonus, salary);
    const variableAmt = offer.hasVariableBonus ? bonusAmount(offer.variableBonus[scenario], salary) : 0;
    const subsidiesYear1 = (0, money_1.round2)(offer.subsidies.reduce((acc, s) => acc + subsidyAnnualForYear(s, 1), 0));
    const subsidiesSteady = (0, money_1.round2)(offer.subsidies.reduce((acc, s) => acc + subsidyAnnualForYear(s, 2), 0));
    // 首年固定工资：试用期月按折扣，其余月份全额；13～16 薪按全额月薪
    const year1FixedSalary = (0, money_1.round2)(salary * (12 - probM) + salary * ratio * probM + salary * extraMonths);
    const steadyFixedSalary = (0, money_1.round2)(salary * offer.fixedSalaryMonths);
    const grossYear1 = (0, money_1.round2)(year1FixedSalary + fixedBonusAmt + variableAmt + subsidiesYear1);
    const grossSteady = (0, money_1.round2)(steadyFixedSalary + fixedBonusAmt + variableAmt + subsidiesSteady);
    // 生活成本
    const lc = offer.livingCosts;
    const livingItems = exports.LIVING_COST_KEYS.map((k) => {
        var _a, _b;
        return ({
            key: k,
            label: exports.LIVING_COST_LABELS[k],
            monthly: Math.max(0, (_a = lc[k]) !== null && _a !== void 0 ? _a : 0),
            annual: (0, money_1.round2)(Math.max(0, (_b = lc[k]) !== null && _b !== void 0 ? _b : 0) * 12),
        });
    }).filter((x) => x.monthly > 0);
    const livingAnnual = (0, money_1.round2)(livingItems.reduce((a, b) => a + b.annual, 0));
    // 个税
    const specialAnnual = (0, money_1.round2)(Math.max(0, (_c = offer.monthlySpecialTaxDeduction) !== null && _c !== void 0 ? _c : 0) * 12);
    const hfEmp1 = hfY1.annualEmployee;
    const hfEmpS = hfS.annualEmployee;
    const taxYear1 = (0, incomeTaxCalculator_1.calcAnnualTax)((0, money_1.round2)(grossYear1 - incomeTaxCalculator_1.ANNUAL_BASIC_DEDUCTION - siEmp1 - hfEmp1 - specialAnnual));
    const taxSteady = (0, incomeTaxCalculator_1.calcAnnualTax)((0, money_1.round2)(grossSteady - incomeTaxCalculator_1.ANNUAL_BASIC_DEDUCTION - siEmpS - hfEmpS - specialAnnual));
    const year1 = {
        year: 1,
        fixedSalary: year1FixedSalary,
        fixedBonus: fixedBonusAmt,
        variableBonus: variableAmt,
        subsidiesTotal: subsidiesYear1,
        grossIncome: grossYear1,
        employeeSocialInsurance: siEmp1,
        employeeHousingFund: hfEmp1,
        employerSocialInsurance: siEmployerOf(siY1),
        employerHousingFund: hfY1.annualEmployer,
        specialDeductionAnnual: specialAnnual,
        taxableIncome: taxYear1.taxableIncome,
        estimatedIncomeTax: taxYear1.tax,
        taxRate: taxYear1.rate,
        taxQuickDeduction: taxYear1.quickDeduction,
        livingCosts: livingAnnual,
        livingItems,
        disposableCash: (0, money_1.round2)(grossYear1 - siEmp1 - hfEmp1 - taxYear1.tax - livingAnnual),
        housingFundAssetIncrease: (0, money_1.round2)(hfEmp1 + hfY1.annualEmployer),
    };
    const steadyYear = {
        year: 2,
        fixedSalary: steadyFixedSalary,
        fixedBonus: fixedBonusAmt,
        variableBonus: variableAmt,
        subsidiesTotal: subsidiesSteady,
        grossIncome: grossSteady,
        employeeSocialInsurance: siEmpS,
        employeeHousingFund: hfEmpS,
        employerSocialInsurance: siEmployerOf(siS),
        employerHousingFund: hfS.annualEmployer,
        specialDeductionAnnual: specialAnnual,
        taxableIncome: taxSteady.taxableIncome,
        estimatedIncomeTax: taxSteady.tax,
        taxRate: taxSteady.rate,
        taxQuickDeduction: taxSteady.quickDeduction,
        livingCosts: livingAnnual,
        livingItems,
        disposableCash: (0, money_1.round2)(grossSteady - siEmpS - hfEmpS - taxSteady.tax - livingAnnual),
        housingFundAssetIncrease: (0, money_1.round2)(hfEmpS + hfS.annualEmployer),
    };
    const baseCtx = {
        offer,
        policy,
        cityName,
        scenario,
        probM,
        ratio,
        extraMonths,
        salary,
        fixedBonusAmt,
        variableAmt,
        specialAnnual,
        livingItems,
        livingAnnual,
    };
    const breakdown = buildBreakdown(Object.assign(Object.assign({}, baseCtx), { year: 2, fixedSalary: steadyFixedSalary, subsidiesTotal: subsidiesSteady, gross: grossSteady, si: siS, hf: hfS, tax: taxSteady, siEmployeeTotal: siEmpS, hfEmployee: hfEmpS, disposable: steadyYear.disposableCash }));
    const firstBreakdown = buildBreakdown(Object.assign(Object.assign({}, baseCtx), { year: 1, fixedSalary: year1FixedSalary, subsidiesTotal: subsidiesYear1, gross: grossYear1, si: siY1, hf: hfY1, tax: taxYear1, siEmployeeTotal: siEmp1, hfEmployee: hfEmp1, disposable: year1.disposableCash }));
    return {
        offerId: offer.id,
        offerName: offer.name,
        cityCode: offer.cityCode,
        cityName,
        scenario,
        valid: true,
        errors: [],
        notices,
        hasVariableBonus: offer.hasVariableBonus,
        monthlyGrossSalary: salary,
        grossAnnualIncome: grossSteady,
        firstYear: year1,
        steadyYear,
        monthlyDisposable: (0, money_1.round2)(steadyYear.disposableCash / 12),
        housingFundAssetIncrease: steadyYear.housingFundAssetIncrease,
        employerPensionAnnual: siS.pension.annualEmployer,
        effectivePensionBase: siS.pension.steadyBase,
        effectiveHousingFundBase: hfS.steadyBase,
        breakdown,
        firstBreakdown,
    };
}
function buildDiffRows(a, b, year) {
    var _a, _b, _c, _d;
    const ya = year === 'first' ? a.firstYear : a.steadyYear;
    const yb = year === 'first' ? b.firstYear : b.steadyYear;
    const rows = [];
    const push = (key, label, diff, kind) => {
        if (Math.abs(diff) >= 0.5)
            rows.push({ key, label, amount: (0, money_1.round2)(diff), kind });
    };
    push('salary', '税前工资', yb.fixedSalary - ya.fixedSalary, 'income');
    push('fixedBonus', '固定奖金', yb.fixedBonus - ya.fixedBonus, 'income');
    push('variableBonus', '浮动奖金', yb.variableBonus - ya.variableBonus, 'income');
    push('subsidies', '现金补贴', yb.subsidiesTotal - ya.subsidiesTotal, 'income');
    push('incomeTax', '个人所得税', -(yb.estimatedIncomeTax - ya.estimatedIncomeTax), 'deduction');
    push('si', '社保个人缴纳', -(yb.employeeSocialInsurance - ya.employeeSocialInsurance), 'deduction');
    push('hf', '公积金个人缴纳', -(yb.employeeHousingFund - ya.employeeHousingFund), 'deduction');
    for (const k of exports.LIVING_COST_KEYS) {
        const av = (_b = (_a = ya.livingItems.find((i) => i.key === k)) === null || _a === void 0 ? void 0 : _a.annual) !== null && _b !== void 0 ? _b : 0;
        const bv = (_d = (_c = yb.livingItems.find((i) => i.key === k)) === null || _c === void 0 ? void 0 : _c.annual) !== null && _d !== void 0 ? _d : 0;
        push(`living_${k}`, exports.LIVING_COST_LABELS[k], -(bv - av), 'deduction');
    }
    return rows;
}
function diffTotal(a, b, year) {
    return (0, money_1.round2)((year === 'first' ? b.firstYear.disposableCash : b.steadyYear.disposableCash) -
        (year === 'first' ? a.firstYear.disposableCash : a.steadyYear.disposableCash));
}
function buildHeadline(a, b) {
    const aSteady = a.steadyYear.disposableCash;
    const bSteady = b.steadyYear.disposableCash;
    const nominal = a.grossAnnualIncome > 0 ? b.grossAnnualIncome / a.grossAnnualIncome - 1 : NaN;
    const real = aSteady > 0 ? bSteady / aSteady - 1 : NaN;
    const firstDiff = (0, money_1.round2)(b.firstYear.disposableCash - a.firstYear.disposableCash);
    const steadyDiff = (0, money_1.round2)(bSteady - aSteady);
    if (!a.valid || !b.valid || !isFinite(nominal) || !isFinite(real) || aSteady <= 0) {
        return {
            hasData: false,
            title: '',
            explanation: '',
            nominal: NaN,
            real: NaN,
            firstDiff,
            steadyDiff,
        };
    }
    const aName = a.offerName;
    const bName = b.offerName;
    let title;
    if (Math.abs(steadyDiff) < 1200) {
        title = '两个 Offer 实际到手基本相当';
    }
    else if (steadyDiff > 0) {
        if (nominal - real > 0.02)
            title = `${bName} 收入更高，但没有名义涨薪看起来那么多`;
        else if (real - nominal > 0.02)
            title = `${bName} 收入更高，实际到手涨幅超过名义涨薪`;
        else
            title = `${bName} 收入更高`;
    }
    else {
        if (nominal > 0.02 && real < -0.02)
            title = `${bName} 名义涨薪更高，但实际到手反而更少`;
        else
            title = `${aName} 实际到手更高`;
    }
    const direction = real >= 0 ? '提升' : '下降';
    const explanation = `名义税前年收入相差 ${(0, money_1.fmtPct)(nominal)}，但考虑个税、五险一金、公积金以及工作成本后，稳定年实际可自由支配收入${direction}约 ${(0, money_1.fmtPctPlain)(real)}。`;
    return { hasData: true, title, explanation, nominal, real, firstDiff, steadyDiff };
}
/** 场景波动总结（仅基于输入数值的规则判断） */
function buildScenarioNote(resultSets, aName, bName) {
    const a = resultSets.expected[0];
    const b = resultSets.expected[1];
    if (!a.valid || !b.valid)
        return '';
    if (!a.hasVariableBonus && !b.hasVariableBonus) {
        return '未填写浮动奖金，当前仅按正常场景计算。';
    }
    const spreadA = (0, money_1.round2)(resultSets.optimistic[0].steadyYear.disposableCash - resultSets.conservative[0].steadyYear.disposableCash);
    const spreadB = (0, money_1.round2)(resultSets.optimistic[1].steadyYear.disposableCash - resultSets.conservative[1].steadyYear.disposableCash);
    if (spreadA <= 0 && spreadB <= 0)
        return '浮动奖金未产生实际差异，三个场景结果一致。';
    if (spreadB > spreadA * 1.05)
        return `${bName} 收入上限更高，但收入波动也更明显。`;
    if (spreadA > spreadB * 1.05)
        return `${aName} 收入上限更高，但收入波动也更明显。`;
    return '两个 Offer 的收入波动幅度接近。';
}
