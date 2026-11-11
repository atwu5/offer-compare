"use strict";
/**
 * 通用日历日期工具（纯函数、零 DOM 依赖）。
 *
 * 设计要点：
 *  - 所有「自然日」差值都基于本地日历字段构造的 UTC 毫秒数计算，
 *    不携带任何时间/时区成分，天然免疫夏令时与跨时区偏移；
 *  - 年/月/日差值按真实日历规则借位，不用 365 天近似一年；
 *  - 2 月 29 日在非闰年的落点由调用方偏好决定（2/28 或 3/1）。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_MILESTONES = void 0;
exports.isLeapYear = isLeapYear;
exports.daysInMonth = daysInMonth;
exports.isValidYMD = isValidYMD;
exports.parseYMD = parseYMD;
exports.ymdOfLocal = ymdOfLocal;
exports.formatYMD = formatYMD;
exports.formatCN = formatCN;
exports.diffCalendarDays = diffCalendarDays;
exports.addYears = addYears;
exports.addMonthsClamped = addMonthsClamped;
exports.diffYMD = diffYMD;
exports.nextYearlyOccurrence = nextYearlyOccurrence;
exports.ageYears = ageYears;
exports.nthDayDate = nthDayDate;
exports.upcomingDayMilestones = upcomingDayMilestones;
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
function daysInMonth(year, month) {
    if (month < 1 || month > 12)
        return 0;
    const longMonths = [1, 3, 5, 7, 8, 10, 12];
    if (longMonths.includes(month))
        return 31;
    if (month === 2)
        return isLeapYear(year) ? 29 : 28;
    return 30;
}
function isValidYMD(p) {
    if (!Number.isInteger(p.year) || !Number.isInteger(p.month) || !Number.isInteger(p.day))
        return false;
    if (p.year < 1 || p.year > 9999)
        return false;
    if (p.month < 1 || p.month > 12)
        return false;
    return p.day >= 1 && p.day <= daysInMonth(p.year, p.month);
}
/** 严格解析 YYYY-MM-DD，非法返回 null */
function parseYMD(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s !== null && s !== void 0 ? s : '').trim());
    if (!m)
        return null;
    const p = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    return isValidYMD(p) ? p : null;
}
/** 本地时区的「今天」（按设备本地日历字段，避免 UTC 偏移导致日期错位） */
function ymdOfLocal(date) {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}
function formatYMD(p) {
    const mm = String(p.month).padStart(2, '0');
    const dd = String(p.day).padStart(2, '0');
    return `${p.year}-${mm}-${dd}`;
}
function formatCN(p) {
    return `${p.year}年${p.month}月${p.day}日`;
}
function utcMs(p) {
    return Date.UTC(p.year, p.month - 1, p.day);
}
/** 自然日差：a − b（负值表示 a 更早） */
function diffCalendarDays(a, b) {
    return Math.round((utcMs(a) - utcMs(b)) / 86400000);
}
/** 日历加 N 年；2/29 遇非闰年按偏好落到 2/28 或 3/1 */
function addYears(p, n, pref = 'day28') {
    const year = p.year + n;
    if (p.month === 2 && p.day === 29 && !isLeapYear(year)) {
        return pref === 'mar1' ? { year, month: 3, day: 1 } : { year, month: 2, day: 28 };
    }
    return { year, month: p.month, day: Math.min(p.day, daysInMonth(year, p.month)) };
}
/**
 * 日历加 N 个月：目标月没有该日时钳制到当月最后一天（1/31 + 1 月 → 2/29）。
 */
function addMonthsClamped(p, n) {
    const total = p.year * 12 + (p.month - 1) + n;
    const year = Math.floor(total / 12);
    const month = (((total % 12) + 12) % 12) + 1;
    return { year, month, day: Math.min(p.day, daysInMonth(year, month)) };
}
/**
 * 真实日历的年/月/日差（完整经过的年、月、日），end − start。
 * 算法：先数整月（未满整月不计），再把起点加上整月数作为锚点（钳制到当月最后一天），
 * 剩余部分按自然日补齐 —— 避免「按月长度借位」在月末日期上出现负天数。
 */
function diffYMD(start, end) {
    let months = (end.year - start.year) * 12 + (end.month - start.month);
    if (end.day < start.day)
        months -= 1;
    if (months < 0)
        months = 0;
    const anchor = addMonthsClamped(start, months);
    const days = diffCalendarDays(end, anchor);
    return { years: Math.floor(months / 12), months: months % 12, days };
}
/** 生日 / 周年通用：origin 的月日在每年重复；2/29 按偏好调整 */
function nextYearlyOccurrence(origin, today, pref = 'day28') {
    const candidateOf = (y) => addYears(origin, y - origin.year, pref);
    const thisYear = candidateOf(today.year);
    const todayKey = formatYMD(today);
    const thisKey = formatYMD(thisYear);
    if (thisKey === todayKey) {
        return { date: thisYear, nth: today.year - origin.year, daysUntil: 0, isToday: true };
    }
    if (thisKey > todayKey) {
        return {
            date: thisYear,
            nth: today.year - origin.year,
            daysUntil: diffCalendarDays(thisYear, today),
            isToday: false,
        };
    }
    const next = candidateOf(today.year + 1);
    return {
        date: next,
        nth: today.year + 1 - origin.year,
        daysUntil: diffCalendarDays(next, today),
        isToday: false,
    };
}
/**
 * 周岁（按周年偏好口径）：今天在本年度「调整后的生日」当天或之后 → 满 today.year − origin.year 岁，否则减一。
 * 相比 diffYMD().years，这一口径对 2/29 出生的用户更符合直觉。
 */
function ageYears(origin, today, pref = 'day28') {
    const occ = nextYearlyOccurrence(origin, today, pref);
    if (occ.isToday)
        return today.year - origin.year;
    return occ.nth - 1;
}
/** 出生 / 起始日以来的「第 N 天」：第 N 天 = 起始日 + (N−1) 天 */
function nthDayDate(origin, n) {
    const ms = utcMs(origin) + (n - 1) * 86400000;
    const d = new Date(ms);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
/** 常用天数里程碑 */
exports.DAY_MILESTONES = [
    100, 200, 300, 365, 520, 1000, 1314, 2000, 3000, 3650, 5200, 7300, 10000, 14600, 20000,
];
/** 从已过天数 daysElapsed 中找出接下来的若干个「第 N 天」节点 */
function upcomingDayMilestones(origin, daysElapsed, count = 3) {
    const out = [];
    for (const n of exports.DAY_MILESTONES) {
        const daysUntil = n - 1 - daysElapsed;
        if (daysUntil >= 0) {
            out.push({ n, date: nthDayDate(origin, n), daysUntil });
            if (out.length >= count)
                break;
        }
    }
    return out;
}
