import { DiffRow, SCENARIO_LABELS, buildDiffRows, diffTotal } from '../utils/offerCalculator'
import { fmtCNY } from '../utils/money'
import { OfferResult } from '../types'
import { Card, Delta } from './ui'

type YearView = 'first' | 'steady'

export function DifferenceBreakdown({
  a,
  b,
  yearView,
  scenario,
}: {
  a: OfferResult
  b: OfferResult
  yearView: YearView
  scenario: keyof typeof SCENARIO_LABELS
}) {
  if (!a.valid || !b.valid) return null
  const rows = buildDiffRows(a, b, yearView)
  const total = diffTotal(a, b, yearView)
  const yearLabel = yearView === 'first' ? '首年' : '稳定年'
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.amount)), 1)

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          从「{a.offerName}」到「{b.offerName}」，钱差在哪？
        </h3>
        <span className="text-xs text-slate-400">
          {yearLabel} · {SCENARIO_LABELS[scenario]}场景 · 可支配现金口径
        </span>
      </div>
      <p className="mb-4 text-[13px] text-slate-500">
        正向 = 让你多拿钱的变化，负向 = 让你少拿钱的变化。
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          两个 Offer 的收入与成本结构基本一致，没有明显差异项。
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <DiffRowView key={r.key} row={r} maxAbs={maxAbs} />
          ))}
          <div className="mt-3 flex items-center justify-between border-t-2 border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-900">
              实际可支配收入{total >= 0 ? '增加' : '减少'}
            </span>
            <span className="num text-xl font-bold">
              <Delta value={total} />
              <span className="ml-1 text-xs font-normal text-slate-400">/ 年</span>
            </span>
          </div>
          <p className="pt-1 text-right text-[11px] text-slate-400">
            验证：{a.offerName} {fmtCNY(yearView === 'first' ? a.firstYear.disposableCash : a.steadyYear.disposableCash)} →{' '}
            {b.offerName} {fmtCNY(yearView === 'first' ? b.firstYear.disposableCash : b.steadyYear.disposableCash)}
          </p>
        </div>
      )}
    </Card>
  )
}

function DiffRowView({ row, maxAbs }: { row: DiffRow; maxAbs: number }) {
  const positive = row.amount > 0
  const widthPct = Math.min(100, (Math.abs(row.amount) / maxAbs) * 100)
  const barColor = positive ? 'bg-emerald-400/70' : 'bg-red-400/70'
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 truncate text-[13px] text-slate-600 sm:w-36">{row.label}</div>
      <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-slate-50">
        <div
          className={`h-full rounded-md transition-all duration-300 ${barColor}`}
          style={{ width: `${widthPct}%`, marginLeft: positive ? 0 : `${100 - widthPct}%` }}
        />
      </div>
      <div className={`num w-24 shrink-0 text-right text-[13px] font-semibold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
        <Delta value={row.amount} />
      </div>
    </div>
  )
}
