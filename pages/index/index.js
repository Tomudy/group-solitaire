const store = require('../../utils/store')
const i18n = require('../../utils/i18n')

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

/** Date -> 'YYYY-MM-DD'，喂给 picker mode="date" */
function dateOf(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

/** Date -> 'HH:mm'，喂给 picker mode="time" */
function timeOf(d) {
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

Page({
  data: {
    lang: 'zh',
    // 当前语言文案表，WXML 里用 {{t.foo_bar}} 绑定
    t: {},
    // 首屏占位，onLoad 立刻用真实数据覆盖，避免出现空白按钮
    solitaire: {
      // 首屏按空态渲染，onLoad 立刻用真实数据覆盖
      empty: true,
      title: '',
      desc: '',
      host: '',
      location: '',
      quota: 0,
      joined: 0,
      left: 0,
      percent: 0,
      deadlineFullText: '',
      deadlineText: '',
      status: 'open',
      statusText: '加载中',
      canJoin: false
    },
    participants: [],
    // 带数字的文案在 JS 层拼好，WXML 直接展示
    countText: '',
    footerTipText: '',
    showJoin: false,
    form: { name: '', avatar: '', remark: '', source: 'wechat' },
    formInitial: '?',
    nameFocus: false,
    editing: false,
    mine: null,
    submitting: false,
    showAdmin: false,
    adminForm: { title: '', desc: '', host: '', location: '', quota: '0', date: '', time: '', transferTo: '' },
    // 可受让发起人身份的人：除自己以外的接龙者
    transferList: [],
    // 弹窗尺寸：真机（尤其 Android）上 scroll-view 靠 flex 收缩拿高度不可靠，
    // 会把自己撑开、把弹窗顶成全屏，所以这里用 JS 算出确定的 px 高度
    sheetMaxH: 0,
    sheetBodyH: 0,
    // 隐私授权弹窗：调用头像/昵称接口前，平台要求先取得用户同意
    showPrivacy: false,
    // 后台配置的协议名，取不到时用语言包里的兜底文案
    privacyName: ''
  },

  onLoad() {
    i18n.init()
    this.measureSheet()
    this.applyLang()
    this.initPrivacy()
  },

  onShow() {
    // 横竖屏切换 / 分屏后窗口高度会变，重新量一次
    this.measureSheet()
    this.applyLang()
  },

  onPullDownRefresh() {
    this.applyLang()
    wx.stopPullDownRefresh()
  },

  /* ---------------------------------------------- 弹窗尺寸 */
  /**
   * 按可视窗口高度算出弹窗总高上限与内容区高度（px）。
   * 小程序里 scroll-view 必须有确定高度才会滚动；用 vh / flex:1 在部分
   * Android 机型（如小米）上不生效，内容会直接把弹窗撑成全屏。
   */
  measureSheet() {
    let h = 0
    try {
      const info = (typeof wx.getWindowInfo === 'function')
        ? wx.getWindowInfo()
        : wx.getSystemInfoSync()
      h = info.windowHeight || info.screenHeight || 0
    } catch (e) {}
    if (!h) h = 667
    const maxH = Math.round(h * 0.86)
    // 扣掉常驻的标题栏 + 底部按钮 + 安全区，剩下的给内容区
    const bodyH = Math.max(200, maxH - 150)
    if (maxH !== this.data.sheetMaxH || bodyH !== this.data.sheetBodyH) {
      this.setData({ sheetMaxH: maxH, sheetBodyH: bodyH })
    }
  },

  /** 空处理：挡住滚动穿透（Android 上弹窗滚动会带着背景页面一起动） */
  noop() {},

  /* ---------------------------------------------- 隐私授权 */
  /**
   * 平台规则：chooseAvatar 与 input type="nickname" 都是隐私接口。
   * 后台没配《用户隐私保护指引》或用户没同意，调用会直接 fail
   * （真机表现就是「点了没反应」），代码审核也会以「调用未声明隐私接口」驳回。
   * 这里注册一次授权监听，并把后台配置的协议名取回来。
   */
  initPrivacy() {
    if (typeof wx.onNeedPrivacyAuthorization !== 'function') return
    wx.onNeedPrivacyAuthorization((resolve) => {
      // 需要用户表态：弹授权框，resolve 留给按钮回调调用
      this._privacyResolve = resolve
      this.setData({
        showPrivacy: true,
        privacyName: this.data.privacyName || i18n.t('privacy.link')
      })
    })
    if (typeof wx.getPrivacySetting === 'function') {
      wx.getPrivacySetting({
        success: (res) => {
          if (res && res.privacyContractName) {
            this.setData({ privacyName: res.privacyContractName })
          }
        }
      })
    }
  },

  /**
   * 确认已取得隐私授权：已同意或平台不支持时直接放行，未同意时弹官方授权框。
   * 只在要报名（确实要用昵称/头像）时才调，浏览接龙列表不受影响 —— 平台
   * 不允许用授权墙硬阻断核心功能，「先体验后授权」才能过审。
   */
  ensurePrivacy() {
    if (typeof wx.requirePrivacyAuthorize !== 'function') return Promise.resolve(true)
    const self = this
    return new Promise((resolve) => {
      wx.requirePrivacyAuthorize({
        success: () => resolve(true),
        fail: () => {
          self.setData({ showPrivacy: false })
          resolve(false)
        }
      })
    })
  },

  /** 同意：必须走 open-type="agreePrivacyAuthorization"，自绘按钮平台不认 */
  onAgreePrivacy() {
    if (this._privacyResolve) {
      this._privacyResolve({ buttonId: 'agree-btn', event: 'agree' })
      this._privacyResolve = null
    }
    this.setData({ showPrivacy: false })
  },

  onDisagreePrivacy() {
    if (this._privacyResolve) {
      this._privacyResolve({ event: 'disagree' })
      this._privacyResolve = null
    }
    this.setData({ showPrivacy: false })
  },

  /** 打开完整协议原文 */
  openPrivacyContract() {
    if (typeof wx.openPrivacyContract === 'function') wx.openPrivacyContract({})
  },

  /* ---------------------------------------------- 语言 */
  /** 把当前语言文案写进 data，全界面即时刷新 */
  applyLang() {
    const lang = i18n.getLang()
    try {
      wx.setNavigationBarTitle({ title: i18n.t('app.name') })
    } catch (e) {}
    this.setData({ lang: lang, t: i18n.messages() })
    this.refresh()
  },

  /** 中 / 英切换，选择会持久化，下次进入沿用 */
  switchLang() {
    i18n.toggleLang()
    this.applyLang()
    wx.showToast({ title: i18n.t('lang.switched'), icon: 'none' })
  },

  /* ---------------------------------------------- 数据刷新 */
  refresh() {
    const solitaire = store.getSolitaire()
    const participants = store.listParticipants()

    let mine = null
    for (let i = 0; i < participants.length; i += 1) {
      if (participants[i].mine) {
        mine = participants[i]
        break
      }
    }

    this.setData({
      solitaire: solitaire,
      participants: participants,
      mine: mine,
      countText: i18n.t('list.count', { n: solitaire.joined }),
      footerTipText: mine ? i18n.t('footer.tip', { n: mine.seq }) : ''
    })
  },

  /* ---------------------------------------------- 分享转发 */
  /**
   * 转发卡片要带信息量：接龙靠群里传播，卡片上写着
   * 「周末羽毛球 · 还差 3 人」比只写小程序名更容易被点开。
   */
  onShareAppMessage() {
    const s = this.data.solitaire || {}
    if (s.empty) {
      return { title: i18n.t('share.default'), path: '/pages/index/index' }
    }

    let title
    if (s.quota > 0) {
      title = s.left > 0
        ? i18n.t('share.withQuota', { title: s.title, n: s.left })
        : i18n.t('share.full', { title: s.title })
    } else {
      title = i18n.t('share.noQuota', { title: s.title })
    }
    return { title: title, path: '/pages/index/index' }
  },

  /* ---------------------------------------------- 弹窗 */
  openJoin() {
    // 报名要用昵称/头像（隐私接口），先确认授权；不同意只提示，不打开填写面板
    this.ensurePrivacy().then((ok) => {
      if (!ok) {
        wx.showToast({ title: i18n.t('privacy.need'), icon: 'none' })
        return
      }
      this.doOpenJoin()
    })
  },

  /** 真正打开填写面板（授权通过后才走到这里） */
  doOpenJoin() {
    const mine = this.data.mine
    const profile = store.getProfile() || {}

    let name = ''
    let avatar = ''
    let remark = ''
    // 默认走微信昵称：官方一键填写能力，无需手打
    let source = 'wechat'

    if (mine) {
      // 已接龙：进入修改，沿用原内容
      name = mine.name || ''
      avatar = mine.avatar || ''
      remark = mine.remark || ''
      source = mine.source || 'manual'
    } else if (profile.name) {
      // 未接龙但填过：自动带出上次资料，连来源一起沿用
      name = profile.name
      avatar = profile.avatar || ''
      source = profile.source === 'manual' ? 'manual' : 'wechat'
    }

    this.setData({
      showJoin: true,
      editing: !!mine,
      nameFocus: false,
      form: { name: name, avatar: avatar, remark: remark, source: source },
      formInitial: name ? name.slice(0, 1) : '?'
    })

    // 未填过名字时自动唤起昵称键盘，进弹窗即可一键选中，不用先点输入框
    if (!name) {
      setTimeout(() => {
        if (this.data.showJoin) this.setData({ nameFocus: true })
      }, 320)
    }
  },

  closeJoin() {
    this.setData({ showJoin: false })
  },

  /* ---------------------------------------------- 表单 */
  /** 头像选择：官方 chooseAvatar 能力，返回临时路径 */
  onChooseAvatar(e) {
    const path = e.detail && e.detail.avatarUrl
    if (!path) return
    this.setData({ 'form.avatar': path })
  },

  /** 切换名称来源：微信昵称 / 手动填写 */
  switchSource(e) {
    const source = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.source
    if (source !== 'wechat' && source !== 'manual') return
    this.setData({ 'form.source': source, nameFocus: false })
  },

  /**
   * 一键填入微信昵称
   * 微信自 2022 年回收 wx.getUserProfile 后，无法静默读取昵称，
   * 官方替代是 input type="nickname"：聚焦后键盘上方会显示微信昵称，
   * 点一下即填入。这里聚焦输入框，把操作压到最少。
   */
  fillWechatName() {
    // 先置 false 再置 true，确保 focus 每次点击都能重新触发
    this.setData({ nameFocus: false })
    setTimeout(() => {
      this.setData({ nameFocus: true })
    }, 30)
  },

  onNameBlur() {
    this.setData({ nameFocus: false })
  },

  onNameInput(e) {
    const name = (e.detail && e.detail.value) || ''
    this.setData({
      'form.name': name,
      formInitial: name ? name.slice(0, 1) : '?'
    })
  },

  onRemarkInput(e) {
    this.setData({ 'form.remark': (e.detail && e.detail.value) || '' })
  },

  /* ---------------------------------------------- 提交 */
  submitJoin() {
    if (this.data.submitting) return

    const form = this.data.form
    const name = String(form.name || '').replace(/^\s+|\s+$/g, '')
    if (!name) {
      wx.showToast({ title: i18n.t('msg.nameRequired'), icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    let res
    if (this.data.editing && this.data.mine) {
      // 修改：保留原序号与接龙时间
      res = store.updateParticipant(this.data.mine.id, {
        name: name,
        avatar: form.avatar,
        remark: form.remark,
        source: form.source
      })
    } else {
      res = store.addParticipant({
        name: name,
        avatar: form.avatar,
        remark: form.remark,
        source: form.source
      })
    }

    this.setData({ submitting: false })

    if (!res || !res.ok) {
      wx.showToast({ title: (res && res.msg) || i18n.t('err.generic'), icon: 'none' })
      return
    }

    // 记住本次填写的资料，下次自动带出（含来源，避免每次重选）
    store.saveProfile({ name: name, avatar: form.avatar, source: form.source })

    this.setData({ showJoin: false })
    wx.showToast({
      title: this.data.editing ? i18n.t('msg.updated') : i18n.t('msg.joined'),
      icon: 'success'
    })
    this.refresh()
  },

  /* ---------------------------------------------- 取消我的接龙 */
  cancelMine() {
    const mine = this.data.mine
    if (!mine) return

    wx.showModal({
      title: i18n.t('msg.cancelTitle'),
      content: i18n.t('msg.cancelContent'),
      cancelText: i18n.t('msg.modalCancelText'),
      confirmText: i18n.t('msg.modalConfirmText'),
      confirmColor: '#FF6B35',
      success: (res) => {
        if (!res.confirm) return
        const r = store.removeParticipant(mine.id)
        if (!r.ok) {
          wx.showToast({ title: r.msg || i18n.t('err.cancelFailed'), icon: 'none' })
          return
        }
        wx.showToast({ title: i18n.t('msg.cancelled'), icon: 'success' })
        this.refresh()
      }
    })
  },

  /* ---------------------------------------------- 发起人管理 */
  openAdmin() {
    const s = store.getSolitaire()
    // 空态（发起接龙）时还没有截止时间，给个一周后的默认值，
    // 免得用户不改就直接保存出一个没有截止的接龙
    const d = new Date(s.deadlineAt || (Date.now() + 7 * 86400000))
    const list = store.listParticipants()
    // 不能转给自己：自己的那条记录由「取消接龙」处理
    const mineId = this.data.mine ? this.data.mine.id : ''
    const transferList = []
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].id !== mineId) transferList.push(list[i])
    }

    this.setData({
      showAdmin: true,
      adminForm: {
        title: s.title || '',
        desc: s.desc || '',
        host: s.host || '',
        location: s.location || '',
        quota: String(s.quota || 0),
        date: dateOf(d),
        time: timeOf(d),
        transferTo: ''
      },
      transferList: transferList
    })
  },

  closeAdmin() {
    this.setData({ showAdmin: false })
  },

  onAdminInput(e) {
    const field = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.field
    if (!field) return
    const value = (e.detail && e.detail.value) !== undefined ? e.detail.value : ''
    this.setData({ ['adminForm.' + field]: value })
  },

  onAdminDate(e) {
    this.setData({ 'adminForm.date': (e.detail && e.detail.value) || '' })
  },

  onAdminTime(e) {
    this.setData({ 'adminForm.time': (e.detail && e.detail.value) || '' })
  },

  /** 保存接龙信息：空值视为不修改，名额 0 表示不限 */
  submitAdmin() {
    const f = this.data.adminForm

    // 标题是接龙的门面，发起时尤其不能留空
    if (!String(f.title || '').trim()) {
      wx.showToast({ title: i18n.t('err.titleRequired'), icon: 'none' })
      return
    }

    const dp = String(f.date || '').split('-')
    const tp = String(f.time || '').split(':')
    const dt = new Date(
      Number(dp[0]) || 1970,
      (Number(dp[1]) || 1) - 1,
      Number(dp[2]) || 1,
      Number(tp[0]) || 0,
      Number(tp[1]) || 0,
      0,
      0
    )

    const res = store.updateSolitaire({
      title: f.title,
      desc: f.desc,
      host: f.host,
      location: f.location,
      quota: Number(f.quota),
      deadlineAt: dt.getTime()
    })

    if (!res.ok) {
      wx.showToast({ title: res.msg || i18n.t('err.generic'), icon: 'none' })
      return
    }

    this.setData({ showAdmin: false })
    wx.showToast({ title: i18n.t('owner.updatedToast'), icon: 'success' })
    this.refresh()
  },

  /** 提前截止 / 重新开放：关闭需二次确认，重开直接生效 */
  toggleClose() {
    if (this.data.solitaire.closed) {
      const r = store.updateSolitaire({ closed: false })
      if (!r.ok) {
        wx.showToast({ title: r.msg || i18n.t('err.generic'), icon: 'none' })
        return
      }
      wx.showToast({ title: i18n.t('owner.reopenedToast'), icon: 'success' })
      this.refresh()
      return
    }

    wx.showModal({
      title: i18n.t('owner.closeConfirmTitle'),
      content: i18n.t('owner.closeConfirmContent'),
      cancelText: i18n.t('msg.modalCancelText'),
      confirmText: i18n.t('owner.closeAction'),
      confirmColor: '#FF6B35',
      success: (res) => {
        if (!res.confirm) return
        const r = store.updateSolitaire({ closed: true })
        if (!r.ok) {
          wx.showToast({ title: r.msg || i18n.t('err.generic'), icon: 'none' })
          return
        }
        wx.showToast({ title: i18n.t('owner.closedToast'), icon: 'success' })
        this.refresh()
      }
    })
  },

  /** 转让发起人身份：目标必须是现有接龙者，转让后本机失去管理权限 */
  pickTransfer(e) {
    const ds = e.currentTarget && e.currentTarget.dataset
    const id = ds && ds.id
    const name = (ds && ds.name) || ''

    wx.showModal({
      title: i18n.t('owner.transferConfirmTitle'),
      content: i18n.t('owner.transferConfirmContent', { n: name }),
      cancelText: i18n.t('msg.modalCancelText'),
      confirmText: i18n.t('msg.modalConfirmText'),
      confirmColor: '#FF6B35',
      success: (res) => {
        if (!res.confirm) return
        const r = store.transferOwner(id)
        if (!r.ok) {
          wx.showToast({ title: r.msg || i18n.t('err.generic'), icon: 'none' })
          return
        }
        this.setData({ showAdmin: false })
        wx.showToast({ title: i18n.t('owner.transferredToast'), icon: 'success' })
        this.refresh()
      }
    })
  },

  /** 发起人移除他人记录；自己那条走底部「取消接龙」 */
  removeEntry(e) {
    const ds = e.currentTarget && e.currentTarget.dataset
    const id = ds && ds.id
    const name = (ds && ds.name) || ''

    wx.showModal({
      title: i18n.t('owner.removeConfirmTitle'),
      content: i18n.t('owner.removeConfirmContent', { n: name }),
      cancelText: i18n.t('msg.modalCancelText'),
      confirmText: i18n.t('owner.remove'),
      confirmColor: '#FF6B35',
      success: (res) => {
        if (!res.confirm) return
        const r = store.removeParticipant(id)
        if (!r.ok) {
          wx.showToast({ title: r.msg || i18n.t('err.cancelFailed'), icon: 'none' })
          return
        }
        wx.showToast({ title: i18n.t('owner.removedToast'), icon: 'success' })
        this.refresh()
      }
    })
  }
})
