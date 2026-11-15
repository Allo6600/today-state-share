/* サイドパネル。周期の計算・知識ベースは core.js、文面は texts.json。
   データ(月経の開始日・終わりの日・体調)は、このブラウザの中(chrome.storage.local)だけ。 */
'use strict';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ZONE = {
  menses: { p: 'C', name: '月経期' },
  fol: { p: 'A', name: '卵胞期' },
  ovu: { p: 'A', name: '排卵の頃' },
  lut: { p: 'B', name: '黄体期の前半' },
  pre: { p: 'C', name: '月経前' },
};
const DEF_SET = {
  A: { mark: 'A', name: '深く考える作業向き', color: '#e53935' },
  B: { mark: 'B', name: '手を動かす作業向き', color: '#42a5f5' },
  C: { mark: 'C', name: '整える作業向き', color: '#fdd835' },
};
const settings = JSON.parse(JSON.stringify(DEF_SET));
const TIER = { A: DEF_SET.A.name, B: DEF_SET.B.name, C: DEF_SET.C.name };
const MARK = { A: 'A', B: 'B', C: 'C' };
const HEX = /^#[0-9a-fA-F]{6}$/;
const FEEL = { light: '軽い', normal: 'ふつう', heavy: '重い' };
const DOW = ['月', '火', '水', '木', '金', '土', '日'];

const $ = (s) => document.querySelector(s);
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const jp = (s) => { const a = s.split('-'); return +a[1] + '月' + +a[2] + '日'; };
const dowMon = (s) => (new Date(dateToUTC(s)).getUTCDay() + 6) % 7;

/* DOM を安全に組む(文字列は textContent で入れる) */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

/* ---- 保存(chrome.storage.local。拡張の外で試すときは localStorage) ---- */
const KEY = 'tsshare-v1';
const data = { starts: [], ends: {}, feel: {} };
const store = {
  load() {
    return new Promise((res) => {
      if (globalThis.chrome && chrome.storage && chrome.storage.local) chrome.storage.local.get(KEY, (v) => res(v[KEY]));
      else { try { res(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { res(null); } }
    });
  },
  save() {
    const v = { starts: data.starts, ends: data.ends, feel: data.feel };
    if (globalThis.chrome && chrome.storage && chrome.storage.local) chrome.storage.local.set({ [KEY]: v });
    else { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 保存できない環境では、画面を閉じるまで */ } }
  },
  clear() {
    if (globalThis.chrome && chrome.storage && chrome.storage.local) chrome.storage.local.remove(KEY);
    else { try { localStorage.removeItem(KEY); } catch (e) { /* */ } }
  },
};
const SKEY = 'tsshare-settings-v1';
const sstore = {
  load() {
    return new Promise((res) => {
      if (globalThis.chrome && chrome.storage && chrome.storage.local) chrome.storage.local.get(SKEY, (v) => res(v[SKEY]));
      else { try { res(JSON.parse(localStorage.getItem(SKEY) || 'null')); } catch (e) { res(null); } }
    });
  },
  save() {
    if (globalThis.chrome && chrome.storage && chrome.storage.local) chrome.storage.local.set({ [SKEY]: settings });
    else { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) { /* */ } }
  },
};
function adoptSettings(v, keepCal) {
  if (!keepCal) settings.calSync = !!(v && v.calSync);
  for (const k of ['A', 'B', 'C']) {
    const d = DEF_SET[k], s = (v && v[k]) || {};
    settings[k].mark = typeof s.mark === 'string' && s.mark.trim() ? s.mark.trim().slice(0, 3) : d.mark;
    settings[k].name = typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 30) : d.name;
    settings[k].color = typeof s.color === 'string' && HEX.test(s.color) ? s.color : d.color;
    MARK[k] = settings[k].mark; TIER[k] = settings[k].name;
  }
  const r = document.documentElement.style;
  for (const k of ['A', 'B', 'C']) {
    const l = k.toLowerCase();
    if (settings[k].color.toLowerCase() === DEF_SET[k].color) { r.removeProperty('--z' + l); r.removeProperty('--z' + l + 's'); }
    else { r.setProperty('--z' + l, settings[k].color); r.setProperty('--z' + l + 's', 'color-mix(in srgb, ' + settings[k].color + ' 24%, var(--panel))'); }
  }
}
function renderSettings() {
  const box = $('#setRows'); box.replaceChildren();
  for (const k of ['A', 'B', 'C']) {
    const s = settings[k];
    const mark = h('input', { type: 'text', value: s.mark, maxlength: '3', class: 'in mark', 'aria-label': k + 'の記号' });
    const name = h('input', { type: 'text', value: s.name, maxlength: '30', class: 'in name', 'aria-label': k + 'の名前' });
    const color = h('input', { type: 'color', value: s.color, class: 'in color', 'aria-label': k + 'の色' });
    const commit = () => { settings[k].mark = mark.value; settings[k].name = name.value; settings[k].color = color.value; adoptSettings(settings); sstore.save(); renderAll(); };
    mark.onchange = name.onchange = commit; color.oninput = commit;
    box.append(h('div', { class: 'setrow' }, h('span', { class: 'was' }, k), mark, name, color));
  }
}
function adopt(v) {
  data.starts = []; data.ends = {}; data.feel = {};
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v.starts)) data.starts = [...new Set(v.starts.filter((x) => typeof x === 'string' && ISO.test(x)))].sort();
  if (v.ends && typeof v.ends === 'object') for (const [k, e] of Object.entries(v.ends)) if (ISO.test(k) && typeof e === 'string' && ISO.test(e) && e >= k) data.ends[k] = e;
  if (v.feel && typeof v.feel === 'object') for (const [k, f] of Object.entries(v.feel)) if (ISO.test(k) && FEEL[f]) data.feel[k] = f;
}

