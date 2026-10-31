/**
 * 城市政策参数页：展示某一城市的五险一金政策数据与来源。
 * 数据与 miniprogram-src/engine/data/cityPolicies.ts 完全同源（当前为演示数据）。
 */
import { RateRange } from '../../engine/types'
import { getPolicy } from '../../engine/data/cityPolicies'
import { fmtCNY, rateLabel } from '../../engine/utils/money'

interface RowVm {
  label: string
  value: string
}

interface BlockVm {
  title: string
  rows: RowVm[]
}

interface PolicyPageData {
  hasPolicy: boolean
  cityName: string
  demo: boolean
  version: string
  effectiveDate: string
  updatedAt: string
  blocks: BlockVm[]
  fundRows: RowVm[]
  sources: { name: string; url: string }[]
  notes: string
}

Page<PolicyPageData, {
  onLoad(query: IAnyObject): void
  onCopyLink(e: MiniEvent.Tap): void
}>({
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

  onLoad(query: IAnyObject) {
    const code = String(query.cityCode ?? '')
    const p = getPolicy(code)
    if (!p) {
      this.setData({ hasPolicy: false, cityName: code === 'custom' ? '其他城市' : '城市' })
      return
    }
    const block = (title: string, r: RateRange): BlockVm => ({
      title,
      rows: [
        { label: '个人比例', value: rateLabel(r.employeeRate) },
        { label: '单位比例', value: rateLabel(r.employerRate) },
        { label: '基数下限', value: fmtCNY(r.baseMin) },
        { label: '基数上限', value: fmtCNY(r.baseMax) },
      ],
    })
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
          value: `${rateLabel(p.housingFund.employeeRateDefault)}（允许 ${rateLabel(p.housingFund.rateMin)}～${rateLabel(p.housingFund.rateMax)}）`,
        },
        {
          label: '单位比例（默认）',
          value: `${rateLabel(p.housingFund.employerRateDefault)}（允许 ${rateLabel(p.housingFund.rateMin)}～${rateLabel(p.housingFund.rateMax)}）`,
        },
        { label: '缴存基数下限', value: fmtCNY(p.housingFund.baseMin) },
        { label: '缴存基数上限', value: fmtCNY(p.housingFund.baseMax) },
      ],
      sources: p.sources.map((s) => ({ name: s.name, url: s.url })),
      notes: p.notes ?? '',
    })
  },

  onCopyLink(e: MiniEvent.Tap) {
    const url = String(e.currentTarget.dataset.url ?? '')
    if (!url) return
    tt.setClipboardData({ data: url })
    tt.showToast({ title: '已复制链接', icon: 'none' })
  },
})
