// egy 2-költségű lapot cserél minden kezdőpakliban X-re, a többi kezdőpakli ellen
const E=require(require('path').join(__dirname,'..','engine.js'));if(process.env.ST){const [c,a,h]=process.env.ST.split(',').map(Number);Object.assign(E.CARD[process.env.CID||'c_tomiparti'],{cost:c,atk:a,hp:h});}const D=Object.keys(E.DECKS);const X=process.argv[2],N=+process.argv[3]||900;
function deckWith(k){const l={...E.DECKS[k].list};const out=Object.keys(l).find(id=>id!==X&&E.CARD[id].cost>=4&&E.CARD[id].cost<=6&&E.CARD[id].type==='char'&&!E.CARD[id].finisher)||Object.keys(l).find(id=>E.CARD[id].cost<=2&&!E.CARD[id].finisher);
 l[out]--;if(!l[out])delete l[out];l[X]=(l[X]||0)+1;return l;}
const list=k=>E.DECKS[k].list;
let w=0;for(let k=0;k<N;k++){const a=D[k%9],b=D[(k*4+1+Math.floor(k/9))%9];const me=k%2;
 const da=deckWith(a),db=list(b);const s=me===0?E.newGame(E.DECKS[a].hero,da,E.DECKS[b].hero,db,k%4<2?0:1,{mulligan:true}):E.newGame(E.DECKS[b].hero,db,E.DECKS[a].hero,da,k%4<2?0:1,{mulligan:true});
 E.botMulligan(s,0);E.botMulligan(s,1);E.beginGame(s);let g=0;
 while(s.winner==null&&g++<200){let m=0,c;while(s.winner==null&&m++<15&&(c=E.botChoose(s)))E.playCard(s,s.active,c.hi,c.t);if(s.winner==null)E.runEndTurn(s);}
 if(s.winner===me)w++;}
console.log(X,(100*w/N).toFixed(1));
