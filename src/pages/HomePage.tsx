/** 首页：生活计算工具箱 —— 工具入口 + 最近纪念日提示 */
import { useMemo } from 'react'
import { TOOLS } from '../config/tools'
import { navigate } from '../router'
import { useToday } from '../hooks/useToday'
import { loadJSON } from '../utils/storage'
import { formatYMD } from '../utils/dateMath'
import {
  buildAnniversaryView,
  pickNextUpcoming,
  type AnniversaryRecord,
} from '../utils/anniversaryCalculator'

export default function HomePage() {
  const today = useToday()

  const nextAnniversary = useMemo(() => {
    const records = loadJSON<AnniversaryRecord[]>('anniversary.records.v1', [])
    if (!Array.isArray(records)) return null
    const views = records
      .filter((r) => r && typeof r.date === 'string' && typeof r.name === 'string')
      .map((r) => buildAnniversaryView(r, today))
    return pickNextUpcoming(views)
  }, [today])

  return (
    <div className="tb-page">
      {/* 顶部 */}
      <header className="border-b border-[#EFECE7] bg-gradient-to-b from-[#F4F2FF] to-transparent px-4 pb-7 pt-10 text-center">
        <div className="mx-auto max-w-xl">
          <h1 className="tb-gradient-text text-[30px] font-bold tracking-tight">生活计算工具箱</h1>
          <p className="mt-2 text-sm leading-relaxed text-tb-sub">生活中的小计算，一次帮你搞定。</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs text-tb-sub ring-1 ring-[#ECEAF2]">本地计算</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs text-tb-sub ring-1 ring-[#ECEAF2]">无需登录</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs text-tb-sub ring-1 ring-[#ECEAF2]">数据不上传</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-6">
        {/* 最近纪念日 */}
        {nextAnniversary && nextAnniversary.nextOccurrence && (
          <button
            type="button"
            onClick={() => navigate('/anniversary')}
            className="tb-card tb-entry mb-4 flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-tb-ink">
                💞 {nextAnniversary.record.name}
              </div>
              <div className="mt-0.5 text-xs text-tb-sub">
                {nextAnniversary.nextOccurrence.isToday
                  ? '就是今天！'
                  : `还有 ${nextAnniversary.nextOccurrence.daysUntil} 天 · ${formatYMD(nextAnniversary.nextOccurrence.date)}`}
              </div>
            </div>
            <span className="tb-orange-chip shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
              {nextAnniversary.nextOccurrence.isToday ? '🎉' : `第 ${nextAnniversary.nextOccurrence.nth} 周年`}
            </span>
          </button>
        )}

        {/* 工具卡片：两列网格 */}
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((t) => (
            <button
              key={t.path}
              type="button"
              onClick={() => navigate(t.path)}
              className="tb-card tb-entry flex flex-col items-start gap-1.5 p-4 text-left"
            >
              <span
                className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ background: t.tint }}
              >
                {t.icon}
              </span>
              <span className="text-[15px] font-semibold text-tb-ink">{t.name}</span>
              <span className="text-xs leading-relaxed text-tb-sub">{t.desc}</span>
            </button>
          ))}
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-tb-faint">
          所有计算均在本地完成，数据不上传服务器，结果仅供参考。
        </p>
      </main>
    </div>
  )
}
