/** 退休倒计时：出生日期 + 计划退休年龄（自定义模式；法定退休模式待完善不开放） */
import { useLocalState } from '../hooks/useLocalState'
import { useToday } from '../hooks/useToday'
import { ToolShell } from '../components/toolbox/ToolShell'
import { ChoiceCard, DateField, Field, MiniResult, NoteBlock, NumberField, ResultBlock } from '../components/toolbox/kit'
import { formatCN, formatYMD } from '../utils/dateMath'
import { calcRetirement } from '../utils/retirementCalculator'

interface RetireState {
  birth: string
  retireAge: number | null
}

const DEFAULT_STATE: RetireState = { birth: '', retireAge: 60 }

export default function RetirementPage() {
  const [state, setState, clearState] = useLocalState<RetireState>('retire.v1', DEFAULT_STATE)
  const today = useToday()
  const patch = (p: Partial<RetireState>) => setState((prev) => ({ ...prev, ...p }))

  const result = calcRetirement(
    { birth: state.birth, retireAge: state.retireAge ?? 60 },
    today,
  )

  return (
    <ToolShell
      icon="⏳"
      title="退休倒计时"
      desc="严格按真实日历计算（含闰年）距离预计退休还有多少天。"
      onReset={clearState}
    >
      <div className="space-y-4">
        <div className="tb-card space-y-3.5 p-4">
          <Field label="出生日期">
            <DateField value={state.birth} onChange={(v) => patch({ birth: v })} max={formatYMD(today)} />
          </Field>
          <Field label="计划退休年龄（周岁）" hint="默认 60 岁，可手动修改">
            <NumberField
              value={state.retireAge}
              onChange={(v) => patch({ retireAge: v })}
              placeholder="60"
              suffix="岁"
              integer
              invalid={state.retireAge != null && (state.retireAge < 1 || state.retireAge > 100)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ChoiceCard
            checked
            onClick={() => undefined}
            title="自定义退休年龄"
            desc="按你填写的年龄精确计算，结果确定"
          />
          <ChoiceCard
            checked={false}
            disabled
            onClick={() => undefined}
            title="按法定退休年龄估算"
            desc="涉及渐进式延迟退休规则，待完善后开放"
          />
        </div>

        {result.valid ? (
          result.exceeded ? (
            <ResultBlock
              hero
              label="已到达预计退休日期"
              value={`已过 ${result.daysPast} 天`}
              sub={`预计退休日期：${formatCN(result.retireDate)}（按退休年龄 ${Math.round(state.retireAge ?? 60)} 岁计算）`}
            />
          ) : (
            <>
              <ResultBlock
                hero
                label="距离退休还有"
                value={`${result.daysUntil} 天`}
                sub={
                  result.ymd.years > 0 || result.ymd.months > 0
                    ? `约 ${result.ymd.years} 年 ${result.ymd.months} 个月 ${result.ymd.days} 天`
                    : '就在眼前啦'
                }
              />
              <div className="tb-card p-4">
                <div className="flex items-center justify-between text-xs text-tb-sub">
                  <span>人生进度（出生 → 预计退休日）</span>
                  <span className="num font-semibold text-tb-primary">{result.progressPct.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#F1EFF8]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-tb-primary to-tb-violet transition-all duration-300"
                    style={{ width: `${result.progressPct}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniResult label="预计退休日期" value={formatCN(result.retireDate)} />
                <MiniResult
                  label="倒计时明细"
                  value={`${result.ymd.years} 年 ${result.ymd.months} 月 ${result.ymd.days} 天`}
                />
              </div>
            </>
          )
        ) : (
          <NoteBlock tone="warn">{result.error ?? '请先填写出生日期'}</NoteBlock>
        )}

        <NoteBlock>
          实际退休时间可能受劳动身份、特殊工种、弹性退休等因素影响；如需按法定退休年龄估算，请以当地人社部门核定为准。
          2 月 29 日出生的用户，预计退休日按 2 月 28 日落点计算。
        </NoteBlock>
      </div>
    </ToolShell>
  )
}
