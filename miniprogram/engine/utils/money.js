"use strict";
/** 金额与格式化工具 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.round2 = round2;
exports.clamp = clamp;
exports.fmtNum = fmtNum;
exports.fmtCNY = fmtCNY;
exports.fmtWan = fmtWan;
exports.fmtSignedCNY = fmtSignedCNY;
exports.fmtPct = fmtPct;
exports.fmtPctPlain = fmtPctPlain;
exports.rateLabel = rateLabel;
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}
function fmtNum(n, digits = 0) {
    if (!isFinite(n))
        return '-';
    return n.toLocaleString('zh-CN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}
function fmtCNY(n, digits = 0) {
    return `¥${fmtNum(n, digits)}`;
}
/** 124000 -> "12.4万" */
function fmtWan(n) {
    const sign = n < 0 ? '-' : '';
    const wan = Math.round(Math.abs(n) / 1000) / 10;
    const s = Number.isInteger(wan) ? wan.toFixed(0) : wan.toFixed(1);
    return `${sign}¥${s}万`;
}
/** +¥40,000 / -¥12,000 */
function fmtSignedCNY(n, digits = 0) {
    if (Math.abs(n) < 0.005)
        return `¥${fmtNum(0, digits)}`;
    const sign = n > 0 ? '+' : '-';
    return `${sign}¥${fmtNum(Math.abs(n), digits)}`;
}
/** +8.6% / -3.2% */
function fmtPct(x, digits = 1) {
    if (!isFinite(x))
        return '-';
    const v = x * 100;
    const sign = v > 0 ? '+' : v < 0 ? '-' : '';
    return `${sign}${Math.abs(v).toFixed(digits)}%`;
}
/** 8.6% （不带符号） */
function fmtPctPlain(x, digits = 1) {
    if (!isFinite(x))
        return '-';
    return `${Math.abs(x * 100).toFixed(digits)}%`;
}
/** 0.08 -> "8%"，0.065 -> "6.5%" */
function rateLabel(r) {
    const v = Math.round(r * 10000) / 100;
    return Number.isInteger(v) ? `${v.toFixed(0)}%` : `${v}%`;
}
