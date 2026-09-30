const E=require('./engine.js');
const heroes=E.HEROES.map(h=>h.id);
const st={hero:{},reason:{ko:0,time:0},draw:0,halves:0,firstWins:0,n:0};
const N=+process.argv[2]||1800;
for(let g=0;g<N;g++){
  const h0=heroes[g%9]; let h1=heroes[Math.floor(Math.random()*9)]; if(h1===h0) h1=heroes[(g+1+Math.floor(Math.random()*8))%9];
  const d0=E.DECK_OF(h0), d1=E.DECK_OF(h1);
  const first=Math.random()<.5?0:1;
  const s=E.newGame(h0,d0,h1,d1,first);
  let guard=0;
  while(s.winner==null && guard++<500){
    let ch; while(s.winner==null && (ch=E.botChoose(s))) E.playCard(s,s.active,ch.hi,ch.t);
    if(s.winner==null) E.runEndTurn(s);
  }
  st.n++; st.halves+=s.half; st.reason[s.reason]++;
  if(s.winner==='draw'){st.draw++;continue;}
  const w=s.winner; if(w===first) st.firstWins++;
  for(const [pi,h] of [[0,h0],[1,h1]]){ st.hero[h]=st.hero[h]||[0,0]; st.hero[h][1]++; if(pi===w)st.hero[h][0]++; }
}
const pct=([a,b])=>(100*a/b).toFixed(0)+'%';
console.log('meccs',st.n,'átl. fél-kör',(st.halves/st.n).toFixed(1),'ok',JSON.stringify(st.reason),'döntetlen',st.draw,'kezdő nyer',(100*st.firstWins/(st.n-st.draw)).toFixed(0)+'%');
console.log('hősök (saját paklival)',Object.entries(st.hero).map(([k,v])=>k+' '+pct(v)).join(' · '));
