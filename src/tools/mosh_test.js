// Mosh Pit: forgatás + minden ellenséges karakter 1 sebzést kap (2026-10-15)
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const plain = E.CARDS.filter(c => c.type === 'char' && !c.sneak && !c.token && !c.variantOf && !c.finisher && c.cost <= 4 && !c.text);
const hp1 = E.CARDS.find(c => c.type === 'char' && c.hp === 1 && !c.sneak && !c.token && !c.finisher && c.cost <= 3);
const hp3 = E.CARDS.find(c => c.type === 'char' && c.hp >= 3 && !c.sneak && !c.token && !c.finisher && !c.taunt && c.cost <= 4 && c.id !== hp1.id);
const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.events = [];
const p = s.players[0], o = s.players[1]; p.board = [null, null, null, null]; o.board = [null, null, null, null];
o.energy = o.maxEnergy = 10; s.active = 1;
o.hand.unshift({ uid: 9001, id: hp1.id }); E.playCard(s, 1, 0, { k: 'slot', side: 1, i: 0 });
o.hand.unshift({ uid: 9002, id: hp3.id }); E.playCard(s, 1, 0, { k: 'slot', side: 1, i: 2 });
const hp3before = o.board[2].hp;
s.active = 0; p.energy = p.maxEnergy = 6;
p.hand.unshift({ uid: 9003, id: 'a_moshpit' }); E.playCard(s, 0, 0, { k: 'none' });
ok(!o.board[0] && !o.board[1], `az 1 életű ${hp1.name} meghalt (a sebzéstől)`);
ok(o.board[3] && o.board[3].id === hp3.id, `${hp3.name} a 2. sávból a 3.-ba csúszott`);
ok(o.board[3] && o.board[3].hp === hp3before - 1, `${hp3.name} 1 sebzést kapott (${hp3before} → ${o.board[3] && o.board[3].hp})`);
ok(p.energy === 3, 'a lap 3 manába kerül');
console.log(fails ? 'HIBÁK: ' + fails : 'MOSH OK');
