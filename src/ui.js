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
  invis: ['Láthatatlan', 'A támadások átmennek rajta: aki vele szemben áll, mintha üres lenne a hely, az ellenfél hősét üti. Támadással nem lehet sebezni vagy megölni (akciókkal igen).'],
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
  if (c.invis) add('invis');
  if (c.rarity === 'l') add('legend');
  if (c.finisher) rows.unshift(['Kánon esemény', `Ultra erős lap, csak ${HERO[c.hero].name} paklijába tehető (a jobb felső sarokban az ő portréja). Kijátszáskor elsötétül a pálya, és különleges bevonulással érkezik.`]);
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
  if (c.invis) parts.push('<b>Láthatatlan</b>.');
  if (c.text) parts.push(c.text);
  return parts.join(' ');
}
// Keretválasztás egy helyen. Elsőbbség: Kánon esemény → arany → Full Art → alap
function frameKind(c, o) { return c.finisher ? 'kanon' : o.gold ? 'gold' : o.foil ? 'foil' : 'base'; }
function cardHTML(id, o = {}) {
  const c = CARD[id], cost = o.cost ?? c.cost;
  if (c.foilOnly && !o.foil) o = { ...o, foil: true };   // csak Full Artban létező lap
  const fk = frameKind(c, o);
  const tl = textHTML(c).replace(/<[^>]+>/g, '').length, tlc = tl > 150 ? ' tl-l tl-xl' : tl > 95 ? ' tl-l' : tl > 62 ? ' tl-m' : '';
  const fcls = fk === 'kanon' ? (o.foil ? ' framed xf xf-kanon xf-kanonfa kholo' : ' framed xf xf-kanon') + tlc : fk === 'foil' ? ' foil' : ' framed' + tlc;
  return `<div class="card ${TYPE[c.type][1]}${c.finisher ? ' kanon' : ''}${c.variantOf ? ' variant' : ''}${o.big ? ' big' : ''}${fcls}${o.cls ? ' ' + o.cls : ''}" style="--h:${hueOf(id)}" ${o.big ? `data-rar="${c.rarity}"` : ''} ${o.attrs || ''}>
    <div class="cframe">
      ${ART[id] ? `<div class="art has-art" style="${artStyle(id, o.big)}"></div>`
        : `<div class="art"><span class="mono">${initials(c.name)}</span>${o.big && !o.foil ? '<span class="artnote">Illusztráció helye</span>' : ''}</div>`}
      <div class="ctype">${c.finisher ? '<i class="ic-kanon" aria-hidden="true"></i>Kánon esemény' : TYPE[c.type][0]}${c.drink ? ' · Ital' : ''}<i class="rar r-${c.rarity}" title="${RAR[c.rarity]}"></i></div>
      ${c.finisher ? `<i class="kanon-hero" title="${HERO[c.hero].name}" style="--h:${HERO[c.hero].hue};${ART[c.hero] ? `background-image:url('${artSrc(c.hero, false)}');background-position:${ART[c.hero].av || '50% 15%'}` : ''}">${ART[c.hero] ? '' : initials(HERO[c.hero].name)}</i>` : ''}
      ${c.type !== 'char' && !o.big && !c.finisher ? `<div class="tribbon">${TYPE[c.type][0]}${c.drink ? '<i class="drk">Ital</i>' : ''}</div>` : ''}
      <div class="name${c.name.length > 16 ? ' long' : ''}${longWord(c.name) > 11 ? ' xl' : ''}">${c.name}</div>${c.variantOf ? '<i class="var-ribbon"><b>✦ Ritka változat</b><span>✦ Változat</span></i>' : ''}
      <div class="txt"><span>${textHTML(c)}</span></div>
    </div>
    ${o.big ? `<div class="ctype-below">${c.finisher ? '<i class="ic-kanon" aria-hidden="true"></i>Kánon esemény' : TYPE[c.type][0]}${c.drink ? ' · Ital' : ''}</div>` : ''}
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
  g_bence: { src:'art/g_bence.webp', av:'55% 18%', pos:'55% 18%', port:'55% 9%' },
  g_milo:  { src:'art/g_milo.webp',  av:'46% 24%', pos:'46% 23%', port:'46% 20%' },
  g_david: { src:'art/g_david.webp', av:'62% 22%', pos:'62% 22%', port:'62% 18%' },
  c_sasi:{ src:'art/toma.webp', pos:'50% 14%' },   // a karakterlap neve mostantól Toma (a hős Sasi marad)
  c_pifti:{ src:'art/pifti.webp', pos:'66% 16%' },
  c_gyuri:{ src:'art/gyuri.webp', pos:'60% 17%' },
  c_rebi: { src:'art/rebi.webp', pos:'76% 36%' },
  c_zoli: { src:'art/zoli.webp', pos:'64% 30%' },
  c_zoli2: { src:'art/zoli2.webp', av:'62% 22%', pos:'62% 22%' },
  c_fogel2: { src:'art/fogel2.webp', av:'50% 18%', pos:'50% 18%' },
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
  c_norbi:  { src:'art/norbi.webp', pos:'42% 18%' },
  a_kor: { src:'art/viz.webp', av:'50% 45%', pos:'50% 40%' },
  a_szulinap: { src:'art/szulinap.webp', av:'50% 40%', pos:'50% 42%' },
  c_davidsofor: { src:'art/davidsofor.webp', av:'35% 20%', pos:'35% 20%' },
  c_lacifinale: { src:'art/lacifinale.webp', av:'48% 16%', pos:'48% 16%' },
  i_ing: { src:'art/ing.webp', av:'50% 40%', pos:'50% 35%' },
  c_kriszrantott: { src:'art/kriszrantott.webp', av:'58% 22%', pos:'56% 22%' },
  a_rantott: { src:'art/rantott.webp', av:'45% 40%', pos:'50% 38%' },
  c_tomiparti: { src:'art/tomiparti.webp', av:'47% 26%', pos:'47% 24%' },
  c_amszterdam: { src:'art/amszterdam.webp', av:'60% 22%', pos:'58% 24%' },
  c_barnaelet: { src:'art/barnaelet.webp', av:'54% 26%', pos:'54% 26%' },
  f_bender: { src:'art/f_bender.webp', av:'55% 40%', pos:'55% 34%' },   // Kánon esemény lapok
  f_egyutt: { src:'art/f_egyutt.webp', av:'50% 28%', pos:'50% 26%' },
  f_jbl:    { src:'art/f_jbl.webp', av:'40% 30%', pos:'38% 34%' },
  c_arnyek: { src:'art/arnyek.webp', av:'50% 14%', pos:'50% 18%' },   // a Kánon események által hozott lapok
  c_gygabi: { src:'art/gygabi.webp', av:'52% 26%', pos:'52% 24%' },
  c_gyzana: { src:'art/gyzana.webp', av:'47% 30%', pos:'47% 28%' },
  c_jbl:    { src:'art/jbl.webp', av:'50% 45%', pos:'50% 42%' },
  f_metamorf: { src:'art/f_metamorf.webp', av:'52% 22%', pos:'52% 22%' },
  baszo:      { src:'art/f_metamorf.webp', av:'52% 18%', port:'53% 14%' },
  milo_gep:   { src:'art/f_gepuzem.webp', av:'50% 18%', port:'50% 16%' },   // Milo portréja, miután a Gépüzemmód visszahozta   // Baszó hősportré: a Metamorfózis képe közelebbről
  f_atok:     { src:'art/f_atok.webp', av:'48% 40%', pos:'48% 36%' },
  f_gepuzem:  { src:'art/f_gepuzem.webp', av:'50% 22%', pos:'50% 20%' },
  f_capa:     { src:'art/f_capa.webp', av:'50% 28%', pos:'50% 26%' },
  c_capa:     { src:'art/capa.webp', av:'62% 26%', pos:'60% 26%' },
  f_gluten:   { src:'art/f_gluten.webp', av:'55% 26%', pos:'55% 26%' },
  f_munkahely:{ src:'art/f_munkahely.webp', av:'50% 55%', pos:'50% 55%' },
  l_munkahely:{ src:'art/f_munkahely.webp', av:'50% 55%', pos:'50% 55%' },
  c_molnar: { src:'art/molnar.webp', pos:'50% 22%' },
  c_udvarhelyi: { src:'art/udvarhelyi.webp', pos:'47% 5%' },
  c_alekosz: { src:'art/alekosz.webp', pos:'52% 16%' },
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
  const fk = gold ? 'gold' : o.foil ? 'foil' : 'base';   // arany → Full Art → alap
  const htl = h.text.length, htc = htl > 150 ? ' tl-l tl-xl' : htl > 95 ? ' tl-l' : htl > 62 ? ' tl-m' : '';
  return `<div class="card t-hero${o.big ? ' big' : ''}${fk === 'gold' ? ' framed xf xf-gold gold' + htc : fk === 'foil' ? ' foil' : ' framed'}" style="--h:${h.hue}" ${o.attrs || ''}>
    <div class="cframe">
      ${ART[aid] ? `<div class="art has-art" style="${artStyle(aid, o.big)}"></div>`
        : `<div class="art"><span class="mono">${initials(h.name)}</span>${o.big && !o.foil ? '<span class="artnote">Illusztráció helye</span>' : ''}</div>`}
      <div class="ctype">${gold ? 'Arany hős' : 'Hős'} · ${h.id === 'baszo' ? 12 : h.id === PASSIVE.bigHp ? 24 : 20} élet<i class="rar ${gold ? 'r-g' : 'r-l'}"></i></div>${gold ? '<i class="gold-dust"></i>' : ''}
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
      return `<div class="coll-slot${n ? '' : ' missing'}">${cardHTML(c.id, { foil: ui.foil, attrs: `data-card="${c.id}" tabindex="0"` })}<span class="own-n"><i class="rar r-${c.rarity}" title="${RAR[c.rarity]}" aria-label="${RAR[c.rarity]}"></i>${n ? '×' + n : 'Nincs meg'}</span></div>`;
    }).join('')
         : HEROES.map(h => { const miss = ui.foil && !ownsHeroFa(h.id);
             const multi = !ui.foil && Store.p && heroSkins(h.id).length > 1, sk = multi ? heroSkin(h.id) : 'base';
             return `<div class="coll-slot${miss ? ' missing' : ''}">${heroCardHTML(h, { foil: ui.foil || sk === 'fa', gold: !ui.foil && sk === 'gold', attrs: `data-hcard="${h.id}" tabindex="0"` })}${ui.foil ? `<span class="own-n">${miss ? 'Nincs meg' : '×' + Store.p.heroFa[h.id]}</span>` : multi ? `<span class="own-n skin-n">🎨 ${SKIN_NAME[sk]}</span>` : ''}</div>`; }).join('')}</div>${type ? '' : `<div class="lbl gold-lbl">✦ Arany hősök – a legritkább lapok</div><div class="coll-grid">${GOLD_HEROES.map(hid => { const has = ownsHeroGold(hid);
             return `<div class="coll-slot${has ? '' : ' missing gold-miss'}">${heroCardHTML(HERO[hid], { gold: true, attrs: `data-hgold="${hid}" tabindex="0"` })}<span class="own-n">${has ? '✦ Megvan' : 'Nincs meg'}</span></div>`; }).join('')}</div>`}`).join('');
}
$('#vBase').onclick = () => { ui.foil = false; $('#vBase').setAttribute('aria-pressed', 'true'); $('#vFoil').setAttribute('aria-pressed', 'false'); renderColl(); };
$('#vFoil').onclick = () => { ui.foil = true; $('#vFoil').setAttribute('aria-pressed', 'true'); $('#vBase').setAttribute('aria-pressed', 'false'); renderColl(); };
// egy lap nagy nézete a Gyűjteményben – ha 2 példány fölött van belőle, egyenként beváltható
function collCardModal(id, cap) {
  const e = Store.p?.coll[id] || { n: 0, f: 0 }, extra = e.n + e.f - DUPE_KEEP;
  cap = cap || `<i class="rar r-${CARD[id].rarity}" aria-hidden="true"></i> ${RAR[CARD[id].rarity]} · ${e.n} db${e.f ? ` + ${e.f} Full Art` : ''}${CARD[id].passOnly ? ' · csak a Season Passból szerezhető' : !e.n && !e.f ? ' · boosterből szerezhető' : ''}`;
  const btns = extra > 0 ? `<div class="cv-row">${e.n > 0 ? `<button class="btn cv-btn" data-cv="n">♻️ 1 lap beváltása · +${dupeVal(id, false)} coin</button>` : ''}${e.f > 0 ? `<button class="btn cv-btn fa" data-cv="f">♻️ 1 Full Art beváltása · +${dupeVal(id, true)} coin</button>` : ''}</div><small class="cv-note">${extra} fölösleges példány – 2 mindig megmarad</small>` : '';
  openModal(cardHTML(id, { big: true, foil: ui.foil || (e.f > 0 && !e.n) }), cap, btns + cardHelpHTML(id));
  const o = $('#layer').lastElementChild;
  o.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-cv]'); if (!b) return;
    ev.stopPropagation(); b.disabled = true;
    const p = Store.p, x = p.coll[id], foil = b.dataset.cv === 'f';
    if (!x || x.n + x.f <= DUPE_KEEP || !(foil ? x.f > 0 : x.n > 0)) { o.remove(); return; }
    if (foil) x.f--; else x.n--;
    const c = dupeVal(id, foil); p.coins += c; p.dupeCoins = (p.dupeCoins || 0) + c;
    await save(); if (typeof frPubSync === 'function') frPubSync();
    o.remove(); renderProfileBar(); renderColl(); toast(`♻️ +${c} coin`);
    if (x.n + x.f > DUPE_KEEP) collCardModal(id);   // ha még van fölösleg, nyitva marad
  }, true);
}
$('#collBody').onclick = e => {
  if (e.target.closest('#dupeBtn')) return dupeModal();
  const c = e.target.closest('[data-card]'), h = e.target.closest('[data-hcard]'), hg = e.target.closest('[data-hgold]');
  if (h && !ui.foil && Store.p && heroSkins(h.dataset.hcard).length > 1) return skinModal(h.dataset.hcard);
  if (hg && ownsHeroGold(hg.dataset.hgold) && heroSkins(hg.dataset.hgold).length > 1) return skinModal(hg.dataset.hgold);
  if (hg) { const hid = hg.dataset.hgold; openModal(heroCardHTML(HERO[hid], { big: true, gold: true }), ownsHeroGold(hid) ? '✦ Arany hős · a tiéd!' : `✦ Arany hős · boosterből ${ECON.goldPlain * 100}%, Shiny boosterből ${ECON.goldShiny * 100}% eséllyel`); return; }
  if (c) { const id = c.dataset.card, e = Store.p?.coll[id] || { n: 0, f: 0 };
    if (CARD[id].variantOf) return collCardModal(id, `✦ Ritka változat: a(z) ${CARD[CARD[id].variantOf].name} különleges kinézete – ugyanúgy játszható, ugyanaz a hatása · ${e.n + e.f} db${CARD[id].passOnly ? ' · csak a Season Passból' : CARD[id].shopOnly ? ` · csak a Boltban kapható (${CARD[id].price || 100} coin)` : !e.n && !e.f ? ' · Shiny boosterből szerezhető' : ''}`, null);
    collCardModal(id); }
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
      `<button class="gslot" data-g="${k}">${cardHTML(x.id, { foil: x.foil ?? foilOf(pi, x.id) })}<small><b>${x.rnd}. kör</b>${GRAVE_HOW[x.how]}</small></button>`).join('')}</div>`
      : '<p class="live">Még üres. Ide kerülnek a kijátszott akciók, az elpusztult karakterek és eszközeik, a lecserélt helyszínek és az elégett lapok.</p>'}
    <div class="close-hint">Koppints mellé a bezáráshoz</div></div>`;
  const t0 = performance.now();
  o.onclick = e => {
    const b = e.target.closest('[data-g]');
    if (b) { const x = g[+b.dataset.g]; openModal(cardHTML(x.id, { big: true, foil: x.foil ?? foilOf(pi, x.id) }), `${pi === ME ? 'Tőled' : 'Az ellenféltől'} · ${x.rnd}. kör · ${GRAVE_HOW[x.how]}`, cardHelpHTML(x.id)); return; }
    if (performance.now() - t0 > 350) o.remove();
  };
  $('#layer').appendChild(o);
}

// ---------- modal, toast, lebegő számok ----------
function openModal(inner, live, help = '') {
  // nagy lapnézet: a felirat elé a lap ritkaságjelvénye (gyűjteményben, meccs közben, temetőben egyaránt)
  const rm = /data-rar="(\w)"/.exec(inner);
  if (rm && RAR[rm[1]] && !(live || '').includes('class="rar')) live = `<i class="rar r-${rm[1]}" title="${RAR[rm[1]]}" aria-label="${RAR[rm[1]]}"></i> ${RAR[rm[1]]}${live ? ' · ' + live : ''}`;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal">${inner}${live ? `<div class="live">${live}</div>` : ''}${help}<div class="close-hint">Koppints bárhova a bezáráshoz</div></div>`;
  const t0 = performance.now();
  o.onclick = () => { if (performance.now() - t0 > 350) o.remove(); };   // a megnyitó koppintás ne zárja be rögtön
  $('#layer').appendChild(o);
}
// Full Art: a saját lapjaidnál a gyűjteményed dönt; PvP-ben az ellenfélnél az, amit a meccs elején magáról megosztott
const longWord = n => Math.max(...n.split(/[\s\u00AD]+/).map(w => w.length));   // a leghosszabb szó (ezt nem lehet tördelni)
// a pakliban lévő Full Art példányok száma lapfajtánként (meccs közben csak ennyi példány csillog)
const myFoils = list => { const o = {}; for (const [id, n] of Object.entries(list || {})) { const f = Math.min(n, Store.p?.coll[id]?.f || 0); if (f > 0) o[id] = f; } return o; };
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
  const w = f.offsetWidth, x = r.left + r.width / 2;   // a képernyő szélén se lógjon ki a felirat
  if (w) f.style.left = Math.min(Math.max(x, w / 2 + 6), innerWidth - w / 2 - 6) + 'px';
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
// Célzott hatás: fénygolyó repül a forrásból a célpontig, hogy látszódjon, mi kit talált el (Molnár Zsolti, Kovács Bence, Alekosz Tibi…)
async function zapFx(e) {
  const from = cellEl(e.side, e.i), to = e.ti === -1 ? barEl(e.ts)?.querySelector('.hpbar') : cellEl(e.ts, e.ti);
  if (!from || !to) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const tgt = e.ti === -1 ? barEl(e.ts) : unitAt(e.ts, e.ti);
  if (tgt) tgt.classList.add('zap-mark');   // a célpont már repülés közben jelölve van
  const o = document.createElement('div'); o.className = 'zap-orb ' + e.kind;
  o.textContent = e.kind === 'kill' ? '💀' : e.kind === 'steal' ? '🫳' : e.kind === 'sound' ? '🔊' : '💥';
  o.style.left = x0 + 'px'; o.style.top = y0 + 'px';
  $('#layer').appendChild(o);
  const dx = x1 - x0, dy = y1 - y0, lift = Math.min(90, Math.hypot(dx, dy) * 0.35);
  await o.animate([
    { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1, offset: .15 },
    { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - lift}px)) scale(1.1)`, opacity: 1, offset: .55 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1 },
  ], { duration: 620, easing: 'cubic-bezier(.45,0,.4,1)', fill: 'forwards' }).finished;
  o.remove();
  const boom = document.createElement('div'); boom.className = 'zap-boom ' + e.kind;
  boom.style.left = x1 + 'px'; boom.style.top = y1 + 'px'; $('#layer').appendChild(boom); setTimeout(() => boom.remove(), 650);
  if (tgt) { tgt.classList.remove('zap-mark'); fx(tgt, e.kind === 'steal' ? 'fx-buff' : 'fx-hit'); }
  if (e.kind === 'kill') floatAt(to, '💀 Elpusztítva!', 'dmg');
  if (e.kind === 'sound') { fx($('#app'), 'fx-quake'); floatAt(to, '🔊 Kifújta a basszus!', 'dmg'); }
  if (e.kind === 'blast') floatAt(to, '💥 Utolsó ütés!', 'dmg');
  await sleep(e.kind === 'kill' || e.kind === 'sound' ? 380 : 200);
}
// ---------- meccs-előzmények: körönként, ki mit csinált (a 📜 gombbal nézhető vissza) ----------
function logEvents(evs, snap) {
  if (!S) return; S.log = S.log || [];
  const who = sd => sd === ME ? 'Te' : (S.pvp ? (S.names?.[sd] || 'Ellenfél') : HERO[S.players[sd].heroId].name);
  const unitName = (sd, i, hid) => {
    const now = S.players[sd].board[i], was = snap[sd] && snap[sd][i];
    const u = was || now; if (!u) return 'egy karakter';
    if (sd !== ME && (hid ?? u.hidden)) return 'egy rejtett lap';
    return CARD[u.id].name;
  };
  const nm = (sd, i) => i === -1 ? (sd === ME ? 'a hősöd' : who(sd) + ' (hős)') : unitName(sd, i);
  const group = () => {   // az aktuális kör csoportja (a 'turn' esemény nyit újat)
    let g = S.log[S.log.length - 1];
    if (!g) { g = { half: S.half || 1, turn: Math.max(1, Math.ceil((S.half || 1) / 2)), side: S.active, lines: [] }; S.log.push(g); }
    return g;
  };
  for (const e of evs) {
    if (e.t === 'turn') { const prev = S.log[S.log.length - 1], h = prev ? prev.half + 1 : (S.half || 1);
      S.log.push({ half: h, turn: Math.ceil(h / 2), side: e.side, lines: [] }); if (S.log.length > 60) S.log.shift(); continue; }
    const g = group(), L = x => g.lines.push(x);
    const c = e.id && CARD[e.id];
    switch (e.t) {
      case 'play': {
        const secret = e.side !== ME && c.sneak;
        const tg = e.tg ? ' → ' + nm(e.tg.side, e.tg.i) : '';
        L(secret ? `🂠 ${who(e.side)} lerakott egy rejtett lapot` : `▶ ${who(e.side)} kijátszotta: <b>${escH(c.name)}</b>${tg}`); break; }
      case 'attack': L(`⚔ ${unitName(e.side, e.i)} támad`); break;
      case 'heroatk': L(`⚔ ${who(e.side)} (Baszó) odacsap`); break;
      case 'dmg': L(`💥 ${nm(e.side, e.i)}: −${e.n}`); break;
      case 'heal': L(`💚 ${nm(e.side, e.i)}: +${e.n}`); break;
      case 'overflow': L(`💪 Izom: ${e.n} átüt a hősre`); break;
      case 'death': L(`💀 ${CARD[e.id].name} meghalt (${e.side === ME ? 'tiéd' : 'ellenfélé'})`); break;
      case 'summon': case 'rise': L(`✨ ${CARD[e.id]?.name || 'Egy lap'} a pályára került (${e.side === ME ? 'nálad' : 'az ellenfélnél'})`); break;
      case 'revive': L(`✨ ${unitName(e.side, e.i)} feltámadt`); break;
      case 'buff': if (e.i >= 0 && e.n) L(`▲ ${unitName(e.side, e.i)}: +${e.n} támadás`); break;
      case 'debuff': L(`▼ ${unitName(e.side, e.i)}: −${e.n} támadás`); break;
      case 'stun': L(`💫 ${unitName(e.side, e.i)} bénult`); break;
      case 'shield': L(`🛡 ${unitName(e.side, e.i)} pajzsa elnyelte az ütést`); break;
      case 'bounce': L(`↩ ${unitName(e.side, e.i)} visszakerült a kézbe`); break;
      case 'stolen': L(`🫳 ${unitName(e.side, e.i)} átállt a másik oldalra`); break;
      case 'push': L(`➡ Egy karakter arrébb tolva`); break;
      case 'misfire': L(`🍺 ${unitName(e.side, e.i)} mellé ütött`); break;
      case 'reveal': if (e.side !== ME) L(`🂠 Felfordult: ${CARD[e.id].name}`); break;
      case 'party': L(e.none ? `🍸 A parti lelke kiosztott egy italt (${CARD[e.id].name}), de nem volt kire` : `🍸 ${CARD[e.id].name} → ${CARD[e.tid]?.name || 'egy karakter'}`); break;
      case 'drinkgift': case 'gift': L(`🎁 ${e.side === ME ? CARD[e.id].name + ' a kezedbe' : 'Egy lap az ellenfél kezébe'}`); break;
      case 'coin': L(`💧 ${e.side === ME ? 'Kaptál' : 'Az ellenfél kapott'} egy pohár vizet`); break;
      case 'chomp': L(`🦈 A Cápa megette: ${unitName(e.side, e.i)}`); break;
      case 'sharkgone': L('🦈 A Cápa eltűnt'); break;
      case 'doom': case 'expire': L(`⌛ ${unitName(e.side, e.i)} eltűnt`); break;
      case 'lock': L(`🔒 ${e.side === ME ? 'Le vagy bénítva' : 'Az ellenfél le van bénítva'}: a következő körben nem játszhat ki lapot`); break;
      case 'locgone': L(`🚫 Kitiltva: ${CARD[e.id].name}`); break;
      case 'mosh': L('🤘 Mosh Pit: az ellenfél karakterei odébb csúsztak'); break;
      case 'morph': L(`🦹 ${who(e.side)} Baszóvá változott`); break;
      case 'machine': L(`🤖 ${who(e.side)} Gépüzemmódban visszatért`); break;
      case 'discard': L(`🗑 ${who(e.side)} eldobta a kezét (${e.n} lap)`); break;
      case 'burn': L(`🔥 Tele a kéz: elégett egy lap`); break;
      case 'fatigue': L(`🪫 ${who(e.side)}: üres pakli, ${e.n} sebzés`); break;
    }
  }
}
function openLog() {
  const groups = (S && S.log || []).filter(g => g.lines.length).slice(-12).reverse();
  const body = groups.length ? groups.map(g => `<div class="lg-turn"><h4>${g.turn}. kör · ${g.side === ME ? 'a te köröd' : (S.pvp ? escH(S.names?.[g.side] || 'ellenfél') : HERO[S.players[g.side].heroId].name) + ' köre'}</h4><ul>${g.lines.map(l => `<li>${l}</li>`).join('')}</ul></div>`).join('') : '<p class="live">Még nem történt semmi.</p>';
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal logbox"><h3>📜 Mi történt?</h3><div class="lg-list">${body}</div><button class="btn primary" data-x>Bezárás</button></div>`;
  o.onclick = e => { if (e.target === o || e.target.closest('[data-x]')) o.remove(); };
  $('#layer').appendChild(o);
}
// Tomi, a parti lelke: előbb felfordul, melyik italt húzta, aztán az ital rárepül a célpontra
async function partyFx(e) {
  const c = CARD[e.id]; if (!c) return;
  const who = e.side === ME ? 'Tomi, a parti lelke' : 'Az ellenfél parti lelke';
  const tName = e.tid ? CARD[e.tid].name : '';
  const what = e.id === 'a_koktel' ? (e.o === 'buff' ? '+5 támadás' : '5 sebzés') : e.id === 'a_tubi' ? `6 sebzés (és 3 ${e.side === ME ? 'a te hősödnek' : 'a saját hősének'})` : PARTY_FX[e.id] || '';
  const back = document.createElement('div'); back.className = 'played party';
  back.innerHTML = `<div class="wrap"><span class="tag">🥳 ${who} kioszt egy italt…</span><span class="flip rev"><span class="flip-in"><span class="face back"></span><span class="face front">${cardHTML(e.id, { big: true })}</span></span></span><span class="party-to">${e.none ? 'Nincs kire önteni – kárba veszett! 🫗' : `🍸 → <b>${escH(tName)}</b>: ${what}`}</span><span class="skip">Koppints a folytatáshoz</span></div>`;
  $('#layer').appendChild(back);
  const wrap = back.querySelector('.wrap'), to = back.querySelector('.party-to');
  const src = cellEl(e.side, e.i), sr = src ? src.getBoundingClientRect() : null, wr = wrap.getBoundingClientRect();
  back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
  to.style.opacity = 0;
  await wrap.animate([{ transform: sr ? `translate(${sr.left + sr.width / 2 - (wr.left + wr.width / 2)}px,${sr.top + sr.height / 2 - (wr.top + wr.height / 2)}px) scale(.25) rotate(8deg)` : 'scale(.3)', opacity: 0 },
                      { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'forwards' }).finished;
  await back.querySelector('.flip-in').animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], { duration: 520, easing: 'cubic-bezier(.3,.1,.3,1.2)', fill: 'forwards' }).finished;
  to.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, fill: 'forwards' });
  const dest = e.none ? null : cellEl(e.ts, e.ti);
  if (dest) dest.classList.add('aim');
  await Promise.race([sleep(1700), new Promise(r => back.addEventListener('pointerdown', r, { once: true }))]);
  back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: 'forwards' });
  if (dest) {
    const r = dest.getBoundingClientRect(), w2 = wrap.getBoundingClientRect();
    const dx = (r.left + r.width / 2) - (w2.left + w2.width / 2), dy = (r.top + r.height / 2) - (w2.top + w2.height / 2);
    await wrap.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.2) rotate(-14deg)`, opacity: .5 }],
                       { duration: 400, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }).finished;
    dest.classList.remove('aim');
    const boom = document.createElement('div'); boom.className = 'zap-boom party';
    boom.style.left = (r.left + r.width / 2) + 'px'; boom.style.top = (r.top + r.height / 2) + 'px'; $('#layer').appendChild(boom); setTimeout(() => boom.remove(), 650);
    const u = unitAt(e.ts, e.ti); if (u) fx(u, 'fx-hit');
    floatAt(dest, `🍸 ${c.name}`, 'info');
    await sleep(320);
  } else {
    await wrap.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.1) rotate(6deg)', opacity: 0 }], { duration: 320, fill: 'forwards' }).finished;
  }
  back.remove();
}
// Egy pohár víz: az első alkalommal elmagyarázzuk, miért kapta (profilonként egyszer)
async function waterTip() {
  Store.p.tips = { ...(Store.p.tips || {}), water: true }; save();
  await sleep(500);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal">${cardHTML('a_kor', { big: true })}<div class="live"><b>Miért kaptam egy pohár vizet?</b></div><p class="water-tip">Az ellenfeled kezdett, és aki kezd, annak előnye van: mindig egy körrel előrébb jár. Ezért aki másodikként jön, kap egy <b>Egy pohár víz</b> lapot.<br><br>💧 A <b>3. körödtől</b> bármikor kijátszhatod (0 energia), és abban a körben <b>+1 energiád</b> lesz – így egy drágább lapot is lerakhatsz, mint az ellenfél.</p><button class="btn primary">Értem</button></div>`;
  $('#layer').appendChild(o);
  await new Promise(r => { o.querySelector('.btn').onclick = r; });
  o.remove();
}
let revealed = new Set();
// kijátszás: előbb maga a lap jelenik meg (karakter leszáll a helyére, akció/eszköz/helyszín felvillan), csak utána jönnek a hatásai
const preLanded = new Set();
async function playIntro(e, hasFx) {
  const c = CARD[e.id]; if (!c) return;
  if (c.finisher) { await finisherIntro(e); return; }
  if (c.type === 'char' && e.at != null) {
    const u = S.players[e.side].board[e.at], cell = cellEl(e.side, e.at);
    if (!u || !cell || cell.querySelector('.unit')) return;
    const t = document.createElement('div'); t.innerHTML = unitHTML(u, e.side, e.at).trim();
    const el = t.firstElementChild; cell.appendChild(el); preLanded.add(u.uid); fx(el, 'fx-land');
    if (hasFx) await sleep(460);
    return;
  }
  if (e.side !== ME || !hasFx) return;   // az ellenfél lapját a nagy felfordítás már megmutatta
  const o = document.createElement('div'); o.className = 'cast'; o.innerHTML = cardHTML(e.id, { foil: e.foil ?? foilOf(ME, e.id) });
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
      case 'summon':
        if (e.id === 'l_munkahely') floatAt($('#loc'), '🏢 Munkahely!', 'info');
        else floatAt(anchor, `${CARD[e.id]?.name || 'Query'}!`, 'info');
        hold = Math.max(hold, e.id === 'c_query' ? 300 : 520); break;
      case 'rise': floatAt(anchor, `✝️ ${CARD[e.id].name} visszatért! +1/+1`, 'buff'); hold = Math.max(hold, 750); break;
      case 'morph': fx(el, 'fx-heroheal'); fx($('#app'), 'fx-quake'); floatAt(anchor, '🦋 Metamorfózis! Itt van Baszó', 'buff'); hold = Math.max(hold, 1000); break;
      case 'machineon': floatAt(anchor, '⚙️ Gépüzemmód bekapcsolva', 'info'); hold = Math.max(hold, 700); break;
      case 'machine': fx(el, 'fx-heroheal'); fx($('#app'), 'fx-quake'); floatAt(anchor, '⚙️ GÉPÜZEMMÓD! Vissza 10 élettel', 'buff'); hold = Math.max(hold, 1200); break;
      case 'heroatk': break;   // a lendülést a baszoAnim már lejátszotta
      case 'chomp': await chompFx(e); break;
      case 'coin': floatAt(anchor, e.side === ME ? '💧 Második vagy: kaptál egy pohár vizet' : '💧 Az ellenfél kapott egy pohár vizet', 'info'); hold = Math.max(hold, 900);
        if (e.side === ME && !S.tut && Store.p && !Store.p.tips?.water) await waterTip();
        break;
      case 'swim': floatAt(anchor, e.dir > 0 ? '🦈 →' : '🦈 ←', 'info'); hold = Math.max(hold, 350); break;
      case 'nocounter': floatAt(anchor, 'Baszót nem lehet visszaütni!', 'info'); hold = Math.max(hold, 500); break;
      case 'jblwave': await jblWaveFx(e); break;
      case 'sharkgone': floatAt(anchor, '🦈 Elúszott…', 'info'); hold = Math.max(hold, 600); break;
      case 'gift': floatAt(anchor, `${e.id === 'i_ing' ? '👔' : '🍗'} ${CARD[e.id].name} a ${e.side === ME ? 'kezedbe' : 'kezébe'}!`, 'info'); hold = Math.max(hold, 700); break;
      case 'drinkgift': floatAt(anchor, e.side === ME ? `🍸 ${CARD[e.id].name} a kezedbe!` : '🍸 Ital a kezébe!', 'info'); hold = Math.max(hold, 700); break;
      case 'deathblast': floatAt(anchor, '💥 Utolsó ütés!', 'dmg'); hold = Math.max(hold, 450); break;
      case 'zap': await zapFx(e); break;
      case 'party': await partyFx(e); break;
      case 'locgone': floatAt(anchor, `🚫 ${CARD[e.id].name} bezárt`, 'info'); hold = Math.max(hold, 600); break;
      case 'swap': floatAt(anchor, 'Helycsere!', 'info'); hold = Math.max(hold, 300); break;
      case 'push': floatAt(anchor, 'Arrébb tolva!', 'info'); hold = Math.max(hold, 300); break;
      case 'stolen': fx(el, e.side === ME ? 'fx-bounce-up' : 'fx-bounce-down'); floatAt(anchor, '🫳 Ellopták!', 'dmg'); hold = Math.max(hold, 650); break;
      case 'steal': floatAt(anchor, `🫳 ${CARD[e.id].name} átállt!`, 'buff'); hold = Math.max(hold, 700); break;
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
  const snap = [0, 1].map(sd => S.players[sd].board.map(u => u && { id: u.id, hidden: !!u.hidden }));
  S.events = []; fn();
  const evs = S.events; S.events = [];
  try { logEvents(evs, snap); } catch {}
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

// ---------- kánon esemény lapok ----------
// Bevonulás: elsötétül a pálya, fénysugarak, a lap becsapódik középre, „KIVÉGZŐ” felirat
async function finisherIntro(e) {
  // Sorrend (a csapat leírása szerint): 1) a háttér elsötétül, 2) a Kánon-jelvény és a lap felső kristálya felragyog,
  // 3) vörös fényimpulzus fut végig a kereten, 4) jön a hatás. Maga a fényeffekt ~1,1 mp; koppintásra hamarabb továbbmegy.
  const c = CARD[e.id], h = HERO[c.hero];
  const o = document.createElement('div'); o.className = 'fin-intro';
  const sub = c.opts && e.o != null ? c.opts[e.o] : h ? `${h.name} kánon eseménye` : '';
  o.innerHTML = `<div class="fin-dark"></div><div class="fin-rays"></div><i class="fin-icon ic-kanon" aria-hidden="true"></i><div class="fin-card">${cardHTML(e.id, { big: true, foil: e.foil ?? foilOf(e.side, e.id) })}</div>
    <div class="fin-title" role="status">${e.side === ME ? '' : '<i>Az ellenfél</i>'}<small>Kánon esemény</small><b>${c.name}</b><em>${sub}</em></div><div class="fin-flash"></div>`;
  $('#layer').appendChild(o);
  const dark = o.querySelector('.fin-dark'), rays = o.querySelector('.fin-rays'), card = o.querySelector('.fin-card'), title = o.querySelector('.fin-title'),
        flash = o.querySelector('.fin-flash'), icon = o.querySelector('.fin-icon');
  const skip = () => new Promise(r => { const t0 = performance.now(); o.addEventListener('pointerdown', () => { if (performance.now() - t0 > 300) r(); }); });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {   // csökkentett mozgás: rövid, álló kiemelés
    [dark, card, title, icon].forEach(x => x.style.opacity = 1);
    await Promise.race([sleep(1400), skip()]); o.remove(); return;
  }
  // 1) sötétítés
  await dark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-in', fill: 'forwards' }).finished;
  // a lap becsapódik
  await card.animate([{ transform: 'translate(-50%,-50%) scale(2.4) rotate(-8deg)', opacity: 0, filter: 'blur(8px) brightness(3)' },
                      { transform: 'translate(-50%,-50%) scale(.94) rotate(1deg)', opacity: 1, filter: 'blur(0) brightness(1.6)', offset: .72 },
                      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1, filter: 'brightness(1)' }], { duration: 440, easing: 'cubic-bezier(.3,.9,.3,1)', fill: 'forwards' }).finished;
  fx($('#app'), 'fx-quake');
  flash.animate([{ opacity: .7 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' });
  rays.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.5) rotate(0deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(60deg)' }], { duration: 1100, easing: 'ease-out', fill: 'forwards' });
  // 2) a jelvény és a felső kristály felragyog
  icon.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4)', filter: 'brightness(1)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.25)', filter: 'brightness(2.2) drop-shadow(0 0 18px rgba(255,40,70,1))', offset: .45 },
                { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', filter: 'brightness(1.1) drop-shadow(0 0 10px rgba(255,40,70,.8))' }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
  const ce = card.querySelector('.card');
  let runDone = sleep(0);
  if (ce && ce.classList.contains('xf-kanon')) {
    ce.insertAdjacentHTML('beforeend', '<i class="kanon-crystal"></i><i class="kanon-run"><i></i></i>');
    const cr = ce.querySelector('.kanon-crystal'), run = ce.querySelector('.kanon-run');
    cr.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.7)', offset: .4 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(2.3)' }],
               { duration: 420, easing: 'ease-out', fill: 'forwards' });
    // 3) vörös fényimpulzus körbe a kereten
    run.animate([{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: 700, delay: 320, fill: 'forwards' });
    runDone = run.firstElementChild.animate([{ transform: 'translate(-50%,-50%) rotate(0deg)' }, { transform: 'translate(-50%,-50%) rotate(360deg)' }], { duration: 700, delay: 320, easing: 'cubic-bezier(.45,.1,.55,.9)', fill: 'forwards' }).finished;
  }
  title.animate([{ opacity: 0, transform: 'translate(-50%,0) scale(1.6)', letterSpacing: '.4em' }, { opacity: 1, transform: 'translate(-50%,0) scale(1)', letterSpacing: '.02em' }],
                { duration: 420, delay: 160, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'forwards' });
  await Promise.race([Promise.all([runDone, sleep(1150)]), skip()]);
  // 4) vissza a pályára, jöhet a hatás
  card.animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)', filter: 'brightness(1)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.18)', filter: 'brightness(2.6)' }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
  await o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 340, delay: 80, fill: 'forwards' }).finished;
  o.remove();
}
// Gluténbomba: két lehetőség közül választasz
function chooseOpt(c) {
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="modal opt-box"><h3>${c.name}</h3><p class="live">Válassz:</p>${c.opts.map((t, k) => `<button class="btn primary opt-btn" data-o="${k}">${t}</button>`).join('')}<button class="btn opt-x" data-o="x">Mégse</button></div>`;
    o.onclick = ev => { const b = ev.target.closest('[data-o]'); if (!b && ev.target !== o) return; o.remove(); res(!b || b.dataset.o === 'x' ? null : +b.dataset.o); };
    $('#layer').appendChild(o);
  });
}
// Baszó támadása: a hős portréja nekilendül a célpontnak (a legbalra álló ellenséges karakter vagy az ellenfél hőse)
async function baszoAnim(pi) {
  const port = barEl(pi)?.querySelector('.hport'), foe = other(pi);
  const j = S.players[foe].board.findIndex(x => x && !CARD[x.id].invis);
  const target = j >= 0 ? (unitAt(foe, j) || cellEl(foe, j)) : barEl(foe);
  if (!port || !target) { await runFx(() => baszoStrike(S)); return; }
  const a = port.getBoundingClientRect(), b = target.getBoundingClientRect();
  const fly = port.cloneNode(true); fly.classList.add('hport-fly');
  Object.assign(fly.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
  fly.querySelectorAll('button').forEach(x => x.remove());
  $('#layer').appendChild(fly); port.style.visibility = 'hidden';
  floatAt(port, 'Baszó támad!', 'info');
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  await fly.animate([{ transform: 'none' }, { transform: `translate(${-dx * .06}px,${-dy * .06}px) scale(1.18) rotate(-6deg)` }], { duration: 260, easing: 'cubic-bezier(.3,0,.6,1)', fill: 'forwards' }).finished;
  await fly.animate([{ transform: `translate(${-dx * .06}px,${-dy * .06}px) scale(1.18) rotate(-6deg)` }, { transform: `translate(${dx * .82}px,${dy * .82}px) scale(1.25) rotate(6deg)` }], { duration: 190, easing: 'cubic-bezier(.6,0,1,.7)', fill: 'forwards' }).finished;
  burstAt(b.left + b.width / 2, b.top + b.height / 2, j < 0); fx($('#app'), 'fx-quake');
  const back = fly.animate([{ transform: `translate(${dx * .82}px,${dy * .82}px) scale(1.25) rotate(6deg)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
  await Promise.all([runFx(() => baszoStrike(S)), back.finished]);
  fly.remove(); const p2 = barEl(pi)?.querySelector('.hport'); if (p2) p2.style.visibility = '';
}
// JBL hangfal: hanghullám söpör végig az ellenfél oldalán (a sebzéseket utána a megszokott módon mutatjuk)
async function jblWaveFx(e) {
  const from = cellEl(e.side, e.i); if (!from) return;
  const r = from.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  fx(unitAt(e.side, e.i), 'fx-buff'); floatAt(from, '🔊 BASSZUS!', 'info');
  for (let k = 0; k < 3; k++) {
    const w = document.createElement('div'); w.className = 'jbl-wave'; w.style.left = x + 'px'; w.style.top = y + 'px';
    $('#layer').appendChild(w);
    w.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .95 }, { transform: 'translate(-50%,-50%) scale(9)', opacity: 0 }], { duration: 750, delay: k * 140, easing: 'ease-out', fill: 'forwards' }).finished.then(() => w.remove());
  }
  fx($('#app'), 'fx-quake');
  await sleep(420);
}
// Cápa: odaúszik a célponthoz, és összecsapódó állkapoccsal megeszi
async function chompFx(e) {
  const to = cellEl(e.side, e.i); if (!to) return;
  const b = to.getBoundingClientRect(), x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const from = e.from >= 0 ? cellEl(e.side, e.from) : null, a = from && from.getBoundingClientRect();
  const x0 = a ? a.left + a.width / 2 : innerWidth + 60, y0 = a ? a.top + a.height / 2 : y1;
  const tgt = unitAt(e.side, e.i); if (tgt) tgt.classList.add('zap-mark');
  const sh = document.createElement('div'); sh.className = 'shark-fly'; sh.textContent = '🦈';
  sh.style.left = x0 + 'px'; sh.style.top = y0 + 'px'; $('#layer').appendChild(sh);
  await sh.animate([{ transform: 'translate(-50%,-50%) scale(.8) rotate(0deg)' }, { transform: `translate(calc(-50% + ${(x1 - x0) * .5}px), calc(-50% + ${(y1 - y0) * .5 - 26}px)) scale(1.1) rotate(-8deg)`, offset: .5 },
                    { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(1.35) rotate(6deg)` }], { duration: 620, easing: 'cubic-bezier(.45,0,.4,1)', fill: 'forwards' }).finished;
  const jaws = document.createElement('div'); jaws.className = 'jaws'; jaws.innerHTML = '<i class="jaw up"></i><i class="jaw down"></i>';
  Object.assign(jaws.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
  $('#layer').appendChild(jaws);
  await Promise.all([...jaws.children].map((j, k) => j.animate([{ transform: `translateY(${k ? 70 : -70}%)` }, { transform: 'translateY(0)' }], { duration: 170, easing: 'cubic-bezier(.7,0,1,.6)', fill: 'forwards' }).finished));
  fx($('#app'), 'fx-quake'); if (tgt) { tgt.classList.remove('zap-mark'); fx(tgt, 'fx-hit'); }
  floatAt(to, '🦈 Megette!', 'dmg');
  await sleep(260);
  jaws.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); sh.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
  await sleep(300); jaws.remove(); sh.remove();
}

// ---------- játék renderelés ----------
// Krisz kánon eseménye után Baszó a hős (saját név, portré és képesség)
const BASZO = { id:'baszo', name:'Baszó', hue:330, text:'A köröd végén a karaktereid után 3-at üt: mindig a legbalra álló ellenséges karaktert, ha nincs ilyen, az ellenfél hősét. Neki nem lehet visszaütni.' };
const heroOf = pi => S.players[pi].baszo ? BASZO
  : S.players[pi].machine === 2 ? { ...HERO[S.players[pi].heroId], id:'milo_gep', text: HERO[S.players[pi].heroId].text + ' Gépüzemmódban: már visszatért 10 élettel.' }
  : HERO[S.players[pi].heroId];
function heroBar(pi) {
  const p = S.players[pi], h = heroOf(pi), bz = !!p.baszo || p.machine === 2;   // átváltozott hős: saját portré, arany/Full Art nélkül
  const pips = Array.from({ length: Math.max(6, p.energy) }, (_, k) => `<i class="${k < p.energy ? 'on' + (k >= 6 ? ' bonus' : '') : k < p.maxEnergy ? 'used' : 'locked'}"></i>`).join('');   // Egy pohár víz: 6 fölött a 7. kristály is kigyullad
  const gold = !bz && heroGoldOf(pi) && !!ART['g_' + h.id], aid = gold ? 'g_' + h.id : h.id;
  const img = ART[aid] ? `background-image:url('${artSrc(aid, true)}');--hp:${ART[aid].port || '50% 7%'}` : '';
  const fa = !bz && (gold || heroFaOf(pi));
  return `<div class="hport${ART[h.id] ? '' : ' noart'}${fa ? ' fa' : ''}${gold ? ' gold' : ''}${p.baszo ? ' baszo' : p.machine === 2 ? ' gepmilo' : ''}" style="--h:${h.hue};${img}" aria-hidden="true">${ART[h.id] ? '' : `<span>${initials(h.name)}</span>`}${fa ? '<i class="hfa-holo"></i><i class="hfa-shine"></i><i class="hfa-rim"></i>' : ''}</div>
    <button class="hport-hit" data-hero="${pi}" aria-label="${h.name} képessége"></button>${p.machine === 1 ? '<span class="hmachine" title="Gépüzemmód: egyszer visszatér 10 élettel">⚙️</span>' : ''}${p.locked ? '<span class="hlock" title="Adios Motherfucker!: ebben a körében nem játszhat ki lapot">Bénult</span>' : ''}
    <div class="hinfo"><div class="hname">${h.name}<small>${pi === BOT ? (S.pvp ? escH(S.names?.[pi] || 'barát') : 'bot') : 'te'}</small></div>
      <div class="hpbar" role="img" aria-label="Élet: ${Math.max(0, p.hp)} / ${p.maxHp}"><span class="hps"><i style="width:${Math.max(0, p.hp) / p.maxHp * 100}%"></i></span><b>${Math.max(0, p.hp)} / ${p.maxHp}</b></div></div>
    <div class="res"><div class="en hudm${p.energy > p.maxEnergy ? ' bonus' : ''}" role="img" aria-label="Energia: ${p.energy} / ${p.maxEnergy}" title="Energia (most / legfeljebb)"><b>${p.energy}/${p.maxEnergy}</b></div>
      <div class="counts">Kéz ${p.hand.length} · <button class="gravebtn" data-grave="${pi}" aria-label="Temető: ${p.grave.length} lap"><i class="ic-grave" aria-hidden="true"></i>${p.grave.length}</button></div></div>
    <button class="deckpile${p.deck.length ? p.deck.length <= 3 ? ' low' : '' : ' empty'}" data-deck="${pi}" aria-label="Húzópakli: ${p.deck.length} lap maradt" title="Húzópakli: ennyi lap maradt"><i></i><b>${p.deck.length}</b></button>`;
}
const STB_NOATK = '<span class="stb noatk" role="img" aria-label="Nem támad" title="Nem támad"></span>';
function unitHTML(u, side, i) {
  if (u.hidden && side !== ME) return `<button data-uid="${u.uid}" class="unit facedown" aria-label="Rejtett lap">
    <span class="uin"><span class="art back-art"></span><span class="uname">Rejtett lap</span></span>
    <span class="st atk">?</span><span class="st hp">?</span>${u.stun ? `<span class="tags"><span class="zz stun" aria-hidden="true">bénult</span><span class="stc" role="img" aria-label="Bénult még ${u.stun} körig" title="Bénult még ${u.stun} körig"><b>${u.stun}</b></span></span>` : ''}</button>`;
  const c = CARD[u.id], atk = S.players[side].board[i]?.uid === u.uid ? effAtk(S, side, i) : u.atk, sleeping = u.fresh && !u.haste && u.id !== 'c_korso' && !c.noAttack && !u.stun;
  const tags = (sleeping ? '<span class="stb rest" role="img" aria-label="Pihen" title="Pihen: ebben a körben még nem támad"></span>' : u.id === 'c_capa' ? '' : c.noAttack ? STB_NOATK : u.id === 'c_ati' && !u.stun && !atiFree(S, side, i) ? STB_NOATK : '')
    + (c.invis ? `<span class="stb invis" role="img" aria-label="Láthatatlan" title="Láthatatlan: a támadások átmennek rajta"></span>${u.id === 'c_capa' ? `<span class="stc" role="img" aria-label="Még ${u.swims ?? 4} úszás" title="Még ennyi úszás, utána eltűnik"><b>${u.swims ?? 4}</b></span>` : ''}` : '')
    + (u.expire != null || u.doom ? '<span class="stb doom" role="img" aria-label="Eltűnik" title="Eltűnik: a köröd végén magától elpusztul"></span>' : '') + (u.stun ? `<span class="zz stun" aria-hidden="true">bénult</span><span class="stc" role="img" aria-label="Bénult még ${u.stun} körig" title="Bénult még ${u.stun} körig"><b>${u.stun}</b></span>` : '')
    + (u.hidden ? '<span class="stb hid" role="img" aria-label="Rejtve" title="Rejtve: az ellenfél nem látja"></span>' : '')
    + (c.taunt || u.taunt ? '<span class="stb taunt" role="img" aria-label="Provokál" title="Provokáció: mindenki őt támadja"></span>' : '');
  const fa = CARD[u.id].foilOnly || !!u.foil;
  return `<button data-uid="${u.uid}" class="unit ${TYPE.char[1]}${fa ? ' fa' : ''}${u.shield ? ' shield' : ''}${sleeping ? ' sleep' : ''}" style="--h:${hueOf(u.id)}">
    <span class="uin">${ART[u.id] ? `<span class="art has-art" style="${artStyle(u.id)}"></span>` : `<span class="art"><span class="mono">${initials(c.name)}</span></span>`}<span class="uname${c.name.length > 14 ? ' long' : ''}${longWord(c.name) > 10 ? ' xl' : ''}">${c.name}</span></span>
    <span class="st atk${atk > c.atk ? ' up' : ''}">${atk}</span>
    <span class="st hp${u.hp < u.maxHp ? ' hurt' : u.maxHp > c.hp ? ' up' : ''}">${u.hp}</span>
    ${u.shield ? '<span class="dshield" aria-label="Pajzs"></span>' : ''}${tags ? `<span class="tags">${tags}</span>` : ''}${u.items.length ? `<span class="gear">${u.items.length}</span>` : ''}</button>`;
}
function laneHTML(pi, tg) {
  return S.players[pi].board.map((u, i) => {
    const isT = tg.some(t => t.side === pi && t.i === i);
    return `<div class="cell${isT ? ' tgt' : ''}${closedLane(S, pi, i) ? ' closed' : ''}" data-side="${pi}" data-i="${i}">${u ? unitHTML(u, pi, i) : ''}${isT ? '<span class="sr-only">Érvényes célpont</span>' : closedLane(S, pi, i) ? '<span class="sr-only">Zárt hely</span>' : ''}</div>`;
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
  end.disabled = !myTurn; end.textContent = S.active === ME ? 'Kör vége' : 'Ellenfél köre';
  end.classList.toggle('wait', S.active !== ME); end.setAttribute('aria-label', end.textContent);
  const anyPlayable = hand.some((_, i) => canPlay(S, ME, i));
  end.classList.toggle('nudge', myTurn && !anyPlayable);
  setTimeout(tutCheck, 0);
  if (S.pvp) pvpOppDot();
  const eb = $('#emoBtn'); if (eb) eb.hidden = !S.pvp;
  // kéz
  const h = $('#hand');
  if (!ui.drag) {
  setHTML(h, hand.length ? hand.map((c, i) => cardHTML(c.id, {
    cost: cardCost(S, ME, c.id), foil: !!c.foil,
    cls: (ui.sel === i ? 'sel' : '') + (myTurn && canPlay(S, ME, i) ? ' ok' : myTurn ? ' dim' : ''),
    attrs: `data-hi="${i}" data-uid="${c.uid}" role="button" tabindex="0" aria-label="${CARD[c.id].name}${ui.sel === i ? ', kijelölve' : myTurn && canPlay(S, ME, i) ? ', kijátszható' : ''}"` })).join('') : '<span class="hand-empty">Üres a kezed</span>');
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
      : c.playTgt === 'push' ? (ui.pend.length < 2 ? 'Koppints arra az ellenséges karakterre, akit arrébb tolsz – vagy ne tolj senkit.' : 'Most koppints az ellenfél egyik üres helyére, oda kerül.')
      : 'Most válaszd ki, melyik ellenséges karaktert küldöd vissza.')
      : c.type === 'char' ? 'Húzd vagy koppints egy üres helyre.' : c.type === 'item' ? (c.tgt === 'enemy' ? 'Húzd rá vagy koppints egy ellenséges karakterre.' : 'Húzd rá vagy koppints a saját karakteredre.')
      : c.tgt === 'enemyEmpty' ? 'Húzd vagy koppints az ellenfél egyik üres helyére.' : c.tgt === 'ownOrHero' ? 'Húzd rá egy saját karakteredre vagy a hősödre.' : needs ? 'Húzd rá vagy koppints egy ellenséges karakterre.'
      : 'Húzd fel a táblára, vagy nyomd meg a Kijátszás gombot.';
    sb.hidden = false;
    sb.innerHTML = `<div><b>${c.name}</b> · ${textHTML(c) || (c.type === 'char' ? `${c.atk} támadás, ${c.hp} élet.` : '')}${hint ? `<span class="hint">${hint}</span>` : ''}</div>
      <div class="acts">${c.playTgt === 'push' && ui.pend.length ? '<button class="btn small primary" data-act="nopush">Senkit nem tolok</button>' : ''}<button class="btn small" data-act="cancel">Mégse</button></div>`;
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
  openModal(cardHTML(h.id, { big: true, foil: !!h.foil, cost: cardCost(S, ME, h.id), attrs: canDrag ? 'data-drag="1"' : '' }),
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
  else if (b.dataset.act === 'nopush' && ui.pend?.length) {   // Zsibrita: lerakás tolás nélkül
    const q = ui.pend[0], t = targetsFor(S, ME, S.players[ME].hand[ui.sel].id).find(x => x.k === 'slot' && x.side === q.side && x.i === q.i && !x.t2);
    if (t) doPlay(ui.sel, t);
  }
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
  if (m.some(t => t.t2)) { ui.pend = [{ side, i }]; render(); return true; }
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
    openModal(cardHTML(u.id, { big: true, foil: CARD[u.id].foilOnly || !!u.foil }), `Most: ${effAtk(S, side, +cell.dataset.i)} támadás, ${u.hp}/${u.maxHp} élet${u.shield ? ', Pajzs' : ''}${u.stun ? `, bénult még ${u.stun} körig` : ''}`,
      (gear ? `<div class="gear-box"><div class="gear-lbl">Eszközök rajta (${u.items.length}) · koppints a részletekért</div><div class="gear-row">${gear}</div></div>` : '') + cardHelpHTML(u.id, u));
    const ov = $('#layer').lastElementChild;
    ov.querySelector('.gear-row')?.addEventListener('click', ev => { const g = ev.target.closest('[data-gear]'); if (!g) return; ev.stopPropagation();
      openModal(cardHTML(g.dataset.gear, { big: true, foil: foilOf(+g.dataset.own, g.dataset.gear) }), `${CARD[u.id].name} karakteren · ${+g.dataset.own === ME ? 'te tetted rá' : 'az ellenfél tette rá'}`, cardHelpHTML(g.dataset.gear)); });
  }
  const hb = e.target.closest('[data-hero]');
  if (hb) { const gp = heroGoldOf(+hb.dataset.hero); openModal(heroCardHTML(heroOf(+hb.dataset.hero), { big: true, foil: !S.players[+hb.dataset.hero].baszo && heroFaOf(+hb.dataset.hero), gold: gp && !S.players[+hb.dataset.hero].baszo }), (+hb.dataset.hero === ME ? 'A te hősöd' : 'Az ellenfél hőse') + (gp ? ' · ✦ Arany' : '')); }
  if (e.target.closest('#loc') && S.location) openModal(cardHTML(S.location.id, { big: true, foil: S.location.foil ?? foilOf(S.location.owner, S.location.id) }), `Kijátszotta: ${S.location.owner === ME ? 'te' : 'az ellenfél'}`, cardHelpHTML(S.location.id));
});
$('#hand').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.hi) { e.preventDefault(); e.target.click(); } });

async function doPlay(hi, t) {
  const c0 = CARD[S.players[ME].hand[hi]?.id];
  if (c0 && c0.opts && (t == null || t.o == null)) {   // választós lap (Gluténbomba): előbb dönts
    const o = await chooseOpt(c0); if (o == null) { ui.sel = null; ui.pend = null; render(); return; }
    t = { k:'none', o };
  }
  busy = true; ui.sel = null; ui.pend = null;
  const id = S.players[ME].hand[hi].id;
  if (S.pvp) pvpSeed();
  await runFx(() => playCard(S, ME, hi, t));
  if (S.pvp) { unseedRng(); pvpPush('play', { hi, t, id }); }
  busy = false; render();
  if (S.winner != null) endMatch();
}
$('#logBtn').onclick = e => { e.stopPropagation(); if (S) openLog(); };
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
  const toHero = tj < 0 && (!opp || u.id === 'c_nyiti' || CARD[opp.id].invis);
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
  if (S.winner == null && S.players[pi].baszo && !S.players[pi].struck) { await baszoAnim(pi); await sleep(140); }
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
async function showPlayed(id, tg, foil) {
  if (foil == null) foil = foilOf(BOT, id);
  if (CARD[id].finisher) return;   // a kánon eseménynek saját, nagy bevonulása van (playIntro)
  const secret = !!CARD[id].sneak;
  const back = document.createElement('div'); back.className = 'played';
  back.innerHTML = `<div class="wrap"><span class="tag">${S.pvp ? escH(S.names?.[BOT] || 'Az ellenfél') : HERO[S.players[BOT].heroId].name} ${secret ? 'lerakott egy rejtett lapot' : 'kijátszotta'}</span><span class="flip rev"><span class="flip-in"><span class="face back"></span><span class="face front">${cardHTML(id, { big: true, foil })}</span></span></span>${foil && !CARD[id].sneak ? '<span class="fa-flash">✨ Full Art ✨</span>' : ''}<span class="skip">Koppints a folytatáshoz</span></div>`;
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
    await showPlayed(S.players[BOT].hand[ch.hi].id, ch.t, !!S.players[BOT].hand[ch.hi].foil);
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
// a pakli-jelvény kerek/négyzetes, a kirepülő lap viszont lap alakú (5:7) legyen: a jelvény közepéből indul
function pileRect(el) {
  const r = el.getBoundingClientRect(), h = r.height * 1.05, w = h * 5 / 7;
  return { left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2, width: w, height: h };
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
  const a = pileRect(pile), b = el.getBoundingClientRect(), g = drawGhost(a);
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
  const a = pileRect(pile), b = to.getBoundingClientRect(), g = drawGhost(a);
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
  S = newGame(heroId, { ...mine }, bh, bd, first, { mulligan: true, foils: [0, 1].map(k => k === ME ? myFoils(mine) : {}) }); S.events = [];
  ui.sel = null; busy = true; ui.handSeen = null; ui.botHandN = null; ui.flying = new Set(); show('scr-game');
  $('#layer').innerHTML = ''; render();
  setTimeout(() => showMulligan(first), 250 + S.players[ME].hand.length * 150 + 450);
}

// ---------- kezdő kéz cseréje (mint a Hearthstone-ban) ----------
function showMulligan(first) {
  const hand = S.players[ME].hand, pick = new Set();
  const o = document.createElement('div'); o.className = 'overlay mull';
  const look = id => `<span class="mull-look" data-look="${id}" role="button" aria-label="Megnézem">🔍 Megnézem</span>`;
  const cardsHTML = () => hand.map((c, i) => `<div class="mull-slot"><button class="mull-c${pick.has(i) ? ' swap' : ''}" data-mi="${i}" data-uid="${c.uid}">${cardHTML(c.id, { foil: !!c.foil })}<span class="mull-x">Csere</span></button>${look(c.id)}</div>`).join('');
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
    if (lk) { const id = lk.dataset.look; openModal(cardHTML(id, { big: true, foil: ownsFoil(id) }), `<i class="rar r-${CARD[id].rarity}" aria-hidden="true"></i> ${RAR[CARD[id].rarity]}`, cardHelpHTML(id)); return; }
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
        el.innerHTML = `<span class="mull-flip"><span class="mf-back"></span><span class="mf-front">${cardHTML(c.id, { foil: !!c.foil })}</span></span><span class="mull-new">Új</span>`;
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

// Nyertél / Vesztettél tábla: a képen lévő „Folytatás” gomb a menübe visz
const resultArt = win => `<div class="res-art${win ? ' win' : ' lose'}"><img src="art/ui/result-${win ? 'win' : 'lose'}.webp" alt="${win ? 'Nyertél – szép győzelem!' : 'Vesztettél – a következő csata a tiéd lehet!'}"><button class="res-go" data-r="menu" aria-label="Folytatás"></button></div>`;
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
  o.innerHTML = `<div class="modal result${win ? '' : ' lose'}${draw ? '' : ' resart'}">${draw ? '<h2 class="banner-h"><img src="art/ui/banner-draw.webp" alt="Döntetlen"></h2>' : resultArt(win)}<p>${why}</p>${reward}
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
  if (m.some(t => t.t2)) { ui.pend = [{ side, i }]; return 'pend'; }
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
