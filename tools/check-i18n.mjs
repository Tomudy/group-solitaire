/**
 * 双语一致性校验（不参与打包，tools/ 已在 packOptions.ignore）
 * 检查项：
 *  1. zh / en 键集合完全相同
 *  2. 数组类条目长度一致
 *  3. {n} 占位符在中英两侧一致
 *  4. WXML 里 {{t.xxx}} 引用的键都能在页面文案表中找到
 *  5. JS 里 i18n.t('xxx') 用的键都在语言包里
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const zh = require(path.join(root, 'utils/locales/zh.js'))
const en = require(path.join(root, 'utils/locales/en.js'))

let fail = 0
const bad = (m) => { console.log('  [FAIL] ' + m); fail += 1 }
const ok = (m) => console.log('  [OK]   ' + m)

/* ---------- 1. 键集合 ---------- */
console.log('--- 1. 中英键一一对应 ---')
const zk = Object.keys(zh)
const ek = Object.keys(en)
const onlyZh = zk.filter((k) => !(k in en))
const onlyEn = ek.filter((k) => !(k in zh))
onlyZh.length ? bad('仅中文有: ' + onlyZh.join(', ')) : ok('无中文独有键')
onlyEn.length ? bad('仅英文有: ' + onlyEn.join(', ')) : ok('无英文独有键')
console.log('  键总数: zh=' + zk.length + '  en=' + ek.length)

/* ---------- 2. 数组长度 ---------- */
console.log('--- 2. 数组条目长度一致 ---')
zk.forEach((k) => {
  if (!Array.isArray(zh[k])) return
  if (!Array.isArray(en[k])) { bad(k + ' 英文不是数组'); return }
  if (zh[k].length !== en[k].length) bad(k + ' 长度不一致 ' + zh[k].length + ' vs ' + en[k].length)
})
ok('数组长度检查完成')

/* ---------- 3. 占位符一致 ---------- */
console.log('--- 3. {n} 占位符一致 ---')
let phBad = 0
zk.forEach((k) => {
  if (typeof zh[k] !== 'string') return
  const pz = (zh[k].match(/\{(\w+)\}/g) || []).sort().join('')
  const pe = (String(en[k] || '').match(/\{(\w+)\}/g) || []).sort().join('')
  if (pz !== pe) { bad(k + ' 占位符不一致: ' + pz + ' vs ' + pe); phBad += 1 }
})
if (!phBad) ok('占位符全部一致')

/* ---------- 4. WXML 引用的键 ---------- */
console.log('--- 4. WXML 引用的键存在 ---')
const wxml = fs.readFileSync(path.join(root, 'pages/index/index.wxml'), 'utf8')
// 页面文案表：排除 demo.* 与 time.*，键名点转下划线
const pageKeys = new Set(
  zk.filter((k) => k.indexOf('demo.') !== 0 && k.indexOf('time.') !== 0)
    .map((k) => k.replace(/\./g, '_'))
)
const used = [...new Set([...wxml.matchAll(/\bt\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]))]
let miss = 0
used.forEach((k) => { if (!pageKeys.has(k)) { bad('WXML 用了不存在的键 t.' + k); miss += 1 } })
if (!miss) ok('WXML 引用 ' + used.length + ' 个键，全部存在')

/* ---------- 5. JS 里用的键 ---------- */
console.log('--- 5. JS 里 i18n.t() 的键存在 ---')
const jsFiles = ['pages/index/index.js', 'utils/store.js', 'utils/i18n.js']
let usedJs = []
jsFiles.forEach((f) => {
  const src = fs.readFileSync(path.join(root, f), 'utf8')
  // 同时匹配 i18n.t('x') 与 i18n 内部的 t('x')
  ;[...src.matchAll(/\bt\(\s*'([^']+)'/g)].forEach((m) => usedJs.push(m[1]))
})
usedJs = [...new Set(usedJs)]
let missJs = 0
usedJs.forEach((k) => {
  if (!(k in zh)) { bad('JS 用了 zh 缺失的键: ' + k); missJs += 1 }
  if (!(k in en)) { bad('JS 用了 en 缺失的键: ' + k); missJs += 1 }
})
if (!missJs) ok('JS 引用 ' + usedJs.length + ' 个键，中英都存在')

/* ---------- 6. 反向：语言包里没被用到的键（提示，不算失败） ---------- */
const allUsed = new Set([...used.map((k) => k.replace(/_/g, '.')), ...usedJs])
const unused = zk.filter((k) => !allUsed.has(k) && !k.endsWith('_one') && k.indexOf('demo.') !== 0 && k.indexOf('time.') !== 0)
console.log('--- 6. 未被引用键（提示） ---')
console.log(unused.length ? '  ' + unused.join(', ') : '  无')

console.log('\n结果: ' + (fail === 0 ? '双语校验全部通过' : fail + ' 项失败'))
process.exit(fail ? 1 : 0)
