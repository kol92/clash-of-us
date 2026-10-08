// Tesztekhez: a Firebase compat SDK általunk használt részének hamis változata (localStorage-on keresztül több oldal között is működik)
(() => {
  const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  const strip = o => { if (Array.isArray(o)) return o.map(strip); if (o && typeof o === 'object') { const r = {}; for (const k in o) if (o[k] !== undefined) r[k] = strip(o[k]); return r; } return o; };
  const listeners = new Set(); const notify = () => setTimeout(() => listeners.forEach(f => f()), 20);
  addEventListener('storage', e => { if (e.key === 'fbfs' || e.key === 'fbrt') notify(); });
  // ---------- auth ----------
  let cur = null; const authCbs = [];
  const mkUser = (uid, email, name) => ({ uid, email, displayName: name });
  const setUser = u => { cur = u; if (u) sessionStorage.setItem('fbuser', JSON.stringify(u)); else sessionStorage.removeItem('fbuser'); authCbs.forEach(cb => cb(u)); };
  const authObj = {
    get currentUser() { return cur; },
    onAuthStateChanged(cb) { authCbs.push(cb); setTimeout(() => cb(cur), 10); return () => {}; },
    useDeviceLanguage() {}, getRedirectResult: async () => null,
    async signInWithEmailAndPassword(e, p) { if (!/@/.test(e)) throw { code: 'auth/invalid-email' }; if (!p) throw { code: 'auth/missing-password' }; setUser(mkUser('u_' + e.replace(/\W/g, ''), e, '')); },
    async createUserWithEmailAndPassword(e, p) { if ((p || '').length < 6) throw { code: 'auth/weak-password' }; setUser(mkUser('u_' + e.replace(/\W/g, ''), e, '')); },
    async signInWithPopup() { setUser(mkUser('u_google', 'teszt@gmail.com', 'Teszt Elek')); },
    async signInWithRedirect() {}, async sendPasswordResetEmail() {},
    async signOut() { setUser(null); },
  };
  const pre = window.__UID ? mkUser(window.__UID, window.__UID + '@x.hu', window.__UID) : JSON.parse(sessionStorage.getItem('fbuser') || 'null');
  cur = pre;
  // ---------- firestore ----------
  const L = () => JSON.parse(localStorage.getItem('fbfs') || '{}'), S = o => { localStorage.setItem('fbfs', JSON.stringify(o)); notify(); };
  const snap = (path, o) => { const d = o[path]; return { id: path.split('/').pop(), ref: new DocumentReference(path), exists: !!d, data: () => clone(d) }; };
  const setDeep = (obj, key, val) => { const ks = key.split('.'); let t = obj; while (ks.length > 1) { const k = ks.shift(); t = t[k] = (t[k] && typeof t[k] === 'object') ? t[k] : {}; } t[ks[0]] = val; };
  class DocumentReference {
    constructor(path) { this.path = path; this.id = path.split('/').pop(); }
    async get() { return snap(this.path, L()); }
    async set(d) { if (JSON.stringify(d).includes('[[')) throw new Error('nested arrays'); const o = L(); o[this.path] = strip(clone(d)); S(o); }
    async update(d) { const o = L(); if (!o[this.path]) throw { code: 'not-found' }; for (const k in d) if (d[k] !== undefined) setDeep(o[this.path], k, clone(d[k])); S(o); }
    async delete() { const o = L(); delete o[this.path]; S(o); }
    collection(sub) { return new Query(this.path + '/' + sub); }
    onSnapshot(next) { let last = null; const f = () => { const s = JSON.stringify(L()[this.path] || null); if (s !== last) { last = s; next(snap(this.path, L())); } }; listeners.add(f); f(); return () => listeners.delete(f); }
  }
  class Query {
    constructor(path, filters = []) { this.path = path; this.filters = filters; }
    where(f, op, v) { return new Query(this.path, this.filters.concat([[f, op, v]])); }
    limit() { return this; }
    docs() { const o = L(), depth = this.path.split('/').length + 1;
      return Object.keys(o).filter(p => p.startsWith(this.path + '/') && p.split('/').length === depth).sort().filter(p => this.filters.every(([f, op, v]) => {
        const x = o[p][f]; return op === '==' ? x === v : op === 'array-contains' ? Array.isArray(x) && x.includes(v) : true; })).map(p => snap(p, o)); }
    async get() { const docs = this.docs(); return { docs, size: docs.length, empty: !docs.length }; }
    onSnapshot(next) { let last = null; const f = () => { const docs = this.docs(); const s = JSON.stringify(docs.map(d => [d.id, d.data()])); if (s !== last) { last = s; next({ docs, size: docs.length, empty: !docs.length }); } }; listeners.add(f); f(); return () => listeners.delete(f); }
    doc(id) { return new DocumentReference(this.path + '/' + (id || Math.random().toString(36).slice(2, 12))); }
    async add(d) { const r = this.doc(); await r.set(d); return r; }
  }
  const fsObj = { settings() {}, doc: p => new DocumentReference(p), collection: p => new Query(p),
    async runTransaction(fn) { const tx = { get: r => r.get(), update: (r, d) => { tx.w.push(() => r.update(d)); }, set: (r, d) => { tx.w.push(() => r.set(d)); }, w: [] }; const res = await fn(tx); for (const w of tx.w) await w(); return res; } };
  // ---------- realtime database ----------
  const RL = () => JSON.parse(localStorage.getItem('fbrt') || '{}'), RS = o => { localStorage.setItem('fbrt', JSON.stringify(o)); notify(); };
  const getP = (o, p) => p.split('/').filter(Boolean).reduce((a, k) => a && a[k], o);
  const setP = (o, p, v) => { const ks = p.split('/').filter(Boolean); let t = o; while (ks.length > 1) { const k = ks.shift(); t = t[k] = t[k] || {}; } if (v === null) delete t[ks[0]]; else t[ks[0]] = v; };
  const disc = []; addEventListener('pagehide', () => { const o = RL(); disc.forEach(p => setP(o, p, null)); RS(o); });
  let pushN = 0;
  class Ref {
    constructor(path, q = {}) { this.path = path.replace(/^\/+|\/+$/g, ''); this.q = q; this.hs = new Map(); }
    child(k) { return new Ref(this.path + '/' + k); }
    async set(v) { const o = RL(); setP(o, this.path, JSON.parse(JSON.stringify(v, (k, x) => x && x['.sv'] ? Date.now() : x))); RS(o); }
    async remove() { const o = RL(); setP(o, this.path, null); RS(o); }
    async push(v) { const k = String(Date.now()).padStart(15, '0') + '-' + String(pushN++).padStart(4, '0') + Math.random().toString(36).slice(2, 5); await this.child(k).set(v); return this.child(k); }
    onDisconnect() { const p = this.path; return { remove: async () => { disc.push(p); }, cancel: async () => { const i = disc.indexOf(p); if (i >= 0) disc.splice(i, 1); } }; }
    orderByKey() { return new Ref(this.path, { ...this.q }); }
    limitToLast(n) { return new Ref(this.path, { ...this.q, last: n }); }
    startAfter(k) { return new Ref(this.path, { ...this.q, after: k }); }
    val() { let v = getP(RL(), this.path); if (v && typeof v === 'object') { let ks = Object.keys(v).sort(); if (this.q.after) ks = ks.filter(k => k > this.q.after); if (this.q.last) ks = ks.slice(-this.q.last); const r = {}; ks.forEach(k => r[k] = v[k]); v = ks.length ? r : null; } return v ?? null; }
    async once() { const v = this.val(); return { val: () => v, exists: () => v != null }; }
    on(ev, cb) {
      let f;
      if (ev === 'value') { let last; f = () => { const v = this.val(), s = JSON.stringify(v); if (s !== last) { last = s; cb({ val: () => v, exists: () => v != null }); } }; }
      else { const seen = new Set(); f = () => { const v = this.val() || {}; for (const k of Object.keys(v).sort()) if (!seen.has(k)) { seen.add(k); cb({ key: k, val: () => v[k] }); } }; }
      listeners.add(f); f(); this.hs.set(cb, f); return cb;
    }
    off(ev, cb) { const f = this.hs.get(cb); if (f) listeners.delete(f); }
  }
  const rtObj = { ref: p => new Ref(p || '') };
  // ---------- namespace ----------
  const fb = { initializeApp() {}, auth: () => authObj, firestore: () => fsObj, database: () => rtObj };
  fb.auth.GoogleAuthProvider = class { setCustomParameters() {} };
  fb.firestore.DocumentReference = DocumentReference;
  fb.database.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' } };
  window.firebase = fb;
})();
