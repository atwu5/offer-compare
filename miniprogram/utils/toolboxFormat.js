"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.money2 = money2;
exports.fmtInt = fmtInt;
exports.fmtRate = fmtRate;
/** 工具箱页面层格式化小工具（不含 tt.* 依赖） */
const money_1 = require("../engine/utils/money");
/** 金额两位小数（千分位） */
function money2(n) {
    return (0, money_1.fmtCNY)(n, 2);
}
/** 整数千分位 */
function fmtInt(n) {
    if (!isFinite(n))
        return '-';
    return Math.round(n).toLocaleString('zh-CN');
}
/** 小费率：秒薪较小时保留更多小数位，避免错误显示 0.00 */
function fmtRate(n) {
    if (!isFinite(n))
        return '—';
    if (n >= 0.01)
        return n.toFixed(2);
    if (n >= 0.0001)
        return n.toFixed(4);
    return n.toFixed(6);
}
