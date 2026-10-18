// Vodkása (2026-10-18): eszköz, 1 energia, gyakori; Igézhetetlen; TZS-en: nincs önsebzés + Pajzs
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
function G() { const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.events = []; for (const p of s.players) { p.board = [null, null, null, null]; p.energy = p.maxEnergy = 10; } s.active = 0; return s; }
const put = (s, pi, id, i) => { const p = s.players[pi]; p.hand.unshift({ uid: 9000 + Math.random(), id }); E.playCard(s, pi, 0, { k: 'slot', side: pi, i }); return p.board[i]; };
const item = (s, pi, id, side, i) => { const p = s.players[pi]; p.hand.unshift({ uid: 9500 + Math.random(), id }); return E.playCard(s, pi, 0, { k: 'unit', side, i }); };
const c = E.CARD.i_vodkasa;
ok(c && c.type === 'item' && c.cost === 1 && c.rarity === 'k' && c.drink && !c.set, 'lap: eszköz (ital), 1 energia, gyakori, Base set');
{ const s = G(); const u = put(s, 0, 'c_vajda', 0); const e0 = s.players[0].energy;
  item(s, 0, 'i_vodkasa', 0, 0);
  ok(s.players[0].energy === e0 - 1, '1 energia');
  ok(u.elusive && u.atk === 3 && !u.shield, 'Vajda: Igézhetetlen lett, statja nem változott, Pajzs nincs');
  // ellenfél akcióval nem célozhatja
  E.runEndTurn(s); const o = s.players[1]; o.energy = o.maxEnergy = 10; o.hand.unshift({ uid: 9700, id: 'a_abszint' });
  const tg = E.targetsFor(s, 1, 'a_abszint');
  ok(Array.isArray(tg) && !tg.some(t => t.side === 0 && t.i === 0), 'az ellenfél Abszintja nem célozhatja');
}
{ const s = G(); const u = put(s, 0, 'c_tzs', 1); item(s, 0, 'i_vodkasa', 0, 1);
  ok(u.elusive && u.shield, 'TZS: Igézhetetlen + Pajzs');
  ok(s.events.some(e => e.t === 'boon' && e.b === 'shield'), 'esemény: boon shield');
  u.fresh = false; u.sleep = false; delete u.haste; const hp0 = s.players[0].hp;
  E.runEndTurn(s);   // a mi körünk vége: TZS támad
  ok(s.players[0].hp === hp0, 'TZS támadáskor nem sebzi a saját hősét (' + hp0 + ' → ' + s.players[0].hp + ')');
}
{ const s = G(); const u = put(s, 0, 'c_tzs', 1); u.fresh = false; u.sleep = false; const hp0 = s.players[0].hp; E.runEndTurn(s);
  ok(s.players[0].hp === hp0 - 1, 'Vodkása nélkül TZS továbbra is 1-et sebez a saját hősén'); }
// STOP leszedi → az igézhetetlenség is megszűnik
{ const s = G(); const u = put(s, 0, 'c_vajda', 0); item(s, 0, 'i_vodkasa', 0, 0); E.runEndTurn(s);
  const o = s.players[1]; o.energy = o.maxEnergy = 10; o.hand.unshift({ uid: 9800, id: 'a_stop' }); E.playCard(s, 1, 0, { k: 'none' }); E.runEndTurn(s);
  ok(!(u.items || []).includes('i_vodkasa') && !u.elusive, 'STOP után az eszköz lekerül, már nem Igézhetetlen'); }
// gyűjtés
ok(E.CARDS.filter(x => x.id === 'i_vodkasa').length === 1, 'egyetlen lap');
console.log(fails ? 'HIBÁK: ' + fails : 'VODKÁSA OK');
