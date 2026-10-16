// Amszterdam hősei (2026-10-16): az új lapok és kulcsszavak (Igézhetetlen, Feltámadás) tesztje
const E = require(require('path').join(__dirname, '..', 'engine.js'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('HIBA:', m); } else console.log('ok  ', m); };
function G() {
  const s = E.newGame('bence', E.DECK_OF('bence'), 'gabi', E.DECK_OF('gabi'), 0); s.events = [];
  for (const p of s.players) { p.board = [null, null, null, null]; p.hand = []; p.energy = p.maxEnergy = 10; }
  s.active = 0; return s;
}
const U = (s, side, i, id, extra = {}) => { const u = Object.assign({ uid: 7000 + side * 10 + i, id, atk: E.CARD[id].atk, hp: E.CARD[id].hp, maxHp: E.CARD[id].hp, shield: !!E.CARD[id].shield, haste: !!E.CARD[id].haste, fresh: false, temp: 0, items: [], hidden: false }, extra); s.players[side].board[i] = u; return u; };
const play = (s, side, id, t) => { s.players[side].hand.unshift({ uid: 9000 + Math.floor(Math.random() * 1e5), id }); E.playCard(s, side, 0, t); };
const T = (s, side, id) => E.targetsFor(s, side, id);

// --- a szett lapjai ---
const ah = E.CARDS.filter(c => c.set === 'ah' && !c.token);
ok(ah.length === 22, `22 gyűjthető lap az Amszterdam hősei szettben (${ah.length})`);
const rc = r => ah.filter(c => c.rarity === r).length;
ok(rc('k') === 12 && rc('r') === 6 && rc('e') === 2 && rc('l') === 2, `ritkaságok 12/6/2/2 (${rc('k')}/${rc('r')}/${rc('e')}/${rc('l')})`);

// --- Varázsgomba: halmozódik ---
{ const s = G(); const u = U(s, 0, 1, 'c_vajda');
  play(s, 0, 'i_gomba', { k: 'unit', side: 0, i: 1 }); ok(u.atk === 4 && u.hp === 5, 'Varázsgomba #1: +1/+1 (Vajda 4/5)');
  play(s, 0, 'i_gomba', { k: 'unit', side: 0, i: 1 }); ok(u.atk === 6 && u.hp === 7, 'Varázsgomba #2: +2/+2 (6/7)');
  play(s, 0, 'i_gomba', { k: 'unit', side: 0, i: 1 }); ok(u.atk === 9 && u.hp === 10, 'Varázsgomba #3: +3/+3 (9/10)');
  s.active = 1; play(s, 1, 'a_stop', { k: 'none' });
  ok(u.atk === 3 && u.maxHp === 4, `STOP leszedi a gombákat a halmozott bónusszal együtt (${u.atk}/${u.maxHp})`); }
// --- Cigi ---
{ const s = G(); const u = U(s, 1, 0, 'c_pifti'); play(s, 0, 'i_cigi', { k: 'unit', side: 1, i: 0 });
  ok(u.atk === 1 && u.hp === 1, `Cigi: −1/−1, de 1 alá nem (Pifti ${u.atk}/${u.hp})`);
  const v = U(s, 1, 1, 'c_vajda'); play(s, 0, 'i_cigi', { k: 'unit', side: 1, i: 1 }); ok(v.atk === 2 && v.hp === 3, 'Cigi Vajdán: 2/3'); }
// --- Ír kávé, Süti ---
{ const s = G(); U(s, 0, 0, 'c_vajda'); play(s, 0, 'a_irkave', { k: 'unit', side: 0, i: 0 }); ok(s.players[0].board[0].shield, 'Ír kávé: Pajzs');
  ok(!T(s, 0, 'a_irkave').some(t => t.side === 1), 'Ír kávé csak saját karakterre');
  const b = U(s, 1, 2, 'c_veghtomi'); b.shield = true;
  ok(T(s, 0, 'a_suti').every(t => t.side === 1), 'Süti csak ellenséges karaktert céloz');
  play(s, 0, 'a_suti', { k: 'unit', side: 1, i: 2 });
  ok(!b.shield && b.noKw && E.CARD.c_veghtomi.taunt, 'Süti: Végh Tomi Pajzs és Provokáció nélkül');
}
{ const s = G(); const g = U(s, 1, 3, 'c_gabileg'); play(s, 0, 'a_suti', { k: 'unit', side: 1, i: 3 });
  play(s, 0, 'a_abszint', { k: 'unit', side: 1, i: 3 }); ok(!s.players[1].board[3], 'Süti után Gabi nem támad fel (elvesztette a Feltámadást)'); }
