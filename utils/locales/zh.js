/**
 * 中文语言包
 * 键名与 en.js 严格一一对应，改动时两边同步
 * {n} 为占位符；单数场景会自动取 xxx_one 变体
 */
module.exports = {
  /* ---------- 应用 ---------- */
  'app.name': '群接龙',

  /* ---------- 语言切换 ---------- */
  'lang.label': '语言',
  'lang.switchTo': 'English',
  'lang.switched': '已切换为 English',

  /* ---------- 接龙简介 ---------- */
  'intro.status.open': '进行中',
  'intro.status.full': '已满员',
  'intro.status.expired': '已结束',
  'intro.host': '发起人',
  'intro.location': '地点',
  'intro.deadline': '截止',
  'intro.joined': '已接龙 {n} 人',
  'intro.quotaLeft': '还剩 {n} 个名额',
  'intro.quotaLeft_one': '还剩 1 个名额',
  'intro.quotaUnlimited': '不限人数',
  'intro.closesInDays': '距截止 {n} 天',
  'intro.closesInDays_one': '距截止 1 天',
  'intro.closesInHours': '距截止 {n} 小时',
  'intro.closesInHours_one': '距截止 1 小时',
  'intro.closesInMinutes': '距截止 {n} 分钟',
  'intro.closed': '已截止',

  /* ---------- 接龙名单 ---------- */
  'list.title': '接龙名单',
  'list.count': '{n} 人已参与',
  'list.emptyTitle': '还没有人接龙',
  'list.emptySub': '点击下方「我要接龙」成为第一个',
  'list.sourceWechat': '微信昵称',
  'list.sourceManual': '手动填写',
  'list.mine': '我',

  /* ---------- 底部操作 ---------- */
  'footer.join': '我要接龙',
  'footer.edit': '修改我的接龙',
  'footer.cancel': '取消接龙',
  'footer.tip': '你已接龙，排在第 {n} 位',

  /* ---------- 接龙弹窗 ---------- */
  'sheet.title': '我要接龙',
  'sheet.avatarTitle': '点击左侧选择头像',
  'sheet.avatarSub': '不选择则用姓名首字生成头像',
  'sheet.name': '接龙名称',
  'sheet.required': '必填',
  'sheet.optional': '选填',
  'sheet.tabWechat': '用微信昵称',
  'sheet.tabManual': '手动填姓名',
  'sheet.namePhWechat': '点此使用微信昵称',
  'sheet.namePhManual': '请输入真实姓名',
  'sheet.quickTitle': '一键填入我的微信昵称',
  'sheet.quickSub': '点一下，从键盘上方选中即可',
  'sheet.hintWechat': '昵称由微信官方提供，不会索取你的隐私信息',
  'sheet.hintManual': '直接输入你的姓名，将展示在接龙名单中',
  'sheet.remark': '备注',
  'sheet.remarkPh': '如：带 1 个朋友 / 晚上到',
  'sheet.cancel': '取消',
  'sheet.submit': '确认接龙',

  /* ---------- 提示 ---------- */
  'msg.nameRequired': '请填写接龙名称',
  'msg.updated': '已更新',
  'msg.joined': '接龙成功',
  'msg.cancelTitle': '取消接龙',
  'msg.cancelContent': '确定要取消你的接龙记录吗？',
  'msg.modalCancelText': '取消',
  'msg.modalConfirmText': '确定',
  'msg.cancelled': '已取消接龙',

  /* ---------- 错误 ---------- */
  'err.nameRequired': '请填写姓名或昵称',
  'err.nameTooLong': '姓名请控制在 20 字以内',
  'err.remarkTooLong': '备注请控制在 60 字以内',
  'err.full': '接龙人数已满，无法继续报名',
  'err.expired': '接龙已截止，无法继续报名',
  'err.notFound': '未找到该条接龙记录',
  'err.cancelFailed': '取消失败',
  'err.generic': '接龙失败，请重试',

  /* ---------- 示例数据（仅首次初始化时使用，用户自己的数据不会被翻译） ---------- */
  'demo.title': '周末羽毛球接龙',
  'demo.desc': '周六下午 2 点开打，场地已订好，费用 AA 人均 40 元。欢迎带朋友一起来，接龙时请备注到场人数。',
  'demo.host': '涛哥',
  'demo.location': '星河羽毛球馆 3 号场',
  'demo.names': ['涛哥', '小林', '阿杰'],
  'demo.remarks': ['发起人，订了 2 个场', '1 人', '带 1 个朋友'],

  /* ---------- 时间 ---------- */
  'time.weekdays': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  'time.months': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
}
