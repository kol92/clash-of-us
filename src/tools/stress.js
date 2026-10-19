// Terheléses teszt (2026-10-19, a 19:00-s Amszterdam-indulás előtt): node tools/stress.js N
// Véletlen paklik az ÖSSZES lapból (változatok, arany, bolti, pass, event, Amszterdam), véletlen hősök és bot-szintek.
// Minden lépés után állapot-ellenőrzés; a meccsek egy részét a PvP-hez hasonlóan lépésenkénti véletlenmaggal kétszer lejátssza (determinizmus).
const fs = require('fs'), vm = require('vm'), path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
const ctx = { module: { exports: {} }, console, Math, JSON, Date }; vm.createContext(ctx); vm.runInContext(code, ctx);
const E = ctx.module.exports, seedRng = ctx.seedRng, unseedRng = ctx.unseedRng;
const N = +process.argv[2] || 2000;
const POOL = E.CARDS.filter(c => !c.token && !c.off);
const H = E.HEROES.map(h => h.id);
const cap = c => c.rarity === 'l' || c.finisher ? 1 : 2;
function randDeck(h) {
  const list = {}; let n = 0, guard = 0;
  const base = id => E.CARD[id].variantOf || id, cnt = {};
  while (n < 20 && guard++ < 5000) {
    const c = POOL[Math.floor(Math.random() * POOL.length)];
    if (c.hero && c.hero !== h) continue;
    const b = base(c.id), lim = cap(E.CARD[b]);
    if ((cnt[b] || 0) >= lim) continue;
    cnt[b] = (cnt[b] || 0) + 1; list[c.id] = (list[c.id] || 0) + 1; n++;
  }
  return list;
}
const bad = []; let games = 0, actions = 0, used = {};
function check(s, where) {
  for (const [k, P] of s.players.entries()) {
    if (!Number.isFinite(P.hp) || !Number.isFinite(P.maxHp)) return `hős életereje nem szám (${k}): ${P.hp}/${P.maxHp}`;
    if (!Number.isFinite(P.energy) || P.energy < 0) return `energia hibás (${k}): ${P.energy}`;
    if (P.board.length !== 4) return `tábla hossza ${P.board.length}`;
    for (const [i, u] of P.board.entries()) { if (!u) continue;
      if (!E.CARD[u.id]) return `ismeretlen lap a táblán: ${u.id}`;
      if (!Number.isFinite(u.atk) || !Number.isFinite(u.hp) || !Number.isFinite(u.maxHp)) return `egység szám-hiba ${u.id}: ${u.atk}/${u.hp}/${u.maxHp}`;
      if (u.hp <= 0 && s.winner == null) return `halott egység a táblán ${u.id} (${k},${i}) hp=${u.hp}`;
      if (u.atk < 0) return `negatív támadás ${u.id}`;
      for (const it of u.items || []) if (!E.CARD[it]) return `ismeretlen eszköz ${it}`;
    }
    for (const h of P.hand) if (!h || !E.CARD[h.id]) return `ismeretlen lap a kézben: ${h && h.id}`;
    for (const id of P.deck) if (!E.CARD[id]) return `ismeretlen lap a pakliban: ${id}`;
    if (P.hand.length > 10) return `túl sok lap a kézben: ${P.hand.length}`;
  }
  return null;
}
function play(h0, d0, h1, d1, first, lv, seeded, script) {
  const hash = x => { let v = 2166136261; for (const ch of String(x)) { v ^= ch.charCodeAt(0); v = Math.imul(v, 16777619); } return v >>> 0; };
  const sd = k => { if (seeded) seedRng(hash(seeded + ':' + k)); };
  sd('start'); const s = E.newGame(h0, { ...d0 }, h1, { ...d1 }, first, { mulligan: true }); s.botLv = lv;
  E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s); if (seeded) unseedRng();
  const log = []; let step = 0, g = 0;
  while (s.winner == null && g++ < 200) {
    let n = 0, b;
    while (s.winner == null && n++ < 20) {
      if (script) { b = script[step]; if (!b || b.end) break; }
      else { b = E.botChoose(s); if (!b) break; }
      const c = s.players[s.active].hand[b.hi]; if (c) used[c.id] = (used[c.id] || 0) + 1;
      sd(step); E.playCard(s, s.active, b.hi, b.t); if (seeded) unseedRng();
      log.push({ hi: b.hi, t: b.t }); step++; actions++;
      const err = check(s); if (err) throw new Error(err + ` [lap: ${c && c.id}]`);
    }
    if (script && script[step] && script[step].end) { /* ok */ }
    if (s.winner == null) { sd(step); E.runEndTurn(s); if (seeded) unseedRng(); log.push({ end: 1 }); step++; const err = check(s); if (err) throw new Error(err + ' [kör vége]'); }
  }
  return { s, log };
}
const clean = s => JSON.stringify({ ...s, events: undefined, uidc: undefined });
let det = 0, detBad = 0;
for (let k = 0; k < N; k++) {
  const h0 = H[k % H.length], h1 = H[Math.floor(Math.random() * H.length)];
  const d0 = randDeck(h0), d1 = randDeck(h1), lv = 1 + (k % 4), first = k % 2;
  const seeded = k % 5 === 0 ? 'g' + k : null;
  try {
    const r = play(h0, d0, h1, d1, first, lv, seeded);
    games++;
    if (seeded) {   // PvP-szerű visszajátszás ugyanazokkal a lépésekkel és magokkal → ugyanaz az állapot?
      det++;
      const r2 = play(h0, d0, h1, d1, first, lv, seeded, r.log);
      if (clean(r.s) !== clean(r2.s)) { detBad++; if (detBad < 4) bad.push(`NEM DETERMINISZTIKUS (${h0} vs ${h1}): ${Object.keys(d0).concat(Object.keys(d1)).join(',')}`); }
    }
  } catch (e) {
    bad.push(`${h0} vs ${h1} lv${lv}: ${e.message}\n   ${(e.stack || '').split('\n').slice(1, 3).join(' | ')}`);
    if (bad.length > 25) break;
  }
}
const never = POOL.filter(c => !used[c.id]).map(c => c.id);
console.log(`meccs: ${games}, lépés: ${actions}, determinizmus: ${det - detBad}/${det} egyezett`);
console.log('soha ki nem játszott lapok:', never.length ? never.join(', ') : 'nincs');
console.log(bad.length ? 'HIBÁK:\n' + bad.join('\n') : 'STRESSZ OK');
