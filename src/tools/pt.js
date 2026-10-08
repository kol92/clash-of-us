// node pt.js CARD N  (PATCH env: JS kód, E elérhető) – a kezdőpaklikban egy 4–6-os (vagy COSTLO-COSTHI) karakter helyére teszi a lapot
const E=require(require('path').join(__dirname,'..','engine.js'));if(process.env.PATCH)eval(process.env.PATCH);
const D=Object.keys(E.DECKS);const X=process.argv[2],N=+process.argv[3]||2000;const lo=+(process.env.LO||4),hi=+(process.env.HI||6);
function deckWith(k){const l={...E.DECKS[k].list};const out=Object.keys(l).find(id=>id!==X&&E.CARD[id].cost>=lo&&E.CARD[id].cost<=hi&&E.CARD[id].type==='char'&&!E.CARD[id].finisher)||Object.keys(l).find(id=>id!==X&&!E.CARD[id].finisher&&E.CARD[id].type==='char');
 l[out]--;if(!l[out])delete l[out];l[X]=(l[X]||0)+1;return l;}
let w=0;for(let k=0;k<N;k++){const a=D[k%9],b=D[(k*4+1+Math.floor(k/9))%9];const me=k%2;
 const da=deckWith(a),db=E.DECKS[b].list;const s=me===0?E.newGame(E.DECKS[a].hero,da,E.DECKS[b].hero,{...db},k%4<2?0:1,{mulligan:true}):E.newGame(E.DECKS[b].hero,{...db},E.DECKS[a].hero,da,k%4<2?0:1,{mulligan:true});
 E.botMulligan(s,0);E.botMulligan(s,1);E.beginGame(s);let g=0;
 while(s.winner==null&&g++<200){let m=0,c;while(s.winner==null&&m++<15&&(c=E.botChoose(s)))E.playCard(s,s.active,c.hi,c.t);if(s.winner==null)E.runEndTurn(s);}
 if(s.winner===me)w++;}
console.log((process.env.TAG||'')+' '+X,(100*w/N).toFixed(1));
