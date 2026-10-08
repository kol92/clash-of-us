const E=require(require('path').join(__dirname,'..','engine.js'));const D=Object.keys(E.DECKS);const N=+process.argv[2]||540;let w=[0,0],used=0;
for(let k=0;k<N;k++){const a=D[k%9],b=D[(k*4+1+Math.floor(k/9))%9];const s=E.newGame(E.DECKS[a].hero,a,E.DECKS[b].hero,b,k%2,{mulligan:true});
 if(process.env.NOCOIN==='1') s.noCoin=true; E.botMulligan(s,0);E.botMulligan(s,1);E.beginGame(s);let g=0;
 while(s.winner==null&&g++<200){let m=0,c;while(s.winner==null&&m++<15&&(c=E.botChoose(s))){if(s.players[s.active].hand[c.hi].id==='a_kor')used++;E.playCard(s,s.active,c.hi,c.t);}if(s.winner==null)E.runEndTurn(s);}
 const f=k%2;if(s.winner===f)w[0]++;else if(s.winner===1-f)w[1]++;}
console.log(process.env.NOCOIN==='1'?'nincs érme':'érme', process.env.EXTRA==='1'?'+1 lap':'', 'kezdő',(100*w[0]/N).toFixed(1),'második',(100*w[1]/N).toFixed(1),'érme kijátszva',used);
