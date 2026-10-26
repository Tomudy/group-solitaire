/**
 * 布局风险筛查（不参与打包）
 *
 * 英文普遍比中文长，切换语言后最容易出问题的是「固定宽度容器 + 单行文本」。
 * 这里按 375px 屏宽（iPhone 6/7/8，1rpx = 0.5px）估算每条文案的渲染宽度，
 * 与所在容器宽度比对，标出可能溢出/被截断的项。
 *
 * 字符宽度取常见值：CJK 约 1.0em，ASCII 小写约 0.52em，大写 0.62em，
 * 数字 0.56em，空格 0.28em。属工程估算，用于发现明显风险，不替代真机目测。
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const en = require(path.join(root, 'utils/locales/en.js'))
const zh = require(path.join(root, 'utils/locales/zh.js'))

const SCREEN = 375

function textWidth(str, fontSize) {
  let w = 0
  for (const ch of String(str)) {
    const code = ch.codePointAt(0)
    if (code > 0x2e80) w += fontSize * 1.0          // CJK / 全角
    else if (ch === ' ') w += fontSize * 0.28
    else if (ch >= 'A' && ch <= 'Z') w += fontSize * 0.62
    else if (ch >= '0' && ch <= '9') w += fontSize * 0.56
    else if (ch === '.' || ch === ',' || ch === '!' || ch === "'" || ch === '"' || ch === '-' || ch === '#')
      w += fontSize * 0.3
    else w += fontSize * 0.52                        // 小写等
  }
  return w
}

/**
 * 检查项：文案键、字号(rpx)、容器可用宽度、说明
 * 容器宽度按 375px 屏推算，见各行注释
 */
const CASES = [
  // 卡片：margin 24rpx*2 + padding 28rpx*2 -> 375-24-28 = 323
  { key: 'intro.status.open',   size: 22, box: 323, note: '状态标签' },
  { key: 'intro.status.expired', size: 22, box: 323, note: '状态标签' },
  // meta 内：323 - padding 20rpx*2 = 303，meta-k 自适应宽度，这里按最长 meta-v 检查
  { key: 'intro.deadline',      size: 24, box: 303, note: 'meta 键（已改自适应宽度）' },
  // progress 行：左 + 右，合计不超 323
  { key: 'intro.joined',        size: 26, box: 323, note: '进度左（渲染为 "20 joined"）' },
  { key: 'intro.quotaLeft',     size: 24, box: 323, note: '进度右（渲染为 "17 spots left"）' },
  { key: 'intro.closed',        size: 23, box: 323, note: '截止提示' },
  // sec-title：375 - padding 24rpx*2 = 351，含 bar 8rpx + count
  { key: 'list.title',          size: 32, box: 351, note: '分区标题（同行还有计数）' },
  { key: 'list.count',          size: 24, box: 351, note: '分区计数' },
  // list-card 内：375 - 24 - padding 28rpx*2 = 323
  { key: 'list.emptyTitle',     size: 28, box: 323, note: '空态主文案' },
  { key: 'list.emptySub',       size: 24, box: 323, note: '空态副文案' },
  // footer：375 - padding 32rpx*2 = 343，两个按钮各约 163（btn-flex + margin 8rpx）
  { key: 'footer.cancel',       size: 30, box: 163, note: '底部左按钮' },
  { key: 'footer.edit',         size: 30, box: 163, note: '底部右按钮（最长状态）' },
  { key: 'footer.tip',          size: 24, box: 343, note: '底部提示整行' },
  // sheet：375 - padding 32rpx*2 = 343
  { key: 'sheet.title',         size: 34, box: 343, note: '弹窗标题' },
  // avatar-tip：343 - 头像 120rpx - margin 24rpx = 343-60-12 = 271
  { key: 'sheet.avatarTitle',   size: 27, box: 271, note: '头像提示主文案' },
  { key: 'sheet.avatarSub',     size: 22, box: 271, note: '头像提示副文案' },
  // seg-item：343 - seg padding 6rpx*2 = 337，两个各约 168
  { key: 'sheet.tabWechat',     size: 26, box: 168, note: '来源切换左' },
  { key: 'sheet.tabManual',     size: 26, box: 168, note: '来源切换右' },
  // quick：343 - padding 24rpx*2 = 319（可换行，只做告警）
  { key: 'sheet.quickTitle',    size: 28, box: 319, note: '一键填入主文案' },
  { key: 'sheet.quickSub',      size: 22, box: 319, note: '一键填入副文案' },
  // input / hint：343 - padding 24rpx*2 = 319（hint 可换行）
  { key: 'sheet.namePhWechat',  size: 28, box: 319, note: '昵称输入框占位符' },
  { key: 'sheet.hintWechat',    size: 22, box: 319, note: '昵称提示（可换行）' },
  { key: 'sheet.remarkPh',      size: 28, box: 319, note: '备注占位符' },
  // 弹窗按钮：取消 220rpx=110，确认 flex:1 ≈ 343-110-20 = 213
  { key: 'sheet.cancel',        size: 30, box: 110, note: '弹窗取消按钮' },
  { key: 'sheet.submit',        size: 30, box: 213, note: '弹窗确认按钮' },
  // 空态引导卡（卡片内宽 686rpx = 343px，左右各留 32rpx 内边距）
  { key: 'empty.title',         size: 34, box: 323, note: '空态主标题' },
  { key: 'empty.action',        size: 30, box: 323, note: '空态按钮文案' },
  // 卡片底部操作行：两个入口各占一半（343/2 - 分隔线 ≈ 168）
  { key: 'intro.share',         size: 27, box: 160, note: '转发入口' },
  { key: 'owner.manage',        size: 27, box: 160, note: '管理入口' },
  // 意见反馈入口（居中，两侧留白充裕）
  { key: 'contact.entry',       size: 24, box: 300, note: '客服入口' }
]

let warn = 0
let over = 0
console.log('屏宽基准: ' + SCREEN + 'px（1rpx = 0.5px）\n')
console.log('容器   | 文案宽 | 状态 | 说明')
console.log('-------|--------|------|------')

CASES.forEach((c) => {
  const raw = en[c.key]
  if (raw === undefined) {
    console.log('  [缺失] ' + c.key)
    over += 1
    return
  }
  // 占位符按实际渲染值代入
  const sample = String(raw)
    .replace('{n}', c.key === 'demo.location' ? '17' : '20')
  const w = textWidth(sample, c.size / 2)
  const box = c.box
  const ratio = w / box
  let flag = 'OK  '
  if (ratio > 1) { flag = '溢出'; over += 1 }
  else if (ratio > 0.92) { flag = '临界'; warn += 1 }
  console.log(
    String(box).padStart(5) + 'px | ' +
    w.toFixed(0).padStart(5) + 'px | ' + flag + ' | ' + c.note +
    '  («' + sample + '»)'
  )
})

console.log('\n中文对照（同一批键，确认不会比英文更宽）:')
CASES.slice(0, 8).forEach((c) => {
  const raw = zh[c.key]
  if (raw === undefined) return
  const sample = String(raw).replace('{n}', '20')
  console.log('  ' + c.key.padEnd(22) + ' ' + textWidth(sample, c.size / 2).toFixed(0) + 'px / ' + c.box + 'px')
})

console.log('\n结果: 溢出 ' + over + ' 项，临界 ' + warn + ' 项')
console.log('注: 估算用于发现明显风险；hint / desc / empty 等多行文本允许换行，不计溢出。')
console.log('    p-name 有 300rpx 上限并带省略号，超长英文名会省略显示（原设计即如此）。')
process.exit(over ? 1 : 0)
