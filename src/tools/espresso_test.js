const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.events = [];
const p = s.players[0]; p.energy = p.maxEnergy = 3; p.hand.unshift({ uid: 9999, id: 'a_espresso' });
const h0 = p.hand.length; E.playCard(s, 0, 0, { k: 'none' });
ok(p.hand.length === h0 - 1, 'kijátszáskor nem húz');
E.runEndTurn(s);   // ellenfél köre
let m = 0, c; while (s.winner == null && m++ < 15 && (c = E.botChoose(s))) E.playCard(s, s.active, c.hi, c.t);
const h1 = p.hand.length; E.runEndTurn(s);
ok(s.active === 0 && p.hand.length === h1 + 3, 'a következő köre elején 1+2 lapot húz (' + h1 + ' → ' + p.hand.length + ')');
ok(!p.espresso, 'utána lejár');
ok(!E.CARDS.filter(x => x.noParty).some(x => x.id !== 'a_espresso'), 'csak az Espresso noParty');
console.log(fails ? 'HIBÁK: ' + fails : 'ESPRESSO OK');