// --- Igézhetetlen ---
{ const s = G(); U(s, 1, 0, 'c_ah_tomi'); U(s, 1, 1, 'c_pifti'); U(s, 0, 0, 'c_ah_tomi');
  ok(!T(s, 0, 'a_dinnyes').some(t => t.side === 1 && t.i === 0), 'Igézhetetlen: Dinnyés nem célozhatja');
  ok(!T(s, 0, 'a_irkave').some(t => t.i === 0), 'Igézhetetlen: a saját Ír kávé sem');
  ok(T(s, 0, 'i_napszemuveg').some(t => t.side === 0 && t.i === 0), 'Igézhetetlen: eszköz rátehető (saját)');
  ok(T(s, 0, 'i_cigi').some(t => t.side === 1 && t.i === 0), 'Igézhetetlen: ellenséges eszköz is rátehető');
  ok(!T(s, 0, 'c_vera').some(t => t.t2 && t.t2.i === 0), 'Igézhetetlen: Vera nem küldheti vissza');
  play(s, 0, 'a_talca', { k: 'none' }); ok(s.players[1].board[0] && s.players[1].board[0].hp === 2, 'Igézhetetlen: a Tálca shot eltalálja (4→2)');
  let hit = 0; for (let k = 0; k < 40; k++) { const s2 = G(); U(s2, 1, 0, 'c_ah_tomi'); U(s2, 1, 1, 'c_vajda'); U(s2, 0, 3, 'c_veghtomi', { maxHp: 30, hp: 30 });
    play(s2, 0, 'c_alekosz', { k: 'slot', side: 0, i: 2 }); if (s2.players[0].board.some(u => u && u.id === 'c_ah_tomi')) hit++; }
  ok(hit === 0, 'Igézhetetlen: Alekosz soha nem lopja el (40 próba)'); }
// --- Feltámadás ---
{ const s = G(); const u = U(s, 1, 0, 'c_ah_bence'); play(s, 0, 'a_abszint', { k: 'unit', side: 1, i: 0 });
  const r = s.players[1].board[0]; ok(r && r.hp === 1 && r.revived, 'Feltámadás: Bence 1 élettel feléled');
  play(s, 0, 'a_dinnyes', { k: 'unit', side: 1, i: 0 }); ok(!s.players[1].board[0], 'Feltámadás: másodszorra végleg meghal');
  ok(E.CARD.c_ah_bence.haste && E.CARD.c_ah_sasi.haste, 'Bence terrorja és Sasi: Lendület'); }
// --- Helyszínek ---
{ const s = G(); const u = U(s, 0, 0, 'c_vajda'); U(s, 1, 0, 'c_pifti', { hp: 9, maxHp: 9 });
  play(s, 0, 'l_elfekvo', { k: 'none' }); E.runEndTurn(s);
  ok(s.players[0].board[0].stun === 1, 'Elfekvő: a támadó a következő körében bénult');
  E.runEndTurn(s); const before = s.players[1].board[0].hp; E.runEndTurn(s);
  ok(s.players[1].board[0].hp === before, 'Elfekvő: a bénult körben nem támad'); }
{ const s = G(); const d0 = s.players[0].deck.length; play(s, 0, 'l_coffeeshop', { k: 'none' }); E.runEndTurn(s);
  ok(s.players[0].deck.length === d0 + 1 && E.CARD[s.events.find(e => e.t === 'coffee').id].type === 'item', 'Coffee Shop: kör végén +1 véletlen eszköz a paklidba'); }
{ const s = G(); const u = U(s, 0, 0, 'c_vajda'); play(s, 0, 'l_voros', { k: 'none' }); s.players[1].hp = 99; s.players[1].maxHp = 99;
  E.runEndTurn(s); ok(u.atk === 4 && s.players[1].hp === 99 - 4, `Vöröslámpás: +1 támadás a támadás előtt, végleg (${u.atk}, sebzés ${99 - s.players[1].hp})`); }
