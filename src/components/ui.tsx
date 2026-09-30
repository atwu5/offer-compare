import { ReactNode, useEffect, useRef, useState } from 'react'

/* ---------------- 布局 ---------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-ink-850 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionHeading({
  index,
  title,
  desc,
  right,
}: {
  index: string
  title: string
  desc?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-gold-500/40 bg-gold-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-gold-300">
            {index}
          </span>
          <h2 className="text-lg font-semibold text-cream-50">{title}</h2>
        </div>
        {desc && <p className="mt-1 text-sm text-cream-400">{desc}</p>}
      </div>
      {right}
    </div>
  )
}

/* ---------------- 提示 ---------------- */

export function Alert({
  tone = 'warn',
  title,
  children,
}: {
  tone?: 'warn' | 'error' | 'info'
  title?: string
  children: ReactNode
}) {
  const styles = {
    warn: 'border-gold-500/30 bg-gold-500/[0.07] text-gold-200',
    error: 'border-red-500/40 bg-red-500/[0.08] text-red-300',
    info: 'border-sky-500/30 bg-sky-500/[0.08] text-sky-300',
  }[tone]
  const icon = { warn: '⚠️', error: '⛔', info: 'ℹ️' }[tone]
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed ${styles}`}>
      {title && <div className="mb-0.5 font-semibold">{icon} {title}</div>}
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'amber' | 'green' | 'red' | 'indigo'
}) {
  const styles = {
    slate: 'bg-white/[0.06] text-cream-300',
    amber: 'bg-amber-500/15 text-amber-300',
    green: 'bg-emerald-500/15 text-emerald-300',
    red: 'bg-red-500/15 text-red-400',
    indigo: 'bg-gold-500/15 text-gold-300 ring-1 ring-inset ring-gold-500/30',
  }[tone]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}>
      {children}
    </span>
  )
}

/** 正负变化的金额：+¥40,000 / -¥12,000 */
export function Delta({ value, digits = 0 }: { value: number; digits?: number }) {
  const cls =
    value > 0.005 ? 'text-emerald-400' : value < -0.005 ? 'text-red-400' : 'text-cream-400'
  const sign = value > 0.005 ? '+' : value < -0.005 ? '-' : ''
  return (
    <span className={`num font-semibold ${cls}`}>
      {sign}¥{Math.abs(value).toLocaleString('zh-CN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}
    </span>
  )
}

/* ---------------- 表单控件 ---------------- */

const numStr = (v: number | null | undefined): string =>
  v == null || !isFinite(v) ? '' : String(Math.round(v * 1e6) / 1e6)

export function NumberInput({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  className = '',
  invalid = false,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  prefix?: string
  suffix?: string
  className?: string
  invalid?: boolean
}) {
  const [text, setText] = useState(numStr(value))
  const focusedRef = useRef(false)
  useEffect(() => {
    if (!focusedRef.current) setText(numStr(value))
  }, [value])
  return (
    <div
      className={`flex items-center rounded-lg border bg-ink-900 px-2.5 transition ${
        invalid
          ? 'border-red-500/50 ring-2 ring-red-500/15'
          : 'border-white/10 focus-within:border-gold-500/60 focus-within:ring-2 focus-within:ring-gold-500/15'
      } ${className}`}
    >
      {prefix && <span className="mr-1 shrink-0 text-sm text-cream-500">{prefix}</span>}
      <input
        inputMode="decimal"
        className="num w-full min-w-0 bg-transparent py-2 text-sm text-cream-50 outline-none placeholder:font-normal placeholder:text-cream-600"
        value={text}
        placeholder={placeholder}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={() => {
          focusedRef.current = false
          setText(numStr(value))
        }}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d.]/g, '')
          setText(cleaned)
          if (cleaned === '' || cleaned === '.') {
            onChange(null)
            return
          }
          const n = Number(cleaned)
          onChange(isFinite(n) ? n : null)
        }}
      />
      {suffix && <span className="ml-1 shrink-0 whitespace-nowrap text-xs text-cream-500">{suffix}</span>}
    </div>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-white/10 bg-ink-900 px-2.5 py-2 text-sm text-cream-50 outline-none transition placeholder:text-cream-600 focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/15 ${className}`}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
  className = '',
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-ink-900 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a29d8c%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.6rem_center] bg-no-repeat px-2.5 py-2 pr-7 text-sm text-cream-50 outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/15 disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-cream-600 ${
        disabled ? '' : ''
      } ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex flex-wrap items-center rounded-lg border border-white/[0.06] bg-ink-800 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-[7px] font-medium transition ${
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-[13px]'
          } ${
            value === o.value
              ? 'bg-gold-500/15 text-gold-200 ring-1 ring-inset ring-gold-500/40'
              : 'text-cream-400 hover:text-cream-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="mb-1 flex items-center gap-1 text-[13px] font-medium text-cream-300">
      {children}
      {hint && (
        <span
          title={hint}
          className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-cream-400 transition hover:bg-gold-500/20 hover:text-gold-300"
        >
          ?
        </span>
      )}
    </label>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-cream-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-ink-800 accent-gold-500"
      />
      {label}
    </label>
  )
}
