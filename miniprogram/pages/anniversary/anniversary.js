"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** 纪念日计算器（小程序版）：多条记录 + 本地持久化 + 编辑/删除（二次确认） */
const anniversaryCalculator_1 = require("../../engine/utils/anniversaryCalculator");
const dateMath_1 = require("../../engine/utils/dateMath");
const toolboxFormat_1 = require("../../utils/toolboxFormat");
const toolboxStorage_1 = require("../../utils/toolboxStorage");
const EMPTY_FORM = { name: '', date: '', repeat: true, leapPref: 'day28' };
function newId() {
    return `a_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}
Page({
    data: {
        views: [],
        hasRecords: false,
        form: { name: '', date: '', repeat: true, leapPref: 'day28' },
        editingId: null,
        deleteArmedId: null,
        formError: '',
        isFeb29Form: false,
        todayStr: (0, dateMath_1.formatYMD)((0, dateMath_1.ymdOfLocal)(new Date())),
    },
    onLoad() {
        this.refresh();
    },
    onShow() {
        // 返回本页时刷新（日期可能变化）
        this.refresh();
    },
    refresh() {
        const records = (0, toolboxStorage_1.loadStore)('anniversary.records.v1', []);
        const list = Array.isArray(records) ? records.slice().sort((a, b) => a.createdAt - b.createdAt) : [];
        const views = list.map((r) => {
            var _a;
            const v = (0, anniversaryCalculator_1.buildAnniversaryView)(r, (0, dateMath_1.ymdOfLocal)(new Date()));
            const occ = v.nextOccurrence;
            let mainText = '';
            if (!v.valid)
                mainText = '';
            else if (v.isFuture && occ)
                mainText = `还有 ${occ.daysUntil} 天`;
            else
                mainText = (occ === null || occ === void 0 ? void 0 : occ.isToday) ? '就是今天 🎉' : `已经走过 ${(0, toolboxFormat_1.fmtInt)(v.elapsedDays)} 天`;
            const subParts = [];
            if (v.ymd)
                subParts.push(`${v.ymd.years} 年 ${v.ymd.months} 个月 ${v.ymd.days} 天`);
            if (v.ymd)
                subParts.push(`今天是第 ${(0, toolboxFormat_1.fmtInt)(v.dayOrdinal)} 天`);
            let nextText = '';
            if (occ && !occ.isToday) {
                nextText = r.repeatYearly
                    ? `下一次：${(0, dateMath_1.formatCN)(occ.date)}（第 ${occ.nth} 周年）· 还有 ${occ.daysUntil} 天`
                    : `目标日：${(0, dateMath_1.formatCN)(occ.date)}`;
            }
            return {
                id: r.id,
                name: r.name,
                dateText: (0, dateMath_1.formatCN)(v.start),
                repeatText: r.repeatYearly ? '每年重复' : '不重复',
                valid: v.valid,
                error: (_a = v.error) !== null && _a !== void 0 ? _a : '',
                mainText,
                subText: subParts.join(' · '),
                nextText,
                milestones: v.milestones.map((m) => ({
                    nText: `第 ${(0, toolboxFormat_1.fmtInt)(m.n)} 天`,
                    whenText: m.daysUntil === 0 ? '今天' : `还有 ${m.daysUntil} 天`,
                })),
            };
        });
        this.setData({ views, hasRecords: list.length > 0 });
    },
    persist(records) {
        (0, toolboxStorage_1.saveStore)('anniversary.records.v1', records);
    },
    onNameInput(e) {
        this.setData({ form: Object.assign(Object.assign({}, this.data.form), { name: e.detail.value }) });
    },
    onDatePick(e) {
        const date = String(e.detail.value);
        this.setData({
            form: Object.assign(Object.assign({}, this.data.form), { date }),
            isFeb29Form: /^\d{4}-02-29$/.test(date),
        });
    },
    onRepeatTap() {
        this.setData({ form: Object.assign(Object.assign({}, this.data.form), { repeat: !this.data.form.repeat }) });
    },
    onLeapPrefTap(e) {
        const v = String(e.currentTarget.dataset.v) === 'mar1' ? 'mar1' : 'day28';
        this.setData({ form: Object.assign(Object.assign({}, this.data.form), { leapPref: v }) });
    },
    onSubmit() {
        const name = this.data.form.name.trim();
        if (!name) {
            this.setData({ formError: '请先填写纪念日名称' });
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(this.data.form.date)) {
            this.setData({ formError: '请选择开始日期' });
            return;
        }
        this.setData({ formError: '' });
        const records = (0, toolboxStorage_1.loadStore)('anniversary.records.v1', []);
        const list = Array.isArray(records) ? records : [];
        if (this.data.editingId) {
            const next = list.map((r) => r.id === this.data.editingId
                ? Object.assign(Object.assign({}, r), { name, date: this.data.form.date, repeatYearly: this.data.form.repeat, leapPref: this.data.form.leapPref }) : r);
            this.persist(next);
            this.setData({ editingId: null });
        }
        else {
            list.push({
                id: newId(),
                name,
                date: this.data.form.date,
                repeatYearly: this.data.form.repeat,
                leapPref: this.data.form.leapPref,
                createdAt: Date.now(),
            });
            this.persist(list);
        }
        this.setData({ form: { name: '', date: '', repeat: true, leapPref: 'day28' }, isFeb29Form: false });
        this.refresh();
    },
    onEditTap(e) {
        const id = String(e.currentTarget.dataset.id);
        const records = (0, toolboxStorage_1.loadStore)('anniversary.records.v1', []);
        const r = (Array.isArray(records) ? records : []).find((x) => x.id === id);
        if (!r)
            return;
        this.setData({
            editingId: id,
            deleteArmedId: null,
            form: { name: r.name, date: r.date, repeat: r.repeatYearly, leapPref: r.leapPref },
            isFeb29Form: /^\d{4}-02-29$/.test(r.date),
        });
    },
    onDeleteTap(e) {
        const id = String(e.currentTarget.dataset.id);
        // 二次确认：第一次点变成「确认删除」，3 秒后自动还原
        if (this.data.deleteArmedId !== id) {
            this.setData({ deleteArmedId: id });
            setTimeout(() => {
                if (this.data.deleteArmedId === id)
                    this.setData({ deleteArmedId: null });
            }, 3000);
            return;
        }
        const records = (0, toolboxStorage_1.loadStore)('anniversary.records.v1', []);
        const next = (Array.isArray(records) ? records : []).filter((r) => r.id !== id);
        this.persist(next);
        this.setData({ deleteArmedId: null });
        if (this.data.editingId === id) {
            this.setData({ editingId: null, form: { name: '', date: '', repeat: true, leapPref: 'day28' }, isFeb29Form: false });
        }
        this.refresh();
    },
    onCancelEdit() {
        this.setData({
            editingId: null,
            form: { name: '', date: '', repeat: true, leapPref: 'day28' },
            formError: '',
            isFeb29Form: false,
        });
    },
    onResetAll() {
        (0, toolboxStorage_1.removeStore)('anniversary.records.v1');
        this.setData({
            editingId: null,
            deleteArmedId: null,
            form: { name: '', date: '', repeat: true, leapPref: 'day28' },
            formError: '',
            isFeb29Form: false,
        });
        this.refresh();
    },
});
