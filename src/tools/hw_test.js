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
{ // Álarcos bál: kézcsere, a Kánon esemény marad
  const E2 = E; let f2 = 0; const ok2 = (c, m) => { if (!c) { f2++; console.log('HIBA:', m); } else console.log('ok  ', m); };
  const s = E2.newGame('bence', E2.DECK_OF('bence'), 'gabi', E2.DECK_OF('gabi'), 0); s.active = 0;
  const p = s.players[0], o = s.players[1]; p.energy = p.maxEnergy = 6;
  const fin = E2.CARDS.find(c => c.finisher && c.hero === 'bence') || E2.CARDS.find(c => c.finisher);
  p.hand = [{ uid: 1, id: 'c_pifti' }, { uid: 2, id: fin.id }, { uid: 3, id: 'a_alarc' }];
  o.hand = [{ uid: 11, id: 'c_tzs' }, { uid: 12, id: 'c_vera' }, { uid: 13, id: 'a_cheddar' }, { uid: 14, id: 'c_rebi' }];
  E2.playCard(s, 0, 2, { k: 'none' });
  ok2(p.hand.length === 5 && p.hand.some(c => c.id === fin.id) && p.hand.some(c => c.id === 'c_rebi'), `nálam: a Kánon + az ellenfél 4 lapja (${p.hand.map(c => c.id)})`);
  ok2(o.hand.length === 1 && o.hand[0].id === 'c_pifti', 'az ellenfélnél: az én 1 maradék lapom');
  if (f2) console.log('HIBÁK: ' + f2);
}
{ // Cápa a saját térfeleden: nem a te karaktered (Sasi ütése nem számolja bele, saját-célú lap nem célozhatja)
  const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0);
  const p = s.players[0], o = s.players[1]; p.board = [null, null, null, null]; o.board = [null, null, null, null]; s.active = 0; p.energy = p.maxEnergy = 10;
  p.board[1] = { uid: 501, id: 'c_capa', atk: 9, hp: 9, maxHp: 9, temp: 0, items: [], owner: 1, swims: 4, fresh: false };
  p.hand.unshift({ uid: 9301, id: 'c_vera' }); E.playCard(s, 0, 0, { k: 'slot', side: 0, i: 2 });
  const hp0 = o.hp, atkVera = p.board[2].atk;
  p.hand.unshift({ uid: 9302, id: 'a_sasiutes' }); E.playCard(s, 0, 0, { k: 'hero', side: 1, i: -1 });
  console.log((hp0 - o.hp) === atkVera ? 'ok   Sasi ütése a Cápa nélkül számol' : `HIBA: Sasi ütése ${hp0 - o.hp}, várt ${atkVera}`);
  const T = E.targetsFor(s, 0, 'a_rehab'); console.log(T.some(t => t.k === 'unit' && t.side === 0 && t.i === 1) ? 'HIBA: a Cápa célozható saját lapként' : 'ok   a Cápa nem célozható saját-célú lappal');
}
