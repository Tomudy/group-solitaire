/**
 * WXML 静态体检：
 *  1) 标签是否闭合、嵌套是否匹配
 *  2) WXML 里绑定的事件处理函数，在页面 JS 里是否真的定义了
 *  3) 弹窗高度内联 style 是否写到位（真机滚动依赖它们）
 * 用法: node tools/check-wxml.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wxml = fs.readFileSync(path.join(root, 'pages/index/index.wxml'), 'utf8')
const js = fs.readFileSync(path.join(root, 'pages/index/index.js'), 'utf8')

let bad = 0
const fail = (msg) => { bad += 1; console.log('  [FAIL] ' + msg) }
const ok = (msg) => console.log('  [OK]   ' + msg)

console.log('--- 1. 标签闭合 ---')
const VOID = new Set(['image', 'input', 'br', 'icon'])
const stack = []
const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g
let m
while ((m = re.exec(wxml))) {
  const closing = m[1] === '/'
  const tag = m[2]
  const selfClosed = m[4] === '/'
  if (selfClosed || VOID.has(tag)) continue
  if (!closing) stack.push(tag)
  else {
    const top = stack.pop()
    if (top !== tag) fail(`嵌套不匹配：期望 </${top}>，实际 </${tag}>`)
  }
}
if (stack.length) fail('未闭合标签：' + stack.join(', '))
if (!bad) ok('标签全部闭合且嵌套正确')

console.log('--- 2. 事件处理函数 ---')
const handlers = new Set()
const reEvt = /(?:bind|catch)(?::)?(\w+)\s*=\s*"([^"]+)"/g
let e
while ((e = reEvt.exec(wxml))) handlers.add(e[2])
const missing = [...handlers].filter((h) => !new RegExp('(^|\\s)' + h + '\\s*\\(').test(js))
if (missing.length) fail('JS 里缺少这些处理函数：' + missing.join(', '))
else ok(`WXML 引用 ${handlers.size} 个事件，JS 中均已定义（${[...handlers].join(', ')}）`)

console.log('--- 3. 弹窗高度（真机滚动依赖）---')
const need = [
  ['弹窗总高上限', 'style="max-height:{{sheetMaxH}}px"', 2],
  ['管理面板内容区固定高', 'style="height:{{sheetBodyH}}px"', 1],
  ['接龙弹窗内容区封顶', 'style="max-height:{{sheetBodyH}}px"', 1]
]
for (const [name, needle, times] of need) {
  const n = wxml.split(needle).length - 1
  if (n !== times) fail(`${name} 出现 ${n} 次，期望 ${times} 次`)
  else ok(`${name} 已写（${n} 处）`)
}
const hasMeasure = /measureSheet\s*\(\)\s*\{/.test(js) && /sheetBodyH/.test(js)
if (!hasMeasure) fail('JS 缺少 measureSheet() 或 sheetBodyH')
else ok('JS 已按窗口高度计算 sheetMaxH / sheetBodyH')

console.log('\n结果: ' + (bad ? `失败 ${bad} 项` : '全部通过'))
process.exit(bad ? 1 : 0)
