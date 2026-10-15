// Halloween event lapok: Polaroid emlékek, Tomi Halloweeni bulija (2026-10-15)
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
{ // Polaroid: 5 lap a temetőben → 3 vissza a pakliba
  const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.active = 0;
  const p = s.players[0]; p.energy = p.maxEnergy = 6;
  p.grave = ['c_pifti', 'c_tzs', 'a_cheddar', 'i_buffalo', 'c_vera'].map(id => ({ id, how: 'x', rnd: 1 }));
  const d0 = p.deck.length; p.hand.unshift({ uid: 9001, id: 'a_polaroid' }); E.playCard(s, 0, 0, { k: 'none' });
  ok(p.deck.length === d0 + 3, `5 lapos temetőből 3 került vissza a pakliba (${p.deck.length - d0})`);
  ok(p.grave.length === 3 && p.grave.some(g => g.id === 'a_polaroid'), `a temetőben 2 régi + maga a Polaroid maradt (${p.grave.length})`);
  // üres temető: nem hal el
  const s2 = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s2.active = 0; s2.players[0].energy = 6; s2.players[0].grave = [];
  s2.players[0].hand.unshift({ uid: 9002, id: 'a_polaroid' }); E.playCard(s2, 0, 0, { k: 'none' }); ok(s2.players[0].grave.length === 1, 'üres temetővel is kijátszható');
}
{ // Buli: minden karakter kicserélődik mindkét oldalon
  const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0);
  const p = s.players[0], o = s.players[1]; p.board = [null, null, null, null]; o.board = [null, null, null, null];
  o.energy = o.maxEnergy = 10; s.active = 1;
  o.hand.unshift({ uid: 9101, id: 'c_pifti' }); E.playCard(s, 1, 0, { k: 'slot', side: 1, i: 0 });
  o.hand.unshift({ uid: 9102, id: 'c_tzs' }); E.playCard(s, 1, 0, { k: 'slot', side: 1, i: 3 });
  s.active = 0; p.energy = p.maxEnergy = 10;
  p.hand.unshift({ uid: 9103, id: 'c_vera' }); E.playCard(s, 0, 0, { k: 'slot', side: 0, i: 1 });
  const before = [o.board[0].uid, o.board[3].uid, p.board[1].uid];
  p.hand.unshift({ uid: 9104, id: 'a_hwparty' }); E.playCard(s, 0, 0, { k: 'none' });
  const after = [o.board[0], o.board[3], p.board[1]];
  ok(after.every(Boolean), 'minden sávban maradt karakter');
  ok(after.every((u, k) => u.uid !== before[k]), 'mindegyik új karakter lett');
  ok(after.every(u => E.CARD[u.id].type === 'char' && !E.CARD[u.id].token && !u.hidden), 'mind valódi, felfordított karakter');
  ok(o.grave.some(g => g.id === 'c_pifti') && p.grave.some(g => g.id === 'c_vera'), 'a régiek a gazdájuk temetőjébe kerültek');
  ok(!p.board[0] && !p.board[2], 'üres sávba nem kerül semmi');
}
console.log(fails ? 'HIBÁK: ' + fails : 'HALLOWEEN OK');
