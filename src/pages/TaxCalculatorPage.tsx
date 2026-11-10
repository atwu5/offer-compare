/** 个税计算器：累计预扣法（简易 / 逐月双模式）+ 年终奖两种计税方式对比 */
import { useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useToday } from '../hooks/useToday'
import { ToolShell } from '../components/toolbox/ToolShell'
import { ChoiceCard, Field, MiniResult, NoteBlock, NumberField, ResultBlock, Segmented } from '../components/toolbox/kit'
import { fmtCNY, fmtNum } from '../utils/money'
import { BONUS_POLICY_NOTE, TAX_SIMULATION_NOTE } from '../config/taxPolicy'
import {
  compareBonusMethods,
  simulateWithholding,
  type MonthTaxInput,
} from '../utils/cumulativeTaxCalculator'

interface TaxState {
  mode: 'simple' | 'monthly'
  /** 简易模式：计算到第几个月（默认当前月） */
  uptoMonth: number
  salary: number | null
  socialInsurance: number | null
  housingFund: number | null
  specialDeduction: number | null
  otherDeduction: number | null
  bonus: number | null
  /** 逐月模式：每月（税前工资, 当月扣除合计） */
  monthly: { salary: number | null; deduction: number | null }[]
}

const DEFAULT_STATE: TaxState = {
  mode: 'simple',
  uptoMonth: new Date().getMonth() + 1,
  salary: 20000,
  socialInsurance: null,
  housingFund: null,
  specialDeduction: null,
  otherDeduction: null,
  bonus: null,
  monthly: [],
}

