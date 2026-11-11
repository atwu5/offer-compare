"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** 工具箱首页：工具入口 + 最近纪念日提示 */
const tools_1 = require("../../config/tools");
const toolboxStorage_1 = require("../../utils/toolboxStorage");
const anniversaryCalculator_1 = require("../../engine/utils/anniversaryCalculator");
const dateMath_1 = require("../../engine/utils/dateMath");
Page({
    data: {
        tools: tools_1.TOOLS,
        nextAnniv: null,
    },
    onShow() {
        // onShow 而非 onLoad：从子工具页返回时刷新「最近纪念日」
        this.refreshAnniv();
    },
    refreshAnniv() {
        const records = (0, toolboxStorage_1.loadStore)('anniversary.records.v1', []);
        const views = (Array.isArray(records) ? records : [])
            .filter((r) => r && typeof r.date === 'string' && typeof r.name === 'string')
            .map((r) => (0, anniversaryCalculator_1.buildAnniversaryView)(r, (0, dateMath_1.ymdOfLocal)(new Date())));
        const next = (0, anniversaryCalculator_1.pickNextUpcoming)(views);
        if (!next || !next.nextOccurrence) {
            this.setData({ nextAnniv: null });
            return;
        }
        const occ = next.nextOccurrence;
        this.setData({
            nextAnniv: {
                name: next.record.name,
                whenText: occ.isToday
                    ? '就是今天！'
                    : `还有 ${occ.daysUntil} 天 · ${(0, dateMath_1.formatCN)(occ.date)}`,
                tagText: `第 ${occ.nth} 周年`,
            },
        });
    },
    onOpenTool(e) {
        var _a;
        const path = String((_a = e.currentTarget.dataset.path) !== null && _a !== void 0 ? _a : '');
        if (path)
            tt.navigateTo({ url: path });
    },
    onOpenAnniv() {
        tt.navigateTo({ url: '/pages/anniversary/anniversary' });
    },
});
