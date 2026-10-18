const store = require('./utils/store')

App({
  globalData: {
    profile: null
  },

  onLaunch() {
    // 启动时拉起本地存档，并恢复上次填写的昵称 / 头像
    store.bootstrap()
    this.globalData.profile = store.getProfile()
  }
})
