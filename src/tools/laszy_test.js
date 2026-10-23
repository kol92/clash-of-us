// Laszy (10. hős) – Vad buli és a Kánonja: Csövesek és Cigányok (Szolgák: Provokáció, eszközlopás)
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const G = () => { const s = E.newGame('laszy', E.DECK_OF('laszy'), 'tomi', E.DECK_OF('tomi'), 0); s.active = 0; for (const p of s.players) { p.board = [null, null, null, null]; p.hand = []; p.energy = p.maxEnergy = 30; } return s; };
const play = (s, side, id, t) => { const p = s.players[side], a = s.active; s.active = side; p.energy = 30; p.hand.unshift({ uid: Math.floor(Math.random() * 1e9), id }); const r = E.playCard(s, side, 0, t); s.active = a; return r; };
{ const s = G(); play(s, 0, 'f_csoves', { k: 'none' }); const sz = s.players[0].board.filter(u => u && /c_szolga/.test(u.id));
  ok(sz.length === 3 && sz.every(u => u.atk === 2 && u.hp === 1 && E.CARD[u.id].taunt), 'Kánon: 3 Szolga, 2/1, Provokáció'); }
{ const s = G(); s.players[0].board[3] = null; play(s, 0, 'c_vajda', { k: 'slot', side: 0, i: 0 }); play(s, 0, 'f_csoves', { k: 'none' });
  ok(s.players[0].board.filter(u => u && /c_szolga/.test(u.id)).length === 3, 'Kánon: 3 szabad hely → 3 Szolga'); }
{ const s = G(); const sz0 = E.CARDS.find(c => c.id === 'c_szolga1');
  play(s, 0, 'f_csoves', { k: 'none' });
  play(s, 1, 'c_vajda', { k: 'slot', side: 1, i: 0 }); play(s, 1, 'i_napszemuveg', { k: 'unit', side: 1, i: 0 }); play(s, 1, 'i_borkabat', { k: 'unit', side: 1, i: 0 }); play(s, 1, 'i_gomba', { k: 'unit', side: 1, i: 0 });
  const v = s.players[1].board[0]; v.fresh = false; const vb = { atk: v.atk, maxHp: v.maxHp };
  s.active = 1; s.events = []; E.runEndTurn(s);
  const st = s.events.find(e => e.t === 'itemsteal'), x = st && s.players[0].board[st.i];
  ok(!!st && st.ids.length === 3, `lopás: ${st && st.ids}`);
  ok(v.items.length === 0 && v.atk === 3 && v.maxHp === 4, `Vajda az eszközei nélkül: ${v.atk}/${v.maxHp} (előtte ${vb.atk}/${vb.maxHp})`);
  ok(x && x.items.length === 3, `a Szolgán: ${x && x.items} ${x && x.atk}/${x && x.maxHp}`); }
console.log(fails ? 'HIBÁK: ' + fails : 'LASZY OK');
