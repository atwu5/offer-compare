/** 纪念日计算器：多条记录 + 本地持久化 + 编辑/删除（二次确认） + 周年与天数节点 */
import { useState } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useToday } from '../hooks/useToday'
import { ToolShell } from '../components/toolbox/ToolShell'
import { CheckRow, DateField, Field, NoteBlock, Segmented, TextField } from '../components/toolbox/kit'
import { formatCN, formatYMD, type LeapPreference } from '../utils/dateMath'
import {
  buildAnniversaryView,
  type AnniversaryRecord,
} from '../utils/anniversaryCalculator'

interface FormState {
  name: string
  date: string
  repeatYearly: boolean
  leapPref: LeapPreference
}

const EMPTY_FORM: FormState = { name: '', date: '', repeatYearly: true, leapPref: 'day28' }

function newId(): string {
  return `a_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

export default function AnniversaryPage() {
  const [records, setRecords, clearRecords] = useLocalState<AnniversaryRecord[]>('anniversary.records.v1', [])
  const today = useToday()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null)

  const views = records
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => buildAnniversaryView(r, today))

  const isFeb29Form = /^\d{4}-02-29$/.test(form.date)

  const submit = () => {
    const name = form.name.trim()
    if (!name) {
      setFormError('请先填写纪念日名称')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setFormError('请选择开始日期')
      return
    }
    setFormError('')
    if (editingId) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId ? { ...r, name, date: form.date, repeatYearly: form.repeatYearly, leapPref: form.leapPref } : r,
        ),
      )
      setEditingId(null)
    } else {
      setRecords((prev) => [
        ...prev,
        { id: newId(), name, date: form.date, repeatYearly: form.repeatYearly, leapPref: form.leapPref, createdAt: Date.now() },
      ])
    }
    setForm(EMPTY_FORM)
  }

  const startEdit = (r: AnniversaryRecord) => {
    setEditingId(r.id)
    setForm({ name: r.name, date: r.date, repeatYearly: r.repeatYearly, leapPref: r.leapPref })
    setDeleteArmedId(null)
  }

  const remove = (id: string) => {
    // 二次确认：第一次点变成「确认删除」，3 秒后自动还原
    if (deleteArmedId !== id) {
      setDeleteArmedId(id)
      window.setTimeout(() => setDeleteArmedId((cur) => (cur === id ? null : cur)), 3000)
      return
    }
    setRecords((prev) => prev.filter((r) => r.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setForm(EMPTY_FORM)
    }
    setDeleteArmedId(null)
  }

  return (
    <ToolShell
      icon="💞"
      title="纪念日计算器"
      desc="记录相识、恋爱、结婚、入职……每个重要日子都值得被记住。数据保存在本机。"
      onReset={() => {
        clearRecords()
        setEditingId(null)
        setForm(EMPTY_FORM)
        setDeleteArmedId(null)
      }}
    >
      <div className="space-y-4">
        {/* 记录列表 */}
        {views.length === 0 && (
          <div className="tb-card px-4 py-10 text-center text-sm text-tb-faint">
            还没有纪念日，在下方添加第一个吧。
          </div>
        )}

        {views.map((v) => {
          const r = v.record
          const occ = v.nextOccurrence
          return (
            <div key={r.id} className={`tb-card p-4 ${editingId === r.id ? 'ring-2 ring-[#D8D2F5]' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-tb-ink">{r.name}</div>
                  <div className="num mt-0.5 text-xs text-tb-faint">{formatCN(v.start)}{r.repeatYearly ? ' · 每年重复' : ''}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" className="tb-tool-btn" onClick={() => startEdit(r)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className={`tb-tool-btn ${deleteArmedId === r.id ? '!border-tb-neg !bg-[#FEF2F2] !text-tb-neg' : ''}`}
                    onClick={() => remove(r.id)}
                  >
                    {deleteArmedId === r.id ? '确认删除' : '删除'}
                  </button>
                </div>
              </div>

              {!v.valid ? (
                <div className="mt-2 text-xs text-tb-neg">{v.error}</div>
              ) : (
                <div className="mt-3">
                  {v.isFuture && occ ? (
                    <div className="num text-2xl font-bold text-tb-primary">还有 {occ.daysUntil} 天</div>
                  ) : (
                    <div className="num text-2xl font-bold text-tb-primary">
                      {occ?.isToday ? '就是今天 🎉' : `已经走过 ${v.elapsedDays} 天`}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tb-sub">
                    {v.ymd && (
                      <span className="num">
                        {v.ymd.years} 年 {v.ymd.months} 个月 {v.ymd.days} 天
                      </span>
                    )}
                    {v.ymd && <span className="num">今天是第 {v.dayOrdinal} 天</span>}
                    {occ && !occ.isToday && (
                      <span className="num">
                        {r.repeatYearly ? `下一次：${formatCN(occ.date)}（第 ${occ.nth} 周年）· 还有 ${occ.daysUntil} 天` : `目标日：${formatCN(occ.date)}`}
                      </span>
                    )}
                  </div>
                  {v.milestones.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {v.milestones.map((m) => (
                        <span key={m.n} className="rounded-full bg-[#F4F2FF] px-2.5 py-1 text-xs text-[#4C3FD0]">
                          第 <span className="num font-medium">{m.n}</span> 天
                          {m.daysUntil === 0 ? ' · 今天' : ` · 还有 ${m.daysUntil} 天`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* 添加 / 编辑表单 */}
        <div className="tb-card space-y-3.5 p-4">
          <div className="text-[13px] font-semibold text-tb-ink">
            {editingId ? '编辑纪念日' : '添加纪念日'}
          </div>
          <Field label="纪念日名称">
            <TextField value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="如：恋爱纪念日" maxLength={20} />
          </Field>
          <Field label="开始日期" hint="可选未来日期，作为倒计时目标">
            <DateField value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
          </Field>
          <CheckRow
            checked={form.repeatYearly}
            onClick={() => setForm((f) => ({ ...f, repeatYearly: !f.repeatYearly }))}
            label="每年重复（按周年纪念日计算）"
          />
          {isFeb29Form && (
            <Field label="非闰年的纪念日按哪天过？">
              <Segmented
                value={form.leapPref}
                onChange={(v) => setForm((f) => ({ ...f, leapPref: v }))}
                options={[
                  { value: 'day28', label: '2 月 28 日' },
                  { value: 'mar1', label: '3 月 1 日' },
                ]}
              />
            </Field>
          )}
          {formError && <NoteBlock tone="warn">{formError}</NoteBlock>}
          <div className="flex gap-2">
            <button type="button" className="tb-btn-primary flex-1 rounded-xl py-2.5 text-sm font-semibold" onClick={submit}>
              {editingId ? '保存修改' : '添加纪念日'}
            </button>
            {editingId && (
              <button
                type="button"
                className="rounded-xl border border-tb-line bg-white px-4 py-2.5 text-sm text-tb-sub"
                onClick={() => {
                  setEditingId(null)
                  setForm(EMPTY_FORM)
                  setFormError('')
                }}
              >
                取消
              </button>
            )}
          </div>
        </div>

        <NoteBlock>
          口径说明：「已经走过 N 天」按自然日差计算（开始当天为 0 天）；「第 N 天」= 开始日 + (N−1) 天；
          「第 N 周年」按年份序号计。全部页面使用同一套口径。删除记录有二次确认，删除后不可恢复。
        </NoteBlock>
      </div>
    </ToolShell>
  )
}
