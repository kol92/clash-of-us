// Peaches and Cream – „Éjfél után” karakterek (2026-10-24, teszt ág)
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const G = (h = 'tomi', half = 15) => { const s = E.newGame(h, E.DECK_OF(h === 'laszy' ? 'laszy' : 'tomi'), 'gabi', E.DECK_OF('gabi'), 0); s.active = 0; s.half = half; for (const p of s.players) { p.board = [null, null, null, null]; p.hand = []; p.energy = p.maxEnergy = 30; } return s; };
const play = (s, side, id, t) => { const p = s.players[side], a = s.active; s.active = side; p.energy = 30; p.hand.unshift({ uid: Math.floor(Math.random() * 1e9), id }); const r = E.playCard(s, side, 0, t); s.active = a; return r; };
const B = s => s.players[0].board;
{ const s = G('tomi', 5); play(s, 0, 'c_pc_barna', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].atk === 1 && !B(s)[0].midOn, 'éjfél előtt: Barna 1/2');
  s.half = 14; s.active = 0; E.runEndTurn(s); s.active = 1; E.runEndTurn(s);   /* → a 0. játékos 8. köre */
  ok(E.isMidnight(s) && B(s)[0] && B(s)[0].atk === 3 && B(s)[0].maxHp === 4, `éjfélkor bekapcsol: Barna ${B(s)[0] && B(s)[0].atk}/${B(s)[0] && B(s)[0].maxHp}`); }
{ const s = G(); play(s, 0, 'c_pc_barna', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].atk === 3 && B(s)[0].hp === 4, 'éjfél után kijátszva: +2/+2'); }
{ const s = G('laszy'); play(s, 0, 'c_pc_barna', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].atk === 4 && B(s)[0].hp === 5, 'Laszy hősnél +1: Barna 4/5'); }
{ const s = G(); play(s, 0, 'c_pc_david', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].atk === 6 && B(s)[0].hp === 6, 'Dávid +4/+3'); }
{ const s = G(); play(s, 0, 'c_pc_krisz', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].haste && B(s)[0].muscle, 'Krisz: Lendület + Izom'); }
{ const s = G(); play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 0 }); play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 2 }); play(s, 0, 'c_pc_sasi', { k: 'slot', side: 0, i: 1 });
  ok(B(s)[0].atk === 4 && B(s)[2].atk === 4 && B(s)[1].atk === 2, 'Sasi: a szomszédok +2/+2'); }
{ const s = G(); play(s, 0, 'c_pc_tomi', { k: 'slot', side: 0, i: 0 }); ok(B(s)[1] && B(s)[1].id === 'c_belvedere', 'Tomi: Belvedere mellé');
  play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 2 }); ok(E.effAtk(s, 0, 2) === 4 && E.effAtk(s, 0, 0) === 4, 'Belvedere: a mellette állók +2 támadás'); }
{ const s = G(); play(s, 1, 'c_vajda', { k: 'slot', side: 1, i: 2 }); play(s, 0, 'c_pc_boros', { k: 'slot', side: 0, i: 0 });
  ok(!s.players[1].board[2] && s.players[1].hand.some(h => h.id === 'c_vajda') && B(s)[0].atk === 4, 'Boros: +2/+2 és kidobja Vajdát a kezébe'); }
{ const s = G(); play(s, 0, 'c_pc_laszy', { k: 'slot', side: 0, i: 0 }); ok(s.players[0].hand.some(h => h.id === 'a_kalinka') && B(s)[0].atk === 7 && B(s)[0].hp === 6, 'Laszy: Kalinka a kézbe, +6/+3');
  play(s, 0, 'a_kalinka', { k: 'unit', side: 0, i: 0 }); ok(B(s)[0].atk === 8, 'Kalinka +1/+1');
  let own = 0; for (let k = 0; k < 400; k++) { const t = G(); play(t, 0, 'c_pc_laszy', { k: 'slot', side: 0, i: 0 }); B(t)[0].fresh = false; const h = t.players[0].hp; t.events = []; E.runEndTurn(t); if (t.players[0].hp < h) own++; }
  ok(own > 150 && own < 250, `Laszy: ~50% a saját hős (${own}/400)`); }
{ const s = G(); play(s, 1, 'c_vajda', { k: 'slot', side: 1, i: 1 }); play(s, 1, 'c_gyuri', { k: 'slot', side: 1, i: 3 }); play(s, 0, 'c_pc_zoli', { k: 'slot', side: 0, i: 0 }); B(s)[0].fresh = false; B(s)[0].hp = 2;
  E.runEndTurn(s); ok(!B(s)[0] && s.players[1].board[1].hp === 1 && !s.players[1].board[3], `Zoli: magát üti, meghal, 3 sebzés minden ellenségnek (Vajda ${s.players[1].board[1] && s.players[1].board[1].hp})`); }
console.log(fails ? 'HIBÁK: ' + fails : 'PEACHES OK');
