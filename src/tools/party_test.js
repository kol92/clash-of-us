// Tomi, a parti lelke (2026-10-18): jó italok a saját oldalra, pusztítók az ellenségre; gyógyítás a legsérültebbnek
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } };
const GOOD = ['i_energiaital', 'i_vodkakancso', 'i_vodkasa', 'a_mangos', 'a_rehab'], HEAL = ['a_mangos', 'a_rehab'];
const seen = {};
for (let k = 0; k < 3000; k++) {
  const s = E.newGame('tomi', E.DECK_OF('tomi'), 'gabi', E.DECK_OF('gabi'), 0); s.events = []; s.active = 0;
  const me = s.players[0], op = s.players[1];
  me.energy = me.maxEnergy = 10; me.board = [null, null, null, null]; op.board = [null, null, null, null];
  const ids = ['c_vajda', 'c_gyuri', 'c_rebi', 'c_veghtomi'];
  for (const [p, side] of [[me, 0], [op, 1]]) for (let i = 0; i < 4; i++) if (Math.random() < .6 && !(side === 0 && i === 0)) {
    p.hand.unshift({ uid: 5000 + k * 10 + i + side * 5, id: ids[i] }); const sa = s.active; s.active = side; p.energy = 10; E.playCard(s, side, 0, { k: 'slot', side, i }); s.active = sa;
    if (Math.random() < .5) p.board[i].hp = Math.max(1, p.board[i].hp - 1 - Math.floor(Math.random() * 3)); }
  if (Math.random() < .5) me.hp = 10 + Math.floor(Math.random() * 10);
  const before = me.board.map(u => u && u.hp), heroHp = me.hp, maxHp = me.maxHp;
  s.events = []; me.hand.unshift({ uid: 99999, id: 'c_tomiparti' }); E.playCard(s, 0, 0, { k: 'slot', side: 0, i: 0 });
  const e = s.events.find(x => x.t === 'party'); if (!e) { ok(false, 'nincs party esemény'); continue; }
  seen[e.id] = (seen[e.id] || 0) + 1;
  if (e.id === 'a_adios') ok(e.ti === -1 && op.locked && !op.board.some(u => u && u.stun), 'Adios: az ellenfél hősét bénítja, nem karaktert');
  const good = GOOD.includes(e.id) || (e.id === 'a_koktel' && e.o === 'buff');
  ok(e.ts === (good ? 0 : 1), `${e.id}${e.o ? '/' + e.o : ''}: rossz oldal (${e.ts})`);
  if (HEAL.includes(e.id)) {
    const dmg = before.map((h, i) => h != null && i !== 0 && h < me.board[i]?.maxHp ? h : null);
    const opts = dmg.map((h, i) => h != null ? h : Infinity); if (heroHp < maxHp) opts.push(heroHp);
    const min = Math.min(...opts), got = e.hero ? heroHp : before[e.ti];
    ok(isFinite(min) ? got === min : e.hero, `${e.id}: nem a legsérültebbet gyógyította (kapta: ${got}, legkisebb: ${min})`);
  }
}
console.log('italok:', JSON.stringify(seen));
console.log(fails ? 'HIBÁK: ' + fails : 'PARTI LELKE OK');
// Akuma az ellenségen (2026-10-19): még a parti lelke körének végén meghal – a gazdája nem üthet vele
{ let n = 0, bad = 0;
  for (let k = 0; k < 4000 && n < 30; k++) {
    const s = E.newGame('tomi', E.DECK_OF('tomi'), 'gabi', E.DECK_OF('gabi'), 0); s.active = 0;
    const me = s.players[0], op = s.players[1]; me.energy = me.maxEnergy = 10; me.board = [null, null, null, null]; op.board = [null, null, null, null];
    s.active = 1; op.energy = 10; op.hand.unshift({ uid: 70000 + k, id: 'c_vajda' }); E.playCard(s, 1, 0, { k: 'slot', side: 1, i: 2 }); s.active = 0;
    s.events = []; me.hand.unshift({ uid: 99999, id: 'c_tomiparti' }); E.playCard(s, 0, 0, { k: 'slot', side: 0, i: 0 });
    const e = s.events.find(x => x.t === 'party'); if (!e || e.id !== 'i_akuma') continue; n++;
    const u = op.board[2]; if (!u || u.doomFoe !== 0) bad++;
    E.runEndTurn(s); if (op.board[2]) bad++; }
  ok(n > 0 && !bad, `Akuma ellenségen: ${n} eset, ${bad} hiba`); console.log('Akuma ellenségen:', n, 'eset, hibás:', bad); }
console.log(fails ? 'HIBÁK: ' + fails : 'AKUMA OK');
