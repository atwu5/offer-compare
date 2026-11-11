"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** 退休倒计时（小程序版）：出生日期 + 自定义退休年龄；法定退休模式待完善不开放 */
const retirementCalculator_1 = require("../../engine/utils/retirementCalculator");
const dateMath_1 = require("../../engine/utils/dateMath");
const toolboxStorage_1 = require("../../utils/toolboxStorage");
function parseNum(raw) {
    const t = String(raw == null ? '' : raw).trim();
    if (!t)
        return null;
    const n = Number(t);
    return isFinite(n) ? n : null;
}
Page({
    data: {
        birth: '',
        ageDraft: '60',
        todayStr: (0, dateMath_1.formatYMD)((0, dateMath_1.ymdOfLocal)(new Date())),
        vm: null,
        error: '',
    },
    onLoad() {
        var _a, _b;
        const saved = (0, toolboxStorage_1.loadStore)('retire.v1', null);
        if (saved) {
            this.setData({ birth: (_a = saved.birth) !== null && _a !== void 0 ? _a : '', ageDraft: (_b = saved.ageDraft) !== null && _b !== void 0 ? _b : '60' });
        }
        this.recompute();
    },
    persist() {
        (0, toolboxStorage_1.saveStore)('retire.v1', { birth: this.data.birth, ageDraft: this.data.ageDraft });
    },
    recompute() {
        var _a, _b;
        const birth = this.data.birth;
        if (!birth) {
            this.setData({ vm: null, error: '' });
            return;
        }
        const age = (_a = parseNum(this.data.ageDraft)) !== null && _a !== void 0 ? _a : 60;
        const r = (0, retirementCalculator_1.calcRetirement)({ birth, retireAge: age }, (0, dateMath_1.ymdOfLocal)(new Date()));
        if (!r.valid) {
            this.setData({ vm: null, error: (_b = r.error) !== null && _b !== void 0 ? _b : '请检查输入' });
            return;
        }
        this.setData({
            error: '',
            vm: {
                exceeded: r.exceeded,
                heroLabel: r.exceeded ? '已到达预计退休日期' : '距离退休还有',
                heroValue: r.exceeded ? `已过 ${r.daysPast} 天` : `${r.daysUntil} 天`,
                heroSub: r.exceeded
                    ? `预计退休日期：${(0, dateMath_1.formatCN)(r.retireDate)}（按退休年龄 ${age} 岁计算）`
                    : r.ymd.years > 0 || r.ymd.months > 0
                        ? `约 ${r.ymd.years} 年 ${r.ymd.months} 个月 ${r.ymd.days} 天`
                        : '就在眼前啦',
                retireDateText: (0, dateMath_1.formatCN)(r.retireDate),
                ymdText: r.exceeded
                    ? `已退休 ${r.ymd.years} 年 ${r.ymd.months} 月 ${r.ymd.days} 天`
                    : `${r.ymd.years} 年 ${r.ymd.months} 月 ${r.ymd.days} 天`,
                progressPct: Math.round(r.progressPct * 10) / 10,
                ageText: `${age} 岁`,
            },
        });
    },
    onDatePick(e) {
        const v = String(e.detail.value);
        this.setData({ birth: v });
        this.persist();
        this.recompute();
    },
    onAgeInput(e) {
        const cleaned = e.detail.value.replace(/[^\d]/g, '').slice(0, 3);
        this.setData({ ageDraft: cleaned });
        this.persist();
        this.recompute();
    },
    onReset() {
        (0, toolboxStorage_1.removeStore)('retire.v1');
        this.setData({ birth: '', ageDraft: '60' });
        this.recompute();
    },
});
