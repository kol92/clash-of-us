S=newGame('sasi',DECK_OF('sasi'),'bence',DECK_OF('bence'),0); S.cos=[{},{}]; S.events=[]; S.phase='play'; show('scr-game'); render();
window.__done=false; window.__n=0;
(async()=>{ try { for(let t=0;t<7 && S.winner==null;t++){ let c; while(S.winner==null && S.active===ME && (c=botChoose(S))){ await doPlay(c.hi,c.t); window.__n++; } busy=false; await resolveEnd(); if(S.winner==null && S.active===BOT) await botTurn(); } } catch(e){ window.__err=String(e); } window.__done=true; })();