/* ---- 周期の計算 ---- */
const ui = { month: todayStr().slice(0, 7), sel: todayStr(), rec: false, hint: '' };
const starts = () => groupStarts(data.starts);
function runOf(st) { const e = data.ends[st]; if (!e) return 0; const n = diffDays(e, st) + 1; return n >= 1 && n <= 14 ? n : 0; }
function mensOf(S) { const v = S.slice(-6).map(runOf).filter((x) => x > 0); return v.length ? Math.round(median(v)) : null; }
function lenOf(S) { const r = robustLen(S); return { L: r.L || 28, auto: r.L != null, dropped: r.dropped }; }
function isBleedDay(date, S) { const st = lastStartLE(S, date); return !!st && runOf(st) >= diffDays(date, st) + 1; }
function zoneAt(date, S, L, mens) {
  if (!S.length) return null;
  let i = -1; for (let k = 0; k < S.length; k++) if (S[k] <= date) i = k;
  let st, len, est = false;
  if (i < 0) { st = addDays(S[0], -Math.ceil(diffDays(S[0], date) / L) * L); len = L; est = true; }
  else {
    const iv = i < S.length - 1 ? diffDays(S[i + 1], S[i]) : null;
    if (iv != null && iv >= 18 && iv <= 60) { st = S[i]; len = iv; }
    else { const k = Math.floor(diffDays(date, S[i]) / L); st = addDays(S[i], k * L); len = L; if (k > 0) est = true; }
  }
  if (date > todayStr()) est = true;
  /* 排卵は次の月経の12日前ごろ(黄体期の平均12.4日、Bull ほか 2019)。今日の目安(windowFor)と同じ位置・同じ幅(前後2日)にそろえる */
  const D = diffDays(date, st) + 1, ov = len - 12, run = runOf(st) || mens || 5;
  const zone = D <= run ? 'menses' : D <= ov - 3 ? 'fol' : D <= ov + 2 ? 'ovu' : D <= len - 7 ? 'lut' : 'pre';
  return { D, len, st, zone, p: ZONE[zone].p, est, isStart: D === 1 };
}

/* ---- 文面(texts.json)を core の KB・SRC・GRADE に反映 ---- */
function applyTexts(t) {
  KB.length = 0;
  for (const e of t.kb) KB.push({ window: e.window, category: e.category, text: e.text, grade: e.grade, refs: e.refs, when: e.when });
  for (const [k, v] of Object.entries(t.src)) SRC[k] = { n: v.n, u: v.u, x: v.x };
  for (const k of Object.keys(GRADE)) delete GRADE[k];
  Object.assign(GRADE, t.grade);
  for (const k of Object.keys(GRADE_LIMIT)) delete GRADE_LIMIT[k];
  Object.assign(GRADE_LIMIT, t.gradeLimit);
}

