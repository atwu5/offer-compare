import { useEffect, useState } from 'react'
import { formatYMD, ymdOfLocal, type YMD } from '../utils/dateMath'

function useRefreshClock(onTick: () => void): void {
  useEffect(() => {
    const update = onTick
    const onVisible = () => {
      if (document.visibilityState === 'visible') update()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', update)
    // 每分钟校准一次：系统日期跨零点后自动重算
    const timer = window.setInterval(update, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', update)
      window.clearInterval(timer)
    }
  }, [onTick])
}

/** 当前时间戳：页面重新可见 / 聚焦 / 每分钟校准 */
export function useNowMs(): number {
  const [now, setNow] = useState(() => Date.now())
  useRefreshClock(() => setNow(Date.now()))
  return now
}

/** 本地「今天」：日期变化时才触发重渲染 */
export function useToday(): YMD {
  const [today, setToday] = useState<YMD>(() => ymdOfLocal(new Date()))
  useRefreshClock(() => {
    const next = ymdOfLocal(new Date())
    setToday((prev) => (formatYMD(prev) === formatYMD(next) ? prev : next))
  })
  return today
}
