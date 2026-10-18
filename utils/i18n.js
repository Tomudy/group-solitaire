/**
 * 国际化引擎
 *
 * - 语言包在 ./locales/，中英键一一对应
 * - 语言选择持久化到 Storage，下次进入沿用
 * - 首次进入按系统语言判断，非中/英一律回退中文
 * - t() 支持 {n} 占位符；n 为 1 时自动取 xxx_one 单数变体
 */
const zh = require('./locales/zh.js')
const en = require('./locales/en.js')

const KEY_LANG = 'gs_lang_v1'
const SUPPORTED = ['zh', 'en']
const FALLBACK = 'zh'

const DICT = { zh: zh, en: en }

let current = FALLBACK
let inited = false

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/** 'zh_CN' / 'zh-Hans' / 'ZH' -> 'zh'；'en_US' -> 'en'；其它 -> '' */
function normalize(lang) {
  const s = String(lang || '').toLowerCase().replace(/_/g, '-')
  if (!s) return ''
  if (s.indexOf('zh') === 0) return 'zh'
  if (s.indexOf('en') === 0) return 'en'
  return ''
}

function readStorage(key) {
  try {
    if (typeof wx === 'undefined' || !wx.getStorageSync) return ''
    const v = wx.getStorageSync(key)
    return v === null || v === undefined ? '' : String(v)
  } catch (e) {
    return ''
  }
}

function writeStorage(key, val) {
  try {
    if (typeof wx === 'undefined' || !wx.setStorageSync) return
    wx.setStorageSync(key, val)
  } catch (e) {}
}

/** 系统语言：优先新 API，回退旧 API，拿不到返回空串 */
function systemLang() {
  try {
    if (typeof wx === 'undefined') return ''
    if (wx.getAppBaseInfo) {
      const info = wx.getAppBaseInfo() || {}
      return info.language || ''
    }
    if (wx.getSystemInfoSync) {
      const info = wx.getSystemInfoSync() || {}
      return info.language || ''
    }
  } catch (e) {}
  return ''
}

/** 首次进入的语言决策：已保存 > 系统语言 > 中文 */
function init() {
  if (inited) return current

  const saved = normalize(readStorage(KEY_LANG))
  if (saved) {
    current = saved
  } else {
    current = normalize(systemLang()) || FALLBACK
    // 非中/英语系一律回退中文
    if (SUPPORTED.indexOf(current) < 0) current = FALLBACK
  }

  inited = true
  return current
}

function getLang() {
  if (!inited) init()
  return current
}

/** 设置语言并持久化，返回是否真的变化了 */
function setLang(lang) {
  const next = normalize(lang)
  if (!next || SUPPORTED.indexOf(next) < 0) return false
  if (next === current && inited) return false
  current = next
  inited = true
  writeStorage(KEY_LANG, next)
  return true
}

/** 在中文 / 英文之间切换，返回切换后的语言 */
function toggleLang() {
  setLang(current === 'zh' ? 'en' : 'zh')
  return current
}

/**
 * 取文案
 * t('intro.quotaLeft', { n: 3 }) -> '还剩 3 个名额'
 * n === 1 且存在 xxx_one 时用单数文案
 */
function t(key, params) {
  if (!inited) init()
  let dict = DICT[current] || DICT[FALLBACK]

  let useKey = key
  if (params && params.n === 1 && dict[key + '_one'] !== undefined) {
    useKey = key + '_one'
  }

  let text = dict[useKey]
  if (text === undefined) text = (DICT[FALLBACK] || {})[key]
  if (text === undefined) text = key

  // 数组（如星期、月份）直接返回，不做占位符处理
  if (Array.isArray(text)) return text
  if (!params) return String(text)

  return String(text).replace(/\{(\w+)\}/g, function (m, name) {
    return params[name] === undefined || params[name] === null ? '' : String(params[name])
  })
}

/** 当前语言的星期名数组 */
function weekdays() {
  return t('time.weekdays') || []
}

/**
 * 给页面用的文案表：键名里的点转成下划线，方便 WXML 用 {{t.intro_host}} 绑定。
 * 数组（星期/月份）与示例数据不进页面文案表。
 */
function messages() {
  if (!inited) init()
  const dict = DICT[current] || DICT[FALLBACK]
  const out = {}
  Object.keys(dict).forEach(function (key) {
    if (key.indexOf('demo.') === 0) return
    if (key.indexOf('time.') === 0) return
    out[key.replace(/\./g, '_')] = dict[key]
  })
  return out
}

/* ------------------------------------------------------------ 时间格式化 */
function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/** 列表时间：中文 10-18 14:30；英文 Oct 18 14:30 */
function formatTime(ts) {
  const d = toDate(ts)
  if (!d) return ''
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  if (current === 'en') {
    const months = t('time.months')
    return (months[d.getMonth()] || '') + ' ' + d.getDate() + ' ' + hh + ':' + mm
  }
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hh + ':' + mm
}

/** 截止时间：中文 10月25日 周六 18:00；英文 Oct 25 Sat 18:00 */
function formatDeadline(ts) {
  const d = toDate(ts)
  if (!d) return ''
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const wd = weekdays()[d.getDay()] || ''
  if (current === 'en') {
    const months = t('time.months')
    return (months[d.getMonth()] || '') + ' ' + d.getDate() + ' ' + wd + ' ' + hh + ':' + mm
  }
  const months = t('time.months')
  return (months[d.getMonth()] || (d.getMonth() + 1) + '月') + d.getDate() + '日 ' + wd + ' ' + hh + ':' + mm
}

/** 距截止多久：中文 距截止 7 天；英文 Closes in 7 days */
function deadlineText(ts) {
  const d = toDate(ts)
  if (!d) return ''
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return t('intro.closed')

  const day = Math.floor(diff / 86400000)
  if (day >= 1) return t('intro.closesInDays', { n: day })

  const hour = Math.floor(diff / 3600000)
  if (hour >= 1) return t('intro.closesInHours', { n: hour })

  return t('intro.closesInMinutes', { n: Math.max(1, Math.floor(diff / 60000)) })
}

module.exports = {
  init: init,
  getLang: getLang,
  setLang: setLang,
  toggleLang: toggleLang,
  t: t,
  messages: messages,
  weekdays: weekdays,
  formatTime: formatTime,
  formatDeadline: formatDeadline,
  deadlineText: deadlineText,
  SUPPORTED: SUPPORTED,
  KEY_LANG: KEY_LANG
}