/* ---- 表示 ---- */
/* 設計案(設定欄の表 .phtbl)から、今の時期に合うものを1つ、ランダムに選ぶ。同じ時期の間は選び直さない */
const DROW = { menses: 'C', fol: 'A', ovu: 'A', lut: 'B', pre: 'B' };
let tipPick = { key: '', text: '' };
function designTip(zone) {
  const r = DROW[zone] || 'A', key = r + ':' + todayStr();
  if (tipPick.key !== key) {
    const li = [...document.querySelectorAll('.phtbl .r' + r + ' li')];
    tipPick = { key, text: li.length ? li[Math.floor(Math.random() * li.length)].textContent : '' };
  }
  return tipPick.text;
}

function renderNow(S, L, mens) {
  const el = $('#now'); el.replaceChildren();
  const today = todayStr();
  if (!S.length) {
    el.append(h('div', { class: 'card' }, h('div', { class: 'big' }, 'さっそく記録しましょう！')));
    return;
  }
  const z = zoneAt(today, S, L.L, mens), next = addDays(z.st, z.len);
  const sub = [h('div', { class: 'sub' }, '次の月経は ' + jp(next) + ' ごろ(周期' + (L.auto ? '約' : '仮') + L.L + '日)')];
  if (diffDays(today, S[S.length - 1]) > L.L * 2) sub.push(h('div', { class: 'sub' }, '最後の記録から日がたっています。予測は不確かです。'));
  el.append(h('div', { class: 'card' },
    h('div', { class: 'big' }, '周期 ' + z.D + '日目', h('span', { class: 'chip ' + z.p }, MARK[z.p] + ' ' + ZONE[z.zone].name + ' ' + TIER[z.p])),
    designTip(z.zone) ? h('div', { class: 'sub' }, h('span', { class: 'tiplb' }, '設計案'), designTip(z.zone)) : null,
    ...sub));
}

/* core.js(自動生成。直接は編集しない)の注意文から「時期は推定しません」を外す */
function trimNote(n) {
  return n.replace('とばらつくため、時期は推定しません。', 'とばらついています。')
    .replace('まだ少ないため、時期は推定しません。', 'まだ少ない状態です。')
    .replace('経っているため、時期は推定しません。', '経っています。')
    .replace('過ぎているため、時期は推定しません。', '過ぎています。');
}

