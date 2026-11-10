/** 工具箱首页：工具入口 + 最近纪念日提示 */
import { TOOLS } from '../../config/tools'
import { loadStore } from '../../utils/toolboxStorage'
import {
  buildAnniversaryView,
  pickNextUpcoming,
  type AnniversaryRecord,
} from '../../engine/utils/anniversaryCalculator'
import { formatCN, ymdOfLocal } from '../../engine/utils/dateMath'

interface NextAnnivVm {
  name: string
  whenText: string
  tagText: string
}

interface HomeData {
  tools: typeof TOOLS
  nextAnniv: NextAnnivVm | null
}

Page<HomeData, {
  onShow(): void
  refreshAnniv(): void
  onOpenTool(e: MiniEvent.Tap): void
  onOpenAnniv(): void
}>({
  data: {
    tools: TOOLS,
    nextAnniv: null,
  },

  onShow() {
    // onShow 而非 onLoad：从子工具页返回时刷新「最近纪念日」
    this.refreshAnniv()
  },

  refreshAnniv() {
    const records = loadStore<AnniversaryRecord[]>('anniversary.records.v1', [])
    const views = (Array.isArray(records) ? records : [])
      .filter((r) => r && typeof r.date === 'string' && typeof r.name === 'string')
      .map((r) => buildAnniversaryView(r, ymdOfLocal(new Date())))
    const next = pickNextUpcoming(views)
    if (!next || !next.nextOccurrence) {
      this.setData({ nextAnniv: null })
      return
    }
    const occ = next.nextOccurrence
    this.setData({
      nextAnniv: {
        name: next.record.name,
        whenText: occ.isToday
          ? '就是今天！'
          : `还有 ${occ.daysUntil} 天 · ${formatCN(occ.date)}`,
        tagText: `第 ${occ.nth} 周年`,
      },
    })
  },

  onOpenTool(e: MiniEvent.Tap) {
    const path = String(e.currentTarget.dataset.path ?? '')
    if (path) tt.navigateTo({ url: path })
  },

  onOpenAnniv() {
    tt.navigateTo({ url: '/pages/anniversary/anniversary' })
  },
})
