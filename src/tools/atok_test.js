const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const seen = {};
for (let k = 0; k < 300; k++) {
  const s = E.newGame('tomi', E.DECK_OF('tomi'), 'gabi', E.DECK_OF('gabi'), 0); s.events = [];
  const p = s.players[0]; p.energy = p.maxEnergy = 6; p.board = [null, null, null, null];
  p.grave = [{ id: 'c_vajda' }, { id: 'c_pifti' }];
  p.hand.unshift({ uid: 9999, id: 'f_atok' });
  E.playCard(s, 0, 0, { k: 'none' });
  const us = p.board.filter(Boolean), bs = s.events.filter(e => e.t === 'boon').map(e => e.b);
  if (k === 0) { ok(us.length === 2, 'két karakter visszatért'); ok(us.every(u => u.atk === E.CARD[u.id].atk + 1), '+1/+1'); }
  if (bs.length !== 2 || bs[0] === bs[1]) { ok(false, 'két különböző erő ' + bs); break; }
  for (const u of us) { seen[u.boon] = (seen[u.boon] || 0) + 1;
    const okb = { muscle: u.muscle, invis: u.invis, taunt: u.taunt, shield: u.shield, sneak: u.hidden }[u.boon];
    if (!okb) { ok(false, 'az erő ténylegesen rajta van: ' + u.boon); } }
}
ok(Object.keys(seen).length === 5, 'mind az 5 erő előfordul: ' + JSON.stringify(seen));
// kapott Láthatatlan: a támadás átmegy rajta
const s = E.newGame('tomi', E.DECK_OF('tomi'), 'gabi', E.DECK_OF('gabi'), 0); s.events = []; s.active = 1;
s.players.forEach(p => p.board = [null, null, null, null]);
const mk = (id, x) => Object.assign({ uid: Math.random(), id, atk: E.CARD[id].atk, hp: E.CARD[id].hp, maxHp: E.CARD[id].hp, items: [], temp: 0 }, x);
s.players[0].board[1] = mk('c_vajda', { invis: true }); s.players[1].board[1] = mk('c_pifti', {}); const hp0 = s.players[0].hp;
E.attackLane(s, 1);
ok(s.players[0].hp === hp0 - 2 && s.players[0].board[1].hp === 4, 'kapott Láthatatlan: Pifti átüt rajta a hősbe');
console.log(fails ? 'HIBÁK: ' + fails : 'ATOK OK');
