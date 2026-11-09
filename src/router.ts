/**
 * 极简 hash 路由：零依赖。
 * 选用 hash 而非 history API 的原因：单文件构建（vite-plugin-singlefile）后
 * 用 file:// 直接打开、以及 GitHub Pages 静态托管都能正常工作，且支持深链分享。
 */
import { useEffect, useState } from 'react'

export function normalizeHash(hash: string): string {
  const raw = hash.replace(/^#/, '')
  if (!raw || raw === '/') return '/'
  return raw.startsWith('/') ? raw : `/${raw}`
}

/** 当前路由（如 '/'、'/offer'、'/tax'），hash 变化时自动更新 */
export function useHashRoute(): string {
  const [route, setRoute] = useState(() => normalizeHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(normalizeHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(to: string): void {
  window.location.hash = to.startsWith('/') ? to : `/${to}`
}
