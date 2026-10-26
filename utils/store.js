/**
 * 数据层：接龙信息 / 接龙者列表 / 本机填报资料
 *
 * 数据落在小程序本地 Storage，刷新与重进都在。
 * 页面只调用本文件的方法，之后接云端只需替换这一个文件。
 */
const i18n = require('./i18n.js')

const KEY_DATA = 'gs_data_v1'
const KEY_PROFILE = 'gs_profile_v1'
const KEY_MINE = 'gs_mine_v1'
/* 本机稳定身份：用于判断「我是不是这场接龙的创建者」。
   上云后这里换成 openid 即可，权限判断逻辑不用动。 */
const KEY_SELF = 'gs_self_v1'

/* 内存缓存：启动时读一次，写操作同步回 Storage */
const cache = {
  ready: false,
  solitaire: null,
  participants: [],
  profile: null,
  myId: '',
  selfId: ''
}

function readLocal(key, def) {
  try {
    const v = wx.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return def
    return v
  } catch (e) {
    return def
  }
}

function writeLocal(key, val) {
  try {
    wx.setStorageSync(key, val)
  } catch (e) {}
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/* 时间文案一律交给 i18n，切换语言后重新取值即可生效 */
function formatTime(ts) {
  return i18n.formatTime(ts)
}

function formatDeadline(ts) {
  return i18n.formatDeadline(ts)
}

function deadlineText(ts) {
  return i18n.deadlineText(ts)
}

/** 头像可能是临时路径，转存到用户目录，避免被系统清理 */
function persistAvatar(tempPath) {
  if (!tempPath) return ''
  if (tempPath.indexOf('data:') === 0) return tempPath
  try {
    const fs = wx.getFileSystemManager()
    const parts = String(tempPath).split('.')
    let ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'png'
    if (ext.length > 4) ext = 'png'
    const target = wx.env.USER_DATA_PATH + '/gs_avatar_' + Date.now() + '.' + ext
    fs.saveFileSync(tempPath, target)
    return target
  } catch (e) {
    return ''
  }
}

function trim(str) {
  return String(str === undefined || str === null ? '' : str).replace(/^\s+|\s+$/g, '')
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/* ------------------------------------------------------------ 本机身份 */
function ensureSelf() {
  if (cache.selfId) return cache.selfId
  cache.selfId = readLocal(KEY_SELF, '')
  if (!cache.selfId) {
    cache.selfId = uid('u')
    writeLocal(KEY_SELF, cache.selfId)
  }
  return cache.selfId
}

function getSelfId() {
  ensure()
  return ensureSelf()
}

/* ------------------------------------------------------------ 创建者 */
function findParticipant(id) {
  for (let i = 0; i < cache.participants.length; i += 1) {
    if (cache.participants[i].id === id) return cache.participants[i]
  }
  return null
}

/**
 * 我是否是这场接龙的创建者
 * 两种成立情形：ownerId 等于本机身份，或 ownerId 等于我提交的那条记录
 * （后者用于创建者转让之后，新创建者凭自己的记录认领权限）
 */
function isOwner() {
  ensure()
  const ownerId = cache.solitaire && cache.solitaire.ownerId
  if (!ownerId) return false
  if (ownerId === ensureSelf()) return true
  return !!cache.myId && ownerId === cache.myId
}

/** 创建者信息：给页面展示与权限判断用 */
function getOwner() {
  ensure()
  const ownerId = (cache.solitaire && cache.solitaire.ownerId) || ''
  const hit = ownerId ? findParticipant(ownerId) : null
  return {
    id: ownerId,
    isMine: isOwner(),
    participantId: hit ? hit.id : '',
    name: hit ? hit.name : ((cache.profile && cache.profile.name) || '')
  }
}

/* ------------------------------------------------------------ 默认数据 */
/**
 * 空接龙：首次打开不再塞一场假的示例接龙，而是留空并标记 empty，
 * 由页面显示引导卡，让用户发起真正属于自己的第一场接龙。
 */
function defaultSolitaire() {
  return {
    id: 'solitaire_default',
    title: '',
    desc: '',
    host: '',
    location: '',
    deadlineAt: 0,
    quota: 0,
    createdAt: Date.now(),
    empty: true
  }
}


/* ------------------------------------------------------------ 初始化 */
function bootstrap() {
  if (cache.ready) return cache
  // 语言先就绪：后续所有文案都从 i18n 取
  i18n.init()
  const saved = readLocal(KEY_DATA, null)
  if (saved && saved.solitaire && Array.isArray(saved.participants)) {
    cache.solitaire = saved.solitaire
    cache.participants = saved.participants
  } else {
    cache.solitaire = defaultSolitaire()
    cache.participants = []
    flush()
  }
  cache.profile = readLocal(KEY_PROFILE, null)
  cache.myId = readLocal(KEY_MINE, '')
  ensureSelf()
  // 没有 ownerId 说明这是新接龙：谁先创建，谁是创建者。
  // 旧数据升级时也走这条分支，本机即视为创建者。
  if (!cache.solitaire.ownerId) {
    cache.solitaire.ownerId = cache.selfId
    flush()
  }
  cache.ready = true
  return cache
}

function flush() {
  writeLocal(KEY_DATA, {
    solitaire: cache.solitaire,
    participants: cache.participants
  })
}

function ensure() {
  if (!cache.ready) bootstrap()
}

/* ------------------------------------------------------------ 接龙信息 */
function getSolitaire() {
  ensure()
  const s = cache.solitaire
  const joined = cache.participants.length
  const quota = Number(s.quota) || 0
  const left = Math.max(0, quota - joined)
  const deadlineAt = Number(s.deadlineAt) || 0
  const expired = deadlineAt > 0 && deadlineAt < Date.now()
  const full = quota > 0 && left === 0
  // closed：发起人手动提前关闭（区别于时间到了的 expired）
  const closed = s.closed === true

  let status = 'open'
  if (closed) status = 'closed'
  else if (expired) status = 'expired'
  else if (full) status = 'full'

  const statusMap = {
    open: i18n.t('intro.status.open'),
    expired: i18n.t('intro.status.expired'),
    full: i18n.t('intro.status.full'),
    closed: i18n.t('intro.status.closed')
  }

  return {
    id: s.id,
    // empty：还没发起过接龙，页面据此显示引导卡而不是接龙详情
    empty: !!s.empty,
    title: s.title || '',
    desc: s.desc || '',
    host: s.host || '',
    location: s.location || '',
    quota: quota,
    joined: joined,
    left: left,
    // 带数字的文案在 JS 层拼好，WXML 只做展示
    joinedText: i18n.t('intro.joined', { n: joined }),
    quotaLeftText: quota > 0
      ? i18n.t('intro.quotaLeft', { n: left })
      : i18n.t('intro.quotaUnlimited'),
    deadlineAt: deadlineAt,
    deadlineFullText: formatDeadline(deadlineAt),
    deadlineText: deadlineText(deadlineAt),
    status: status,
    statusText: statusMap[status],
    closed: closed,
    percent: quota > 0 ? Math.min(100, Math.round(joined / quota * 100)) : 0,
    canJoin: status === 'open',
    isOwner: isOwner()
  }
}

/* ------------------------------------------------------------ 接龙者 */
function decorate(list) {
  // WXML 不支持在 {{}} 里调用方法，时间文案与首字母在这里算好
  return list.map(function (it, idx) {
    const name = it.name || ''
    return {
      id: it.id,
      seq: idx + 1,
      name: name,
      initial: name ? name.slice(0, 1) : '?',
      avatar: it.avatar || '',
      source: it.source || 'manual',
      sourceText: it.source === 'wechat'
        ? i18n.t('list.sourceWechat')
        : i18n.t('list.sourceManual'),
      remark: it.remark || '',
      mine: !!cache.myId && it.id === cache.myId,
      isOwner: it.id === ((cache.solitaire && cache.solitaire.ownerId) || ''),
      createdAt: it.createdAt,
      timeText: formatTime(it.createdAt)
    }
  })
}

function listParticipants() {
  ensure()
  const sorted = cache.participants.slice().sort(function (a, b) {
    return (a.createdAt || 0) - (b.createdAt || 0)
  })
  return decorate(sorted)
}

/**
 * 新增一条接龙记录
 * payload: { name, avatar, source, remark }
 * 返回 { ok, msg, id }
 */
function addParticipant(payload) {
  ensure()
  const name = trim(payload && payload.name)
  if (!name) return { ok: false, msg: i18n.t('err.nameRequired') }
  if (name.length > 20) return { ok: false, msg: i18n.t('err.nameTooLong') }

  const s = cache.solitaire
  const quota = Number(s.quota) || 0
  if (quota > 0 && cache.participants.length >= quota) {
    return { ok: false, msg: i18n.t('err.full') }
  }
  if (Number(s.deadlineAt) > 0 && Number(s.deadlineAt) < Date.now()) {
    return { ok: false, msg: i18n.t('err.expired') }
  }

  const remark = trim(payload && payload.remark)
  if (remark.length > 60) return { ok: false, msg: i18n.t('err.remarkTooLong') }

  const record = {
    id: uid('p'),
    name: name,
    avatar: persistAvatar(payload && payload.avatar),
    source: (payload && payload.source) === 'wechat' ? 'wechat' : 'manual',
    remark: remark,
    createdAt: Date.now()
  }
  cache.participants.push(record)
  flush()
  // 记下本机提交过的记录，用于「我已接龙」状态与取消接龙
  cache.myId = record.id
  writeLocal(KEY_MINE, record.id)
  return { ok: true, id: record.id }
}

/**
 * 删除一条接龙记录
 * 允许：我删我自己的；创建者删任何人。
 * 例外：当前发起人自己的记录受保护 —— 要删得先转让身份。
 */
function removeParticipant(id) {
  ensure()
  const target = findParticipant(id)
  if (!target) return { ok: false, msg: i18n.t('err.notFound') }

  const isMine = !!cache.myId && cache.myId === target.id
  if (!isMine && !isOwner()) {
    return { ok: false, msg: i18n.t('err.notOwner') }
  }
  if (target.id === cache.solitaire.ownerId) {
    return { ok: false, msg: i18n.t('err.ownerProtected') }
  }

  cache.participants = cache.participants.filter(function (it) {
    return it.id !== id
  })
  flush()
  if (cache.myId === id) {
    cache.myId = ''
    writeLocal(KEY_MINE, '')
  }
  return { ok: true }
}

/**
 * 更新一条已有的接龙记录，保留原 createdAt（序号与接龙时间不变）
 * 返回 { ok, msg }
 */
function updateParticipant(id, payload) {
  ensure()
  const name = trim(payload && payload.name)
  if (!name) return { ok: false, msg: i18n.t('err.nameRequired') }
  if (name.length > 20) return { ok: false, msg: i18n.t('err.nameTooLong') }

  const remark = trim(payload && payload.remark)
  if (remark.length > 60) return { ok: false, msg: i18n.t('err.remarkTooLong') }

  let hit = null
  for (let i = 0; i < cache.participants.length; i += 1) {
    if (cache.participants[i].id === id) {
      hit = cache.participants[i]
      break
    }
  }
  if (!hit) return { ok: false, msg: i18n.t('err.notFound') }

  const isMine = !!cache.myId && cache.myId === hit.id
  if (!isMine && !isOwner()) {
    return { ok: false, msg: i18n.t('err.notOwner') }
  }

  hit.name = name
  hit.remark = remark
  hit.source = (payload && payload.source) === 'wechat' ? 'wechat' : 'manual'
  if (payload && payload.avatar) {
    hit.avatar = persistAvatar(payload.avatar)
  }
  flush()
  return { ok: true, id: id }
}

/* ------------------------------------------------------------ 创建者特权 */
const EDITABLE_TEXT = [
  ['title', 60],
  ['desc', 200],
  ['host', 20],
  ['location', 60]
]

/**
 * 编辑接龙信息 —— 仅创建者
 * payload 可含：title / desc / host / location / quota / deadlineAt / closed
 * quota 传 0 表示不限名额；closed=true 提前关闭，false 重开
 */
function updateSolitaire(payload) {
  ensure()
  if (!isOwner()) return { ok: false, msg: i18n.t('err.notOwner') }

  const p = payload || {}
  const s = cache.solitaire

  /* 先整体校验，校验通过才落盘，避免改一半留脏数据 */
  if (p.quota !== undefined) {
    const q = Number(p.quota)
    if (isNaN(q) || q < 0) return { ok: false, msg: i18n.t('err.invalidQuota') }
    if (q > 0 && q < cache.participants.length) {
      return { ok: false, msg: i18n.t('err.quotaBelowJoined') }
    }
  }
  if (p.deadlineAt !== undefined) {
    const d = Number(p.deadlineAt)
    if (!d || d <= 0) return { ok: false, msg: i18n.t('err.invalidDeadline') }
  }
  for (let i = 0; i < EDITABLE_TEXT.length; i += 1) {
    const key = EDITABLE_TEXT[i][0]
    const max = EDITABLE_TEXT[i][1]
    if (p[key] === undefined) continue
    const v = trim(p[key])
    if (!v) continue // 空值视为不修改，不是清空
    if (v.length > max) return { ok: false, msg: i18n.t('err.fieldTooLong') }
  }

  for (let i = 0; i < EDITABLE_TEXT.length; i += 1) {
    const key = EDITABLE_TEXT[i][0]
    if (p[key] === undefined) continue
    const v = trim(p[key])
    if (!v) continue
    s[key] = v
  }
  if (p.quota !== undefined) s.quota = Math.floor(Number(p.quota))
  if (p.deadlineAt !== undefined) s.deadlineAt = Number(p.deadlineAt)
  if (p.closed !== undefined) s.closed = !!p.closed
  // 保存过一次就不再是空态：接龙正式成立
  if (s.empty) s.empty = false

  flush()
  return { ok: true }
}

/** 转让发起人身份 —— 仅创建者，且目标必须是现有接龙者 */
function transferOwner(targetId) {
  ensure()
  if (!isOwner()) return { ok: false, msg: i18n.t('err.notOwner') }
  const id = trim(targetId)
  if (!id) return { ok: false, msg: i18n.t('err.notFound') }
  const hit = findParticipant(id)
  if (!hit) return { ok: false, msg: i18n.t('err.notFound') }
  if (hit.id === cache.solitaire.ownerId) return { ok: false, msg: i18n.t('err.notFound') }

  cache.solitaire.ownerId = hit.id
  flush()
  return { ok: true, id: hit.id }
}

/* ------------------------------------------------------------ 本机资料 */
function getProfile() {
  ensure()
  if (!cache.profile) cache.profile = { name: '', avatar: '', source: 'wechat' }
  if (!cache.profile.source) cache.profile.source = 'wechat'
  return cache.profile
}

function saveProfile(profile) {
  ensure()
  cache.profile = {
    name: trim(profile && profile.name),
    avatar: trim(profile && profile.avatar),
    // 记住上次用的来源，下次弹窗直接沿用，不用再切一次
    source: (profile && profile.source) === 'manual' ? 'manual' : 'wechat'
  }
  writeLocal(KEY_PROFILE, cache.profile)
  return cache.profile
}

/** 清空全部接龙数据，回到初始示例状态（调试用） */
function resetAll() {
  cache.solitaire = defaultSolitaire()
  cache.participants = []
  cache.profile = { name: '', avatar: '' }
  cache.myId = ''
  // 重置数据不等于换人：本机身份保留，重置后依旧是这场接龙的创建者
  if (!cache.selfId) ensureSelf()
  cache.solitaire.ownerId = cache.selfId
  cache.solitaire.closed = false
  flush()
  writeLocal(KEY_PROFILE, cache.profile)
  writeLocal(KEY_MINE, '')
  return true
}

function getMyId() {
  ensure()
  return cache.myId || ''
}

module.exports = {
  bootstrap: bootstrap,
  getSolitaire: getSolitaire,
  updateSolitaire: updateSolitaire,
  getOwner: getOwner,
  transferOwner: transferOwner,
  isOwner: isOwner,
  getSelfId: getSelfId,
  listParticipants: listParticipants,
  addParticipant: addParticipant,
  updateParticipant: updateParticipant,
  removeParticipant: removeParticipant,
  getProfile: getProfile,
  saveProfile: saveProfile,
  getMyId: getMyId,
  resetAll: resetAll,
  formatTime: formatTime,
  formatDeadline: formatDeadline
}
