import { Fragment, useState } from 'react'
import { CalculationItem, CityPolicy, OfferResult } from '../types'
import { SCENARIO_LABELS } from '../utils/offerCalculator'
import { fmtCNY } from '../utils/money'
import { Badge, Card } from './ui'

type YearView = 'first' | 'steady'

const GROUP_TITLES: Record<string, string> = {
  income: '收入',
  insurance: '五险一金与个税（个人部分）',
  cost: '工作相关成本',
  result: '结果',
}

export function CalculationDetails({
  a,
  b,
  yearView,
  scenario,
  policyA,
  policyB,
  onOpenPolicy,
}: {
  a: OfferResult
  b: OfferResult
  yearView: YearView
  scenario: keyof typeof SCENARIO_LABELS
  policyA: CityPolicy | null
  policyB: CityPolicy | null
  onOpenPolicy: (cityCode: string) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const itemsA = yearView === 'first' ? a.firstBreakdown : a.breakdown
  const itemsB = yearView === 'first' ? b.firstBreakdown : b.breakdown

  if (!a.valid || !b.valid) return null

  // 按顺序合并两边的 key（某一边独有的行也展示）
  const keys: string[] = []
  for (const it of itemsA) if (!keys.includes(it.key)) keys.push(it.key)
  for (const it of itemsB) if (!keys.includes(it.key)) keys.push(it.key)
  const mapA = new Map(itemsA.map((i) => [i.key, i]))
  const mapB = new Map(itemsB.map((i) => [i.key, i]))

  const allNotices = Array.from(
    new Set([...itemsA, ...itemsB].flatMap((i) => i.notices ?? [])),
  ).filter((n) => !n.includes('年度汇算'))

  const toggle = (k: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const yearLabel = yearView === 'first' ? '首年' : '稳定年'

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h3 className="text-base font-semibold text-slate-900">完整收入明细（{yearLabel} · {SCENARIO_LABELS[scenario]}场景）</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          每一行都可以展开查看「用了什么基数 × 什么比例 = 多少钱」以及政策来源。
        </p>
      </div>

      {allNotices.length > 0 && (
        <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-3 sm:px-6">
          <div className="mb-1 text-xs font-semibold text-amber-700">计算提示（未静默处理）</div>
          <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed text-amber-700/90">
            {allNotices.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* 表头 */}
          <div className="grid grid-cols-[1fr_140px_140px_36px] items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs font-medium text-slate-400 sm:px-6">
            <div>项目</div>
            <div className="text-right">{a.offerName}（{a.cityName}）</div>
            <div className="text-right">{b.offerName}（{b.cityName}）</div>
            <div />
          </div>

          {keys.map((k) => {
            const ia = mapA.get(k)
            const ib = mapB.get(k)
            if (!ia && !ib) return null
            const item = (ia ?? ib) as CalculationItem
            const isOpen = expanded.has(k)
            const lastGroup = item.group
            const prevIdx = keys.indexOf(k) - 1
            const prevItem = prevIdx >= 0 ? mapA.get(keys[prevIdx]) ?? mapB.get(keys[prevIdx]) : null
            const showGroupTitle = !prevItem || prevItem.group !== lastGroup
            return (
              <Fragment key={k}>
                {showGroupTitle && (
                  <div className="border-b border-slate-100 bg-slate-50/30 px-5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:px-6">
                    {GROUP_TITLES[lastGroup] ?? ''}
                  </div>
                )}
                <div
                  className={`grid grid-cols-[1fr_140px_140px_36px] items-center gap-2 border-b border-slate-100 px-5 py-2.5 text-sm transition hover:bg-slate-50/60 sm:px-6 ${
                    item.emphasis === 'total' ? 'bg-slate-50 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        item.emphasis === 'total' || item.emphasis === 'subtotal'
                          ? 'font-semibold text-slate-900'
                          : 'text-slate-700'
                      }
                    >
                      {item.name}
                    </span>
                    {(ia?.notices?.length || ib?.notices?.length) && (
                      <span title="本行存在按政策自动调整的提示" className="text-amber-500">
                        ●
                      </span>
                    )}
                  </div>
                  <AmountCell item={ia} />
                  <AmountCell item={ib} />
                  <button
                    type="button"
                    onClick={() => toggle(k)}
                    title="查看计算依据"
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
                {isOpen && (
                  <div className="border-b border-slate-100 bg-indigo-50/30 px-5 py-4 sm:px-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailPanel
                        label={a.offerName}
                        item={ia}
                        policy={policyA}
                        onOpenPolicy={onOpenPolicy}
                      />
                      <DetailPanel
                        label={b.offerName}
                        item={ib}
                        policy={policyB}
                        onOpenPolicy={onOpenPolicy}
                      />
                    </div>
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function AmountCell({ item }: { item?: CalculationItem }) {
  if (!item) return <div className="text-right text-slate-300">—</div>
  const negative = item.displaySign === -1
  const cls =
    item.emphasis === 'total'
      ? 'font-bold text-slate-900'
      : negative
        ? 'text-slate-600'
        : 'text-slate-800'
  return (
    <div className={`num text-right ${cls}`}>
      {negative && <span className="text-red-500">−</span>}
      {fmtCNY(item.amount)}
      <span className="ml-0.5 text-[10px] font-normal text-slate-300">/年</span>
    </div>
  )
}

function DetailPanel({
  label,
  item,
  policy,
  onOpenPolicy,
}: {
  label: string
  item?: CalculationItem
  policy: CityPolicy | null
  onOpenPolicy: (cityCode: string) => void
}) {
  if (!item) return <div className="text-sm text-slate-400">该项不适用于 {label}。</div>
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <Badge tone="indigo">{label}</Badge>
        <span className="num text-sm font-semibold text-slate-800">
          {item.displaySign === -1 && <span className="text-red-500">−</span>}
          {fmtCNY(item.amount)}
          <span className="ml-0.5 text-[10px] font-normal text-slate-400">/年</span>
        </span>
      </div>
      <div className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-[12px] leading-relaxed text-slate-700">
        {item.formula}
      </div>
      {item.parameters.length > 0 && (
        <dl className="mt-2.5 space-y-1">
          {item.parameters.map((p, i) => (
            <div key={i} className="flex justify-between gap-3 text-xs">
              <dt className="shrink-0 text-slate-400">{p.label}</dt>
              <dd className="num text-right text-slate-600">{p.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {item.notices && item.notices.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px] leading-relaxed text-amber-700">
          {item.notices.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 border-t border-dashed border-slate-200 pt-2 text-[11px] text-slate-400">
        {item.policySource ? (
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span>
              政策来源：{item.policySource.name}
              {policy?.version ? ` · ${policy.version}` : ''}
              {policy ? ` · 生效 ${policy.effectiveDate} · 更新 ${policy.updatedAt}` : ''}
            </span>
            <span className="flex items-center gap-2">
              {item.policySource.url ? (
                <a
                  href={item.policySource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-600 hover:underline"
                >
                  查看原政策 &gt;
                </a>
              ) : (
                <span className="text-amber-600">演示数据，无原文链接</span>
              )}
              {policy && (
                <button
                  type="button"
                  onClick={() => onOpenPolicy(policy.cityCode)}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  城市参数 &gt;
                </button>
              )}
            </span>
          </div>
        ) : (
          <span>来源：用户输入 / 通用税务规则</span>
        )}
      </div>
    </div>
  )
}
