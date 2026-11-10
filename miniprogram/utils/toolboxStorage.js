"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadStore = loadStore;
exports.saveStore = saveStore;
exports.removeStore = removeStore;
/**
 * 工具箱本地存储（页面层）：封装 tt.* 存储 API，JSON 序列化 + 「toolbox.」命名空间。
 * 与 Web 版 src/utils/storage.ts 接口一致，迁移时只换实现。
 */
const PREFIX = 'toolbox.';
function loadStore(key, fallback) {
    try {
        const raw = tt.getStorageSync(PREFIX + key);
        if (raw == null || raw === '')
            return fallback;
        return JSON.parse(String(raw));
    }
    catch (_a) {
        return fallback;
    }
}
function saveStore(key, value) {
    try {
        tt.setStorageSync(PREFIX + key, JSON.stringify(value));
    }
    catch (_a) {
        // 存储失败静默降级，不影响计算
    }
}
function removeStore(key) {
    try {
        tt.removeStorageSync(PREFIX + key);
    }
    catch (_a) {
        // noop
    }
}
