"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** 个税计算器（小程序版）：累计预扣法，简易 / 逐月双模式 + 年终奖两种计税方式对比 */
const cumulativeTaxCalculator_1 = require("../../engine/utils/cumulativeTaxCalculator");
const toolboxFormat_1 = require("../../utils/toolboxFormat");
const money_1 = require("../../engine/utils/money");
const toolboxStorage_1 = require("../../utils/toolboxStorage");
const taxPolicy_1 = require("../../engine/config/taxPolicy");
/** 每次返回全新对象，避免 Page data 与常量共享引用被 setData 路径更新污染 */
function defaultPersist() {
    return {
        mode: 'simple',
        uptoMonth: new Date().getMonth() + 1,
        draft: { salary: '20000', si: '', hf: '', special: '', other: '', bonus: '' },
        monthlyDraft: [],
    };
}
function parseNum(raw) {
    const t = String(raw == null ? '' : raw).trim();
    if (!t)
        return null;
    const n = Number(t);
    return isFinite(n) ? n : null;
}
function buildMonths(p) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const upto = Math.min(12, Math.max(1, Math.round(p.uptoMonth || 1)));
    if (p.mode === 'simple') {
        const salary = (_a = parseNum(p.draft.salary)) !== null && _a !== void 0 ? _a : 0;
        const si = (_b = parseNum(p.draft.si)) !== null && _b !== void 0 ? _b : 0;
        const hf = (_c = parseNum(p.draft.hf)) !== null && _c !== void 0 ? _c : 0;
        const special = (_d = parseNum(p.draft.special)) !== null && _d !== void 0 ? _d : 0;
        const other = (_e = parseNum(p.draft.other)) !== null && _e !== void 0 ? _e : 0;
        return Array.from({ length: upto }, (_, i) => ({
            month: i + 1,
            salary,
            socialInsurance: si,
            housingFund: hf,
            specialDeduction: special,
            otherDeduction: other,
        }));
    }
    const globalDeduction = ((_f = parseNum(p.draft.si)) !== null && _f !== void 0 ? _f : 0) +
        ((_g = parseNum(p.draft.hf)) !== null && _g !== void 0 ? _g : 0) +
        ((_h = parseNum(p.draft.special)) !== null && _h !== void 0 ? _h : 0) +
        ((_j = parseNum(p.draft.other)) !== null && _j !== void 0 ? _j : 0);
    return Array.from({ length: upto }, (_, i) => {
        var _a, _b, _c, _d, _e;
        const row = p.monthlyDraft[i];
        return {
            month: i + 1,
            salary: (_c = (_b = parseNum((_a = row === null || row === void 0 ? void 0 : row.salary) !== null && _a !== void 0 ? _a : '')) !== null && _b !== void 0 ? _b : parseNum(p.draft.salary)) !== null && _c !== void 0 ? _c : 0,
            socialInsurance: 0,
            housingFund: 0,
            specialDeduction: (_e = parseNum((_d = row === null || row === void 0 ? void 0 : row.deduction) !== null && _d !== void 0 ? _d : '')) !== null && _e !== void 0 ? _e : globalDeduction,
            otherDeduction: 0,
        };
    });
}
Page({
    data: Object.assign(Object.assign({}, defaultPersist()), { showDetails: false, bonusPolicyNote: taxPolicy_1.BONUS_POLICY_NOTE, simulationNote: taxPolicy_1.TAX_SIMULATION_NOTE, vm: null }),
    onLoad() {
        const saved = (0, toolboxStorage_1.loadStore)('tax.v1', null);
        if (saved && saved.draft) {
            const rows = Array.isArray(saved.monthlyDraft) ? saved.monthlyDraft.slice(0, 12) : [];
            while (rows.length < 12)
                rows.push({ salary: '', deduction: '' });
            this.setData({
                mode: saved.mode === 'monthly' ? 'monthly' : 'simple',
                uptoMonth: saved.uptoMonth,
                draft: saved.draft,
                monthlyDraft: rows,
            });
        }
        else {
            const rows = [];
            for (let i = 0; i < 12; i++)
                rows.push({ salary: '', deduction: '' });
            this.setData({ monthlyDraft: rows });
        }
        this.recompute();
    },
    persist() {
        const { mode, uptoMonth, draft, monthlyDraft } = this.data;
        (0, toolboxStorage_1.saveStore)('tax.v1', { mode, uptoMonth, draft, monthlyDraft });
    },
    recompute() {
        var _a, _b, _c, _d, _e, _f, _g;
        const p = {
            mode: this.data.mode,
            uptoMonth: this.data.uptoMonth,
            draft: this.data.draft,
            monthlyDraft: this.data.monthlyDraft,
        };
        const months = buildMonths(p);
        const result = (0, cumulativeTaxCalculator_1.simulateWithholding)(months);
        const currentRow = result.rows[result.rows.length - 1];
        const siHf = p.mode === 'simple'
            ? ((_a = parseNum(p.draft.si)) !== null && _a !== void 0 ? _a : 0) + ((_b = parseNum(p.draft.hf)) !== null && _b !== void 0 ? _b : 0)
            : NaN;
        let bonusCmp = null;
        const bonus = (_c = parseNum(p.draft.bonus)) !== null && _c !== void 0 ? _c : 0;
        if (bonus > 0) {
            const cmp = (0, cumulativeTaxCalculator_1.compareBonusMethods)(result.annual.tax, result.annual.taxable, bonus);
            bonusCmp = {
                sepAnnualText: (0, money_1.fmtCNY)(cmp.annualTaxWithSeparate),
                combAnnualText: (0, money_1.fmtCNY)(cmp.annualTaxWithCombined),
                sepTaxText: (0, money_1.fmtCNY)(cmp.bonusTaxSeparate),
                combTaxText: (0, money_1.fmtCNY)(cmp.bonusTaxCombined),
                savingText: cmp.savingIfSeparate >= 0
                    ? `本例「单独计税」更划算：全年少缴 ${(0, money_1.fmtCNY)(cmp.savingIfSeparate)} 个税。`
                    : `本例「并入综合所得」更划算：全年少缴 ${(0, money_1.fmtCNY)(-cmp.savingIfSeparate)} 个税。`,
                sepBetter: cmp.savingIfSeparate >= 0,
            };
        }
        this.setData({
            vm: {
                heroLabel: `${months.length} 月预计到手工资`,
                heroNet: (0, toolboxFormat_1.money2)((_d = currentRow === null || currentRow === void 0 ? void 0 : currentRow.netSalary) !== null && _d !== void 0 ? _d : 0),
                heroSub: `当月预计个税 ${(0, toolboxFormat_1.money2)((_e = currentRow === null || currentRow === void 0 ? void 0 : currentRow.taxWithheld) !== null && _e !== void 0 ? _e : 0)} · 税前 ${(0, toolboxFormat_1.money2)((_f = currentRow === null || currentRow === void 0 ? void 0 : currentRow.salary) !== null && _f !== void 0 ? _f : 0)}`,
                taxText: (0, toolboxFormat_1.money2)((_g = currentRow === null || currentRow === void 0 ? void 0 : currentRow.taxWithheld) !== null && _g !== void 0 ? _g : 0),
                siHfText: isFinite(siHf) ? `${(0, money_1.fmtCNY)(siHf, 2)} / 月` : '逐月模式按行填写',
                annualIncomeText: (0, money_1.fmtCNY)(result.annual.income),
                annualTaxText: (0, money_1.fmtCNY)(result.annual.tax),
                annualNetText: (0, money_1.fmtCNY)(result.annual.net),
                rows: result.rows.map((r) => ({
                    month: r.month,
                    salaryText: (0, money_1.fmtCNY)(r.salary),
                    taxText: (0, toolboxFormat_1.money2)(r.taxWithheld),
                    netText: (0, toolboxFormat_1.money2)(r.netSalary),
                })),
                bonusCmp,
            },
        });
    },
    onModeTap(e) {
        const mode = String(e.currentTarget.dataset.mode) === 'monthly' ? 'monthly' : 'simple';
        this.setData({ mode });
        this.persist();
        this.recompute();
    },
    onMonthTap(e) {
        const m = Number(e.currentTarget.dataset.m);
        if (!(m >= 1 && m <= 12))
            return;
        this.setData({ uptoMonth: m });
        this.persist();
        this.recompute();
    },
    onFieldInput(e) {
        const f = String(e.currentTarget.dataset.f);
        const raw = e.detail.value;
        if (!(f in this.data.draft))
            return;
        this.setData({ [`draft.${f}`]: raw });
        this.persist();
        this.recompute();
    },
    onMonthlyInput(e) {
        var _a;
        const i = Number(e.currentTarget.dataset.i);
        const f = String(e.currentTarget.dataset.f);
        const raw = e.detail.value;
        if (!(f === 'salary' || f === 'deduction'))
            return;
        const monthlyDraft = this.data.monthlyDraft.slice();
        const cur = (_a = monthlyDraft[i]) !== null && _a !== void 0 ? _a : { salary: '', deduction: '' };
        monthlyDraft[i] = f === 'salary' ? Object.assign(Object.assign({}, cur), { salary: raw }) : Object.assign(Object.assign({}, cur), { deduction: raw });
        this.setData({ monthlyDraft });
        this.persist();
        this.recompute();
    },
    onToggleDetails() {
        this.setData({ showDetails: !this.data.showDetails });
    },
    onReset() {
        (0, toolboxStorage_1.removeStore)('tax.v1');
        this.setData(Object.assign(Object.assign({}, defaultPersist()), { showDetails: false }));
        this.recompute();
    },
});
