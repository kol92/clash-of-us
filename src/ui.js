// ===== Clash of Us – felület =====
let ME = 0, BOT = 1;   // PvP-ben a vendégnél felcserélődik: mindig te vagy lent
const $ = q => document.querySelector(q);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// a valódi képernyőmagasság (iPhone-on a telepített app máshogy számolja a 100%-ot, ettől csúszott el a tábla)
const setAppH = () => {
  let h = innerHeight;
  // iPhone, telepített app, átlátszó óra-sáv: a böngésző az óra-sáv nélkül adja meg a magasságot, de a képernyő tetejétől rajzol → a teljes képernyőmagasság kell
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if (ios && standalone) {
    let p = document.querySelector('.safe-probe'); if (!p) { p = document.createElement('i'); p.className = 'safe-probe'; document.body.appendChild(p); }
    const top = parseFloat(getComputedStyle(p).paddingTop) || 0, full = Math.max(screen.width, screen.height) === Math.max(innerWidth, innerHeight) ? 0 : (innerWidth < innerHeight ? screen.height : screen.width);
    if (top > 0 && full && full - h > 10 && full - h <= top + 2) h = full;
  }
  document.documentElement.style.setProperty('--apph', h + 'px');
};
setAppH(); addEventListener('resize', setAppH); addEventListener('orientationchange', () => setTimeout(setAppH, 350));
addEventListener('pageshow', setAppH); document.addEventListener('visibilitychange', () => { if (!document.hidden) setAppH(); });
let S = null, busy = false;
const ui = { sel: null, pend: null, drag: null, dragEnd: 0, hero: 'barna', deck: 'roham', foil: false, handSeen: null, botHandN: null, flying: new Set() };

const TYPE = { char:['Karakter','t-char'], item:['Eszköz','t-item'], action:['Akció','t-action'], loc:['Helyszín','t-loc'] };
const RAR = { k:'Gyakori', r:'Ritka', e:'Epikus', l:'Legendás', g:'Arany' };
// Lapfajták és kulcsszavak magyarázata (koppintásra a lap alatt jelenik meg)
const TYPE_HELP = {
  char:  ['Karakter', 'Lekerül a táblára egy üres helyre, és ott marad. Minden köröd végén megtámadja a vele szemben állót; ha ott nincs senki, az ellenfél hősét.'],
  item:  ['Eszköz', 'Egy karakterre teszed rá, és rajta marad, amíg az a karakter él. Nem foglal helyet a táblán.'],
  action:['Akció', 'Egyszer használatos: kijátszod, azonnal hat, aztán a temetőbe kerül.'],
  loc:   ['Helyszín', 'A pálya közepére kerül, és mindkét játékosra hat, amíg egy másik helyszín le nem cseréli.'],
};
const KW_HELP = {
  drink: ['Ital', 'Az akciók és eszközök között vannak italok. Kristóf kijátszáskor ezek közül ad egyet véletlenszerűen a kezedbe.'],
  muscle:['Izom', 'Ha a támadása megöli a vele szemben álló karaktert, a maradék sebzés az ellenfél hősét éri (Pajzs esetén nincs átütés).'],
  taunt: ['Provokáció', 'Amíg él, az ellenfél karakterei mindig őt támadják, bárhol is áll a táblán (Nyiti is).'],
  shield:['Pajzs', 'Az első sebzést teljesen elnyeli, utána a pajzs eltűnik.'],
  haste: ['Lendület', 'Már abban a körben támad, amikor lekerült (vagy amikor megkapta a Lendületet).'],
  sneak: ['Sunyulás', 'Lefordítva kerül a táblára, az ellenfél nem látja, mi az. Felfordul, amikor támad, amikor megtámadják, vagy amikor ellenséges hatás éri.'],
  stun:  ['Bénult', 'Nem támad, és ha megütik, nem üt vissza. A gazdája minden körének végén 1-gyel csökken.'],
  fresh: ['Pihen', 'Ebben a körben került le, ezért még nem támad. A következő körödtől harcol.'],
  doom:  ['Eltűnik', 'A köröd végén magától elpusztul (előtte még támad).'],
  legend:['Legendás', 'Egy pakliban legfeljebb 1 lehet belőle.'],
};
function cardHelpHTML(id, u) {
  const c = CARD[id], rows = [TYPE_HELP[c.type]];
  const add = k => { if (!rows.includes(KW_HELP[k])) rows.push(KW_HELP[k]); };
  if (c.shield || u?.shield) add('shield');
  if (c.taunt || u?.taunt) add('taunt');
  if (c.drink || ['c_kristof', 'c_miloivo', 'c_laczko'].includes(c.id)) add('drink');
  if (c.muscle || u?.muscle) add('muscle');
  if (c.haste || u?.haste) add('haste');
  if (c.sneak || u?.hidden) add('sneak');
  if (c.stun || u?.stun || /bén/i.test(c.text)) add('stun');
  if (u && u.fresh && !u.haste && !u.stun) add('fresh');
  if (u && (u.doom || u.expire != null)) add('doom');
  if (c.rarity === 'l') add('legend');
  return `<dl class="help">${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>`;
}

