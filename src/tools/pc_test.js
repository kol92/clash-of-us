// Peaches and Cream – „Éjfél után” karakterek (2026-10-24, teszt ág)
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const G = (h = 'tomi', half = 11) => { const s = E.newGame(h, E.DECK_OF(h === 'laszy' ? 'laszy' : 'tomi'), 'gabi', E.DECK_OF('gabi'), 0); s.active = 0; s.half = half; for (const p of s.players) { p.board = [null, null, null, null]; p.hand = []; p.energy = p.maxEnergy = 30; } return s; };
const play = (s, side, id, t) => { const p = s.players[side], a = s.active; s.active = side; p.energy = 30; p.hand.unshift({ uid: Math.floor(Math.random() * 1e9), id }); const r = E.playCard(s, side, 0, t); s.active = a; return r; };
const B = s => s.players[0].board;
{ const s = G('tomi', 5); play(s, 0, 'c_pc_barna', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].atk === 1 && !B(s)[0].midOn, 'éjfél előtt: Barna 1/2');
  s.half = 9; s.active = 0; E.runEndTurn(s); s.active = 1; E.runEndTurn(s);   /* → a 0. játékos 6. köre */
  ok(E.isMidnight(s) && B(s)[0] && B(s)[0].atk === 3 && B(s)[0].maxHp === 4, `éjfélkor bekapcsol: Barna ${B(s)[0] && B(s)[0].atk}/${B(s)[0] && B(s)[0].maxHp}`); }
{ const s = G(); play(s, 0, 'c_pc_barna', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].atk === 3 && B(s)[0].hp === 4, 'éjfél után kijátszva: +2/+2'); }
{ const s = G('laszy'); play(s, 0, 'c_pc_barna', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].atk === 4 && B(s)[0].hp === 5, 'Laszy hősnél +1: Barna 4/5'); }
{ const s = G(); play(s, 0, 'c_pc_david', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].atk === 6 && B(s)[0].hp === 6, 'Dávid +4/+3'); }
{ const s = G(); play(s, 0, 'c_pc_krisz', { k: 'slot', side: 0, i: 0 }); ok(B(s)[0].haste && B(s)[0].muscle, 'Krisz: Lendület + Izom'); }
{ const s = G(); play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 0 }); play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 2 }); play(s, 0, 'c_pc_sasi', { k: 'slot', side: 0, i: 1 });
  ok(B(s)[0].atk === 4 && B(s)[2].atk === 4 && B(s)[1].atk === 2, 'Sasi: a szomszédok +2/+2'); }
{ const s = G(); play(s, 0, 'c_pc_tomi', { k: 'slot', side: 0, i: 0 }); ok(B(s)[1] && B(s)[1].id === 'c_belvedere', 'Tomi: Belvedere mellé');
  play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 2 }); s.active = 0; E.runEndTurn(s);
  ok(B(s)[2] && B(s)[2].maxHp === 3 && B(s)[0].maxHp === 5 && B(s)[1].hp >= 9, `Belvedere: a köröd végén a szomszédai +1/+1 (Gyuri ${B(s)[2] && B(s)[2].atk}/${B(s)[2] && B(s)[2].maxHp}, Tomi ${B(s)[0].atk}/${B(s)[0].maxHp})`); }
{ const s = G(); play(s, 0, 'c_belvedere', { k: 'slot', side: 0, i: 1 }); ok(B(s)[1].hp === 10 && E.CARD.c_belvedere.cost === 4, 'Belvedere: kijátszható lap, 0/10'); }
{ const s = G(); play(s, 1, 'c_vajda', { k: 'slot', side: 1, i: 2 }); play(s, 0, 'c_pc_boros', { k: 'slot', side: 0, i: 0 });
  ok(!s.players[1].board[2] && s.players[1].hand.some(h => h.id === 'c_vajda') && B(s)[0].atk === 4, 'Boros: +2/+2 és kidobja Vajdát a kezébe'); }
{ const s = G(); play(s, 0, 'c_pc_laszy', { k: 'slot', side: 0, i: 0 }); ok(s.players[0].hand.some(h => h.id === 'a_kalinka') && B(s)[0].atk === 7 && B(s)[0].hp === 6, 'Laszy: Kalinka a kézbe, +6/+3');
  play(s, 0, 'a_kalinka', { k: 'unit', side: 0, i: 0 }); ok(B(s)[0].atk === 9 && B(s)[0].haste, 'Kalinka Laszy, éjfél utánon: +2/+2 és Lendület');
  let own = 0; for (let k = 0; k < 400; k++) { const t = G(); play(t, 0, 'c_pc_laszy', { k: 'slot', side: 0, i: 0 }); B(t)[0].fresh = false; const h = t.players[0].hp; t.events = []; E.runEndTurn(t); if (t.players[0].hp < h) own++; }
  ok(own > 150 && own < 250, `Laszy: ~50% a saját hős (${own}/400)`); }
{ const s = G(); play(s, 1, 'c_vajda', { k: 'slot', side: 1, i: 1 }); play(s, 1, 'c_gyuri', { k: 'slot', side: 1, i: 3 }); play(s, 0, 'c_pc_zoli', { k: 'slot', side: 0, i: 0 }); B(s)[0].fresh = false; B(s)[0].hp = 2;
  E.runEndTurn(s); ok(!B(s)[0] && s.players[1].board[1].hp === 1 && !s.players[1].board[3], `Zoli: magát üti, meghal, 3 sebzés minden ellenségnek (Vajda ${s.players[1].board[1] && s.players[1].board[1].hp})`); }
{ const s = G(); play(s, 0, 'c_wcneni', { k: 'slot', side: 0, i: 2 }); play(s, 1, 'c_gyuri', { k: 'slot', side: 1, i: 0 }); s.players[1].board[0].fresh = false;
  s.active = 1; E.runEndTurn(s); const p = s.players[0];
  ok(B(s)[2] && B(s)[2].id === 'c_portas' && B(s)[2].atk === 5 && p.hand.some(h => h.id === 'c_wcneni'), 'WC-s néni: Provokáció, megütik → kézbe, helyén 5/5 Portás');
  const t = G(); play(t, 0, 'c_wcneni', { k: 'slot', side: 0, i: 1 }); play(t, 1, 'a_abszint', { k: 'unit', side: 0, i: 1 });
  ok(!t.players[0].board[1] && !t.players[0].hand.some(h => h.id === 'c_wcneni'), 'WC-s néni: ha a sebzés megöli, nincs visszaugrás'); }
