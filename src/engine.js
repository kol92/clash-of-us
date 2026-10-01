// ===== Clash of Us – játékmotor =====
const MAX_HALF = 40; // 20 teljes kör (mindkét játékos 20-szor lép)
const LANES = 4;     // helyek száma játékosonként
const HAND_LIMIT = 8;

const CARDS = [
  // --- Karakterek ---
  { id:'c_pifti', type:'char', name:'Pifti', cost:1, atk:1, hp:1, rarity:'k', text:'' },
  { id:'c_pifti2', type:'char', name:'Pifti', cost:1, atk:1, hp:1, rarity:'k', variantOf:'c_pifti', passOnly:true, foilOnly:true, text:'' },
  { id:'c_tzs', type:'char', name:'TZS', cost:1, atk:3, hp:1, rarity:'r', text:'Amikor támad, 1 sebzést okoz a saját hősödnek is.' },
  { id:'c_tzs2', type:'char', name:'TZS', cost:1, atk:3, hp:1, rarity:'r', variantOf:'c_tzs', passOnly:true, foilOnly:true, text:'Amikor támad, 1 sebzést okoz a saját hősödnek is.' },
  { id:'c_talos', type:'char', name:'Tálos', cost:1, atk:1, hp:1, rarity:'r', text:'A mellette álló karaktereid +2 támadást kapnak, amíg Tálos él.' },
  { id:'c_gyuri', type:'char', name:'Gyuri', cost:2, atk:2, hp:2, rarity:'k', sneak:true, text:'' },
  { id:'c_rebi', type:'char', name:'Rebi', cost:2, atk:2, hp:2, rarity:'r', text:'A vele szemben álló ellenséges karakternek 1-gyel kisebb a támadása.' },
  { id:'c_kovacs', type:'char', name:'Kovács Bence', cost:2, atk:1, hp:1, rarity:'k', deathBlast:2, text:'Amikor meghal, 2 sebzést okoz a vele szemben állónak. Ha ott nincs senki, az ellenfél hősét sebzi.' },
  { id:'c_miloivo', type:'char', name:'Milo, az örökivó', cost:2, atk:1, hp:2, rarity:'r', text:'Valahányszor Italt játszol ki, végleg +1 támadást kap.' },
  { id:'c_laczko', type:'char', name:'Laczkó Tomi', cost:4, atk:3, hp:3, rarity:'r', text:'Ha Italt játszol ki, húzol egy lapot (körönként egyszer).' },
  { id:'c_gabileg', type:'char', name:'Gabi, a legyőz\u00ADhetetlen', cost:5, atk:4, hp:4, rarity:'l', revive:true, text:'Amikor először meghal, újraéled a helyén 1 élettel.' },
  { id:'c_zsibrita', type:'char', name:'Zsibrita', cost:3, atk:2, hp:3, rarity:'r', playTgt:'push', text:'Kijátszáskor egy ellenséges karaktert áttolhatsz az ellenfél egy üres sávjába.' },
  { id:'c_vera', type:'char', name:'Vera', cost:3, atk:1, hp:2, rarity:'r', playTgt:'enemy', text:'Kijátszáskor: válassz egy ellenséges karaktert, az visszakerül az ellenfél kezébe.' },
  { id:'c_zoli', type:'char', name:'Gál Zoli', cost:3, atk:3, hp:1, rarity:'k', haste:true, text:'Egy támadás után magától elpusztul.' },
  { id:'c_kristof', type:'char', name:'Kristóf', cost:3, atk:2, hp:2, rarity:'r', text:'Kijátszáskor: a kezedbe kerül egy véletlen Ital lap.' },
  { id:'c_sasimeselo', type:'char', name:'Sasi, a mesélő', cost:3, atk:2, hp:2, rarity:'r', text:'Kijátszáskor: húzol egy lapot.' },
  { id:'c_vajda', type:'char', name:'Vajda Peti', cost:3, atk:3, hp:4, rarity:'k', text:'' },
  { id:'c_alekosz', type:'char', name:'Alekosz Tibi', cost:4, atk:2, hp:2, rarity:'e', text:'Kijátszáskor ellop egy véletlen ellenséges karaktert, és maga mellé teszi (ha van mellette üres hely).' },
  { id:'c_norbi', type:'char', name:'Lukács Norbi', cost:3, atk:2, hp:3, rarity:'r', text:'Ha mellette áll egy másik karaktered, +2 támadást kap.' },
  { id:'c_zana', type:'char', name:'Zana', cost:4, atk:3, hp:3, rarity:'e', text:'Körönként kétszer támad.' },
  { id:'c_ati', type:'char', name:'Ati', cost:4, atk:8, hp:4, rarity:'e', muscle:true, text:'Csak akkor támad, ha nincs más karaktered a táblán.' },
  { id:'c_veghtomi', type:'char', name:'Végh Tomi', cost:4, atk:3, hp:5, rarity:'k', taunt:true, text:'Amíg él, az ellenfél karakterei mindig őt támadják, bárhol áll.' },
  { id:'c_sasi', type:'char', name:'Toma', cost:4, atk:4, hp:4, rarity:'r', text:'' },
  { id:'c_fogel', type:'char', name:'Fogel', cost:5, atk:2, hp:4, rarity:'r', text:'Kijátszáskor: a többi karaktered +2 életet kap. Ez akkor is megmarad, ha Fogel meghal.' },
  { id:'c_boros', type:'char', name:'Boros', cost:5, atk:3, hp:5, rarity:'r', taunt:true, text:'Amíg él, az ellenfél karakterei mindig őt támadják, bárhol áll.' },
  { id:'c_nyiti', type:'char', name:'Nyiti', cost:5, atk:5, hp:4, rarity:'l', text:'Mindig közvetlenül az ellenfél hősét támadja, akkor is, ha áll vele szemben karakter.' },
  { id:'c_nfc', type:'char', name:'A Nagy Fehér Cigány', cost:6, atk:8, hp:1, rarity:'k', muscle:true, text:'' },
  { id:'c_laszy', type:'char', name:'Laszy', cost:6, atk:6, hp:3, rarity:'e', haste:true, muscle:true, text:'Támadáskor 50% eséllyel egy saját karakteredet vagy a saját hősödet találja el.' },
  // --- Eszközök (helykitöltők) ---
  { id:'c_pp', type:'char', name:'PP', cost:3, atk:1, hp:3, rarity:'k', text:'Kijátszáskor maga mellé idéz egy 1/1-es Queryt, ha van üres hely.' },
  { id:'c_query', type:'char', name:'Query', cost:0, atk:1, hp:1, rarity:'k', token:true, text:'Csak PP idézheti meg, pakliba nem tehető.' },
  { id:'i_napszemuveg', type:'item', name:'Napszemüveg', cost:1, atk:1, hp:1, rarity:'k', text:'' },
  { id:'i_energiaital', drink:true, type:'item', name:'Energiaital', cost:1, atk:2, hp:0, rarity:'r', haste:true, text:'' },
  { id:'i_borkabat', type:'item', name:'Bőrkabát', cost:2, atk:0, hp:2, rarity:'r', shield:true, text:'' },
  { id:'i_kabala', type:'item', name:'Szerencsekabala', cost:2, atk:1, hp:1, rarity:'k', text:'Ha a viselője meghal, húzz egy lapot.' },
  { id:'i_buffalo', type:'item', name:'Buffalo!', cost:2, tgt:'enemy', stun:2, rarity:'k', text:'Egy ellenséges karakterre teszed. 2 körig megbénítja: nem támad, és ha megütik, nem üt vissza.' },
  { id:'i_varazsho', type:'item', name:'Fehér varázshó', cost:0, atk:0, hp:0, rarity:'k', haste:true, selfDmg:1, text:'A hősöd 1 sebzést kap.' },
  { id:'i_lepke', type:'item', name:'Csattogós lepke', cost:1, tgt:'enemy', debuff:2, rarity:'k', text:'Egy ellenséges karakterre teszed: -2 támadás.' },
  { id:'i_akuma', drink:true, type:'item', name:'Akuma', cost:2, atk:5, hp:0, rarity:'l', haste:true, doom:true, text:'A köröd végén a karakter, akin van, meghal.' },
  { id:'i_uto', type:'item', name:'TomiNegan ütője', cost:3, atk:3, hp:0, rarity:'l', muscle:true, text:'' },
  { id:'i_vodkakancso', drink:true, type:'item', name:'Vodka Kancsó', cost:3, atk:4, hp:0, rarity:'r', muscle:true, hangover:true, text:'Utána a következő körödben a karakter bénult: nem támad, és nem üt vissza.' },
  { id:'i_bunda', type:'item', name:'Fehér szarvas bunda', cost:2, atk:0, hp:3, rarity:'r', taunt:true, text:'' },
  { id:'i_aranylanc', type:'item', name:'Tomi nyaklánca', cost:3, atk:2, hp:3, rarity:'l', text:'' },
  // --- Akciók ---
  { id:'a_dinnyes', drink:true, type:'action', name:'Dinnyés Absolute Vodka', cost:1, tgt:'enemyOrHero', rarity:'k', text:'3 sebzés egy ellenséges karakternek vagy az ellenfél hősének.' },
  { id:'a_cheddar', type:'action', name:'Cheddar sajtkrém leves', cost:2, tgt:'none', rarity:'k', text:'Húzol 2 lapot.' },
  { id:'a_gyros', type:'action', name:'Musztafa Gyros Tál', cost:5, tgt:'none', rarity:'r', text:'Eldobod az összes kézben lévő lapodat, majd húzol 4 lapot.' },
  { id:'a_kitiltva', type:'action', name:'Ki vagy tiltva!', cost:2, tgt:'none', rarity:'k', text:'Eltünteted a pályán lévő helyszínt, és húzol egy lapot.' },
  { id:'a_legeny', type:'action', name:'Legénybúcsú!', cost:4, tgt:'none', rarity:'l', text:'Minden karaktered +1 támadást és +1 életet kap.' },
  { id:'a_haver', type:'action', name:'Nem én voltam hanem a haverom!', cost:1, tgt:'swap', rarity:'k', text:'Két saját karaktered helyet cserél, vagy egy karaktered átlép egy üres sávodba.' },
  { id:'a_moshpit', type:'action', name:'Mosh Pit', cost:3, tgt:'none', rarity:'e', text:'Az ellenfél összes karaktere egy sávval jobbra csúszik, a jobb szélső a bal szélre kerül.' },
  { id:'a_delfin', type:'action', name:'Delfin póz', cost:1, tgt:'none', rarity:'k', text:'A hősöd 2 sebzést kap, és húzol 2 lapot.' },
  { id:'a_rehab', drink:true, type:'action', name:'Rehab', cost:3, tgt:'ownOrHero', rarity:'k', text:'Egy saját karaktered 3 életet gyógyul, és megszűnik a bénulása. A hősödre is kijátszhatod (3 élet).' },
  { id:'a_rehab2', drink:true, type:'action', name:'Rehab', cost:3, tgt:'ownOrHero', rarity:'k', variantOf:'a_rehab', text:'Egy saját karaktered 3 életet gyógyul, és megszűnik a bénulása. A hősödre is kijátszhatod (3 élet).' },
  { id:'a_abszint', drink:true, type:'action', name:'Abszint', cost:4, tgt:'enemy', rarity:'r', text:'7 sebzés egy ellenséges karakternek. Hőst nem választhatsz.' },
  { id:'a_mangos', drink:true, type:'action', name:'Mangós Ciroc Vodka', cost:4, tgt:'none', rarity:'r', text:'A hősöd 4 életet gyógyul.' },
  { id:'a_koktel', drink:true, type:'action', name:'Koktélarmageddon', cost:5, tgt:'none', rarity:'e', text:'Egy véletlen karakter +5 támadást kap, egy másik 5 sebzést. Bármelyik oldalon lehetnek.' },
  { id:'a_kancso', drink:true, type:'action', name:'Kancsó Long Island', cost:6, tgt:'two', rarity:'e', text:'3 sebzés két általad választott célpontnak: bármelyik karakternek vagy az ellenfél hősének.' },
  { id:'a_talca', drink:true, type:'action', name:'Tálca shot', cost:6, tgt:'none', rarity:'e', text:'Mindenki 2 sebzést kap: az összes karakter és mindkét hős.' },
  { id:'a_stop', type:'action', name:'STOP', cost:4, tgt:'none', rarity:'e', text:'Leszedsz minden eszközt az ellenfél karaktereiről (amit ő tett rájuk). A hatásuk is megszűnik.' },
  { id:'a_adios', drink:true, type:'action', name:'Adios Motherfucker!', cost:5, tgt:'none', rarity:'l', text:'Megbénítod az ellenfél hősét: a következő körében nem játszhat ki lapot (a karakterei attól még támadnak).' },
  { id:'a_sasiutes', type:'action', name:'Sasi ütése', cost:6, tgt:'enemyOrHero', rarity:'e', text:'A karaktereid összesített támadóereje sebzést okoz egy választott ellenséges karakternek vagy az ellenfél hősének.' },
  { id:'a_tubi', drink:true, type:'action', name:'Tubi', cost:3, tgt:'enemyOrHero', rarity:'e', text:'6 sebzés egy választott ellenséges karakternek vagy az ellenfél hősének, és 3 sebzés a saját hősödnek.' },
  // --- Helyszínek ---
  { id:'l_akacfa', type:'loc', name:'Akácfa söröző', cost:1, rarity:'k', text:'Minden sebzés +1-gyel nagyobb.' },
  { id:'l_morisson', type:'loc', name:'Morrison’s 2', cost:1, rarity:'k', text:'Minden karakter 1 sebzést kap a gazdája körének végén.' },
  { id:'l_park', type:'loc', name:'Budapest Park', cost:1, rarity:'k', text:'Minden lap kijátszása 1-gyel többe kerül.' },
  { id:'l_barhole', type:'loc', name:'Barhole', cost:1, rarity:'k', text:'Minden lap kijátszása 1-gyel kevesebbe kerül.' },
  { id:'l_laciverse', type:'loc', name:'Laciverse', cost:3, rarity:'e', text:'Csak annak segít, aki kijátszotta: minden karaktere +1 támadást kap.' },
  { id:'l_korhaz', type:'loc', name:'Siófoki Kórház', cost:1, rarity:'k', text:'Minden karakter 1 életet gyógyul a gazdája körének végén.' },
];
const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));

