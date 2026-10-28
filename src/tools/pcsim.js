// Peaches kölcsönpaklik mérése (2026-10-28).  node tools/pcsim.js N [mode]
//  mode = vsbase (alap): a hős pc_ paklija a többi hős (alap) kezdőpaklija ellen
//         vspc        : pc_ pakli a többi hős pc_ paklija ellen (Laszy: vadbuli)
//         base        : összehasonlításként: kezdőpakli a többi kezdőpakli ellen
const path = require('path');
const E = require(path.join(__dirname, '..', 'engine.js'));
const N = +process.argv[2] || 100, MODE = process.argv[3] || 'vsbase';
const H = E.HEROES.map(h => h.id);
const base = h => Object.keys(E.DECKS).find(d => E.DECKS[d].hero === h && !E.DECKS[d].set) || E.DECK_OF(h);
const pcd = h => E.DECKS['pc_' + h] ? 'pc_' + h : E.DECK_OF(h);
function play(h0, d0, h1, d1, first) {
  const s = E.newGame(h0, d0, h1, d1, first, { mulligan: true });
  E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s);
  let g = 0;
  while (s.winner == null && g++ < 200) { let n = 0, b; while (s.winner == null && n++ < 15 && (b = E.botChoose(s))) E.playCard(s, s.active, b.hi, b.t); if (s.winner == null) E.runEndTurn(s); }
  return s.winner;
}
const res = {}; H.forEach(h => res[h] = [0, 0]);
let games = 0;
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (let k = 0; k < N; k++) for (const a of H) for (const b of H) { if (a === b || (ONLY && !ONLY.includes(a))) continue;
  const da = MODE === 'base' ? base(a) : pcd(a), db = MODE === 'vspc' ? pcd(b) : base(b);
  const r = play(a, E.DECKS[da].list, b, E.DECKS[db].list, (k + games) % 2); games++;
  const sc = r === 0 ? 1 : r === 'draw' ? .5 : 0; res[a][0] += sc; res[a][1]++;
  if (MODE === 'vspc') { res[b][0] += 1 - sc; res[b][1]++; }
}
console.log(`## ${MODE} – ${games} meccs`);
H.filter(h => res[h][1]).map(h => [h, 100 * res[h][0] / res[h][1]]).sort((x, y) => y[1] - x[1]).forEach(([h, p]) => console.log(`${E.HERO[h].name.padEnd(10)} ${(MODE === 'base' ? base(h) : pcd(h)).padEnd(12)} ${p.toFixed(1)}%`));
