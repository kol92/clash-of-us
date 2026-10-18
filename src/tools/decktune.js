// Pakli-hangoló (2026-10-18): node tools/decktune.js HERO 'JSON lista' [N] → lépésenként egy cserével a 47–53% sávba viszi (a régi kezdőpaklik ellen)
const E = require(require('path').join(__dirname, '..', 'engine.js'));
const [H, L, N0] = process.argv.slice(2), N = +N0 || 30; let list = JSON.parse(L);
const STRONG_AH = ['c_ah_laci', 'c_ah_ati', 'c_ah_sasi', 'c_ppvar', 'c_kutya', 'c_ah_barna', 'a_repter', 'a_csend', 'a_trip', 'i_gomba', 'c_ah_bence'];
const WEAK_AH = ['a_suti', 'a_irkave', 'i_cigi', 'c_ah_tomi', 'l_voros', 'a_bong', 'l_coffeeshop', 'a_utcaifust', 'i_lanc', 'a_hawaiians', 'l_elfekvo', 'a_irreggeli', 'c_vizipipa'];
const OLD_STRONG = ['c_vajda', 'a_dinnyes', 'c_pifti', 'c_gyuri'];
const cap = id => E.CARD[id].rarity === 'l' ? 1 : 2, ahN = l => Object.entries(l).reduce((a, [id, n]) => a + (E.CARD[id].set === 'ah' ? n : 0), 0);
const base = Object.keys(E.DECKS).filter(k => !E.DECKS[k].set && E.DECKS[k].hero !== H);
function score(l) { let w = 0, g = 0;
  for (const b of base) for (let k = 0; k < N; k++) {
    const s = E.newGame(H, { ...l }, E.DECKS[b].hero, b, k % 2, { mulligan: true }); E.botMulligan(s, 0); E.botMulligan(s, 1); E.beginGame(s); let t = 0;
    while (s.winner == null && t++ < 200) { let m = 0, c; while (s.winner == null && m++ < 15 && (c = E.botChoose(s))) E.playCard(s, s.active, c.hi, c.t); if (s.winner == null) E.runEndTurn(s); }
    w += s.winner === 0 ? 1 : s.winner === 'draw' ? .5 : 0; g++; }
  return 100 * w / g; }
const swap = (l, out, inn) => { const x = { ...l }; if (!--x[out]) delete x[out]; x[inn] = (x[inn] || 0) + 1; return x; };
const pick = (arr, l, f) => arr.filter(f).sort(() => Math.random() - .5)[0];
let sc = score(list), steps = 0; console.error(H, 'kezdet', sc.toFixed(1));
while ((sc > 53 || sc < 47) && steps++ < 8) {
  let out, inn;
  if (sc > 53) {   // túl erős: régi erős (vagy erős AH) lap ki, gyengébb AH lap be
    out = pick(OLD_STRONG, list, id => list[id]) || pick(STRONG_AH, list, id => list[id] && id !== 'c_ah_bence');
    inn = pick(WEAK_AH, list, id => (list[id] || 0) < cap(id));
  } else {         // túl gyenge: gyenge AH lap ki, erős AH (ha nincs hely: régi erős) be – az AH-arány legalább 13
    out = pick(WEAK_AH, list, id => list[id]) || pick(OLD_STRONG.filter(x => !['c_vajda'].includes(x)), list, id => list[id]);
    inn = pick(STRONG_AH, list, id => (list[id] || 0) < cap(id) && id !== 'c_ah_bence') || pick(OLD_STRONG, list, id => (list[id] || 0) < cap(id));
    if (out && E.CARD[out].set === 'ah' && E.CARD[inn].set !== 'ah' && ahN(list) <= 13) inn = null;
  }
  if (!out || !inn) break;
  const nl = swap(list, out, inn), ns = score(nl);
  console.error(H, `${out} → ${inn}`, ns.toFixed(1));
  if (Math.abs(ns - 50) < Math.abs(sc - 50)) { list = nl; sc = ns; }
}
console.log(JSON.stringify({ hero: H, pct: +sc.toFixed(1), ah: ahN(list), list }));
