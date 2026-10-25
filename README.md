# 小橙接龙 · Orange Solitaire

一个轻量级的微信群接龙报名小程序。发起人填一次活动时间、地点和名额，转发到群里，成员点开就能报名；昵称头像可一键带入微信资料，名额与截止时间自动把关，名单实时可见。

微信原生小程序，无框架、无构建、无后端依赖，开箱即跑。

- 单页面结构，代码包约 81 KB
- 中英双语（114 条文案一一对应，跟随系统语言）
- 数据层收敛在单个文件，换云端只需替换一个模块

---

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [目录结构](#目录结构)
- [数据层设计](#数据层设计)
- [发起人机制](#发起人机制)
- [中英双语](#中英双语)
- [隐私授权](#隐私授权)
- [开发与校验](#开发与校验)
- [打包与上传](#打包与上传)
- [发布须知](#发布须知)
- [已知限制与后续方向](#已知限制与后续方向)

---

## 功能特性

**接龙浏览**

- 顶部简介卡片：标题、说明、发起人、地点、名额进度、截止倒计时
- 名额满了或过期自动截止，状态与「发起人提前关闭」分开显示
- 下拉刷新，空态与满员都有明确提示

**报名**

- 一键填入微信昵称（`input type="nickname"`，聚焦后键盘上方点一下即填入）
- 头像走官方选择能力（`button open-type="chooseAvatar"`）
- 也支持完全手动填写，来源会被记住，下次不再切
- 已报名后可修改或取消自己的记录

**发起人（创建者）**

- 简介卡片显示「你就是发起人」徽标与「管理」入口
- 管理面板：改标题/说明/发起人/地点/名额、截止日期与时间双选、提前截止或重开
- 可移除任意一条记录，可把发起人身份转让给其他接龙者
- 发起人自己那条记录受保护，必须先转让才能删除

---

## 快速开始

**环境**：[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（本机验证版本 2.02.2608080）+ Node.js（跑测试与预览脚本，本机 22.x）

```bash
# 1. 克隆
git clone https://github.com/Tomudy/group-solitaire.git

# 2. 用开发者工具打开项目目录，把 project.config.json 里的 appid 换成你自己的

# 3. 生成浏览器预览（可选，高保真可交互，含身份切换）
node tools/build-preview.mjs     # 产物 preview.html，直接双击打开

# 4. 真机预览：开发者工具点「预览」，或用命令行出码
```

命令行出码（需开发者工具在运行，且设置 → 安全设置 → 服务端口已开启）：

```bash
wechatide.cmd -c WorkBuddy create_preview_qrcode \
  --project "项目绝对路径" --qr-format image --qr-output "输出.png"
```

预览码 **30 分钟有效**且绑定当次代码包，改完代码要重新出。

---

## 目录结构

```
.
├── app.js / app.json / app.wxss       # 全局配置（app.json 含 __usePrivacyCheck__）
├── sitemap.json                       # 全站允许索引
├── pages/index/                       # 唯一的页面
│   ├── index.wxml / .js / .wxss / .json
├── utils/
│   ├── store.js                       # 数据层：唯一入口，所有读写都走这里
│   ├── i18n.js                        # 语言引擎（t / messages / 持久化）
│   └── locales/zh.js  en.js           # 双语文案，114 键一一对应
├── tools/
│   ├── build-preview.mjs              # 生成浏览器预览页（注入真实 store.js 运行）
│   ├── check-i18n.mjs                 # 双语键缺失/冗余检查
│   ├── check-layout.mjs               # 英文布局溢出估算（375px 屏宽）
│   ├── check-wxml.mjs                 # 标签闭合、事件函数是否定义、弹窗高度内联
│   └── build-app-icon.py              # 头像图标生成（trim + 光学居中 + 安全边）
├── tests/
│   ├── store.test.js                  # 数据层 28 项
│   └── owner.test.js                  # 发起人权限 35 项（多设备身份切换）
└── logo-icon-b.png / -512.png         # 定稿头像（144 / 512）
```

`tools/`、`tests/`、`preview.html` 与全部 logo 资源都已写进 `packOptions.ignore`，不进小程序代码包。

---

## 数据层设计

所有数据读写都收敛在 `utils/store.js` 一个文件，页面不直接碰 Storage。这是为了将来换后端时只改一处。

```js
const store = require('../../utils/store.js')

store.getSolitaire()          // 当前接龙
store.listParticipants()      // 名单（自动标记 mine / owner）
store.addParticipant({ name, avatar, remark, source })
store.updateParticipant(id, patch)
store.removeParticipant(id)
store.updateSolitaire({ title, desc, host, location, quota, deadline, closed })
store.isOwner() / store.getOwner() / store.transferOwner(targetId)
store.getProfile() / store.saveProfile()
store.resetAll()
```

本地 Storage 的键：

| 键 | 含义 |
|---|---|
| `gs_data_v1` | 接龙主体与名单 |
| `gs_profile_v1` | 本机填写的昵称头像 |
| `gs_mine_v1` | 我提交的那条记录 id |
| `gs_self_v1` | 本机稳定身份 |
| `gs_lang_v1` | 语言选择 |

**要改成多人共享**，只需把 `store.js` 的实现换成云端（把 `ensureSelf()` 里的本机身份替换为 `openid`），页面代码不用动。

---

## 发起人机制

身份由三个值决定：

- `gs_self_v1` —— 本机稳定身份
- `gs_mine_v1` —— 我提交的那条记录 id
- `solitaire.ownerId` —— 创建者（首次创建时等于自己的身份，转让后指向对方的记录）

判定规则：

```js
isOwner() = ownerId === selfId || ownerId === myId
```

第二种情形是为转让设计的：转让后新发起人的 `ownerId` 指向自己的那条记录，凭记录认领权限。

**单机测试不同身份**：预览页右侧有一键切换（创建者 / 陌生人 / 第 2 位接龙者）。真机上可以在 vConsole 里改身份后冷启动：

```js
wx.getStorageSync('gs_self_v1')            // 先记下原值
wx.setStorageSync('gs_self_v1', 'u_test2') // 换成别人，然后完全退出重进
```

---

## 中英双语

- 引擎 `utils/i18n.js`，文案在 `utils/locales/{zh,en}.js`
- 优先级：Storage 里的选择 > 系统语言 > 中文兜底（非中英一律回退中文）
- WXML 里用 `{{t.foo_bar}}`，键名的点会转成下划线
- 加文案时**两个语言包都要加**，然后跑检查：

```bash
node tools/check-i18n.mjs     # 检查缺失与冗余
node tools/check-layout.mjs   # 英文是否溢出
```

示例数据（`demo.*`）是双语的，仅在首次初始化时按语言生成；用户自己填的数据不做翻译。

---

## 隐私授权

小程序用到了 `chooseAvatar` 与 `input type="nickname"`，两个都属于微信的隐私接口，平台要求调用前必须取得用户同意。

代码侧的配套：

- `app.json` 开启 `"__usePrivacyCheck__": true`
- `initPrivacy()` 注册 `wx.onNeedPrivacyAuthorization`，并取回后台配置的协议名
- `ensurePrivacy()` 用 Promise 封装 `wx.requirePrivacyAuthorize`（老基础库直接放行）
- 触发点放在点「我要接龙」时，**浏览列表不打断**——平台不允许用授权墙硬阻断核心功能
- 同意按钮必须是 `<button open-type="agreePrivacyAuthorization">`，自绘按钮平台不认

光有代码不够，后台《用户隐私保护指引》也要同步配置，详见[发布须知](#发布须知)。

---

## 开发与校验

```bash
node tests/store.test.js      # 数据层，28 项
node tests/owner.test.js      # 发起人权限，35 项（模拟多设备切换）
node tools/check-wxml.mjs     # WXML 结构体检
node tools/check-i18n.mjs     # 双语一致性
node tools/check-layout.mjs   # 英文布局溢出
node tools/build-preview.mjs  # 重新生成 preview.html
```

`owner.test.js` 的关键手法是 `delete require.cache[...]` 重新加载模块，再改写 Storage 里的 `gs_self_v1` / `gs_mine_v1` 来模拟不同设备——否则自己测自己永远全绿。

预览页 `preview.html` 不是静态截图：它注入真实的 `store.js` 与 `i18n.js` 源码，配一个极简 CommonJS shim 和内存 `wx` mock 运行，所以改了数据层之后重跑一次脚本，预览里的权限判定就和真机一致。

---

## 打包与上传

代码包约 **81 KB**（13 个文件），远低于 2 MB 主包上限。logo 设计源与预览产物都已排除。

```bash
# 上传（版本号自定；-d 备注在 Windows 命令行下不能含空格）
cli.bat upload --project "项目路径" -v "1.0.1" -d "备注-不能有空格" --port 19289
```

Windows 上给 `cli.bat` 传含空格的参数会报错（`'C:\Program' is not recognized`），中文备注只能走开发者工具 GUI 上传。

---

## 发布须知

代码之外，上线还要过几道后台关卡，按耗时排序：

1. **ICP 备案**（7–20 个工作日，最慢，先启动）：设置 → 小程序备案。工信部 12381 短信必须在 **24 小时内**点链接核验，超时驳回重来。
2. **名称 / 头像 / 简介 / 服务类目**：账号设置。名称每年只能改 2 次；简称必须是名称里的连续片段。
3. **用户隐私保护指引**：设置 → 服务内容声明 → 用户隐私保护指引。要选「处理用户信息」并勾选**微信头像、微信昵称**。

   > 这一项的用途栏有硬性口径：只能写「同步微信头像或昵称、修改昵称或头像」，不能出现「识别/区分」类表述，也不要写存储方式（会被判无关内容）。
4. **提交审核**：管理 → 版本管理 → 开发版本 → 提交审核（1–2 个工作日）。
5. **点「发布」**：审核通过不等于上线，要回版本管理手动发布。

顺序上，**隐私指引过审之后再提代码审核**，否则会以「调用未声明隐私接口」被驳回。

---

## 已知限制与后续方向

**本地存储下的权限只对单机成立。** 身份存在各自手机的 Storage 里，换台设备谁都能宣称自己是发起人，也看不到别人的接龙数据。真正的多人协作必须把数据放到云端、用 `openid` 做身份——接口已经按这个方向设计好了，替换 `store.js` 即可，页面不用改。

其他可做的方向：接龙数据导出、多场接龙列表、报名字段自定义、分享卡片封面。

---

## License

MIT
