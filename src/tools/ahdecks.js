// Amsterdam kezdőpaklik mérése (2026-10-18): node tools/ahdecks.js N [hero1,hero2…]
// Minden Amsterdam-pakli a többi hős régi kezdőpaklija ellen („vs régi”) és a többi Amsterdam-pakli ellen („vs AH”), N meccs párosonként.
const E = require(require('path').join(__dirname, '..', 'engine.js'));
const N = +process.argv[2] || 40, only = process.argv[3] ? process.argv[3].split(',') : null;
const K = Object.keys(E.DECKS), base = K.filter(k => !E.DECKS[k].set), ah = K.filter(k => E.DECKS[k].set === 'ah');
function play(a, b, first) {
  const s = E.newGame(E.DECKS[a].hero, a, E.DECKS[b].hero, b, first, { mulligan: true });
  E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s); let g = 0;
  while (s.winner == null && g++ < 200) { let n = 0, c; while (s.winner == null && n++ < 15 && (c = E.botChoose(s))) E.playCard(s, s.active, c.hi, c.t); if (s.winner == null) E.runEndTurn(s); }
  return s.winner === 0 ? 1 : s.winner === 'draw' ? .5 : 0;
}
for (const a of ah) { if (only && !only.includes(E.DECKS[a].hero)) continue;
  let wb = 0, nb = 0, wa = 0, na = 0;
  for (const b of base) { if (E.DECKS[b].hero === E.DECKS[a].hero) continue; for (let k = 0; k < N; k++) { wb += play(a, b, k % 2); nb++; } }
  for (const b of ah) { if (b === a) continue; for (let k = 0; k < Math.ceil(N / 2); k++) { wa += play(a, b, k % 2); na++; } }
  console.log(`${E.DECKS[a].hero.padEnd(6)} ${E.DECKS[a].name.padEnd(20)} vs régi ${(100 * wb / nb).toFixed(1)}%  vs AH ${(100 * wa / na).toFixed(1)}%  (${nb}+${na})`);
}
