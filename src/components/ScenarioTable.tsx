import { OfferResult, ScenarioKey } from '../types'
import { SCENARIO_LABELS, buildScenarioNote } from '../utils/offerCalculator'
import { fmtWan } from '../utils/money'
import { Card } from './ui'

export function ScenarioTable({
  resultSets,
  onPick,
  activeScenario,
}: {
  resultSets: Record<ScenarioKey, [OfferResult, OfferResult]>
  onPick: (s: ScenarioKey) => void
  activeScenario: ScenarioKey
}) {
  const [a, b] = resultSets.expected
  if (!a.valid || !b.valid) return null
  const aName = a.offerName
  const bName = b.offerName
  const note = buildScenarioNote(resultSets, aName, bName)
  const scenarios: ScenarioKey[] = ['conservative', 'expected', 'optimistic']

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">保守 / 正常 / 乐观 场景对比</h3>
        <span className="text-xs text-slate-400">展示稳定年可支配现金，点击列可切换全页场景</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="pb-2 font-medium">场景</th>
              <th className="pb-2 text-right font-medium">{aName}</th>
              <th className="pb-2 text-right font-medium">{bName}</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const ra = resultSets[s][0]
              const rb = resultSets[s][1]
              const active = activeScenario === s
              return (
                <tr
                  key={s}
                  onClick={() => onPick(s)}
                  className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 ${
                    active ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <td className="py-2.5 font-medium text-slate-700">
                    {SCENARIO_LABELS[s]}
                    {active && <span className="ml-1.5 text-[11px] text-indigo-500">当前</span>}
                  </td>
                  <td className="num py-2.5 text-right text-slate-800">{fmtWan(ra.steadyYear.disposableCash)}</td>
                  <td className="num py-2.5 text-right font-semibold text-slate-900">{fmtWan(rb.steadyYear.disposableCash)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-3 text-[13px] text-slate-500">{note}</p>}
    </Card>
  )
}
