"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cityPolicies_1 = require("../../engine/data/cityPolicies");
const defaults_1 = require("../../engine/data/defaults");
const offerCalculator_1 = require("../../engine/utils/offerCalculator");
const reverseCalculator_1 = require("../../engine/utils/reverseCalculator");
const money_1 = require("../../engine/utils/money");
/* ------------------------- 常量 ------------------------- */
const MONTHS_OPTIONS = ['12 个月', '13 个月', '14 个月', '15 个月', '16 个月', '自定义'];
const MONTHS_VALUES = ['12', '13', '14', '15', '16', 'custom'];
const RATIO_OPTIONS = ['无折扣（100%）', '90%', '80%', '自定义'];
const RATIO_VALUES = ['1', '0.9', '0.8', 'custom'];
const FREQ_OPTIONS = ['每月', '每年', '一次性'];
const FREQ_VALUES = ['monthly', 'yearly', 'once'];
const DUR_OPTIONS = ['仅第一年', '长期持续', '指定年数'];
const DUR_VALUES = ['firstYearOnly', 'permanent', 'years'];
const CERT_OPTIONS = ['确定获得', '可能获得'];
const CERT_VALUES = ['confirmed', 'possible'];
const CITY_LABELS = cityPolicies_1.CITY_OPTIONS.map((o) => o.label);
const CITY_VALUES = cityPolicies_1.CITY_OPTIONS.map((o) => o.value);
const SUBSIDY_PRESETS = [
    { name: '餐补', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
    { name: '交通补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
    { name: '通讯补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
    { name: '租房补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
    { name: '人才补贴', frequency: 'yearly', duration: 'firstYearOnly', durationYears: 1, certainty: 'possible', included: false },
    { name: '签字费', frequency: 'once', duration: 'firstYearOnly', durationYears: 1, certainty: 'confirmed', included: false },
    { name: '搬家补贴', frequency: 'once', duration: 'firstYearOnly', durationYears: 1, certainty: 'confirmed', included: false },
];
const SUBSIDY_PRESET_LABELS = SUBSIDY_PRESETS.map((p) => p.name);
const GROUP_TITLES = {
    income: '收入',
    insurance: '五险一金与个税（个人部分）',
    cost: '工作相关成本',
    result: '结果',
};
/* ------------------------- 小工具 ------------------------- */
function numStr(v) {
    return v == null || !isFinite(v) ? '' : String(Math.round(v * 1e6) / 1e6);
}
function pctStr(v) {
    return v == null || !isFinite(v) ? '' : String(Math.round(v * 1000) / 10);
}
function parseNum(raw) {
    const t = String(raw == null ? '' : raw).trim();
    if (!t)
        return null;
    const n = Number(t);
    return isFinite(n) ? n : null;
}
function parseIntOrNull(raw) {
    const n = parseNum(raw);
    return n == null ? null : Math.round(n);
}
/** 不可变深设置：返回带新路径值的克隆对象（不修改原对象） */
function setPath(obj, path, value) {
    const segs = path.split('.');
    const clone = Array.isArray(obj) ? obj.slice() : Object.assign({}, obj);
    let cur = clone;
    for (let k = 0; k < segs.length - 1; k++) {
        const key = segs[k];
        const nxt = cur[key];
        cur[key] = Array.isArray(nxt) ? nxt.slice() : Object.assign({}, (nxt !== null && nxt !== void 0 ? nxt : {}));
        cur = cur[key];
    }
    cur[segs[segs.length - 1]] = value;
    return clone;
}
function buildHfRateOptions(policy) {
    if (!policy)
        return { options: ['默认比例'], values: ['default'] };
    const min = Math.round(policy.housingFund.rateMin * 100);
    const max = Math.round(policy.housingFund.rateMax * 100);
    const options = [`默认 ${Math.round(policy.housingFund.employeeRateDefault * 100)}%`];
    const values = ['default'];
    for (let p = min; p <= max; p++) {
        options.push(`${p}%`);
        values.push(String(p));
    }
    return { options, values };
}
function buildDraftSubsidy(s) {
    const freqIndex = Math.max(0, FREQ_VALUES.indexOf(s.frequency));
    const durIndex = Math.max(0, DUR_VALUES.indexOf(s.duration));
    const certIndex = Math.max(0, CERT_VALUES.indexOf(s.certainty));
    return {
        id: s.id,
        name: s.name,
        amount: numStr(s.amount),
        durationYears: String(s.durationYears),
        freq: s.frequency,
        dur: s.duration,
        cert: s.certainty,
        included: s.included,
        freqIndex,
        durIndex,
        certIndex,
        freqLabel: FREQ_OPTIONS[freqIndex],
        durLabel: DUR_OPTIONS[durIndex],
        certLabel: CERT_OPTIONS[certIndex],
    };
}
function buildDraft(o) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    const policy = (0, cityPolicies_1.getPolicy)(o.cityCode);
    const hf = buildHfRateOptions(policy);
    const monthsMode = MONTHS_VALUES.includes(String(o.fixedSalaryMonths))
        ? String(o.fixedSalaryMonths)
        : 'custom';
    const monthsIndex = Math.max(0, MONTHS_VALUES.indexOf(monthsMode));
    const ratio = o.probation.salaryRatio;
    const ratioMode = ratio === 1 ? '1' : ratio === 0.8 ? '0.8' : ratio === 0.9 ? '0.9' : 'custom';
    const ratioIndex = Math.max(0, RATIO_VALUES.indexOf(ratioMode));
    const hfRateMode = o.housingFund.employeeRate == null
        ? 'default'
        : String(Math.round(o.housingFund.employeeRate * 100));
    let hfRateIndex = hf.values.indexOf(hfRateMode);
    if (hfRateIndex < 0)
        hfRateIndex = 0;
    const cityIndex = Math.max(0, CITY_VALUES.indexOf(o.cityCode));
    const si = o.socialInsurance;
    return {
        name: o.name,
        companyName: o.companyName,
        cityCustomName: (_a = o.cityCustomName) !== null && _a !== void 0 ? _a : '',
        isCustom: o.cityCode === 'custom',
        hasPolicy: !!policy,
        cityIndex,
        cityLabel: CITY_LABELS[cityIndex],
        monthsIndex,
        monthsMode,
        monthsLabel: MONTHS_OPTIONS[monthsIndex],
        ratioIndex,
        ratioMode,
        ratioLabel: RATIO_OPTIONS[ratioIndex],
        hfRateIndex,
        hfRateOptions: hf.options,
        hfRateValues: hf.values,
        monthlySalary: numStr(o.monthlySalary),
        monthsCustom: numStr(o.fixedSalaryMonths),
        bonusMode: o.fixedBonus.mode,
        bonusValue: numStr(o.fixedBonus.value),
        hasVariableBonus: o.hasVariableBonus,
        vbMode: o.variableBonus.expected.mode,
        vb: [
            numStr(o.variableBonus.conservative.value),
            numStr(o.variableBonus.expected.value),
            numStr(o.variableBonus.optimistic.value),
        ],
        probationMonths: String((_b = o.probation.months) !== null && _b !== void 0 ? _b : 0),
        ratioCustom: pctStr(ratio),
        useCityDefault: si.useCityDefault,
        pensionBase: numStr((_c = si.pensionBase) !== null && _c !== void 0 ? _c : null),
        medicalBase: numStr((_d = si.medicalBase) !== null && _d !== void 0 ? _d : null),
        unemploymentBase: numStr((_e = si.unemploymentBase) !== null && _e !== void 0 ? _e : null),
        hfBase: numStr((_f = o.housingFund.base) !== null && _f !== void 0 ? _f : null),
        hfRateLabel: hf.options[hfRateIndex],
        rates: {
            pensionEmp: pctStr((_h = (_g = si.pensionRates) === null || _g === void 0 ? void 0 : _g.employee) !== null && _h !== void 0 ? _h : null),
            pensionEr: pctStr((_k = (_j = si.pensionRates) === null || _j === void 0 ? void 0 : _j.employer) !== null && _k !== void 0 ? _k : null),
            medicalEmp: pctStr((_m = (_l = si.medicalRates) === null || _l === void 0 ? void 0 : _l.employee) !== null && _m !== void 0 ? _m : null),
            medicalEr: pctStr((_p = (_o = si.medicalRates) === null || _o === void 0 ? void 0 : _o.employer) !== null && _p !== void 0 ? _p : null),
            unempEmp: pctStr((_r = (_q = si.unemploymentRates) === null || _q === void 0 ? void 0 : _q.employee) !== null && _r !== void 0 ? _r : null),
            unempEr: pctStr((_t = (_s = si.unemploymentRates) === null || _s === void 0 ? void 0 : _s.employer) !== null && _t !== void 0 ? _t : null),
            hfEmp: pctStr((_u = o.housingFund.employeeRate) !== null && _u !== void 0 ? _u : null),
            hfEr: pctStr((_v = o.housingFund.employerRate) !== null && _v !== void 0 ? _v : null),
        },
        specialDeduction: numStr(o.monthlySpecialTaxDeduction),
        subsidies: o.subsidies.map(buildDraftSubsidy),
        living: offerCalculator_1.LIVING_COST_KEYS.map((k) => numStr(o.livingCosts[k])),
    };
}
function buildPanel(item, policy) {
    var _a, _b;
    const src = item.policySource;
    const sourceLine = src
        ? `政策来源：${src.name}${(policy === null || policy === void 0 ? void 0 : policy.version) ? ` · ${policy.version}` : ''}${policy ? ` · 生效 ${policy.effectiveDate} · 更新 ${policy.updatedAt}` : ''}`
        : '来源：用户输入 / 通用税务规则';
    return {
        amountText: `${item.displaySign === -1 ? '−' : ''}${(0, money_1.fmtCNY)(item.amount)}`,
        neg: item.displaySign === -1,
        formula: item.formula,
        params: item.parameters.map((p) => ({ label: p.label, value: p.value })),
        notices: (_a = item.notices) !== null && _a !== void 0 ? _a : [],
        sourceLine,
        url: (_b = src === null || src === void 0 ? void 0 : src.url) !== null && _b !== void 0 ? _b : '',
    };
}
function buildDetailsVm(a, b, yearView, scenario, expanded, policyA, policyB) {
    var _a;
    const itemsA = yearView === 'first' ? a.firstBreakdown : a.breakdown;
    const itemsB = yearView === 'first' ? b.firstBreakdown : b.breakdown;
    const keys = [];
    for (const it of itemsA)
        if (!keys.includes(it.key))
            keys.push(it.key);
    for (const it of itemsB)
        if (!keys.includes(it.key))
            keys.push(it.key);
    const mapA = new Map(itemsA.map((i) => [i.key, i]));
    const mapB = new Map(itemsB.map((i) => [i.key, i]));
    const notices = [];
    const seen = new Set();
    for (const it of [...itemsA, ...itemsB]) {
        for (const n of (_a = it.notices) !== null && _a !== void 0 ? _a : []) {
            if (!seen.has(n) && !n.includes('年度汇算')) {
                seen.add(n);
                notices.push(n);
            }
        }
    }
    const rows = [];
    keys.forEach((key, idx) => {
        var _a, _b, _c, _d, _e;
        const ia = mapA.get(key);
        const ib = mapB.get(key);
        if (!ia && !ib)
            return;
        const item = (ia !== null && ia !== void 0 ? ia : ib);
        const prevKey = idx > 0 ? keys[idx - 1] : null;
        const prevItem = prevKey ? (_b = (_a = mapA.get(prevKey)) !== null && _a !== void 0 ? _a : mapB.get(prevKey)) !== null && _b !== void 0 ? _b : null : null;
        const showGroupTitle = !prevItem || prevItem.group !== item.group;
        const emphasisCls = item.emphasis === 'total' ? 'row-strong' : item.emphasis === 'subtotal' ? 'row-sub' : '';
        rows.push({
            key,
            name: item.name,
            groupTitle: showGroupTitle ? (_c = GROUP_TITLES[item.group]) !== null && _c !== void 0 ? _c : '' : '',
            emphasisCls,
            hasDot: !!(((_d = ia === null || ia === void 0 ? void 0 : ia.notices) === null || _d === void 0 ? void 0 : _d.length) || ((_e = ib === null || ib === void 0 ? void 0 : ib.notices) === null || _e === void 0 ? void 0 : _e.length)),
            aPresent: !!ia,
            bPresent: !!ib,
            aText: ia ? `${ia.displaySign === -1 ? '−' : ''}${(0, money_1.fmtCNY)(ia.amount)}` : '—',
            bText: ib ? `${ib.displaySign === -1 ? '−' : ''}${(0, money_1.fmtCNY)(ib.amount)}` : '—',
            open: !!expanded[key],
            panelA: ia ? buildPanel(ia, policyA) : null,
            panelB: ib ? buildPanel(ib, policyB) : null,
        });
    });
    const yearLabel = yearView === 'first' ? '首年' : '稳定年';
    return { subtitle: `${yearLabel} · ${offerCalculator_1.SCENARIO_LABELS[scenario]}场景`, notices, rows };
}
function buildWalletsVm(a, b, yearView) {
    const ya = yearView === 'first' ? a.firstYear : a.steadyYear;
    const yb = yearView === 'first' ? b.firstYear : b.steadyYear;
    const cashDiff = (0, money_1.round2)(yb.disposableCash - ya.disposableCash);
    const hfDiff = (0, money_1.round2)(yb.housingFundAssetIncrease - ya.housingFundAssetIncrease);
    let pensionVerdict = '两份 Offer 缴费基础相同';
    if (b.effectivePensionBase > a.effectivePensionBase)
        pensionVerdict = `${b.offerName} 缴费基础更高`;
    else if (b.effectivePensionBase < a.effectivePensionBase)
        pensionVerdict = `${a.offerName} 缴费基础更高`;
    const hfRate = (r) => (0, money_1.rateLabel)((r.steadyYear.employeeHousingFund + r.steadyYear.employerHousingFund) /
        Math.max(1, r.effectiveHousingFundBase * 12));
    const pensionEmp = (r) => {
        var _a, _b;
        return (0, money_1.fmtCNY)(r.steadyYear.employeeSocialInsurance > 0
            ? (_b = (_a = r.breakdown.find((x) => x.key === 'pension')) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : 0
            : 0);
    };
    return {
        cash: {
            rows: [
                {
                    name: a.offerName,
                    amountText: (0, money_1.fmtCNY)(ya.disposableCash),
                    sub: `月均 ${(0, money_1.fmtCNY)(ya.disposableCash / 12)}`,
                    emphasize: false,
                },
                {
                    name: b.offerName,
                    amountText: (0, money_1.fmtCNY)(yb.disposableCash),
                    sub: `月均 ${(0, money_1.fmtCNY)(yb.disposableCash / 12)}`,
                    emphasize: true,
                },
            ],
            diffText: (0, money_1.fmtSignedCNY)(cashDiff),
            diffCls: cashDiff >= 0 ? 'pos' : 'neg',
        },
        fund: {
            rows: [
                {
                    name: a.offerName,
                    totalText: `${(0, money_1.fmtCNY)(ya.housingFundAssetIncrease)} / 年`,
                    sub: `个人 ${(0, money_1.fmtCNY)(ya.employeeHousingFund)} · 单位 ${(0, money_1.fmtCNY)(ya.employerHousingFund)}`,
                },
                {
                    name: b.offerName,
                    totalText: `${(0, money_1.fmtCNY)(yb.housingFundAssetIncrease)} / 年`,
                    sub: `个人 ${(0, money_1.fmtCNY)(yb.employeeHousingFund)} · 单位 ${(0, money_1.fmtCNY)(yb.employerHousingFund)}`,
                },
            ],
            diffText: (0, money_1.fmtSignedCNY)(hfDiff),
            diffCls: hfDiff >= 0 ? 'pos' : 'neg',
        },
        security: {
            rows: [
                {
                    label: '养老缴费基数',
                    aText: (0, money_1.fmtCNY)(a.effectivePensionBase),
                    bText: (0, money_1.fmtCNY)(b.effectivePensionBase),
                },
                {
                    label: '养老个人缴费 / 年',
                    aText: pensionEmp(a),
                    bText: pensionEmp(b),
                },
                {
                    label: '养老单位缴费 / 年',
                    aText: (0, money_1.fmtCNY)(a.employerPensionAnnual),
                    bText: (0, money_1.fmtCNY)(b.employerPensionAnnual),
                },
                {
                    label: '公积金月缴存基数',
                    aText: `${(0, money_1.fmtCNY)(a.effectiveHousingFundBase)} × ${hfRate(a)}`,
                    bText: `${(0, money_1.fmtCNY)(b.effectiveHousingFundBase)} × ${hfRate(b)}`,
                },
            ],
            verdict: pensionVerdict,
        },
    };
}
function buildDiffVm(a, b, yearView, scenario) {
    const rows = (0, offerCalculator_1.buildDiffRows)(a, b, yearView);
    const total = (0, offerCalculator_1.diffTotal)(a, b, yearView);
    const yearLabel = yearView === 'first' ? '首年' : '稳定年';
    const maxAbs = Math.max(...rows.map((r) => Math.abs(r.amount)), 1);
    const ya = yearView === 'first' ? a.firstYear : a.steadyYear;
    const yb = yearView === 'first' ? b.firstYear : b.steadyYear;
    return {
        empty: rows.length === 0,
        rows: rows.map((r) => {
            const positive = r.amount > 0;
            const widthPct = Math.min(100, (Math.abs(r.amount) / maxAbs) * 100);
            return {
                key: r.key,
                label: r.label,
                amountText: (0, money_1.fmtSignedCNY)(r.amount),
                cls: positive ? 'pos' : 'neg',
                widthPct,
                mlPct: positive ? 0 : 100 - widthPct,
            };
        }),
        totalText: (0, money_1.fmtSignedCNY)(total),
        totalCls: total >= 0 ? 'pos' : 'neg',
        verifyText: `验证：${a.offerName} ${(0, money_1.fmtCNY)(ya.disposableCash)} → ${b.offerName} ${(0, money_1.fmtCNY)(yb.disposableCash)}`,
        subtitle: `${yearLabel} · ${offerCalculator_1.SCENARIO_LABELS[scenario]}场景 · 可支配现金口径`,
    };
}
function buildReverseVm(offers, policyA, policyB, resA, resB, reverseMode, reverseCustom) {
    var _a;
    const enabled = resA.valid && resB.valid;
    if (!enabled)
        return { enabled: false, state: 'unreachable', line1: '', big: '', line3: '' };
    const custom = parseNum(reverseCustom);
    const target = (reverseMode === 'custom' ? custom !== null && custom !== void 0 ? custom : 20 : Number(reverseMode) || 0) / 100;
    const result = (0, reverseCalculator_1.computeMinSalaryForTarget)(offers[0], policyA, offers[1], policyB, target);
    if (!isFinite(result.currentReal)) {
        return { enabled: true, state: 'nocash', line1: '', big: '', line3: '' };
    }
    const bSalary = (_a = offers[1].monthlySalary) !== null && _a !== void 0 ? _a : 0;
    if (result.reachable && result.minSalary != null) {
        const line3 = result.minSalary <= bSalary
            ? `当前月薪 ${(0, money_1.fmtCNY)(bSalary)}，已能满足目标（当前实际涨幅 ${(0, money_1.fmtPctPlain)(result.currentReal)}）`
            : `当前月薪 ${(0, money_1.fmtCNY)(bSalary)}，还需月薪增加 ${(0, money_1.fmtCNY)(result.minSalary - bSalary)}`;
        return {
            enabled: true,
            state: 'ok',
            line1: `要实现稳定年实际可支配收入提升 ${(0, money_1.fmtPctPlain)(target, 0)}：`,
            big: `${resB.offerName} 月薪至少约 ${(0, money_1.fmtCNY)(result.minSalary)}`,
            line3,
        };
    }
    return { enabled: true, state: 'unreachable', line1: '', big: '', line3: '' };
}
function buildVm(offers, resultSets, resA, resB, policyA, policyB, scenario, yearView, expanded, reverseMode, reverseCustom) {
    const headline = (0, offerCalculator_1.buildHeadline)(resA, resB);
    const metrics = [
        {
            label: '名义涨薪',
            sub: '按税前年收入',
            value: (0, money_1.fmtPct)(headline.nominal),
            cls: headline.nominal >= 0 ? 'neutral' : 'neg',
            hl: false,
        },
        {
            label: '实际可支配收入涨幅',
            sub: '按稳定年可支配现金',
            value: (0, money_1.fmtPct)(headline.real),
            cls: headline.real >= 0 ? 'pos' : 'neg',
            hl: true,
        },
        {
            label: '首年多到手',
            sub: '含签字费等一次性项目',
            value: (0, money_1.fmtSignedCNY)(headline.firstDiff),
            cls: headline.firstDiff >= 0 ? 'pos' : 'neg',
            hl: false,
        },
        {
            label: '稳定年多到手',
            sub: '排除一次性收入与成本',
            value: (0, money_1.fmtSignedCNY)(headline.steadyDiff),
            cls: headline.steadyDiff >= 0 ? 'pos' : 'neg',
            hl: true,
        },
    ];
    const scenarios = ['conservative', 'expected', 'optimistic'];
    const scenarioRows = scenarios.map((s) => {
        const ra = resultSets[s][0];
        const rb = resultSets[s][1];
        return {
            key: s,
            label: offerCalculator_1.SCENARIO_LABELS[s],
            active: scenario === s,
            aText: (0, money_1.fmtWan)(ra.steadyYear.disposableCash),
            bText: (0, money_1.fmtWan)(rb.steadyYear.disposableCash),
        };
    });
    return {
        offerNames: [resA.offerName, resB.offerName],
        colA: `${resA.offerName}（${resA.cityName}）`,
        colB: `${resB.offerName}（${resB.cityName}）`,
        badges: [0, 1].map((i) => {
            var _a;
            const p = (0, cityPolicies_1.getPolicy)(offers[i].cityCode);
            const errors = i === 0 ? resA.errors : resB.errors;
            return {
                hasPolicy: !!p,
                text: p ? `${p.demo ? '演示数据' : '已核验'} · ${p.cityName}` : '无政策数据',
                cityName: (_a = p === null || p === void 0 ? void 0 : p.cityName) !== null && _a !== void 0 ? _a : '',
                tone: p ? (p.demo ? 'badge-amber' : 'badge-green') : 'badge-red',
                salaryInvalid: errors.some((e) => e.includes('月薪')),
            };
        }),
        headline: {
            hasData: headline.hasData,
            title: headline.title,
            explanation: headline.explanation,
            metrics,
        },
        hasResults: resA.valid && resB.valid,
        scenarioRows,
        scenarioNote: (0, offerCalculator_1.buildScenarioNote)(resultSets, resA.offerName, resB.offerName),
        diffTitle: `从「${resA.offerName}」到「${resB.offerName}」，钱差在哪？`,
        wallets: buildWalletsVm(resA, resB, yearView),
        diff: buildDiffVm(resA, resB, yearView, scenario),
        details: buildDetailsVm(resA, resB, yearView, scenario, expanded, policyA, policyB),
        reverse: buildReverseVm(offers, policyA, policyB, resA, resB, reverseMode, reverseCustom),
        policyCards: [0, 1].map((i) => {
            var _a, _b, _c, _d;
            const o = offers[i];
            const p = (0, cityPolicies_1.getPolicy)(o.cityCode);
            return {
                i,
                cityCode: o.cityCode,
                cityName: p ? p.cityName : ((_a = o.cityCustomName) === null || _a === void 0 ? void 0 : _a.trim()) || '其他城市',
                hasPolicy: !!p,
                demo: !!(p === null || p === void 0 ? void 0 : p.demo),
                version: (_b = p === null || p === void 0 ? void 0 : p.version) !== null && _b !== void 0 ? _b : '',
                effectiveDate: (_c = p === null || p === void 0 ? void 0 : p.effectiveDate) !== null && _c !== void 0 ? _c : '',
                updatedAt: (_d = p === null || p === void 0 ? void 0 : p.updatedAt) !== null && _d !== void 0 ? _d : '',
            };
        }),
    };
}
Page({
    data: {
        offers: [],
        draft: [],
        cityLabels: CITY_LABELS,
        monthsOptions: MONTHS_OPTIONS,
        ratioOptions: RATIO_OPTIONS,
        freqOptions: FREQ_OPTIONS,
        durOptions: DUR_OPTIONS,
        certOptions: CERT_OPTIONS,
        subsidyPresets: SUBSIDY_PRESET_LABELS,
        errors: [[], []],
        scenario: 'expected',
        yearView: 'steady',
        expanded: {},
        reverseMode: '10',
        reverseCustom: '20',
        vmReady: false,
        policyNotice: cityPolicies_1.POLICY_DATA_NOTICE,
        vm: null,
    },
    onLoad() {
        this.rebuildAll((0, defaults_1.createDefaultOffers)());
    },
    /** 用给定的 offers 全量重建草稿与结果（载入 / 交换 / 重置 / 切城市时用） */
    rebuildAll(offers) {
        this.setData({
            offers,
            draft: offers.map(buildDraft),
        });
        this.recompute();
    },
    /** 变更 offers[i] 的某个路径后重算；draftPath/draftValue 可同步草稿字段 */
    commitEdit(i, modelPath, modelValue, draftPath, draftValue) {
        const update = {};
        if (modelPath != null) {
            const offers = this.data.offers.slice();
            offers[i] = setPath(offers[i], modelPath, modelValue);
            update[`offers.${i}`] = offers[i];
        }
        if (draftPath != null)
            update[`draft.${i}.${draftPath}`] = draftValue;
        this.setData(update);
        this.recompute();
    },
    recompute() {
        const { offers, scenario, yearView, expanded, reverseMode, reverseCustom } = this.data;
        const policyA = (0, cityPolicies_1.getPolicy)(offers[0].cityCode);
        const policyB = (0, cityPolicies_1.getPolicy)(offers[1].cityCode);
        const scenarios = ['conservative', 'expected', 'optimistic'];
        const resultSets = {};
        for (const s of scenarios) {
            resultSets[s] = [
                (0, offerCalculator_1.computeOfferResult)(offers[0], policyA, s),
                (0, offerCalculator_1.computeOfferResult)(offers[1], policyB, s),
            ];
        }
        const resA = resultSets[scenario][0];
        const resB = resultSets[scenario][1];
        const vm = buildVm(offers, resultSets, resA, resB, policyA, policyB, scenario, yearView, expanded, reverseMode, reverseCustom);
        this.setData({
            errors: [resA.errors, resB.errors],
            vmReady: true,
            vm,
        });
    },
    /* -------- 文本 / 数字输入（data-i + data-path 模型路径 + data-dp 草稿路径） -------- */
    onTextInput(e) {
        var _a;
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const path = String(ds.path);
        const dp = String((_a = ds.dp) !== null && _a !== void 0 ? _a : path);
        const v = e.detail.value;
        this.commitEdit(i, path, v, dp, v);
    },
    onNumInput(e) {
        var _a;
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const path = String(ds.path);
        const dp = String((_a = ds.dp) !== null && _a !== void 0 ? _a : path);
        const raw = e.detail.value;
        this.commitEdit(i, path, parseNum(raw), dp, raw);
    },
    /** 百分比输入（模型存小数）：data-f 草稿 rates 键，data-mp 模型路径 */
    onRateInput(e) {
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const f = String(ds.f);
        const mp = String(ds.mp);
        const raw = e.detail.value;
        const n = parseNum(raw);
        this.commitEdit(i, mp, n == null ? null : n / 100, `rates.${f}`, raw);
    },
    onMonthsCustom(e) {
        const raw = e.detail.value;
        const n = parseIntOrNull(raw);
        const v = n == null ? 12 : Math.max(1, n);
        this.commitEdit(Number(e.currentTarget.dataset.i), 'fixedSalaryMonths', v, 'monthsCustom', raw);
    },
    onProbationMonths(e) {
        const raw = e.detail.value;
        const n = parseIntOrNull(raw);
        const v = n == null ? 0 : Math.max(0, n);
        this.commitEdit(Number(e.currentTarget.dataset.i), 'probation.months', v, 'probationMonths', raw);
    },
    onRatioCustom(e) {
        const raw = e.detail.value;
        const n = parseNum(raw);
        const v = n == null ? 0.9 : n / 100;
        this.commitEdit(Number(e.currentTarget.dataset.i), 'probation.salaryRatio', v, 'ratioCustom', raw);
    },
    /* -------- 选择器 -------- */
    onCityPick(e) {
        var _a;
        const i = Number(e.currentTarget.dataset.i);
        const idx = Number(e.detail.value);
        const code = (_a = CITY_VALUES[idx]) !== null && _a !== void 0 ? _a : 'custom';
        const offers = this.data.offers.slice();
        const prev = offers[i];
        const next = Object.assign(Object.assign({}, prev), { cityCode: code, cityCustomName: code === 'custom' ? prev.cityCustomName || '' : '', socialInsurance: Object.assign({ useCityDefault: code !== 'custom', pensionBase: null, medicalBase: null, unemploymentBase: null }, (code === 'custom'
                ? {
                    pensionRates: { employee: null, employer: null },
                    medicalRates: { employee: null, employer: null },
                    unemploymentRates: { employee: null, employer: null },
                }
                : {})), housingFund: { base: null, employeeRate: null, employerRate: null } });
        offers[i] = next;
        const draft = this.data.draft.slice();
        draft[i] = buildDraft(next);
        this.setData({ [`offers.${i}`]: next, [`draft.${i}`]: draft[i] });
        this.recompute();
    },
    onMonthsPick(e) {
        var _a;
        const i = Number(e.currentTarget.dataset.i);
        const idx = Number(e.detail.value);
        const mode = (_a = MONTHS_VALUES[idx]) !== null && _a !== void 0 ? _a : '12';
        const monthsIndex = Math.max(0, MONTHS_VALUES.indexOf(mode));
        const updates = {
            [`draft.${i}.monthsIndex`]: monthsIndex,
            [`draft.${i}.monthsMode`]: mode,
            [`draft.${i}.monthsLabel`]: MONTHS_OPTIONS[monthsIndex],
        };
        if (mode !== 'custom') {
            const offers = this.data.offers.slice();
            offers[i] = setPath(offers[i], 'fixedSalaryMonths', Number(mode));
            updates[`offers.${i}`] = offers[i];
        }
        else {
            updates[`draft.${i}.monthsCustom`] = numStr(this.data.offers[i].fixedSalaryMonths);
        }
        this.setData(updates);
        this.recompute();
    },
    onRatioPick(e) {
        var _a;
        const i = Number(e.currentTarget.dataset.i);
        const idx = Number(e.detail.value);
        const mode = (_a = RATIO_VALUES[idx]) !== null && _a !== void 0 ? _a : '1';
        const ratioIndex = Math.max(0, RATIO_VALUES.indexOf(mode));
        const updates = {
            [`draft.${i}.ratioIndex`]: ratioIndex,
            [`draft.${i}.ratioMode`]: mode,
            [`draft.${i}.ratioLabel`]: RATIO_OPTIONS[ratioIndex],
        };
        if (mode !== 'custom') {
            const offers = this.data.offers.slice();
            offers[i] = setPath(offers[i], 'probation.salaryRatio', Number(mode));
            updates[`offers.${i}`] = offers[i];
        }
        else {
            updates[`draft.${i}.ratioCustom`] = pctStr(this.data.offers[i].probation.salaryRatio) || '90';
        }
        this.setData(updates);
        this.recompute();
    },
    onHfRatePick(e) {
        var _a, _b;
        const i = Number(e.currentTarget.dataset.i);
        const idx = Number(e.detail.value);
        const draft = this.data.draft[i];
        const value = (_a = draft.hfRateValues[idx]) !== null && _a !== void 0 ? _a : 'default';
        const offers = this.data.offers.slice();
        if (value === 'default') {
            offers[i] = setPath(offers[i], 'housingFund', Object.assign(Object.assign({}, offers[i].housingFund), { employeeRate: null, employerRate: null }));
        }
        else {
            const rate = Number(value) / 100;
            offers[i] = setPath(offers[i], 'housingFund', Object.assign(Object.assign({}, offers[i].housingFund), { employeeRate: rate, employerRate: rate }));
        }
        this.setData({
            [`offers.${i}`]: offers[i],
            [`draft.${i}.hfRateIndex`]: idx,
            [`draft.${i}.hfRateLabel`]: (_b = draft.hfRateOptions[idx]) !== null && _b !== void 0 ? _b : '',
        });
        this.recompute();
    },
    /* -------- 开关与分段 -------- */
    onBonusModeTap(e) {
        const i = Number(e.currentTarget.dataset.i);
        const mode = String(e.currentTarget.dataset.mode);
        this.commitEdit(i, 'fixedBonus', Object.assign(Object.assign({}, this.data.offers[i].fixedBonus), { mode }), 'bonusMode', mode);
    },
    onVbToggleTap(e) {
        const i = Number(e.currentTarget.dataset.i);
        const next = !this.data.offers[i].hasVariableBonus;
        this.commitEdit(i, 'hasVariableBonus', next, 'hasVariableBonus', next);
    },
    onVbModeTap(e) {
        const i = Number(e.currentTarget.dataset.i);
        const mode = String(e.currentTarget.dataset.mode);
        const vb = this.data.offers[i].variableBonus;
        this.commitEdit(i, 'variableBonus', {
            conservative: Object.assign(Object.assign({}, vb.conservative), { mode }),
            expected: Object.assign(Object.assign({}, vb.expected), { mode }),
            optimistic: Object.assign(Object.assign({}, vb.optimistic), { mode }),
        }, 'vbMode', mode);
    },
    onSiModeTap(e) {
        const i = Number(e.currentTarget.dataset.i);
        const useCityDefault = String(e.currentTarget.dataset.v) === '1';
        this.commitEdit(i, 'socialInsurance', Object.assign(Object.assign({}, this.data.offers[i].socialInsurance), { useCityDefault }), 'useCityDefault', useCityDefault);
    },
    /* -------- 补贴 -------- */
    onSubsidyAdd(e) {
        const i = Number(e.currentTarget.dataset.i);
        const preset = SUBSIDY_PRESETS[Number(e.currentTarget.dataset.p)];
        if (!preset)
            return;
        const subsidy = Object.assign(Object.assign({}, preset), { id: (0, defaults_1.newSubsidyId)(), amount: null });
        const offers = this.data.offers.slice();
        offers[i] = setPath(offers[i], 'subsidies', [...offers[i].subsidies, subsidy]);
        const draft = this.data.draft.slice();
        draft[i] = setPath(draft[i], 'subsidies', [...draft[i].subsidies, buildDraftSubsidy(subsidy)]);
        this.setData({ [`offers.${i}`]: offers[i], [`draft.${i}`]: draft[i] });
        this.recompute();
    },
    onSubsidyName(e) {
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const si = Number(ds.si);
        const v = e.detail.value;
        this.commitEdit(i, `subsidies.${si}.name`, v, `subsidies.${si}.name`, v);
    },
    onSubsidyAmount(e) {
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const si = Number(ds.si);
        const raw = e.detail.value;
        this.commitEdit(i, `subsidies.${si}.amount`, parseNum(raw), `subsidies.${si}.amount`, raw);
    },
    onSubsidyFreqPick(e) {
        var _a, _b;
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const si = Number(ds.si);
        const idx = Number(e.detail.value);
        const v = (_a = FREQ_VALUES[idx]) !== null && _a !== void 0 ? _a : 'monthly';
        const offers = this.data.offers.slice();
        offers[i] = setPath(offers[i], `subsidies.${si}.frequency`, v);
        this.setData({
            [`offers.${i}`]: offers[i],
            [`draft.${i}.subsidies.${si}.freqIndex`]: idx,
            [`draft.${i}.subsidies.${si}.freqLabel`]: (_b = FREQ_OPTIONS[idx]) !== null && _b !== void 0 ? _b : '',
        });
        this.recompute();
    },
    onSubsidyDurPick(e) {
        var _a, _b;
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const si = Number(ds.si);
        const idx = Number(e.detail.value);
        const v = (_a = DUR_VALUES[idx]) !== null && _a !== void 0 ? _a : 'firstYearOnly';
        const offers = this.data.offers.slice();
        offers[i] = setPath(offers[i], `subsidies.${si}.duration`, v);
        this.setData({
            [`offers.${i}`]: offers[i],
            [`draft.${i}.subsidies.${si}.durIndex`]: idx,
            [`draft.${i}.subsidies.${si}.durLabel`]: (_b = DUR_OPTIONS[idx]) !== null && _b !== void 0 ? _b : '',
        });
        this.recompute();
    },
    onSubsidyCertPick(e) {
        var _a, _b;
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const si = Number(ds.si);
        const idx = Number(e.detail.value);
        const v = (_a = CERT_VALUES[idx]) !== null && _a !== void 0 ? _a : 'confirmed';
        const offers = this.data.offers.slice();
        offers[i] = setPath(offers[i], `subsidies.${si}.certainty`, v);
        this.setData({
            [`offers.${i}`]: offers[i],
            [`draft.${i}.subsidies.${si}.certIndex`]: idx,
            [`draft.${i}.subsidies.${si}.certLabel`]: (_b = CERT_OPTIONS[idx]) !== null && _b !== void 0 ? _b : '',
        });
        this.recompute();
    },
    onSubsidyYears(e) {
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const si = Number(ds.si);
        const raw = e.detail.value;
        const n = parseIntOrNull(raw);
        const v = n == null ? 1 : Math.max(1, n);
        this.commitEdit(i, `subsidies.${si}.durationYears`, v, `subsidies.${si}.durationYears`, raw);
    },
    onSubsidyIncludedTap(e) {
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const si = Number(ds.si);
        const s = this.data.offers[i].subsidies[si];
        if (!s || s.certainty !== 'possible')
            return;
        const next = !s.included;
        this.commitEdit(i, `subsidies.${si}.included`, next, `subsidies.${si}.included`, next);
    },
    onSubsidyRemove(e) {
        const ds = e.currentTarget.dataset;
        const i = Number(ds.i);
        const si = Number(ds.si);
        const offers = this.data.offers.slice();
        offers[i] = setPath(offers[i], 'subsidies', offers[i].subsidies.filter((_, k) => k !== si));
        const draft = this.data.draft.slice();
        draft[i] = setPath(draft[i], 'subsidies', draft[i].subsidies.filter((_, k) => k !== si));
        this.setData({ [`offers.${i}`]: offers[i], [`draft.${i}`]: draft[i] });
        this.recompute();
    },
    /* -------- 顶栏动作 -------- */
    onSwap() {
        const offers = this.data.offers;
        this.rebuildAll([(0, defaults_1.cloneOffers)([offers[1]])[0], (0, defaults_1.cloneOffers)([offers[0]])[0]]);
    },
    onReset() {
        this.rebuildAll((0, defaults_1.createDefaultOffers)());
    },
    /* -------- 结果区交互 -------- */
    onScenarioTap(e) {
        const s = String(e.currentTarget.dataset.s);
        if (s !== 'conservative' && s !== 'expected' && s !== 'optimistic')
            return;
        this.setData({ scenario: s });
        this.recompute();
    },
    onYearTap(e) {
        const y = String(e.currentTarget.dataset.y);
        if (y !== 'first' && y !== 'steady')
            return;
        this.setData({ yearView: y });
        this.recompute();
    },
    onDetailToggle(e) {
        const key = String(e.currentTarget.dataset.key);
        const cur = !!this.data.expanded[key];
        this.setData({ [`expanded.${key}`]: !cur });
        this.recompute();
    },
    onReverseModeTap(e) {
        this.setData({ reverseMode: String(e.currentTarget.dataset.v) });
        this.recompute();
    },
    onReverseCustom(e) {
        this.setData({ reverseCustom: e.detail.value });
        this.recompute();
    },
    onGoResults() {
        const q = tt.createSelectorQuery();
        q.selectViewport().scrollOffset();
        q.select('#results').boundingClientRect();
        q.exec((res) => {
            const offset = res && res[0];
            const rect = res && res[1];
            if (offset && rect) {
                tt.pageScrollTo({ scrollTop: Math.max(0, offset.scrollTop + rect.top - 12), duration: 300 });
            }
            else {
                tt.pageScrollTo({ scrollTop: 999999, duration: 300 });
            }
        });
    },
    onOpenPolicy(e) {
        var _a;
        const city = String((_a = e.currentTarget.dataset.city) !== null && _a !== void 0 ? _a : '');
        tt.navigateTo({ url: `/pages/policy/policy?cityCode=${encodeURIComponent(city)}` });
    },
    onCopyLink(e) {
        var _a;
        const url = String((_a = e.currentTarget.dataset.url) !== null && _a !== void 0 ? _a : '');
        if (!url)
            return;
        tt.setClipboardData({ data: url });
        tt.showToast({ title: '已复制链接', icon: 'none' });
    },
});