function hueOf(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
function initials(name) {
  const w = name.split(' ').filter(x => !['A','Az','a','az'].includes(x));
  return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
}
function textHTML(c) {
  const parts = [];
  if (c.type === 'item') {
    const b = []; if (c.atk) b.push(`+${c.atk} támadás`); if (c.hp) b.push(`+${c.hp} élet`);
    if (b.length) parts.push(b.join(', ') + '.');
  }
  if (c.shield) parts.push('<b>Pajzs</b>.');
  if (c.sneak) parts.push('<b>Sunyulás</b>.');
  if (c.haste) parts.push('<b>Lendület</b>.');
  if (c.taunt) parts.push('<b>Provokáció</b>.');
  if (c.muscle) parts.push('<b>Izom</b>.');
  if (c.text) parts.push(c.text);
  return parts.join(' ');
}
function cardHTML(id, o = {}) {
  const c = CARD[id], cost = o.cost ?? c.cost;
  if (c.foilOnly && !o.foil) o = { ...o, foil: true };   // csak Full Artban létező lap
  const tl = textHTML(c).replace(/<[^>]+>/g, '').length, tlc = tl > 95 ? ' tl-l' : tl > 62 ? ' tl-m' : '';
  return `<div class="card ${TYPE[c.type][1]}${c.variantOf ? ' variant' : ''}${o.big ? ' big' : ''}${o.foil ? ' foil' : ' framed' + tlc}${o.cls ? ' ' + o.cls : ''}" style="--h:${hueOf(id)}" ${o.attrs || ''}>
    <div class="cframe">
      ${ART[id] ? `<div class="art has-art" style="${artStyle(id, o.big)}"></div>`
        : `<div class="art"><span class="mono">${initials(c.name)}</span>${o.big && !o.foil ? '<span class="artnote">Illusztráció helye</span>' : ''}</div>`}
      <div class="ctype">${TYPE[c.type][0]}${c.drink ? ' · Ital' : ''}<i class="rar r-${c.rarity}" title="${RAR[c.rarity]}"></i></div>
      ${c.type !== 'char' && !o.big ? `<div class="tribbon">${TYPE[c.type][0]}${c.drink ? '<i class="drk">Ital</i>' : ''}</div>` : ''}
      <div class="name${c.name.length > 16 ? ' long' : ''}${longWord(c.name) > 11 ? ' xl' : ''}">${c.name}</div>${c.variantOf ? '<i class="var-ribbon"><b>✦ Ritka változat</b><span>✦ Változat</span></i>' : ''}
      <div class="txt"><span>${textHTML(c)}</span></div>
    </div>
    ${o.big ? `<div class="ctype-below">${TYPE[c.type][0]}${c.drink ? ' · Ital' : ''}</div>` : ''}
    <div class="cost${cost < c.cost ? ' cheaper' : ''}">${cost}</div>
    ${c.type === 'char' ? `<div class="st atk">${c.atk}</div><div class="st hp">${c.hp}</div>` : ''}
  </div>`;
}
// elkészült illusztrációk (hős-id vagy kártya-id → kép)
const ART = {
  tomi:  { src:'art/tomi.webp',  av:'45% 15%' },
  krisz: { src:'art/krisz.webp', av:'50% 9%' },
  laci:  { src:'art/laci.webp',  av:'50% 9%' },
  gabi:  { src:'art/gabi.webp',  av:'49% 15%' },
  milo:  { src:'art/milo.webp',  av:'55% 15%' },
  david: { src:'art/david.webp', av:'50% 16%' },
  bence: { src:'art/bence.webp', av:'50% 14%' },
  barna: { src:'art/barna.webp', av:'52% 15%' },
  sasi:  { src:'art/sasi.webp',  av:'50% 15%' },
  // Arany hősök (a legritkább lapok)
  g_krisz: { src:'art/g_krisz.webp', av:'60% 22%', pos:'60% 24%', port:'62% 20%' },
  g_tomi:  { src:'art/g_tomi.webp',  av:'56% 14%', pos:'56% 16%', port:'57% 12%' },
  g_barna: { src:'art/g_barna.webp', av:'64% 20%', pos:'62% 20%', port:'64% 16%' },
  g_laci:  { src:'art/g_laci.webp',  av:'46% 20%', pos:'46% 20%', port:'46% 16%' },
  g_sasi:  { src:'art/g_sasi.webp',  av:'46% 17%', pos:'46% 16%', port:'46% 12%' },
  g_gabi:  { src:'art/g_gabi.webp',  av:'55% 28%', pos:'55% 26%', port:'56% 24%' },
  c_sasi:{ src:'art/toma.webp', pos:'50% 14%' },   // a karakterlap neve mostantól Toma (a hős Sasi marad)
  c_pifti:{ src:'art/pifti.webp', pos:'66% 16%' },
  c_gyuri:{ src:'art/gyuri.webp', pos:'60% 17%' },
  c_rebi: { src:'art/rebi.webp', pos:'76% 36%' },
  c_zoli: { src:'art/zoli.webp', pos:'64% 30%' },
  c_tzs:  { src:'art/tzs.webp',  pos:'54% 28%' },
  c_tzs2: { src:'art/tzs2.webp', pos:'50% 20%' },
  c_pifti2: { src:'art/pifti2.webp', pos:'50% 25%' },
  c_fogel:{ src:'art/fogel.webp', pos:'55% 18%' },
  c_ati:  { src:'art/ati.webp',  pos:'80% 22%' },
  c_vera: { src:'art/vera.webp', pos:'52% 16%', zoom:'170% auto' },
  c_nyiti: { src:'art/nyiti.webp', pos:'56% 28%' },
  c_talos: { src:'art/talos.webp', pos:'53% 15%' },
  c_laszy: { src:'art/laszy.webp', pos:'80% 21%', zoom:'150% auto' },
  a_abszint:{ src:'art/abszint.webp', pos:'45% 45%' },
  a_dinnyes:{ src:'art/dinnyes.webp', pos:'50% 50%' },
  a_koktel: { src:'art/koktel.webp', pos:'50% 50%' },
  a_mangos: { src:'art/mangos.webp', pos:'52% 42%' },
  i_buffalo: { src:'art/buffalo.webp', pos:'50% 52%' },
  c_boros:  { src:'art/boros.webp', pos:'50% 14%' },
  a_delfin: { src:'art/delfin.webp', pos:'40% 38%' },
  i_borkabat:{ src:'art/borkabat.webp', pos:'50% 22%' },
  i_varazsho:{ src:'art/varazsho.webp', pos:'50% 50%' },
  i_napszemuveg:{ src:'art/napszemuveg.webp', pos:'50% 14%' },
  i_energiaital:{ src:'art/energiaital.webp', pos:'50% 40%' },
  a_rehab:  { src:'art/rehab.webp', pos:'55% 45%' },
  c_pp:     { src:'art/pp.webp', pos:'52% 18%' },
  a_kancso: { src:'art/kancso.webp', pos:'55% 45%' },
  a_talca:  { src:'art/talca.webp', pos:'50% 30%' },
  a_rehab2: { src:'art/rehab2.webp', pos:'52% 42%' },
  c_nfc:    { src:'art/nfc.webp', pos:'50% 18%' },
  c_kristof: { src:'art/kristof.webp', pos:'62% 30%' },
  c_sasimeselo: { src:'art/sasimeselo.webp', pos:'62% 22%' },
  c_kovacs: { src:'art/kovacsbence.webp', pos:'40% 20%' },
  c_vajda: { src:'art/vajda.webp', pos:'50% 18%' },
  c_veghtomi: { src:'art/veghtomi.webp', pos:'45% 15%' },
  c_zana:   { src:'art/zana.webp', pos:'38% 20%' },
  i_aranylanc: { src:'art/nyaklanc.webp', pos:'50% 55%' },
  i_vodkakancso: { src:'art/vodkakancso.webp', pos:'55% 30%' },
  i_bunda: { src:'art/bunda.webp', pos:'50% 30%' },
  a_legeny: { src:'art/legeny.webp', pos:'50% 35%' },
  a_kitiltva: { src:'art/kitiltva.webp', pos:'50% 35%' },
  a_haver: { src:'art/haver.webp', pos:'50% 22%' },
  a_moshpit: { src:'art/moshpit.webp', pos:'50% 42%' },
  c_miloivo: { src:'art/miloivo.webp', pos:'62% 18%' },
  c_laczko: { src:'art/laczko.webp', pos:'55% 25%' },
  c_gabileg: { src:'art/gabileg.webp', pos:'55% 22%' },
  c_zsibrita: { src:'art/zsibrita.webp', pos:'50% 18%' },
  a_gyros: { src:'art/gyros.webp', pos:'50% 50%' },
  a_cheddar: { src:'art/cheddar.webp', pos:'45% 50%' },
  a_tubi: { src:'art/tubi.webp', pos:'55% 55%' },
  a_sasiutes: { src:'art/sasiutes.webp', pos:'45% 40%' },
  i_akuma:  { src:'art/akuma.webp', pos:'55% 45%' },
  i_uto:    { src:'art/uto.webp', pos:'45% 22%' },
  a_stop:   { src:'art/stop.webp', pos:'45% 25%' },
  a_adios:  { src:'art/adios.webp', pos:'50% 45%' },
  i_kabala: { src:'art/kabala.webp', pos:'52% 40%' },
  i_lepke:  { src:'art/lepke.webp', pos:'30% 95%' },
  l_korhaz: { src:'art/korhaz.webp', pos:'40% 38%' },
  l_morisson:{ src:'art/morisson.webp', pos:'55% 32%' },
  l_park:   { src:'art/park.webp', pos:'50% 32%' },
  l_akacfa: { src:'art/akacfa.webp', pos:'62% 40%' },
  l_laciverse: { src:'art/laciverse.webp', pos:'50% 40%' },
  l_barhole:{ src:'art/barhole.webp', pos:'50% 45%' },
  c_query:  { src:'art/query.webp', pos:'55% 30%' },
};
// kis lapokhoz (kéz, tábla, gyűjtemény) a 360 px-es kép, nagy nézethez a teljes
const artSrc = (id, big) => big ? ART[id].src : ART[id].src.replace('art/', 'art/sm/');
const artStyle = (id, big = false) => ART[id] ? `--img:url('${artSrc(id, big)}');--av:${ART[id].av || '50% 15%'};--pos:${ART[id].pos || '50% 18%'};${ART[id].zoom ? `--zoom:${ART[id].zoom};` : ''}` : '';
// Előtöltés: minden kis kép és keret induláskor letöltődik és dekódolódik, a nagyok utána, ráérősen
const PRELOADED = [];
function preload(urls) { return Promise.all(urls.map(u => { const im = new Image(); im.src = u; PRELOADED.push(im); return (im.decode ? im.decode() : Promise.resolve()).catch(() => {}); })); }
(function preloadArt() {
  const ids = Object.keys(ART);
  const ui = ['board', 'gem-cost', 'gem-cost-green', 'gem-hp', 'gem-atk', 'ring', 'ring-active'].map(n => `art/ui/${n}.webp`)
    .concat(['char', 'item', 'action', 'loc', 'hero', 'fullart', 'gold'].map(n => `art/ui/sm/frame-${n}.webp`), ['art/sm/back.webp', 'art/back.webp']);
  preload(ui.concat(ids.map(id => artSrc(id, false)))).then(() => {
    const later = () => preload(ids.map(id => artSrc(id, true)).concat(['char', 'item', 'action', 'loc', 'hero', 'fullart'].map(n => `art/ui/frame-${n}.webp`)));
    'requestIdleCallback' in window ? requestIdleCallback(later, { timeout: 3000 }) : setTimeout(later, 1200);
  });
})();
function avHTML(h, extra = '') {
  return ART[h.id] ? `class="av has-art" style="--h:${h.hue};${artStyle(h.id)}" ${extra}>`
                   : `class="av" style="--h:${h.hue}" ${extra}>${initials(h.name)}`;
}
function heroCardHTML(h, o = {}) {
  const gold = !!(o.gold && ART['g_' + h.id]), aid = gold ? 'g_' + h.id : h.id;
  if (gold) o = { ...o, foil: true };
  return `<div class="card t-hero${o.big ? ' big' : ''}${o.foil ? ' foil' : ' framed'}${gold ? ' gold' : ''}" style="--h:${h.hue}" ${o.attrs || ''}>
    <div class="cframe">
      ${ART[aid] ? `<div class="art has-art" style="${artStyle(aid, o.big)}"></div>`
        : `<div class="art"><span class="mono">${initials(h.name)}</span>${o.big && !o.foil ? '<span class="artnote">Illusztráció helye</span>' : ''}</div>`}
      <div class="ctype">${gold ? 'Arany hős' : 'Hős'} · ${h.id === PASSIVE.bigHp ? 24 : 20} élet<i class="rar ${gold ? 'r-g' : 'r-l'}"></i></div>${gold ? '<i class="gold-dust"></i>' : ''}
      <div class="name">${h.name}</div>
      <div class="txt"><span>${h.text}</span></div>
    </div></div>`;
}

// ---------- képernyők ----------
function show(id) { document.querySelectorAll('.screen').forEach(x => x.hidden = x.id !== id); }
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { renderMenuFan(); renderProfileBar(); show('scr-menu'); });
function renderMenuFan() {
  const pool = HEROES.filter(h => ART[h.id]).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  let gold = []; try { if (Store.p) gold = GOLD_HEROES.filter(h => heroSkin(h) === 'gold'); } catch {}   // induláskor még nincs betöltve a profil   // ha van arany hősöd, az is a menüben díszeleg
  const pick = pool.slice(0, 3); if (gold.length) pick[1] = HERO[gold[Math.floor(Math.random() * gold.length)]];
  $('#menuFan').innerHTML = pick.map(h => heroCardHTML(h, { foil: true, gold: gold.includes(h.id) })).join('');
}
renderMenuFan();
$('#goPlay').onclick = () => { if (!Store.p) return showCreate(); const P = Store.p;
  if (!P.tutDone && !P.tutSkip && P.stats.w + P.stats.l + P.stats.d === 0) return startTutorial();   // első játék: vezetett oktató meccs
  renderPick(); show('scr-pick'); };
$('#goColl').onclick = () => { renderColl(); show('scr-coll'); };
$('#goRules').onclick = () => show('scr-rules');

function renderPick() {
  const ds = allDecks();
  if (!ds.some(d => d.id === ui.deck && !deckIssue(d))) ui.deck = 'roham';
  $('#deckPick').innerHTML = ds.map(d => { const prob = deckIssue(d), h = HERO[d.hero];
    return `<button class="deck-opt" data-d="${d.id}" aria-pressed="${ui.deck === d.id}" ${prob ? 'disabled' : ''}>${heroPortrait(d.hero, 'do-hero')}
      <span class="do-txt"><b></b><em>${h ? `${h.name} – ${h.text}` : 'Nincs hős'}</em><small>${prob ? 'Nem játszható: ' + prob : d.starter ? d.desc : 'Saját pakli'}</small></span></button>`; }).join('');
  $('#deckPick').querySelectorAll('b').forEach((b, i) => b.textContent = ds[i].name);
}
$('#deckPick').onclick = e => { const b = e.target.closest('[data-d]'); if (b) { ui.deck = b.dataset.d; renderPick(); } };
$('#startBtn').onclick = () => { const d = allDecks().find(x => x.id === ui.deck); if (!d || deckIssue(d)) return; startMatch(d.hero, ui.deck); };