const HEROES = [
  { id:'barna', name:'Barna', hue:28, text:'A körödben elsőként kijátszott karaktered +1 támadást kap, ha legfeljebb 2 energiába kerül.' },
  { id:'gabi', name:'Gabi', hue:165, text:'A köröd végén a legsérültebb karaktered 1 életet gyógyul. Ha nincs sérült karaktered, a hősöd gyógyul.' },
  { id:'krisz', name:'Krisz', hue:210, text:'A meccsen az első két kijátszott lapod 1-gyel olcsóbb.' },
  { id:'tomi', name:'Tomi', hue:45, text:'Az eszközeid +1 életet is adnak, és a körödben az első eszközöd 1-gyel olcsóbb.' },
  { id:'david', name:'Dávid', hue:305, text:'Törzsvendég: minden helyszín neki kedvez, bárki rakta le. Kórház: 2-t gyógyít. Barhole: 2-vel olcsóbb. Budapest Park: nem drágít. Morrison’s 2: nem sebzi. Akácfa: őt nem sebzi jobban. Laciverse: neki is +1 támadás.' },
  { id:'bence', name:'Bence', hue:0, text:'24 élettel kezd 20 helyett.' },
  { id:'milo', name:'Milo', hue:95, text:'Ha egy karaktered meghal, 1 sebzést okoz az ellenfél hősének.' },
  { id:'laci', name:'Laci', hue:255, text:'Minden harmadik körödben húzol egy extra lapot.' },
  { id:'sasi', name:'Sasi', hue:280, text:'Ha a köröd végén legalább két karaktered áll a táblán, 1 sebzést okozol az ellenfél hősének.' },
];
const HERO = Object.fromEntries(HEROES.map(h => [h.id, h]));
// passzív képességek → hős
const PASSIVE = { firstCharAtk:'barna', endHeal:'gabi', firstTwo:'krisz', itemHp:'tomi', regular:'david', bigHp:'bence', deathPing:'milo', extraDraw:'laci', teamPing:'sasi' };
const has = (p, key) => p.heroId === PASSIVE[key];
const isReg = (s, side) => has(s.players[side], 'regular');   // Dávid, a törzsvendég: a helyszínek neki kedveznek

