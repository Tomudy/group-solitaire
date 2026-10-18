const store = require('../../utils/store')
const i18n = require('../../utils/i18n')

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
    submitting: false
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
  }
})