// 2026-10-24: italok, Purple Card, Ruhatár
{ const s = G('tomi', 3); play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 0 }); play(s, 0, 'a_jager', { k: 'unit', side: 0, i: 0 }); ok(B(s)[0].atk === 4 && !B(s)[0].haste, 'Jäger éjfél előtt +2/+2');
  const t = G(); play(t, 0, 'c_gyuri', { k: 'slot', side: 0, i: 0 }); play(t, 0, 'a_jager', { k: 'unit', side: 0, i: 0 }); ok(B(t)[0].atk === 5 && B(t)[0].haste, 'Jäger éjfél után +3/+3 + Lendület'); }
{ const s = G(); play(s, 0, 'c_laszy', { k: 'slot', side: 0, i: 0 }); play(s, 0, 'a_kalinka', { k: 'unit', side: 0, i: 0 }); ok(B(s)[0].atk === 8 && B(s)[0].haste, 'Kalinka Laszyn: +2/+2 és Lendület');
  play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 1 }); play(s, 0, 'a_kalinka', { k: 'unit', side: 0, i: 1 }); ok(B(s)[1].atk === 3, 'Kalinka másnak: +1/+1 (' + B(s).map(u => u && u.id + ':' + u.atk) + ')'); }
{ const s = G(); s.players[0].turnCards = 0; const h = s.players[0].hand.length; play(s, 0, 'a_lambo', { k: 'none' }); ok(s.players[0].energy === 30, `Lamborghini első lapként: +1 energia (30-1+1=${s.players[0].energy}) és húzás`); }
{ const s = G(); play(s, 1, 'c_gyuri', { k: 'slot', side: 1, i: 2 }); s.players[0].hp = 10; play(s, 0, 'a_bloody', { k: 'unit', side: 1, i: 2 }); ok(!s.players[1].board[2] && s.players[0].hp === 13, 'Bloody Mary: megöli → +3 élet'); }
{ const s = G(); s.players[0].charThisTurn = false; play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 0 }); s.players[0].charThisTurn = false; play(s, 0, 'a_pezsgo', { k: 'none' });
  ok(B(s)[0].maxHp === 3 && s.players[0].nextCharDisc === 1 && E.cardCost(s, 0, 'c_vajda') === 2, 'Pezsgő: +1 élet, a következő karakter olcsóbb'); }
{ const s = G(); play(s, 1, 'c_gyuri', { k: 'slot', side: 1, i: 0 }); play(s, 1, 'i_purple', { k: 'unit', side: 1, i: 0 }); play(s, 0, 'c_pc_boros', { k: 'slot', side: 0, i: 0 });
  ok(s.players[1].board[0] && s.players[1].board[0].haste, 'Purple Card: nem dobható ki (Boros)'); }
{ const s = G(); play(s, 0, 'c_vajda', { k: 'slot', side: 0, i: 0 }); play(s, 0, 'i_napszemuveg', { k: 'unit', side: 0, i: 0 }); s.players[0].hand = [];
  play(s, 0, 'a_ruhatar', { k: 'unit', side: 0, i: 0, o: 0 }); const h = s.players[0].hand, v = h.find(x => x.id === 'c_vajda');
  ok(!B(s)[0] && v && v.disc === 1 && h.some(x => x.id === 'i_napszemuveg') && E.cardCost(s, 0, 'c_vajda', v) === 2, 'Ruhatár leadás: karakter + eszköz a kézbe, 1-gyel olcsóbb');
  const t = G(); t.players[0].grave = [{ id: 'c_gyuri', how: 'death' }, { id: 'a_dinnyes', how: 'action' }]; play(t, 0, 'c_pifti', { k: 'slot', side: 0, i: 0 }); t.players[0].hand = [];
  play(t, 0, 'a_ruhatar', { k: 'unit', side: 0, i: 0, o: 1 }); ok(t.players[0].hand.some(x => x.id === 'c_gyuri') && B(t)[0], 'Ruhatár kiváltás: a halott karakter a kézbe'); }
{ const s = G(); play(s, 1, 'c_vajda', { k: 'slot', side: 1, i: 1 }); play(s, 0, 'c_portas', { k: 'slot', side: 0, i: 0 });
  ok(!s.players[1].board[1] && s.players[1].hand.some(h => h.id === 'c_vajda'), 'Portás kézből: kidob egy ellenséget');
  const v = s.players[1].hand.find(h => h.id === 'c_vajda'); ok(v.kickN === 1 && E.cardCost(s, 1, 'c_vajda', v) === 4, 'kidobott lap 1-gyel drágább');
  play(s, 1, 'c_vajda', { k: 'slot', side: 1, i: 3 }); s.players[1].hand = s.players[1].hand.filter(h => h !== v); s.players[1].hand.unshift({ ...v, uid: 1234 }); s.players[1].hand.shift();
  { const s2 = G(); play(s2, 1, 'c_vajda', { k: 'slot', side: 1, i: 1 }); play(s2, 0, 'c_portas', { k: 'slot', side: 0, i: 0 }); const h1 = s2.players[1].hand.find(h => h.id === 'c_vajda');
    s2.active = 1; s2.players[1].energy = 30; const hi = s2.players[1].hand.indexOf(h1); E.playCard(s2, 1, hi, { k: 'slot', side: 1, i: 2 }); s2.active = 0; s2.players[0].board[0] = null;
    play(s2, 0, 'c_portas', { k: 'slot', side: 0, i: 0 }); const h2 = s2.players[1].hand.find(h => h.id === 'c_vajda'); ok(h2 && h2.kickN === 2 && E.cardCost(s2, 1, 'c_vajda', h2) === 5, 'másodszor kidobva 2-vel drágább'); }
  const t = G(); play(t, 1, 'c_vajda', { k: 'slot', side: 1, i: 1 }); play(t, 0, 'c_wcneni', { k: 'slot', side: 0, i: 2 }); play(t, 1, 'c_gyuri', { k: 'slot', side: 1, i: 0 }); t.players[1].board[0].fresh = false; t.active = 1; E.runEndTurn(t);
  ok(t.players[0].board[2] && t.players[0].board[2].id === 'c_portas' && t.players[1].board[1], 'a WC-s néni Portása nem dob ki'); }
console.log(fails ? 'HIBÁK: ' + fails : 'PEACHES 2 OK');
