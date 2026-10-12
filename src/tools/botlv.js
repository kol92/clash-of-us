// node tools/botlv.js A B N  – A szintű bot B szintű ellen (1 Könnyű, 2 Normál, 3 Nehéz), véletlen hősökkel, saját kezdőpaklival
// PATCH env: pl. PATCH='E.BOT_LV[1].noise=3'
const E = require(require('path').join(__dirname, '..', 'engine.js'));
if (process.env.PATCH) eval(process.env.PATCH);
const [A, B, N0] = process.argv.slice(2).map(Number); const N = N0 || 200;
const H = E.HEROES.map(h => h.id), D = h => E.DECK_OF(h);
let w = 0, t0 = Date.now(), turns = 0;
for (let k = 0; k < N; k++) {
  const h0 = H[k % H.length], h1 = H[Math.floor(k / H.length + k) % H.length] === h0 ? H[(k + 1) % H.length] : H[Math.floor(k / H.length + k) % H.length];
  const s = E.newGame(h0, D(h0), h1, D(h1), k % 2, { mulligan: true });
  E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s);
  const lv = [A, B]; let g = 0;
  while (s.winner == null && g++ < 200) { let n = 0, b; while (s.winner == null && n++ < 15 && (b = E.botChoose(s, lv[s.active]))) E.playCard(s, s.active, b.hi, b.t); if (s.winner == null) E.runEndTurn(s); }
  turns += g; w += s.winner === 0 ? 1 : s.winner === 'draw' ? .5 : 0;
}
console.log(`${A} vs ${B}: ${(100 * w / N).toFixed(1)}%  (${N} meccs, ${((Date.now() - t0) / N).toFixed(0)} ms/meccs, ${(turns / N).toFixed(1)} kör)`);
