/**
 * 抖音小程序最小环境声明。
 * 只声明本项目实际用到的 API，让 `tsc -p miniprogram-src` 可以做全量类型检查。
 * 若后续用到更多 tt.* 能力，在这里补充声明即可。
 */

type IAnyObject = Record<string, any>

declare namespace Page {
  interface Instance<D extends IAnyObject = IAnyObject, C extends IAnyObject = IAnyObject> {
    data: D
    setData(data: Partial<D> | IAnyObject, callback?: () => void): void
  }
  /** data + 自定义方法；ThisType 让方法内的 this 指向页面实例 */
  type Options<D extends IAnyObject = IAnyObject, C extends IAnyObject = IAnyObject> = {
    data: D
  } & C & ThisType<Instance<D, C> & C>
}

declare function Page<D extends IAnyObject, C extends IAnyObject = IAnyObject>(
  options: Page.Options<D, C>,
): void

declare function App(options: IAnyObject): void
declare function getApp(): IAnyObject

declare namespace tt {
  interface ScrollOffset {
    scrollTop: number
    scrollLeft: number
  }
  interface BoundingClientRect {
    top: number
    bottom: number
    left: number
    right: number
    width: number
    height: number
  }
  interface SelectorQuery {
    select(selector: string): SelectorQuery
    selectViewport(): SelectorQuery
    boundingClientRect(cb?: (rect: BoundingClientRect | null) => void): SelectorQuery
    scrollOffset(cb?: (rect: ScrollOffset | null) => void): SelectorQuery
    exec(cb?: (res: any[]) => void): void
  }
  function createSelectorQuery(): SelectorQuery
  function pageScrollTo(options: { scrollTop?: number; duration?: number }): void
  function setClipboardData(options: { data: string; success?: () => void; fail?: () => void }): void
  function showToast(options: { title: string; icon?: 'success' | 'fail' | 'loading' | 'none'; duration?: number }): void
  function navigateTo(options: { url: string }): void
  function setStorageSync(key: string, data: unknown): void
  function getStorageSync(key: string): string
  function removeStorageSync(key: string): void
}

declare function setTimeout(cb: (...args: any[]) => void, delay?: number, ...args: any[]): number
declare function clearTimeout(id: number): void
declare function setInterval(cb: (...args: any[]) => void, delay?: number, ...args: any[]): number
declare function clearInterval(id: number): void

/** 页面事件（仅声明本项目用到的字段） */
declare namespace MiniEvent {
  interface Base {
    type: string
    timeStamp: number
  }
  interface Input extends Base {
    detail: { value: string }
    currentTarget: { dataset: IAnyObject }
  }
  interface PickerChange extends Base {
    detail: { value: string | number | Array<string | number> }
    currentTarget: { dataset: IAnyObject }
  }
  interface Tap extends Base {
    detail: IAnyObject
    currentTarget: { dataset: IAnyObject }
  }
}

declare const console: {
  log(...args: any[]): void
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}
