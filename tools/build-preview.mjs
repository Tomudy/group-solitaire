/**
 * 把小程序的 wxml + wxss 渲染成一份浏览器可打开的预览页（preview.html）
 * 仅用于快速看效果，不参与小程序打包（已在 project.config.json 中 ignore）
 *
 * - 换算规则：小程序 750rpx = 屏宽，iPhone 6/7/8 为 375px，故 1rpx = 0.5px
 * - 语言包直接复用 utils/locales/*.js，保证预览与真机文案一致
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
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

// 直接注入真实语言包，预览与真机共用一份文案
const ZH = require(path.join(root, 'utils/locales/zh.js'))
const EN = require(path.join(root, 'utils/locales/en.js'))
const DICT_JSON = JSON.stringify({ zh: ZH, en: EN }, null, 2)

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>群接龙小程序 · 双语预览</title>
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

  .notes { width: 360px; flex-shrink: 0; color: #1F2430; }
  .notes h1 { font-size: 20px; margin: 0 0 6px; }
  .notes .sub { font-size: 13px; color: #6B7280; margin-bottom: 22px; line-height: 1.7; }
  .notes .block { background: #fff; border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; box-shadow: 0 2px 10px rgba(31,36,48,.06); }
  .notes h2 { font-size: 14px; margin: 0 0 10px; color: #FF6B35; }
  .notes ol { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.9; color: #374151; }
  .notes p { font-size: 13px; line-height: 1.85; color: #4B5563; margin: 0 0 8px; }
  .notes code { background: #F2F3F6; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
  .notes .warn { background: #FFF8F5; border-left: 3px solid #FF6B35; padding: 12px 14px; font-size: 12.5px; line-height: 1.8; color: #6B4A38; border-radius: 4px; }
  .notes .row { display: flex; gap: 10px; margin-top: 10px; }
  .notes button {
    padding: 9px 16px; font-size: 13px; font-weight: 600;
    border: 1px solid #E3E6EC; background: #fff; color: #374151;
    border-radius: 20px; cursor: pointer;
  }
  .notes button:hover { background: #F7F8FA; }
  .notes button.on { background: #FF6B35; color: #fff; border-color: #FF6B35; }

${appCss}
${pageCss}
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
  <h1>群接龙 · 中英双语预览</h1>
  <div class="sub">375×812 手机壳内为真实渲染效果，样式由 <code>app.wxss</code> + <code>index.wxss</code> 按 750rpx → 375px 换算，文案来自 <code>utils/locales/</code>，与小程序完全一致。</div>

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
    <h2>可以真点</h2>
    <ol>
      <li>点底部「我要接龙 / Join」→ 弹窗升起</li>
      <li>切换「用微信昵称 / 手动填姓名」</li>
      <li>填名字 → 确认 → 名单新增一条「我 / Me」</li>
      <li>底部变「取消接龙 + 修改我的接龙」</li>
    </ol>
  </div>

  <div class="block">
    <h2>说明</h2>
    <div class="warn">
      示例接龙数据（标题/姓名/备注）只在<b>首次初始化</b>时按当前语言生成；
      你自己接龙后产生的数据<b>不会被翻译</b>，这与真机行为一致。<br>
      预览的语言选择不写入 Storage（真机里会持久化）。
    </div>
  </div>

  <div class="block">
    <h2>重置</h2>
    <p>数据存在内存，刷新即恢复初始示例。</p>
    <div class="row"><button onclick="resetDemo()">重置演示数据</button></div>
  </div>
</div>

<script>
var DICT = ${DICT_JSON};

var lang = 'zh';
var state = null;

function pad(n){ return n < 10 ? '0' + n : '' + n; }

function t(key, params){
  var dict = DICT[lang] || DICT.zh;
  var useKey = key;
  if (params && params.n === 1 && dict[key + '_one'] !== undefined) useKey = key + '_one';
  var v = dict[useKey];
  if (v === undefined) v = (DICT.zh || {})[key];
  if (v === undefined) v = key;
  if (Array.isArray(v)) return v;
  if (!params) return String(v);
  return String(v).replace(/\\{(\\w+)\\}/g, function(m, name){
    return params[name] === undefined || params[name] === null ? '' : String(params[name]);
  });
}

function fmtTime(ts){
  var d = new Date(ts), hh = pad(d.getHours()), mm = pad(d.getMinutes());
  var months = t('time.months');
  if (lang === 'en') return months[d.getMonth()] + ' ' + d.getDate() + ' ' + hh + ':' + mm;
  return pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + hh + ':' + mm;
}

function fmtDeadline(ts){
  var d = new Date(ts), hh = pad(d.getHours()), mm = pad(d.getMinutes());
  var months = t('time.months'), wd = t('time.weekdays')[d.getDay()];
  if (lang === 'en') return months[d.getMonth()] + ' ' + d.getDate() + ' ' + wd + ' ' + hh + ':' + mm;
  return months[d.getMonth()] + d.getDate() + '日 ' + wd + ' ' + hh + ':' + mm;
}

function ddlText(ts){
  var diff = ts - Date.now();
  if (diff <= 0) return t('intro.closed');
  var day = Math.floor(diff/86400000);
  if (day >= 1) return t('intro.closesInDays', { n: day });
  var h = Math.floor(diff/3600000);
  if (h >= 1) return t('intro.closesInHours', { n: h });
  return t('intro.closesInMinutes', { n: Math.max(1, Math.floor(diff/60000)) });
}

function seed(){
  var now = Date.now();
  var names = t('demo.names'), remarks = t('demo.remarks');
  state = {
    solitaire: {
      title: t('demo.title'), desc: t('demo.desc'),
      host: t('demo.host'), location: t('demo.location'),
      deadlineAt: now + 7*86400000, quota: 20
    },
    participants: [
      { id:'p1', name:names[0], remark:remarks[0], source:'manual', createdAt: now - 3*3600000 },
      { id:'p2', name:names[1], remark:remarks[1], source:'wechat', createdAt: now - 2*3600000 },
      { id:'p3', name:names[2], remark:remarks[2], source:'wechat', createdAt: now - 3600000 }
    ],
    myId: '', showJoin: false, editing: false, dirty: false,
    form: { name:'', avatar:'', remark:'', source:'wechat' }, submitting: false
  };
}

function derive(){
  var s = state.solitaire;
  var joined = state.participants.length;
  var quota = Number(s.quota) || 0;
  var left = Math.max(0, quota - joined);
  var expired = s.deadlineAt > 0 && s.deadlineAt < Date.now();
  var full = quota > 0 && left === 0;
  var status = expired ? 'expired' : (full ? 'full' : 'open');
  var map = { open: t('intro.status.open'), expired: t('intro.status.expired'), full: t('intro.status.full') };
  return {
    title: s.title, desc: s.desc, host: s.host, location: s.location,
    quota: quota, joined: joined, left: left,
    joinedText: t('intro.joined', { n: joined }),
    quotaLeftText: quota > 0 ? t('intro.quotaLeft', { n: left }) : t('intro.quotaUnlimited'),
    deadlineFullText: fmtDeadline(s.deadlineAt),
    deadlineText: ddlText(s.deadlineAt),
    status: status, statusText: map[status],
    percent: quota > 0 ? Math.min(100, Math.round(joined/quota*100)) : 0,
    canJoin: status === 'open'
  };
}

function listP(){
  return state.participants.slice().sort(function(a,b){ return a.createdAt - b.createdAt; })
    .map(function(it, i){
      return {
        id: it.id, seq: i+1, name: it.name, initial: it.name ? it.name.slice(0,1) : '?',
        avatar: it.avatar || '', source: it.source,
        sourceText: it.source === 'wechat' ? t('list.sourceWechat') : t('list.sourceManual'),
        remark: it.remark || '', mine: !!state.myId && it.id === state.myId,
        timeText: fmtTime(it.createdAt)
      };
    });
}

function esc(s){
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

var screenEl = document.getElementById('screen');

function render(){
  var sol = derive();
  var list = listP();
  var mine = null;
  for (var i=0;i<list.length;i++){ if (list[i].mine) mine = list[i]; }

  var rows = '';
  if (list.length === 0) {
    rows = '<div class="empty"><span class="empty-t">' + esc(t('list.emptyTitle')) + '</span>'
         + '<span class="empty-s">' + esc(t('list.emptySub')) + '</span></div>';
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
        +       (it.mine ? '<span class="p-mine">' + esc(t('list.mine')) + '</span>' : '')
        +       '<span class="p-src p-src-' + it.source + '">' + esc(it.sourceText) + '</span>'
        +     '</div>'
        +     (it.remark ? '<div class="p-remark">' + esc(it.remark) + '</div>' : '')
        +     '<div class="p-time">' + it.timeText + '</div>'
        +   '</div>'
        + '</div>';
    });
  }

  var footer = ''
    + '<div class="footer">'
    +   (mine ? '<div class="footer-tip">' + esc(t('footer.tip', { n: mine.seq })) + '</div>' : '')
    +   '<div class="footer-inner">'
    +     (mine ? '<button class="btn btn-line btn-flex" data-act="cancel">' + esc(t('footer.cancel')) + '</button>' : '')
    +     (sol.canJoin ? '<button class="btn btn-primary btn-flex" data-act="open">' + esc(mine ? t('footer.edit') : t('footer.join')) + '</button>' : '')
    +     (!sol.canJoin && !mine ? '<button class="btn btn-disabled btn-flex" disabled>' + esc(sol.statusText) + '</button>' : '')
    +   '</div>'
    +   '<div class="safe-bottom"></div>'
    + '</div>';

  var sheet = '';
  if (state.showJoin) {
    var f = state.form;
    var initial = f.name ? f.name.slice(0,1) : '?';
    sheet = ''
      + '<div class="mask" data-act="close"></div>'
      + '<div class="sheet sheet-in">'
      +   '<div class="sheet-head">'
      +     '<span class="sheet-title">' + esc(t('sheet.title')) + '</span>'
      +     '<span class="sheet-close" data-act="close">×</span>'
      +   '</div>'
      +   '<div class="form-row avatar-row">'
      +     '<button class="avatar-btn" data-act="avatar">'
      +       (f.avatar ? '<img class="avatar-img" src="' + esc(f.avatar) + '">' : '<span class="avatar-txt">' + esc(initial) + '</span>')
      +     '</button>'
      +     '<div class="avatar-tip">'
      +       '<span class="avatar-tip-t">' + esc(t('sheet.avatarTitle')) + '</span>'
      +       '<span class="avatar-tip-s">' + esc(t('sheet.avatarSub')) + '</span>'
      +     '</div>'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(t('sheet.name')) + '</span><span class="form-label-s">' + esc(t('sheet.required')) + '</span></div>'
      +     '<div class="seg">'
      +       '<div class="seg-item ' + (f.source==='wechat'?'seg-on':'') + '" data-act="src" data-source="wechat">' + esc(t('sheet.tabWechat')) + '</div>'
      +       '<div class="seg-item ' + (f.source==='manual'?'seg-on':'') + '" data-act="src" data-source="manual">' + esc(t('sheet.tabManual')) + '</div>'
      +     '</div>'
      +     (f.source === 'wechat'
      +       ? '<div class="quick" data-act="fillname">'
      +           '<span class="quick-t">' + esc(t('sheet.quickTitle')) + '</span>'
      +           '<span class="quick-s">' + esc(t('sheet.quickSub')) + '</span>'
      +         '</div>'
      +       : '')
      +     '<input class="form-input" id="f-name" value="' + esc(f.name) + '" maxlength="20" placeholder="' + esc(f.source==='wechat'?t('sheet.namePhWechat'):t('sheet.namePhManual')) + '">'
      +     '<div class="form-hint">' + esc(f.source==='wechat' ? t('sheet.hintWechat') : t('sheet.hintManual')) + '</div>'
      +   '</div>'
      +   '<div class="form-row">'
      +     '<div class="form-label"><span class="form-label-t">' + esc(t('sheet.remark')) + '</span><span class="form-label-s">' + esc(t('sheet.optional')) + '</span></div>'
      +     '<input class="form-input" id="f-remark" value="' + esc(f.remark) + '" maxlength="60" placeholder="' + esc(t('sheet.remarkPh')) + '">'
      +   '</div>'
      +   '<div class="sheet-actions">'
      +     '<button class="btn btn-line" data-act="close">' + esc(t('sheet.cancel')) + '</button>'
      +     '<button class="btn btn-primary" data-act="submit">' + esc(t('sheet.submit')) + '</button>'
      +   '</div>'
      +   '<div class="safe-bottom"></div>'
      + '</div>';
  }

  screenEl.innerHTML = ''
    + '<div class="page">'
    +   '<div class="langbar">'
    +     '<span class="langbar-label">' + esc(t('lang.label')) + '</span>'
    +     '<div class="lang-btn" data-act="switchlang">'
    +       '<span class="lang-btn-cur">' + (lang === 'zh' ? '中文' : 'English') + '</span>'
    +       '<span class="lang-btn-arrow">⇄</span>'
    +       '<span class="lang-btn-next">' + esc(t('lang.switchTo')) + '</span>'
    +     '</div>'
    +   '</div>'
    +   '<div class="card intro">'
    +     '<div class="intro-head">'
    +       '<span class="intro-title">' + esc(sol.title) + '</span>'
    +       '<span class="status status-' + sol.status + '">' + esc(sol.statusText) + '</span>'
    +     '</div>'
    +     '<div class="intro-desc">' + esc(sol.desc) + '</div>'
    +     '<div class="meta">'
    +       '<div class="meta-item"><span class="meta-k">' + esc(t('intro.host')) + '</span><span class="meta-v">' + esc(sol.host) + '</span></div>'
    +       '<div class="meta-item"><span class="meta-k">' + esc(t('intro.location')) + '</span><span class="meta-v">' + esc(sol.location) + '</span></div>'
    +       '<div class="meta-item"><span class="meta-k">' + esc(t('intro.deadline')) + '</span><span class="meta-v">' + esc(sol.deadlineFullText) + '</span></div>'
    +     '</div>'
    +     '<div class="progress-wrap">'
    +       '<div class="progress-top">'
    +         '<span class="progress-label">' + esc(sol.joinedText) + '</span>'
    +         '<span class="progress-left">' + esc(sol.quotaLeftText) + '</span>'
    +       '</div>'
    +       (sol.quota > 0 ? '<div class="progress-bar"><div class="progress-inner" style="width:' + sol.percent + '%"></div></div>' : '')
    +       '<div class="deadline-tip">' + esc(sol.deadlineText) + '</div>'
    +     '</div>'
    +   '</div>'
    +   '<div class="sec-title">'
    +     '<div class="left"><span class="bar"></span><span class="t">' + esc(t('list.title')) + '</span></div>'
    +     '<span class="count">' + esc(t('list.count', { n: sol.joined })) + '</span>'
    +   '</div>'
    +   '<div class="card list-card">' + rows + '</div>'
    +   '<div class="foot-space"></div>'
    + '</div>'
    + footer
    + sheet;

  document.getElementById('nav-title').textContent = t('app.name');
  document.getElementById('btn-zh').className = lang === 'zh' ? 'on' : '';
  document.getElementById('btn-en').className = lang === 'en' ? 'on' : '';
  bind();
}

function bind(){
  screenEl.querySelectorAll('[data-act]').forEach(function(el){
    el.addEventListener('click', function(e){ e.stopPropagation(); onAct(el.getAttribute('data-act'), el); });
  });
  var name = document.getElementById('f-name');
  if (name) name.addEventListener('input', function(e){ state.form.name = e.target.value; syncAvatar(); });
  var remark = document.getElementById('f-remark');
  if (remark) remark.addEventListener('input', function(e){ state.form.remark = e.target.value; });
}

function syncAvatar(){
  var box = screenEl.querySelector('.avatar-txt');
  if (box && !state.form.avatar) box.textContent = state.form.name ? state.form.name.slice(0,1) : '?';
}

function onAct(act, el){
  if (act === 'switchlang') { setLang(lang === 'zh' ? 'en' : 'zh'); return; }
  if (act === 'open') {
    var mine = state.participants.filter(function(p){ return p.id === state.myId; })[0];
    state.editing = !!mine;
    state.form = mine
      ? { name: mine.name, avatar: mine.avatar || '', remark: mine.remark || '', source: mine.source }
      : { name:'', avatar:'', remark:'', source:'wechat' };
    state.showJoin = true;
    render();
    return;
  }
  if (act === 'close') { state.showJoin = false; render(); return; }
  if (act === 'src') { state.form.source = el.getAttribute('data-source'); render(); return; }
  if (act === 'avatar') { state.form.avatar = ''; flash('真机中点这里会拉起微信头像选择'); return; }
  if (act === 'fillname') {
    var el2 = document.getElementById('f-name');
    if (el2) el2.focus();
    flash('真机中键盘上方会显示你的微信昵称，点一下即填入');
    return;
  }
  if (act === 'cancel') {
    state.participants = state.participants.filter(function(p){ return p.id !== state.myId; });
    state.myId = ''; state.dirty = true; render(); return;
  }
  if (act === 'submit') {
    var name = (state.form.name || '').replace(/^\\s+|\\s+$/g,'');
    if (!name) { flash(lang === 'zh' ? '请填写名称' : 'Please enter a name'); return; }
    if (state.editing) {
      var hit = state.participants.filter(function(p){ return p.id === state.myId; })[0];
      if (hit) { hit.name = name; hit.remark = state.form.remark; hit.source = state.form.source; }
    } else {
      var id = 'p' + Date.now();
      state.participants.push({ id: id, name: name, avatar: state.form.avatar, source: state.form.source, remark: state.form.remark, createdAt: Date.now() });
      state.myId = id;
    }
    state.dirty = true;
    state.showJoin = false;
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
  el.style.cssText = 'position:absolute;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(17,21,28,.85);color:#fff;font-size:12px;padding:9px 16px;border-radius:16px;z-index:999;';
  document.querySelector('.phone').appendChild(el);
  clearTimeout(timer);
  timer = setTimeout(function(){ el.remove(); }, 1600);
}

function setLang(next){
  if (next !== 'zh' && next !== 'en') return;
  if (next === lang) return;
  lang = next;
  // 示例数据只在没被改动过时随语言重新生成（用户数据不翻译）
  if (state && !state.dirty) seed();
  render();
}

function resetDemo(){ seed(); render(); }

seed();
render();

(function(){
  var d = new Date();
  document.getElementById('clock').textContent = d.getHours() + ':' + pad(d.getMinutes());
})();
</script>
</body>
</html>
`

fs.writeFileSync(path.join(root, 'preview.html'), html, 'utf8')
console.log('已生成 preview.html  (' + html.length + ' 字节)')
