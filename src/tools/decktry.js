// gyors pakli-próba: node tools/decktry.js HERO 'JSON lista' N  → nyerési % a többi hős régi kezdőpaklija ellen
const E = require(require('path').join(__dirname, '..', 'engine.js'));
const [H, L, N0] = process.argv.slice(2), N = +N0 || 30, list = JSON.parse(L);
const n = Object.values(list).reduce((a, b) => a + b, 0); if (n !== 20) { console.log('NEM 20 LAP:', n); process.exit(1); }
const base = Object.keys(E.DECKS).filter(k => !E.DECKS[k].set && E.DECKS[k].hero !== H);
let w = 0, g = 0;
for (const b of base) for (let k = 0; k < N; k++) {
  const s = E.newGame(H, { ...list }, E.DECKS[b].hero, b, k % 2, { mulligan: true }); E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s); let t = 0;
  while (s.winner == null && t++ < 200) { let m = 0, c; while (s.winner == null && m++ < 15 && (c = E.botChoose(s))) E.playCard(s, s.active, c.hi, c.t); if (s.winner == null) E.runEndTurn(s); }
  w += s.winner === 0 ? 1 : s.winner === 'draw' ? .5 : 0; g++; }
console.log(H, (100 * w / g).toFixed(1) + '%', g, process.env.TAG || '');
