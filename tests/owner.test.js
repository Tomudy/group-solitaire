/**
 * 创建者（所有者）能力测试
 *   node tests/owner.test.js
 *
 * 关键点：权限测试必须能「换个人」，否则自称创建者自己测自己永远都是绿的。
 * 这里的做法是一次次清掉 require 缓存重加载 store，再改写 Storage 里的
 * 本机身份 KEY_SELF / 我的记录 KEY_MINE，模拟不同设备打开同一份接龙数据。
 */
const path = require('path')

/* ---------------- mock 小程序运行时 ---------------- */
const mem = {}
const fsMock = { saveFileSync: (src, target) => target }
global.wx = {
  env: { USER_DATA_PATH: '/tmp/gs_user' },
  getStorageSync: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = v },
  removeStorageSync: (k) => { delete mem[k] },
  getFileSystemManager: () => fsMock,
  showToast: () => {}
}

const STORE = path.join(__dirname, '..', 'utils', 'store.js')
const I18N = path.join(__dirname, '..', 'utils', 'i18n.js')

/** 模拟另一台机器打开：清模块缓存 + 可选改写身份 */
function freshStore(opts) {
  const o = opts || {}
  if (o.selfId) mem.gs_self_v1 = o.selfId
  if (o.myId !== undefined) mem.gs_mine_v1 = o.myId
  delete require.cache[require.resolve(STORE)]
  delete require.cache[require.resolve(I18N)]
  const S = require(STORE)
  S.bootstrap()
  return S
}

let pass = 0
let fail = 0
function check(name, cond, extra) {
  if (cond) {
    pass += 1
    console.log('  [OK]   ' + name)
  } else {
    fail += 1
    console.log('  [FAIL] ' + name + (extra ? ' -> ' + extra : ''))
  }
}
function isMsg(r, key) {
  return r && r.ok === false && String(r.msg || '').indexOf(key) >= 0
}

/* ================= 场景 1：创建者本人 ================= */
console.log('--- 1. 创建者本人（发起人自己的手机）---')
Object.keys(mem).forEach((k) => { delete mem[k] })
const A = freshStore()
const creatorId = A.getSelfId()
let owner = A.getOwner()
check('拿到了本机稳定身份', !!creatorId, 'selfId=' + creatorId)
check('创建者 id 已写入接龙数据', !!owner.id && owner.id === creatorId, JSON.stringify(owner))
check('标识为「我是创建者」', owner.isMine === true)
check('getSolitaire 带出权限标记', A.getSolitaire().isOwner === true)

/* 空态不再自带示例名单，这里自己发起一场并造几条记录，
   供后面的越权、转让、名额校验等用例使用 */
A.updateSolitaire({
  title: '周末羽毛球',
  quota: 20,
  deadlineAt: Date.now() + 7 * 86400000
})
;['涛哥', '小林', '阿杰'].forEach((n) => {
  A.addParticipant({ name: n, avatar: '', remark: '', source: 'manual' })
})
check('发起后不再为空态', A.getSolitaire().empty === false)

/* ================= 场景 2：换个人，同一份接龙数据 ================= */
console.log('--- 2. 另一台设备打开同一场接龙 ---')
let list = A.listParticipants()
const victimId = list[0].id
const B = freshStore({ selfId: 'u_another_person', myId: '' })
owner = B.getOwner()
check('同一份接龙数据被读到', B.getSolitaire().title === A.getSolitaire().title)
check('创建者 id 保持一致', owner.id === creatorId)
check('另一台设备不再是创建者', owner.isMine === false && B.isOwner() === false)

