/** 时薪计算器：时/分/秒/日薪 + 反向计算 + 可选的按秒收入计数器 */
import { useEffect, useRef, useState } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { ToolShell } from '../components/toolbox/ToolShell'
import {
  CheckRow,
  Field,
  MiniResult,
  NoteBlock,
  NumberField,
  ResultBlock,
  Segmented,
} from '../components/toolbox/kit'
import { fmtCNY, fmtNum } from '../utils/money'
import { calcHourlyWage, reverseMonthlyIncome, type WageInput } from '../utils/hourlyWageCalculator'

interface WageState {
  monthlyIncome: number | null
  annualBonus: number | null
  daysPerWeek: number | null
  hoursPerDay: number | null
  paidWeeksPerYear: number | null
  useAnnualDays: boolean
  annualWorkDays: number | null
  basis: 'gross' | 'net'
}

const DEFAULT_STATE: WageState = {
  monthlyIncome: null,
  annualBonus: 0,
  daysPerWeek: 5,
  hoursPerDay: 8,
  paidWeeksPerYear: 52,
  useAnnualDays: false,
  annualWorkDays: 250,
  basis: 'gross',
}

/** 金额格式化：两位小数千分位 */
const money = (n: number): string => fmtCNY(n, 2)

/** 小费率格式化：秒薪较小时保留更多小数位，避免错误显示 0.00 */
function fmtRate(n: number): string {
  if (!isFinite(n)) return '—'
  if (n >= 0.01) return n.toFixed(2)
  if (n >= 0.0001) return n.toFixed(4)
  return n.toFixed(6)
}

