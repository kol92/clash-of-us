const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
for (const withBunda of [false, true]) {
  const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.events = []; s.active = 0;
  const p = s.players[0]; p.energy = p.maxEnergy = 6; p.board = [null, null, null, null]; s.players[1].board = [null, null, null, null];
  p.hand.unshift({ uid: 9001, id: 'c_zoli' }); E.playCard(s, 0, 0, { k: 'slot', side: 0, i: 1 });
  if (withBunda) { p.hand.unshift({ uid: 9002, id: 'i_bunda' }); E.playCard(s, 0, 0, { k: 'unit', side: 0, i: 1 }); ok(p.board[1].shield, 'bundában Gál Zoli Pajzsot kap'); }
  E.attackLane(s, 1);
  ok(withBunda ? !!p.board[1] : !p.board[1], withBunda ? 'bundában Gál Zoli támadás után is életben marad' : 'bunda nélkül Gál Zoli elpusztul');
}
console.log(fails ? 'HIBÁK: ' + fails : 'BUNDA OK');