const DECKS = {
  roham: { name:'Rohamcsapat', hero:'barna', desc:'Olcsó, gyors karakterek és vodka az arcba. Kovács Bence halála is fáj, Barna minden körben felpörgeti az első emberét.',
    list:{ c_pifti:2, c_gyuri:2, c_kovacs:2, c_zoli:2, c_tzs:1, c_talos:1, c_rebi:1, c_sasi:1, a_dinnyes:2, i_napszemuveg:1, a_cheddar:2, i_lepke:1, i_buffalo:1, i_varazsho:1 } },
  ejszaka: { name:'Éjszakai műszak', hero:'gabi', desc:'Falak és gyógyítás: Végh Tomi és a Bunda provokál, Gabi közben mindenkit foltoz. Húzd el a meccset, a végén nyersz.',
    list:{ c_veghtomi:1, c_vajda:1, c_gyuri:2, c_pifti:2, c_boros:1, c_fogel:1, c_vera:1, c_rebi:1, i_borkabat:1, a_rehab:1, a_mangos:1, a_abszint:1, l_korhaz:1, a_cheddar:2, a_dinnyes:1, i_bunda:1, a_delfin:1 } },
  vodka: { name:'Vodkás est', hero:'krisz', desc:'Italos pakli: minden pohár erősíti Milót, Laczkó Tomi közben tölti a kezed, Kristóf hozza a következő kört. Krisz az első két lapját olcsóbban rakja le – gyors kezdés.',
    list:{ c_miloivo:1, c_laczko:1, c_kristof:1, c_pp:2, c_gyuri:2, c_vajda:2, a_dinnyes:2, a_cheddar:2, a_rehab:2, a_abszint:1, a_mangos:1, i_vodkakancso:1, i_energiaital:1, c_rebi:1 } },
  felszereles: { name:'Felszerelés', hero:'tomi', desc:'Minden karakterre jut valami: napszemüveg, bunda, vodkás kancsó – Tomi eszközei plusz életet adnak, és körönként az első olcsóbb.',
    list:{ c_pifti:2, c_gyuri:2, c_talos:1, c_rebi:1, c_sasi:1, i_napszemuveg:2, i_kabala:2, i_borkabat:1, i_vodkakancso:1, i_buffalo:1, i_lepke:1, a_cheddar:1, i_varazsho:1, i_bunda:1, a_delfin:1, c_vajda:1 } },
  kocsmatura: { name:'Kocsmatúra', hero:'david', desc:'Helyszínről helyszínre: Dávid törzsvendég, minden kocsma neki kedvez – a Budapest Park csak az ellenfelet drágítja. Ha kell, a Ki vagy tiltva! bezárja az ellenfél kocsmáját.',
    list:{ c_pifti:1, c_gyuri:2, c_vajda:2, c_veghtomi:2, l_akacfa:1, l_barhole:1, l_korhaz:1, l_park:1, a_kitiltva:1, a_dinnyes:2, a_abszint:1, c_boros:1, c_rebi:1, c_sasi:1, c_zsibrita:1, c_kristof:1 } },
  mindentbele: { name:'Mindent bele', hero:'bence', desc:'Bence 24 élete elbírja: Delfin póz, Varázshó és TZS önsebzése ide bátran jöhet, a Gyros Tál új kezet hoz.',
    list:{ c_tzs:1, c_zoli:2, c_gyuri:2, c_kovacs:2, c_vajda:2, c_sasi:1, a_delfin:1, a_dinnyes:2, a_gyros:1, a_abszint:1, i_buffalo:1, c_veghtomi:1, a_cheddar:1, i_napszemuveg:1, c_pifti:1 } },
  kamikaze: { name:'Kamikaze', hero:'milo', desc:'Olcsó karakterek, akik szívesen kiesnek: Milo minden halálért megsebzi az ellenfelet, Kovács Bence még utoljára odacsap.',
    list:{ c_kovacs:2, c_pifti:2, c_zoli:2, c_tzs:1, c_pp:2, c_gyuri:2, c_talos:1, c_rebi:1, i_kabala:2, l_morisson:1, a_dinnyes:2, i_varazsho:1, a_cheddar:1 } },
  hosszu: { name:'Hosszú éjszaka', hero:'laci', desc:'Védekezz, bénítsd le az ellenfelet, gyógyíts – Laci extra lapjai és a falak a végére elhúznak.',
    list:{ c_veghtomi:1, c_vajda:2, c_gyuri:2, c_fogel:1, c_vera:1, c_rebi:1, c_boros:1, a_abszint:1, a_mangos:1, a_rehab:1, a_dinnyes:1, i_buffalo:1, i_bunda:1, a_kitiltva:1, a_cheddar:1, c_sasimeselo:1, l_korhaz:1, a_delfin:1 } },
  banda: { name:'A banda', hero:'sasi', desc:'Minél többen vagytok lent, annál jobb: Sasi minden körben odacsap, Zsibrita és a haverok utat nyitnak.',
    list:{ c_pp:2, c_pifti:2, c_gyuri:2, c_kovacs:2, c_vajda:2, c_talos:1, c_rebi:1, c_zsibrita:1, c_fogel:1, i_napszemuveg:2, l_korhaz:1, a_dinnyes:2, c_veghtomi:1 } },
};
const DECK_OF = hid => Object.keys(DECKS).find(k => DECKS[k].hero === hid);

