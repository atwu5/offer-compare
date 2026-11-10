"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** 时薪计算器（小程序版）：时/分/秒/日薪 + 反向计算 + 可选按秒收入计数器 */
const hourlyWageCalculator_1 = require("../../engine/utils/hourlyWageCalculator");
const money_1 = require("../../engine/utils/money");
const toolboxFormat_1 = require("../../utils/toolboxFormat");
const toolboxStorage_1 = require("../../utils/toolboxStorage");
/** 每次返回全新对象，避免 Page data 与常量共享引用被 setData 路径更新污染 */
function defaultPersist() {
    return {
        draft: { monthly: '', bonus: '', days: '5', hours: '8', weeks: '52', annualDays: '250' },
        useAnnualDays: false,
        basis: 'gross',
    };
}
function parseNum(raw) {
    const t = String(raw == null ? '' : raw).trim();
    if (!t)
        return null;
    const n = Number(t);
    return isFinite(n) ? n : null;
}
Page({
    data: Object.assign(Object.assign({}, defaultPersist()), { vm: null, error: '', reverseOn: false, reverseTarget: '', reverseVm: null, reverseError: '', counterOn: false, counterEarnedText: (0, toolboxFormat_1.money2)(0) }),
    onLoad() {
        const saved = (0, toolboxStorage_1.loadStore)('wage.v1', null);
        if (saved && saved.draft) {
            this.setData({
                draft: saved.draft,
                useAnnualDays: !!saved.useAnnualDays,
                basis: saved.basis === 'net' ? 'net' : 'gross',
            });
        }
        this.recompute();
    },
    persist() {
        (0, toolboxStorage_1.saveStore)('wage.v1', {
            draft: this.data.draft,
            useAnnualDays: this.data.useAnnualDays,
            basis: this.data.basis,
        });
    },
    recompute() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const d = this.data.draft;
        const result = (0, hourlyWageCalculator_1.calcHourlyWage)({
            monthlyIncome: parseNum(d.monthly),
            annualBonus: parseNum(d.bonus),
            daysPerWeek: (_a = parseNum(d.days)) !== null && _a !== void 0 ? _a : 5,
            hoursPerDay: (_b = parseNum(d.hours)) !== null && _b !== void 0 ? _b : 8,
            paidWeeksPerYear: (_c = parseNum(d.weeks)) !== null && _c !== void 0 ? _c : 52,
            useAnnualDays: this.data.useAnnualDays,
            annualWorkDays: (_d = parseNum(d.annualDays)) !== null && _d !== void 0 ? _d : 250,
            basis: this.data.basis,
        });
        if (result.valid) {
            this.setData({
                error: '',
                vm: {
                    hourlyText: (0, toolboxFormat_1.money2)(result.hourly),
                    hourlySub: `按全年工作 ${(0, toolboxFormat_1.fmtInt)(result.annualHours)} 小时折算`,
                    perMinuteText: `¥${(0, toolboxFormat_1.fmtRate)(result.perMinute)}`,
                    perSecondText: `¥${(0, toolboxFormat_1.fmtRate)(result.perSecond)}`,
                    perDayText: (0, toolboxFormat_1.money2)(result.perDay),
                    annualIncomeText: (0, money_1.fmtCNY)(result.annualIncome),
                    annualHoursText: `${(0, toolboxFormat_1.fmtInt)(result.annualHours)} 小时`,
                    annualDaysText: `${(0, toolboxFormat_1.fmtInt)(result.annualWorkDays)} 天`,
                },
            });
        }
        else {
            this.setData({ vm: null, error: (_e = result.error) !== null && _e !== void 0 ? _e : '请先填写月收入' });
        }
        // 反向计算联动
        if (this.data.reverseOn) {
            const rev = (0, hourlyWageCalculator_1.reverseMonthlyIncome)(parseNum(this.data.reverseTarget), {
                daysPerWeek: (_f = parseNum(d.days)) !== null && _f !== void 0 ? _f : 5,
                hoursPerDay: (_g = parseNum(d.hours)) !== null && _g !== void 0 ? _g : 8,
                paidWeeksPerYear: (_h = parseNum(d.weeks)) !== null && _h !== void 0 ? _h : 52,
                useAnnualDays: this.data.useAnnualDays,
                annualWorkDays: (_j = parseNum(d.annualDays)) !== null && _j !== void 0 ? _j : 250,
            }, (_k = parseNum(d.bonus)) !== null && _k !== void 0 ? _k : 0);
            if (rev.valid) {
                this.setData({ reverseVm: { annualText: (0, money_1.fmtCNY)(rev.annualIncome), monthlyText: (0, toolboxFormat_1.money2)(rev.monthlyIncome) }, reverseError: '' });
            }
            else {
                this.setData({ reverseVm: null, reverseError: (_l = rev.error) !== null && _l !== void 0 ? _l : '' });
            }
        }
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
    onUseAnnualDaysTap() {
        this.setData({ useAnnualDays: !this.data.useAnnualDays });
        this.persist();
        this.recompute();
    },
    onBasisTap(e) {
        const v = String(e.currentTarget.dataset.v) === 'net' ? 'net' : 'gross';
        this.setData({ basis: v });
        this.persist();
    },
    onReverseToggle() {
        const on = !this.data.reverseOn;
        this.setData({ reverseOn: on });
        if (on)
            this.recompute();
    },
    onReverseTargetInput(e) {
        this.setData({ reverseTarget: e.detail.value });
        this.recompute();
    },
    onCounterToggle() {
        if (this.data.counterOn) {
            this.stopCounter();
            return;
        }
        if (!this.data.vm)
            return;
        this.setData({ counterOn: true, counterEarnedText: (0, toolboxFormat_1.money2)(0) });
        const timer = setInterval(() => {
            var _a, _b, _c, _d;
            // 每秒累计当前秒薪；perSecond 从 vm 中取不不出来，这里用反向解法：直接重算
            const d = this.data.draft;
            const r = (0, hourlyWageCalculator_1.calcHourlyWage)({
                monthlyIncome: parseNum(d.monthly),
                annualBonus: parseNum(d.bonus),
                daysPerWeek: (_a = parseNum(d.days)) !== null && _a !== void 0 ? _a : 5,
                hoursPerDay: (_b = parseNum(d.hours)) !== null && _b !== void 0 ? _b : 8,
                paidWeeksPerYear: (_c = parseNum(d.weeks)) !== null && _c !== void 0 ? _c : 52,
                useAnnualDays: this.data.useAnnualDays,
                annualWorkDays: (_d = parseNum(d.annualDays)) !== null && _d !== void 0 ? _d : 250,
                basis: this.data.basis,
            });
            if (!r.valid)
                return;
            const current = Number(String(this.data.counterEarnedText).replace(/[^\d.]/g, '')) || 0;
            this.setData({ counterEarnedText: (0, toolboxFormat_1.money2)(current + r.perSecond) });
        }, 1000);
        this._counterTimer = timer;
    },
    stopCounter() {
        if (this._counterTimer) {
            clearInterval(this._counterTimer);
            this._counterTimer = null;
        }
        this.setData({ counterOn: false, counterEarnedText: (0, toolboxFormat_1.money2)(0) });
    },
    onUnload() {
        if (this._counterTimer)
            clearInterval(this._counterTimer);
    },
    onHide() {
        if (this._counterTimer) {
            clearInterval(this._counterTimer);
            this._counterTimer = null;
            this.setData({ counterOn: false, counterEarnedText: (0, toolboxFormat_1.money2)(0) });
        }
    },
    onReset() {
        this.stopCounter();
        (0, toolboxStorage_1.removeStore)('wage.v1');
        this.setData(Object.assign(Object.assign({}, defaultPersist()), { reverseOn: false, reverseTarget: '', reverseVm: null, reverseError: '' }));
        this.recompute();
    },
});
