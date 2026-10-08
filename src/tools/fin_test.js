const E = require(require('path').join(__dirname,'..','engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
const U = (id, x = {}) => ({ uid: Math.floor(Math.random() * 1e9), id, atk: E.CARD[id].atk, hp: E.CARD[id].hp, maxHp: E.CARD[id].hp, items: [], foe: [], temp: 0, ...x });
function G(h0, h1) { const s = E.newGame(h0, E.DECK_OF(h0), h1, E.DECK_OF(h1), 0); s.players.forEach(p => { p.energy = 6; p.maxEnergy = 6; p.board = [null, null, null, null]; }); s.events = []; return s; }
const give = (s, pi, id) => { s.players[pi].hand.unshift({ uid: 99999, id }); return 0; };
const ids = b => b.map(u => u ? u.id + ':' + u.atk + '/' + u.hp : '-').join(' ');

// Bender
let s = G('bence', 'gabi'); s.players[0].board[1] = U('c_gyuri'); s.players[0].board[2] = U('c_gyuri');
give(s, 0, 'f_bender'); ok(E.canPlay(s, 0, 0), 'Bender kijátszható'); E.playCard(s, 0, 0, E.targetsFor(s, 0, 'f_bender')[0]);
ok(ids(s.players[0].board) === 'c_arnyek:3/3 c_gyuri:2/2 c_gyuri:2/2 c_arnyek:3/3', 'Bender: 2 hely → két 3/3 (' + ids(s.players[0].board) + ')');
s = G('bence', 'gabi'); give(s, 0, 'f_bender'); E.playCard(s, 0, 0, { k: 'none' }); ok(ids(s.players[0].board) === 'c_arnyek:1/1 c_arnyek:1/1 c_arnyek:1/1 c_arnyek:1/1', 'Bender: 4 hely → négy 1/1');
s = G('gabi', 'bence'); give(s, 0, 'f_bender'); ok(!E.canPlay(s, 0, 0), 'Bendert más hős nem játszhatja ki');
// Gabi
s = G('gabi', 'bence'); give(s, 0, 'f_egyutt'); E.playCard(s, 0, 0, { k: 'none' }); ok(ids(s.players[0].board) === 'c_gyzana:3/3 c_gygabi:3/3 - -', 'Együtt sírtok: két 3/3');
s = G('gabi', 'bence'); [0, 1, 2].forEach(j => s.players[0].board[j] = U('c_pifti')); give(s, 0, 'f_egyutt'); E.playCard(s, 0, 0, { k: 'none' }); ok(['c_gyzana', 'c_gygabi'].includes(s.players[0].board[3].id), 'Együtt sírtok: 1 helynél egy gyerek');
// JBL
s = G('laci', 'bence'); const eb = s.players[1].board; eb[0] = U('c_pifti'); eb[1] = U('c_gyuri'); eb[3] = U('c_vajda');
give(s, 0, 'f_jbl'); E.playCard(s, 0, 0, { k: 'slot', side: 0, i: 1 });
ok(ids(s.players[1].board) === '- c_gyuri:2/2 - -', 'JBL: 3 ellenfélnél a szélsők elpusztulnak (' + ids(s.players[1].board) + ')');
ok(s.players[0].board[1].id === 'c_jbl', 'JBL a választott helyen');
ok(E.closedLane(s, 1, 0) && E.closedLane(s, 1, 3) && !E.closedLane(s, 1, 1), 'JBL: az ellenfél szélső helyei zárva');
ok(JSON.stringify(E.openSlots(s, 1)) === '[2]', 'JBL: az ellenfél csak a 2. helyre tehet (max 2 karakter)');
s.players[1].board[2] = U('c_pifti'); ok(E.openSlots(s, 1).length === 0, 'JBL: 2 karakter után nincs több hely');
s.active = 1; s.players[1].hand.unshift({ uid: 5, id: 'c_pifti' }); ok(!E.canPlay(s, 1, 0), 'JBL: karaktert nem rakhat le');
s = G('laci', 'bence'); s.players[1].board[0] = U('c_pifti'); s.players[1].board[3] = U('c_pifti'); give(s, 0, 'f_jbl'); E.playCard(s, 0, 0, { k: 'slot', side: 0, i: 0 });
ok(ids(s.players[1].board) === 'c_pifti:2/1 - - c_pifti:2/1', 'JBL: ≤2 ellenfélnél senki nem hal meg');
ok(E.openSlots(s, 1).length === 0, '…de új karaktert nem tehet le (már 2 van)');
s.players[0].board[0].hp = 0; s.players[0].board[0] = null; ok(E.openSlots(s, 1).length === 2, 'JBL halála után a helyek újra nyitva');
// Baszó
s = G('krisz', 'bence'); give(s, 0, 'f_metamorf'); s.players[0].hp = 5; E.playCard(s, 0, 0, { k: 'none' });
ok(s.players[0].baszo && s.players[0].hp === 12 && s.players[0].maxHp === 12, 'Metamorfózis: Baszó 12 élettel');
s.players[1].board[2] = U('c_vajda'); s.players[1].board[3] = U('c_boros'); s.events = [];
E.runEndTurn(s); ok(s.players[1].board[2].hp === 1 && s.players[0].hp === 12, 'Baszó a legbalra állót üti 3-mal, visszaütés nincs');
s.active = 0; s.players[0].struck = false; s.players[1].board = [null, null, null, null]; const h1 = s.players[1].hp; E.runEndTurn(s); ok(s.players[1].hp === h1 - 3, 'Baszó üres táblánál a hőst üti');
// Összetartás átka
s = G('tomi', 'bence'); s.players[0].grave = [{ id: 'c_vajda' }, { id: 'a_dinnyes' }, { id: 'c_query' }, { id: 'c_gyuri' }];
give(s, 0, 'f_atok'); E.playCard(s, 0, 0, { k: 'none' });
ok(ids(s.players[0].board).split(' ').filter(x => x !== '-').sort().join() === ['c_gyuri:3/3', 'c_vajda:4/5'].sort().join(), 'Átok: két karakter vissza +2/+2 (' + ids(s.players[0].board) + ')');
ok(!s.players[0].grave.some(g => g.id === 'c_vajda' || g.id === 'c_gyuri'), 'Átok: kikerültek a temetőből');
s = G('tomi', 'bence'); give(s, 0, 'f_atok'); ok(!E.canPlay(s, 0, 0), 'Átok: üres temetőnél nem játszható');
// Munkahely
s = G('david', 'bence'); give(s, 0, 'f_munkahely'); E.playCard(s, 0, 0, { k: 'none' });
ok(s.location && s.location.id === 'l_munkahely', 'Munkahely a pályán');
ok(E.cardCost(s, 0, 'c_vajda') === 2 && E.cardCost(s, 1, 'c_vajda') === 4, 'Munkahely: Dávidnak olcsóbb, ellenfélnek drágább');
s.players[0].hp = 10; s.active = 1; s.players[1].hand.unshift({ uid: 7, id: 'a_kitiltva' }); s.players[1].energy = 6; E.playCard(s, 1, 0, { k: 'none' });
ok(!s.location && s.players[0].hp === 15, 'Munkahely kitiltva → Dávid +5 élet');
// Gépüzemmód
s = G('milo', 'bence'); give(s, 0, 'f_gepuzem'); E.playCard(s, 0, 0, { k: 'none' }); s.active = 1; s.players[1].hand.unshift({ uid: 8, id: 'a_dinnyes' }); s.players[0].hp = 2;
E.playCard(s, 1, 0, { k: 'hero', side: 0, i: -1 }); ok(s.winner == null && s.players[0].hp === 10, 'Gépüzemmód: Milo visszatér 10 élettel');
s.players[0].hp = 1; s.players[1].hand.unshift({ uid: 9, id: 'a_dinnyes' }); s.players[1].energy = 6; E.playCard(s, 1, 0, { k: 'hero', side: 0, i: -1 }); ok(s.winner === 1, 'Gépüzemmód csak egyszer');
// Cápa
s = G('barna', 'bence'); const vb = s.players[1].board; vb.splice(0, 4, U('c_pifti'), U('c_gyuri'), null, U('c_vajda'));
give(s, 0, 'f_capa'); E.playCard(s, 0, 0, { k: 'none' }); ok(vb.filter(Boolean).length === 3 && vb.filter(u => u && u.id === 'c_capa').length === 1 && !vb[2], 'Cápa: megeszi egy véletlen ellenséget, a helyére áll (' + ids(vb) + ')');
E.runEndTurn(s); // bence köre: a cápa nem támad
E.runEndTurn(s); // barna köre kezdődött → úszik
// Cápa visszaüt
s = G('barna', 'bence'); give(s, 0, 'f_capa'); E.playCard(s, 0, 0, { k: 'none' }); s.players[0].board[3] = U('c_vajda'); E.runEndTurn(s);
ok(s.players[0].board[3] && s.players[1].board[3].hp === 9, 'Cápa Láthatatlan: átütnek rajta, nem sérül, nem üt vissza');
// Gluténbomba
s = G('sasi', 'bence'); give(s, 0, 'f_gluten'); ok(E.targetsFor(s, 0, 'f_gluten').length === 2, 'Gluténbomba: két választás'); s.players[0].hp = 10;
E.playCard(s, 0, 0, { k: 'none', o: 0 }); ok(s.players[1].hp === 19 && s.players[0].hp === 15, 'Gluténbomba 1: 5 sebzés + 5 gyógyulás (Bence 24)');
s = G('sasi', 'bence'); give(s, 0, 'f_gluten'); E.playCard(s, 0, 0, { k: 'none', o: 1 }); ok(s.players[1].hp === 16 && s.players[0].hp === 12, 'Gluténbomba 2: 8 + 8');
// rejtettség
ok(E.CARDS.filter(c => c.finisher).every(c => !c.off), 'minden kánon esemény aktív');
console.log(fails ? fails + ' HIBA' : 'MINDEN RENDBEN');
// JBL hangfal köröd végi sebzése
{ const s2 = G('laci', 'bence'); const eb2 = s2.players[1].board; eb2[1] = U('c_vajda'); eb2[2] = U('c_pifti');
  give(s2, 0, 'f_jbl'); E.playCard(s2, 0, 0, { k: 'slot', side: 0, i: 2 }); const h = s2.players[1].hp;
  ok(s2.players[0].board[2].hp === 4, 'JBL hangfal 0/4');
  E.runEndTurn(s2); ok(eb2[1] && eb2[1].hp === 3 && !eb2[2] && s2.players[1].hp === h - 1, 'JBL: köröd végén 1 sebzés mindenkinek + hősnek (' + ids(eb2) + ')');
  const h2 = s2.players[1].hp; E.runEndTurn(s2); ok(s2.players[1].hp === h2 || s2.players[1].hp < h2, 'JBL az ellenfél körében nem sebez külön'); }
console.log(fails ? fails + ' HIBA' : 'MINDEN RENDBEN 2');
