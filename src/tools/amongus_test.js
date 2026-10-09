const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const U = (id, x = {}) => ({ uid: Math.floor(Math.random() * 1e9), id, atk: E.CARD[id].atk, hp: E.CARD[id].hp, maxHp: E.CARD[id].hp, items: [], foe: [], temp: 0, ...x });
const hits = {};
for (let k = 0; k < 600; k++) {
  const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.players.forEach(p => { p.energy = 6; p.maxEnergy = 6; p.board = [null, null, null, null]; p.hp = 15; }); s.events = []; s.active = 0;
  s.players[0].board[0] = U('c_vajda'); s.players[1].board[2] = U('c_sasi');
  s.players[0].hand.unshift({ uid: 9999, id: 'a_amongus' });
  E.playCard(s, 0, 0, { k: 'none' });
  const e = s.events.find(x => x.t === 'amongus'); const key = e.side + ':' + e.i; hits[key] = (hits[key] || 0) + 1;
  if (k === 0) {
    const v = s.players[0].board[0], t = s.players[1].board[2];
    ok(e.i === 0 && e.side === 0 ? true : v.atk === 4 && v.hp === 5, "saját Vajda +1/+1"); ok(e.side === 1 && e.i === 2 ? true : t.atk === 4, "ellenséges Toma nem kap buffot");
  }
  const s0 = s.players[0].hp, s1 = s.players[1].hp;
  if (e.i === -1) ok((e.side === 0 ? s0 : s1) === 15 + 2 - 6, 'a paprikás hős: 15+2-6=11 (' + (e.side === 0 ? s0 : s1) + ')');
}
console.log('találatok (oldal:hely):', JSON.stringify(hits));
ok(Object.keys(hits).length === 4, '4 résztvevő (2 karakter + 2 hős), mind kapott paprikát');
console.log(fails ? 'HIBÁK: ' + fails : 'AMONG US OK');