function renderColl() {
  const groups = [['Hősök', null], ['Karakterek', 'char'], ['Eszközök', 'item'], ['Akciók', 'action'], ['Helyszínek', 'loc']];
  const have = PLAYABLE.filter(c => owned(c.id) > 0).length, foils = PLAYABLE.filter(c => ownsFoil(c.id)).length;
  const dup = typeof dupeList === 'function' && Store.p ? dupeList(Store.p) : { out: [] };
  $('#collBody').innerHTML = `<p class="coll-sum">${have}/${PLAYABLE.length} különböző lap · ${foils} Full Art változat</p>` +
    (dup.out.length ? `<button class="btn dupe-btn" id="dupeBtn">♻️ ${dup.out.reduce((s, x) => s + x.n + x.f, 0)} fölösleges lap beváltása · +${dup.coins} coin</button>` : '') + groups.map(([t, type]) => `<div class="lbl">${t}</div><div class="coll-grid">${
    type ? PLAYABLE.filter(c => c.type === type).sort((a, b) => a.cost - b.cost).map(c => {
      const n = ui.foil || c.foilOnly ? (Store.p?.coll[c.id]?.f || 0) : (Store.p?.coll[c.id]?.n || 0);
      return `<div class="coll-slot${n ? '' : ' missing'}">${cardHTML(c.id, { foil: ui.foil, attrs: `data-card="${c.id}" tabindex="0"` })}<span class="own-n">${n ? '×' + n : 'Nincs meg'}</span></div>`;
    }).join('')
         : HEROES.map(h => { const miss = ui.foil && !ownsHeroFa(h.id);
             const multi = !ui.foil && Store.p && heroSkins(h.id).length > 1, sk = multi ? heroSkin(h.id) : 'base';
             return `<div class="coll-slot${miss ? ' missing' : ''}">${heroCardHTML(h, { foil: ui.foil || sk === 'fa', gold: !ui.foil && sk === 'gold', attrs: `data-hcard="${h.id}" tabindex="0"` })}${ui.foil ? `<span class="own-n">${miss ? 'Nincs meg' : '×' + Store.p.heroFa[h.id]}</span>` : multi ? `<span class="own-n skin-n">🎨 ${SKIN_NAME[sk]}</span>` : ''}</div>`; }).join('')}</div>${type ? '' : `<div class="lbl gold-lbl">✦ Arany hősök – a legritkább lapok</div><div class="coll-grid">${GOLD_HEROES.map(hid => { const has = ownsHeroGold(hid);
             return `<div class="coll-slot${has ? '' : ' missing gold-miss'}">${heroCardHTML(HERO[hid], { gold: true, attrs: `data-hgold="${hid}" tabindex="0"` })}<span class="own-n">${has ? '✦ Megvan' : 'Nincs meg'}</span></div>`; }).join('')}</div>`}`).join('');
}
$('#vBase').onclick = () => { ui.foil = false; $('#vBase').setAttribute('aria-pressed', 'true'); $('#vFoil').setAttribute('aria-pressed', 'false'); renderColl(); };
$('#vFoil').onclick = () => { ui.foil = true; $('#vFoil').setAttribute('aria-pressed', 'true'); $('#vBase').setAttribute('aria-pressed', 'false'); renderColl(); };
$('#collBody').onclick = e => {
  if (e.target.closest('#dupeBtn')) return dupeModal();
  const c = e.target.closest('[data-card]'), h = e.target.closest('[data-hcard]'), hg = e.target.closest('[data-hgold]');
  if (h && !ui.foil && Store.p && heroSkins(h.dataset.hcard).length > 1) return skinModal(h.dataset.hcard);
  if (hg && ownsHeroGold(hg.dataset.hgold) && heroSkins(hg.dataset.hgold).length > 1) return skinModal(hg.dataset.hgold);
  if (hg) { const hid = hg.dataset.hgold; openModal(heroCardHTML(HERO[hid], { big: true, gold: true }), ownsHeroGold(hid) ? '✦ Arany hős · a tiéd!' : `✦ Arany hős · boosterből ${ECON.goldPlain * 100}%, Shiny boosterből ${ECON.goldShiny * 100}% eséllyel`); return; }
  if (c) { const id = c.dataset.card, e = Store.p?.coll[id] || { n: 0, f: 0 };
    if (CARD[id].variantOf) return openModal(cardHTML(id, { big: true, foil: ui.foil }), `✦ Ritka változat: a(z) ${CARD[CARD[id].variantOf].name} különleges kinézete – ugyanúgy játszható, ugyanaz a hatása · ${e.n + e.f} db${CARD[id].passOnly ? ' · csak a Season Passból' : !e.n && !e.f ? ' · Shiny boosterből szerezhető' : ''}`, cardHelpHTML(id));
    openModal(cardHTML(id, { big: true, foil: ui.foil }), `${RAR[CARD[id].rarity]} · ${e.n} db${e.f ? ` + ${e.f} Full Art` : ''}${CARD[id].passOnly ? ' · csak a Season Passból szerezhető' : !e.n && !e.f ? ' · boosterből szerezhető' : ''}`, cardHelpHTML(id)); }
  if (h) openModal(heroCardHTML(HERO[h.dataset.hcard], { big: true, foil: ui.foil }), ui.foil ? (ownsHeroFa(h.dataset.hcard) ? 'Full Art hős' : 'Full Art hős · boosterből szerezhető') : 'Hős');
};

