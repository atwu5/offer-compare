/** 出生天数：自然日口径（当天 = 0 天 = 第 1 天），可选出生时间给真实小时/分钟 */
import { useLocalState } from '../hooks/useLocalState'
import { useNowMs, useToday } from '../hooks/useToday'
import { ToolShell } from '../components/toolbox/ToolShell'
import { DateField, Field, MiniResult, NoteBlock, NumberField, ResultBlock } from '../components/toolbox/kit'
import { formatCN, formatYMD, type LeapPreference } from '../utils/dateMath'
import { calcDaysAlive } from '../utils/daysAliveCalculator'

interface DaysState {
  birth: string
  birthTime: string
  leapPref: LeapPreference
}

const DEFAULT_STATE: DaysState = { birth: '', birthTime: '', leapPref: 'day28' }

export default function DaysAlivePage() {
  const [state, setState, clearState] = useLocalState<DaysState>('days.v1', DEFAULT_STATE)
  const today = useToday()
  const now = useNowMs()
  const patch = (p: Partial<DaysState>) => setState((prev) => ({ ...prev, ...p }))

  const result = calcDaysAlive(state, today, now)

  const isFeb29 = result.valid && result.birth.month === 2 && result.birth.day === 29

  return (
    <ToolShell
      icon="🌱"
      title="出生天数"
      desc="看看你已经来到世界多少天；口径：出生当天算 0 天，也是你人生的第一天。"
      onReset={clearState}
    >
      <div className="space-y-4">
        <div className="tb-card space-y-3.5 p-4">
          <Field label="出生日期">
            <DateField value={state.birth} onChange={(v) => patch({ birth: v })} max={formatYMD(today)} />
          </Field>
          <Field label="出生时间（选填）" hint="填写后可额外展示真实经过的小时与分钟数">
            <input
              className="tb-input num"
              type="time"
              value={state.birthTime}
              onChange={(e) => patch({ birthTime: e.target.value })}
            />
          </Field>
          {isFeb29 && (
            <Field label="非闰年的生日按哪天过？">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => patch({ leapPref: 'day28' })}
                  className={`flex-1 rounded-xl border px-3 py-2 text-[13px] transition ${
                    state.leapPref === 'day28' ? 'border-tb-primary bg-[rgba(109,91,246,0.06)] text-tb-primary font-medium' : 'border-tb-line bg-white text-tb-sub'
                  }`}
                >
                  2 月 28 日
                </button>
                <button
                  type="button"
                  onClick={() => patch({ leapPref: 'mar1' })}
                  className={`flex-1 rounded-xl border px-3 py-2 text-[13px] transition ${
                    state.leapPref === 'mar1' ? 'border-tb-primary bg-[rgba(109,91,246,0.06)] text-tb-primary font-medium' : 'border-tb-line bg-white text-tb-sub'
                  }`}
                >
                  3 月 1 日
                </button>
              </div>
            </Field>
          )}
        </div>

        {result.valid ? (
          <>
            <ResultBlock
              hero
              label="已经出生"
              value={`${result.daysElapsed} 天`}
              sub={
                result.daysElapsed === 0
                  ? '今天是来到世界的第 1 天 🎂'
                  : `今天是来到世界的第 ${result.dayOrdinal} 天`
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <MiniResult label="当前周岁" value={`${result.age} 岁`} />
              <MiniResult label="已经度过" value={`${result.weeks} 周`} />
              <MiniResult
                label="出生至今"
                value={`${result.ageYMD.years} 岁 ${result.ageYMD.months} 个月 ${result.ageYMD.days} 天`}
              />
              <MiniResult
                label={result.nextBirthday.isToday ? '今天生日 🎉' : '距离下一次生日'}
                value={
                  result.nextBirthday.isToday
                    ? '就是今天'
                    : `${result.nextBirthday.daysUntil} 天`
                }
                sub={
                  result.nextBirthday.isToday
                    ? `满 ${result.nextBirthday.turning} 岁`
                    : `${formatCN(result.nextBirthday.date)} · 满 ${result.nextBirthday.turning} 岁`
                }
              />
            </div>

            {(result.hoursAlive != null || result.minutesAlive != null) && (
              <div className="grid grid-cols-2 gap-3">
                <MiniResult label="已经出生（小时）" value={`${fmtInt(result.hoursAlive ?? 0)} 小时`} />
                <MiniResult label="已经出生（分钟）" value={`${fmtInt(result.minutesAlive ?? 0)} 分钟`} />
              </div>
            )}

            {result.milestones.length > 0 && (
              <div className="tb-card p-4">
                <div className="text-[13px] font-semibold text-tb-ink">接下来的人生节点</div>
                <div className="mt-2.5 space-y-2">
                  {result.milestones.map((m) => (
                    <div key={m.n} className="flex items-center justify-between text-[13px]">
                      <span className="text-tb-sub">
                        第 <span className="num font-semibold text-tb-ink">{fmtInt(m.n)}</span> 天
                      </span>
                      <span className="text-xs text-tb-faint">
                        {m.daysUntil === 0 ? '就是今天 🎉' : `${formatCN(m.date)} · 还有 ${m.daysUntil} 天`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <NoteBlock tone="warn">{result.error ?? '请先填写出生日期'}</NoteBlock>
        )}

        <NoteBlock>
          口径说明：「已经出生 N 天」按自然日差计算（出生当天为 0 天）；「第 N 天」= 来到世界的第 N 个自然日；
          小时 / 分钟按真实时间差计算，不按自然日 × 24 估算。日期使用设备本地时区。
        </NoteBlock>
      </div>
    </ToolShell>
  )
}

function fmtInt(n: number): string {
  return n.toLocaleString('zh-CN')
}
