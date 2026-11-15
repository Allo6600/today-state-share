/* スマホ版だけの機能: やることをA/B/Cに分けて、向いている日をGoogleカレンダーに入れる。
   やることは、この端末のブラウザの中だけに保存。Googleカレンダーへ送るのは、「入れる」を押した1件の題名と日付だけ。 */
'use strict';
const TKEY = 'tsshare-tasks-v1';
const tk = { list: [], acct: 0 };
(function loadTasks() {
  try {
    const v = JSON.parse(localStorage.getItem(TKEY) || 'null');
    if (v && Array.isArray(v.list)) tk.list = v.list.filter((x) => x && typeof x.t === 'string' && 'ABC'.includes(x.p)).map((x) => ({ id: String(x.id), t: x.t.slice(0, 80), p: x.p, done: !!x.done }));
    if (v && Number.isInteger(v.acct) && v.acct >= 0 && v.acct < 10) tk.acct = v.acct;
  } catch (e) { /* */ }
})();
const tkSave = () => { try { localStorage.setItem(TKEY, JSON.stringify(tk)); } catch (e) { /* */ } };

const gDay = (d) => { const a = d.split('-').map(Number); return 'https://calendar.google.com/calendar/u/' + tk.acct + '/r/day/' + a[0] + '/' + a[1] + '/' + a[2]; };
const gNew = (text, d) => 'https://calendar.google.com/calendar/render?action=TEMPLATE&authuser=' + tk.acct +
  '&text=' + encodeURIComponent(text) + '&dates=' + d.replace(/-/g, '') + '/' + addDays(d, 1).replace(/-/g, '');
const link = (href, label) => h('a', { class: 'btn small', href, target: '_blank', rel: 'noopener noreferrer' }, label);

/* 選んだ日の詳細に、Googleカレンダーへのリンクを足す */
window.extraDetail = (d) => { $('#detail').append(h('div', { class: 'gl' }, link(gDay(d), 'Googleカレンダーで ' + jp(d) + ' を開く'))); };

/* p のゾーンになる、いちばん近い日(今日から60日先まで) */
function nextDay(p, S, L, mens) {
  const t = todayStr();
  for (let i = 0; i <= 60; i++) { const d = addDays(t, i), z = zoneAt(d, S, L.L, mens); if (z && z.p === p) return { d, est: z.est }; }
  return null;
}

window.afterRender = (S, L, mens) => {
  const el = $('#tasks'); if (!el) return;
  el.replaceChildren(h('h2', null, 'やることを分ける'));
  const t = todayStr(), z = S.length ? zoneAt(t, S, L.L, mens) : null;
  const sel = h('select', { class: 'in', 'aria-label': 'どんな作業か' }, ...['A', 'B', 'C'].map((k) => h('option', { value: k }, MARK[k] + ' ' + TIER[k])));
  const inp = h('input', { type: 'text', class: 'in name', maxlength: '80', placeholder: 'やること(例: 企画書を書く)', 'aria-label': 'やること' });
  const add = () => {
    const v = inp.value.trim(); if (!v) return;
    tk.list.push({ id: String(Date.now()) + Math.random().toString(36).slice(2, 6), t: v, p: sel.value, done: false }); tkSave(); renderAll();
  };
  inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
  el.append(h('div', { class: 'setrow' }, inp), h('div', { class: 'setrow' }, sel, h('button', { type: 'button', class: 'btn', onclick: add }, '追加')));
  if (!S.length) el.append(h('p', { class: 'muted' }, '月経を記録すると、向いている日が出ます。'));
  for (const k of ['A', 'B', 'C']) {
    const items = tk.list.filter((x) => x.p === k);
    if (!items.length) continue;
    const now = z && z.p === k;
    const box = h('div', { class: 'cat' }, h('h3', null, MARK[k] + ' ' + TIER[k] + (now ? '  ← 今日はこれ向き' : '')));
    for (const x of items) {
      const nd = S.length && !x.done ? nextDay(k, S, L, mens) : null;
      const row = h('div', { class: 'item tk ' + k + (x.done ? ' done' : '') },
        h('label', { class: 'tkl' }, h('input', { type: 'checkbox', checked: x.done || null, onchange: (e) => { x.done = e.target.checked; tkSave(); renderAll(); } }), h('span', null, x.t)),
        h('div', { class: 'tka' },
          nd ? link(gNew(x.t, nd.d), (nd.d === t ? '今日' : jp(nd.d)) + (nd.est ? '(予測)' : '') + 'に入れる') : null,
          link(gNew(x.t, ui.sel), '選んだ日(' + jp(ui.sel) + ')に入れる'),
          h('button', { type: 'button', class: 'btn small', onclick: () => { tk.list = tk.list.filter((y) => y !== x); tkSave(); renderAll(); } }, '消す')));
      box.append(row);
    }
    el.append(box);
  }
  const acct = h('input', { type: 'number', class: 'in', min: '0', max: '9', value: String(tk.acct), 'aria-label': 'Googleアカウントの番号' });
  acct.onchange = () => { const n = parseInt(acct.value, 10); tk.acct = n >= 0 && n < 10 ? n : 0; tkSave(); renderAll(); };
  el.append(h('details', { class: 'set' }, h('summary', null, 'Googleアカウントの番号'),
    h('p', { class: 'muted' }, '複数のアカウントでログインしているときに使います。いちばん上のアカウントは0、次は1です。'), acct));
};
