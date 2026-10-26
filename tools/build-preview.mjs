/**
 * 把小程序的 wxml + wxss 渲染成一份浏览器可打开的预览页（preview.html）
 * 仅用于快速看效果与验证逻辑，不参与小程序打包（已在 project.config.json 中 ignore）
 *
 * - 换算规则：小程序 750rpx = 屏宽，iPhone 6/7/8 为 375px，故 1rpx = 0.5px
 * - 数据层直接复用 utils/store.js + utils/i18n.js 的真实源码（注入浏览器后运行），
 *   页面只提供 wx 的 mock。因此预览里的权限判定与真机完全一致，不是另写一套。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function convertRpx(css) {
  return css.replace(/(-?\d+(?:\.\d+)?)rpx/g, (_, n) => {
    const v = parseFloat(n) / 2
    return (Number.isInteger(v) ? v : v.toFixed(1)) + 'px'
  })
}

function loadCss(rel) {
  const raw = fs.readFileSync(path.join(root, rel), 'utf8')
  return convertRpx(raw)
    .replace(/env\(safe-area-inset-bottom\)/g, '0px')
    .replace(/^page\s*\{/m, '#screen {')
}

const appCss = loadCss('app.wxss')
const pageCss = loadCss('pages/index/index.wxss')
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
const navTitle = appJson.window.navigationBarTitleText || ''

/* 注入真实模块源码：预览与真机跑同一份数据层 */
function embed(code) {
  return JSON.stringify(code)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

const MODULES = {
  store: fs.readFileSync(path.join(root, 'utils/store.js'), 'utf8'),
  i18n: fs.readFileSync(path.join(root, 'utils/i18n.js'), 'utf8'),
  zh: fs.readFileSync(path.join(root, 'utils/locales/zh.js'), 'utf8'),
  en: fs.readFileSync(path.join(root, 'utils/locales/en.js'), 'utf8')
}
const MODULES_JSON = '{' + Object.keys(MODULES)
  .map((k) => JSON.stringify(k) + ':' + embed(MODULES[k]))
  .join(',') + '}'

const head = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>小橙接龙小程序 · 双语预览</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #EDEFF3;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 40px;
    padding: 32px 24px 48px;
  }
  .phone {
    width: 375px;
    height: 812px;
    flex-shrink: 0;
    background: #fff;
    border-radius: 44px;
    box-shadow: 0 18px 50px rgba(17,21,28,.22), 0 0 0 10px #1B1E24, 0 0 0 12px #34383F;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .statusbar {
    height: 44px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 26px; background: #fff;
    font-size: 14px; font-weight: 600; color: #1F2430;
  }
  .statusbar .dots { display: flex; gap: 4px; align-items: center; }
  .statusbar .dots i { width: 4px; height: 8px; background: #1F2430; border-radius: 1px; display: block; opacity: .3; }
  .statusbar .dots i:nth-child(1), .statusbar .dots i:nth-child(2) { opacity: 1; }
  .navbar {
    height: 44px; flex-shrink: 0; background: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 600; color: #1F2430;
    border-bottom: 1px solid #F0F1F4;
  }
  #screen {
    flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
    position: relative; background: #F5F6F8;
  }
  #screen::-webkit-scrollbar { width: 0; }
  .safe-bottom { height: 16px; }
  .home-bar {
    height: 24px; flex-shrink: 0; background: #fff;
    display: flex; align-items: center; justify-content: center;
  }
  .home-bar span { width: 134px; height: 5px; border-radius: 3px; background: #1F2430; opacity: .85; display: block; }
  .phone .footer, .phone .sheet, .phone .mask { position: absolute; }
  .phone .footer { top: auto; }

  .notes { width: 380px; flex-shrink: 0; color: #1F2430; }
  .notes h1 { font-size: 20px; margin: 0 0 6px; }
  .notes .sub { font-size: 13px; color: #6B7280; margin-bottom: 18px; line-height: 1.7; }
  .notes .block { background: #fff; border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; box-shadow: 0 2px 10px rgba(31,36,48,.06); }
  .notes h2 { font-size: 14px; margin: 0 0 10px; color: #FF6B35; }
  .notes ol { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.9; color: #374151; }
  .notes p { font-size: 13px; line-height: 1.85; color: #4B5563; margin: 0 0 8px; }
  .notes code { background: #F2F3F6; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  .notes .warn { background: #FFF8F5; border-left: 3px solid #FF6B35; padding: 12px 14px; font-size: 12.5px; line-height: 1.8; color: #6B4A38; border-radius: 4px; }
  .notes .row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .notes button {
    padding: 9px 14px; font-size: 13px; font-weight: 600;
    border: 1px solid #E3E6EC; background: #fff; color: #374151;
    border-radius: 20px; cursor: pointer;
  }
  .notes button:hover { background: #F7F8FA; }
  .notes button.on { background: #FF6B35; color: #fff; border-color: #FF6B35; }
  .notes .who { font-size: 12.5px; line-height: 1.75; color: #4B5563; margin-top: 8px; }
  .notes .who b { color: #FF6B35; }

${appCss}
${pageCss}

  /* 预览壳内：弹窗限高按手机壳算，不能用浏览器的 vh */
  .phone .sheet { max-height: 88%; }
  .phone .sheet-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
  .phone .sheet-body::-webkit-scrollbar { width: 0; }
</style>
</head>
<body>

<div class="phone">
  <div class="statusbar">
    <span id="clock">9:41</span>
    <span class="dots"><i></i><i></i><i></i><i></i></span>
    <span class="right"><span>5G</span><span>100%</span></span>
  </div>
  <div class="navbar" id="nav-title">${navTitle}</div>
  <div id="screen"></div>
  <div class="home-bar"><span></span></div>
</div>

<div class="notes">
  <h1>小橙接龙 · 发起人权限验证</h1>
  <div class="sub">手机壳内跑的是<b>真实数据层</b> <code>utils/store.js</code> + <code>utils/i18n.js</code>（源码注入，只 mock 了 wx），所以这里的权限判定与真机一致，不是另写一套演示逻辑。</div>

  <div class="block">
    <h2>切换身份（重点）</h2>
    <p>自己一个人测自己的权限永远全绿。用下面三个按钮模拟「不同手机打开同一份接龙数据」：</p>
    <div class="row">
      <button id="who-owner" onclick="asWho('owner')">我是创建者</button>
      <button id="who-guest" onclick="asWho('guest')">我是陌生人</button>
      <button id="who-joined" onclick="asWho('joined')">我是第 2 位接龙者</button>
    </div>
    <div class="who" id="who-desc"></div>
  </div>

  <div class="block">
    <h2>该看到的差异</h2>
    <ol>
      <li>创建者：简介卡片有「你就是发起人」徽标 + 底部「管理」入口</li>
      <li>创建者：名单里每条非自己的记录右侧有「移除」按钮</li>
      <li>陌生人 / 普通接龙者：以上全部不出现</li>
      <li>在管理面板里转让身份后，创建者立刻失去管理入口</li>
    </ol>
  </div>

  <div class="block">
    <h2>切换语言</h2>
    <p>点手机顶部右上角的中英切换按钮，或直接用下面这两个（等效）：</p>
    <div class="row">
      <button id="btn-zh" onclick="setLang('zh')">中文</button>
      <button id="btn-en" onclick="setLang('en')">English</button>
    </div>
    <p style="margin-top:10px">切换后全界面即时生效，可对照检查英文下是否溢出、换行错乱或截断。</p>
  </div>

  <div class="block">
    <h2>说明</h2>
    <div class="warn">
      示例接龙数据（标题/姓名/备注）只在<b>首次初始化</b>时按当前语言生成；
      你自己接龙后产生的数据<b>不会被翻译</b>，这与真机行为一致。<br>
      数据存在内存，刷新即恢复初始示例。
    </div>
  </div>

  <div class="block">
    <h2>重置</h2>
    <div class="row"><button onclick="resetDemo()">重置演示数据</button></div>
  </div>
</div>

<script>
/* ============ 1. 浏览器端 wx mock ============ */
var __mem = {};
var wx = {
  getStorageSync: function(k){ return Object.prototype.hasOwnProperty.call(__mem, k) ? __mem[k] : ''; },
  setStorageSync: function(k, v){ __mem[k] = v; },
  removeStorageSync: function(k){ delete __mem[k]; },
  getAppBaseInfo: function(){ return { language: 'zh_CN' }; },
  getSystemInfoSync: function(){ return { language: 'zh_CN', windowHeight: 700, screenHeight: 700 }; },
  env: { USER_DATA_PATH: '/preview' },
  getFileSystemManager: function(){ return { saveFileSync: function(){} }; },

  /* ---- 隐私授权：与真机同流程（未同意 -> 弹框 -> 用户表态 -> 回调） ---- */
  __privacyPending: null,
  onNeedPrivacyAuthorization: function(cb){ wx.__privacyCb = cb; },
  getPrivacySetting: function(o){
    if (o && o.success) o.success({ needAuthorization: !ui.privacyAgreed, privacyContractName: ui.privacyName });
  },
  requirePrivacyAuthorize: function(o){
    if (ui.privacyAgreed) { if (o && o.success) o.success(); return; }
    ui.showPrivacy = true;
    wx.__privacyPending = function(ok){
      ui.showPrivacy = false;
      wx.__privacyPending = null;
      if (ok) { ui.privacyAgreed = true; if (o && o.success) o.success(); }
      else if (o && o.fail) o.fail({ errMsg: 'requirePrivacyAuthorize:fail user denied' });
    };
    render();
  },
  openPrivacyContract: function(){ flash('真机中点这里会打开《' + ui.privacyName + '》全文'); }
};

/* ============ 2. 极简 CommonJS 运行时：按 basename 解析 ============ */
var __src = ${MODULES_JSON};
var __cache = {};
function __norm(id){
  var s = String(id).replace(/\\\\/g, '/');
  var i = s.lastIndexOf('/');
  if (i >= 0) s = s.slice(i + 1);
  return s.replace(/\\.js$/, '');
}
function __require(id){
  var key = __norm(id);
  if (__cache[key]) return __cache[key].exports;
  var src = __src[key];
  if (src === undefined) throw new Error('module not found: ' + id);
  var m = { exports: {} };
  __cache[key] = m;
  new Function('module', 'exports', 'require', 'wx', src)(m, m.exports, __require, wx);
  return m.exports;
}

/* ============ 3. 起模块 ============ */
var i18n = __require('i18n');
var store = __require('store');
i18n.init();
store.bootstrap();

var lang = 'zh';
var who = 'owner';

/* UI 状态：只管弹窗与表单，业务数据一律来自 store */
var ui = {
  showJoin: false,
  showAdmin: false,
  form: { name: '', avatar: '', remark: '', source: 'wechat' },
  adminForm: { title: '', desc: '', host: '', location: '', quota: '0', date: '', time: '' },
  // 隐私授权：开关模拟「是否已同意」，可验证同意/不同意两条分支
  showPrivacy: false,
  privacyAgreed: false,
  privacyName: '《用户隐私保护指引》'
};

function pad2(n){ return n < 10 ? '0' + n : '' + n; }
function dateOf(d){ return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function timeOf(d){ return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }

function esc(s){
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* 当前语言的文案表：键名点转下划线，与 WXML 的 {{t.xxx}} 完全对应 */
function M(){ return i18n.messages(); }

function reloadStore(){
  delete __cache['store'];
  store = __require('store');
  store.bootstrap();
}

/* ---- 切换身份：改写 Storage 里的身份键，再重载数据层 ---- */
function asWho(next){
  who = next;
  var data = __mem['gs_data_v1'] || {};
  var ownerId = (data.solitaire && data.solitaire.ownerId) || '';
  var parts = data.participants || [];

  if (next === 'owner') {
    __mem['gs_self_v1'] = ownerId;
    __mem['gs_mine_v1'] = '';
  } else if (next === 'guest') {
    __mem['gs_self_v1'] = 'u_guest_' + Date.now();
    __mem['gs_mine_v1'] = '';
  } else {
    var list = parts.slice().sort(function(a, b){ return (a.createdAt||0) - (b.createdAt||0); });
    var idx = Math.min(1, list.length - 1);
    __mem['gs_self_v1'] = 'u_other_' + Date.now();
    __mem['gs_mine_v1'] = idx >= 0 ? list[idx].id : '';
  }
  ui.showJoin = false;
  ui.showAdmin = false;
  reloadStore();
  render();
}

function whoDesc(){
  var s = store.getSolitaire();
  var mine = null;
  var list = store.listParticipants();
  for (var i = 0; i < list.length; i++) { if (list[i].mine) mine = list[i]; }
  var out = '当前身份：<b>' + (who === 'owner' ? '创建者' : (who === 'guest' ? '陌生人（未接龙）' : '第 2 位接龙者')) + '</b><br>';
  out += 'isOwner = <b>' + (s.isOwner ? 'true' : 'false') + '</b>　';
  out += mine ? ('我的记录：' + esc(mine.name)) : '我没有接龙记录';
  return out;
}

var screenEl = document.getElementById('screen');

/* 弹窗尺寸：与页面 measureSheet() 同一套算法，预览里窗口高度按手机壳可见区算 */
var SHEET_MAX = Math.round((wx.getSystemInfoSync().windowHeight || 700) * 0.86);
var SHEET_BODY = Math.max(200, SHEET_MAX - 150);

function render(){
  var m = M();
  var sol = store.getSolitaire();
  var list = store.listParticipants();
  var owner = store.getOwner();
  var mine = null;
  for (var i = 0; i < list.length; i++) { if (list[i].mine) mine = list[i]; }

  /* ---- 名单 ---- */
  var rows = '';
  if (list.length === 0) {
    rows = '<div class="empty"><span class="empty-t">' + esc(m.list_emptyTitle) + '</span>'
         + '<span class="empty-s">' + esc(m.list_emptySub) + '</span></div>';
  } else {
    list.forEach(function(it){
      rows += '<div class="p-item">'
        +   '<div class="p-seq">' + it.seq + '</div>'
        +   '<div class="p-avatar">'
        +     (it.avatar ? '<img class="p-avatar-img" src="' + esc(it.avatar) + '">' : '<span class="p-avatar-txt">' + esc(it.initial) + '</span>')
        +   '</div>'
        +   '<div class="p-main">'
        +     '<div class="p-line">'
        +       '<span class="p-name">' + esc(it.name) + '</span>'
        +       (it.mine ? '<span class="p-mine">' + esc(m.list_mine) + '</span>' : '')
        +       (it.isOwner ? '<span class="p-owner">' + esc(m.intro_host) + '</span>' : '')
        +       '<span class="p-src p-src-' + it.source + '">' + esc(it.sourceText) + '</span>'
        +     '</div>'
        +     (it.remark ? '<div class="p-remark">' + esc(it.remark) + '</div>' : '')
        +     '<div class="p-time">' + it.timeText + '</div>'
        +   '</div>'
        +   (sol.isOwner && !it.mine
            ? '<div class="p-remove" data-act="remove" data-id="' + esc(it.id) + '" data-name="' + esc(it.name) + '">' + esc(m.owner_remove) + '</div>'
            : '')
        + '</div>';
    });
  }

  /* ---- 简介卡片：空态时换成引导卡 ---- */
  var isEmpty = !!sol.empty;
  var intro = isEmpty
    ? ('<div class="card empty-hero">'
      +   '<div class="empty-hero-icon">+</div>'
      +   '<span class="empty-hero-t">' + esc(m.empty_title) + '</span>'
      +   '<span class="empty-hero-s">' + esc(m.empty_desc) + '</span>'
      +   '<div class="btn btn-primary empty-hero-btn" data-act="openadmin">' + esc(m.empty_action) + '</div>'
      + '</div>')
    : ('<div class="card intro">'
    +   '<div class="intro-head">'
    +     '<span class="intro-title">' + esc(sol.title) + '</span>'
    +     '<span class="status status-' + sol.status + '">' + esc(sol.statusText) + '</span>'
    +   '</div>'
    +   (sol.isOwner ? '<div class="owner-badge">' + esc(m.owner_badge) + '</div>' : '')
    +   '<div class="intro-desc">' + esc(sol.desc) + '</div>'
    +   '<div class="meta">'
    +     '<div class="meta-item"><span class="meta-k">' + esc(m.intro_host) + '</span><span class="meta-v">' + esc(sol.host) + '</span></div>'
    +     '<div class="meta-item"><span class="meta-k">' + esc(m.intro_location) + '</span><span class="meta-v">' + esc(sol.location) + '</span></div>'
    +     '<div class="meta-item"><span class="meta-k">' + esc(m.intro_deadline) + '</span><span class="meta-v">' + esc(sol.deadlineFullText) + '</span></div>'
    +   '</div>'
    +   '<div class="progress-wrap">'
    +     '<div class="progress-top">'
    +       '<span class="progress-label">' + esc(sol.joinedText) + '</span>'
    +       '<span class="progress-left">' + esc(sol.quotaLeftText) + '</span>'
    +     '</div>'
    +     (sol.quota > 0 ? '<div class="progress-bar"><div class="progress-inner" style="width:' + sol.percent + '%"></div></div>' : '')
    +     '<div class="deadline-tip">' + esc(sol.deadlineText) + '</div>'
    +   '</div>'
    +   (sol.isOwner
        ? '<div class="owner-entry" data-act="openadmin"><span class="owner-entry-t">' + esc(m.owner_manage) + '</span><span class="owner-entry-arrow">&rsaquo;</span></div>'
        : '')
    + '</div>');

  var footer = ''
    + '<div class="footer">'
    +   (mine ? '<div class="footer-tip">' + esc(m.footer_tip).replace('{n}', mine.seq) + '</div>' : '')
    +   '<div class="footer-inner">'
    +     (mine ? '<button class="btn btn-line btn-flex" data-act="cancel">' + esc(m.footer_cancel) + '</button>' : '')
    +     (sol.canJoin ? '<button class="btn btn-primary btn-flex" data-act="openjoin">' + esc(mine ? m.footer_edit : m.footer_join) + '</button>' : '')
    +     (!sol.canJoin && !mine ? '<button class="btn btn-disabled btn-flex" disabled>' + esc(sol.statusText) + '</button>' : '')
    +   '</div>'
    +   '<div class="safe-bottom"></div>'
    + '</div>';

  /* ---- 名单区：空态下没有接龙，整块不显示 ---- */
  var listBlock = isEmpty ? '' : (
      '<div class="sec-title">'
    +   '<div class="left"><span class="bar"></span><span class="t">' + esc(m.list_title) + '</span></div>'
    +   '<span class="count">' + esc(m.list_count).replace('{n}', sol.joined) + '</span>'
    + '</div>'
    + '<div class="card list-card">' + rows + '</div>'
  );

  var joinSheet = '';
  if (ui.showJoin) {
    var f = ui.form;
    joinSheet = ''
      + '<div class="mask" data-act="closejoin"></div>'
      + '<div class="sheet sheet-in" style="max-height:' + SHEET_MAX + 'px">'
      +   '<div class="sheet-head">'
      +     '<span class="sheet-title">' + esc(m.sheet_title) + '</span>'
      +     '<span class="sheet-close" data-act="closejoin">&times;</span>'
      +   '</div>'
      +   '<div class="sheet-body" style="max-height:' + SHEET_BODY + 'px">'
      +   '<div class="form-row avatar-row">'
      +     '<button class="avatar-btn" data-act="avatar">'
      +       '<span class="avatar-txt">' + esc(f.name ? f.name.slice(0, 1) : '?') + '</span>'
      +     '</button>'
      +     '<div class="avatar-tip">'
      +       '<span class="avatar-tip-t">' + esc(m.sheet_avatarTitle) + '</span>'
      +       '<span class="avatar-tip-s">' + esc(m.sheet_avatarSub) + '</span>'
      +     '</div>'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(m.sheet_name) + '</span><span class="form-label-s">' + esc(m.sheet_required) + '</span></div>'
      +     '<div class="seg">'
      +       '<div class="seg-item ' + (f.source === 'wechat' ? 'seg-on' : '') + '" data-act="src" data-source="wechat">' + esc(m.sheet_tabWechat) + '</div>'
      +       '<div class="seg-item ' + (f.source === 'manual' ? 'seg-on' : '') + '" data-act="src" data-source="manual">' + esc(m.sheet_tabManual) + '</div>'
      +     '</div>'
      +     (f.source === 'wechat'
              ? '<div class="quick" data-act="fillname"><span class="quick-t">' + esc(m.sheet_quickTitle) + '</span><span class="quick-s">' + esc(m.sheet_quickSub) + '</span></div>'
              : '')
      +     '<input class="form-input" id="f-name" value="' + esc(f.name) + '" maxlength="20" placeholder="' + esc(f.source === 'wechat' ? m.sheet_namePhWechat : m.sheet_namePhManual) + '">'
      +     '<div class="form-hint">' + esc(f.source === 'wechat' ? m.sheet_hintWechat : m.sheet_hintManual) + '</div>'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(m.sheet_remark) + '</span><span class="form-label-s">' + esc(m.sheet_optional) + '</span></div>'
      +     '<input class="form-input" id="f-remark" value="' + esc(f.remark) + '" maxlength="60" placeholder="' + esc(m.sheet_remarkPh) + '">'
      +   '</div>'
      +   '</div>'
      +   '<div class="sheet-actions">'
      +     '<button class="btn btn-line" data-act="closejoin">' + esc(m.sheet_cancel) + '</button>'
      +     '<button class="btn btn-primary" data-act="submitjoin">' + esc(m.sheet_submit) + '</button>'
      +   '</div>'
      +   '<div class="safe-bottom"></div>'
      + '</div>';
  }

  var adminSheet = '';
  if (ui.showAdmin) {
    var a = ui.adminForm;
    var mineId = mine ? mine.id : '';
    var picks = '';
    var n = 0;
    list.forEach(function(it){
      if (it.id === mineId) return;
      n += 1;
      picks += '<div class="pick-item" data-act="transfer" data-id="' + esc(it.id) + '" data-name="' + esc(it.name) + '">'
        + '<span class="pick-name">' + esc(it.name) + '</span></div>';
    });
    adminSheet = ''
      + '<div class="mask" data-act="closeadmin"></div>'
      + '<div class="sheet sheet-in" style="max-height:' + SHEET_MAX + 'px">'
      +   '<div class="sheet-head">'
      +     '<span class="sheet-title">' + esc(isEmpty ? m.owner_createTitle : m.owner_panelTitle) + '</span>'
      +     '<span class="sheet-close" data-act="closeadmin">&times;</span>'
      +   '</div>'
      +   '<div class="sheet-body" style="height:' + SHEET_BODY + 'px">'
      +   '<div class="sheet-sub">' + esc(isEmpty ? m.owner_createSub : m.owner_panelSub) + '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(m.owner_editTitle) + '</span></div>'
      +     '<input class="form-input" id="a-title" value="' + esc(a.title) + '" maxlength="60">'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(m.owner_editDesc) + '</span></div>'
      +     '<textarea class="form-area" id="a-desc" maxlength="200">' + esc(a.desc) + '</textarea>'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(m.intro_host) + '</span></div>'
      +     '<input class="form-input" id="a-host" value="' + esc(a.host) + '" maxlength="20">'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(m.intro_location) + '</span></div>'
      +     '<input class="form-input" id="a-location" value="' + esc(a.location) + '" maxlength="60">'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(m.owner_editQuota) + '</span></div>'
      +     '<input class="form-input" id="a-quota" type="number" value="' + esc(a.quota) + '" placeholder="' + esc(m.owner_quotaPh) + '">'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="datetime">'
      +       '<div class="dt-field">'
      +         '<span class="dt-label">' + esc(m.owner_editDeadline) + '</span>'
      +         '<input class="dt-cell" id="a-date" type="date" value="' + esc(a.date) + '">'
      +       '</div>'
      +       '<div class="dt-field">'
      +         '<span class="dt-label">' + esc(m.owner_editTime) + '</span>'
      +         '<input class="dt-cell" id="a-time" type="time" value="' + esc(a.time) + '">'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="admin-acts">'
      +     '<div class="admin-act ' + (sol.closed ? 'admin-act-on' : '') + '" data-act="toggleclose">'
      +       esc(sol.closed ? m.owner_reopenAction : m.owner_closeAction)
      +     '</div>'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(m.owner_transfer) + '</span></div>'
      +     (n > 0 ? '<div class="pick-list">' + picks + '</div>' : '<div class="pick-empty">' + esc(m.owner_transferEmpty) + '</div>')
      +   '</div>'
      +   '</div>'
      +   '<div class="sheet-actions">'
      +     '<button class="btn btn-line" data-act="closeadmin">' + esc(m.sheet_cancel) + '</button>'
      +     '<button class="btn btn-primary" data-act="submitadmin">' + esc(isEmpty ? m.owner_createSave : m.owner_save) + '</button>'
      +   '</div>'
      +   '<div class="safe-bottom"></div>'
      + '</div>';
  }

  var privacySheet = '';
  if (ui.showPrivacy) {
    privacySheet = ''
      + '<div class="privacy-mask"></div>'
      + '<div class="privacy">'
      +   '<div class="privacy-title">' + esc(m.privacy_title) + '</div>'
      +   '<div class="privacy-body">'
      +     '<span>' + esc(m.privacy_pre) + '</span>'
      +     '<span class="privacy-link" data-act="privacycontract">' + esc(ui.privacyName) + '</span>'
      +     '<span>' + esc(m.privacy_post) + '</span>'
      +   '</div>'
      +   '<div class="privacy-actions">'
      +     '<div class="privacy-btn privacy-btn-line" data-act="disagree">' + esc(m.privacy_disagree) + '</div>'
      +     '<div class="privacy-btn privacy-btn-main" data-act="agree">' + esc(m.privacy_agree) + '</div>'
      +   '</div>'
      + '</div>';
  }

  screenEl.innerHTML = ''
    + '<div class="page">'
    +   '<div class="langbar">'
    +     '<span class="langbar-label">' + esc(m.lang_label) + '</span>'
    +     '<div class="lang-btn" data-act="switchlang">'
    +       '<span class="lang-btn-cur">' + (lang === 'zh' ? '中文' : 'English') + '</span>'
    +       '<span class="lang-btn-arrow">&#8644;</span>'
    +       '<span class="lang-btn-next">' + esc(m.lang_switchTo) + '</span>'
    +     '</div>'
    +   '</div>'
    +   intro
    +   listBlock
    +   '<div class="foot-space"></div>'
    + '</div>'
    + (isEmpty ? '' : footer)
    + joinSheet
    + adminSheet
    + privacySheet;

  document.getElementById('nav-title').textContent = m.app_name;
  document.getElementById('btn-zh').className = lang === 'zh' ? 'on' : '';
  document.getElementById('btn-en').className = lang === 'en' ? 'on' : '';
  document.getElementById('who-owner').className = who === 'owner' ? 'on' : '';
  document.getElementById('who-guest').className = who === 'guest' ? 'on' : '';
  document.getElementById('who-joined').className = who === 'joined' ? 'on' : '';
  document.getElementById('who-desc').innerHTML = whoDesc();
  bind();
}

function bind(){
  screenEl.querySelectorAll('[data-act]').forEach(function(el){
    el.addEventListener('click', function(e){ e.stopPropagation(); onAct(el.getAttribute('data-act'), el); });
  });
  var name = document.getElementById('f-name');
  if (name) name.addEventListener('input', function(e){ ui.form.name = e.target.value; });
  var remark = document.getElementById('f-remark');
  if (remark) remark.addEventListener('input', function(e){ ui.form.remark = e.target.value; });
}

/** 真正打开填写面板（隐私授权通过后才走到这里） */
function doOpenJoin(){
  var mine = null, list = store.listParticipants();
  for (var i = 0; i < list.length; i++) { if (list[i].mine) mine = list[i]; }
  ui.form = mine
    ? { name: mine.name, avatar: mine.avatar || '', remark: mine.remark || '', source: mine.source }
    : { name: '', avatar: '', remark: '', source: 'wechat' };
  ui.showJoin = true;
  render();
}

function onAct(act, el){
  var m = M();
  if (act === 'switchlang') { setLang(lang === 'zh' ? 'en' : 'zh'); return; }

  if (act === 'openjoin') {
    // 与真机同流程：先确认隐私授权，不同意只提示、不打开填写面板
    wx.requirePrivacyAuthorize({
      success: function(){ doOpenJoin(); },
      fail: function(){ flash(m.privacy_need); render(); }
    });
    return;
  }
  if (act === 'agree') { if (wx.__privacyPending) wx.__privacyPending(true); render(); return; }
  if (act === 'disagree') { if (wx.__privacyPending) wx.__privacyPending(false); render(); return; }
  if (act === 'privacycontract') { wx.openPrivacyContract(); return; }
  if (act === 'closejoin') { ui.showJoin = false; render(); return; }
  if (act === 'src') { ui.form.source = el.getAttribute('data-source'); render(); return; }
  if (act === 'avatar') { flash('真机中点这里会拉起微信头像选择'); return; }
  if (act === 'fillname') {
    var box = document.getElementById('f-name');
    if (box) box.focus();
    flash('真机中键盘上方会显示你的微信昵称，点一下即填入');
    return;
  }
  if (act === 'cancel') {
    var mine2 = null, l2 = store.listParticipants();
    for (var j = 0; j < l2.length; j++) { if (l2[j].mine) mine2 = l2[j]; }
    if (mine2) { var r0 = store.removeParticipant(mine2.id); flash(r0.ok ? m.msg_cancelled : (r0.msg || m.err_generic)); }
    render();
    return;
  }
  if (act === 'submitjoin') {
    var name = String(ui.form.name || '').replace(/^\\s+|\\s+$/g, '');
    if (!name) { flash(m.msg_nameRequired); return; }
    var mine3 = null, l3 = store.listParticipants();
    for (var k = 0; k < l3.length; k++) { if (l3[k].mine) mine3 = l3[k]; }
    var r = mine3
      ? store.updateParticipant(mine3.id, { name: name, avatar: ui.form.avatar, remark: ui.form.remark, source: ui.form.source })
      : store.addParticipant({ name: name, avatar: ui.form.avatar, remark: ui.form.remark, source: ui.form.source });
    if (!r.ok) { flash(r.msg || m.err_generic); return; }
    ui.showJoin = false;
    flash(mine3 ? m.msg_updated : m.msg_joined);
    render();
    return;
  }

  /* ---- 发起人管理 ---- */
  if (act === 'openadmin') {
    var s = store.getSolitaire();
    var d = new Date(s.deadlineAt || Date.now());
    ui.adminForm = {
      title: s.title || '', desc: s.desc || '', host: s.host || '', location: s.location || '',
      quota: String(s.quota || 0), date: dateOf(d), time: timeOf(d)
    };
    ui.showAdmin = true;
    render();
    return;
  }
  if (act === 'closeadmin') { ui.showAdmin = false; render(); return; }

  if (act === 'submitadmin') {
    var dp = String(document.getElementById('a-date').value || '').split('-');
    var tp = String(document.getElementById('a-time').value || '').split(':');
    var dt = new Date(
      Number(dp[0]) || 1970, (Number(dp[1]) || 1) - 1, Number(dp[2]) || 1,
      Number(tp[0]) || 0, Number(tp[1]) || 0, 0, 0
    );
    var res = store.updateSolitaire({
      title: document.getElementById('a-title').value,
      desc: document.getElementById('a-desc').value,
      host: document.getElementById('a-host').value,
      location: document.getElementById('a-location').value,
      quota: Number(document.getElementById('a-quota').value),
      deadlineAt: dt.getTime()
    });
    if (!res.ok) { flash(res.msg || m.err_generic); return; }
    ui.showAdmin = false;
    flash(m.owner_updatedToast);
    render();
    return;
  }

  if (act === 'toggleclose') {
    var closed = store.getSolitaire().closed;
    var rc = store.updateSolitaire({ closed: !closed });
    if (!rc.ok) { flash(rc.msg || m.err_generic); return; }
    flash(closed ? m.owner_reopenedToast : m.owner_closedToast);
    render();
    return;
  }

  if (act === 'remove') {
    var rr = store.removeParticipant(el.getAttribute('data-id'));
    flash(rr.ok ? m.owner_removedToast : (rr.msg || m.err_cancelFailed));
    render();
    return;
  }

  if (act === 'transfer') {
    var nm = el.getAttribute('data-name');
    var rt = store.transferOwner(el.getAttribute('data-id'));
    if (!rt.ok) { flash(rt.msg || m.err_generic); return; }
    ui.showAdmin = false;
    flash(m.owner_transferredToast + ' → ' + nm);
    render();
    return;
  }
}

var timer = null;
function flash(msg){
  var old = document.getElementById('toast');
  if (old) old.remove();
  var el = document.createElement('div');
  el.id = 'toast'; el.textContent = msg;
  el.style.cssText = 'position:absolute;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(17,21,28,.85);color:#fff;font-size:12px;padding:9px 16px;border-radius:16px;z-index:999;max-width:300px;text-align:center;';
  document.querySelector('.phone').appendChild(el);
  clearTimeout(timer);
  timer = setTimeout(function(){ el.remove(); }, 1800);
}

function setLang(next){
  if (next !== 'zh' && next !== 'en') return;
  lang = next;
  i18n.setLang(next);
  render();
}

function resetDemo(){
  __mem = {};
  who = 'owner';
  ui.showJoin = false;
  ui.showAdmin = false;
  delete __cache['store'];
  store = __require('store');
  i18n.init();
  store.bootstrap();
  render();
}

asWho('owner');

(function(){
  var d = new Date();
  document.getElementById('clock').textContent = d.getHours() + ':' + pad2(d.getMinutes());
})();
</script>
</body>
</html>
`

fs.writeFileSync(path.join(root, 'preview.html'), head, 'utf8')
console.log('已生成 preview.html  (' + head.length + ' 字节)  —— 数据层复用 utils/store.js')
