"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cityPolicies_1 = require("../../engine/data/cityPolicies");
const money_1 = require("../../engine/utils/money");
Page({
    data: {
        hasPolicy: false,
        cityName: '',
        demo: false,
        version: '',
        effectiveDate: '',
        updatedAt: '',
        blocks: [],
        fundRows: [],
        sources: [],
        notes: '',
    },
    onLoad(query) {
        var _a, _b;
        const code = String((_a = query.cityCode) !== null && _a !== void 0 ? _a : '');
        const p = (0, cityPolicies_1.getPolicy)(code);
        if (!p) {
            this.setData({ hasPolicy: false, cityName: code === 'custom' ? '其他城市' : '城市' });
            return;
        }
        const block = (title, r) => ({
            title,
            rows: [
                { label: '个人比例', value: (0, money_1.rateLabel)(r.employeeRate) },
                { label: '单位比例', value: (0, money_1.rateLabel)(r.employerRate) },
                { label: '基数下限', value: (0, money_1.fmtCNY)(r.baseMin) },
                { label: '基数上限', value: (0, money_1.fmtCNY)(r.baseMax) },
            ],
        });
        this.setData({
            hasPolicy: true,
            cityName: p.cityName,
            demo: p.demo,
            version: p.version,
            effectiveDate: p.effectiveDate,
            updatedAt: p.updatedAt,
            blocks: [
                block('养老保险', p.pension),
                block('医疗保险', p.medical),
                block('失业保险', p.unemployment),
            ],
            fundRows: [
                {
                    label: '个人比例（默认）',
                    value: `${(0, money_1.rateLabel)(p.housingFund.employeeRateDefault)}（允许 ${(0, money_1.rateLabel)(p.housingFund.rateMin)}～${(0, money_1.rateLabel)(p.housingFund.rateMax)}）`,
                },
                {
                    label: '单位比例（默认）',
                    value: `${(0, money_1.rateLabel)(p.housingFund.employerRateDefault)}（允许 ${(0, money_1.rateLabel)(p.housingFund.rateMin)}～${(0, money_1.rateLabel)(p.housingFund.rateMax)}）`,
                },
                { label: '缴存基数下限', value: (0, money_1.fmtCNY)(p.housingFund.baseMin) },
                { label: '缴存基数上限', value: (0, money_1.fmtCNY)(p.housingFund.baseMax) },
            ],
            sources: p.sources.map((s) => ({ name: s.name, url: s.url })),
            notes: (_b = p.notes) !== null && _b !== void 0 ? _b : '',
        });
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