// --- Drog kereső kutya ---
{ const s = G(); U(s, 1, 0, 'c_kutya'); s.players[0].hand = [{ uid: 1, id: 'c_pifti' }, { uid: 2, id: 'c_vajda' }];
  s.active = 1; s.active = 0; play(s, 0, 'a_dinnyes', { k: 'unit', side: 1, i: 0 });
  ok(s.players[0].hand.length === 1 && s.players[0].grave.some(g => g.how === 'discard'), 'Drog kereső kutya: halálakor az ellenfél eldob 1 lapot'); }
// --- High Hawaiians, Barna, Laci, Ati ---
{ const s = G(); const d0 = s.players[0].deck.length; play(s, 0, 'a_hawaiians', { k: 'none' });
  ok(s.players[0].deck.filter(x => x === 'i_gomba').length === 5 && s.players[0].deck.length === d0 + 5, 'High Hawaiians: 5 Varázsgomba a pakliba');
  play(s, 0, 'c_ah_barna', { k: 'slot', side: 0, i: 0 }); ok(s.players[0].deck.filter(x => x === 'i_gomba').length === 6, 'Barna: +1 Varázsgomba a pakliba');
  play(s, 0, 'c_ah_laci', { k: 'slot', side: 0, i: 1 }); ok(s.players[0].hand.filter(h => h.id === 'a_irkave').length === 2, 'Laci: 2 Ír kávé a kézbe');
  play(s, 0, 'c_ah_ati', { k: 'slot', side: 0, i: 2 }); ok(s.players[0].board[3] && s.players[0].board[3].id === 'c_betti', 'Ati: Betti mellé (jobbra)'); }
// --- Reptéri ellenőrzés ---
{ const s = G(); U(s, 1, 1, 'c_vajda'); U(s, 0, 0, 'c_kovacs');
  ok(T(s, 0, 'a_repter').some(t => t.side === 1 && t.i === 1 && t.t2.side === 0), 'Reptéri: ellenséges karakter átvihető hozzád');
  ok(T(s, 0, 'a_repter').some(t => t.side === 0 && t.i === 0 && t.t2.side === 1), 'Reptéri: saját karakter átvihető az ellenfélhez');
  play(s, 0, 'a_repter', { k: 'unit', side: 1, i: 1, t2: { k: 'slot', side: 0, i: 3 } });
  ok(!s.players[1].board[1] && s.players[0].board[3] && s.players[0].board[3].id === 'c_vajda' && s.players[0].board[3].fresh, 'Reptéri: Vajda átkerült hozzád (pihen)'); }
// --- Bong ---
{ const s = G(); s.players[0].hand = [{ uid: 1, id: 'a_bong' }]; E.playCard(s, 0, 0, { k: 'none' });
  ok(s.players[1].hand.some(h => h.id === 'a_bong2') && E.CARD.a_bong2.cost === 2, 'Bong: az ellenfél kezébe kerül 2-es költséggel');
  const hp1 = s.players[1].hp; E.runEndTurn(s);   /* az ellenfél köre jön, kijátszhatja */
  s.players[1].energy = 10; const k = s.players[1].hand.findIndex(h => h.id === 'a_bong2'); E.playCard(s, 1, k, { k: 'none' });
  ok(s.players[0].hand.some(h => h.id === 'a_bong3'), 'Bong: visszajön 3-asként');
  E.runEndTurn(s); const hp0 = s.players[0].hp; E.runEndTurn(s);
  ok(s.players[0].hp <= hp0 - 3 + 0 && !s.players[0].hand.some(h => E.CARD[h.id].bong), 'Bong: akinél a köre végén marad, eldobja és annyit sebződik (3)'); }
// --- Ír reggeli, Utcai füst ---
{ const s = G(); s.players[0].hp = 5; s.players[1].hp = 7; play(s, 0, 'a_irreggeli', { k: 'none' });
  ok(s.players[0].hp === s.players[0].maxHp && s.players[1].hp === s.players[1].maxHp, 'Ír reggeli: mindkét hős teljes életre'); }
{ const s = G(); U(s, 0, 0, 'c_vajda'); U(s, 0, 1, 'c_pifti'); play(s, 0, 'a_utcaifust', { k: 'none' });
  const us = s.players[0].board.filter(Boolean); ok(us.length === 2 && us.every(u => u.hidden), 'Utcai füst: mindenki rejtett, senki nem tűnt el'); }
