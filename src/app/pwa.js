// ===== Best of Us – telepíthető app: offline gyorsítótár, frissítésjelzés, telepítés gomb =====
(function () {
  const V = window.APP_VERSION;
  // 1) service worker: a képek a telefonon maradnak, a játék a netről mindig a legfrissebbet kéri
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  // 2) új verzió figyelése: induláskor, visszatéréskor és 5 percenként
  let shown = false;
  async function checkVersion() {
    if (shown || !navigator.onLine) return;
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const j = await r.json();
      if (j.v && j.v !== V) { shown = true; showUpdate(j); }
    } catch {}
  }
  window.APP_NEWER = () => shown;   // a PvP ezt nézi: régi verzióval nem párosít
  // meccs közben nem jelenik meg (ne takarja el az ellenfél életét) – kivárja, amíg nem játszol; ✕-szel el is rejthető
  const inMatch = () => { const g = document.getElementById('scr-game'); return !!g && !g.hidden; };
  function showUpdate(j) {
    if (inMatch() || document.querySelector('.overlay.intro, .overlay.opening')) { setTimeout(() => showUpdate(j), 3000); return; }
    const b = document.createElement('div'); b.className = 'upd-bar';
    b.innerHTML = `<span><b>Új verzió érhető el!</b>${j.note ? `<small>${String(j.note).replace(/[<>&]/g, '')}</small>` : ''}</span><button class="btn primary upd-go">Frissítés</button><button class="upd-x" aria-label="Később">✕</button>`;
    b.querySelector('.upd-x').onclick = () => { b.remove(); setTimeout(() => showUpdate(j), 10 * 60 * 1000); };   // 10 perc múlva újra szól
    const hideT = setInterval(() => { if (!b.isConnected) return clearInterval(hideT); b.hidden = inMatch(); }, 1000);   // ha közben meccs indul, eltűnik
    b.querySelector('.upd-go').onclick = async () => {
      b.querySelector('.upd-go').disabled = true;
      try { const regs = await navigator.serviceWorker?.getRegistrations?.() || []; await Promise.all(regs.map(r => r.update().catch(() => {}))); } catch {}
      location.reload();
    };
    document.body.appendChild(b);
  }
  addEventListener('load', () => setTimeout(checkVersion, 2500));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });
  setInterval(checkVersion, 5 * 60 * 1000);

  // 3) telepítés: Androidon a böngésző saját ablaka, iPhone-on rövid útmutató
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferred = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; renderBtn(); });
  addEventListener('appinstalled', () => { deferred = null; renderBtn(); });
  function renderBtn() {
    const btn = document.getElementById('installBtn'); if (!btn) return;
    btn.hidden = standalone() || !(deferred || ios);
  }
  window.APP_INSTALL = async () => {
    if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch {} deferred = null; renderBtn(); return; }
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="modal inst-box"><h3>Telepítés iPhone-ra</h3>
      <ol><li>Ezt az oldalt <b>Safariban</b> nyisd meg.</li>
      <li>Koppints a <b>Megosztás</b> gombra <span class="ios-share" aria-hidden="true"></span><br><small>Új iPhone-on (iOS 26): a címsor melletti <b>•••</b> gomb → <b>Megosztás</b></small></li>
      <li>Görgess le, és válaszd: <b>Főképernyőhöz adás</b> (ha nem látod: <b>Továbbiak</b>).</li>
      <li>Jobb fent: <b>Hozzáadás</b>. Kész – a Best of Us ikon ott lesz a főképernyőn.</li></ol>
      <p class="live">Telepítés után lépj be újra az appban (a Safari és az app külön emlékszik rád).</p>
      <button class="btn primary" data-x>Értem</button></div>`;
    o.onclick = e => { if (e.target === o || e.target.closest('[data-x]')) o.remove(); };
    (document.getElementById('layer') || document.body).appendChild(o);
  };
  addEventListener('load', renderBtn);
})();
