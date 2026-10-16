// Nagy hős- és szett-mérés (2026-10-17).  node tools/bigsim.js MODE N [ENGINE]
//  MODE = varied      – mindkét fél a paklisegéddel épít a lapkészlet véletlen 75%-ából (Amszterdammal együtt)
//         variedbase  – ugyanez az Amszterdam hősei lapjai NÉLKÜL (összehasonlításhoz)
//         ahdeck      – az A hős „Amszterdam-paklit” játszik (a szett lapjai + saját Kánon + Game Over, a hiány Base set lapokkal), a B hős a kezdőpaklijával
//  Kiírás: hősönként nyerési %, és (varied) melyik Amszterdam-lap milyen gyakran került a paklikba és mennyit nyertek vele.
const path = require('path'), fs = require('fs');
const [MODE, N0, ENG] = process.argv.slice(2); const N = +N0 || 300;
const E = require(ENG || path.join(__dirname, '..', 'engine.js'));
const src = fs.readFileSync(path.join(__dirname, '..', 'meta.js'), 'utf8');
const body = src.slice(src.indexOf('// [DECKHELP-START]'), src.indexOf('// [DECKHELP-END]'));
const mk = cards => new Function('CARD', 'CARDS', 'DECKS', 'DECK_SIZE', 'process', body + '; return { deckHelperFill, botDeckFor };')(E.CARD, cards, E.DECKS, 20, process);
const ALL = mk(E.CARDS), BASE = mk(E.CARDS.filter(c => c.set !== 'ah'));
const H = E.HEROES.map(h => h.id), cap = id => E.CARD[id].rarity === 'l' ? 1 : 2;
const stDeck = h => ({ ...E.DECKS[Object.keys(E.DECKS).find(d => E.DECKS[d].hero === h)].list });
function variedDeck(F, h) {   // véletlen 75%-os lapkészletből a paklisegéd (mint a Nehéz bot, de legendással)
  const pool = E.CARDS.filter(c => !c.token && !c.off && !c.passOnly && !c.eventOnly && !c.shopOnly && !c.wheelOnly && !c.variantOf && (!c.hero || c.hero === h) && (F === ALL || c.set !== 'ah'));
  const keep = new Set(pool.filter(c => c.finisher ? (c.hero === h || (!c.hero && Math.random() < 0.5)) : Math.random() < 0.75).map(c => c.id));
  const { list } = F.deckHelperFill({}, h, id => keep.has(id) ? cap(id) : 0);
  return Object.values(list).reduce((a, b) => a + b, 0) === 20 ? list : stDeck(h);
}
function ahDeck(h) {   // a szett lapjaiból (+ saját Kánon + Game Over), a maradék Base set
  const own = id => { const c = E.CARD[id]; if (c.token || c.off) return 0; if (c.finisher) return (c.hero === h || !c.hero) ? 1 : 0; return c.set === 'ah' ? cap(id) : 0; };
  let { list } = ALL.deckHelperFill({}, h, own);
  if (Object.values(list).reduce((a, b) => a + b, 0) < 20) list = ALL.deckHelperFill(list, h, id => { const c = E.CARD[id]; return c.set === 'ah' || (!c.passOnly && !c.eventOnly && !c.shopOnly && !c.variantOf) ? cap(id) : 0; }).list;
  return list;
}
function play(h0, d0, h1, d1, first) {
  const s = E.newGame(h0, d0, h1, d1, first, { mulligan: true });
  E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s);
  let g = 0;
  while (s.winner == null && g++ < 200) { let n = 0, b; while (s.winner == null && n++ < 15 && (b = E.botChoose(s))) E.playCard(s, s.active, b.hi, b.t); if (s.winner == null) E.runEndTurn(s); }
  return s.winner;
}
const res = {}, use = {}; H.forEach(h => res[h] = [0, 0]);
let games = 0;
for (let k = 0; k < N; k++) for (const a of H) for (const b of H) { if (a === b) continue;
  let da, db;
  if (MODE === 'ahdeck') { da = ahDeck(a); db = stDeck(b); }
  else { const F = MODE === 'variedbase' ? BASE : ALL; da = variedDeck(F, a); db = variedDeck(F, b); }
  const first = (k + games) % 2, r = play(a, da, b, db, first); games++;
  const sc = r === 0 ? 1 : r === 'draw' ? .5 : 0;
  res[a][0] += sc; res[a][1]++;
  if (MODE !== 'ahdeck') { res[b][0] += 1 - sc; res[b][1]++; }
  if (MODE === 'varied') for (const [d, s0] of [[da, sc], [db, 1 - sc]]) for (const id of Object.keys(d)) if (E.CARD[id].set === 'ah') { const u = use[id] = use[id] || [0, 0]; u[0]++; u[1] += s0; }
}
console.log(`## ${MODE} – ${games} meccs`);
H.map(h => [h, 100 * res[h][0] / res[h][1]]).sort((x, y) => y[1] - x[1]).forEach(([h, p]) => console.log(`${E.HERO[h].name.padEnd(10)} ${p.toFixed(1)}%`));
if (MODE === 'varied') { console.log('-- Amszterdam-lapok a paklikban (pakli %, nyerés vele) --');
  Object.entries(use).sort((a, b) => b[1][0] - a[1][0]).forEach(([id, [n, w]]) => console.log(`${E.CARD[id].name.padEnd(28)} ${(100 * n / (2 * games)).toFixed(0).padStart(3)}%  ${(100 * w / n).toFixed(1)}%`)); }
if (MODE === 'ahdeck') { console.log('-- példa Amszterdam-pakli (Tomi) --'); console.log(JSON.stringify(ahDeck('tomi'))); }
