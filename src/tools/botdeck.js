// node tools/botdeck.js LV N [old]  – „játékos” (kezdőpakli, Normál agy) a LV szintű bot ellen; a bot az új szintenkénti paklival (vagy 'old': kezdőpakli)
const path = require('path'), fs = require('fs'); const E = require(path.join(__dirname, '..', 'engine.js'));
const src = fs.readFileSync(path.join(__dirname, '..', 'meta.js'), 'utf8');
const body = src.slice(src.indexOf('// [DECKHELP-START]'), src.indexOf('// [DECKHELP-END]'));
const { botDeckFor } = new Function('CARD', 'CARDS', 'DECKS', 'DECK_SIZE', 'process', body + '; if (process.env.BD) Object.assign(BOT_DECK, JSON.parse(process.env.BD)); return { deckHelperFill, botDeckFor };')(E.CARD, E.CARDS, E.DECKS, 20, process);
const LV = +process.argv[2], N = +process.argv[3] || 300, old = process.argv[4] === 'old';
const H = E.HEROES.map(h => h.id); let w = 0;
for (let k = 0; k < N; k++) {
  const h0 = H[k % H.length]; let h1 = H[(k * 7 + 3 + Math.floor(k / 9)) % H.length]; if (h1 === h0) h1 = H[(H.indexOf(h0) + 1) % H.length];
  const bd = old ? E.DECK_OF(h1) : botDeckFor(h1, LV);
  const s = E.newGame(h0, { ...E.DECKS[Object.keys(E.DECKS).find(d => E.DECKS[d].hero === h0)].list }, h1, bd, k % 2, { mulligan: true });
  if (LV === 4) { s.players[1].hp += 6; s.players[1].maxHp += 6; }
  E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s);
  const lv = [2, LV]; let g = 0;
  while (s.winner == null && g++ < 200) { let n = 0, b; while (s.winner == null && n++ < 15 && (b = E.botChoose(s, lv[s.active]))) E.playCard(s, s.active, b.hi, b.t); if (s.winner == null) E.runEndTurn(s); }
  w += s.winner === 1 ? 1 : s.winner === 'draw' ? .5 : 0;
}
console.log(`bot ${LV}${old ? ' (régi pakli)' : ' (új pakli)'}: a bot nyer ${(100 * w / N).toFixed(1)}%  (${N} meccs)`);