// ---------- temető ----------
const GRAVE_HOW = { action:'kijátszva', death:'elpusztult', burn:'elégett (tele volt a kéz)', loc:'lecserélték', item:'lekerült a karakterről', discard:'eldobva (Gyros Tál)', banned:'kitiltották (Ki vagy tiltva!)' };
function openGrave(pi) {
  const g = S.players[pi].grave.slice().reverse();
  const who = pi === ME ? 'A temetőd' : `${HERO[S.players[pi].heroId].name} temetője`;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal grave-modal"><h3>${who}</h3>
    ${g.length ? `<p class="live">Legfrissebb elöl · koppints egy lapra a részletekért</p><div class="grave-grid">${g.map((x, k) =>
      `<button class="gslot" data-g="${k}">${cardHTML(x.id, { foil: foilOf(pi, x.id) })}<small><b>${x.rnd}. kör</b>${GRAVE_HOW[x.how]}</small></button>`).join('')}</div>`
      : '<p class="live">Még üres. Ide kerülnek a kijátszott akciók, az elpusztult karakterek és eszközeik, a lecserélt helyszínek és az elégett lapok.</p>'}
    <div class="close-hint">Koppints mellé a bezáráshoz</div></div>`;
  const t0 = performance.now();
  o.onclick = e => {
    const b = e.target.closest('[data-g]');
    if (b) { const x = g[+b.dataset.g]; openModal(cardHTML(x.id, { big: true, foil: foilOf(pi, x.id) }), `${pi === ME ? 'Tőled' : 'Az ellenféltől'} · ${x.rnd}. kör · ${GRAVE_HOW[x.how]}`, cardHelpHTML(x.id)); return; }
    if (performance.now() - t0 > 350) o.remove();
  };
  $('#layer').appendChild(o);
}

// ---------- modal, toast, lebegő számok ----------
function openModal(inner, live, help = '') {
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal">${inner}${live ? `<div class="live">${live}</div>` : ''}${help}<div class="close-hint">Koppints bárhova a bezáráshoz</div></div>`;
  const t0 = performance.now();
  o.onclick = () => { if (performance.now() - t0 > 350) o.remove(); };   // a megnyitó koppintás ne zárja be rögtön
  $('#layer').appendChild(o);
}
// Full Art: a saját lapjaidnál a gyűjteményed dönt; PvP-ben az ellenfélnél az, amit a meccs elején magáról megosztott
const longWord = n => Math.max(...n.split(/[\s\u00AD]+/).map(w => w.length));   // a leghosszabb szó (ezt nem lehet tördelni)
const foilOf = (side, id) => side === ME ? ownsFoil(id) : !!(S && S.cos && S.cos[side] && S.cos[side].foils && S.cos[side].foils.includes(id));
const heroGoldOf = side => !!S && (side === ME ? heroSkin(S.players[side].heroId) === 'gold' : !!(S.cos && S.cos[side] && S.cos[side].heroGold));
const heroFaOf = side => side === ME ? heroSkin(S.players[side].heroId) === 'fa' : !!(S && S.cos && S.cos[side] && S.cos[side].heroFa);
const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('#layer').appendChild(d); setTimeout(() => d.remove(), 1600); }
function floatAt(el, text, cls) {
  if (!el) return; const r = el.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'float ' + cls; f.textContent = text;
  f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px';
  $('#layer').appendChild(f); setTimeout(() => f.remove(), 1000);
}
const cellEl = (side, i) => document.querySelector(`.cell[data-side="${side}"][data-i="${i}"]`);
const barEl = side => side === ME ? $('#pBar') : $('#eBar');
// ---------- hatásanimációk ----------
// csak akkor cseréli a tartalmat, ha tényleg változott (kevesebb újrarajzolás és képdekódolás)
function setHTML(el, html) {
  if (el._html === html) {
    el.querySelectorAll('.aim,.over,.lifted,.peek').forEach(x => x.classList.remove('aim', 'over', 'lifted', 'peek'));
    el.querySelectorAll('[class*="fx-"]').forEach(x => [...x.classList].forEach(c => c.startsWith('fx-') && x.classList.remove(c)));
    return false;
  }
  el.innerHTML = html; el._html = html; return true;
}
function fx(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function slashAt(el) {
  if (!el) return; const r = el.getBoundingClientRect();
  const s = document.createElement('div'); s.className = 'slash';
  s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
  $('#layer').appendChild(s); setTimeout(() => s.remove(), 450);
}
const unitAt = (side, i) => cellEl(side, i)?.querySelector('.unit');
let revealed = new Set();
// kijátszás: előbb maga a lap jelenik meg (karakter leszáll a helyére, akció/eszköz/helyszín felvillan), csak utána jönnek a hatásai
const preLanded = new Set();
async function playIntro(e, hasFx) {
  const c = CARD[e.id]; if (!c) return;
  if (c.type === 'char' && e.at != null) {
    const u = S.players[e.side].board[e.at], cell = cellEl(e.side, e.at);
    if (!u || !cell || cell.querySelector('.unit')) return;
    const t = document.createElement('div'); t.innerHTML = unitHTML(u, e.side, e.at).trim();
    const el = t.firstElementChild; cell.appendChild(el); preLanded.add(u.uid); fx(el, 'fx-land');
    if (hasFx) await sleep(460);
    return;
  }
  if (e.side !== ME || !hasFx) return;   // az ellenfél lapját a nagy felfordítás már megmutatta
  const o = document.createElement('div'); o.className = 'cast'; o.innerHTML = cardHTML(e.id, { foil: foilOf(ME, e.id) });
  $('#layer').appendChild(o);
  await o.animate([{ transform: 'translate(-50%,-30%) scale(.55)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,1.3,.4,1)' }).finished;
  await sleep(260);
  await o.animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: 'translate(-50%,-58%) scale(1.12)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished;
  o.remove();
}
async function animateEvents(evs) {
  let hold = 0;
  for (const e of evs) {
    if (e.t === 'play') { await playIntro(e, evs.length > 1); continue; }
    if (e.t === 'burn' && e.side === ME) { toast('Tele a kezed, egy lap elégett'); continue; }
    if (e.t === 'fatigue' && e.side === ME) { toast('Elfogyott a paklid!'); continue; }
    if (e.i == null || e.side == null) continue;
    const hero = e.i === -1;
    const el = hero ? barEl(e.side) : unitAt(e.side, e.i);
    const anchor = hero ? barEl(e.side).querySelector('.hpbar') : cellEl(e.side, e.i);
    let shown = true;
    switch (e.t) {
      case 'dmg': fx(el, hero ? 'fx-herohit' : 'fx-hit'); slashAt(anchor); floatAt(anchor, '-' + e.n, 'dmg'); hold = Math.max(hold, 480); break;
      case 'heal': fx(el, hero ? 'fx-heroheal' : 'fx-heal'); floatAt(anchor, '+' + e.n, 'heal'); hold = Math.max(hold, 480); break;
      case 'buff': fx(el, 'fx-buff'); floatAt(anchor, e.n ? `+${e.n} ⚔` : '▲', 'buff'); hold = Math.max(hold, 480); break;
      case 'shield': {
        fx(el, 'fx-shield'); floatAt(anchor, 'Pajzs!', 'info'); hold = Math.max(hold, 560);
        const b = el && el.querySelector('.dshield');   // a buborék szétpattan
        if (b) b.animate([{ transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }, { transform: 'scale(1.08)', opacity: 1, filter: 'brightness(2)', offset: .3 }, { transform: 'scale(1.35)', opacity: 0, filter: 'brightness(2.5)' }],
                         { duration: 520, easing: 'ease-out', fill: 'forwards' });
        break;
      }
      case 'stun': fx(el, 'fx-stun'); floatAt(anchor, 'Bénult!', 'dmg'); hold = Math.max(hold, 520); break;
      case 'unstun': floatAt(anchor, 'Magához tért', 'info'); break;
      case 'bounce': fx(el, e.side === ME ? 'fx-bounce-down' : 'fx-bounce-up'); floatAt(anchor, 'Vissza a kézbe!', 'info'); hold = Math.max(hold, 650); break;
      case 'misfire': floatAt(anchor, 'Mellé!', 'info'); break;
      case 'reveal':
        if (el && e.side !== ME) {   // felfordítás: rögtön megmutatjuk a lapot, akkor is, ha a következő pillanatban meghal
          await el.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg) scale(1.08)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).finished;
          if (e.u) {
            const t = document.createElement('div'); t.innerHTML = unitHTML(e.u, e.side, e.i).trim();
            const nu = t.firstElementChild; el.replaceWith(nu);
            await nu.animate([{ transform: 'rotateY(-90deg) scale(1.08)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' }).finished;
            await sleep(350);
          } else revealed.add(el.dataset.uid);
        }
        floatAt(anchor, 'Lelepleződött!', 'info'); hold = Math.max(hold, 200); break;
      case 'expire': floatAt(anchor, 'Elfogyott', 'info'); break;
      case 'doom': fx(el, 'fx-hit'); floatAt(anchor, 'Akuma elvitte', 'dmg'); hold = Math.max(hold, 520); break;
      case 'debuff': fx(el, 'fx-hit'); floatAt(anchor, `-${e.n} ⚔`, 'dmg'); hold = Math.max(hold, 480); break;
      case 'death':
        if (el) { const d = el; setTimeout(() => { d.classList.remove('fx-hit'); fx(d, 'fx-die'); }, 220); }
        hold = Math.max(hold, 900); break;
      case 'summon': floatAt(anchor, 'Query!', 'info'); hold = Math.max(hold, 300); break;
      case 'drinkgift': floatAt(anchor, e.side === ME ? `🍸 ${CARD[e.id].name} a kezedbe!` : '🍸 Ital a kezébe!', 'info'); hold = Math.max(hold, 700); break;
      case 'deathblast': floatAt(anchor, '💥 Utolsó ütés!', 'dmg'); hold = Math.max(hold, 450); break;
      case 'locgone': floatAt(anchor, `🚫 ${CARD[e.id].name} bezárt`, 'info'); hold = Math.max(hold, 600); break;
      case 'swap': floatAt(anchor, 'Helycsere!', 'info'); hold = Math.max(hold, 300); break;
      case 'push': floatAt(anchor, 'Arrébb tolva!', 'info'); hold = Math.max(hold, 300); break;
      case 'mosh': fx($('#app'), 'fx-quake'); floatAt(anchor, '🤘 Mosh Pit! Mindenki arrébb', 'dmg'); hold = Math.max(hold, 600); break;
      case 'revive': fx(el, 'fx-buff'); floatAt(anchor, '✨ Újraéledt!', 'buff'); hold = Math.max(hold, 800); break;
      case 'drinkdraw': floatAt(anchor, '🍺 +1 lap', 'info'); hold = Math.max(hold, 450); break;
      case 'discard': floatAt(anchor, e.n ? `Eldobva: ${e.n} lap` : 'Üres kéz', 'info'); hold = Math.max(hold, 500); break;
      case 'lock': fx(el, 'fx-herohit'); floatAt(anchor, 'Bénult! Nem játszhat ki lapot', 'dmg'); hold = Math.max(hold, 700); break;
      case 'overflow': floatAt(anchor, `Izom! -${e.n}`, 'dmg'); hold = Math.max(hold, 300); break;
      case 'strip': fx(el, 'fx-hit'); floatAt(anchor, 'Eszközök le!', 'dmg'); hold = Math.max(hold, 520); break;
      default: shown = false;
    }
    if (shown) await sleep(150);
  }
  if (hold) await sleep(hold);
}
// A motor lépését lefuttatja, a hatásokat a még régi táblán animálja, utána frissít
// meccs-statisztika a küldetésekhez (csak a saját tetteid)
function tallyQuest(evs) {
  const m = S.qs || (S.qs = { actions: 0, items: 0, chars: 0, locs: 0, big: 0, heroDmg: 0, kills: 0 });
  for (const e of evs) {
    if (e.t === 'play' && e.side === ME) { const c = CARD[e.id]; if (c.type === 'action') m.actions++; else if (c.type === 'item') m.items++; else if (c.type === 'char') m.chars++; else if (c.type === 'loc') m.locs++; if (c.cost >= 5) m.big++; }
    if (e.t === 'dmg' && e.side === BOT && e.i === -1) m.heroDmg += e.n;
    if (e.t === 'death' && e.side === BOT) m.kills++;
  }
}
async function runFx(fn) {
  const before = new Set([...document.querySelectorAll('.unit[data-uid]')].map(x => x.dataset.uid));
  const pos = new Map([...document.querySelectorAll('.unit[data-uid]')].map(x => [x.dataset.uid, x.getBoundingClientRect()]));
  S.events = []; fn();
  const evs = S.events; S.events = [];
  tallyQuest(evs);
  await animateEvents(evs);
  render();
  document.querySelectorAll('.unit[data-uid]').forEach(x => {
    if (revealed.has(x.dataset.uid)) x.animate([{ transform: 'rotateY(-90deg) scale(1.08)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    else if (!before.has(x.dataset.uid) && !preLanded.has(x.dataset.uid)) fx(x, 'fx-land');
    else {   // sávot váltott (helycsere, Zsibrita, Mosh Pit): odacsúszik a régi helyéről
      const o = pos.get(x.dataset.uid), n = x.getBoundingClientRect(), dx = o.left - n.left, dy = o.top - n.top;
      if (Math.abs(dx) > 20 || Math.abs(dy) > 20) x.animate([{ transform: `translate(${dx}px,${dy}px) rotate(${dx > 0 ? -6 : 6}deg)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,1.3,.5,1)' });
    }
  });
  revealed = new Set(); preLanded.clear();
}

// ---------- játék renderelés ----------
function heroBar(pi) {
  const p = S.players[pi], h = HERO[p.heroId];
  const pips = Array.from({ length: 6 }, (_, k) => `<i class="${k < p.energy ? 'on' : k < p.maxEnergy ? 'used' : 'locked'}"></i>`).join('');
  const gold = heroGoldOf(pi) && !!ART['g_' + h.id], aid = gold ? 'g_' + h.id : h.id;
  const img = ART[aid] ? `background-image:url('${artSrc(aid, true)}');--hp:${ART[aid].port || '50% 7%'}` : '';
  const fa = gold || heroFaOf(pi);
  return `<div class="hport${ART[h.id] ? '' : ' noart'}${fa ? ' fa' : ''}${gold ? ' gold' : ''}" style="--h:${h.hue};${img}" aria-hidden="true">${ART[h.id] ? '' : `<span>${initials(h.name)}</span>`}${fa ? '<i class="hfa-holo"></i><i class="hfa-shine"></i><i class="hfa-rim"></i>' : ''}</div>
    <button class="hport-hit" data-hero="${pi}" aria-label="${h.name} képessége"></button>${p.locked ? '<span class="hlock" title="Adios Motherfucker!: ebben a körében nem játszhat ki lapot">Bénult</span>' : ''}
    <div class="hinfo"><div class="hname">${h.name}<small>${pi === BOT ? (S.pvp ? escH(S.names?.[pi] || 'barát') : 'bot') : 'te'}</small></div>
      <div class="hpbar"><i style="width:${Math.max(0, p.hp) / p.maxHp * 100}%"></i><b>${Math.max(0, p.hp)} / ${p.maxHp}</b></div></div>
    <div class="res"><div class="en">${pips}<span>${p.energy}/${p.maxEnergy}</span></div>
      <div class="counts">Kéz ${p.hand.length} · <button class="gravebtn" data-grave="${pi}" aria-label="Temető">🪦 ${p.grave.length}</button></div></div>
    <button class="deckpile${p.deck.length ? p.deck.length <= 3 ? ' low' : '' : ' empty'}" data-deck="${pi}" aria-label="Pakli: ${p.deck.length} lap"><i></i><b>${p.deck.length}</b></button>`;
}
function unitHTML(u, side, i) {
  if (u.hidden && side !== ME) return `<button data-uid="${u.uid}" class="unit facedown" aria-label="Rejtett lap">
    <span class="uin"><span class="art back-art"></span><span class="uname">Rejtett lap</span></span>
    <span class="st atk">?</span><span class="st hp">?</span>${u.stun ? `<span class="tags"><span class="zz stun">bénult ${u.stun}</span></span>` : ''}</button>`;
  const c = CARD[u.id], atk = S.players[side].board[i]?.uid === u.uid ? effAtk(S, side, i) : u.atk, sleeping = u.fresh && !u.haste && u.id !== 'c_korso' && !u.stun;
  const tags = (sleeping ? '<span class="zz">pihen</span>' : u.id === 'c_ati' && !u.stun && !atiFree(S, side, i) ? '<span class="zz">nem támad</span>' : '')
    + (u.expire != null || u.doom ? '<span class="zz">eltűnik</span>' : '') + (u.stun ? `<span class="zz stun">bénult ${u.stun}</span>` : '')
    + (u.hidden ? '<span class="sneak-tag" title="Az ellenfél nem látja">rejtve</span>' : '')
    + (c.taunt || u.taunt ? '<span class="zz taunt" title="Provokáció: mindenki őt támadja">provokál</span>' : '');
  const fa = CARD[u.id].foilOnly || foilOf(side, u.id);
  return `<button data-uid="${u.uid}" class="unit ${TYPE.char[1]}${fa ? ' fa' : ''}${u.shield ? ' shield' : ''}${sleeping ? ' sleep' : ''}" style="--h:${hueOf(u.id)}">
    <span class="uin">${ART[u.id] ? `<span class="art has-art" style="${artStyle(u.id)}"></span>` : `<span class="art"><span class="mono">${initials(c.name)}</span></span>`}<span class="uname${c.name.length > 14 ? ' long' : ''}${longWord(c.name) > 10 ? ' xl' : ''}">${c.name}</span></span>
    <span class="st atk${atk > c.atk ? ' up' : ''}">${atk}</span>
    <span class="st hp${u.hp < u.maxHp ? ' hurt' : u.maxHp > c.hp ? ' up' : ''}">${u.hp}</span>
    ${u.shield ? '<span class="dshield" aria-label="Pajzs"></span>' : ''}${tags ? `<span class="tags">${tags}</span>` : ''}${u.items.length ? `<span class="gear">${u.items.length}</span>` : ''}</button>`;
}
function laneHTML(pi, tg) {
  return S.players[pi].board.map((u, i) => {
    const isT = tg.some(t => t.side === pi && t.i === i);
    return `<div class="cell${isT ? ' tgt' : ''}" data-side="${pi}" data-i="${i}">${u ? unitHTML(u, pi, i) : ''}</div>`;
  }).join('');
}
// hosszú nevek automatikus kicsinyítése, hogy ne lógjanak ki a lap névsávjából
function fitNames(root) {
  for (const el of root.querySelectorAll('.uname, .card .name')) {
    if (el.dataset.fit === el.textContent || !el.clientWidth) continue;
    el.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
    const rg = document.createRange(), hid = getComputedStyle(el).overflow === 'hidden';
    const over = () => { rg.selectNodeContents(el); const b = rg.getBoundingClientRect(), e = el.getBoundingClientRect(), sc = e.width / el.offsetWidth || 1;
      return b.width > el.clientWidth * sc + 1 || (hid && b.height > el.clientHeight * sc + 1); };
    while (over() && fs > 6 && n++ < 20) { fs -= .5; el.style.fontSize = fs + 'px'; }
    el.dataset.fit = el.textContent;
  }
}
let fitQ = false;
new MutationObserver(() => { if (fitQ) return; fitQ = true; requestAnimationFrame(() => { fitQ = false; fitNames(document); }); }).observe(document.body, { childList: true, subtree: true });
document.fonts?.ready?.then(() => { document.querySelectorAll('[data-fit]').forEach(e => delete e.dataset.fit); fitNames(document); });

function render() {
  const myTurn = S.active === ME && !busy && S.winner == null;
  const hand = S.players[ME].hand;
  const selCard = ui.sel != null ? hand[ui.sel] : null;
  const all = selCard ? targetsFor(S, ME, selCard.id).filter(t => t.k !== 'none') : [];
  const tg = ui.pend != null ? pendNext(all) : all;
  setHTML($('#eBar'), heroBar(BOT)); setHTML($('#pBar'), heroBar(ME));
  $('#eBar').classList.remove('aim'); $('#pBar').classList.remove('aim');
  $('#eBar').classList.toggle('active', S.active === BOT && S.winner == null); $('#pBar').classList.toggle('active', S.active === ME && S.winner == null);
  $('#eBar').classList.toggle('tgt', tg.some(t => t.k === 'hero' && t.side === BOT));
  $('#pBar').classList.toggle('tgt', tg.some(t => t.k === 'hero' && t.side === ME));
  setHTML($('#eLane'), laneHTML(BOT, tg)); setHTML($('#pLane'), laneHTML(ME, tg));
  document.querySelectorAll('.picked').forEach(x => x.classList.remove('picked'));
  if (ui.pend) for (const q of ui.pend) { const pe = q.i === -1 ? barEl(q.side) : cellEl(q.side, q.i); pe && pe.classList.add('picked'); }
  const L = S.location, lc = L && CARD[L.id], loc = $('#loc');
  loc.className = 'locchip' + (L ? ' on' : ' empty');
  setHTML(loc, L ? `<span class="pin${ART[L.id] ? ' has-art' : ''}" style="--h:${hueOf(L.id)};${ART[L.id] ? `background-image:url('${artSrc(L.id, false)}');background-position:${ART[L.id].pos}` : ''}">${ART[L.id] ? '' : initials(lc.name)}</span><span><b>${lc.name}</b><small>${lc.text}</small></span>`
                    : `<span class="pin">–</span><span><b>Nincs helyszín</b><small>Játssz ki egy helyszínkártyát, ami mindkét félre hat.</small></span>`);
  const R = MAX_HALF / 2, rnd = Math.min(R, Math.ceil(S.half / 2));
  $('#round').textContent = `${rnd}. kör / ${R}`; $('#round').className = 'round' + (rnd >= R - 1 ? ' last' : '');
  const end = $('#endBtn');
  end.disabled = !myTurn; end.textContent = S.active === ME ? 'Kör vége' : 'Ellenfél…';
  const anyPlayable = hand.some((_, i) => canPlay(S, ME, i));
  end.classList.toggle('nudge', myTurn && !anyPlayable);
  setTimeout(tutCheck, 0);
  if (S.pvp) pvpOppDot();
  const eb = $('#emoBtn'); if (eb) eb.hidden = !S.pvp;
  // kéz
  const h = $('#hand');
  if (!ui.drag) {
  setHTML(h, hand.length ? hand.map((c, i) => cardHTML(c.id, {
    cost: cardCost(S, ME, c.id), foil: ownsFoil(c.id),
    cls: (ui.sel === i ? 'sel' : '') + (myTurn && canPlay(S, ME, i) ? ' ok' : myTurn ? ' dim' : ''),
    attrs: `data-hi="${i}" data-uid="${c.uid}" role="button" tabindex="0"` })).join('') : '<span class="hand-empty">Üres a kezed</span>');
  const cw = parseFloat(getComputedStyle(h.querySelector('.card') || h).getPropertyValue('--cw')) || 82;
  const n = hand.length, avail = h.clientWidth - 44;
  h.style.setProperty('--ov', n > 1 ? Math.max(-4, (n * cw - avail) / (n - 1)) + 'px' : '0px');
  // legyező: a lapok enyhe ívben, középről kifelé dőlnek
  const mid = (n - 1) / 2, step = n > 1 ? Math.min(5, 22 / (n - 1)) : 0;
  h.querySelectorAll('.card').forEach((el, k) => {
    const d = k - mid;
    el.style.setProperty('--r', (d * step).toFixed(2) + 'deg');
    el.style.setProperty('--y', (d * d * (n > 5 ? 1.3 : 2)).toFixed(1) + 'px');
  });
  syncHandFx();
  }
  // kiválasztás sáv
  const sb = $('#selbar');
  if (selCard && ui.pend != null && !ui.drag) {
    const c = CARD[selCard.id], needs = all.length > 0;
    const hint = ui.pend != null ? (c.tgt === 'two' ? 'Megvan az első célpont. Most koppints a másodikra.'
      : c.tgt === 'swap' ? 'Most koppints egy másik saját karakteredre (helycsere) vagy egy üres helyedre.'
      : c.playTgt === 'push' ? (ui.pend.length < 2 ? 'Válaszd ki, melyik ellenséges karaktert tolod arrébb.' : 'Most koppints az ellenfél egyik üres helyére, oda kerül.')
      : 'Most válaszd ki, melyik ellenséges karaktert küldöd vissza.')
      : c.type === 'char' ? 'Húzd vagy koppints egy üres helyre.' : c.type === 'item' ? (c.tgt === 'enemy' ? 'Húzd rá vagy koppints egy ellenséges karakterre.' : 'Húzd rá vagy koppints a saját karakteredre.')
      : c.tgt === 'enemyEmpty' ? 'Húzd vagy koppints az ellenfél egyik üres helyére.' : c.tgt === 'ownOrHero' ? 'Húzd rá egy saját karakteredre vagy a hősödre.' : needs ? 'Húzd rá vagy koppints egy ellenséges karakterre.'
      : 'Húzd fel a táblára, vagy nyomd meg a Kijátszás gombot.';
    sb.hidden = false;
    sb.innerHTML = `<div><b>${c.name}</b> · ${textHTML(c) || (c.type === 'char' ? `${c.atk} támadás, ${c.hp} élet.` : '')}${hint ? `<span class="hint">${hint}</span>` : ''}</div>
      <div class="acts"><button class="btn small" data-act="cancel">Mégse</button></div>`;
  } else sb.hidden = true;
}

// ---------- interakció ----------
$('#hand').onclick = e => {
  e.stopPropagation();
  if (performance.now() - ui.dragEnd < 250) return;
  if (performance.now() - (ui.tapAt || 0) < 500) return;   // koppintást már a pointerup kezelte
  const el = e.target.closest('[data-hi]'); if (!el || S.winner != null) return;
  openPreview(+el.dataset.hi, el);
};
function openPreview(i, el) {
  const h = S.players[ME].hand[i]; if (!h) return;
  if (ui.pend != null) { ui.sel = null; ui.pend = null; render(); }
  const why = whyNot(S, ME, i);
  const canDrag = !why && !busy && S.active === ME;
  openModal(cardHTML(h.id, { big: true, foil: ownsFoil(h.id), cost: cardCost(S, ME, h.id), attrs: canDrag ? 'data-drag="1"' : '' }),
    why ? `${why}.` : 'Kijátszáshoz húzd fel ezt a lapot a táblára (vagy a kezedből).', cardHelpHTML(h.id));
  if (canDrag) {
    const ov = $('#layer').lastElementChild, big = ov.querySelector('.card');
    big.addEventListener('pointerdown', ev => { ev.stopPropagation(); beginDrag(ev, i, el, { onLive: () => ov.remove() }); });
    big.addEventListener('click', ev => { if (performance.now() - ui.dragEnd < 250) ev.stopPropagation(); });
  }
}
$('#selbar').onclick = e => {
  e.stopPropagation();
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'cancel') { ui.sel = null; ui.pend = null; render(); }
  else if (b.dataset.act === 'play') doPlay(ui.sel, { k:'none' });
};
// célpont választása koppintással (két lépcsős célzásnál – Vera, Kancsó – előbb az első, aztán a második)
// többlépcsős célzás: egy célpont láncolata [t, t.t2, t.t2.t3]; ui.pend = az eddig kiválasztott lépések
const chainOf = t => { const c = [t]; while (c[c.length - 1].t2 || c[c.length - 1].t3) { const l = c[c.length - 1]; c.push(l.t2 || l.t3); } return c; };
const pendMatch = t => { const c = chainOf(t); return c.length > ui.pend.length && ui.pend.every((q, k) => c[k].side === q.side && c[k].i === q.i); };
function pendNext(all) { return all.filter(pendMatch).map(t => chainOf(t)[ui.pend.length]); }
function pickTarget(side, i) {
  const all = targetsFor(S, ME, S.players[ME].hand[ui.sel].id);
  if (ui.pend != null) {
    const hit = all.filter(t => { if (!pendMatch(t)) return false; const n = chainOf(t)[ui.pend.length]; return n.side === side && n.i === i; });
    if (!hit.length) return false;
    const done = hit.find(t => chainOf(t).length === ui.pend.length + 1);
    if (done) { doPlay(ui.sel, done); return true; }
    ui.pend = [...ui.pend, { side, i }]; render(); return true;
  }
  const m = all.filter(t => t.side === side && t.i === i && (i === -1 ? t.k === 'hero' : t.k !== 'hero'));
  if (m.length && m[0].t2) { ui.pend = [{ side, i }]; render(); return true; }
  if (m.length) { doPlay(ui.sel, m[0]); return true; }
  return false;
}
$('#scr-game').addEventListener('click', e => {
  if (e.target.closest('#hand,#selbar,#endBtn')) return;
  if (performance.now() - ui.dragEnd < 250) return;
  const db = e.target.closest('[data-deck]');
  if (db) { e.stopPropagation(); const n = S.players[+db.dataset.deck].deck.length;
    toast(`${+db.dataset.deck === ME ? 'A paklidban' : 'Az ellenfél paklijában'} ${n ? `még ${n} lap van` : 'nincs több lap – minden húzás sebez'}`); return; }
  const gb = e.target.closest('[data-grave]');
  if (gb) { e.stopPropagation(); openGrave(+gb.dataset.grave); return; }
  const cell = e.target.closest('.cell');
  if (ui.sel != null) {
    if (cell) {
      const side = +cell.dataset.side, i = +cell.dataset.i;
      const all = targetsFor(S, ME, S.players[ME].hand[ui.sel].id);
      if (pickTarget(side, i)) return;
    }
    const hb = e.target.closest('.hbar.tgt');
    if (hb && pickTarget(hb === $('#pBar') ? ME : BOT, -1)) return;
    ui.sel = null; ui.pend = null; render(); return;
  }
  // részletek
  if (cell) {
    const u = S.players[+cell.dataset.side].board[+cell.dataset.i]; if (!u) return;
    if (u.hidden && +cell.dataset.side !== ME) { openModal('<div class="card big backcard"></div>', 'Rejtett lap', `<dl class="help"><div><dt>${KW_HELP.sneak[0]}</dt><dd>${KW_HELP.sneak[1]}</dd></div></dl>`); return; }
    const side = +cell.dataset.side, foe = [...(u.foe || [])];
    // a karakteren lévő eszközök kis lapként, koppintásra nagyban (ki tette rá: gazdája vagy az ellenfele)
    const gear = u.items.map(id => { const k = foe.indexOf(id), byFoe = k >= 0; if (byFoe) foe.splice(k, 1);
      const owner = byFoe ? 1 - side : side;
      return `<button class="gear-card" data-gear="${id}" data-own="${owner}">${cardHTML(id, { foil: foilOf(owner, id) })}<small>${owner === ME ? 'tőled' : 'az ellenféltől'}</small></button>`; }).join('');
    openModal(cardHTML(u.id, { big: true, foil: foilOf(side, u.id) }), `Most: ${effAtk(S, side, +cell.dataset.i)} támadás, ${u.hp}/${u.maxHp} élet${u.shield ? ', Pajzs' : ''}${u.stun ? `, bénult még ${u.stun} körig` : ''}`,
      (gear ? `<div class="gear-box"><div class="gear-lbl">Eszközök rajta (${u.items.length}) · koppints a részletekért</div><div class="gear-row">${gear}</div></div>` : '') + cardHelpHTML(u.id, u));
    const ov = $('#layer').lastElementChild;
    ov.querySelector('.gear-row')?.addEventListener('click', ev => { const g = ev.target.closest('[data-gear]'); if (!g) return; ev.stopPropagation();
      openModal(cardHTML(g.dataset.gear, { big: true, foil: foilOf(+g.dataset.own, g.dataset.gear) }), `${CARD[u.id].name} karakteren · ${+g.dataset.own === ME ? 'te tetted rá' : 'az ellenfél tette rá'}`, cardHelpHTML(g.dataset.gear)); });
  }
  const hb = e.target.closest('[data-hero]');
  if (hb) { const gp = heroGoldOf(+hb.dataset.hero); openModal(heroCardHTML(HERO[S.players[+hb.dataset.hero].heroId], { big: true, foil: heroFaOf(+hb.dataset.hero), gold: gp }), (+hb.dataset.hero === ME ? 'A te hősöd' : 'Az ellenfél hőse') + (gp ? ' · ✦ Arany' : '')); }
  if (e.target.closest('#loc') && S.location) openModal(cardHTML(S.location.id, { big: true, foil: foilOf(S.location.owner, S.location.id) }), `Kijátszotta: ${S.location.owner === ME ? 'te' : 'az ellenfél'}`, cardHelpHTML(S.location.id));
});
$('#hand').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.hi) { e.preventDefault(); e.target.click(); } });

async function doPlay(hi, t) {
  busy = true; ui.sel = null; ui.pend = null;
  const id = S.players[ME].hand[hi].id;
  if (S.pvp) pvpSeed();
  await runFx(() => playCard(S, ME, hi, t));
  if (S.pvp) { unseedRng(); pvpPush('play', { hi, t, id }); }
  busy = false; render();
  if (S.winner != null) endMatch();
}
$('#flagBtn').onclick = () => {
  if (!S || S.winner != null) return;
  if (S.tut?.onboard) return toast('Előbb játszd végig a gyakorló meccset – utána jön a főmenü 🙂');
  if (busy) return toast('Várd meg, amíg lezajlik a lépés');
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal"><h3>Meccs</h3><p class="live">${S.pvp ? 'Ha kilépsz, a meccs megmarad: a PvP menüben bármikor folytathatod.' : S.tut ? 'Kilépsz az oktatóból?' : 'Ha kilépsz, a bot elleni meccs elvész.'}</p>
    <button class="btn primary" data-f="stay">Folytatom</button><button class="btn" data-f="leave">${S.pvp ? 'Kilépés (a meccs megmarad)' : 'Kilépés a menübe'}</button>${S.pvp ? '<button class="btn ghost" data-f="give">Feladom</button>' : ''}</div>`;
  o.onclick = e => { const b = e.target.closest('[data-f]'); if (!b && e.target !== o) return; o.remove(); if (!b) return;
    if (b.dataset.f === 'leave') { if (S.pvp) return pvpLeave(); if (S.tut) tutHide(); busy = false; S = null; renderMenuFan(); renderProfileBar(); show('scr-menu'); }
    if (b.dataset.f === 'give') pvpForfeit(); };
  $('#layer').appendChild(o);
};
$('#endBtn').onclick = async () => {
  if (busy || S.active !== ME || S.winner != null) return;
  const st = tutStep();
  if (st && st.kind !== 'end') { toast('Előbb kövesd a sárga buborékot'); return; }
  if (st) tutAdvance();
  busy = true; ui.sel = null; render();
  if (S.pvp) pvpSeed();
  await resolveEnd();
  if (S.pvp) { unseedRng(); pvpPush('end'); busy = false; render(); if (S.winner != null) return endMatch(); toast('Az ellenfél jön – szólunk, ha lépett'); return; }
  if (S.winner != null) { busy = false; render(); return endMatch(); }
  await botTurn();
};

// A támadó lap nekilendül a célpontnak (szemben álló karakter vagy az ellenfél hőse), becsapódik, majd visszatér
function burstAt(x, y, big) {
  const b = document.createElement('div'); b.className = 'impact' + (big ? ' big' : '');
  b.style.left = x + 'px'; b.style.top = y + 'px';
  $('#layer').appendChild(b); setTimeout(() => b.remove(), 600);
}
async function attackAnim(pi, i, u) {
  const el = unitAt(pi, i); if (!el) { await runFx(() => attackLane(S, i)); return; }
  // Laszy: előre eldől, hogy mellé üt-e, így a saját célpontja felé lendül
  const mf = u.id === 'c_laszy' ? (u.nextMisfire = laszyRoll(S, pi, i)) : null;
  if (mf) return misfireAnim(pi, i, el, mf);
  const foe = other(pi), tj = tauntAt(S, foe), j = tj >= 0 ? tj : i, opp = S.players[foe].board[j];
  const toHero = tj < 0 && (!opp || u.id === 'c_nyiti');
  const target = toHero ? barEl(foe) : unitAt(foe, j);
  const a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
  const dir = pi === ME ? -1 : 1;
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
  // megállás a célpont szélén
  const edgeY = pi === ME ? b.bottom - a.top - a.height * 0.15 : b.top - a.bottom + a.height * 0.15;
  const dy = toHero ? edgeY : (pi === ME ? b.bottom - a.top - a.height * 0.35 : b.top - a.bottom + a.height * 0.35);
  el.style.zIndex = 30; el.parentElement.style.zIndex = 30;
  const times = u.id === 'c_zana' ? 2 : 1;
  const hitX = a.left + a.width / 2 + dx, hitY = pi === ME ? (toHero ? b.bottom : b.bottom - b.height * 0.2) : (toHero ? b.top : b.top + b.height * 0.2);
  for (let k = 0; k < times; k++) {
    // felhúzás
    await el.animate([{ transform: 'none' }, { transform: `translateY(${-dir * 14}px) scale(1.1) rotate(${dir * -3}deg)` }],
      { duration: 200, easing: 'cubic-bezier(.3,0,.6,1)', fill: 'forwards' }).finished;
    // roham
    await el.animate([{ transform: `translateY(${-dir * 14}px) scale(1.1) rotate(${dir * -3}deg)` },
                      { transform: `translate(${dx}px,${dy}px) scale(1.12) rotate(${dir * 4}deg)` }],
      { duration: 170, easing: 'cubic-bezier(.6,0,1,.7)', fill: 'forwards' }).finished;
    burstAt(hitX, hitY, toHero);
    if (toHero) fx($('#app'), 'fx-quake');
    const back = el.animate([{ transform: `translate(${dx}px,${dy}px) scale(1.12) rotate(${dir * 4}deg)` },
                             { transform: `translate(${dx * .9}px,${dy * .78}px) scale(1.05)`, offset: .25 },
                             { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    if (k < times - 1) { target.animate([{ transform: 'none' }, { transform: `translateY(${-dir * -10}px)` }, { transform: 'none' }], { duration: 260 }); await back.finished; }
    else { await Promise.all([runFx(() => attackLane(S, i)), back.finished]); }
  }
}

// Félreütés: megtántorodik, aztán a saját társa vagy a saját hőse felé csapódik
async function misfireAnim(pi, i, el, mf) {
  const target = mf.i === -1 ? barEl(pi) : unitAt(pi, mf.i);
  if (!target) { await runFx(() => attackLane(S, i)); return; }
  const a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  el.style.zIndex = 30; el.parentElement.style.zIndex = 30;
  // részeg tántorgás
  await el.animate([{ transform: 'none' }, { transform: 'rotate(-9deg) translateX(-6px)' }, { transform: 'rotate(8deg) translateX(6px)' }, { transform: 'rotate(-5deg)' }, { transform: 'scale(1.1)' }],
    { duration: 420, easing: 'ease-in-out', fill: 'forwards' }).finished;
  await el.animate([{ transform: 'scale(1.1)' }, { transform: `translate(${dx * .75}px,${dy * .75}px) scale(1.12) rotate(${dx > 0 ? 8 : -8}deg)` }],
    { duration: 190, easing: 'cubic-bezier(.6,0,1,.7)', fill: 'forwards' }).finished;
  burstAt(b.left + b.width / 2, b.top + b.height / 2, mf.i === -1);
  if (mf.i === -1) fx($('#app'), 'fx-quake');
  const back = el.animate([{ transform: `translate(${dx * .75}px,${dy * .75}px) scale(1.12)` }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
  await Promise.all([runFx(() => attackLane(S, i)), back.finished]);
}

async function resolveEnd() {
  const pi = S.active;
  for (let i = 0; i < LANES; i++) {
    if (S.winner != null) break;
    const u = S.players[pi].board[i];
    if (!canAttack(u) || (u.id === 'c_ati' && !atiFree(S, pi, i))) continue;
    await attackAnim(pi, i, u);
    await sleep(140);
  }
  await runFx(() => finishTurn(S));
}

// Az ellenfél lapja beúszik középre, egy ideig látszik, célpont kijelölve, majd a célra repül
function flyTarget(id, tg) {
  const c = CARD[id];
  if (tg && (tg.k === 'slot' || tg.k === 'unit' || tg.k === 'eslot')) return cellEl(tg.side, tg.i);
  if (c.type === 'loc') return $('#loc');
  if (tg && tg.k === 'hero') return barEl(tg.side);
  if (id === 'a_mangos') return $('#eBar');
  return null;
}
async function showPlayed(id, tg) {
  const secret = !!CARD[id].sneak;
  const back = document.createElement('div'); back.className = 'played';
  back.innerHTML = `<div class="wrap"><span class="tag">${S.pvp ? escH(S.names?.[BOT] || 'Az ellenfél') : HERO[S.players[BOT].heroId].name} ${secret ? 'lerakott egy rejtett lapot' : 'kijátszotta'}</span><span class="flip rev"><span class="flip-in"><span class="face back"></span><span class="face front">${cardHTML(id, { big: true, foil: foilOf(BOT, id) })}</span></span></span>${foilOf(BOT, id) && !CARD[id].sneak ? '<span class="fa-flash">✨ Full Art ✨</span>' : ''}<span class="skip">Koppints a folytatáshoz</span></div>`;
  $('#layer').appendChild(back);
  const wrap = back.querySelector('.wrap');
  const eb = $('#eBar').getBoundingClientRect(), wr = wrap.getBoundingClientRect();
  const dy = (eb.top + eb.height / 2) - (wr.top + wr.height / 2);
  back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'forwards' });
  await wrap.animate([{ transform: `translateY(${dy}px) scale(.3) rotate(-10deg)`, opacity: 0 },
                      { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'forwards' }).finished;
  if (secret) back.querySelector('.face.front').innerHTML = '';
  if (!secret) await back.querySelector('.flip-in').animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], { duration: 480, easing: 'cubic-bezier(.3,.1,.3,1.2)', fill: 'forwards' }).finished;
  await Promise.race([sleep(1500), new Promise(r => back.addEventListener('pointerdown', r, { once: true }))]);
  const aims = [flyTarget(id, tg)];
  if (tg && tg.t2) aims.push(tg.t2.k === 'hero' ? barEl(tg.t2.side) : cellEl(tg.t2.side, tg.t2.i));
  aims.forEach(a => a && a.classList.add('aim'));
  const dest = aims[aims.length - 1];
  back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'forwards' });
  if (dest) {
    const r = dest.getBoundingClientRect(), w2 = wrap.getBoundingClientRect();
    const dx = (r.left + r.width / 2) - (w2.left + w2.width / 2), dy2 = (r.top + r.height / 2) - (w2.top + w2.height / 2);
    await wrap.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy2}px) scale(.22)`, opacity: .35 }],
                       { duration: 380, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }).finished;
    await sleep(260);
  } else {
    await wrap.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 300, fill: 'forwards' }).finished;
  }
  back.remove();
}

async function botTurn() {
  busy = true; render(); await sleep(700);
  let ch;
  const plan = S.tut && TUT_BOT[S.players[BOT].turns] ? [...TUT_BOT[S.players[BOT].turns]] : null;   // oktató: fix ellenfél-lépések
  const nextMove = () => { if (!plan) return botChoose(S); const m = plan.shift(); if (!m) return null;
    const hi = S.players[BOT].hand.findIndex(c => c.id === m[0]); return hi < 0 ? null : { hi, t: { ...m[1], side: BOT } }; };
  while (S.winner == null && (ch = nextMove())) {
    await showPlayed(S.players[BOT].hand[ch.hi].id, ch.t);
    await runFx(() => playCard(S, BOT, ch.hi, ch.t));
    await sleep(350);
  }
  if (S.winner == null) await resolveEnd();
  busy = false; render();
  if (S.winner != null) return endMatch();
  toast('Te jössz!');
}

// ---------- húzás-animáció ----------
// Az új lap hátlappal kirepül a paklidból, a helyére ér, és ott felfordul.
function syncHandFx() {
  const hand = S.players[ME].hand, uids = hand.map(c => c.uid);
  const fresh = uids.filter(u => !(ui.handSeen && ui.handSeen.has(u)) && !ui.flying.has(u));
  ui.handSeen = new Set(uids);
  fresh.forEach((u, k) => flyDraw(u, k));
  document.querySelectorAll('#hand .card[data-uid]').forEach(el => { if (ui.flying.has(+el.dataset.uid)) el.style.opacity = '0'; });
  // ellenfél húzása: egy hátlap kiugrik a paklijából
  const bn = S.players[BOT].hand.length;
  if (ui.botHandN != null && bn > ui.botHandN) for (let k = 0; k < bn - ui.botHandN; k++) flyBotDraw(k);
  ui.botHandN = bn;
}
function drawGhost(from) {
  const g = document.createElement('div'); g.className = 'drawghost';
  g.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;
  $('#layer').appendChild(g); return g;
}
async function flyDraw(uid, k) {
  ui.flying.add(uid);
  await sleep(40 + k * 150);
  const pile = $('#pBar .deckpile'), el = $(`#hand .card[data-uid="${uid}"]`);
  if (!pile || !el) { ui.flying.delete(uid); if (el) el.style.opacity = ''; return; }
  const a = pile.getBoundingClientRect(), b = el.getBoundingClientRect(), g = drawGhost(a);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), sc = b.width / a.width;
  await g.animate([
    { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: .3 },
    { transform: `translate(${dx * .45}px,${dy * .45 - 70}px) scale(${(1 + sc) / 2 * 1.15}) rotate(-10deg)`, opacity: 1, offset: .55 },
    { transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(0deg)`, opacity: 1 }],
    { duration: 520, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }).finished;
  g.remove(); ui.flying.delete(uid);
  const cur = $(`#hand .card[data-uid="${uid}"]`);
  if (cur) {
    cur.style.opacity = '';
    const m = getComputedStyle(cur).transform, base = m === 'none' ? '' : m;
    cur.animate([{ transform: `${base} rotateY(90deg)`, filter: 'brightness(1.6)' }, { transform: `${base} rotateY(0deg)`, filter: 'brightness(1)' }], { duration: 240, easing: 'ease-out' });
  }
}
async function flyBotDraw(k) {
  await sleep(40 + k * 150);
  const pile = $('#eBar .deckpile'), to = $('#eBar .counts'); if (!pile || !to) return;
  const a = pile.getBoundingClientRect(), b = to.getBoundingClientRect(), g = drawGhost(a);
  const dx = b.left + 10 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  await g.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx * .5}px,${dy + 40}px) scale(1.2) rotate(-8deg)`, opacity: 1, offset: .5 },
    { transform: `translate(${dx}px,${dy}px) scale(.4)`, opacity: 0 }], { duration: 560, easing: 'ease-in-out', fill: 'forwards' }).finished;
  g.remove();
}

function startMatch(heroId, deckId) {
  const others = HEROES.filter(h => h.id !== heroId);
  const bh = others[Math.floor(Math.random() * others.length)].id;
  const bd = DECK_OF(bh) || Object.keys(DECKS)[0];   // a bot a saját hősének kezdőpaklijával játszik
  const first = Math.random() < .5 ? ME : BOT;
  const mine = (allDecks().find(d => d.id === deckId) || allDecks()[0]).list;
  S = newGame(heroId, { ...mine }, bh, bd, first, { mulligan: true }); S.events = [];
  ui.sel = null; busy = true; ui.handSeen = null; ui.botHandN = null; ui.flying = new Set(); show('scr-game');
  $('#layer').innerHTML = ''; render();
  setTimeout(() => showMulligan(first), 250 + S.players[ME].hand.length * 150 + 450);
}

// ---------- kezdő kéz cseréje (mint a Hearthstone-ban) ----------
function showMulligan(first) {
  const hand = S.players[ME].hand, pick = new Set();
  const o = document.createElement('div'); o.className = 'overlay mull';
  const look = id => `<span class="mull-look" data-look="${id}" role="button" aria-label="Megnézem">🔍 Megnézem</span>`;
  const cardsHTML = () => hand.map((c, i) => `<div class="mull-slot"><button class="mull-c${pick.has(i) ? ' swap' : ''}" data-mi="${i}" data-uid="${c.uid}">${cardHTML(c.id, { foil: ownsFoil(c.id) })}<span class="mull-x">Csere</span></button>${look(c.id)}</div>`).join('');
  o.innerHTML = `<div class="mull-box">
      <h2>Kezdő kéz</h2>
      <p>${first === ME ? '<b>Te kezdesz.</b>' : '<b>Az ellenfél kezd.</b>'}<br>Koppints azokra a lapokra, amiket visszakevernél a pakliba – helyettük újakat húzol (csak egyszer lehet). A <b>🔍 Megnézem</b> gombbal nagyban látod, mit csinál a lap.</p>
      <div class="mull-cards">${cardsHTML()}</div>
      <button class="btn primary" id="mullOk">Megtartom</button></div>`;
  $('#layer').appendChild(o);
  o.querySelector('.mull-box').animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out' });
  const ok = o.querySelector('#mullOk');
  o.querySelector('.mull-cards').addEventListener('click', e => {
    const lk = e.target.closest('[data-look]');
    if (lk) { const id = lk.dataset.look; openModal(cardHTML(id, { big: true, foil: ownsFoil(id) }), RAR[CARD[id].rarity], cardHelpHTML(id)); return; }
    const b = e.target.closest('[data-mi]'); if (!b || ok.disabled) return;
    const i = +b.dataset.mi; pick.has(i) ? pick.delete(i) : pick.add(i); b.classList.toggle('swap', pick.has(i));
    ok.textContent = pick.size ? `${pick.size} lap cseréje` : 'Megtartom';
  });
  ok.onclick = async () => {
    ok.disabled = true;
    const els = [...o.querySelectorAll('.mull-c')];
    if (pick.size) {
      // a kiválasztott lapok lecsúsznak, a helyükre újak fordulnak fel
      await Promise.all([...pick].map(i => els[i].animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(60px) scale(.8)', opacity: 0 }], { duration: 320, easing: 'ease-in', fill: 'forwards' }).finished));
      const keep = hand.filter((_, i) => !pick.has(i)).map(c => c.uid);
      mulligan(S, ME, [...pick]);
      const fresh = S.players[ME].hand.filter(c => !keep.includes(c.uid));
      [...pick].sort((a, b) => a - b).forEach((i, k) => {
        const c = fresh[k]; if (!c) return;
        const el = els[i]; el.getAnimations().forEach(a => a.cancel()); el.classList.remove('swap'); el.classList.add('fresh'); const lk = el.parentElement.querySelector('.mull-look'); if (lk) lk.dataset.look = c.id;
        el.innerHTML = `<span class="mull-flip"><span class="mf-back"></span><span class="mf-front">${cardHTML(c.id, { foil: ownsFoil(c.id) })}</span></span><span class="mull-new">Új</span>`;
        el.animate([{ opacity: 0, transform: 'translateY(-40px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: k * 120, fill: 'backwards' });
        el.querySelector('.mull-flip').animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], { duration: 480, delay: 260 + k * 120, easing: 'ease-out', fill: 'backwards' });
      });
      await sleep(900 + pick.size * 120);
      // az új lapok addig maradnak láthatók, amíg a játékos tovább nem lép (közben meg is nézheti őket)
      o.querySelector('p').innerHTML = '<b>Ezeket kaptad helyettük</b> (Új jelölés). A 🔍 gombbal megnézheted őket.';
      ok.textContent = 'Kezdjük!'; ok.disabled = false;
      await new Promise(r => { ok.onclick = () => { ok.disabled = true; r(); }; });
    } else mulligan(S, ME, []);
    if (S.pvp) {   // PvP: elküldjük a cseréket, és megvárjuk az ellenfelet
      await pvpSendMull([...pick]);
      o.querySelector('p').innerHTML = '<b>Várakozás az ellenfélre…</b><br>Amint ő is eldöntötte, mit cserél, indul a meccs. Addig nyugodtan kiléphetsz, a meccs megmarad.';
      ok.hidden = true;
      const back = document.createElement('button'); back.className = 'btn'; back.textContent = 'Vissza a PvP-hez'; back.onclick = () => { o.remove(); pvpLeave(); };
      o.querySelector('.mull-box').appendChild(back);
      return;
    }
    botMulligan(S, BOT);
    await o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished;
    o.remove();
    ui.handSeen = new Set(S.players[ME].hand.map(c => c.uid));   // a csere-ablakban már láttad őket: ne repüljenek be újra
    ui.botHandN = S.players[BOT].hand.length;
    beginGame(S); busy = false; render();
    if (first === ME) toast('Te kezdesz!');
    else { toast('Az ellenfél kezd'); setTimeout(botTurn, 900); }
  };
}

function endMatch() {
  if (S.tut) { tutHide(); return tutFinish(); }
  if (S.pvp) return pvpEndMatch();
  const w = S.winner, win = w === ME, draw = w === 'draw';
  const title = draw ? 'Döntetlen' : win ? 'Győzelem!' : 'Vereség';
  const why = S.reason === 'time'
    ? `Letelt a ${MAX_HALF / 2} kör. Életek: te ${S.players[ME].hp}, ellenfél ${S.players[BOT].hp}.`
    : draw ? 'Mindkét hős egyszerre dőlt ki.' : win ? 'Az ellenfél hőse kiütve.' : 'A hősöd kiütve.';
  const aw = awardMatch(draw ? 'draw' : win ? 'win' : 'loss');
  const qd = S.qDone ? [] : questsOnMatch({ win, hero: S.players[ME].heroId, ...(S.qs || { actions: 0, items: 0, chars: 0, locs: 0, big: 0, heroDmg: 0, kills: 0 }) });
  const px = S.qDone ? null : passOnMatch(draw ? 'draw' : win ? 'win' : 'loss', qd);
  S.qDone = true;
  const reward = (aw ? `<div class="reward"><span class="coin" aria-hidden="true"></span><b>+${aw.gain}</b><small>${aw.capped ? 'Elérted a mai coin-plafont' : 'coin'} · ma ${aw.today}/${ECON.dailyCap}</small></div>` : '')
    + qd.map(q => `<div class="q-done-pop">✓ Küldetés teljesítve: <b>${q.txt}</b><em>+${q.rew}</em></div>`).join('')
    + (px ? `<div class="sp-pop${px.up ? ' up' : ''}"><b>+${px.gain} XP</b> Season Pass${px.up ? ` · <em>Szintlépés! ${px.lv}. szint – vedd át a jutalmat</em>` : ` · ${px.lv}. szint (${px.inLv}/${PASS_XP.perLevel})`}</div>` : '');
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal result${win ? '' : ' lose'}"><h2>${title}</h2><p>${why}</p>${reward}
    <div class="row"><button class="btn" data-r="menu">Menü</button><button class="btn primary" data-r="again">Új meccs</button></div></div>`;
  o.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; o.remove();
    if (b.dataset.r === 'again') { const d = allDecks().find(x => x.id === ui.deck); if (d && !deckIssue(d)) startMatch(d.hero, ui.deck); else { renderPick(); show('scr-pick'); } } else { renderMenuFan(); renderProfileBar(); show('scr-menu'); } };
  setTimeout(() => $('#layer').appendChild(o), 700);
}
window.addEventListener('resize', () => { if (S && !$('#scr-game').hidden) render(); });


// ---------- húzás a kézből (Hearthstone-stílus) ----------
function dropOnCell(hi, side, i) {
  const all = targetsFor(S, ME, S.players[ME].hand[hi].id);
  const m = all.filter(t => t.side === side && t.i === i);
  if (!m.length) return false;
  if (m[0].t2) { ui.pend = [{ side, i }]; return 'pend'; }
  doPlay(hi, m[0]); return 'played';
}
function cellUnder(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest('.cell.tgt, .hbar.tgt');
}
$('#hand').addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-hi]');
  if (!el || busy || S.active !== ME || S.winner != null || e.button > 0) return;
  beginDrag(e, +el.dataset.hi, el, { peek: true });
});
function beginDrag(e, hi, el, opt = {}) {
  if (busy || S.active !== ME || S.winner != null || e.button > 0) return;
  ui.drag = null;
  const start = { x:e.clientX, y:e.clientY, hi, el, id:e.pointerId, live:false };
  // nyomva tartáskor a lap kinagyítva kiemelkedik (mint a Hearthstone-ban)
  if (opt.peek) start.peekT = setTimeout(() => el.classList.add('peek'), 140);
  const move = ev => {
    if (ev.pointerId !== start.id) return;
    if (!start.live) {
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 10) return;
      clearTimeout(start.peekT); el.classList.remove('peek');
      const why = whyNot(S, ME, start.hi);
      if (why) { toast(why); return stop(); }
      start.live = true;
      opt.onLive && opt.onLive();
      ui.sel = start.hi; ui.pend = null;
      ui.drag = start;
      const g = start.el.cloneNode(true); g.className += ' ghost'; g.classList.remove('sel', 'ok');
      document.body.appendChild(g); start.ghost = g;
      start.el.classList.add('lifted');
      start.needsTarget = targetsFor(S, ME, S.players[ME].hand[start.hi].id).some(t => t.k !== 'none');
      render();
      if (!start.needsTarget) { $('#eLane').classList.add('playzone'); $('#pLane').classList.add('playzone'); }
    }
    ev.preventDefault();
    start.ghost.style.left = ev.clientX + 'px'; start.ghost.style.top = ev.clientY + 'px';
    const over = start.needsTarget ? cellUnder(ev.clientX, ev.clientY) : null;
    if (over !== start.over) { start.over && start.over.classList.remove('over'); over && over.classList.add('over'); start.over = over; }
    if (!start.needsTarget) {
      const hot = ev.clientY < $('#hand').getBoundingClientRect().top - 10;
      $('#eLane').classList.toggle('hot', hot); $('#pLane').classList.toggle('hot', hot);
    }
  };
  const up = ev => {
    if (ev.pointerId !== start.id) return;
    const live = start.live;
    stop();
    if (!live) {
      if (opt.peek && ev.type === 'pointerup' && S.winner == null) { ui.tapAt = performance.now(); openPreview(start.hi, start.el); }
      return;
    }
    ui.dragEnd = performance.now();
    let res = false;
    if (ev.type === 'pointerup') {
      if (start.needsTarget) {
        const c = cellUnder(ev.clientX, ev.clientY);
        if (c) res = c.classList.contains('hbar') ? dropOnCell(start.hi, c === $('#pBar') ? ME : BOT, -1) : dropOnCell(start.hi, +c.dataset.side, +c.dataset.i);
      } else if (ev.clientY < $('#hand').getBoundingClientRect().top - 10) { doPlay(start.hi, { k:'none' }); res = 'played'; }
    }
    if (res === 'pend') render();
    else if (!res) { ui.sel = null; ui.pend = null; render(); }
  };
  const stop = () => {
    clearTimeout(start.peekT); start.el.classList.remove('peek');
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    start.ghost && start.ghost.remove(); start.over && start.over.classList.remove('over');
    ['#eLane', '#pLane'].forEach(q => $(q).classList.remove('playzone', 'hot'));
    ui.drag = null;
  };
  window.addEventListener('pointermove', move, { passive:false });
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}
