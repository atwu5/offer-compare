/** 工具箱通用控件：输入在上、结果在下、实时计算、移动端数字键盘 */
import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[13px] font-medium text-tb-ink">{label}</div>
      {hint && <div className="mb-1.5 text-xs leading-relaxed text-tb-faint">{hint}</div>}
      {children}
    </div>
  )
}

/**
 * 数字输入框：聚焦期间保留原始输入（避免光标跳动），失焦后规范化显示。
 * inputMode=decimal 调起移动端数字键盘；integer 模式只允许正整数。
 */
export function NumberField({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  invalid = false,
  integer = false,
}: {
  value: number | null
  onChange: (v: number | null) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  invalid?: boolean
  integer?: boolean
}) {
  const toText = (v: number | null): string => (v == null || !isFinite(v) ? '' : String(Math.round(v * 1e6) / 1e6))
  const [text, setText] = useState(() => toText(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setText(toText(value))
  }, [value])

  return (
    <div
      className={`flex items-center rounded-xl border bg-[#FBFAFF] px-3 transition ${
        invalid ? 'border-tb-neg' : 'border-tb-line focus-within:border-[#A99EF7] focus-within:shadow-[0_0_0_3px_rgba(109,91,246,0.12)]'
      }`}
    >
      {prefix && <span className="mr-1.5 shrink-0 text-sm text-tb-faint">{prefix}</span>}
      <input
        inputMode="decimal"
        type="text"
        className="num min-w-0 flex-1 bg-transparent py-2 text-[15px] text-tb-ink outline-none placeholder:text-[#B3AFC2]"
        value={text}
        placeholder={placeholder}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={() => {
          focusedRef.current = false
          setText(toText(value))
        }}
        onChange={(e) => {
          const cleaned = integer ? e.target.value.replace(/[^\d]/g, '') : e.target.value.replace(/[^\d.]/g, '')
          setText(cleaned)
          if (cleaned === '' || cleaned === '.') {
            onChange(null)
            return
          }
          const n = Number(cleaned)
          onChange(isFinite(n) ? n : null)
        }}
      />
      {suffix && <span className="ml-1.5 shrink-0 whitespace-nowrap text-xs text-tb-faint">{suffix}</span>}
    </div>
  )
}

export function TextField({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <input
      className="tb-input"
      type="text"
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/** 原生日期选择器（移动端调起系统日历） */
export function DateField({
  value,
  onChange,
  min,
  max,
}: {
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
}) {
  return (
    <input
      className="tb-input num"
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-0.5 rounded-xl border border-tb-line bg-[#F3F1FA] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition ${
            value === o.value
              ? 'bg-white text-tb-primary shadow-sm ring-1 ring-[#D8D2F5]'
              : 'text-tb-sub hover:text-tb-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ChoiceCard({
  checked,
  onClick,
  title,
  desc,
  disabled = false,
}: {
  checked: boolean
  onClick: () => void
  title: string
  desc: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${
        disabled ? 'cursor-not-allowed border-dashed border-tb-line bg-[#F7F6F9] opacity-70' : checked
          ? 'border-tb-primary bg-[rgba(109,91,246,0.06)]'
          : 'border-tb-line bg-white hover:border-[#C9C2F2]'
      }`}
    >
      <span className="block text-[13px] font-medium text-tb-ink">{title}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-tb-faint">{desc}</span>
    </button>
  )
}

export function CheckRow({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 text-left">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
          checked ? 'border-tb-primary bg-tb-primary text-white' : 'border-[#CFCBDD] bg-white'
        }`}
      >
        {checked && <span className="text-xs font-bold leading-none">✓</span>}
      </span>
      <span className="text-[13px] text-tb-ink">{label}</span>
    </button>
  )
}

/** 结果大数字块 */
export function ResultBlock({
  label,
  value,
  sub,
  hero = false,
}: {
  label: string
  value: string
  sub?: string
  hero?: boolean
}) {
  return (
    <div
      className={`tb-card tb-pop px-5 py-4 ${
        hero ? 'border-[#DDD6FB] bg-gradient-to-br from-[#F4F2FF] to-[#FBFAFF]' : ''
      }`}
    >
      <div className="text-xs text-tb-sub">{label}</div>
      <div className="num mt-1 text-[34px] font-bold leading-tight tracking-tight text-tb-ink">{value}</div>
      {sub && <div className="mt-1 text-xs leading-relaxed text-tb-faint">{sub}</div>}
    </div>
  )
}

/** 小结果格 */
export function MiniResult({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-tb-line bg-white px-3.5 py-3">
      <div className="text-xs text-tb-sub">{label}</div>
      <div className="num mt-1 text-lg font-semibold text-tb-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs leading-relaxed text-tb-faint">{sub}</div>}
    </div>
  )
}

export function NoteBlock({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
        tone === 'warn'
          ? 'border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]'
          : 'border-[#E2DDFB] bg-[#F4F2FF] text-[#4C3FD0]'
      }`}
    >
      {children}
    </div>
  )
}
