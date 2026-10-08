// ===== Best of Us – saját szerver (Firebase) =====
// A játék eredetileg a Claude-os tárolót használta (window.claude.use('db' | 'user' | 'room')).
// Ez a fájl ugyanazt a felületet adja Firebase-ből, így a játék kódja szinte változatlan maradhat:
//   db   → Cloud Firestore (profilok, PvP-meccsek)
//   user → Firebase Authentication (Google vagy e-mail + jelszó)
//   room → Realtime Database (ki van online, élő PvP jelzések és gyors üzenetek)
(function () {
  const CFG = {
    apiKey: 'AIzaSyAqf-zV1l7D8yJD7o8BJNAf7tYHL_-Iov4',
    authDomain: 'clash-of-us.firebaseapp.com',
    databaseURL: 'https://clash-of-us-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'clash-of-us',
    storageBucket: 'clash-of-us.firebasestorage.app',
    messagingSenderId: '833868657941',
    appId: '1:833868657941:web:856018a89e4c8de214e51c',
  };
  window.APP_MODE = true;
  // Meghívó link (…/?inv=KÓD): eltesszük, és a profil létrehozásakor / belépéskor automatikusan barátok lesztek
  try {
    const q = new URLSearchParams(location.search), inv = (q.get('inv') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (inv.length === 6) localStorage.setItem('bou_inv', inv);
    if (q.has('inv')) history.replaceState(null, '', location.pathname + location.hash);
  } catch (e) {}
  firebase.initializeApp(CFG);
  const auth = firebase.auth(), fs = firebase.firestore(), rtdb = firebase.database();
  fs.settings({ ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true });
  auth.useDeviceLanguage();
  const TS = firebase.database.ServerValue.TIMESTAMP;
  const SESSION = Math.random().toString(36).slice(2, 8);   // egy fiók több eszközön / fülön is lehet

  // --- „lease”: rövid zár egy dokumentumra (PvP-csatlakozásnál, hogy ketten ne üljenek le egyszerre) ---
  firebase.firestore.DocumentReference.prototype.acquire = async function ({ holder, ttlMs = 5000 } = {}) {
    const ref = this;
    try {
      return await fs.runTransaction(async tx => {
        const s = await tx.get(ref); if (!s.exists) return { acquired: false };
        const l = s.data()._lease, now = Date.now();
        if (l && l.until > now && l.holder !== holder) return { acquired: false };
        tx.update(ref, { _lease: { holder, until: now + ttlMs } });
        return { acquired: true };
      });
    } catch { return { acquired: false }; }
  };

  // --- bejelentkezés ---
  let resolveUser; const userReady = new Promise(r => resolveUser = r);
  let loginEl = null;
  auth.onAuthStateChanged(u => {
    if (u) { hideLogin(); resolveUser(u); }
    else showLogin();
  });
  auth.getRedirectResult().catch(e => loginError(e));

  const ERR = {
    'auth/invalid-email': 'Hibás e-mail-cím.',
    'auth/missing-password': 'Add meg a jelszót.',
    'auth/weak-password': 'A jelszó legalább 6 karakter legyen.',
    'auth/email-already-in-use': 'Ezzel az e-maillel már van fiók – lépj be vele.',
    'auth/invalid-credential': 'Hibás e-mail vagy jelszó.',
    'auth/wrong-password': 'Hibás jelszó.',
    'auth/user-not-found': 'Nincs ilyen fiók – regisztrálj.',
    'auth/too-many-requests': 'Túl sok próbálkozás, várj egy kicsit.',
    'auth/network-request-failed': 'Nincs internetkapcsolat.',
    'auth/popup-closed-by-user': 'Bezártad a Google ablakot.',
    'auth/cancelled-popup-request': '',
  };
  function loginError(e) {
    if (!loginEl || !e) return;
    const m = ERR[e.code] ?? ('Nem sikerült: ' + (e.code || e.message || e));
    const el = loginEl.querySelector('.lg-err'); el.hidden = !m; el.textContent = m;
  }
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function showLogin() {
    if (loginEl) return;
    const o = loginEl = document.createElement('div'); o.className = 'overlay login';
    o.innerHTML = `<form class="modal login-box" novalidate>
        <div class="lg-logo" aria-hidden="true"></div>
        <h2>Best of Us</h2>
        <p>Lépj be, hogy a gyűjteményed a felhőben legyen, és bármelyik telefonodon folytathasd.</p>
        <button type="button" class="btn primary lg-google"><span class="g">G</span> Belépés Google-lel</button>
        <div class="lg-or"><span>vagy e-maillel</span></div>
        <label class="fld"><span>E-mail</span><input type="email" name="em" autocomplete="email" inputmode="email" required></label>
        <label class="fld"><span>Jelszó</span><input type="password" name="pw" autocomplete="current-password" minlength="6" required></label>
        <p class="err lg-err" hidden></p>
        <div class="lg-row"><button class="btn primary" type="submit" data-a="in">Belépés</button><button class="btn" type="button" data-a="up">Regisztráció</button></div>
        <button type="button" class="linkish" data-a="reset">Elfelejtett jelszó</button>
      </form>`;
    (document.getElementById('layer') || document.body).appendChild(o);
    const f = o.querySelector('form'), em = f.elements.em, pw = f.elements.pw;
    const busy = on => f.querySelectorAll('button').forEach(b => b.disabled = on);
    o.querySelector('.lg-google').onclick = async () => {
      const prov = new firebase.auth.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' });
      busy(true);
      try { await auth.signInWithPopup(prov); }
      catch (e) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code) || standalone()) {
          try { await auth.signInWithRedirect(prov); return; } catch (e2) { loginError(e2); }
        } else loginError(e);
      } finally { busy(false); }
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const a = e.submitter?.dataset.a || 'in'; busy(true);
      try { await auth.signInWithEmailAndPassword(em.value.trim(), pw.value); }
      catch (err) { loginError(err); } finally { busy(false); }
    };
    f.querySelector('[data-a="up"]').onclick = async () => {
      busy(true);
      try { await auth.createUserWithEmailAndPassword(em.value.trim(), pw.value); }
      catch (err) { loginError(err); } finally { busy(false); }
    };
    f.querySelector('[data-a="reset"]').onclick = async () => {
      if (!em.value.trim()) return loginError({ code: 'x', message: 'Írd be az e-mail-címed, és nyomd meg újra.' });
      try { await auth.sendPasswordResetEmail(em.value.trim()); const el = f.querySelector('.lg-err'); el.hidden = false; el.textContent = 'Elküldtük a jelszó-visszaállító levelet (nézd meg a spamet is).'; }
      catch (err) { loginError(err); }
    };
  }
  function hideLogin() { loginEl?.remove(); loginEl = null; }
  window.APP_USER = () => auth.currentUser?.email || auth.currentUser?.displayName || '';
  window.APP_LOGOUT = async () => { try { await auth.signOut(); } finally { location.reload(); } };

  // --- „szoba” Realtime Database-ből: jelenlét + üzenetek (a Claude-os room felülete) ---
  function makeRoom(base) {
    const peersRef = rtdb.ref(base + '/peers'), msgsRef = rtdb.ref(base + '/msgs');
    let myKey = null, cache = [], valueOff = null;
    const peerCbs = new Set(), offs = [];
    const uid = () => auth.currentUser?.uid || 'x';
    const key = () => myKey || (myKey = uid() + '_' + SESSION);
    const listenPeers = () => {
      if (valueOff) return;
      const h = peersRef.on('value', snap => {
        const v = snap.val() || {};
        cache = Object.entries(v).map(([k, x]) => ({ id: k, isMe: k === key(), presence: (x && x.p) || {} }));
        peerCbs.forEach(cb => { try { cb(cache); } catch {} });
      }, () => {});
      valueOff = () => peersRef.off('value', h);
    };
    listenPeers();
    return {
      peers: () => cache,
      onPeers(cb) { peerCbs.add(cb); return () => peerCbs.delete(cb); },
      async presence(p) {
        const me = peersRef.child(key());
        await me.onDisconnect().remove();
        await me.set({ p: p || {}, t: TS });
      },
      async join(name) { return makeRoom('rooms/' + String(name).replace(/[.#$\[\]\/]/g, '_')); },
      on(topic, cb) {
        let h = null, q = null, dead = false;
        msgsRef.orderByKey().limitToLast(1).once('value').then(s => {
          if (dead) return;
          const last = Object.keys(s.val() || {})[0];
          q = last ? msgsRef.orderByKey().startAfter(last) : msgsRef.orderByKey();
          h = q.on('child_added', ms => { const m = ms.val(); if (m && m.topic === topic) try { cb({ data: m.data, isMe: m.from === key() }); } catch {} });
        }).catch(() => {});
        const off = () => { dead = true; if (q && h) q.off('child_added', h); };
        offs.push(off); return off;
      },
      async emit(topic, data) { await msgsRef.push({ topic, data: data ?? null, from: key(), t: TS }); },
      async leave() {
        offs.forEach(f => f()); valueOff?.(); valueOff = null; peerCbs.clear();
        const me = peersRef.child(key());
        await me.onDisconnect().cancel().catch(() => {}); await me.remove().catch(() => {});
        // ha az utolsó volt benne, a szoba üzeneteit is töröljük (ne gyűljön a szemét)
        const s = await peersRef.once('value').catch(() => null);
        if (s && !s.exists() && base.startsWith('rooms/')) rtdb.ref(base).remove().catch(() => {});
      },
    };
  }
  let lobby = null;

  // --- a Claude-os felület pótlása ---
  window.claude = {
    async use(name) {
      if (name === 'db') { await userReady; return fs; }
      if (name === 'user') return {
        async id() { return (await userReady).uid; },
        async me() { const u = await userReady; return { name: u.displayName || (u.email || '').split('@')[0] || '' }; },
      };
      if (name === 'room') { await userReady; return lobby || (lobby = makeRoom('lobby')); }
      return null;
    },
  };
})();
