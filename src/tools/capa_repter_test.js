// Reptéri ellenőrzés a Cápán (2026-10-19): a Cápa átkerül a túloldalra, és azé lesz, aki áttette
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const s = E.newGame('david', E.DECK_OF('david'), 'barna', E.DECK_OF('barna'), 0); s.events = [];
const me = s.players[0], op = s.players[1]; me.board = [null, null, null, null]; op.board = [null, null, null, null];
s.active = 1; op.energy = op.maxEnergy = 10;
op.hand.unshift({ uid: 1, id: 'f_capa' }); E.playCard(s, 1, 0, { k: 'none' });   // Barna Cápája hozzám úszik
const ci = me.board.findIndex(u => u && u.id === 'c_capa');
ok(ci >= 0 && me.board[ci].owner === 1, 'a Cápa nálam úszik (Barnáé)');
s.active = 0; me.energy = me.maxEnergy = 10;
const sw = me.board[ci].swims;
const T = E.targetsFor(s, 0, 'a_repter');
ok(T.some(t => t.side === 0 && t.i === ci), 'a Reptéri ellenőrzés célozhatja a Cápát');
const t = T.find(t => t.side === 0 && t.i === ci);
me.hand.unshift({ uid: 2, id: 'a_repter' }); E.playCard(s, 0, 0, t);
const nj = op.board.findIndex(u => u && u.id === 'c_capa');
ok(!me.board.some(u => u && u.id === 'c_capa') && nj >= 0, 'a Cápa átkerült Barna oldalára');
ok(op.board[nj].owner === 0 && op.board[nj].swims === sw, 'mostantól az enyém, a hátralévő úszásai megmaradtak');
// Barna lerak egy karaktert, a következő körömben a cápa felé úszik és megeszi
op.board[(nj + 1) % 4] = null; s.active = 1; op.energy = 10; op.hand.unshift({ uid: 3, id: 'c_vajda' });
const k = nj === 3 ? 2 : nj + 1; E.playCard(s, 1, 0, { k: 'slot', side: 1, i: k });
E.runEndTurn(s); // Barna köre vége -> az én köröm eleje: a cápa úszik
ok(!op.board.some(u => u && u.id === 'c_vajda'), 'a köröm elején a Cápa megette Barna Vajdáját');
console.log(fails ? 'HIBÁK: ' + fails : 'CÁPA + REPTÉR OK');
