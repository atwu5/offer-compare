import type { ReactNode } from 'react'
import { navigate } from '../../router'

interface ToolShellProps {
  icon: string
  title: string
  desc: string
  /** 提供时右上角显示「重置」按钮（同时清除该工具的本地缓存） */
  onReset?: () => void
  extraHeaderAction?: ReactNode
  children: ReactNode
}

/** 工具页统一外壳：返回首页 + 重置 + 标题说明 + 底部免责声明 */
export function ToolShell({ icon, title, desc, onReset, extraHeaderAction, children }: ToolShellProps) {
  return (
    <div className="tb-page">
      <header className="tb-header">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-2.5">
          <button type="button" className="tb-back" onClick={() => navigate('/')}>
            ← 首页
          </button>
          <div className="flex items-center gap-2">
            {extraHeaderAction}
            {onReset && (
              <button type="button" className="tb-tool-btn" onClick={onReset}>
                重置
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pb-14 pt-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-tb-primary to-tb-violet text-xl shadow-[0_6px_16px_rgba(109,91,246,0.25)]">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-tb-ink">{title}</h1>
            <p className="mt-0.5 text-[13px] leading-relaxed text-tb-sub">{desc}</p>
          </div>
        </div>

        {children}

        <p className="mt-10 text-center text-xs leading-relaxed text-tb-faint">
          所有计算均在本地完成，数据不上传服务器，结果仅供参考。
        </p>
      </main>
    </div>
  )
}
