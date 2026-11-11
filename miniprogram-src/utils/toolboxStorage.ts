/**
 * 工具箱本地存储（页面层）：封装 tt.* 存储 API，JSON 序列化 + 「toolbox.」命名空间。
 * 与 Web 版 src/utils/storage.ts 接口一致，迁移时只换实现。
 */
const PREFIX = 'toolbox.'

export function loadStore<T>(key: string, fallback: T): T {
  try {
    const raw = tt.getStorageSync(PREFIX + key)
    if (raw == null || raw === '') return fallback
    return JSON.parse(String(raw)) as T
  } catch {
    return fallback
  }
}

export function saveStore(key: string, value: unknown): void {
  try {
    tt.setStorageSync(PREFIX + key, JSON.stringify(value))
  } catch {
    // 存储失败静默降级，不影响计算
  }
}

export function removeStore(key: string): void {
  try {
    tt.removeStorageSync(PREFIX + key)
  } catch {
    // noop
  }
}
