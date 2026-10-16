// Laci cipőkanala (2026-10-16): a karakter, akin rajta van, a gazdája körében egyszer áthelyezhető
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.events = [];
const p = s.players[0], o = s.players[1]; p.board = [null, null, null, null]; o.board = [null, null, null, null];
s.active = 0; p.energy = p.maxEnergy = 10;
const put = (id, i) => { p.hand.unshift({ uid: 9000 + i, id }); E.playCard(s, 0, 0, { k: 'slot', side: 0, i }); };
put('c_vajda', 0); put('c_pifti', 2);
const c = E.CARD.i_cipo;
ok(c && c.type === 'item' && c.cost === 1 && c.rarity === 'k' && c.shopOnly && c.price === 100, 'a lap: eszköz, 1 energia, gyakori, bolti (100 coin)');
ok(!E.canMove(s, 0, 0), 'cipőkanál nélkül nem mozgatható');
const e0 = p.energy;
p.hand.unshift({ uid: 9100, id: 'i_cipo' }); E.playCard(s, 0, 0, { k: 'unit', side: 0, i: 0 });
ok(p.energy === e0 - 1, '1 energiába kerül');
ok(p.board[0].atk === 3 && p.board[0].hp === 4, 'nem ad támadást / életet (Vajda 3/4 marad)');
ok(E.canMove(s, 0, 0), 'a cipőkanalas Vajda áthelyezhető');
ok(E.moveTargets(s, 0, 0).map(t => t.i).join() === '1,2,3', 'célpontok: a két üres hely és Pifti (helycsere)');
ok(E.moveUnit(s, 0, 0, 3) && p.board[3] && p.board[3].id === 'c_vajda' && !p.board[0], 'Vajda átlépett a 4. helyre');
ok(!E.canMove(s, 0, 3) && !E.moveUnit(s, 0, 3, 1), 'ugyanabban a körben másodszor nem mozgatható');
ok(!E.canMove(s, 0, 2), 'Pifti (cipőkanál nélkül) nem mozgatható');
E.runEndTurn(s);   // az ellenfél köre
ok(!E.canMove(s, 0, 3), 'az ellenfél körében nem mozgatható');
E.runEndTurn(s);   // újra a mi körünk
ok(s.active === 0 && E.canMove(s, 0, 3), 'a következő saját körben újra mozgatható');
ok(E.moveUnit(s, 0, 3, 2) && p.board[2].id === 'c_vajda' && p.board[3].id === 'c_pifti', 'helycsere Piftivel');
ok(s.events.some(e => e.t === 'move' && e.swap && e.from === 3 && e.i === 2), 'esemény: move (swap)');
ok(!E.canMove(s, 0, 3), 'a csere után Pifti sem mozgatható (nincs rajta cipőkanál)');
// STOP leszedi -> nem mozgatható
E.runEndTurn(s); o.energy = o.maxEnergy = 10;
o.hand.unshift({ uid: 9200, id: 'a_stop' }); E.playCard(s, 1, 0, { k: 'none' });
E.runEndTurn(s);
ok(s.active === 0 && p.board[2] && !p.board[2].items.includes('i_cipo') && !E.canMove(s, 0, 2), 'STOP után a cipőkanál lekerül, nem mozgatható');
// pakliba nem kerül packból: a Base set nem tartalmazza (meta.js SETS) – itt csak a jelölőt nézzük
ok(!E.CARDS.some(x => x.id === 'i_cipo' && (x.token || x.variantOf)), 'önálló, gyűjthető lap (nem token, nem változat)');
console.log(fails ? 'HIBÁK: ' + fails : 'CIPŐKANÁL OK');
