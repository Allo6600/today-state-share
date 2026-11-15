/* Googleカレンダーの月表示で、日付の背景を A・B・C の色にする(設定で ON にしたときだけ動く)。
   読むのは、パネルが保存した「日付→A/B/C」の対応と色だけ。予定の内容は読まない・送らない。
   日付セルは div[data-datekey](Googleの内部表記: (年-1970)*512 + 月(1〜12)*32 + 日)で見つける。 */
(function () {
  'use strict';
  if (window.__rhythmCal) return;
  window.__rhythmCal = true;
  const KEY = 'tsshare-calmap-v1';
  const HEX = /^#[0-9a-fA-F]{6}$/;
  let map = null, timer = 0;
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (k) => (Math.floor(k / 512) + 1970) + '-' + pad(Math.floor((k % 512) / 32)) + '-' + pad(k % 32);
  const rgba = (hex, a) => 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')';

  function apply() {
    const on = !!(map && map.on && map.days && map.colors);
    for (const c of document.querySelectorAll('div[data-datekey][data-dragsource-type]')) {
      const p = on ? map.days[iso(+c.getAttribute('data-datekey'))] : null;
      const col = p && map.colors[p];
      if (col && HEX.test(col)) { c.style.setProperty('background-color', rgba(col, 0.28), 'important'); c.setAttribute('data-rhythm', p); }
      else if (c.hasAttribute('data-rhythm')) { c.style.removeProperty('background-color'); c.removeAttribute('data-rhythm'); }
    }
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(apply, 150); };

  chrome.storage.local.get(KEY, (v) => { map = v && v[KEY]; apply(); });
  chrome.storage.onChanged.addListener((c, area) => { if (area === 'local' && c[KEY]) { map = c[KEY].newValue; apply(); } });
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
})();
