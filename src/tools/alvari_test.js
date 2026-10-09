const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const U = (id, x = {}) => ({ uid: Math.floor(Math.random() * 1e9), id, atk: E.CARD[id].atk, hp: E.CARD[id].hp, maxHp: E.CARD[id].hp, items: [], foe: [], temp: 0, ...x });
function G() { const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.players.forEach(p => { p.energy = 6; p.maxEnergy = 6; p.board = [null, null, null, null]; }); s.events = []; s.active = 0; return s; }
// Roli támad: a szemközti karakter sebződik, Roli nem kap visszaütést
let s = G(); s.players[0].board[1] = U('c_alvari', { owner: 0 }); s.players[1].board[1] = U('c_vajda', { owner: 1 });
E.attackLane(s, 1);
ok(s.players[1].board[1].hp === 3, 'Vajda 1-et sebződött (' + s.players[1].board[1].hp + ')');
ok(s.players[0].board[1]?.hp === 1, 'Roli nem kapott visszaütést');
// Roli ellen támadnak: átmegy rajta, a hős sebződik
s = G(); s.active = 1; s.players[0].board[1] = U('c_alvari', { owner: 0 }); s.players[1].board[1] = U('c_vajda', { owner: 1 }); const hp0 = s.players[0].hp;
E.attackLane(s, 1);
ok(s.players[0].board[1]?.hp === 1, 'Roli sértetlen');
ok(s.players[0].hp === hp0 - 3, 'a támadás átment, a hős kapta (' + hp0 + ' → ' + s.players[0].hp + ')');
console.log(fails ? 'HIBÁK: ' + fails : 'ROLI OK');
