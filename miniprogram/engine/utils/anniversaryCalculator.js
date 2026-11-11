"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAnniversaryView = buildAnniversaryView;
exports.pickNextUpcoming = pickNextUpcoming;
/**
 * 纪念日计算（纯函数，零 DOM 依赖）。
 * 口径统一约定（与出生天数一致）：
 *  - 「已经走过 N 天」= 今天 − 开始日期的自然日差（开始当天为 0 天）；
 *  - 「第 N 天」= 开始日 + (N−1) 天；
 *  - 「第 N 个周年」= 按年份序号计（开始日当年为第 0 周年，满一年为第 1 周年）。
 */
const dateMath_1 = require("./dateMath");
function buildAnniversaryView(record, today) {
    const start = (0, dateMath_1.parseYMD)(record.date);
    if (!start) {
        return invalidView(record, today, '日期格式不正确');
    }
    const elapsedDays = (0, dateMath_1.diffCalendarDays)(today, start);
    const isFuture = elapsedDays < 0;
    const view = {
        record,
        valid: true,
        start,
        elapsedDays,
        ymd: elapsedDays >= 0 ? (0, dateMath_1.diffYMD)(start, today) : null,
        isFuture,
        dayOrdinal: elapsedDays >= 0 ? elapsedDays + 1 : 0,
        nextOccurrence: null,
        milestones: [],
    };
    if (record.repeatYearly) {
        view.nextOccurrence = (0, dateMath_1.nextYearlyOccurrence)(start, today, record.leapPref);
        if (!isFuture) {
            view.milestones = (0, dateMath_1.upcomingDayMilestones)(start, elapsedDays, 3);
        }
    }
    else if (isFuture) {
        view.nextOccurrence = {
            date: start,
            nth: 0,
            daysUntil: -elapsedDays,
            isToday: false,
        };
    }
    else {
        view.milestones = (0, dateMath_1.upcomingDayMilestones)(start, elapsedDays, 3);
    }
    return view;
}
/** 首页「最近纪念日」：返回最近一个将到的节点（今天恰好是纪念日也算） */
function pickNextUpcoming(views) {
    let best = null;
    for (const v of views) {
        if (!v.valid || !v.nextOccurrence)
            continue;
        if (best == null || v.nextOccurrence.daysUntil < best.nextOccurrence.daysUntil) {
            best = v;
        }
    }
    return best;
}
function invalidView(record, today, error) {
    return {
        record,
        valid: false,
        error,
        start: today,
        elapsedDays: 0,
        ymd: null,
        isFuture: false,
        dayOrdinal: 0,
        nextOccurrence: null,
        milestones: [],
    };
}
