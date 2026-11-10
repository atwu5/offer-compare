"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** 出生天数（小程序版）：自然日口径 + 周岁/周数/下次生日/里程碑 + 可选真实时分差 */
const daysAliveCalculator_1 = require("../../engine/utils/daysAliveCalculator");
const dateMath_1 = require("../../engine/utils/dateMath");
const toolboxFormat_1 = require("../../utils/toolboxFormat");
const toolboxStorage_1 = require("../../utils/toolboxStorage");
Page({
    data: {
        birth: '',
        time: '',
        leapPref: 'day28',
        todayStr: (0, dateMath_1.formatYMD)((0, dateMath_1.ymdOfLocal)(new Date())),
        isFeb29: false,
        vm: null,
        error: '',
    },
    onLoad() {
        var _a, _b;
        const saved = (0, toolboxStorage_1.loadStore)('days.v1', null);
        if (saved) {
            this.setData({
                birth: (_a = saved.birth) !== null && _a !== void 0 ? _a : '',
                time: (_b = saved.time) !== null && _b !== void 0 ? _b : '',
                leapPref: saved.leapPref === 'mar1' ? 'mar1' : 'day28',
            });
        }
        this.recompute();
    },
    persist() {
        (0, toolboxStorage_1.saveStore)('days.v1', {
            birth: this.data.birth,
            time: this.data.time,
            leapPref: this.data.leapPref,
        });
    },
    recompute() {
        var _a, _b, _c;
        const { birth, time, leapPref } = this.data;
        if (!birth) {
            this.setData({ vm: null, error: '', isFeb29: false });
            return;
        }
        const r = (0, daysAliveCalculator_1.calcDaysAlive)({ birth, birthTime: time, leapPref }, (0, dateMath_1.ymdOfLocal)(new Date()), Date.now());
        if (!r.valid) {
            this.setData({ vm: null, error: (_a = r.error) !== null && _a !== void 0 ? _a : '请检查输入', isFeb29: false });
            return;
        }
        const nb = r.nextBirthday;
        this.setData({
            error: '',
            isFeb29: r.birth.month === 2 && r.birth.day === 29,
            vm: {
                daysText: (0, toolboxFormat_1.fmtInt)(r.daysElapsed),
                ordinalText: r.daysElapsed === 0 ? '今天是来到世界的第 1 天 🎂' : `今天是来到世界的第 ${(0, toolboxFormat_1.fmtInt)(r.dayOrdinal)} 天`,
                ageText: `${r.age} 岁`,
                weeksText: `${(0, toolboxFormat_1.fmtInt)(r.weeks)} 周`,
                ymdText: `${r.ageYMD.years} 岁 ${r.ageYMD.months} 个月 ${r.ageYMD.days} 天`,
                birthdayMain: nb.isToday ? '今天生日 🎉' : `${nb.daysUntil} 天`,
                birthdaySub: nb.isToday ? `满 ${nb.turning} 岁` : `${(0, dateMath_1.formatCN)(nb.date)} · 满 ${nb.turning} 岁`,
                hasTime: r.hoursAlive != null,
                hoursText: `${(0, toolboxFormat_1.fmtInt)((_b = r.hoursAlive) !== null && _b !== void 0 ? _b : 0)} 小时`,
                minutesText: `${(0, toolboxFormat_1.fmtInt)((_c = r.minutesAlive) !== null && _c !== void 0 ? _c : 0)} 分钟`,
                milestones: r.milestones.map((m) => ({
                    nText: `第 ${(0, toolboxFormat_1.fmtInt)(m.n)} 天`,
                    whenText: m.daysUntil === 0 ? '就是今天 🎉' : `${(0, dateMath_1.formatCN)(m.date)} · 还有 ${m.daysUntil} 天`,
                })),
            },
        });
    },
    onDatePick(e) {
        const v = String(e.detail.value);
        this.setData({ birth: v });
        this.persist();
        this.recompute();
    },
    onTimePick(e) {
        const v = String(e.detail.value);
        this.setData({ time: v });
        this.persist();
        this.recompute();
    },
    onLeapPrefTap(e) {
        const v = String(e.currentTarget.dataset.v) === 'mar1' ? 'mar1' : 'day28';
        this.setData({ leapPref: v });
        this.persist();
        this.recompute();
    },
    onReset() {
        (0, toolboxStorage_1.removeStore)('days.v1');
        this.setData({ birth: '', time: '', leapPref: 'day28' });
        this.recompute();
    },
});
