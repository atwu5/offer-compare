import { Headline } from '../utils/offerCalculator'
import { fmtPct, fmtSignedCNY } from '../utils/money'
import { OfferResult } from '../types'
import { Alert, Card } from './ui'

export function ComparisonSummary({
  a,
  b,
  headline,
}: {
  a: OfferResult
  b: OfferResult
  headline: Headline
}) {
  if (!headline.hasData) {
    return (
      <Card className="p-5">
        <Alert tone="info">
          请先完善两个 Offer 的必填信息（目前存在输入错误或缺少参数），完善后这里会自动生成核心对比结论。
        </Alert>
      </Card>
    )
  }

  const metrics = [
    {
      label: '名义涨薪',
      sub: '按税前年收入',
      value: fmtPct(headline.nominal),
      tone: headline.nominal >= 0 ? 'text-slate-900' : 'text-red-600',
    },
    {
      label: '实际可支配收入涨幅',
      sub: '按稳定年可支配现金',
      value: fmtPct(headline.real),
      tone: headline.real >= 0 ? 'text-emerald-600' : 'text-red-600',
      highlight: true,
    },
    {
      label: '首年多到手',
      sub: '含签字费等一次性项目',
      value: fmtSignedCNY(headline.firstDiff),
      tone: headline.firstDiff >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      label: '稳定年多到手',
      sub: '排除一次性收入与成本',
      value: fmtSignedCNY(headline.steadyDiff),
      tone: headline.steadyDiff >= 0 ? 'text-emerald-600' : 'text-red-600',
      highlight: true,
    },
  ]

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">{headline.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{headline.explanation}</p>
      </div>
      <div className="grid grid-cols-2 divide-slate-100 lg:grid-cols-4 lg:divide-x">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`px-5 py-4 sm:px-6 ${m.highlight ? 'bg-slate-50/60' : ''} ${
              metrics.indexOf(m) < 2 ? 'max-lg:[&:nth-child(1)]:border-b max-lg:[&:nth-child(2)]:border-b' : ''
            }`}
          >
            <div className="text-xs text-slate-500">{m.label}</div>
            <div className={`num mt-1.5 text-2xl font-bold tracking-tight sm:text-[28px] ${m.tone}`}>
              {m.value}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{m.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