const other = i => 1 - i;
const ev = (s, e) => s.events.push(e);
const locIs = (s, id) => !!(s.location && s.location.id === id);

// Véletlen: alapból Math.random; PvP-ben mindkét gépen ugyanabból a magból, hogy a két oldal ugyanazt lássa
let RNG = Math.random;
const rnd = () => RNG();
function seedRng(seed) { let a = seed >>> 0; RNG = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function unseedRng() { RNG = Math.random; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function buildDeck(d) { const out = []; const list = typeof d === 'string' ? DECKS[d].list : d; for (const [id, n] of Object.entries(list)) for (let k = 0; k < n; k++) out.push(id); return shuffle(out); }

function makePlayer(heroId, deckId) {
  const maxHp = heroId === PASSIVE.bigHp ? 24 : 20;
  return { heroId, deckId, hp:maxHp, maxHp, deck:buildDeck(deckId), hand:[], board:Array(LANES).fill(null), grave:[],
           energy:0, maxEnergy:0, turns:0, fatigue:0, charThisTurn:false, played:0 };
}
function makeUnit(s, id, owner) {
  const c = CARD[id];
  const u = { uid: ++s.uidc, id, atk:c.atk, hp:c.hp, maxHp:c.hp, shield:!!c.shield,
              haste:!!c.haste, fresh:true, temp:0, items:[], hidden:!!c.sneak };
  if (id === 'c_korso') u.expire = s.players[owner].turns + 1;
  return u;
}

function newGame(h0, d0, h1, d1, first, opt = {}) {
  const s = { players:[makePlayer(h0,d0), makePlayer(h1,d1)], active:first, half:0, location:null,
              uidc:0, events:[], winner:null, reason:null };
  for (let k = 0; k < 4; k++) { draw(s, 0); draw(s, 1); }
  s.events = [];
  if (opt.mulligan) { s.phase = 'mulligan'; s.mulled = [false, false]; return s; }
  startTurn(s);
  return s;
}
// Kezdő kéz cseréje (egyszer, a meccs elején): a kiválasztott lapok visszakeverednek, helyettük újak jönnek.
// Az eldobott lapok a csere után kerülnek vissza, így ugyanazt nem húzhatod vissza azonnal.
function mulligan(s, pi, idxs) {
  const p = s.players[pi]; if (s.phase !== 'mulligan' || s.mulled[pi]) return;
  s.mulled[pi] = true;
  const out = idxs.slice().sort((a, b) => b - a).map(i => p.hand.splice(i, 1)[0]).filter(Boolean);
  for (let k = 0; k < out.length; k++) { const id = p.deck.pop(); if (id) p.hand.push({ uid: ++s.uidc, id }); }
  for (const c of out) p.deck.push(c.id);
  shuffle(p.deck);
}
function botMulligan(s, pi) {   // a bot a drága (5+) lapokat és a második helyszínt cseréli
  const p = s.players[pi], idx = []; let loc = 0;
  p.hand.forEach((c, i) => { const x = CARD[c.id]; if (x.cost >= 5 || (x.type === 'loc' && loc++)) idx.push(i); });
  mulligan(s, pi, idx);
}
function beginGame(s) { if (s.phase !== 'mulligan') return; s.phase = null; s.events = []; startTurn(s); }

// Temető: minden elhasznált / elpusztult / elégett lap ide kerül, a gazdája oldalán
function bury(s, side, id, how) { s.players[side].grave.push({ id, how, rnd: Math.ceil(s.half / 2) }); }
function buryItems(s, side, u) {
  const foe = [...(u.foe || [])];
  for (const id of u.items) { const k = foe.indexOf(id); if (k >= 0) { foe.splice(k, 1); bury(s, other(side), id, 'item'); } else bury(s, side, id, 'item'); }
}
function addToHand(s, pi, id) {
  const p = s.players[pi];
  if (p.hand.length >= HAND_LIMIT) { ev(s, { t:'burn', side:pi, id }); bury(s, pi, id, 'burn'); return false; }
  p.hand.push({ uid: ++s.uidc, id }); return true;
}
function draw(s, pi) {
  const p = s.players[pi];
  if (!p.deck.length) { p.fatigue++; ev(s, { t:'fatigue', side:pi, n:p.fatigue }); damageHero(s, pi, p.fatigue); return; }
  if (addToHand(s, pi, p.deck.pop())) ev(s, { t:'draw', side:pi });
}

function startTurn(s) {
  const pi = s.active, p = s.players[pi];
  s.half++; p.turns++;
  p.maxEnergy = Math.min(6, p.turns); p.energy = p.maxEnergy;
  p.charThisTurn = false; p.itemThisTurn = false; p.drinkDraw = false;
  p.board.forEach(u => { if (u) u.fresh = false; });
  ev(s, { t:'turn', side:pi });
  if (s.half > 1) draw(s, pi);
  if (has(p, 'extraDraw') && p.turns % 3 === 0) draw(s, pi);
  checkWin(s);
}

function cardCost(s, pi, id) {
  const c = CARD[id], p = s.players[pi]; let v = c.cost;
  if (locIs(s, 'l_park') && !isReg(s, pi)) v++;
  if (locIs(s, 'l_barhole')) v -= isReg(s, pi) ? 2 : 1;
  if (c.type === 'item' && has(p, 'itemHp') && !p.itemThisTurn) v--;   // Tomi: körönként az első eszköz olcsóbb
  if (has(p, 'firstTwo') && (p.played || 0) < 2) v--;   // Krisz: a meccs első két lapja olcsóbb
  return Math.max(0, v);
}

// Tálos aurája + ideiglenes bónusz
function effAtk(s, side, i) {
  const b = s.players[side].board, u = b[i]; if (!u) return 0;
  let a = u.atk + u.temp;
  if (b[i - 1] && b[i - 1].id === 'c_talos') a += 2;
  if (b[i + 1] && b[i + 1].id === 'c_talos') a += 2;
  if (u.id === 'c_norbi' && (b[i - 1] || b[i + 1])) a += 2;   // Lukács Norbi: ha van mellette valaki
  const opp = s.players[1 - side].board[i];
  if (opp && opp.id === 'c_rebi') a -= 1;
  if (s.location && s.location.id === 'l_laciverse' && (s.location.owner === side || isReg(s, side))) a += 1;
  return Math.max(0, a);
}

function targetsFor(s, pi, id) {
  const c = CARD[id], p = s.players[pi], ei = other(pi), e = s.players[ei], T = [];
  const own = () => p.board.forEach((u, i) => { if (u) T.push({ k:'unit', side:pi, i }); });
  const foe = () => e.board.forEach((u, i) => { if (u) T.push({ k:'unit', side:ei, i }); });
  switch (c.type) {
    case 'char': {
      const foes = e.board.map((u, i) => u ? i : -1).filter(i => i >= 0);
      p.board.forEach((u, i) => {
        if (u) return;
        const empt = e.board.map((u, j) => u ? -1 : j).filter(j => j >= 0);
        if (c.playTgt === 'enemy' && foes.length) foes.forEach(j => T.push({ k:'slot', side:pi, i, t2:{ side:ei, i:j } }));
        else if (c.playTgt === 'push' && foes.length && empt.length)   // Zsibrita: melyik ellenséget, és hova
          foes.forEach(j => empt.forEach(k => T.push({ k:'slot', side:pi, i, t2:{ side:ei, i:j, t3:{ k:'eslot', side:ei, i:k } } })));
        else T.push({ k:'slot', side:pi, i });
      });
      break;
    }
    case 'item': if (c.tgt === 'enemy') foe(); else own(); break;
    case 'loc': if (!locIs(s, id)) T.push({ k:'none' }); break;
    case 'action':
      if (c.tgt === 'enemy') foe();
      else if (c.tgt === 'enemyOrHero') { foe(); T.push({ k:'hero', side:ei, i:-1 }); }
      else if (c.tgt === 'enemyEmpty') e.board.forEach((u, i) => { if (!u) T.push({ k:'eslot', side:ei, i }); });
      else if (c.tgt === 'own') own();
      else if (c.tgt === 'ownOrHero') { own(); T.push({ k:'hero', side:pi, i:-1 }); }
      else if (c.tgt === 'swap') {   // saját karakter + másik saját karakter (csere) vagy saját üres hely (átlépés)
        p.board.forEach((u, a) => { if (u) p.board.forEach((x, b) => { if (b !== a) T.push({ k:'unit', side:pi, i:a, t2:{ k: x ? 'unit' : 'slot', side:pi, i:b } }); }); });
      }
      else if (c.tgt === 'two') {   // két különböző célpont: bármely karakter vagy az ellenfél hőse
        const one = [];
        for (const sd of [pi, ei]) s.players[sd].board.forEach((u, i) => { if (u) one.push({ k:'unit', side:sd, i }); });
        one.push({ k:'hero', side:ei, i:-1 });
        if (one.length === 1) T.push(one[0]);
        else for (const a of one) for (const b of one) if (a !== b) T.push({ ...a, t2:{ ...b } });
      }
      else T.push({ k:'none' });
  }
  return T;
}

function whyNot(s, pi, hi) {
  const h = s.players[pi].hand[hi]; if (!h) return 'Nincs ilyen lap';
  if (s.active !== pi) return 'Most az ellenfél köre van';
  if (s.players[pi].locked) return 'Adios Motherfucker!: ebben a körben nem játszhatsz ki lapot';
  if (cardCost(s, pi, h.id) > s.players[pi].energy) return 'Nincs elég energiád';
  if (!targetsFor(s, pi, h.id).length) {
    const c = CARD[h.id];
    if (c.type === 'char') return 'Nincs szabad helyed';
    if (c.type === 'item') return c.tgt === 'enemy' ? 'Az ellenfélnek nincs karaktere' : 'Nincs karaktered, akire rátehetnéd';
    if (c.type === 'loc') return 'Ez a helyszín már játékban van';
    if (c.tgt === 'enemyEmpty') return 'Az ellenfélnek nincs üres helye';
    return 'Nincs érvényes célpont';
  }
  return null;
}
function canPlay(s, pi, hi) { return s.winner == null && !whyNot(s, pi, hi); }

function playCard(s, pi, hi, t) {
  const p = s.players[pi], ei = other(pi), e = s.players[ei];
  const h = p.hand[hi], c = CARD[h.id];
  p.energy -= cardCost(s, pi, h.id); p.played = (p.played || 0) + 1;
  p.hand.splice(hi, 1);
  ev(s, { t:'play', side:pi, id:c.id, at: c.type === 'char' && t && t.k === 'slot' ? t.i : null });
  if (c.drink) {   // Italos szinergiák: Milo, az örökivó erősödik, Laczkó Tomi húzat (körönként egyszer)
    p.board.forEach((x, j) => { if (x && x.id === 'c_miloivo') { x.atk += 1; ev(s, { t:'buff', side:pi, i:j, n:1 }); } });
    if (!p.drinkDraw && p.board.some(x => x && x.id === 'c_laczko')) { p.drinkDraw = true; const j = p.board.findIndex(x => x && x.id === 'c_laczko'); ev(s, { t:'drinkdraw', side:pi, i:j }); draw(s, pi); }
  }
  if (c.type === 'char') {
    const u = makeUnit(s, c.id, pi);
    p.board[t.i] = u;
    if (has(p, 'firstCharAtk') && !p.charThisTurn && c.id !== 'c_korso' && c.cost <= 2) { u.atk += 1; ev(s, { t:'buff', side:pi, i:t.i }); }
    p.charThisTurn = true;
    if (c.id === 'c_pp') {   // Query idézése: előbb jobbra, aztán balra, ha ott nincs hely, bárhova
      const spots = [t.i + 1, t.i - 1].filter(j => j >= 0 && j < LANES && !p.board[j]);
      const j = spots.length ? spots[0] : p.board.findIndex(x => !x);
      if (j >= 0) { p.board[j] = makeUnit(s, 'c_query', pi); ev(s, { t:'summon', side:pi, i:j, id:'c_query' }); }
    }
    if (c.id === 'c_kristof') {   // véletlen Ital lap a kézbe (nem kell birtokolni, csak erre a meccsre)
      const pool = CARDS.filter(x => x.drink && !x.variantOf && !x.token);
      const d = pool[Math.floor(rnd() * pool.length)].id;
      ev(s, { t:'drinkgift', side:pi, i:t.i, id:d });
      addToHand(s, pi, d);
    }
    if (c.id === 'c_sasimeselo') draw(s, pi);
    if (c.id === 'c_alekosz') {   // véletlen ellenséges karaktert ellop, és maga mellé teszi (előbb jobbra, aztán balra, aztán bárhova)
      const spots = [t.i + 1, t.i - 1].filter(j => j >= 0 && j < LANES && !p.board[j]);
      const j = spots.length ? spots[0] : p.board.findIndex(x => !x);
      const cand = e.board.map((x, k) => x && x.id !== 'c_korso' ? k : -1).filter(k => k >= 0);
      if (j >= 0 && cand.length) {
        const k = cand[Math.floor(rnd() * cand.length)];
        reveal(s, ei, k);
        const u = e.board[k]; e.board[k] = null;
        // az eszközök gazdája marad, aki rátette: ami eddig „idegen” volt, az most az enyém, a többi az ellenfélé
        const oldFoe = [...(u.foe || [])], foe = [];
        for (const id of u.items) { const x = oldFoe.indexOf(id); if (x >= 0) oldFoe.splice(x, 1); else foe.push(id); }
        u.foe = foe; u.fresh = true;
        p.board[j] = u;
        ev(s, { t:'stolen', side:ei, i:k });
        ev(s, { t:'steal', side:pi, i:j, id:u.id });
      }
    }
    if (c.id === 'c_fogel') p.board.forEach((x, j) => { if (x && j !== t.i) { x.hp += 2; x.maxHp += 2; ev(s, { t:'buff', side:pi, i:j }); } });
    if (c.id === 'c_zsibrita' && t.t2 && t.t2.t3) {
      const a = t.t2.i, b = t.t2.t3.i;
      if (e.board[a] && !e.board[b]) { reveal(s, ei, a); e.board[b] = e.board[a]; e.board[a] = null; ev(s, { t:'push', side:ei, i:b }); }
    }
    if (c.id === 'c_vera' && t.t2) {
      const x = e.board[t.t2.i];
      if (x) { e.board[t.t2.i] = null; ev(s, { t:'bounce', side:ei, i:t.t2.i }); buryItems(s, ei, x); addToHand(s, ei, x.id); }
    }
  } else if (c.type === 'item' && c.tgt === 'enemy') {
    p.itemThisTurn = true;
    const u = e.board[t.i];
    reveal(s, ei, t.i); u.items.push(c.id); (u.foe = u.foe || []).push(c.id);
    if (c.stun) { u.stun = c.stun; ev(s, { t:'stun', side:ei, i:t.i }); }
    if (c.debuff) { u.atk = Math.max(0, u.atk - c.debuff); ev(s, { t:'debuff', side:ei, i:t.i, n:c.debuff }); }
  } else if (c.type === 'item') {
    p.itemThisTurn = true;
    const u = p.board[t.i];
    const hp = (c.hp || 0) + (has(p, 'itemHp') ? 1 : 0);
    u.atk += c.atk || 0; u.hp += hp; u.maxHp += hp;
    if (c.shield) u.shield = true; if (c.haste) u.haste = true; if (c.doom) u.doom = true; if (c.muscle) u.muscle = true; if (c.hangover) u.hangover = true; if (c.taunt) u.taunt = true;
    u.items.push(c.id);
    ev(s, { t:'buff', side:pi, i:t.i });
    if (c.selfDmg) damageHero(s, pi, c.selfDmg);
  } else if (c.type === 'loc') {
    if (s.location) bury(s, s.location.owner, s.location.id, 'loc');
    s.location = { id:c.id, owner:pi };
  } else {
    switch (c.id) {
      case 'a_dinnyes': if (t.k === 'hero') damageHero(s, ei, 3); else damageUnit(s, ei, t.i, 3); break;
      case 'a_gyros': {
        const n = p.hand.length;
        for (const h of p.hand) bury(s, pi, h.id, 'discard');
        p.hand = []; ev(s, { t:'discard', side:pi, i:-1, n });
        for (let k = 0; k < 4 && s.winner == null; k++) draw(s, pi);
        break; }
      case 'a_kitiltva':
        if (s.location) { bury(s, s.location.owner, s.location.id, 'banned'); ev(s, { t:'locgone', side:pi, i:-1, id:s.location.id }); s.location = null; }
        draw(s, pi); break;
      case 'a_legeny': p.board.forEach((x, j) => { if (x) { x.atk += 1; x.hp += 1; x.maxHp += 1; ev(s, { t:'buff', side:pi, i:j }); } }); break;
      case 'a_haver': if (t.t2) { const a = t.i, b = t.t2.i; [p.board[a], p.board[b]] = [p.board[b], p.board[a]]; ev(s, { t:'swap', side:pi, i:b }); } break;
      case 'a_moshpit': if (e.board.some(Boolean)) { e.board.unshift(e.board.pop()); ev(s, { t:'mosh', side:ei, i:-1 }); } break;
      case 'a_cheddar': draw(s, pi); draw(s, pi); break;
      case 'a_delfin': damageHero(s, pi, 2); if (s.winner == null) { draw(s, pi); draw(s, pi); } break;
      case 'a_mangos': healHero(s, pi, 4); break;
      case 'a_rehab': case 'a_rehab2':
        if (t.k === 'hero') { healHero(s, pi, 3); break; }
        healUnit(s, pi, t.i, 3);
        { const u = p.board[t.i];
          if (u && u.stun) { u.stun = 0; if (u.items.includes('i_buffalo')) { u.items = u.items.filter(x => x !== 'i_buffalo'); u.foe = (u.foe || []).filter(x => x !== 'i_buffalo'); bury(s, ei, 'i_buffalo', 'item'); } ev(s, { t:'unstun', side:pi, i:t.i }); } }
        break;
      case 'a_bag': p.board.forEach((x, i) => { if (x) { x.atk += 2; x.hp -= 1; x.maxHp = Math.max(1, x.maxHp - 1); ev(s, { t:'buff', side:pi, i }); } }); break;
      case 'a_sasiutes': { let sum = 0; for (let i = 0; i < LANES; i++) sum += effAtk(s, pi, i); if (t.k === 'hero') damageHero(s, ei, sum); else damageUnit(s, ei, t.i, sum); break; }
      case 'a_koktel': {
        const all = [];
        for (const sd of [0, 1]) s.players[sd].board.forEach((x, j) => { if (x) all.push([sd, j]); });
        if (!all.length) break;
        const [bs, bi] = all.splice(Math.floor(rnd() * all.length), 1)[0];
        s.players[bs].board[bi].atk += 5; ev(s, { t:'buff', side:bs, i:bi, n:5 });
        if (all.length) { const [ds, di] = all[Math.floor(rnd() * all.length)]; damageUnit(s, ds, di, 5); }
        break;
      }
      case 'a_abszint': damageUnit(s, ei, t.i, 7); break;
      case 'a_kancso':
        for (const x of [t, t.t2]) if (x) { if (x.k === 'hero') damageHero(s, x.side, 3); else damageUnit(s, x.side, x.i, 3); }
        break;
      case 'a_stop':   // az ellenfél saját eszközei lekerülnek, a hatásukkal együtt
        e.board.forEach((u, i) => {
          if (!u) return;
          const foe = [...(u.foe || [])], keep = [], own = [];
          for (const id of u.items) { const k = foe.indexOf(id); if (k >= 0) { foe.splice(k, 1); keep.push(id); } else own.push(id); }
          if (!own.length) return;
          reveal(s, ei, i);
          const base = CARD[u.id];
          for (const id of own) {
            const c = CARD[id], hp = (c.hp || 0) + (has(e, 'itemHp') ? 1 : 0);
            u.atk = Math.max(0, u.atk - (c.atk || 0));
            u.maxHp = Math.max(1, u.maxHp - hp); u.hp = Math.max(1, Math.min(u.hp, u.maxHp));
            if (c.shield && !base.shield) u.shield = false;
            if (c.haste && !base.haste) u.haste = false;
            if (c.doom) u.doom = false;
            if (c.muscle && !base.muscle) u.muscle = false;
            if (c.taunt && !base.taunt) u.taunt = false;
            bury(s, ei, id, 'item');
          }
          u.items = keep;
          ev(s, { t:'strip', side:ei, i });
        });
        break;
      case 'a_adios': e.locked = true; ev(s, { t:'lock', side:ei, i:-1 }); break;
      case 'a_talca':
        for (const sd of [pi, ei]) s.players[sd].board.forEach((u, i) => { if (u) damageUnit(s, sd, i, 2); });
        damageHero(s, ei, 2); damageHero(s, pi, 2);
        break;
      case 'a_tubi': if (t.k === 'hero') damageHero(s, ei, 6); else damageUnit(s, ei, t.i, 6); damageHero(s, pi, 3); break;
    }
    bury(s, pi, c.id, 'action');
  }
  cleanup(s); checkWin(s);
}

const boost = (s, n, side) => n > 0 && locIs(s, 'l_akacfa') && !(side != null && isReg(s, side)) ? n + 1 : n;
// Sunyulás: a lap lefordítva marad, amíg nem támad, meg nem támadják, vagy nem éri ellenséges hatás
function reveal(s, side, i) {
  const u = s.players[side].board[i];
  if (u && u.hidden) { u.hidden = false; ev(s, { t:'reveal', side, i, id:u.id, u:{ ...u, items:[...u.items] } }); }
}
function damageUnit(s, side, i, n) {
  const u = s.players[side].board[i]; if (!u || n <= 0) return;
  reveal(s, side, i);
  if (u.shield) { u.shield = false; ev(s, { t:'shield', side, i }); return; }
  n = boost(s, n, side); u.hp -= n; ev(s, { t:'dmg', side, i, n });
}
function healUnit(s, side, i, n) {
  const u = s.players[side].board[i]; if (!u) return;
  const a = Math.min(n, u.maxHp - u.hp); if (a > 0) { u.hp += a; ev(s, { t:'heal', side, i, n:a }); }
}
function healHero(s, pi, n) {
  const p = s.players[pi]; const a = Math.min(n, p.maxHp - p.hp);
  if (a > 0) { p.hp += a; ev(s, { t:'heal', side:pi, i:-1, n:a }); }
}
function damageHero(s, pi, n, raw = false) {
  if (n <= 0) return; if (!raw) n = boost(s, n, pi); s.players[pi].hp -= n; ev(s, { t:'dmg', side:pi, i:-1, n }); checkWin(s);
}
function cleanup(s) {
  // halálkor ható lapok újabb halált okozhatnak, ezért addig ismételjük, amíg van halott
  for (let guard = 0; guard < 10; guard++) {
    let any = false;
    for (const side of [0, 1]) {
      const p = s.players[side];
      p.board.forEach((u, i) => {
        if (u && u.hp <= 0 && CARD[u.id].revive && !u.revived) {   // Gabi, a legyőzhetetlen: egyszer feltámad a helyén 1 élettel
          any = true; buryItems(s, side, u);
          const c = CARD[u.id];
          p.board[i] = { ...u, atk:c.atk, hp:1, maxHp:c.hp, items:[], foe:[], shield:false, doom:false, hangover:false, stun:0, muscle:false, taunt:false, temp:0, revived:true, fresh:false };
          ev(s, { t:'revive', side, i });
          return;
        }
        if (u && u.hp <= 0) {
          any = true;
          p.board[i] = null; ev(s, { t:'death', side, i, id:u.id });
          bury(s, side, u.id, 'death'); buryItems(s, side, u);
          if (u.items.includes('i_kabala')) draw(s, side);
          if (has(p, 'deathPing') && u.id !== 'c_korso') damageHero(s, other(side), 1);
          if (CARD[u.id].deathBlast) {   // Kovács Bence: 2 sebzés a szemben állónak, ha nincs ott senki, az ellenfél hősének
            const os = other(side), x = s.players[os].board[i];
            ev(s, { t:'deathblast', side, i });
            if (x && x.hp > 0) damageUnit(s, os, i, CARD[u.id].deathBlast); else damageHero(s, os, CARD[u.id].deathBlast);
          }
        }
      });
    }
    if (!any) break;
  }
}
function checkWin(s) {
  if (s.winner != null) return;
  const a = s.players[0].hp <= 0, b = s.players[1].hp <= 0;
  if (a && b) s.winner = 'draw'; else if (a) s.winner = 1; else if (b) s.winner = 0; else return;
  s.reason = 'ko';
}

function canAttack(u) { return !!u && (!u.fresh || u.haste) && u.id !== 'c_korso' && !u.stun; }

// Laszy félreütése: 50% eséllyel egy saját karakter (i) vagy a saját hős (i = -1); a felület előre dob, hogy jó irányba animáljon
function laszyRoll(s, pi, i) {
  if (rnd() >= 0.5) return null;
  const opts = [{ i:-1 }]; s.players[pi].board.forEach((x, j) => { if (x && j !== i) opts.push({ i:j }); });
  return opts[Math.floor(rnd() * opts.length)];
}
function strike(s, i) {
  const pi = s.active, ei = other(pi), me = s.players[pi], u = me.board[i];
  reveal(s, pi, i);
  const a = effAtk(s, pi, i);
  ev(s, { t:'attack', side:pi, i });
  if ((CARD[u.id].variantOf || u.id) === 'c_tzs') damageHero(s, pi, 1);
  if (a <= 0 || s.winner != null) return;
  const mf = u.id !== 'c_laszy' ? null : ('nextMisfire' in u ? u.nextMisfire : laszyRoll(s, pi, i));
  delete u.nextMisfire;
  if (mf) {
    const pick = mf;
    ev(s, { t:'misfire', side:pi, i });
    if (pick.i === -1) damageHero(s, pi, a); else damageUnit(s, pi, pick.i, a);
    cleanup(s); return;
  }
  const tj = tauntAt(s, ei), j = tj >= 0 ? tj : i;   // Provokáció: ha van ilyen karakter, mindenki őt üti
  const x = s.players[ei].board[j];
  if (tj < 0 && (u.id === 'c_nyiti' || !x)) { damageHero(s, ei, a); return; }
  reveal(s, ei, j);
  const r = x.stun ? 0 : effAtk(s, ei, j);
  const sh = x.shield;
  damageUnit(s, ei, j, a);
  // Izom: ami sebzés a karakter halála után megmarad, az ellenfél hősét éri (a Pajzs elnyeli az egészet)
  if ((CARD[u.id].muscle || u.muscle) && !sh && x.hp < 0) { ev(s, { t:'overflow', side:ei, i:-1, n:-x.hp }); damageHero(s, ei, -x.hp, true); }
  damageUnit(s, pi, i, r); cleanup(s);
}
function tauntAt(s, side) { return s.players[side].board.findIndex(u => u && !u.hidden && (CARD[u.id].taunt || u.taunt)); }

const atiFree = (s, side, i) => s.players[side].board.every((x, j) => j === i || !x);

function attackLane(s, i) {
  if (s.winner != null) return false;
  const pi = s.active, u = s.players[pi].board[i];
  if (!canAttack(u)) return false;
  if (u.id === 'c_ati' && !atiFree(s, pi, i)) return false;
  const times = u.id === 'c_zana' ? 2 : 1;
  for (let k = 0; k < times; k++) {
    if (s.winner != null || s.players[pi].board[i] !== u) break;
    strike(s, i);
  }
  if (u.id === 'c_zoli' && s.players[pi].board[i] === u) { u.hp = 0; ev(s, { t:'expire', side:pi, i }); cleanup(s); }
  checkWin(s);
  return true;
}

function finishTurn(s) {
  const pi = s.active, p = s.players[pi];
  p.locked = false;   // az Adios Motherfucker! bénítása a megbénított játékos körének végén jár le
  if (s.winner == null && has(p, 'endHeal')) {
    let best = -1, gap = 0;
    p.board.forEach((u, i) => { if (u && u.maxHp - u.hp > gap) { gap = u.maxHp - u.hp; best = i; } });
    if (best >= 0) healUnit(s, pi, best, 1); else healHero(s, pi, 1);
  }
  if (s.winner == null && has(p, 'teamPing') && p.board.filter(Boolean).length >= 2) damageHero(s, other(pi), 1);
  if (locIs(s, 'l_morisson') && !isReg(s, pi)) p.board.forEach((u, i) => { if (u) damageUnit(s, pi, i, 1); });
  if (locIs(s, 'l_korhaz')) p.board.forEach((u, i) => { if (u) healUnit(s, pi, i, isReg(s, pi) ? 2 : 1); });
  p.board.forEach((u, i) => { if (u && u.stun) { u.stun--; if (!u.stun) { if (u.items.includes('i_buffalo')) { u.items = u.items.filter(x => x !== 'i_buffalo'); u.foe = (u.foe || []).filter(x => x !== 'i_buffalo'); bury(s, other(pi), 'i_buffalo', 'item'); } ev(s, { t:'unstun', side:pi, i }); } } });
  // Vodka Kancsó: a mostani támadás után a következő saját körében bénult
  p.board.forEach((u, i) => { if (u && u.hangover && u.hp > 0) { u.hangover = false; u.stun = Math.max(u.stun || 0, 1); ev(s, { t:'stun', side:pi, i }); } });
  p.board.forEach((u, i) => { if (u && u.expire != null && p.turns >= u.expire) { u.hp = 0; ev(s, { t:'expire', side:pi, i }); } });
  p.board.forEach((u, i) => { if (u && u.doom) { u.hp = 0; ev(s, { t:'doom', side:pi, i }); } });
  cleanup(s);
  p.board.forEach(u => { if (u) u.temp = 0; });
  checkWin(s);
  if (s.winner != null) return;
  if (s.half >= MAX_HALF) {
    const a = s.players[0].hp, b = s.players[1].hp;
    s.winner = a > b ? 0 : b > a ? 1 : 'draw'; s.reason = 'time'; return;
  }
  s.active = other(pi);
  startTurn(s);
}

function runEndTurn(s) { for (let i = 0; i < LANES; i++) attackLane(s, i); finishTurn(s); }

// ===== Bot =====
const clone = s => JSON.parse(JSON.stringify(s));

function evalState(s, me) {
  if (s.winner === me) return 1e6;
  if (s.winner === other(me)) return -1e6;
  const P = s.players[me], E = s.players[other(me)];
  let v = P.hp * 1.0 - E.hp * 1.4;
  const val = (side, i) => {
    const u = s.players[side].board[i]; const a = effAtk(s, side, i);
    let x = a * 1.1 + u.hp * 0.9 + (u.shield ? 1.5 : 0);
    if (u.stun) x = u.hp * 0.9 - 1;
    if (u.doom) x = 0;
    if (u.id === 'c_korso') x = 0.6; if (u.id === 'c_zoli') x *= 0.6; if (u.id === 'c_zana') x += a * 0.8;
    return x;
  };
  for (let i = 0; i < LANES; i++) {
    const u = P.board[i], x = E.board[i];
    if (u) { v += val(me, i); if ((!x || u.id === 'c_nyiti') && !u.stun) v += effAtk(s, me, i) * 0.6; }
    if (x) { v -= val(other(me), i); if ((!u || x.id === 'c_nyiti') && !x.stun) v -= effAtk(s, other(me), i) * 0.8; }
  }
  v += P.hand.length * 0.6 - E.hand.length * 0.3;
  if (s.location && s.location.owner === me) v += 1.0;
  if (E.locked) v += 3; if (P.locked) v -= 3;
  return v;
}
function scoreAfterCombat(s, me) {
  const c = clone(s); c.events = [];
  for (let i = 0; i < LANES; i++) attackLane(c, i);
  return evalState(c, me);
}
// A bot nem lát bele a rejtett (Sunyulás) lapokba: átlagos 2/2-es lapnak tekinti őket
function botView(s) {
  const v = clone(s), me = s.active, foe = v.players[other(me)];
  foe.board.forEach((u, i) => { if (u && u.hidden) foe.board[i] = { ...u, id:'c_pifti', atk:2, hp:2, maxHp:2, shield:false, haste:false }; });
  return v;
}
function botChoose(real) {
  const s = botView(real);
  const me = s.active, p = s.players[me];
  let best = null, bestSc = scoreAfterCombat(s, me) + 0.05;
  p.hand.forEach((h, hi) => {
    if (!canPlay(s, me, hi)) return;
    for (const t of targetsFor(s, me, h.id)) {
      const c = clone(s); c.events = [];
      playCard(c, me, hi, t);
      const sc = scoreAfterCombat(c, me);
      if (sc > bestSc) { bestSc = sc; best = { hi, t }; }
    }
  });
  return best;
}

if (typeof module !== 'undefined') module.exports = { DECK_OF, LANES, MAX_HALF, mulligan, botMulligan, beginGame, CARDS, CARD, HEROES, HERO, DECKS, newGame, playCard, canPlay, targetsFor, cardCost, attackLane, finishTurn, runEndTurn, botChoose, canAttack, effAtk };