export default function TaxCalculatorPage() {
  const [state, setState, clearState] = useLocalState<TaxState>('tax.v1', DEFAULT_STATE)
  const today = useToday()
  const patch = (p: Partial<TaxState>) => setState((prev) => ({ ...prev, ...p }))

  const uptoMonth = Math.min(12, Math.max(1, Math.round(state.uptoMonth || today.month)))

  const months: MonthTaxInput[] = useMemo(() => {
    if (state.mode === 'simple') {
      const salary = state.salary ?? 0
      const si = state.socialInsurance ?? 0
      const hf = state.housingFund ?? 0
      const special = state.specialDeduction ?? 0
      const other = state.otherDeduction ?? 0
      return Array.from({ length: uptoMonth }, (_, i) => ({
        month: i + 1,
        salary,
        socialInsurance: si,
        housingFund: hf,
        specialDeduction: special,
        otherDeduction: other,
      }))
    }
    const globalDeduction =
      (state.socialInsurance ?? 0) + (state.housingFund ?? 0) + (state.specialDeduction ?? 0) + (state.otherDeduction ?? 0)
    return Array.from({ length: uptoMonth }, (_, i) => {
      const row = state.monthly[i]
      return {
        month: i + 1,
        salary: row?.salary ?? state.salary ?? 0,
        socialInsurance: 0,
        housingFund: 0,
        specialDeduction: row?.deduction ?? globalDeduction,
        otherDeduction: 0,
      }
    })
  }, [state, uptoMonth])

  const result = useMemo(() => simulateWithholding(months), [months])
  const currentRow = result.rows[result.rows.length - 1]
  const currentMonthNet = currentRow?.netSalary ?? 0
  const currentMonthTax = currentRow?.taxWithheld ?? 0
  const siHfTotal =
    (state.socialInsurance ?? 0) + (state.housingFund ?? 0)
  const bonus = state.bonus != null && state.bonus > 0 ? state.bonus : 0

  const bonusCmp = useMemo(() => {
    if (bonus <= 0) return null
    return compareBonusMethods(result.annual.tax, result.annual.taxable, bonus)
  }, [bonus, result])

  const updateMonthly = (index: number, p: Partial<{ salary: number | null; deduction: number | null }>) => {
    setState((prev) => {
      const monthly = [...prev.monthly]
      const cur = monthly[index] ?? { salary: null, deduction: null }
      monthly[index] = { ...cur, ...p }
      return { ...prev, monthly }
    })
  }

  return (
    <ToolShell
      icon="💰"
      title="个税计算器"
      desc="按「累计预扣法」模拟每月预扣个税与到手工资；社保公积金按你填写的金额计算。"
      onReset={clearState}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={state.mode}
            onChange={(v) => patch({ mode: v })}
            options={[
              { value: 'simple', label: '每月收入固定' },
              { value: 'monthly', label: '逐月输入' },
            ]}
          />
          <div className="flex items-center gap-1.5 text-xs text-tb-sub">
            计算月份
            <Segmented
              value={String(uptoMonth)}
              onChange={(v) => patch({ uptoMonth: Number(v) })}
              options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
            />
          </div>
        </div>

        {state.mode === 'simple' ? (
          <div className="tb-card space-y-3.5 p-4">
            <Field label="税前月薪（元）">
              <NumberField value={state.salary} onChange={(v) => patch({ salary: v })} placeholder="20000" prefix="¥" invalid={state.salary == null} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="社保个人缴纳" hint="每月金额，不同城市不同，请按实际填写">
                <NumberField value={state.socialInsurance} onChange={(v) => patch({ socialInsurance: v })} placeholder="0" prefix="¥" suffix="/ 月" />
              </Field>
              <Field label="公积金个人缴纳">
                <NumberField value={state.housingFund} onChange={(v) => patch({ housingFund: v })} placeholder="0" prefix="¥" suffix="/ 月" />
              </Field>
              <Field label="专项附加扣除" hint="如子女教育、住房租金、赡养老人等">
                <NumberField value={state.specialDeduction} onChange={(v) => patch({ specialDeduction: v })} placeholder="0" prefix="¥" suffix="/ 月" />
              </Field>
              <Field label="其他依法扣除" hint="选填，如企业年金、税优健康险">
                <NumberField value={state.otherDeduction} onChange={(v) => patch({ otherDeduction: v })} placeholder="0" prefix="¥" suffix="/ 月" />
              </Field>
            </div>
          </div>
        ) : (
          <div className="tb-card space-y-3 p-4">
            <NoteBlock>
              逐月录入每月实际数据（默认预填全局值），未填月份按最近一个月推算，累计预扣结果更贴近实际。
            </NoteBlock>
            {months.map((row, i) => (
              <div key={row.month} className="grid grid-cols-[3rem_1fr_1fr] items-end gap-2">
                <div className="pb-2 text-[13px] font-medium text-tb-sub">{row.month} 月</div>
                <NumberField
                  value={state.monthly[i]?.salary ?? state.salary}
                  onChange={(v) => updateMonthly(i, { salary: v })}
                  placeholder="税前工资"
                  prefix="¥"
                />
                <NumberField
                  value={state.monthly[i]?.deduction ?? (state.socialInsurance ?? 0) + (state.housingFund ?? 0) + (state.specialDeduction ?? 0) + (state.otherDeduction ?? 0)}
                  onChange={(v) => updateMonthly(i, { deduction: v })}
                  placeholder="扣除合计"
                  prefix="−¥"
                />
              </div>
            ))}
            <div className="text-xs leading-relaxed text-tb-faint">
              「扣除合计」= 个人社保 + 公积金 + 专项附加 + 其他扣除的每月总额。
            </div>
          </div>
        )}

        {/* 结果 */}
        <ResultBlock
          hero
          label={`${uptoMonth} 月预计到手工资`}
          value={fmtCNY(currentMonthNet, 2)}
          sub={`当月预计个税 ${fmtCNY(currentMonthTax, 2)} · 税前 ${fmtCNY(currentRow?.salary ?? 0, 2)}`}
        />
        <div className="grid grid-cols-2 gap-3">
          <MiniResult label="当月预计个税" value={fmtCNY(currentMonthTax, 2)} />
          <MiniResult label="社保公积金个人合计" value={`${fmtCNY(siHfTotal, 2)} / 月`} />
          <MiniResult label="预计全年税前收入" value={fmtCNY(result.annual.income)} />
          <MiniResult label="预计全年个税" value={fmtCNY(result.annual.tax)} />
        </div>
        <MiniResult label="预计全年到手（工资部分）" value={fmtCNY(result.annual.net)} />

        {/* 年终奖对比 */}
        <div className="tb-card space-y-3 p-4">
          <Field label="年终奖（选填，支持单独测算）" hint="可分别按「单独计税」与「并入综合所得」测算，二者取其一申报">
            <NumberField value={state.bonus} onChange={(v) => patch({ bonus: v })} placeholder="0" prefix="¥" />
          </Field>
          {bonusCmp && bonus > 0 && (
            <div className="space-y-2 tb-pop">
              <div className="grid grid-cols-2 gap-3">
                <MiniResult label="① 单独计税 · 全年个税" value={fmtCNY(bonusCmp.annualTaxWithSeparate)} />
                <MiniResult label="② 并入综合 · 全年个税" value={fmtCNY(bonusCmp.annualTaxWithCombined)} />
              </div>
              <NoteBlock tone={bonusCmp.savingIfSeparate >= 0 ? 'info' : 'warn'}>
                {bonusCmp.savingIfSeparate >= 0
                  ? `本例「单独计税」更划算：全年少缴 ${fmtCNY(bonusCmp.savingIfSeparate)} 个税（奖金部分税额 ${fmtCNY(bonusCmp.bonusTaxSeparate)} vs 并入增量 ${fmtCNY(bonusCmp.bonusTaxCombined)}）。`
                  : `本例「并入综合所得」更划算：全年少缴 ${fmtCNY(-bonusCmp.savingIfSeparate)} 个税。`}
              </NoteBlock>
              <div className="text-xs leading-relaxed text-tb-faint">{BONUS_POLICY_NOTE}</div>
            </div>
          )}
        </div>

        {/* 逐月明细 */}
        <details className="tb-card p-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-tb-ink">
            查看逐月预扣明细（{months.length} 个月）
          </summary>
          <div className="mt-3 space-y-1.5">
            {result.rows.map((r) => (
              <div key={r.month} className="flex items-center justify-between gap-2 text-xs text-tb-sub">
                <span className="w-8 shrink-0 font-medium text-tb-ink">{r.month}月</span>
                <span className="num">税前 {fmtCNY(r.salary)}</span>
                <span className="num">个税 {fmtCNY(r.taxWithheld, 2)}</span>
                <span className="num font-semibold text-tb-ink">到手 {fmtCNY(r.netSalary, 2)}</span>
              </div>
            ))}
          </div>
        </details>

        <NoteBlock tone="warn">{TAX_SIMULATION_NOTE}</NoteBlock>
        <div className="text-xs leading-relaxed text-tb-faint">
          口径说明：月基本减除费用 5,000 元；采用累计预扣法（税率表按年累计口径查表），与「年度汇算」全年合计基本一致；
          当月应预扣税额小于 0 时按 0 处理（负值差额按适用规则在后续月份处理）。
        </div>
      </div>
    </ToolShell>
  )
}

