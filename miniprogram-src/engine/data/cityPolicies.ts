import { CityPolicy } from '../types'

/**
 * ⚠️⚠️⚠️ 演示数据声明 ⚠️⚠️⚠️
 *
 * 本文件内置的所有城市政策参数（比例、缴费基数上下限）均为【演示数据】，
 * 仅用于功能测试与产品展示，未经过人工核验，请勿作为真实缴费或决策依据。
 *
 * 接入正式数据的步骤：
 *   1. 从当地人社局 / 住房公积金管理中心官网获取当年政策原文；
 *   2. 替换对应城市的比例与基数，填写 effectiveDate / updatedAt / verified / sources；
 *   3. 将 demo 置为 false、verified 置为 true；
 *   4. 无需改动任何计算逻辑（政策数据与计算引擎完全分离）。
 */

export const POLICY_DATA_NOTICE =
  '当前内置的城市政策为演示数据，仅用于功能测试与产品展示，请接入已核验的正式政策数据后再用于实际决策。'

export const cityPolicies: Record<string, CityPolicy> = {
  guangzhou: {
    cityCode: 'guangzhou',
    cityName: '广州',
    version: '2026（演示版）',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-09-01',
    verified: false,
    demo: true,
    pension: { employeeRate: 0.08, employerRate: 0.15, baseMin: 4600, baseMax: 26400 },
    medical: { employeeRate: 0.02, employerRate: 0.065, baseMin: 6100, baseMax: 30500 },
    unemployment: { employeeRate: 0.002, employerRate: 0.008, baseMin: 2300, baseMax: 26400 },
    housingFund: {
      employeeRateDefault: 0.12,
      employerRateDefault: 0.12,
      rateMin: 0.05,
      rateMax: 0.12,
      baseMin: 2300,
      baseMax: 38000,
    },
    sources: [{ name: '演示数据 · 未经核验，仅用于功能测试', url: '' }],
    notes: '演示数据，仅用于展示产品功能，请勿作为真实缴费依据。',
  },
  shenzhen: {
    cityCode: 'shenzhen',
    cityName: '深圳',
    version: '2026（演示版）',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-09-01',
    verified: false,
    demo: true,
    pension: { employeeRate: 0.08, employerRate: 0.15, baseMin: 3500, baseMax: 34000 },
    medical: { employeeRate: 0.02, employerRate: 0.06, baseMin: 6700, baseMax: 33600 },
    unemployment: { employeeRate: 0.003, employerRate: 0.007, baseMin: 2360, baseMax: 33600 },
    housingFund: {
      employeeRateDefault: 0.12,
      employerRateDefault: 0.12,
      rateMin: 0.05,
      rateMax: 0.12,
      baseMin: 2400,
      baseMax: 43000,
    },
    sources: [{ name: '演示数据 · 未经核验，仅用于功能测试', url: '' }],
    notes: '演示数据，仅用于展示产品功能，请勿作为真实缴费依据。',
  },
  shanghai: {
    cityCode: 'shanghai',
    cityName: '上海',
    version: '2026（演示版）',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-09-01',
    verified: false,
    demo: true,
    pension: { employeeRate: 0.08, employerRate: 0.16, baseMin: 7400, baseMax: 36900 },
    medical: { employeeRate: 0.02, employerRate: 0.09, baseMin: 7400, baseMax: 36900 },
    unemployment: { employeeRate: 0.005, employerRate: 0.005, baseMin: 7400, baseMax: 36900 },
    housingFund: {
      employeeRateDefault: 0.07,
      employerRateDefault: 0.07,
      rateMin: 0.05,
      rateMax: 0.07,
      baseMin: 2700,
      baseMax: 36500,
    },
    sources: [{ name: '演示数据 · 未经核验，仅用于功能测试', url: '' }],
    notes: '演示数据，仅用于展示产品功能，请勿作为真实缴费依据。',
  },
  beijing: {
    cityCode: 'beijing',
    cityName: '北京',
    version: '2026（演示版）',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-09-01',
    verified: false,
    demo: true,
    pension: { employeeRate: 0.08, employerRate: 0.16, baseMin: 6800, baseMax: 35300 },
    medical: { employeeRate: 0.02, employerRate: 0.098, baseMin: 6800, baseMax: 35300 },
    unemployment: { employeeRate: 0.005, employerRate: 0.005, baseMin: 6800, baseMax: 35300 },
    housingFund: {
      employeeRateDefault: 0.12,
      employerRateDefault: 0.12,
      rateMin: 0.05,
      rateMax: 0.12,
      baseMin: 2400,
      baseMax: 35300,
    },
    sources: [{ name: '演示数据 · 未经核验，仅用于功能测试', url: '' }],
    notes: '演示数据，仅用于展示产品功能，请勿作为真实缴费依据。',
  },
  hangzhou: {
    cityCode: 'hangzhou',
    cityName: '杭州',
    version: '2026（演示版）',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-09-01',
    verified: false,
    demo: true,
    pension: { employeeRate: 0.08, employerRate: 0.14, baseMin: 4800, baseMax: 24900 },
    medical: { employeeRate: 0.02, employerRate: 0.099, baseMin: 4800, baseMax: 24900 },
    unemployment: { employeeRate: 0.005, employerRate: 0.005, baseMin: 4800, baseMax: 24900 },
    housingFund: {
      employeeRateDefault: 0.12,
      employerRateDefault: 0.12,
      rateMin: 0.05,
      rateMax: 0.12,
      baseMin: 2500,
      baseMax: 33000,
    },
    sources: [{ name: '演示数据 · 未经核验，仅用于功能测试', url: '' }],
    notes: '演示数据，仅用于展示产品功能，请勿作为真实缴费依据。',
  },
  zhuhai: {
    cityCode: 'zhuhai',
    cityName: '珠海',
    version: '2026（演示版）',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-09-01',
    verified: false,
    demo: true,
    pension: { employeeRate: 0.08, employerRate: 0.14, baseMin: 4500, baseMax: 26000 },
    medical: { employeeRate: 0.02, employerRate: 0.06, baseMin: 4500, baseMax: 26000 },
    unemployment: { employeeRate: 0.002, employerRate: 0.008, baseMin: 1900, baseMax: 26000 },
    housingFund: {
      employeeRateDefault: 0.12,
      employerRateDefault: 0.12,
      rateMin: 0.05,
      rateMax: 0.12,
      baseMin: 1900,
      baseMax: 32000,
    },
    sources: [{ name: '演示数据 · 未经核验，仅用于功能测试', url: '' }],
    notes: '演示数据，仅用于展示产品功能，请勿作为真实缴费依据。',
  },
  chengdu: {
    cityCode: 'chengdu',
    cityName: '成都',
    version: '2026（演示版）',
    effectiveDate: '2026-01-01',
    updatedAt: '2026-09-01',
    verified: false,
    demo: true,
    pension: { employeeRate: 0.08, employerRate: 0.16, baseMin: 4500, baseMax: 23000 },
    medical: { employeeRate: 0.02, employerRate: 0.069, baseMin: 4500, baseMax: 23000 },
    unemployment: { employeeRate: 0.004, employerRate: 0.006, baseMin: 4500, baseMax: 23000 },
    housingFund: {
      employeeRateDefault: 0.06,
      employerRateDefault: 0.06,
      rateMin: 0.05,
      rateMax: 0.12,
      baseMin: 2100,
      baseMax: 28000,
    },
    sources: [{ name: '演示数据 · 未经核验，仅用于功能测试', url: '' }],
    notes: '演示数据，仅用于展示产品功能，请勿作为真实缴费依据。',
  },
}

export const CITY_OPTIONS = [
  ...Object.values(cityPolicies).map((p) => ({ value: p.cityCode, label: p.cityName })),
  { value: 'custom', label: '其他城市（手动填写参数）' },
]

export function getPolicy(cityCode: string): CityPolicy | null {
  return cityPolicies[cityCode] ?? null
}

/** 所有用到的政策里最新的数据更新时间（页脚展示用） */
export function latestPolicyUpdatedAt(codes: string[]): string {
  let latest = ''
  for (const c of codes) {
    const p = cityPolicies[c]
    if (p && p.updatedAt > latest) latest = p.updatedAt
  }
  return latest
}
