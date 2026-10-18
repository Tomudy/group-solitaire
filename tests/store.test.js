/**
 * 数据层冒烟测试（Node 环境运行，mock 掉 wx API）
 *   node tests/store.test.js
 * 只验证 utils/store.js 的纯逻辑，不涉及渲染。
 */
const path = require('path')

/* ---------------- mock 小程序运行时 ---------------- */
const store = {}
const fsMock = {
  saveFileSync: (src, target) => target
}
global.wx = {
  env: { USER_DATA_PATH: '/tmp/gs_user' },
  getStorageSync: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : ''),
  setStorageSync: (k, v) => { store[k] = v },
  removeStorageSync: (k) => { delete store[k] },
  getFileSystemManager: () => fsMock,
  showToast: () => {}
}

const S = require(path.join(__dirname, '..', 'utils', 'store.js'))

/* ---------------- 断言 ---------------- */
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

console.log('--- 1. 初始化 ---')
S.bootstrap()
check('bootstrap 后拿到接龙信息', !!S.getSolitaire().title)
check('默认带 3 条示例接龙记录', S.listParticipants().length === 3)

console.log('--- 2. 统计 ---')
let s = S.getSolitaire()
check('joined 等于记录数', s.joined === 3, 'joined=' + s.joined)
check('剩余名额 = 上限 - 已接', s.left === s.quota - 3, 'left=' + s.left)
check('默认状态为进行中', s.status === 'open' && s.canJoin === true)
check('进度百分比在 0-100', s.percent >= 0 && s.percent <= 100)

console.log('--- 3. 新增接龙 ---')
let r = S.addParticipant({ name: '', avatar: '', remark: '', source: 'wechat' })
check('空姓名被拒绝', r.ok === false, r.msg)
r = S.addParticipant({ name: '测试超长名字'.repeat(5), avatar: '', remark: '', source: 'manual' })
check('超长姓名被拒绝', r.ok === false, r.msg)
r = S.addParticipant({ name: '  李四  ', avatar: '', remark: '  2 人  ', source: 'wechat' })
check('正常新增成功', r.ok === true, r.msg)
let list = S.listParticipants()
check('列表增加到 4 条', list.length === 4)
check('姓名两端空格被去掉', list[3].name === '李四', list[3].name)
check('备注两端空格被去掉', list[3].remark === '2 人', list[3].remark)
check('来源标记为微信昵称', list[3].source === 'wechat' && list[3].sourceText === '微信昵称')
check('序号按时间递增', list[0].seq === 1 && list[3].seq === 4)
check('mine 标记命中本人', list[3].mine === true)
check('他人未被标记为 mine', list[0].mine === false)

console.log('--- 4. 修改本人记录 ---')
const before = list[3]
const created0 = before.createdAt
r = S.updateParticipant(before.id, { name: '李四改', avatar: '', remark: '改了备注', source: 'manual' })
check('修改成功', r.ok === true, r.msg)
list = S.listParticipants()
const after = list[3]
check('姓名已更新', after.name === '李四改', after.name)
check('接龙时间保持不变（序号不动）', after.createdAt === created0)
check('来源已切为手动填写', after.source === 'manual' && after.sourceText === '手动填写')

console.log('--- 5. 取消接龙 ---')
r = S.removeParticipant(before.id)
check('删除成功', r.ok === true, r.msg)
check('列表回到 3 条', S.listParticipants().length === 3)
r = S.removeParticipant('not_exist_id')
check('删除不存在的记录被拒绝', r.ok === false)

console.log('--- 6. 满员与截止 ---')
S.resetAll()
check('reset 后恢复 3 条示例', S.listParticipants().length === 3)
// 填满名额
let guard = 0
while (S.getSolitaire().canJoin && guard < 100) {
  S.addParticipant({ name: '占位' + guard, avatar: '', remark: '', source: 'manual' })
  guard += 1
}
s = S.getSolitaire()
check('达到上限后不能再接龙', s.canJoin === false && s.status === 'full', 'status=' + s.status)
r = S.addParticipant({ name: '再来一个', avatar: '', remark: '', source: 'manual' })
check('满员时新增被拒绝', r.ok === false, r.msg)

console.log('--- 7. 资料记忆 ---')
S.resetAll()
S.saveProfile({ name: '涛哥', avatar: '/tmp/a.png' })
let p = S.getProfile()
check('资料写入并读回', p.name === '涛哥' && p.avatar === '/tmp/a.png')
check('未接龙时 mine 为空', S.getMyId() === '')

console.log('\n结果: 通过 ' + pass + ' 项，失败 ' + fail + ' 项')
process.exit(fail ? 1 : 0)
