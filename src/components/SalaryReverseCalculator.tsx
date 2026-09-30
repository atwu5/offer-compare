import { useMemo, useState } from 'react'
import { CityPolicy, Offer } from '../types'
import { computeMinSalaryForTarget } from '../utils/reverseCalculator'
import { fmtCNY, fmtPctPlain } from '../utils/money'
import { Card, NumberInput, Segmented } from './ui'

export function SalaryReverseCalculator({
  offerA,
  policyA,
  offerB,
  policyB,
  enabled,
  bName,
  bSalary,
}: {
  offerA: Offer
  policyA: CityPolicy | null
  offerB: Offer
  policyB: CityPolicy | null
  enabled: boolean
  bName: string
  bSalary: number
}) {
  const [target, setTarget] = useState<number>(10)
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState<number | null>(20)

  const effectiveTarget = customMode ? (customValue ?? 0) / 100 : target / 100

  const result = useMemo(
    () => computeMinSalaryForTarget(offerA, policyA, offerB, policyB, effectiveTarget),
    [offerA, policyA, offerB, policyB, effectiveTarget],
  )

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="text-base font-semibold text-cream-50">谈薪反推：想真正涨薪 X%，月薪该谈到多少？</h3>
      <p className="mt-1 text-[13px] text-cream-400">
        以「稳定年可支配现金」为目标反推 {bName} 的最低月薪，而不是只看税前数字。
      </p>

      {!enabled ? (
        <p className="mt-4 rounded-xl bg-black/[0.03] px-4 py-6 text-center text-sm text-cream-500">
          请先完善两个 Offer 的输入，再使用谈薪反推。
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-medium text-cream-300">目标实际涨薪</span>
            <Segmented<string>
              size="sm"
              value={customMode ? 'custom' : String(target)}
              onChange={(v) => {
                if (v === 'custom') setCustomMode(true)
                else {
                  setCustomMode(false)
                  setTarget(Number(v))
                }
              }}
              options={[
                { value: '10', label: '10%' },
                { value: '20', label: '20%' },
                { value: '30', label: '30%' },
                { value: 'custom', label: '自定义' },
              ]}
            />
            {customMode && (
              <div className="w-28">
                <NumberInput
                  suffix="%"
                  placeholder="15"
                  value={customValue}
                  onChange={setCustomValue}
                />
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gold-500/20 bg-gold-500/[0.08] px-4 py-3.5">
            {!isFinite(result.currentReal) ? (
              <p className="text-sm text-cream-400">无法计算：请检查 Offer A 的可支配现金是否大于 0。</p>
            ) : result.reachable && result.minSalary != null ? (
              <>
                <div className="text-sm text-cream-300">
                  要实现稳定年实际可支配收入提升 <b className="num">{fmtPctPlain(effectiveTarget, 0)}</b>：
                </div>
                <div className="num mt-1.5 text-2xl font-bold text-gold-700">
                  {bName} 月薪至少约 {fmtCNY(result.minSalary)}
                </div>
                <div className="mt-1 text-[13px] text-cream-400">
                  当前月薪 {fmtCNY(bSalary)}
                  {result.minSalary <= bSalary
                    ? `，已能满足目标（当前实际涨幅 ${fmtPctPlain(result.currentReal)}）`
                    : `，还需月薪增加 ${fmtCNY(result.minSalary - bSalary)}`}
                </div>
              </>
            ) : (
              <p className="text-sm text-cream-300">
                在合理月薪范围内（≤ 50 万 / 月）无法通过涨薪达到该目标，请检查生活成本等输入。
              </p>
            )}
          </div>

          <div className="mt-3 text-xs leading-relaxed text-cream-500">
            <p className="mb-1 font-medium text-cream-400">计算假设：</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>城市、奖金、补贴、生活成本与五险一金比例均保持不变；</li>
              <li>公积金 / 社保基数随新月薪自动估算（若你手动填写了基数，则保持不变）；</li>
              <li>试用期月数与折扣比例保持不变；</li>
              <li>目标口径为「稳定年可支配现金」相对 Offer A 的提升幅度。</li>
            </ul>
          </div>
        </>
      )}
    </Card>
  )
}
