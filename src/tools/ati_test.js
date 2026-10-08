const E = require(require('path').join(__dirname,'..','engine.js'));
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('HIBA:',m);} else console.log('ok  ',m); };
const U = (id, x = {}) => ({ uid: Math.floor(Math.random() * 1e9), id, atk: E.CARD[id].atk, hp: E.CARD[id].hp, maxHp: E.CARD[id].hp, items: [], foe: [], temp: 0, ...x });
function G(){ const s=E.newGame('bence',E.DECK_OF('bence'),'gabi',E.DECK_OF('gabi'),0); s.players.forEach(p=>{p.board=[null,null,null,null];}); s.events=[]; s.active=0; return s; }
const ids=b=>b.map(u=>u?u.id:'-').join(' ');
let s=G(); s.players[0].board[1]=U('c_atiuldozott',{owner:0}); s.players[1].board[1]=U('c_gyuri',{owner:1}); s.players[1].board[0]=U('c_gyuri',{owner:1});
E.atiFlee(s, s.active); ok(ids(s.players[0].board)==='- - c_atiuldozott -', 'menekül a legközelebbi üres, szemközt üres helyre: '+ids(s.players[0].board));
ok(s.events.some(e=>e.t==='flee'&&e.i===2&&e.from===1),'flee esemény');
s=G(); s.players[0].board[1]=U('c_atiuldozott',{owner:0}); E.atiFlee(s, s.active); ok(s.players[0].board[1]?.id==='c_atiuldozott','ha senki nincs szemben, marad');
s=G(); s.players[0].board[0]=U('c_atiuldozott',{owner:0}); [0,1,2,3].forEach(j=>s.players[1].board[j]=U('c_pifti',{owner:1})); E.atiFlee(s, s.active); ok(s.players[0].board[0]?.id==='c_atiuldozott','ha nincs hová, marad');
s=G(); s.players[0].board[0]=U('c_atiuldozott',{owner:0}); s.players[1].board[0]=U('c_pifti',{owner:1}); s.players[1].board[1]=U('c_pifti',{owner:1}); s.players[0].board[2]=U('c_gyuri',{owner:0});
E.atiFlee(s, s.active); ok(ids(s.players[0].board)==='- - c_gyuri c_atiuldozott','foglalt helyet átugorja: '+ids(s.players[0].board));
s=G(); s.active=1; s.players[0].board[1]=U('c_atiuldozott',{owner:0}); s.players[1].board[1]=U('c_gyuri',{owner:1}); E.atiFlee(s, s.active); ok(s.players[0].board[1]?.id==='c_atiuldozott','az ellenfél körének elején nem mozdul');
console.log(fails?'HIBÁK: '+fails:'ATI OK');
