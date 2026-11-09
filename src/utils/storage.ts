/**
 * 本地存储封装：JSON 序列化 + 「toolbox.」命名空间 + 容错。
 *
 * 这是整个应用中唯一接触 localStorage 的地方；计算模块不依赖任何浏览器 API，
 * 未来迁移小程序时只需把本文件换成 tt.setStorageSync / wx.setStorageSync 实现。
 */
const PREFIX = 'toolbox.'

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 隐私模式 / 容量不足：静默降级为不缓存，不影响计算功能
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // noop
  }
}

/** 一键清除工具箱所有本地记录 */
export function clearAllToolbox(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    // noop
  }
}