function renderAdvice(S, mens) {
  const el = $('#advice'); el.replaceChildren();
  $('#feelBox').hidden = !S.length;
  if (!S.length) return;
  const today = todayStr(), feel = data.feel[today] || 'normal';
  document.querySelectorAll('#feel button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === feel)));
  const D = buildDaily(null, today, feel, S, { mens, bleeding: isBleedDay(today, S) });
  if (!D.window.id) { el.append(h('p', { class: 'muted' }, trimNote(D.window.note))); return; }
  el.append(h('h2', null, '今日の目安 ', h('span', { class: 'muted' }, D.window.name + '(確かさ: ' + D.window.conf + ')')));
  for (const row of D.rows) {
    const cat = h('div', { class: 'cat' }, h('h3', null, row.label));
    for (const it of row.items) {
      const item = h('div', { class: 'item' }, h('p', null, it.text), h('span', { class: 'badge' }, GRADE[it.grade]));
      if (GRADE_LIMIT[it.grade]) item.append(h('p', { class: 'limit' }, GRADE_LIMIT[it.grade]));
      if (it.refs && it.refs.length) {
        const d = h('details', { class: 'refs' }, h('summary', null, '論文を見る(' + it.refs.length + '件)'));
        for (const r of it.refs) {
          const s = SRC[r]; if (!s) continue;
          d.append(h('div', { class: 'ref' }, h('a', { href: s.u, target: '_blank', rel: 'noopener noreferrer' }, s.n), h('div', null, s.x)));
        }
        item.append(d);
      }
      cat.append(item);
    }
    el.append(cat);
  }
}

function renderCal(S, L, mens) {
  const [y, m] = ui.month.split('-').map(Number);
  $('#monthTitle').textContent = y + '年' + m + '月';
  const first = ui.month + '-01', last = fmtDate(new Date(Date.UTC(y, m, 0)));
  const gs = addDays(first, -dowMon(first)), ge = addDays(last, 6 - dowMon(last)), today = todayStr();
  const grid = $('#cal'); grid.replaceChildren();
  grid.classList.toggle('rec', ui.rec);
  for (const w of DOW) grid.append(h('div', { class: 'dow' }, w));
  for (let d = gs; d <= ge; d = addDays(d, 1)) {
    const z = zoneAt(d, S, L.L, mens), cls = [];
    if (z) cls.push('z' + z.p);
    if (z && z.est) cls.push('est');
    if (d < first || d > last) cls.push('out');
    if (d === today) cls.push('today');
    if (d === ui.sel) cls.push('sel');
    const aria = jp(d) + (z ? ' 周期' + z.D + '日目 ' + ZONE[z.zone].name + (z.est ? '(予測)' : '') : '');
    grid.append(h('button', { type: 'button', class: cls.join(' '), 'data-d': d, 'aria-label': aria, 'aria-pressed': d === ui.sel ? 'true' : null },
      h('span', { class: 'n' }, String(+d.slice(8))),
      z ? h('span', { class: 'z' }, MARK[z.p]) : null,
      z && z.isStart ? h('span', { class: 'm' }, z.est ? '開始?' : '開始') : null));
  }
  $('#legend').replaceChildren(
    ...['A', 'B', 'C'].map((p) => h('span', null, h('i', { style: 'background:var(--z' + p.toLowerCase() + 's)' }), MARK[p] + ' ' + TIER[p])),
    h('span', null, '点線の枠=予測'));
  const d = ui.sel, z = zoneAt(d, S, L.L, mens);
  $('#detail').replaceChildren(h('div', null, jp(d) + ' ・ ' + (z ? '周期' + z.D + '日目(' + ZONE[z.zone].name + ')' + (z.est ? ' 予測' : '') : '月経の記録がまだありません')));
  if (window.extraDetail) window.extraDetail(d, z);
  const rh = $('#recHint'); rh.hidden = !ui.rec;
  rh.textContent = ui.rec ? (ui.hint || '日をタップすると月経の開始日になります。続けて、終わった日をタップします。') : '';
  const rb = $('#recBtn'); rb.setAttribute('aria-pressed', String(ui.rec)); rb.textContent = ui.rec ? '記録を終える' : '月経を記録';
}

function renderAll() {
  const S = starts(), L = lenOf(S), mens = mensOf(S);
  $('#today').textContent = jp(todayStr());
  renderNow(S, L, mens); renderAdvice(S, mens); renderCal(S, L, mens);
  const cn = $('#cycleNote'), dr = S.length ? L.dropped : [];
  cn.hidden = !dr.length;
  cn.textContent = dr.length ? '周期は、いつもと違う間隔(' + dr.map((x) => x.L + '日').join('・') + ')を除いた平均で、計算しています。' : '';
  syncCal(S, L, mens);
  if (window.afterRender) window.afterRender(S, L, mens);
}

/* ---- Googleカレンダーへの色の反映(拡張のみ。ON のときだけ calendar.google.com の許可を求める) ---- */
const CMAP = 'tsshare-calmap-v1', CAL_ORIGIN = ['https://calendar.google.com/*'];
const canCal = () => !!(globalThis.chrome && chrome.storage && chrome.storage.local && chrome.permissions && chrome.scripting && $('#calRow'));
let lastCal = '';
function syncCal(S, L, mens) {
  if (!canCal()) return;
  const on = !!settings.calSync && S.length > 0, days = {};
  if (on) { const t = todayStr(); for (let i = -400; i <= 365; i++) { const d = addDays(t, i), z = zoneAt(d, S, L.L, mens); if (z) days[d] = z.p; } }
  const v = { on, colors: { A: settings.A.color, B: settings.B.color, C: settings.C.color }, days };
  const j = JSON.stringify(v); if (j === lastCal) return;
  lastCal = j; chrome.storage.local.set({ [CMAP]: v });
}
function showCal() {
  const row = $('#calRow'); if (!row) return;
  row.hidden = !canCal(); $('#calHint').hidden = !canCal();
  const b = $('#calSync'); b.setAttribute('aria-checked', String(!!settings.calSync)); b.textContent = settings.calSync ? 'ON' : 'OFF';
}
async function setCal(on) {
  try {
    if (on) {
      if (!(await chrome.permissions.request({ origins: CAL_ORIGIN }))) return;
      try { await chrome.scripting.unregisterContentScripts({ ids: ['rhythm-cal'] }); } catch (e) { /* 未登録 */ }
      await chrome.scripting.registerContentScripts([{ id: 'rhythm-cal', matches: CAL_ORIGIN, js: ['calsync.js'], runAt: 'document_idle', persistAcrossSessions: true }]);
      try { for (const t of await chrome.tabs.query({ url: CAL_ORIGIN })) chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['calsync.js'] }).catch(() => {}); } catch (e) { /* 開いているタブは、再読み込みで反映 */ }
    }
    settings.calSync = on; sstore.save(); renderAll(); showCal();
    if (!on) {
      try { await chrome.scripting.unregisterContentScripts({ ids: ['rhythm-cal'] }); } catch (e) { /* 未登録 */ }
      try { await chrome.permissions.remove({ origins: CAL_ORIGIN }); } catch (e) { /* */ }
    }
  } catch (e) { showCal(); }
}
function bindCal() {
  if (!canCal()) return;
  $('#calSync').onclick = () => setCal(!settings.calSync);
  /* 拡張の管理画面で許可を外された場合は、OFF に戻す */
  if (settings.calSync) chrome.permissions.contains({ origins: CAL_ORIGIN }, (ok) => { if (!ok) { settings.calSync = false; sstore.save(); renderAll(); showCal(); } });
  showCal();
}

