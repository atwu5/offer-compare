/** 工具箱入口配置：首页卡片与路由的单一来源，后续加工具只改这里 */

export interface ToolMeta {
  path: string
  icon: string
  name: string
  desc: string
  /** 图标底色（柔和纯色） */
  tint: string
}

export const TOOLS: ToolMeta[] = [
  { path: '/offer', icon: '⚖️', name: 'Offer 对比', desc: '两份工作机会，算算哪个更划算', tint: '#EEECFE' },
  { path: '/tax', icon: '💰', name: '个税计算器', desc: '算清税前税后，到手多少钱', tint: '#E8F4FE' },
  { path: '/retire', icon: '⏳', name: '退休倒计时', desc: '距离退休，还有多少个日夜', tint: '#FFF1E7' },
  { path: '/days', icon: '🌱', name: '出生天数', desc: '看看你已经来到世界多少天', tint: '#E7F8F1' },
  { path: '/anniversary', icon: '💞', name: '纪念日计算器', desc: '每个重要日子，都值得记录', tint: '#FDEEF5' },
  { path: '/wage', icon: '⚡', name: '时薪计算器', desc: '算算你每小时、每分钟值多少钱', tint: '#FEF7E6' },
]
