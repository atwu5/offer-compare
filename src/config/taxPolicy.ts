/**
 * 个税政策参数（配置化）。
 * 更新政策时只改本文件，不改计算逻辑；每项参数标注口径与依据。
 */

export interface TaxBracket {
  /** 应纳税所得额上限（元，含）；最后一档为 Infinity */
  upper: number
  rate: number
  /** 速算扣除数（元） */
  quickDeduction: number
}

/** 月基本减除费用（起征点） */
export const BASIC_DEDUCTION_MONTHLY = 5000

/**
 * 居民个人工资薪金：累计预扣预缴税率表。
 * 按「累计应纳税所得额」（年初至当月累计）查表，口径为个人所得税预扣率表一（居民个人工资、薪金所得预扣预缴适用）。
 */
export const CUMULATIVE_BRACKETS: TaxBracket[] = [
  { upper: 36000, rate: 0.03, quickDeduction: 0 },
  { upper: 144000, rate: 0.1, quickDeduction: 2520 },
  { upper: 300000, rate: 0.2, quickDeduction: 16920 },
  { upper: 420000, rate: 0.25, quickDeduction: 31920 },
  { upper: 660000, rate: 0.3, quickDeduction: 52920 },
  { upper: 960000, rate: 0.35, quickDeduction: 85920 },
  { upper: Infinity, rate: 0.45, quickDeduction: 181920 },
]

/**
 * 全年一次性奖金「单独计税」适用：以奖金 ÷ 12 查月度税率表，再按全额计算。
 * 与累计预扣率表不同，不可混用。
 */
export const MONTHLY_BONUS_BRACKETS: TaxBracket[] = [
  { upper: 3000, rate: 0.03, quickDeduction: 0 },
  { upper: 12000, rate: 0.1, quickDeduction: 210 },
  { upper: 25000, rate: 0.2, quickDeduction: 1410 },
  { upper: 35000, rate: 0.25, quickDeduction: 2660 },
  { upper: 55000, rate: 0.3, quickDeduction: 4410 },
  { upper: 80000, rate: 0.35, quickDeduction: 7160 },
  { upper: Infinity, rate: 0.45, quickDeduction: 15160 },
]

/** 政策依据与有效期（已核验：财政部官网公告原文） */
export const BONUS_POLICY_NOTE =
  '全年一次性奖金可在「单独计税」与「并入综合所得」中二选一；现行单独计税政策执行至 2027 年 12 月 31 日（财政部 税务总局公告 2023 年第 30 号）。'

export const TAX_SIMULATION_NOTE =
  '本工具为模拟测算：社保公积金按你填写的金额计算（各地缴费规则不同，工具不做统一假设）；实际扣税以单位累计预扣申报与年度汇算为准。'