// --- Game Over (közös Kánon) ---
{ const s = G(); s.players[0].heroId = 'laci'; s.players[0].hp = 18; U(s, 1, 0, 'c_vajda'); U(s, 1, 1, 'c_gabileg'); const eh = s.players[1].hp;
  s.players[0].hand = [{ uid: 1, id: 'f_gameover' }]; ok(E.canPlay(s, 0, 0), 'Game Over: bármelyik hős kijátszhatja (Laci)');
  E.playCard(s, 0, 0, { k: 'none' });
  ok(s.players[0].maxHp === 10 && s.players[0].hp === 10, 'Game Over: a maximum életed 10');
  ok(!s.players[1].board[0] && s.players[1].board[1] && s.players[1].board[1].hp === 1, 'Game Over: az ellenfél karakterei elpusztulnak (Gabi feltámad)');
  ok(s.players[1].hp === eh - 5, 'Game Over: 5 sebzés az ellenfél hősének'); }
// --- Börtönlánc ---
{ const s = G(); const u = U(s, 1, 0, 'c_vajda'); play(s, 0, 'i_lanc', { k: 'unit', side: 1, i: 0 });
  ok(u.items.includes('i_lanc') && u.hp === 4, 'Börtönlánc: rákerül, azonnal nem sebez');
  ok(T(s, 0, 'i_lanc').every(t => t.side === 1), 'Börtönlánc csak ellenséges karakterre');
  E.runEndTurn(s); ok(s.active === 1 && u.hp === 3, `Börtönlánc: az ellenfél körének elején 1 sebzés (${u.hp})`);
  s.events = []; E.runEndTurn(s); ok(!s.events.some(e => e.t === 'chain'), 'Börtönlánc: a te körödben nem sebez');
  const t = U(s, 1, 2, 'c_ah_tomi'); ok(T(s, 0, 'i_lanc').some(x => x.side === 1 && x.i === 2), 'Börtönlánc Igézhetetlenre is rátehető (eszköz)'); }
// --- Csend a vihar előtt ---
{ const s = G(); U(s, 1, 0, 'c_vajda'); U(s, 1, 1, 'c_pifti'); U(s, 1, 2, 'c_ah_tomi'); s.players[1].board[0].items = ['i_napszemuveg'];
  ok(!T(s, 0, 'a_csend').some(t => t.i === 2 || (t.t2 && t.t2.i === 2)), 'Csend: Igézhetetlen nem célozható');
  play(s, 0, 'a_csend', { k: 'unit', side: 1, i: 0, t2: { k: 'unit', side: 1, i: 1 } });
  ok(!s.players[1].board[0] && !s.players[1].board[1] && s.players[1].hand.map(h => h.id).sort().join() === 'c_pifti,c_vajda', 'Csend: két ellenséges karakter vissza a kézbe');
  ok(s.players[1].grave.some(g => g.id === 'i_napszemuveg'), 'Csend: az eszközük a temetőbe');
  const s2 = G(); U(s2, 1, 3, 'c_vajda'); ok(T(s2, 0, 'a_csend').length === 1, 'Csend: egy ellenségnél egy célpont is elég'); }
// --- botok nem akadnak el az új lapokkal ---
{ let games = 0, errs = 0;
  const deck = { i_lanc: 1, a_csend: 1, i_gomba: 2, i_cigi: 1, a_irkave: 1, a_suti: 1, l_voros: 1, c_kutya: 1, a_bong: 1, a_repter: 1, c_ah_sasi: 2, c_ah_tomi: 2, c_ah_barna: 2, c_ah_laci: 2, c_ah_ati: 1, c_ah_bence: 1 };
  for (let g = 0; g < 60; g++) { try { const s = E.newGame('tomi', deck, 'gabi', E.DECK_OF('gabi'), g % 2); let n = 0;
    while (s.winner == null && n++ < 200) { let m = 0, c; while (s.winner == null && m++ < 15 && (c = E.botChoose(s))) E.playCard(s, s.active, c.hi, c.t); if (s.winner == null) E.runEndTurn(s); }
    games++; } catch (e) { errs++; if (errs < 3) console.log(e.stack.split('\n').slice(0, 3).join(' | ')); } }
  ok(!errs && games === 60, `60 bot-meccs az új lapokkal hiba nélkül (${errs} hiba)`); }
console.log(fails ? 'HIBÁK: ' + fails : 'AMSZTERDAM OK');