/* ================= 场景 3：非创建者越权 ================= */
console.log('--- 3. 非创建者越权尝试（都应被拒）---')
let before = B.listParticipants().length
let r = B.updateSolitaire({ title: '被人恶意改掉的标题' })
check('改接龙信息被拒绝', isMsg(r, '发起'), JSON.stringify(r))
r = B.transferOwner(victimId)
check('转让发起人被拒绝', isMsg(r, '发起'), JSON.stringify(r))
r = B.removeParticipant(victimId)
check('删除他人记录被拒绝', isMsg(r, '发起'), JSON.stringify(r))
check('拒绝后名单长度不变', B.listParticipants().length === before, '现 ' + B.listParticipants().length)
check('拒绝后标题未被改动', B.getSolitaire().title === A.getSolitaire().title)

/* ================= 场景 4：非创建者处置自己的记录 ================= */
console.log('--- 4. 非创建者管理自己的记录（应允许）---')
const mine = B.addParticipant({ name: '李四', avatar: '', remark: '2 人', source: 'manual' })
check('参与接龙成功', mine.ok === true)
r = B.updateParticipant(mine.id, { name: '李四改', remark: '3 人', source: 'manual' })
check('修改自己的记录允许', r.ok === true, JSON.stringify(r))
check('修改内容已生效', (B.listParticipants().find((it) => it.id === mine.id) || {}).name === '李四改')

/* ================= 场景 5：创建者的四项特权 ================= */
console.log('--- 5. 创建者特权 ---')
const C = freshStore({ selfId: creatorId, myId: '' })
r = C.updateSolitaire({ title: '周六羽毛球 · 已改期', quota: 30 })
check('改接龙信息允许', r.ok === true, JSON.stringify(r))
check('标题已生效', C.getSolitaire().title === '周六羽毛球 · 已改期')
check('名额已生效', C.getSolitaire().quota === 30)

r = C.updateSolitaire({ quota: 1 })
check('名额小于已接人数被拒绝', isMsg(r, '名额'), JSON.stringify(r))

r = C.updateSolitaire({ closed: true })
check('提前关闭允许', r.ok === true)
let s = C.getSolitaire()
check('状态切换为 closed', s.status === 'closed' && s.closed === true, 'status=' + s.status)
check('关闭后不能再接龙', s.canJoin === false)
check('关闭文案取的是「发起人已关闭」', s.statusText.indexOf('发起人') >= 0, s.statusText)

r = C.updateSolitaire({ closed: false })
check('重开接龙允许', r.ok === true)
check('重开后回到可接龙', C.getSolitaire().canJoin === true && C.getSolitaire().status === 'open')

const target = C.listParticipants()[1]
r = C.transferOwner(target.id)
const targetId = target.id
check('转让发起人允许', r.ok === true, JSON.stringify(r))
check('ownerId 已指向目标记录', C.getOwner().id === targetId)

/* ================= 场景 6：转让之后 ================= */
console.log('--- 6. 转让之后的权限归属 ---')
const D = freshStore({ selfId: creatorId, myId: '' })
check('原创建者失去权限', D.isOwner() === false)
r = D.updateSolitaire({ title: '看我还能不能改' })
check('原创建者改标题被拒绝', isMsg(r, '发起'), JSON.stringify(r))

const E = freshStore({ selfId: 'u_third_person', myId: targetId })
check('新创建者凭自己的记录认领权限', E.isOwner() === true)
check('新创建者改标题允许', E.updateSolitaire({ title: '新发起人定的标题' }).ok === true)
r = E.removeParticipant(targetId)
check('新创建者删自己那条被保护', isMsg(r, '转让'), JSON.stringify(r))
check('受保护后记录仍在', E.listParticipants().some((it) => it.id === targetId))

/* ================= 场景 7：持久化 ================= */
console.log('--- 7. 重开小程序后仍是同一个创建者 ---')
const F = freshStore({ selfId: creatorId, myId: '' })
check('重载后 ownerId 不变', F.getOwner().id === targetId)
check('重载后自己的权限判定一致', F.isOwner() === false)

console.log('')
console.log('结果: ' + pass + ' 通过 / ' + fail + ' 失败')
console.log(fail === 0 ? '创建者逻辑全部通过' : '存在失败项')
process.exit(fail ? 1 : 0)
