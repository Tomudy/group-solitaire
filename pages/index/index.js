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
    transferList: []
  },

  onLoad() {
    i18n.init()
    this.applyLang()
  },

  onShow() {
    this.applyLang()
  },

  onPullDownRefresh() {
    this.applyLang()
    wx.stopPullDownRefresh()
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

  /* ---------------------------------------------- 弹窗 */
  openJoin() {
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
    const d = new Date(s.deadlineAt || Date.now())
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
