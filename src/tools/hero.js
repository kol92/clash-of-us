// node hero.js ENGINE HERO MODE N [decklistJSON]
const [eng, H, mode, N0, L] = process.argv.slice(2); const N = +N0;
const E = require(eng);
function play(h0, d0, h1, d1, first) {
  const s = E.newGame(h0, d0, h1, d1, first, { mulligan: true });
  E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s);
  let guard = 0;
  while (s.winner == null && guard++ < 200) { let n = 0, b; while (s.winner == null && n++ < 15 && (b = E.botChoose(s))) E.playCard(s, s.active, b.hi, b.t); if (s.winner == null) E.runEndTurn(s); }
  return s.winner;
}
const D = Object.keys(E.DECKS), mine = L ? JSON.parse(L) : D.find(d => E.DECKS[d].hero === H);
let w = 0, g = 0;
for (const o of E.HEROES.map(h => h.id)) { if (o === H) continue;
  for (let k = 0; k < N; k++) {
    let r;
    if (mode === 'own') r = play(H, mine, o, D.find(d => E.DECKS[d].hero === o), k % 2);
    else { const d = D[k % D.length]; r = play(H, d, o, d, k % 2); }
    g++; w += r === 0 ? 1 : r === 'draw' ? .5 : 0; } }
console.log(H, mode, (100 * w / g).toFixed(1), g);
