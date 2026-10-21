// Az összetartás átka (2026-10-21): a karakterek a saját eszközeikkel együtt térnek vissza; Bender: Provokációs Árnyékemberek
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const G = (h = 'tomi') => { const s = E.newGame(h, E.DECK_OF(h), 'gabi', E.DECK_OF('gabi'), 0); s.active = 0; for (const p of s.players) { p.board = [null, null, null, null]; p.energy = p.maxEnergy = 30; p.hand = []; p.grave = []; } return s; };
const play = (s, side, id, t) => { const p = s.players[side]; p.energy = 30; p.hand.unshift({ uid: Math.floor(Math.random() * 1e9), id }); const r = E.playCard(s, side, 0, t); return r; };
{ const s = G(), p = s.players[0];
  play(s, 0, 'c_vajda', { k: 'slot', side: 0, i: 0 });
  play(s, 0, 'i_napszemuveg', { k: 'unit', side: 0, i: 0 }); play(s, 0, 'i_borkabat', { k: 'unit', side: 0, i: 0 }); play(s, 0, 'i_gomba', { k: 'unit', side: 0, i: 0 });
  const u = p.board[0]; const before = { atk: u.atk, maxHp: u.maxHp, items: [...u.items] };
  s.players[1].hand.unshift({ uid: 777, id: 'i_buffalo' }); s.active = 1; s.players[1].energy = 30; E.playCard(s, 1, 0, { k: 'unit', side: 0, i: 0 }); s.active = 0;   // ellenséges eszköz is rajta
  u.hp = 0; E.runEndTurn ? null : null; p.board[0].hp = 0; play(s, 0, 'c_gyuri', { k: 'slot', side: 0, i: 3 });   // takarítás
  const g = p.grave.find(x => x.id === 'c_vajda'); ok(g && g.items && g.items.length === 3 && g.gb === 1, `temetőben az eszközei: ${JSON.stringify(g)}`);
  p.grave = p.grave.filter(x => x.id === 'c_vajda' || x.how === 'item');
  play(s, 0, 'f_atok', { k: 'none' });
  const r = p.board.find(x => x && x.id === 'c_vajda');
  ok(r && r.items.length === 3 && !r.items.includes('i_buffalo'), `visszajött a 3 saját eszközzel: ${r && r.items}`);
  ok(r && r.atk >= before.atk && r.maxHp === before.maxHp, `értékek: ${r && r.atk}/${r && r.maxHp} (halál előtt ${before.atk}/${before.maxHp}, + a véletlen erő)`);
  ok(!p.grave.some(x => ['i_napszemuveg', 'i_borkabat', 'i_gomba'].includes(x.id)), 'az eszközök kikerültek a temetőből'); }
{ const s = G('bence'), p = s.players[0]; play(s, 0, 'c_vajda', { k: 'slot', side: 0, i: 1 });
  play(s, 0, 'f_bender', { k: 'none' }); const sh = p.board.filter(x => x && x.id === 'c_arnyek');
  ok(sh.length === 3 && sh.every(x => x.taunt && x.atk === 2 && x.hp === 2), `Bender: 3 Provokációs 2/2-es Árnyékember (${sh.map(x => x.atk + '/' + x.hp + (x.taunt ? 'P' : '')).join(' ')})`); }
console.log(fails ? 'HIBÁK: ' + fails : 'ÁTOK + BENDER OK');
