import { useCallback, useState } from 'react'
import { loadJSON, removeKey, saveJSON } from '../utils/storage'

/**
 * 带本地持久化的 useState：写入即保存、挂载即恢复。
 * 注意：initial 请传稳定引用（模块级常量），否则 clear 的依赖会随渲染变化。
 */
export function useLocalState<T>(
  key: string,
  initial: T,
): readonly [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => loadJSON(key, initial))

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        saveJSON(key, resolved)
        return resolved
      })
    },
    [key],
  )

  const clear = useCallback(() => {
    removeKey(key)
    setValue(initial)
  }, [key, initial])

  return [value, update, clear] as const
}