export default function HourlyWagePage() {
  const [state, setState, clearState] = useLocalState<WageState>('wage.v1', DEFAULT_STATE)
  const patch = (p: Partial<WageState>) => setState((prev) => ({ ...prev, ...p }))

  const input: WageInput = {
    monthlyIncome: state.monthlyIncome,
    annualBonus: state.annualBonus,
    daysPerWeek: state.daysPerWeek ?? 5,
    hoursPerDay: state.hoursPerDay ?? 8,
    paidWeeksPerYear: state.paidWeeksPerYear ?? 52,
    useAnnualDays: state.useAnnualDays,
    annualWorkDays: state.annualWorkDays ?? 250,
    basis: state.basis,
  }
  const result = calcHourlyWage(input)

  // —— 反向计算 ——
  const [reverseOn, setReverseOn] = useState(false)
  const [targetHourly, setTargetHourly] = useState<number | null>(null)
  const reverse = reverseMonthlyIncome(
    targetHourly,
    {
      daysPerWeek: state.daysPerWeek ?? 5,
      hoursPerDay: state.hoursPerDay ?? 8,
      paidWeeksPerYear: state.paidWeeksPerYear ?? 52,
      useAnnualDays: state.useAnnualDays,
      annualWorkDays: state.annualWorkDays ?? 250,
    },
    state.annualBonus ?? 0,
  )

  // —— 按秒收入计数器（仅在用户主动开启时运行） ——
  const [counterOn, setCounterOn] = useState(false)
  const [counterEarned, setCounterEarned] = useState(0)
  const perSecondRef = useRef(0)
  perSecondRef.current = result.valid ? result.perSecond : 0
  useEffect(() => {
    if (!counterOn) return
    const timer = window.setInterval(() => {
      setCounterEarned((e) => e + perSecondRef.current)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [counterOn])

  return (
    <ToolShell
      icon="⚡"
      title="时薪计算器"
      desc="算算你每小时、每分钟、每秒钟值多少钱。"
      onReset={() => {
        clearState()
        setCounterOn(false)
        setCounterEarned(0)
        setReverseOn(false)
        setTargetHourly(null)
      }}
    >
      <div className="space-y-4">
        <div className="tb-card space-y-3.5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Field label="月收入（元）">
              <NumberField value={state.monthlyIncome} onChange={(v) => patch({ monthlyIncome: v })} placeholder="10000" prefix="¥" invalid={state.monthlyIncome == null} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="每周工作天数">
              <NumberField value={state.daysPerWeek} onChange={(v) => patch({ daysPerWeek: v })} placeholder="5" suffix="天" integer />
            </Field>
            <Field label="每天工作小时">
              <NumberField value={state.hoursPerDay} onChange={(v) => patch({ hoursPerDay: v })} placeholder="8" suffix="小时" />
            </Field>
          </div>
          {!state.useAnnualDays && (
            <Field label="每年带薪工作周数" hint="默认 52 周（表示纳入计算的周数，休假默认视为带薪）；扣除假期请改用下方「全年工作天数」">
              <NumberField value={state.paidWeeksPerYear} onChange={(v) => patch({ paidWeeksPerYear: v })} placeholder="52" suffix="周" integer />
            </Field>
          )}
          <CheckRow
            checked={state.useAnnualDays}
            onClick={() => patch({ useAnnualDays: !state.useAnnualDays })}
            label="直接按「全年工作天数」计算（扣除假期更准确）"
          />
          {state.useAnnualDays && (
            <Field label="全年工作天数">
              <NumberField value={state.annualWorkDays} onChange={(v) => patch({ annualWorkDays: v })} placeholder="250" suffix="天" integer />
            </Field>
          )}
          <Field label="年度奖金（选填）" hint="计入年收入一起折算">
            <NumberField value={state.annualBonus} onChange={(v) => patch({ annualBonus: v })} placeholder="0" prefix="¥" />
          </Field>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-tb-sub">收入口径</span>
            <Segmented
              value={state.basis}
              onChange={(v) => patch({ basis: v })}
              options={[
                { value: 'gross', label: '税前' },
                { value: 'net', label: '税后' },
              ]}
            />
          </div>
          <div className="text-xs leading-relaxed text-tb-faint">
            口径标签仅表示你填写的月收入是税前还是税后；工具不会自动在两者之间换算（税前 → 税后请先用「个税计算器」）。
          </div>
        </div>

        {result.valid ? (
          <>
            <ResultBlock hero label="每小时赚" value={money(result.hourly)} sub={`按全年工作 ${fmtNum(result.annualHours)} 小时折算`} />
            <div className="grid grid-cols-2 gap-3">
              <MiniResult label="每分钟赚" value={`¥${fmtRate(result.perMinute)}`} />
              <MiniResult label="每秒钟赚" value={`¥${fmtRate(result.perSecond)}`} />
              <MiniResult label="每个工作日赚" value={money(result.perDay)} />
              <MiniResult label="全年收入" value={fmtCNY(result.annualIncome)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniResult label="全年工作小时" value={`${fmtNum(result.annualHours)} 小时`} />
              <MiniResult label="全年工作天数" value={`${fmtNum(Math.round(result.annualWorkDays))} 天`} />
            </div>

            {/* 按秒收入计数器 */}
            <div className="tb-card p-4 text-center">
              {counterOn ? (
                <>
                  <div className="text-xs text-tb-sub">开启以来已经赚了</div>
                  <div className="num mt-1 text-3xl font-bold text-tb-primary">{money(counterEarned)}</div>
                  <button
                    type="button"
                    className="tb-tool-btn mt-3"
                    onClick={() => {
                      setCounterOn(false)
                      setCounterEarned(0)
                    }}
                  >
                    ■ 停止
                  </button>
                </>
              ) : (
                <button type="button" className="tb-tool-btn" onClick={() => setCounterOn(true)}>
                  ▶ 开启按秒收入计数器
                </button>
              )}
            </div>
          </>
        ) : (
          <NoteBlock tone="warn">{result.error ?? '请先填写月收入'}</NoteBlock>
        )}

        {/* 反向计算 */}
        <div className="tb-card p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setReverseOn((v) => !v)}
          >
            <span className="text-[13px] font-semibold text-tb-ink">反向计算：想每小时赚 X 元，月薪该多少？</span>
            <span className={`text-tb-faint transition ${reverseOn ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {reverseOn && (
            <div className="mt-3 space-y-3 tb-pop">
              <Field label="期望时薪（元 / 小时）" hint="沿用上方的工作制度（每周天数、每天小时、全年周数/天数）">
                <NumberField value={targetHourly} onChange={setTargetHourly} placeholder="200" prefix="¥" invalid={targetHourly == null} />
              </Field>
              {reverse.valid && targetHourly != null ? (
                <div className="grid grid-cols-2 gap-3">
                  <MiniResult label="对应年收入" value={fmtCNY(reverse.annualIncome)} />
                  <MiniResult label="对应月收入" value={money(reverse.monthlyIncome)} />
                </div>
              ) : (
                reverse.error && <NoteBlock tone="warn">{reverse.error}</NoteBlock>
              )}
            </div>
          )}
        </div>

        <NoteBlock>
          计算口径：年收入 = 月收入 × 12 + 年度奖金；年工作小时 = 全年工作天数 × 每天小时。
          默认按「每周天数 × 52 周」估算全年工作天数（休假视为带薪），需要精确扣除假期时勾选「全年工作天数」直接填写。
        </NoteBlock>
      </div>
    </ToolShell>
  )
}