/* ---- 記録(日のタップ) ---- */
function startForEnd(e, S) { const st = lastStartLE(S, e); return st && diffDays(e, st) <= 13 ? st : null; }
function recordTap(d) {
  const S = starts(), t = todayStr();
  ui.sel = d;
  if (d > t) { ui.hint = '未来の日は記録できません。'; return; }
  if (data.starts.includes(d)) {
    data.starts = data.starts.filter((x) => x !== d); delete data.ends[d]; store.save();
    ui.hint = jp(d) + 'を月経の開始日から外しました。'; return;
  }
  const st = startForEnd(d, S);
  if (st && d > st) {
    if (data.ends[st] === d) { delete data.ends[st]; ui.hint = jp(d) + 'の「終わり」の記録を外しました。'; }
    else { data.ends[st] = d; ui.hint = jp(st) + '〜' + jp(d) + '(' + (diffDays(d, st) + 1) + '日間)を月経として記録しました。'; }
    store.save(); return;
  }
  data.starts.push(d); data.starts.sort(); store.save();
  ui.hint = jp(d) + 'を月経の開始日にしました。終わった日があれば、その日をタップしてください(開始日だけでも大丈夫です)。';
}

/* 初回: 最後の月経の開始日を1回で入れる */
function firstStart(d) {
  if (!ISO.test(d) || d > todayStr()) return;
  data.starts = [d]; data.ends = {}; store.save();
  ui.month = d.slice(0, 7); ui.sel = todayStr(); ui.hint = '';
  renderAll();
}

function bind() {
  $('#prev').onclick = () => { shiftMonth(-1); };
  $('#next').onclick = () => { shiftMonth(1); };
  $('#goToday').onclick = () => { ui.month = todayStr().slice(0, 7); ui.sel = todayStr(); renderAll(); };
  $('#recBtn').onclick = () => { ui.rec = !ui.rec; ui.hint = ''; renderAll(); };
  $('#cal').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-d]'); if (!b) return;
    if (ui.rec) recordTap(b.dataset.d); else ui.sel = b.dataset.d;
    renderAll();
  });
  $('#feel').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    data.feel[todayStr()] = b.dataset.f; store.save(); renderAll();
  });
  $('#setReset').onclick = () => { adoptSettings(null, true); sstore.save(); renderSettings(); renderAll(); };
  bindCal();
  let armed = null;
  $('#wipe').onclick = () => {
    const b = $('#wipe');
    if (!armed) { b.textContent = 'もう一度押すと、すべて消えます'; armed = setTimeout(() => { b.textContent = '記録をすべて消す'; armed = null; }, 4000); return; }
    clearTimeout(armed); armed = null; b.textContent = '記録をすべて消す';
    adopt(null); store.clear(); ui.hint = ''; renderAll();
  };
  if (globalThis.chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((c, area) => { if (area === 'local' && c[KEY]) { adopt(c[KEY].newValue); renderAll(); }
      if (area === 'local' && c[SKEY]) { adoptSettings(c[SKEY].newValue); renderSettings(); renderAll(); showCal(); } });
  }
}
function shiftMonth(n) {
  const [y, m] = ui.month.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + n, 1));
  ui.month = t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1); renderAll();
}

(async function main() {
  try {
    const t = await (await fetch('texts.json')).json();
    applyTexts(t);
  } catch (e) {
    $('#advice').append(h('p', { class: 'muted' }, '文面を読み込めませんでした。'));
  }
  adopt(await store.load());
  adoptSettings(await sstore.load());
  bind(); renderSettings(); renderAll();
})();
