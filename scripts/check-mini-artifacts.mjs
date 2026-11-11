/**
 * 小程序产物守护：扫描 miniprogram/ 下所有文本文件，
 * ① 检查执行器残留（__zwork / PIPESTATUS / zwork: —— heredoc 未闭合时可能混入）；
 * ② 校验全部 .json 可解析。
 * 已挂进 npm run mini:build，防止此类文件再次进仓库。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = 'miniprogram'
const artifactRe = /__zwork|PIPESTATUS|zwork:/
const bad = []

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      walk(p)
      continue
    }
    if (!/\.(ttml|ttss|json|js)$/.test(name)) continue
    const text = readFileSync(p, 'utf8')
    const rel = relative('.', p)
    if (artifactRe.test(text)) bad.push(`${rel}（含执行器残留）`)
    if (name.endsWith('.json')) {
      try {
        JSON.parse(text)
      } catch {
        bad.push(`${rel}（JSON 无法解析）`)
      }
    }
  }
}

walk(root)
if (bad.length > 0) {
  console.error('❌ 小程序文件检查失败：\n' + bad.map((b) => '  - ' + b).join('\n'))
  process.exit(1)
}
console.log('✅ miniprogram 文件检查通过（无残留，JSON 全部可解析）')
