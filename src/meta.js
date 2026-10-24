// ===== Profil, gazdaság, boosterek, paklik =====
const ECON = { goldPlain: 0.005, goldShiny: 0.05, goldDupe: 100, heroFaChance: 0.02, shinyHero: 0.15, shinyPrice: 250, shinyVariant: 0.25, packPrice: 50, dailyCap: 200, win: 25, draw: 15, loss: 10, foilChance: 0.04, pityAfter: 10, godPack: 0.005,
               odds: [['l', 1.5], ['e', 6.5], ['r', 22], ['k', 70]] };
// a „token” lapok (pl. Query) csak más lap hatására kerülnek játékba: nincsenek packban, gyűjteményben, pakliban
const PLAYABLE = CARDS.filter(c => !c.token && !c.off);   // off: kánon esemény lap, amíg nincs hozzá grafika – sehol nem látszik
const SETS = { base: { name: 'Base set', cards: PLAYABLE.filter(c => !c.set && !c.variantOf && !c.passOnly && !c.eventOnly && !c.shopOnly).map(c => c.id) },
  /* Amszterdam hősei (első mini-szett, 2026-10-16, teszt ág): saját booster és Shiny booster, csak ennek a szettnek a lapjaival */
  ah: { name: 'Amsterdam Hősei', short: 'Amsterdam', cards: PLAYABLE.filter(c => c.set === 'ah' && !c.variantOf).map(c => c.id) } };   // passOnly: csak a Season Passból; eventOnly: csak eventből; shopOnly: csak a Boltból
const VARIANT_CHANCE = 0.2;   // ha az alaplap jön, 1 az 5-höz eséllyel a ritkább változata lesz belőle
const DECK_SIZE = 20;
const maxCopies = id => CARD[id].rarity === 'l' ? 1 : 2;
// változatok (pl. a ritkább Rehab) a pakliban az alaplappal együtt számítanak a 2-es korlátba
const baseOf = id => CARD[id].variantOf || id;
const sameCount = (list, id) => Object.entries(list).reduce((a, [x, k]) => a + (baseOf(x) === baseOf(id) ? k : 0), 0);
const today = () => new Date().toLocaleDateString('sv');   // YYYY-MM-DD, helyi idő szerint

const Store = { mode: 'loading', uid: null, db: null, ref: null, p: null, saving: Promise.resolve(), suggestName: '' };

function starterCollection() {
  const coll = {};
  for (const c of PLAYABLE) { if (c.variantOf || c.shopOnly || c.passOnly || c.eventOnly || c.set) continue; if (c.rarity === 'k') coll[c.id] = { n: 2, f: 0 }; else if (c.rarity === 'r' || c.finisher) coll[c.id] = { n: 1, f: 0 }; }
  return coll;
}
// Később bekerült gyakori lapok: a meglévő profilok is megkapják (gv = kiosztási verzió)
const STARTER_ADDS = { 2: ['a_delfin', 'i_varazsho', 'i_lepke'], 3: ['a_rehab'], 4: ['c_pp'], 5: ['c_nfc'], 6: ['a_cheddar'], 7: ['c_vajda', 'c_veghtomi'], 8: ['c_kovacs'], 9: ['a_kitiltva'], 10: ['a_haver'], 11: PLAYABLE.filter(c => c.rarity === 'r' && !c.variantOf && !c.set).map(c => c.id), 12: ['c_sasimeselo'], 13: ['c_norbi'], 14: ['c_udvarhelyi'], 15: ['c_molnar'], 16: CARDS.filter(c => c.finisher && !c.set).map(c => c.id), 17: ['c_barnaelet'], 18: ['c_amszterdam'], 19: ['c_davidsofor'], 20: ['a_szulinap'], 21: ['c_atiuldozott'], 22: ['c_alvari'], 23: ['a_amongus'], 24: ['a_espresso'], 25: ['f_vezetek'], 26: ['i_vodkasa'] };   // 26: Vodkása (2026-10-18, gyakori → mindenki kap 2-t)   // 25: Dávid új Kánonja (2026-10-18, a Munkahely helyett)   // 16: mindenki megkapja mind a 9 Kánon esemény lapot   // 12: Laci új kezdőpaklijához   // 11: minden ritka lapból 1 (a kezdőpaklikhoz)
const GRANT_V = Math.max(1, ...Object.keys(STARTER_ADDS).map(Number));
// Ajándékok: minden profil egyszer kapja meg (a meglévők a következő megnyitáskor, az újak létrehozáskor)
const GIFTS = [{ id: 'g-2026-09-28', packs: 1 }, { id: 'g-2026-09-28b', packs: 5 },
               { id: 'g-2026-09-28-fa', packs: 1, fa: true }, { id: 'g-2026-09-28-fa2', packs: 1, fa: true },
               { id: 'g-2026-09-28-fa3', packs: 1, fa: true }, { id: 'g-2026-09-28c', packs: 3 },
               { id: 'g-2026-09-28d', packs: 10 }, { id: 'g-2026-09-28e', packs: 10 },
               { id: 'g-2026-09-28-coin', coins: 500 },
               { id: 'g-2026-09-28-tomi-shiny', shiny: 3, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' },
               { id: 'g-2026-09-28-shiny1', shiny: 1 }, { id: 'g-2026-09-28-shiny3', shiny: 3 },
               { id: 'g-2026-09-28-tomi-shiny5', shiny: 5, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' },
               { id: 'g-2026-09-28-tomi-shiny3b', shiny: 3, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' },
               { id: 'g-2026-09-28-tomi-shiny5b', shiny: 5, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' },
               { id: 'g-2026-09-29-tomi-shiny5', shiny: 5, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' }, { id: 'g-2026-09-29-tomi-packs10', packs: 10, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' },
               { id: 'g-2026-09-29-tomi-shiny5b', shiny: 5, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' },
               { id: 'g-2026-09-29-tomi-shiny5c', shiny: 5, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' },
               { id: 'g-2026-09-29-tomi-shiny5d', shiny: 5, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' }, { id: 'g-2026-09-29-tomi-packs5', packs: 5, uid: 'u_HnZGtTolpJLediQ3MQ8Dzw' },
               { id: 'g-2026-09-30-all10', packs: 10 },
               { id: 'g-2026-10-01-tomi-shiny5', shiny: 5, code: '438YAF' }];   // uid: csak ennek a játékosnak   // egyszeri: garantált Full Art pack
// Duplikátum-beváltás: egy lapból legfeljebb 2 példány marad meg (Full Art-ot előnyben tartva), a többi lapként 2 coin
const DUPE_KEEP = 2, DUPE_COIN = 2, DUPE_COIN_RARE = 10;   // Full Art és változat-lap beváltása 10 coint ér
const dupeVal = (id, foil) => foil || CARD[id]?.variantOf ? DUPE_COIN_RARE : DUPE_COIN;
function convertDupes(p) {
  const out = {}; let coins = 0;
  for (const [id, e] of Object.entries(p.coll)) {
    let extra = e.n + e.f - DUPE_KEEP; if (extra <= 0) continue;
    const fromN = Math.min(extra, e.n); e.n -= fromN; extra -= fromN;
    const fromF = Math.min(extra, e.f); e.f -= fromF;
    out[id] = { n: fromN, f: fromF }; coins += fromN * dupeVal(id, false) + fromF * dupeVal(id, true);
  }
  p.coins += coins; p.dupeCoins = (p.dupeCoins || 0) + coins;
  return { coins, cards: out };
}
function applyGifts(p) {
  p.gifts = p.gifts || []; p.giftPacks = p.giftPacks || 0; p.faPacks = p.faPacks || 0;
  let n = 0, fa = 0, co = 0, sh = 0; p.shinyPacks = p.shinyPacks || 0;
  for (const g of GIFTS) if (!p.gifts.includes(g.id)) {
    if (g.uid && g.uid !== Store.uid) continue;   // személyre szóló ajándék
    if (g.code && (!Store.uid || typeof frCode !== 'function' || frCode(Store.uid) !== g.code)) continue;   // barátkódhoz kötött ajándék (saját app)
    p.gifts.push(g.id);
    if (g.shiny) { p.shinyPacks += g.shiny; sh += g.shiny; }
    else if (g.coins) { p.coins += g.coins; co += g.coins; }
    else if (g.fa) { p.shinyPacks += g.packs; sh += g.packs; } else { p.giftPacks += g.packs; n += g.packs; }
  }
  const parts = [];
  if (co) parts.push(`${co} coint`);
  if (sh) parts.push(`${sh} Shiny packot`);
  if (n) parts.push(`${n} ingyen Base set boostert`);
  if (fa) parts.push(`${fa === 1 ? 'egy' : fa} különleges packot, amiben biztosan van Full Art lap`);
  return parts.length ? { msg: `🎁 Ajándék: kaptál ${parts.join(', és ')}!${n || fa || sh ? ' A Boosterek menüben bonthatod ki.' : ''}` } : null;
}
// Új játékos: a korábbi ajándékokat nem kapja meg visszamenőleg, helyette üdvözlőcsomag jár.
// A regisztráció után kiosztott ajándékokat már ő is megkapja.
const WELCOME = { packs: 10, shinyPacks: 1 };
function newProfile(name) {
  return { v: 1, gv: GRANT_V, gifts: GIFTS.map(g => g.id), giftPacks: WELCOME.packs, faPacks: 0, shinyPacks: WELCOME.shinyPacks, name, coins: 0, coll: starterCollection(), decks: [], freeDate: '', earned: { date: '', amt: 0 },
           packs: 0, sinceEpic: 0, stats: { w: 0, l: 0, d: 0 }, created: today() };
}
// Full Art hősök: packból szerezhetők (p.heroFa[hősId] = darab)
const ownsHeroFa = hid => (Store.p?.heroFa?.[hid] || 0) > 0;
// Arany hősök: a legritkább lapok (p.heroGold[hősId] = darab); sima packban 0,5%, Shiny packban 5% eséllyel
const GOLD_HEROES = HEROES.filter(h => ART['g_' + h.id]).map(h => h.id);
const ownsHeroGold = hid => (Store.p?.heroGold?.[hid] || 0) > 0;
// melyik hős-portrét használja (sima / Full Art / arany): a választott, ha megvan; különben a legritkább, ami megvan
const ownsPort = id => (Store.p?.portraits || []).includes(id);
const heroSkins = hid => ['base'].concat(ownsHeroFa(hid) ? ['fa'] : [], ownsHeroGold(hid) && ART['g_' + hid] ? ['gold'] : [], Object.keys(PORTRAITS).filter(k => PORTRAITS[k].hero === hid && ownsPort(k) && ART[k]));
function heroSkin(hid) {
  const have = heroSkins(hid), pref = Store.p?.heroSkin?.[hid];
  return have.includes(pref) ? pref : have[have.length - 1];
}
const SKIN_NAME = { base: 'Sima', fa: 'Full Art', gold: '✦ Arany' };
const skinName = v => SKIN_NAME[v] || (PORTRAITS[v] ? PORTRAITS[v].name : v);
function skinModal(hid) {
  const h = HERO[hid], have = heroSkins(hid), cur = heroSkin(hid);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal tr-box skin-box"><h3>${escH(h.name)} – melyik portrét használod?</h3><p class="live">Ez látszik a meccseken (a PvP-ellenfeled is ezt látja), a pakliválasztóban és a menüben. Hosszan nyomva nagyban is megnézheted.</p>
    <div class="skin-row">${have.map(v => `<button class="skin-opt${v === cur ? ' on' : ''}" data-skin="${v}">${heroCardHTML(h, { foil: v === 'fa', gold: v === 'gold', port: isPort(v) ? v : null })}<span>${skinName(v)}${v === cur ? ' ✓' : ''}</span></button>`).join('')}</div>
    <button class="btn" data-x>Bezárás</button></div>`;
  o.onclick = async e => { const b = e.target.closest('button'); if (e.target === o || (b && b.hasAttribute('data-x'))) return o.remove(); if (!b || !b.dataset.skin) return;
    const p = Store.p; p.heroSkin = { ...(p.heroSkin || {}), [hid]: b.dataset.skin }; await save(); o.remove(); renderColl(); renderMenuFan(); toast(`${h.name}: ${skinName(b.dataset.skin)} portré beállítva`); };
  if (typeof longPress === 'function') longPress(o, '[data-skin]', b => heroBigView(hid, b.dataset.skin));   /* hosszan nyomva: nagyban */
  $('#layer').appendChild(o);
}
function rollHeroGold(p) {
  const h = GOLD_HEROES[Math.floor(Math.random() * GOLD_HEROES.length)];
  p.heroGold = p.heroGold || {}; const isNew = !p.heroGold[h]; p.heroGold[h] = (p.heroGold[h] || 0) + 1;
  return { id: 'gold:' + h, hero: h, gold: true, foil: true, isNew };
}
const pcRar = c => c.gold || (!c.hero && CARD[c.id]?.goldVar) ? 'g' : c.hero ? 'l' : CARD[c.id].rarity;
const pcName = c => c.hero ? HERO[c.hero].name : CARD[c.id].name;
const pcHTML = (c, o) => c.hero ? heroCardHTML(HERO[c.hero], { ...o, gold: c.gold }) : cardHTML(c.id, o);
function rollHeroFa(p) {
  const h = HEROES[Math.floor(Math.random() * HEROES.length)].id;
  p.heroFa = p.heroFa || {}; const isNew = !p.heroFa[h]; p.heroFa[h] = (p.heroFa[h] || 0) + 1;
  return { id: 'hero:' + h, hero: h, foil: true, isNew };
}
const owned = id => { const e = Store.p?.coll[id]; return e ? e.n + e.f : 0; };
const ownsFoil = id => (Store.p?.coll[id]?.f || 0) > 0;
const earnedToday = () => Store.p && Store.p.earned.date === today() ? Store.p.earned.amt : 0;
const AH_FREE_FROM = Date.UTC(2026, 9, 19, 22, 0, 0);   /* kedd 2026-10-20 0:00 (Budapest) – a napi ingyen pack innentől Amsterdam Hősei */
const freePackSet = () => (setLive('ah') && Date.now() >= AH_FREE_FROM) ? 'ah' : 'base';
const freePackReady = () => !!Store.p && Store.p.freeDate !== today();

// ---- mentés: felhő (Claude-fiók) vagy ez az eszköz ----
/* TESZT OLDAL (teszt ág, 2026-10-16): minden, ami nem az éles cím, teszt mód.
   A profil az éles profil MÁSOLATÁVAL indul (csak olvasás), és csak ezen az eszközön mentődik – az éles adatokba semmi nem íródik vissza.
   PvP, barátok, csere, nyilvános profil ki van kapcsolva. */
/* TEST_MODE: a ui.js elején definiálva (azt tölti be előbb a böngésző) */
const LS_KEY = TEST_MODE ? 'bestofus_TESZT_profile' : 'bestofus_profile_v1';
function lsGet() { try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function lsSet(p) { try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {} }

async function save() {
  const snap = JSON.parse(JSON.stringify(Store.p));
  if (Store.mode === 'cloud') {
    Store.saving = Store.saving.then(async () => {
      try { await Store.ref.set(snap); }
      catch (e) {
        if (e && e.code === 'unavailable') { await sleep(400 + Math.random() * 600); try { await Store.ref.set(snap); return; } catch {} }
        Store.mode = 'local'; lsSet(snap); renderProfileBar();
        toast('A felhőbe mentés nem sikerült, ezen az eszközön mentem');
      }
    });
    if (window.APP_MODE && !TEST_MODE) { if (!FR.unsubF) frStart(); else frPubSync(); }
    return Store.saving;
  }
  lsSet(snap);
}

function testBanner() {   /* teszt oldal jelzése + profil újramásolása */
  if (document.getElementById('testRibbon')) return;
  const b = document.createElement('div'); b.id = 'testRibbon';
  b.innerHTML = '🧪 TESZT – semmi nem kerül élesbe <button type="button" data-coin>+1000 coin</button><button type="button" data-reset>↺ Újramásolás</button>';
  b.querySelector('[data-coin]').onclick = () => { if (!Store.p) return; Store.p.coins += 1000; save(); renderProfileBar(); if (!$('#scr-shop').hidden) renderShop(); toast('🧪 +1000 coin (csak a teszt oldalon)'); };
  b.querySelector('[data-reset]').onclick = () => { if (!confirm('Visszaállítod a teszt profilt az éles profilod mostani másolatára? A teszten szerzett dolgok elvesznek.')) return;
    try { localStorage.removeItem(LS_KEY); } catch {} location.reload(); };
  document.body.appendChild(b);
}
/* TESZT OLDAL (2026-10-16, Tomi kérése): ezek a profilok (név szerint, kisbetűvel) a teszt oldalon minden gyűjthető lapot megkapnak
   (legendásból 1, a többiből 2 példány; bolti, Pass-, event- és változat-lapokkal együtt). Minden betöltéskor lefut, így az új lapokat is megkapják.
   Csak a teszt oldal helyi profil-másolatát érinti – az éles adatokhoz nem nyúl. */
const TEST_ALL_CARDS = ['btppictures', 'deanteszt'];   /* teszt oldalon minden lapot megkapnak (név szerint, kisbetűvel) */
function testGrantAll(p) {
  let n = 0;
  for (const c of PLAYABLE) { if (c.token || c.off) continue;
    const want = maxCopies(c.id), e = p.coll[c.id] || (p.coll[c.id] = { n: 0, f: 0 });
    if (e.n + e.f < want) { n += want - e.n - e.f; e.n = want - e.f; } }
  if (n) { save(); setTimeout(() => toast(`🧪 Teszt: megkaptad az összes lapot (+${n} példány)`), 1200); }
}
async function bootProfile() {
  renderProfileBar();
  let db = null, user = null;
  try { [db, user] = await Promise.all([window.claude?.use?.('db') ?? null, window.claude?.use?.('user') ?? null]); } catch {}
  let uid = null;
  if (user) { try { uid = await user.id(); const me = await user.me(); Store.suggestName = me.name || ''; } catch {} }
  if (db && uid) {
    try {
      Store.ref = db.doc('data/users/' + uid + '/profile');
      const snap = await Store.ref.get();
      Store.db = db; Store.uid = uid; Store.mode = 'cloud';
      if (TEST_MODE) { Store.mode = 'local'; Store.ref = null; Store.db = null; Store.testSrc = snap.exists ? snap.data() : null;   /* teszt: az éles profil csak kiinduló másolat */
        const mine = lsGet(); Store.p = migrate(mine || Store.testSrc); if (!mine && Store.p) lsSet(Store.p); }
      else if (snap.exists) Store.p = migrate(snap.data());
    } catch { Store.mode = 'local'; }
  } else Store.mode = 'local';
  if (Store.mode === 'local' && !Store.p) Store.p = migrate(lsGet());
  if (Store.p && Store.p._dirty) { delete Store.p._dirty; save(); }
  if (TEST_MODE && Store.p && TEST_ALL_CARDS.includes(String(Store.p.name || '').trim().toLowerCase())) testGrantAll(Store.p);   /* teszt: minden lap ennek a profilnak */
  if (Store.giftMsg) { const m = Store.giftMsg; Store.giftMsg = null; setTimeout(() => toast(m), 600); }
  if (Store.faMsg) { const m = Store.faMsg; Store.faMsg = null; setTimeout(() => toast(m), 4200); }
  if (Store.dupeMsg) { const m = Store.dupeMsg; Store.dupeMsg = null; setTimeout(() => toast(m), Store.giftMsg === null ? 2400 : 600); }
  if (Store.p) document.querySelectorAll('#layer .overlay.create').forEach(o => o.remove());
  renderProfileBar(); if (Store.p && GOLD_HEROES.some(ownsHeroGold)) renderMenuFan();
  if (!Store.p) showCreate(); else if (Store.p.onboard) startOnboarding();
  if (TEST_MODE) testBanner(); else { pvpStart(); renderPvpBadge(); pvpRoomInit(); frStart(); frRefresh(); }
}
function migrate(p) {
  /* 2026-10-19: a „Pifti, a király” bolti változat először tévesen a sima Pifti változata lett (c_pifti3) – átírjuk a helyesre */
  if (p.coll && p.coll.c_pifti3) { const o = p.coll.c_pifti3, n = p.coll.c_piftikiraly2 || (p.coll.c_piftikiraly2 = { n: 0, f: 0 }); n.n += o.n || 0; n.f += o.f || 0; delete p.coll.c_pifti3; p._dirty = true; }
  for (const d of p.decks || []) if (d.list && d.list.c_pifti3) { d.list.c_piftikiraly2 = (d.list.c_piftikiraly2 || 0) + d.list.c_pifti3; delete d.list.c_pifti3; p._dirty = true; }
  if (!p) return null;
  p = JSON.parse(JSON.stringify(p));
  p.coll = p.coll || starterCollection(); p.decks = p.decks || [];
  p.earned = p.earned || { date: '', amt: 0 }; p.stats = p.stats || { w: 0, l: 0, d: 0 };
  for (let g = (p.gv || 1) + 1; g <= GRANT_V; g++) for (const id of STARTER_ADDS[g] || []) {
    if (!CARD[id]) continue; const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); if (e.n + e.f < (CARD[id].rarity === 'k' ? 2 : 1)) e.n = (CARD[id].rarity === 'k' ? 2 : 1) - e.f;
  }
  if ((p.gv || 1) < GRANT_V) p._dirty = true;
  for (const d of p.decks || []) if (d.list && d.list.f_munkahely) { d.list.f_vezetek = (d.list.f_vezetek || 0) + d.list.f_munkahely; delete d.list.f_munkahely; p._dirty = true; }   /* 2026-10-18: a Munkahely megszűnt → Bocsi, de vezetek */
  const g = applyGifts(p); if (g) { p._dirty = true; Store.giftMsg = g.msg; }
  if (p.faPacks > 0) { p.shinyPacks = (p.shinyPacks || 0) + p.faPacks; Store.faMsg = `A ${p.faPacks} Full Art packod Shiny packká alakult`; p.faPacks = 0; p._dirty = true; }
  const dc = { coins: 0 };   // lapokat már nem váltunk be automatikusan (csere miatt) – csak kézzel, a Gyűjteményben
  // Full Art hősből elég 1: a többi darabonként 10 coint ér
  for (const h of Object.keys(p.heroGold || {})) if (p.heroGold[h] > 1) { const x = p.heroGold[h] - 1; p.heroGold[h] = 1; p.coins += x * ECON.goldDupe; dc.coins += x * ECON.goldDupe; }
  for (const h of Object.keys(p.heroFa || {})) if (p.heroFa[h] > 1) { const x = p.heroFa[h] - 1; p.heroFa[h] = 1; p.coins += x * DUPE_COIN_RARE; dc.coins += x * DUPE_COIN_RARE; }
  if (dc.coins) { p._dirty = true; Store.dupeMsg = `A fölösleges hős-példányaid beváltódtak: +${dc.coins} coin`; }
  // csak boltban / Season Passban szerezhető változatokból 2 példány jár (régebben 1-et adtunk)
  for (const c of CARDS) if (c.variantOf && (c.shopOnly || c.passOnly)) { const e = p.coll[c.id]; if (!e) continue;
    if (c.shopOnly && e.n + e.f > 0 && e.n + e.f < 2) { e.n = 2 - e.f; p._dirty = true; }
    if (c.passOnly && e.f > 0 && e.f < 2) { e.f = 2; p._dirty = true; } }
  p.gv = GRANT_V;
  // kivett lapok eltávolítása a paklikból
  for (const d of p.decks) for (const id of Object.keys(d.list)) if (!CARD[id] || CARD[id].token) delete d.list[id];
  for (const id of Object.keys(p.coll)) if (CARD[id]?.token) { delete p.coll[id]; p._dirty = true; }
  return p;
}

// ---- fiók létrehozása ----
// 2026-10-13: betöltés közben a menü nem nyomható, és az „Új játékos” ablak soha nem írhat felül egy betöltött profilt
function needProfile() {
  if (Store.p) return false;
  if (Store.mode === 'loading') { toast('Pillanat, töltöm a profilod…'); return true; }
  showCreate(); return true;
}
function showCreate() {
  if (Store.p || Store.mode === 'loading' || $('#layer .overlay.create')) return;
  const o = document.createElement('div'); o.className = 'overlay create';
  o.innerHTML = `<form class="modal create-box" id="createForm" novalidate>
      <div class="cb-back" aria-hidden="true"></div>
      <h2>Új játékos</h2>
      <p>Válassz játékosnevet. Ezzel a névvel látnak majd a barátaid.</p>
      <label class="fld"><span>Játékosnév</span><input id="pname" maxlength="18" autocomplete="nickname" required></label>
      <div class="gift"><b>Kezdőcsomag</b><span>Mind a ${HEROES.length} hős · minden gyakori lap 2× · minden ritka lap 1× · ${Object.keys(DECKS).length} kész pakli (minden hősnek egy)</span></div>
      ${window.APP_MODE ? `<label class="fld inv-fld"><span>Meghívó kód <i>(nem kötelező)</i></span><input id="pinv" maxlength="7" autocapitalize="characters" spellcheck="false" placeholder="pl. AB12CD"></label><small class="inv-who" id="pinvWho" hidden></small>` : ''}
      <p class="err" id="perr" hidden></p>
      <button class="btn primary" type="submit">Játékos létrehozása</button>
      <small class="where">${window.APP_MODE ? 'A profilod a fiókodhoz kötve, a felhőben mentődik.' : Store.mode === 'cloud' ? 'A profilod a Claude-fiókodhoz kötve mentődik.' : 'A profilod ezen az eszközön mentődik.'}</small>
      ${window.APP_MODE ? '<button type="button" class="linkish" id="cImport">Játszottál már a régi verzióval? Hozd át a profilod kóddal</button>' : ''}
    </form>`;
  $('#layer').appendChild(o);
  const inp = o.querySelector('#pname'); inp.value = Store.suggestName.split(' ')[0] || '';
  o.querySelector('#cImport')?.addEventListener('click', () => importModal(() => o.remove()));
  const invIn = o.querySelector('#pinv');
  if (invIn) {   // meghívó linkről jött: kitöltjük, és megmutatjuk, ki hívta meg
    invIn.value = frInvGet();
    const who = async () => { const c = invIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''), el = o.querySelector('#pinvWho');
      if (c.length !== 6) { el.hidden = true; return; }
      const n = await frInvName(c); if (invIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '') !== c) return;
      el.hidden = false; el.textContent = n ? `🤝 ${n} hívott meg – automatikusan barátok lesztek` : 'Nincs ilyen kódú játékos'; };
    invIn.addEventListener('input', who); who();
  }
  setTimeout(() => inp.focus(), 50);
  o.querySelector('#createForm').onsubmit = async e => {
    e.preventDefault();
    const name = inp.value.trim().replace(/\s+/g, ' ');
    const err = o.querySelector('#perr');
    if (name.length < 2) { err.hidden = false; err.textContent = 'A név legalább 2 karakter legyen.'; return; }
    if (invIn) { const c = invIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); try { c.length === 6 ? localStorage.setItem('bou_inv', c) : localStorage.removeItem('bou_inv'); } catch {} }
    if (Store.p || Store.mode === 'loading') { o.remove(); renderProfileBar(); toast(Store.p ? 'Betöltöttem a profilodat' : 'Pillanat, töltöm a profilod…'); return; }   // közben betöltődött a meglévő profil: nem írjuk felül
    Store.p = newProfile(name); Store.p.onboard = true; await save(); o.remove();
    renderProfileBar(); startOnboarding();
    if (window.APP_MODE) frApplyInvite();
  };
}

// ---- profilsáv a menüben ----
// ---- fiók: átvitel a régi (Claude-os) verzióból az új appba, kijelentkezés ----
const XFER_PREFIX = 'BOU1.';
function b64u(str) { const b = new TextEncoder().encode(str); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); }
function exportCode(p) { const j = JSON.stringify(p); return XFER_PREFIX + b64u(j) + '.' + pvpHash(j).toString(36); }
function parseCode(code) {
  code = String(code || '').replace(/\s+/g, '');
  if (!code.startsWith(XFER_PREFIX)) throw new Error('Ez nem Best of Us profilkód.');
  const [body, sum] = code.slice(XFER_PREFIX.length).split('.');
  let j; try { j = unb64u(body); } catch { throw new Error('A kód sérült – másold ki újra az egészet.'); }
  if (pvpHash(j).toString(36) !== sum) throw new Error('A kód hiányos vagy sérült – másold ki újra az egészet.');
  const p = JSON.parse(j); if (!p || !p.coll || !p.name) throw new Error('A kódban nincs profil.');
  return p;
}
$('#saveState').onclick = () => { if (Store.p || window.APP_MODE) acctModal(); };
$('#installBtn').onclick = () => window.APP_INSTALL?.();
function acctModal() {
  const o = document.createElement('div'); o.className = 'overlay';
  if (window.APP_MODE) {
    const who = window.APP_USER?.() || '';
    o.innerHTML = `<div class="modal acct-box"><h3>Fiók</h3>
      <p class="live">Belépve: <b></b></p>
      <p class="live">A gyűjteményed a fiókodhoz kötve, a felhőben van – bármelyik telefonon belépve folytathatod.</p>
      <button class="btn" data-a="import">Régi profil betöltése kódból</button>
      <button class="btn" data-a="out">Kijelentkezés</button>
      <small class="where">Verzió: ${escH(window.APP_BUILD || window.APP_VERSION || '')}</small>
      <button class="btn primary" data-x>Bezárás</button></div>`;
    o.querySelector('b').textContent = who;
  } else {
    o.innerHTML = `<div class="modal acct-box"><h3>Átköltözés az új appba</h3>
      <p class="live">A Best of Us hamarosan saját appként fut. Ezzel a kóddal a teljes profilodat (lapok, coin, Full Art és arany lapok, pass, küldetések) átviheted.</p>
      <ol class="xfer-steps"><li>Nyomd meg a <b>Kód másolása</b> gombot.</li><li>Nyisd meg az új appot, lépj be, és a profil létrehozásánál válaszd: <b>Hozd át a profilod kóddal</b>.</li><li>Illeszd be a kódot.</li></ol>
      <textarea class="xfer-code" readonly rows="4"></textarea>
      <button class="btn primary" data-a="copy">📋 Kód másolása</button>
      <button class="btn" data-x>Bezárás</button></div>`;
    o.querySelector('textarea').value = Store.p ? exportCode(Store.p) : 'Még nincs profilod.';
  }
  o.onclick = async e => {
    const b = e.target.closest('[data-a],[data-x]');
    if (e.target === o || (b && b.hasAttribute('data-x'))) return o.remove();
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'out') { if (confirm('Biztosan kijelentkezel?')) window.APP_LOGOUT?.(); }
    if (a === 'import') { o.remove(); importModal(); }
    if (a === 'copy') {
      const ta = o.querySelector('textarea');
      try { await navigator.clipboard.writeText(ta.value); toast('Kód kimásolva ✔'); }
      catch { ta.select(); try { document.execCommand('copy'); toast('Kód kimásolva ✔'); } catch { toast('Jelöld ki és másold ki kézzel'); } }
    }
  };
  $('#layer').appendChild(o);
}
function importModal(done) {
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box"><h3>Profil átvitele</h3>
    <p class="live">A régi (Claude-os) verzióban a menü alján: <b>☁️ Felhőben mentve</b> → <b>Kód másolása</b>. Aztán ide illeszd be:</p>
    <textarea class="xfer-code" rows="5" placeholder="BOU1.…"></textarea>
    <p class="err" hidden></p>
    <button class="btn primary" data-a="go">Profil betöltése</button>
    <button class="btn" data-x>Mégse</button></div>`;
  const ta = o.querySelector('textarea'), err = o.querySelector('.err');
  o.onclick = async e => {
    const b = e.target.closest('[data-a],[data-x]');
    if (e.target === o || (b && b.hasAttribute('data-x'))) return o.remove();
    if (!b) return;
    let p; try { p = parseCode(ta.value); } catch (x) { err.hidden = false; err.textContent = x.message; return; }
    if (Store.p && !confirm(`Ezzel a mostani profilod (${Store.p.name}) helyére a régi kerül (${p.name}). Folytatod?`)) return;
    Store.p = migrate(p); Store.p.importedAt = Date.now(); delete Store.p._dirty;
    await save(); o.remove(); done && done();
    renderProfileBar(); renderMenuFan(); toast(`Üdv újra, ${Store.p.name}! A profilod átkerült ✔`);
  };
  $('#layer').appendChild(o); setTimeout(() => ta.focus(), 50);
}

function renderProfileBar() {
  const el = $('#profileBar'); if (!el) return;
  document.body.classList.toggle('pf-loading', !Store.p && Store.mode === 'loading');
  if (!Store.p) { el.innerHTML = `<span class="pb-name">${Store.mode === 'loading' ? 'Profil betöltése…' : 'Nincs profil'}</span>`; return; }
  const p = Store.p, e = earnedToday();
  el.innerHTML = `<div class="pb-who"><span class="pb-name"></span><small>${p.stats.w} győzelem</small></div>
    <div class="pb-coins"><span class="coin" aria-hidden="true"></span><b>${p.coins}</b></div>
    <div class="pb-day"><small>Mai coin</small><div class="meter"><i style="width:${e / ECON.dailyCap * 100}%"></i></div><small class="num">${e}/${ECON.dailyCap}</small></div>`;
  const ss = $('#saveState'); if (ss) ss.textContent = window.APP_MODE ? '👤 Fiók' : Store.mode === 'cloud' ? '☁️ Felhőben mentve' : '📱 Ezen az eszközön mentve';
  el.querySelector('.pb-name').textContent = p.name;
  try { applyBack(); } catch (e) {}
  renderQuestBadge(); renderPassBadge(); try { renderRankTile(); } catch (e) {} try { renderEventTile(); } catch (e) {} try { if (chestWeeklyCheck()) Store.p.chestNew = true; } catch (e) {} try { ahLaunchGift(); } catch (e) {} try { if (!$('#scr-menu').hidden) { dayGiftCheck(); backAwardCheck(); deckLinkCheck(); evGiftCheck(); ahNewsCheck(); chestPopup(); } } catch (e) {}
  const wb = $('#wheelBadge'); if (wb) wb.hidden = !wheelReady();
  const badge = $('#shopBadge'); if (badge) badge.hidden = !freePackReady() && !(p.giftPacks > 0) && !(p.faPacks > 0) && !(p.shinyPacks > 0) && !(p.ahPacks > 0) && !(p.ahShinyPacks > 0) && !(p.chests > 0);
}

// ---- jutalom meccs végén ----
function awardMatch(result) {
  if (!Store.p) return null;
  const p = Store.p, d = today();
  if (p.earned.date !== d) p.earned = { date: d, amt: 0 };
  const base = result === 'win' ? ECON.win : result === 'draw' ? ECON.draw : ECON.loss;
  const gain = Math.max(0, Math.min(base, ECON.dailyCap - p.earned.amt));
  p.coins += gain; p.earned.amt += gain;
  p.stats[result === 'win' ? 'w' : result === 'draw' ? 'd' : 'l']++;
  save(); renderProfileBar();
  return { gain, capped: gain < base, today: p.earned.amt };
}

// ---- booster ----
function rollRarity() {
  let r = Math.random() * 100;
  for (const [k, w] of ECON.odds) { if (r < w) return k; r -= w; }
  return 'k';
}
/* ---- GOD PACK (2026-10-20, Tomi): minden pack 0,5% eséllyel – 5 lap 3 helyett, mind Full Art, egyikük legalább arany.
   Titok: sehol nincs kiírva (esélyek közt sem), csak aki kinyitja, látja. Teszt oldalon (TEST_MODE) az első bontás eszközönként biztosan God pack. */
function godForce() { if (!TEST_MODE) return false; try { if (localStorage.getItem('bou_god_t3') === '1') return false; localStorage.setItem('bou_god_t3', '1'); return true; } catch { return false; } }
function godPackRoll(setId) {
  const p = Store.p, pool = SETS[setId].cards, order = { k: 0, r: 1, e: 2, l: 3 };
  const rars = [rollRarity(), 'e', 'l'].sort((a, b) => order[a] - order[b]);   // legalább egy epikus és egy legendás
  p.sinceEpic = 0;
  const out = rars.map(rar => {
    let ids = pool.filter(id => CARD[id].rarity === rar);
    for (const lo of ['l', 'e', 'r', 'k']) { if (ids.length) break; if (order[lo] < order[rar]) ids = pool.filter(id => CARD[id].rarity === lo); }
    const id = ids[Math.floor(Math.random() * ids.length)], isNew = !ownsFoil(id);
    const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); e.f++;
    return { id, foil: true, isNew };
  });
  /* 2026-10-20 (Tomi): + egy ritka változat (skin), ami még NINCS meg a játékosnak – előbb a packból jövő változatok, aztán a többi (bolti / passos), végső esetben bármelyik packos */
  const vOk = v => v.variantOf && !v.goldVar && !v.wheelOnly && !v.eventOnly && !v.off && !v.diamond && ART[v.id];
  const packV = CARDS.filter(v => vOk(v) && !v.passOnly && !v.shopOnly), anyV = CARDS.filter(vOk);
  const vPool = [packV.filter(v => !owned(v.id)), anyV.filter(v => !owned(v.id)), packV].find(a => a.length) || [];
  if (vPool.length) { const id = vPool[Math.floor(Math.random() * vPool.length)].id, isNew = !owned(id);
    const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); e.f++; out.splice(1, 0, { id, foil: true, isNew, skin: true }); }
  else { const ids = pool.filter(id => CARD[id].rarity === 'r'), id = ids[Math.floor(Math.random() * ids.length)];
    const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); e.f++; out.splice(1, 0, { id, foil: true, isNew: e.f === 1 }); }
  const setGold = setId !== 'base' ? CARDS.filter(v => v.goldVar && v.set === setId).map(v => v.id) : [];
  if (setGold.length) { const id = setGold[Math.floor(Math.random() * setGold.length)], isNew = owned(id) === 0;
    const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); e.n++; out.push({ id, foil: false, gold: true, isNew }); }
  else if (setId === 'base' && GOLD_HEROES.length) out.push(rollHeroGold(p));
  else { const ids = pool.filter(id => CARD[id].rarity === 'l'), id = ids[Math.floor(Math.random() * ids.length)], isNew = !ownsFoil(id);   /* nincs arany a szettben: még egy legendás Full Art */
    const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); e.f++; out.push({ id, foil: true, isNew }); }
  out.god = true; p.godPacks = (p.godPacks || 0) + 1;
  return out;
}
function openPackRoll(setId, forceFoil = false, shiny = false) {
  const p = Store.p, pool = SETS[setId].cards;
  if (Math.random() < ECON.godPack || godForce()) return godPackRoll(setId);
  const slots = [rollRarity(), rollRarity(), rollRarity()];
  if (slots.every(x => x === 'k')) slots[2] = 'r';                       // legalább egy ritka
  const hasEpic = slots.some(x => x === 'e' || x === 'l');
  if (!hasEpic && p.sinceEpic + 1 >= ECON.pityAfter) slots[2] = 'e';       // szánalomrendszer
  p.sinceEpic = slots.some(x => x === 'e' || x === 'l') ? 0 : p.sinceEpic + 1;
  const order = { k: 0, r: 1, e: 2, l: 3 };
  slots.sort((a, b) => order[a] - order[b]);
  const faSlot = forceFoil || shiny ? 2 : -1;   // garantált Full Art: a pack legjobb lapja lesz az
  // Shiny pack: a különleges hely 25% eséllyel változat-lap (pl. a zöld Rehab), különben Full Art
  const extra = setId !== 'base';   /* kiegészítő pack (pl. Amszterdam hősei): csak a szett lapjai */
  const allVars = extra ? [] : CARDS.filter(v => v.variantOf && !v.passOnly && !v.shopOnly && !v.wheelOnly && !v.goldVar);
  const sr = Math.random();
  const varSlot = shiny && allVars.length && sr < ECON.shinyVariant ? 2 : -1;
  // Full Art hős: sima packban kis eséllyel a leggyengébb lap helyén, Shiny packban a különleges helyen
  const heroSlot = extra ? -1 : shiny ? (varSlot < 0 && sr < ECON.shinyVariant + ECON.shinyHero ? 2 : -1) : (Math.random() < ECON.heroFaChance ? 0 : -1);
  const setGold = extra ? CARDS.filter(v => v.goldVar && v.set === setId).map(v => v.id) : [];   /* kiegészítő: arany lap (0,5% / Shiny 5%) */
  const goldSlot = (extra ? setGold.length : GOLD_HEROES.length) && Math.random() < (shiny ? ECON.goldShiny : ECON.goldPlain) ? 0 : -1;   // Arany hős: a pack első lapja helyén
  return slots.map((rar, si) => {
    if (si === goldSlot && extra) { const id = setGold[Math.floor(Math.random() * setGold.length)], isNew = owned(id) === 0;
      const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); e.n++; return { id, foil: false, gold: true, isNew }; }
    if (si === goldSlot) return rollHeroGold(p);
    if (si === heroSlot) return rollHeroFa(p);
    let ids = pool.filter(id => CARD[id].rarity === rar);
    for (const lo of ['l', 'e', 'r', 'k']) { if (ids.length) break; if (order[lo] < order[rar]) ids = pool.filter(id => CARD[id].rarity === lo); }
    let id = ids[Math.floor(Math.random() * ids.length)];
    const vars = CARDS.filter(v => v.variantOf === id && !v.passOnly && !v.shopOnly && !v.wheelOnly && !v.goldVar);
    if (vars.length && Math.random() < VARIANT_CHANCE) id = vars[Math.floor(Math.random() * vars.length)].id;
    if (si === varSlot) id = allVars[Math.floor(Math.random() * allVars.length)].id;
    const foil = (si === faSlot && si !== varSlot) || Math.random() < ECON.foilChance;
    const isNew = owned(id) === 0 || (foil && !ownsFoil(id));
    const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 });
    if (foil) e.f++; else e.n++;
    return { id, foil, isNew };
  });
}
// ---- Heti láda (2026-10-14): minden hétfőn 0:01-kor mindenki kap egyet ----
// 10 lap: 1 biztos epikus vagy legendás, 1 biztos Full Art, 8 véletlen (mint a packban); 0,5% eséllyel egy hős-portré is (bolti vagy eseményes)
const CHEST = { cards: 10, portChance: 0.005, price: 500 };
// ha egy kép nem töltődik be (pl. kitétel közben rossz válasz ragadt a telefon gyorsítótárában), egyszer újrakérjük a netről, más címmel
function imgRetry(el) { if (el.dataset.retry === el.src) return; const u = el.src + (el.src.includes('?') ? '&' : '?') + 'r=' + Date.now(); el.dataset.retry = u; el.src = u; }
function rollCardSlot(p, rar, foil) {
  /* 2026-10-19 (Tomi): a heti ládában minden megjelent szett lapjai lehetnek (Base set + Amsterdam Hősei…); az event-lapok nem */
  const all = Object.keys(SETS).filter(k => setLive(k)).flatMap(k => SETS[k].cards);
  let pool = all.filter(id => CARD[id].rarity === rar);
  if (!pool.length) pool = SETS.base.cards.filter(id => CARD[id].rarity === rar);
  let id = pool[Math.floor(Math.random() * pool.length)];
  const vars = CARDS.filter(v => v.variantOf === id && !v.passOnly && !v.shopOnly && !v.wheelOnly && !v.goldVar);
  if (vars.length && Math.random() < VARIANT_CHANCE) id = vars[Math.floor(Math.random() * vars.length)].id;
  foil = foil || Math.random() < ECON.foilChance;
  const isNew = owned(id) === 0 || (foil && !ownsFoil(id));
  const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 });
  if (foil) e.f++; else e.n++;
  return { id, foil, isNew };
}
const portStarted = k => !PORTRAITS[k].from || new Date() >= new Date(PORTRAITS[k].from + 'T00:00');   // from: ettől a naptól kapható a Boltban
/* until (2026-10-16): eddig a napig (kizárólag) volt a Boltban – utána lekerül, de aki megvette, megtartja, és a heti ládában továbbra is jöhet */
const onSale = x => !x.until || new Date() < new Date(x.until + 'T00:00');
const portOnSale = k => portStarted(k) && onSale(PORTRAITS[k]);
const chestPorts = p => Object.keys(PORTRAITS).filter(k => (PORTRAITS[k].price || PORTRAITS[k].event) && portStarted(k) && ART[k] && !(p.portraits || []).includes(k));
function chestRoll() {
  const p = Store.p, out = [];
  out.push(rollCardSlot(p, Math.random() < 1.5 / 8 ? 'l' : 'e', false));   // biztos epikus vagy jobb (a pack-esélyek arányában)
  let fr = rollRarity(); out.push(rollCardSlot(p, fr, true));               // biztos Full Art
  for (let k = 2; k < CHEST.cards; k++) out.push(rollCardSlot(p, rollRarity(), false));
  p.sinceEpic = 0;
  const order = { k: 0, r: 1, e: 2, l: 3 };
  out.sort((a, b) => order[CARD[a.id].rarity] - order[CARD[b.id].rarity] || (a.foil ? 1 : 0) - (b.foil ? 1 : 0));
  let port = null;
  const pp = chestPorts(p);
  if (pp.length && Math.random() < CHEST.portChance) { port = pp[Math.floor(Math.random() * pp.length)]; p.portraits = [...(p.portraits || []), port]; }
  for (const c of out) if (!c.isNew) c.have = owned(c.id);
  return { cards: out, port };
}
function chestWeeklyCheck() {
  const p = Store.p; if (!p || p.onboard) return false;
  const wk = weekKey();
  if (p.chestWeek === wk) return false;
  p.chestWeek = wk; p.chests = (p.chests || 0) + 1; save();
  return true;
}
function chestPopup() {
  try { if (ahNewsCheck()) return; } catch (e) {}   /* előbb az Amszterdam-hír (ha még nem látta), utána a láda */
  const p = Store.p; if (!p || !(p.chestNew) || $('#layer .overlay') || (typeof S !== 'undefined' && S)) return;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box chest-pop"><h3>🧰 Megérkezett a heti ládád!</h3><img class="chest-pop-img" src="art/ui/chest-closed.webp" alt="Heti láda" onerror="imgRetry(this)">
    <p class="live"><b>10 lap</b>, köztük egy <b>biztos epikus vagy legendás</b> és egy <b>biztos Full Art</b>. Kis szerencsével egy ritka hős-portré is lapulhat benne. Minden hétfőn jön egy új.</p>
    <button class="btn primary" data-open>Kinyitom!</button><button class="btn ghost" data-x>Később (a Boltban vár)</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-open]')) { o.remove(); p.chestNew = false; save(); openChest(); } else if (e.target.closest('[data-x]')) { o.remove(); p.chestNew = false; save(); renderProfileBar(); } };
  $('#layer').appendChild(o);
}
async function openChest() {
  const p = Store.p; if (!p || !(p.chests > 0)) return;
  p.chests--; p.chestsOpened = (p.chestsOpened || 0) + 1;
  const res = chestRoll();
  await save(); renderProfileBar(); try { renderShop(); } catch (e) {}
  await chestOpening(res.cards, res.port);
}
async function buyChest() {
  const p = Store.p; if (!p) return;
  if (p.chests > 0) return openChest();
  if (p.coins < CHEST.price) return toast(`Nincs elég coinod (${p.coins}/${CHEST.price})`);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box chest-pop"><h3>🧰 Extra heti láda</h3><img class="chest-pop-img" src="art/ui/chest-closed.webp" alt="Heti láda" onerror="imgRetry(this)">
    <p class="live">Az e heti ingyen ládádat már kinyitottad. Most vehetsz egy extrát: <b>10 lap</b>, köztük egy <b>biztos epikus vagy legendás</b> és egy <b>biztos Full Art</b>, kis eséllyel egy ritka hős-portré.</p>
    <div class="row2"><button class="btn" data-x>Mégse</button><button class="btn primary" data-ok><span class="coin sm" aria-hidden="true"></span> ${CHEST.price} · Megveszem</button></div></div>`;
  $('#layer').appendChild(o);
  const ok = await new Promise(r => { o.onclick = e => { if (e.target.closest('[data-ok]')) r(true); else if (e.target.closest('[data-x]') || e.target === o) r(false); }; });
  o.remove(); if (!ok || p.coins < CHEST.price) return;
  p.coins -= CHEST.price; p.chests = (p.chests || 0) + 1; p.chestsBought = (p.chestsBought || 0) + 1;
  await openChest();
}
function chestPanelHTML() {
  const p = Store.p, n = p.chests || 0, nx = weekEnds(), d = Math.ceil((nx - new Date()) / 864e5);
  const when = d <= 1 ? 'holnap 0:01-kor' : `hétfőn 0:01-kor (${d} nap múlva)`;
  const poor = !n && p.coins < CHEST.price;
  return `<button class="chest-card${n ? ' ready' : poor ? ' poor' : ''}" id="chestBtn" aria-label="Heti láda – ${n ? 'kinyitás' : CHEST.price + ' coin'}">
    <img class="cc-img" src="${n ? 'art/ui/chest-closed-sm.webp' : 'art/ui/chest-open-sm.webp'}" alt="" aria-hidden="true" onerror="imgRetry(this)">
    <span class="cc-txt"><b>Heti láda</b><small>10 lap · 1 biztos epikus+ · 1 biztos Full Art</small>
      <em>${n ? `${n > 1 ? `${n} láda vár rád!` : 'A heti ládád vár rád!'}` : `Következő ingyen láda: ${when}`}</em></span>
    <span class="cc-act">${n ? `Kinyitom${n > 1 ? ` <i>${n}</i>` : ''}` : `<span class="coin sm" aria-hidden="true"></span>${CHEST.price}`}</span>
  </button>`;
}
async function chestOpening(cards, port) {
  const o = document.createElement('div'); o.className = 'overlay opening chest-op';
  o.innerHTML = `<div class="op-stage"><div class="ch-wrap"><div class="ch-rays"></div><img class="ch-img" src="art/ui/chest-closed.webp" alt="Heti láda" onerror="imgRetry(this)"></div><div class="op-hint">Koppints a ládára!</div></div>`;
  $('#layer').appendChild(o);
  const wrap = o.querySelector('.ch-wrap'), img = o.querySelector('.ch-img');
  wrap.animate([{ transform: 'translateY(60px) scale(.7)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,1.3,.4,1)' });
  wrap.classList.add('ready');
  await new Promise(r => wrap.addEventListener('click', r, { once: true }));
  wrap.classList.remove('ready'); o.querySelector('.op-hint').remove();
  // megremeg, egyre erősebben, aztán kicsapódik a teteje
  await wrap.animate(Array.from({ length: 14 }, (_, k) => { const j = 1 + k * .55; return { transform: `rotate(${(k % 2 ? 1 : -1) * j}deg) translateX(${(k % 2 ? -1 : 1) * j}px) scale(${1 + k * .006})` }; }),
                     { duration: 900, easing: 'ease-in' }).finished;
  const flash = document.createElement('div'); flash.className = 'op-flash gold'; o.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 650 });
  img.src = 'art/ui/chest-open.webp'; wrap.classList.add('open');
  const rays = o.querySelector('.ch-rays');
  rays.animate([{ opacity: 0, transform: 'translate(-50%,-55%) scale(.3) rotate(0deg)' }, { opacity: 1, transform: 'translate(-50%,-55%) scale(1.15) rotate(70deg)' }], { duration: 1400, easing: 'ease-out', fill: 'forwards' });
  wrap.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,1.4,.4,1)' });
  const r = img.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .45;
  for (let k = 0; k < 46; k++) {
    const c = document.createElement('i'), coin = k % 2 === 0; c.className = coin ? 'gold-coin' : 'rare-spark';
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, d = 140 + Math.random() * 240, sz = coin ? 12 + Math.random() * 8 : 4 + Math.random() * 7;
    c.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;${coin ? '' : 'background:#ffe07a;box-shadow:0 0 12px #ffc21a'}`;
    o.appendChild(c);
    c.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 260}px)) scale(.5) rotateY(${coin ? 720 : 0}deg)`, opacity: 0 }],
              { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.15,.6,.4,1)', fill: 'forwards' });
  }
  await sleep(1300);
  await wrap.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-40px) scale(.6)', opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' }).finished;
  wrap.remove(); o.querySelectorAll('.gold-coin,.rare-spark').forEach(x => x.remove());
  await cardReveal(o, cards, { ten: true });
  o.remove();
  if (port) {   // 0,5%: különleges hős-portré
    const P = PORTRAITS[port], h = HERO[P.hero];
    const m = document.createElement('div'); m.className = 'overlay';
    m.innerHTML = `<div class="modal sp-reveal"><h3>✨ Különleges lelet a ládában!</h3>${heroCardHTML(h, { big: true, port })}
      <p class="live"><b>${P.name}</b> – ${h.name} új hős-portréja, mindig Full Artban. A Gyűjteményben a hősre koppintva beállíthatod.</p><button class="btn primary" data-x>Szuper!</button></div>`;
    m.onclick = e => { if (e.target.closest('[data-x]')) m.remove(); };
    $('#layer').appendChild(m);
  }
  renderProfileBar(); try { renderShop(); } catch (e) {}
}
async function buyPack(setId, free) {
  const p = Store.p; if (!p) return;
  if (free === 'fa') { if (!(p.faPacks > 0)) return; p.faPacks--; }
  else if (free === 'gift') { if (!(p.giftPacks > 0)) return; p.giftPacks--; }
  else if (free === 'shinyGift') { if (!(p.shinyPacks > 0)) return; p.shinyPacks--; }
  else if (free === 'ahGift') { if (!(p.ahPacks > 0)) return; p.ahPacks--; }   /* Amsterdam Hősei ajándék (küldetés) */
  else if (free === 'ahShinyGift') { if (!(p.ahShinyPacks > 0)) return; p.ahShinyPacks--; }
  else if (free === 'shiny') { if (p.coins < ECON.shinyPrice) { toast('Nincs elég coinod'); return; } p.coins -= ECON.shinyPrice; }
  else if (free) { if (!freePackReady()) return; p.freeDate = today(); }
  else { if (p.coins < ECON.packPrice) { toast('Nincs elég coinod'); return; } p.coins -= ECON.packPrice; }
  const { cards, conv, shinyMode } = packRollFull(setId, free);
  await save(); renderProfileBar(); renderShop();
  await packOpening(setId, cards, { shiny: shinyMode });
  if (conv.coins) toast(`Fölösleges hős-példány beváltva: +${conv.coins} coin`);
}

/* Pack vásárlás: 1, 3, 5 vagy 10 egyszerre (2026-10-24, Tomi). Egy pack: a megszokott feltépés; több: tömeges bontás. */
function packBuyModal(k) {
  const p = Store.p; if (!p) return;
  const sh = /shiny$/.test(k), setId = k.startsWith('ah') ? 'ah' : k.startsWith('pc') ? 'pc' : 'base', pr = sh ? ECON.shinyPrice : ECON.packPrice;
  const name = `${setId === 'base' ? (sh ? 'Shiny' : 'Base set') : SETS[setId].short + (sh ? ' Shiny' : '')} pack`;
  if (p.coins < pr) return toast(`Nincs elég coinod (${p.coins}/${pr})`);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box pb-box"><div class="pb-pack">${packHTML(setId, { shiny: sh })}</div><h3>${escH(name)}</h3><p class="live">Hányat veszel? Most ${p.coins} coinod van.</p>
    <div class="pb-opts">${[1, 3, 5, 10].map(n => { const c = n * pr, ok = p.coins >= c;
      return `<button class="btn${n === 1 ? ' primary' : ''} pb-opt" data-n="${n}" ${ok ? '' : 'disabled'}><b>${n} db</b><small><span class="coin sm" aria-hidden="true"></span> ${c}</small></button>`; }).join('')}</div>
    <button class="btn" data-x>Mégse</button></div>`;
  o.onclick = async e => { const b = e.target.closest('button'); if (e.target === o || (b && b.hasAttribute('data-x'))) return o.remove(); if (!b || !b.dataset.n) return;
    const n = +b.dataset.n, cost = n * pr; if (p.coins < cost) return toast('Nincs elég coinod');
    o.remove();
    if (n === 1) return buyPack(setId, sh ? 'shiny' : false);
    p.coins -= cost; await bulkOpen(setId, sh ? 'shiny' : false, n, name); };
  $('#layer').appendChild(o);
}
function packRollFull(setId, free) {   /* egy pack lapjai + a fölösleges hős-példányok beváltása (buyPack és a tömeges bontás közös része) */
  const p = Store.p; p.packs++;
  const shinyMode = free === 'shiny' || free === 'shinyGift' || free === 'ahShinyGift';
  const cards = openPackRoll(setId, free === 'fa', shinyMode);
  const conv = { coins: 0 };   // a lapok duplikátumai megmaradnak (cserélhetők, vagy a Gyűjteményben kézzel beválthatók)
  for (const c of cards) if (!c.hero && !c.isNew) c.have = owned(c.id);
  for (const c of cards) if (c.gold && c.hero && (p.heroGold || {})[c.hero] > 1) {   /* csak arany HŐS (az arany lap sima gyűjteményi lap) – 2026-10-18 javítás */ p.heroGold[c.hero]--; p.coins += ECON.goldDupe; conv.coins += ECON.goldDupe; c.dupe = ECON.goldDupe; }
  for (const c of cards) if (c.hero && !c.gold && p.heroFa[c.hero] > 1) { p.heroFa[c.hero]--; p.coins += DUPE_COIN_RARE; conv.coins += DUPE_COIN_RARE; c.dupe = DUPE_COIN_RARE; }
  return { cards, conv, shinyMode };
}
/* ---- Tömeges bontás (2026-10-24, Tomi): az azonos fajta ajándék packok egyszerre; a lapok sorokban, gyorsan, egymás után fordulnak fel –
   legendás, Full Art, arany (és változat) lapnál megáll a sor, amíg meg nem nézed ---- */
const BULK = { faPack: ['base', 'fa', 'faPacks', 'Full Art ajándék pack'], giftPack: ['base', 'gift', 'giftPacks', 'Ajándék pack'], giftAh: ['ah', 'ahGift', 'ahPacks', 'Amsterdam pack'],
               giftAhShiny: ['ah', 'ahShinyGift', 'ahShinyPacks', 'Amsterdam Shiny pack'], giftShiny: ['base', 'shinyGift', 'shinyPacks', 'Ajándék Shiny pack'] };
async function openAllPacks(kind) {
  const p = Store.p, B = BULK[kind]; if (!p || !B) return; const [setId, free, key, name] = B, n = p[key] || 0; if (n < 2) return;
  p[key] = 0; return bulkOpen(setId, free, n, name);
}
async function bulkOpen(setId, free, n, name) {   /* n pack egyszerre: ajándék packok (⚡ Mind) és több pack vásárlása (2026-10-24) */
  const p = Store.p; const all = [], conv = { coins: 0 }; let shiny = false, god = 0;
  for (let k = 0; k < n; k++) { const r = packRollFull(setId, free); all.push(...r.cards); conv.coins += r.conv.coins; shiny = r.shinyMode; if (r.cards.god) god++; }
  await save(); renderProfileBar(); renderShop();
  const o = document.createElement('div'); o.className = 'overlay opening bulk-op';
  o.innerHTML = `<div class="op-stage"><div class="bulk-head"><b>${n} × ${escH(name)}</b><small>${all.length} lap${god ? ` · 🌈 ${god} GOD PACK!` : ''}</small></div></div>`;
  $('#layer').appendChild(o);
  const packs = document.createElement('div'); packs.className = 'bulk-packs'; packs.innerHTML = Array.from({ length: Math.min(n, 8) }, (_, k) => `<span style="--k:${k}">${packHTML(setId, { shiny })}</span>`).join('');
  o.querySelector('.op-stage').appendChild(packs);
  await packs.animate([{ opacity: 0, transform: 'translateY(30px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,1.3,.4,1)' }).finished;
  await sleep(350);
  const flash = document.createElement('div'); flash.className = 'op-flash' + (all.some(c => c.gold) ? ' gold' : ''); o.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 500 });
  await packs.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(1.15)' }], { duration: 260, fill: 'forwards' }).finished; packs.remove(); flash.remove();
  await cardReveal(o, all, { ten: true, auto: true });
  o.remove(); renderShop();
  if (conv.coins) toast(`Fölösleges hős-példány beváltva: +${conv.coins} coin`);
}
// ---- Szerencsekerék: naponta egy ingyen pörgetés; főnyeremény a 💎 Gyémánt Best of Us ----
const DIAMOND_CARD = 'c_bou_d', SHARDS_NEED = 10, DIAMOND_DUPE = 300;
const WHEEL = [   // [kulcs, felirat, súly %, szín]
  { k: 'c10', t: '10', s: 'coin', w: 26, c: '#2b5d8a' },
  { k: 'c25', t: '25', s: 'coin', w: 22, c: '#1f7a6b' },
  { k: 'shard', t: '💎', s: 'szilánk', w: 12, c: '#6a4fb3' },
  { k: 'c50', t: '50', s: 'coin', w: 14, c: '#2b5d8a' },
  { k: 'pack', t: '🎁', s: 'pack', w: 11, c: '#a0661c' },
  { k: 'c100', t: '100', s: 'coin', w: 8, c: '#1f7a6b' },
  { k: 'shiny', t: '✨', s: 'Shiny', w: 4, c: '#8a2f8f' },
  { k: 'again', t: '🔄', s: 'újra', w: 2, c: '#3f4a55' },
  { k: 'diamond', t: '💎', s: 'GYÉMÁNT', w: 1, c: '#d8f3ff' },
];
// a kerék képén lévő cikkelyek valódi helye (közép°, szélesség°), felülről óramutató szerint – a képről lemérve (2026-10-06)
const WHEEL_ANG = [[359.5, 37], [41, 46], [87, 46], [128.5, 37], [168.5, 43], [208.5, 37], [246.5, 39], [283, 34], [320.5, 41]];
const wheelReady = () => !!Store.p && (Store.p.wheel?.date !== today() || (Store.p.wheel?.extra || 0) > 0);
const ownsDiamond = () => owned(DIAMOND_CARD) > 0;
function wheelRoll() { let r = Math.random() * WHEEL.reduce((a, x) => a + x.w, 0); for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r < 0) return i; } return 0; }
function giveDiamond(p) { const e = p.coll[DIAMOND_CARD] || (p.coll[DIAMOND_CARD] = { n: 0, f: 0 }); e.f++; }
function wheelApply(p, seg) {   // a nyeremény jóváírása; visszaadja a szöveget
  const k = WHEEL[seg].k;
  if (k[0] === 'c') { const n = +k.slice(1); p.coins += n; return { txt: `+${n} coin`, ic: 'coin' }; }
  /* 2026-10-19 (Tomi): az Amsterdam Hősei megjelenésétől a kerék Amsterdam boostert ad */
  if (k === 'pack') { if (setLive('ah')) { p.ahPacks = (p.ahPacks || 0) + 1; return { txt: '1 Amsterdam booster – a Boltban bonthatod ki', ic: 'pack' }; } p.giftPacks = (p.giftPacks || 0) + 1; return { txt: '1 booster pack – a Boltban bonthatod ki', ic: 'pack' }; }
  if (k === 'shiny') { if (setLive('ah')) { p.ahShinyPacks = (p.ahShinyPacks || 0) + 1; return { txt: '1 Amsterdam Shiny pack – a Boltban bonthatod ki', ic: 'shiny' }; } p.shinyPacks = (p.shinyPacks || 0) + 1; return { txt: '1 Shiny pack – a Boltban bonthatod ki', ic: 'shiny' }; }
  if (k === 'again') { p.wheel.extra = (p.wheel.extra || 0) + 1; return { txt: 'Még egy pörgetés!', ic: 'again' }; }
  if (k === 'shard') {
    p.wheel.shards = (p.wheel.shards || 0) + 1;
    if (p.wheel.shards >= SHARDS_NEED) { p.wheel.shards -= SHARDS_NEED;
      if (ownsDiamond()) { p.coins += DIAMOND_DUPE; return { txt: `${SHARDS_NEED} szilánk összegyűlt – a Gyémánt lapod már megvan, ezért +${DIAMOND_DUPE} coin`, ic: 'coin' }; }
      giveDiamond(p); return { txt: `${SHARDS_NEED} szilánk összegyűlt: tiéd a 💎 Gyémánt Best of Us!`, ic: 'diamond', big: true }; }
    return { txt: `+1 Gyémántszilánk (${p.wheel.shards}/${SHARDS_NEED})`, ic: 'shard' };
  }
  if (k === 'diamond') {
    if (ownsDiamond()) { p.coins += DIAMOND_DUPE; return { txt: `FŐNYEREMÉNY! A Gyémánt lapod már megvan, ezért +${DIAMOND_DUPE} coin`, ic: 'coin', big: true }; }
    giveDiamond(p); return { txt: 'FŐNYEREMÉNY! Tiéd a 💎 Gyémánt Best of Us!', ic: 'diamond', big: true };
  }
}
function openWheel() {
  const p = Store.p; p.wheel = p.wheel || { date: '', shards: 0, extra: 0 };
  const o = document.createElement('div'); o.className = 'overlay wheel-ov';
  const ready = wheelReady();
  o.innerHTML = `<div class="modal wheel-box">
    <h3>🎡 Szerencsekerék</h3>
    <p class="live">Naponta egy ingyen pörgetés. Főnyeremény: a <b>💎 Gyémánt Best of Us</b> – csak itt szerezhető meg!</p>
    <div class="wh-wrap"><div class="wh-rot"><img src="art/ui/wheel-disc.webp" alt="" draggable="false"></div><img class="wh-ptr" src="art/ui/wheel-ptr.webp" alt="" aria-hidden="true"><button class="wh-hub" data-spin ${ready ? '' : 'disabled'} aria-label="Pörgetés"></button></div>
    <div class="wh-shards" aria-label="Gyémántszilánkok: ${p.wheel.shards || 0} / ${SHARDS_NEED}">${Array.from({ length: SHARDS_NEED }, (_, i) => `<i class="${i < (p.wheel.shards || 0) ? 'on' : ''}"></i>`).join('')}<small><img src="art/ui/ic-shard.webp" alt=""> ${p.wheel.shards || 0}/${SHARDS_NEED} szilánk → 💎 Gyémánt lap</small></div>
    <p class="wh-msg live">${ready ? 'Koppints a közepére!' : 'Mára már pörgettél – holnap újra!'}</p>
    <details class="wh-odds"><summary>Esélyek</summary>${WHEEL.map(x => `<div><span>${x.k === 'shard' ? '<img src="art/ui/ic-shard.webp" alt="">' : x.t} ${x.s}</span><b>${x.w}%</b></div>`).join('')}<small>Ha a Gyémánt lap már megvan, a főnyeremény és a 10 szilánk ${DIAMOND_DUPE} coint ér.</small></details>
    <button class="btn" data-x>Bezárás</button></div>`;
  $('#layer').appendChild(o);
  let busy = false, rot = 0;
  o.onclick = async e => {
    if (busy) return;
    if (e.target === o || e.target.closest('[data-x]')) { o.remove(); renderProfileBar(); return; }
    if (!e.target.closest('[data-spin]') || !wheelReady()) return;
    busy = true;
    const W = p.wheel; if (W.date === today()) W.extra = Math.max(0, (W.extra || 0) - 1); else { W.date = today(); W.extra = 0; }
    const seg = wheelRoll(), res = wheelApply(p, seg);
    await save(); renderProfileBar();
    const sa = WHEEL_ANG[seg], jitter = (Math.random() - .5) * sa[1] * .6;   // a képen nem egyforma széles cikkelyek: a cikkely közepére (± kicsit) áll meg
    const from = rot, want = ((360 - sa[0] + jitter) % 360 + 360) % 360;
    rot = from + 360 * 5 + ((want - (from % 360)) % 360 + 360) % 360;   // mindig előre, 5 teljes kör + a célcikkelyig
    const el = o.querySelector('.wh-rot'), hub = o.querySelector('[data-spin]'); hub.disabled = true; hub.classList.add('spinning');
    const red = matchMedia('(prefers-reduced-motion: reduce)').matches;
    await el.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${rot}deg)` }], { duration: red ? 600 : 4300, easing: 'cubic-bezier(.12,.75,.15,1)', fill: 'forwards' }).finished;
    const msg = o.querySelector('.wh-msg'); msg.innerHTML = `<b class="wh-win${res.big ? ' big' : ''}">${res.txt}</b>`;
    o.querySelector('.wh-shards').outerHTML = `<div class="wh-shards">${Array.from({ length: SHARDS_NEED }, (_, i) => `<i class="${i < (p.wheel.shards || 0) ? 'on' : ''}"></i>`).join('')}<small><img src="art/ui/ic-shard.webp" alt=""> ${p.wheel.shards || 0}/${SHARDS_NEED} szilánk → 💎 Gyémánt lap</small></div>`;
    if (res.ic === 'diamond') openModal(cardHTML(DIAMOND_CARD, { big: true }), '💎 GYÉMÁNT LAP! A Best of Us gyémánt változata a tiéd – a pakliépítőben az alaplap helyett beteheted.', '');
    const again = wheelReady(); hub.disabled = !again; hub.classList.remove('spinning');
    busy = false;
  };
}

// ---- bolt képernyő ----
// a boltban coinért megvehető különleges lapok (változatok); egyszer vehető meg mindegyik
const SHOP_ITEMS = () => CARDS.filter(c => c.shopOnly && ART[c.id] && onSale(c)).map(c => ({ id: c.id, price: c.price || 100 }));
// egységes bolti termékpanel (Astra UI): kép + név + ársáv; állapotok: vehető / megszerezted / nincs elég coin
function shopPanelHTML({ attr, img, pos, contain, name, sub, price, have, holo, extra = '' }) {
  const poor = !have && Store.p.coins < price, st = have ? 'owned' : poor ? 'poor' : 'ok';
  return `<button class="sp-card ${st}${contain ? ' contain' : ''}" ${attr} aria-label="${escH(name)} – ${have ? 'megszerezted' : price + ' coin'}${poor ? ', nincs elég coin' : ''}">
    <span class="sp-img" style="${contain ? `--packimg:url('${img}')` : `background-image:url('${img}');${pos ? `background-position:${pos};` : ''}`}"></span>${holo ? '<span class="sc-holo sp-holo" aria-hidden="true"></span>' : ''}
    <span class="sp-frame" aria-hidden="true"></span>${extra}
    <span class="sp-name${name.length > 18 ? ' long' : ''}">${name}</span>${sub ? `<span class="sp-sub">${sub}</span>` : ''}
    ${have ? '' : `<span class="sp-price">${price}</span>`}
  </button>`;
}
function shopOfferHTML(it) {
  const c = CARD[it.id];
  return shopPanelHTML({ attr: `data-buy="${it.id}"`, img: ART[it.id].src, pos: ART[it.id].pos || '50% 20%', name: c.name, sub: c.variantOf ? '✦ Változat · 2 db' : `✦ ${TYPE[c.type] ? TYPE[c.type][0] : 'Lap'} · 2 db`, price: it.price, have: owned(it.id) > 0 });
}
function portOfferHTML(k) {
  const P = PORTRAITS[k];
  return shopPanelHTML({ attr: `data-port="${k}"`, img: ART[k].src, pos: ART[k].pos || '50% 20%', name: P.name, sub: '✦ Full Art portré', price: P.price, have: ownsPort(k), holo: true });
}
async function buyPortrait(k) {
  const P = PORTRAITS[k], p = Store.p, h = HERO[P.hero]; if (!P || !p) return;
  if (ownsPort(k)) return skinModal(P.hero);
  if (p.coins < P.price) return toast(`Nincs elég coinod (${p.coins}/${P.price})`);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal">${heroCardHTML(h, { big: true, port: k })}<div class="live">✦ ${P.name} – ${h.name} új portréja, mindig Full Artban. Ugyanaz a hős és képesség, csak a kinézete más.</div><div class="row2"><button class="btn" data-x>Mégse</button><button class="btn primary" data-ok><span class="coin sm" aria-hidden="true"></span> ${P.price} · Megveszem</button></div></div>`;
  $('#layer').appendChild(o);
  const ok = await new Promise(r => { o.onclick = e => { if (e.target.closest('[data-ok]')) r(true); else if (e.target.closest('[data-x]') || e.target === o) r(false); }; });
  o.remove(); if (!ok || ownsPort(k) || p.coins < P.price) return;
  p.coins -= P.price; p.portraits = [...(p.portraits || []), k];
  p.heroSkin = { ...(p.heroSkin || {}), [P.hero]: k };   // rögtön ezt viseli
  await save(); renderProfileBar(); renderShop(); renderMenuFan();
  openModal(heroCardHTML(h, { big: true, port: k }), `🎉 ${P.name} a tiéd! Mostantól ${h.name} ezt a portrét viseli – a Gyűjteményben a hősre koppintva visszaválthatsz.`, '');
}
async function buyShopItem(id) {
  const it = SHOP_ITEMS().find(x => x.id === id), p = Store.p; if (!it || !p) return;
  const c = CARD[id];
  if (owned(id) > 0) return openModal(cardHTML(id, { big: true }), '✓ Ez már megvan neked – a Paklik menüben ugyanúgy beteheted, mint az alaplapot.', cardHelpHTML(id));
  if (p.coins < it.price) return toast(`Nincs elég coinod (${p.coins}/${it.price})`);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal">${cardHTML(id, { big: true })}<div class="live">${c.variantOf ? `✦ ${c.name} – különleges változat. Ugyanúgy játszható, mint a(z) ${CARD[c.variantOf].name}, csak más a képe.` : `✦ ${c.name} – csak a Boltban kapható lap, packból nem jön.`} Rögtön 2 példányt kapsz belőle.</div><div class="row2"><button class="btn" data-x>Mégse</button><button class="btn primary" data-ok><span class="coin sm" aria-hidden="true"></span> ${it.price} · Megveszem</button></div></div>`;
  $('#layer').appendChild(o);
  const ok = await new Promise(r => { o.onclick = e => { if (e.target.closest('[data-ok]')) r(true); else if (e.target.closest('[data-x]') || e.target === o) r(false); }; });
  o.remove(); if (!ok) return;
  if (p.coins < it.price || owned(id) > 0) return;
  p.coins -= it.price; const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); e.n += 2;   // rögtön 2 példány (packból nem szerezhető)
  await save(); renderProfileBar(); renderShop();
  openModal(cardHTML(id, { big: true }), `🎉 Megvetted: ${c.name}! 2 példány került a gyűjteményedbe – ${c.variantOf ? 'a pakliépítőben az alaplap helyett is beteheted' : 'a Paklik menüben beteheted a paklidba'}.`, '');
}
const SHOP_REFRESH = '2026-10-29';   // a limitált kínálat következő frissítése, pl. '2026-10-20' – ha megadod, visszaszámlál
function renderShop() {
  const p = Store.p; if (!p) return;
  const free = freePackReady();
  const items = SHOP_ITEMS(), ports = Object.keys(PORTRAITS).filter(k => ART[k] && !PORTRAITS[k].passOnly && portOnSale(k));
  let refresh = 'A kínálat időnként frissül – ami most itt van, csak a következő frissítésig kapható.';
  if (SHOP_REFRESH) { const end = new Date(SHOP_REFRESH + 'T00:00'), d = Math.ceil((end - new Date()) / 864e5), md = `${end.getMonth() + 1}. ${end.getDate()}.`;
    refresh = d > 1 ? `Frissül: <b>${d} nap múlva</b> (${md}) – addig kapható, ami most itt van.` : d === 1 ? `Frissül: <b>holnap</b> (${md}) – ez az utolsó nap!` : 'Hamarosan új kínálat érkezik – addig még kapható, ami most itt van.'; }
  const limited = items.length || ports.length ? `
    <section class="shop-limited">
      <div class="lim-head"><img class="lim-badge" src="art/ui/badge-limited.webp" alt="Limitált"><h3>Limitált kínálat</h3></div>
      <p class="lim-note"><img class="lim-timer" src="art/ui/ic-timer.webp" alt="" aria-hidden="true">${refresh}</p>
      <div class="shop-grid">${items.map(shopOfferHTML).join('')}${ports.map(portOfferHTML).join('')}</div>
    </section>` : '';
  const gifts = [
    p.faPacks > 0 ? `<div class="gift-row">${`<button class="btn primary gift fa" id="faPack">✨ Full Art ajándék pack${p.faPacks > 1 ? ` (${p.faPacks})` : ''}</button>`}${p.faPacks > 1 ? `<button class="bulk-btn" data-bulk="faPack" title="Mindet egyszerre">⚡ Mind (${p.faPacks})</button>` : ''}</div>` : '',
    p.giftPacks > 0 ? `<div class="gift-row">${`<button class="btn primary gift" id="giftPack">🎁 Ajándék pack bontása${p.giftPacks > 1 ? ` (${p.giftPacks})` : ''}</button>`}${p.giftPacks > 1 ? `<button class="bulk-btn" data-bulk="giftPack" title="Mindet egyszerre">⚡ Mind (${p.giftPacks})</button>` : ''}</div>` : '',
    p.ahPacks > 0 ? `<div class="gift-row">${`<button class="btn primary gift" id="giftAh">🌷 Amsterdam pack bontása${p.ahPacks > 1 ? ` (${p.ahPacks})` : ''}</button>`}${p.ahPacks > 1 ? `<button class="bulk-btn" data-bulk="giftAh" title="Mindet egyszerre">⚡ Mind (${p.ahPacks})</button>` : ''}</div>` : '',
    p.ahShinyPacks > 0 ? `<div class="gift-row">${`<button class="btn primary shiny-btn" id="giftAhShiny">🌷 Amsterdam Shiny pack${p.ahShinyPacks > 1 ? ` (${p.ahShinyPacks})` : ''}</button>`}${p.ahShinyPacks > 1 ? `<button class="bulk-btn" data-bulk="giftAhShiny" title="Mindet egyszerre">⚡ Mind (${p.ahShinyPacks})</button>` : ''}</div>` : '',
    p.shinyPacks > 0 ? `<div class="gift-row">${`<button class="btn primary shiny-btn" id="giftShiny">🎁 Ajándék Shiny pack${p.shinyPacks > 1 ? ` (${p.shinyPacks})` : ''}</button>`}${p.shinyPacks > 1 ? `<button class="bulk-btn" data-bulk="giftShiny" title="Mindet egyszerre">⚡ Mind (${p.shinyPacks})</button>` : ''}</div>` : '',
    `<button class="btn primary" id="freePack" ${free ? '' : 'disabled'}>${free ? (freePackSet() === 'ah' ? '🌷 Napi ingyen Amsterdam pack' : '🎁 Napi ingyen pack') : 'Mai ingyen pack elhasználva'}</button>`].join('');
  $('#shopBody').innerHTML = `
    <div class="wallet"><span class="coin" aria-hidden="true"></span><b>${p.coins}</b><small>coin</small></div>
    ${limited ? '<button class="lim-jump" data-jump><img src="art/ui/ic-timer.webp" alt="" aria-hidden="true"> Limitált lapok és portrék – lejjebb ↓</button>' : ''}
    <div class="lbl shop-lbl">Boosterek</div>
    <div class="shop-gifts">${gifts}</div>
    <div class="shop-grid">
      ${setLive('ah') ? `${shopPanelHTML({ attr: 'data-pack="ah"', img: 'art/ui/pack-ah.webp', contain: true, name: SETS.ah.name, sub: 'Új szett · 3 lap', price: ECON.packPrice, have: false })}
      ${shopPanelHTML({ attr: 'data-pack="ahshiny"', img: 'art/ui/pack-ahshiny.webp', contain: true, name: 'Amsterdam Shiny', sub: '1 biztos Full Art', price: ECON.shinyPrice, have: false, holo: true })}` : ''}
      ${shopPanelHTML({ attr: 'data-pack="base"', img: 'art/ui/pack-base.webp', contain: true, name: SETS.base.name, sub: '3 lap', price: ECON.packPrice, have: false })}
      ${shopPanelHTML({ attr: 'data-pack="shiny"', img: 'art/ui/pack-shiny.webp', contain: true, name: 'Shiny pack', sub: '1 biztos különleges', price: ECON.shinyPrice, have: false, holo: true })}   
    </div>
    ${chestPanelHTML()}
    <details class="pack-info-more"><summary>Mi van a packokban?</summary>
      <p><b>${SETS.base.name}:</b> 3 véletlen lap a teljes alapkészletből, legalább egy ritka vagy jobb.</p>
      <p><b>🧰 Heti láda:</b> minden hétfőn 0:01-kor jár egy ingyen; ha már kinyitottad, ${CHEST.price} coinért vehetsz még. 10 lap: 1 biztos epikus vagy legendás, 1 biztos Full Art, a többi véletlen. 0,5% eséllyel egy ritka hős-portré is lehet benne.</p>
      ${setLive('ah') ? `<p><b>${SETS.ah.name}:</b> 3 lap csak az új szettből (${SETS.ah.cards.length} lap), legalább egy ritka vagy jobb. A Shiny változatban a legjobb lap biztosan Full Art. ★ Arany lap (Isten hozott Amszterdamban, High Hawaiians vagy Game Over aranyban): ${String(ECON.goldPlain * 100).replace('.', ',')}% · Shiny packban ${ECON.goldShiny * 100}%. Hős-lap és arany hős nincs benne.</p>` : ''}
      <p><b>Shiny pack:</b> 3 lap, amiből egy biztosan különleges: Full Art lap, Full Art hős vagy ritka változat-lap. ${ECON.goldShiny * 100}% eséllyel ✦ Arany hős is lehet benne.</p></details>
    ${limited}
    <div class="odds"><div class="lbl">Esélyek laponként</div>
      ${[['l', 'Legendás'], ['e', 'Epikus'], ['r', 'Ritka'], ['k', 'Gyakori']].map(([k, n]) => `<div class="odd"><i class="rar r-${k}"></i><span>${n}</span><b>${ECON.odds.find(o => o[0] === k)[1]}%</b></div>`).join('')}
      <div class="odd"><i class="rar r-f"></i><span>Full Art változat (bármelyik lapból)</span><b>${ECON.foilChance * 100}%</b></div>
      <div class="odd"><i class="rar r-f"></i><span>Full Art hős (packonként)</span><b>${ECON.heroFaChance * 100}%</b></div>
      <div class="odd gold-odd"><i class="rar r-g"></i><span>✦ Arany hős (packonként · Shiny packban)</span><b>${String(ECON.goldPlain * 100).replace('.', ',')}% · ${ECON.goldShiny * 100}%</b></div>
      <small>Ha ${ECON.pityAfter} packon át nem jön epikus vagy legendás lap, a következőben biztosan lesz. Napi coin: győzelem ${ECON.win}, döntetlen ${ECON.draw}, vereség ${ECON.loss}, legfeljebb ${ECON.dailyCap}.</small>
    </div>`;
  $('#shopBody').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyShopItem(b.dataset.buy));
  $('#shopBody').querySelectorAll('[data-port]').forEach(b => b.onclick = () => buyPortrait(b.dataset.port));
  $('#shopBody').querySelectorAll('[data-pack]').forEach(b => b.onclick = () => packBuyModal(b.dataset.pack));
  const jb = $('#shopBody').querySelector('[data-jump]'); if (jb) jb.onclick = () => $('#shopBody .shop-limited')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#freePack').onclick = () => buyPack(freePackSet(), true);
  if ($('#chestBtn')) $('#chestBtn').onclick = () => buyChest();
  if ($('#giftPack')) $('#giftPack').onclick = () => buyPack('base', 'gift');
  if ($('#faPack')) $('#faPack').onclick = () => buyPack('base', 'fa');
  if ($('#giftShiny')) $('#giftShiny').onclick = () => buyPack('base', 'shinyGift');
  if ($('#giftAh')) $('#giftAh').onclick = () => buyPack('ah', 'ahGift');
  if ($('#giftAhShiny')) $('#giftAhShiny').onclick = () => buyPack('ah', 'ahShinyGift');
  $('#shopBody').querySelectorAll('[data-bulk]').forEach(b => b.onclick = () => openAllPacks(b.dataset.bulk));
}
function packHTML(setId, o = {}) {
  return `<div class="pack pk set-${setId}${o.shiny ? ' shiny' : ''}" role="img" aria-label="Best of Us – ${o.shiny ? 'Shiny ' : ''}${SETS[setId].name} booster pack">
    <div class="pk-part pk-body"></div><div class="pk-part pk-top"></div><div class="pk-sheen"></div>${o.shiny ? '<div class="pk-holo"></div><span class="pk-ribbon">Shiny</span>' : ''}
    <div class="pk-tear"><i></i><em></em></div><div class="pk-glow"></div></div>`;
}

// ---- pack bontás ----
const RAR_COLOR = { k: '#9fb7b4', r: '#6fb8ff', e: '#b77bff', l: '#ffc94a', g: '#ffd700' };
async function packOpening(setId, cards, po = {}) {
  const o = document.createElement('div'); o.className = 'overlay opening';
  o.innerHTML = `<div class="op-stage"><div class="op-pack">${packHTML(setId, po)}</div><div class="op-hint">Húzd végig az ujjad a pack tetején, és tépd fel!</div></div>`;
  $('#layer').appendChild(o);
  const packEl = o.querySelector('.op-pack'), pk = packEl.querySelector('.pk'), top = pk.querySelector('.pk-top');
  packEl.animate([{ transform: 'translateY(40px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,1.3,.4,1)' });
  pk.classList.add('ready');
  // feltépés: vízszintes húzás a pack tetején (vagy koppintás → magától feltépődik)
  const setP = (p, dir) => { pk.style.setProperty('--p', p); pk.style.setProperty('--dir', dir); top.style.transform = `rotate(${dir * p * -7}deg) translateY(${-p * 4}px)`; };
  const dir = await new Promise(done => {
    let st = null, finished = false;
    const finish = d => { if (finished) return; finished = true; done(d); };
    pk.addEventListener('pointerdown', e => { st = { x: e.clientX, w: pk.getBoundingClientRect().width, id: e.pointerId, moved: false }; pk.setPointerCapture?.(e.pointerId); });
    pk.addEventListener('pointermove', e => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x; if (Math.abs(dx) > 8) st.moved = true;
      const p = Math.min(1, Math.abs(dx) / (st.w * .75)), d = dx < 0 ? -1 : 1;
      setP(p, d); if (p >= 1) { st = null; finish(d); }
    });
    const up = async e => {
      if (!st || e.pointerId !== st.id) return;
      const moved = st.moved; st = null;
      if (!moved) {   // koppintás: magától végigszalad a tépés
        const t0 = performance.now();
        await new Promise(r => { const step = () => { const p = Math.min(1, (performance.now() - t0) / 380); setP(p, 1); p < 1 ? requestAnimationFrame(step) : r(); }; step(); });
        finish(1);
      } else setP(0, 1);   // félbehagyott húzás: visszaugrik
    };
    pk.addEventListener('pointerup', up); pk.addEventListener('pointercancel', up);
  });
  pk.classList.remove('ready'); pk.classList.add('torn');
  o.querySelector('.op-hint').remove();
  const glow = pk.querySelector('.pk-glow');
  glow.animate([{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'scaleY(1)' }], { duration: 380, fill: 'forwards' });
  await Promise.all([
    top.animate([{ transform: top.style.transform, opacity: 1 }, { transform: `translate(${dir * 170}px,-150px) rotate(${dir * 38}deg)`, opacity: 0 }],
                { duration: 620, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' }).finished,
    pk.querySelector('.pk-body').animate([{ transform: 'none' }, { transform: 'translateY(6px) rotate(-1.5deg)' }, { transform: 'translateY(2px) rotate(1.5deg)' }, { transform: 'translateY(4px)' }],
                { duration: 520, easing: 'ease-in-out', fill: 'forwards' }).finished]);
  if (cards.god) await godIntro(o, pk, packEl).catch(() => { o.querySelector('.god-fx')?.remove(); packEl.style.visibility = 'hidden'; });   /* hiba esetén se ragadjon be a jelenet */
  const hasGold = cards.some(c => c.gold);
  if (hasGold && !cards.god) {   // arany van a packban: a feltépett pack aranyba borul, remeg a képernyő
    o.classList.add('gold-pack');
    await pk.animate([{ transform: 'none', filter: 'brightness(1)' }, { transform: 'scale(1.06) rotate(-1.5deg)', filter: 'brightness(1.5) sepia(.6)' }, { transform: 'scale(1.1) rotate(1.5deg)', filter: 'brightness(1.8) sepia(.8)' }, { transform: 'none', filter: 'brightness(1)' }], { duration: 900, easing: 'ease-in-out' }).finished;
  }
  const flash = document.createElement('div'); flash.className = 'op-flash' + (hasGold ? ' gold' : ''); o.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 600 });
  await packEl.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(90px) scale(.9)', opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }).finished;
  packEl.remove();
  await cardReveal(o, cards, { five: cards.length === 5, god: !!cards.god });
  o.remove(); o.classList.remove('gold-pack'); renderShop();
}
/* GOD PACK jelenet: a feltépett pack szivárványszínben izzik, fénysugarak törnek ki belőle, egyre jobban remeg,
   majd fehér villanás, lökéshullámok, szivárványszikrák és óriás „GOD PACK” felirat */
const GOD_COLS = ['#ff4d6d', '#ffb84d', '#fff36b', '#5dff9b', '#4dd2ff', '#8a6bff', '#ff4dd8'];
async function godIntro(o, pk, packEl) {
  o.classList.add('god-pack');
  const r = pk.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .32;
  const layer = document.createElement('div'); layer.className = 'god-fx'; o.appendChild(layer);
  const beams = [];
  for (let k = 0; k < 14; k++) { const b = document.createElement('i'); b.className = 'god-beam'; b.style.left = cx + 'px'; b.style.top = cy + 'px';
    const ang = (k * 360 / 14 + Math.random() * 12).toFixed(1); b.style.setProperty('--c', GOD_COLS[k % GOD_COLS.length]); layer.appendChild(b); beams.push(b);
    b.animate([{ opacity: 0, transform: `translate(-50%,-100%) rotate(${ang}deg) scaleY(0)` }, { opacity: 1, transform: `translate(-50%,-100%) rotate(${ang}deg) scaleY(1)` }],
              { duration: 300, delay: 120 + k * 120, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'both' }); }
  let rising = true;
  (async () => { while (rising) { const c = GOD_COLS[Math.floor(Math.random() * GOD_COLS.length)], s = document.createElement('i'), sz = 3 + Math.random() * 5, a = Math.random() * Math.PI * 2, d = 260 + Math.random() * 200;
    s.className = 'rare-spark'; s.style.cssText = `left:${cx + Math.cos(a) * d}px;top:${cy + Math.sin(a) * d}px;width:${sz}px;height:${sz}px;background:${c};box-shadow:0 0 ${sz * 3}px ${c}`; layer.appendChild(s);
    s.animate([{ transform: 'translate(-50%,-50%)', opacity: 0 }, { opacity: 1, offset: .3 }, { transform: `translate(calc(-50% + ${-Math.cos(a) * d}px), calc(-50% + ${-Math.sin(a) * d}px)) scale(.3)`, opacity: 0 }],
      { duration: 700 + Math.random() * 400, easing: 'ease-in', fill: 'forwards' }).finished.then(() => s.remove()); await sleep(25); } })();
  const kf = Array.from({ length: 22 }, (_, k) => { const p = k / 21, j = 14 * p * p; return { transform: `translate(${(Math.random() - .5) * j}px,${(Math.random() - .5) * j}px) rotate(${(Math.random() - .5) * j * .35}deg) scale(${1 + p * .12})`, filter: `brightness(${1 + p * 1.6}) saturate(${1 + p}) hue-rotate(${p * 360}deg)` }; });
  await pk.animate(kf, { duration: 2300, easing: 'ease-in', fill: 'forwards' }).finished;
  rising = false;
  // robbanás
  const flash = document.createElement('div'); flash.className = 'god-flash'; layer.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .3 }, { opacity: 0 }], { duration: 1400, fill: 'forwards' });
  packEl.style.visibility = 'hidden'; beams.forEach(b => b.remove());
  const mx = innerWidth / 2, my = innerHeight * .42;
  for (let k = 0; k < 4; k++) { const ring = document.createElement('i'); ring.className = 'god-ring'; ring.style.left = mx + 'px'; ring.style.top = my + 'px'; ring.style.setProperty('--c', GOD_COLS[(k * 2) % GOD_COLS.length]); layer.appendChild(ring);
    ring.animate([{ transform: 'translate(-50%,-50%) scale(.1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(11)', opacity: 0 }], { duration: 1300, delay: 150 + k * 170, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'both' }); }
  for (let k = 0; k < 120; k++) { const s = document.createElement('i'), c = GOD_COLS[k % GOD_COLS.length], sz = 4 + Math.random() * 9, a = Math.random() * Math.PI * 2, d = 140 + Math.random() * 340;
    s.className = k % 5 ? 'rare-spark' : 'god-star'; s.style.cssText = `left:${mx}px;top:${my}px;width:${sz}px;height:${sz}px;background:${c};box-shadow:0 0 ${sz * 2}px ${c}`; layer.appendChild(s);
    s.animate([{ transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.3) rotate(${360 + Math.random() * 360}deg)`, opacity: 0 }],
      { duration: 1000 + Math.random() * 1000, delay: 120, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'both' }); }
  const t = document.createElement('div'); t.className = 'god-title'; t.innerHTML = `<div class="god-word">GOD PACK</div><div class="op-hint" style="visibility:hidden">Koppints a folytatáshoz</div>`; layer.appendChild(t);
  t.querySelector('.god-word').animate([{ transform: 'scale(4)', opacity: 0, letterSpacing: '.6em', filter: 'blur(12px)' }, { transform: 'scale(.92)', opacity: 1, letterSpacing: '.04em', filter: 'blur(0)', offset: .7 }, { transform: 'scale(1)', opacity: 1, letterSpacing: '.04em', filter: 'blur(0)' }],
    { duration: 900, delay: 350, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'backwards' });
  o.querySelector('.op-stage').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-9px,5px)' }, { transform: 'translate(8px,-6px)' }, { transform: 'translate(-5px,-3px)' }, { transform: 'translate(4px,4px)' }, { transform: 'none' }], { duration: 500, delay: 120 });
  await sleep(2600);
  t.querySelector('.op-hint').style.visibility = 'visible'; layer.style.pointerEvents = 'auto';
  await Promise.race([sleep(9000), new Promise(res => layer.addEventListener('click', ev => { ev.stopPropagation(); res(); }, { once: true }))]);
  await t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-40px) scale(.8)' }], { duration: 400, fill: 'forwards' }).finished;
  layer.remove();
}
// a lapok felfordítása (pack és heti láda közös része); opt.ten: 10 lapos rács + „Mindet felfordítom”
async function cardReveal(o, cards, opt = {}) {
  const row = document.createElement('div'); row.className = 'op-cards' + (opt.ten ? ' ten' : '') + (opt.five ? ' five' : '') + (opt.god ? ' god' : '');
  row.innerHTML = cards.map((c, i) => `<button class="flip${c.gold ? ' goldback' : ''}" data-i="${i}" style="--rc:${RAR_COLOR[pcRar(c)]}" aria-label="Lap felfordítása">
      <span class="flip-in"><span class="face back"></span><span class="face front">${pcHTML(c, { big: true, foil: c.foil })}${c.dupe ? `<em class="newtag dupetag">+${c.dupe} coin</em>` : c.have > 2 ? `<em class="newtag dupetag">×${c.have}</em>` : c.isNew ? '<em class="newtag">Új!</em>' : ''}</span></span></button>`).join('');
  o.querySelector('.op-stage').appendChild(row);
  const hint = document.createElement('div'); hint.className = 'op-hint'; hint.textContent = 'Fordítsd fel a lapokat'; o.querySelector('.op-stage').appendChild(hint);
  row.querySelectorAll('.flip').forEach((f, i) => f.animate([{ transform: 'translateY(60px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 380, delay: 80 * i, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
  let left = cards.length;
  if (opt.auto) {   /* tömeges bontás: magától, gyorsan fordít; a különleges lapnál (legendás / Full Art / arany / változat) megvárja, amíg megnézed */
    (async () => { await sleep(500);
      for (const f of row.querySelectorAll('.flip')) {
        f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        for (let k = 0; k < 600 && !f.classList.contains('open'); k++) { if (row.dataset.busy !== '1') f.click(); await sleep(40); }
        while (row.dataset.busy === '1') await sleep(50);
        await sleep(110); } })();
  } else if (opt.ten) {
    const all = document.createElement('button'); all.className = 'btn small op-all'; all.textContent = 'Mindet felfordítom';
    o.querySelector('.op-stage').appendChild(all);
    all.onclick = async () => { all.disabled = true;
      for (const f of row.querySelectorAll('.flip')) {
        for (let k = 0; k < 600 && !f.classList.contains('open'); k++) { if (row.dataset.busy !== '1') f.click(); await sleep(50); }
        while (row.dataset.busy === '1') await sleep(50);
        await sleep(120); }
      all.remove(); };
  }
  await new Promise(done => {
    let busyFlip = false;
    row.addEventListener('click', async e => {
      const f = e.target.closest('.flip'); if (!f || f.classList.contains('open') || busyFlip) return;
      e.stopPropagation();
      const c = cards[+f.dataset.i], rar = pcRar(c);
      if (c.gold) { busyFlip = true; row.dataset.busy = '1'; await goldReveal(o, f, c); busyFlip = false; row.dataset.busy = ''; }
      else if (rar === 'l' || c.foil || (!c.hero && CARD[c.id].variantOf)) { busyFlip = true; row.dataset.busy = '1'; await rareReveal(o, f, c); busyFlip = false; row.dataset.busy = ''; }
      else { f.classList.add('open'); if (rar === 'e' || (!c.hero && CARD[c.id].variantOf)) f.classList.add('glow'); }
      if (--left === 0) done();
    });
  });
  o.querySelector('.op-all')?.remove();
  hint.textContent = 'Koppints egy lapra a részletekhez';
  const btn = document.createElement('button'); btn.className = 'btn primary op-done'; btn.textContent = 'Tovább';
  o.querySelector('.op-stage').appendChild(btn);
  row.addEventListener('click', e => { const f = e.target.closest('.flip.open'); if (f) { const c = cards[+f.dataset.i]; if (c.hero) { openModal(heroCardHTML(HERO[c.hero], { big: true, foil: true, gold: c.gold }), c.gold ? '✦ Arany hős' : 'Full Art hős'); return; } openModal(cardHTML(c.id, { big: true, foil: c.foil }), `${RAR[CARD[c.id].rarity]}${c.foil ? ' · Full Art' : ''} · most ${owned(c.id)} db van belőle`, cardHelpHTML(c.id)); } });
  await new Promise(r => btn.addEventListener('click', r, { once: true }));
}

// ---- ARANY bontás: a legritkább lap – hosszabb, nagyobb, aranyesős jelenet ----
async function goldReveal(o, f, c) {
  const r = f.getBoundingClientRect(); let cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  o.classList.add('rare-dim', 'gold-dim');
  const layer = document.createElement('div'); layer.className = 'gold-fx'; o.appendChild(layer);
  // 1) sötétség, a lap aranyban izzik, alulról aranypor száll fel, egyre erősebben remeg minden
  const rays = document.createElement('div'); rays.className = 'rare-rays gold'; rays.style.left = cx + 'px'; rays.style.top = cy + 'px'; layer.appendChild(rays);
  rays.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.25) rotate(90deg)' }], { duration: 2200, easing: 'ease-in', fill: 'forwards' });
  let rising = true;
  (async () => { while (rising) { for (let k = 0; k < 3; k++) goldMote(layer, Math.random() * innerWidth, innerHeight + 10, cx, cy); await sleep(60); } })();
  f.classList.add('charging', 'gold');
  // csak a lap mozog: középre úszik, egyre nagyobb és egyre jobban remeg (a képernyő többi része áll)
  const dx = innerWidth / 2 - cx, dy = innerHeight * .42 - cy;
  const kf = Array.from({ length: 16 }, (_, k) => { const p = k / 15, j = 10 * p * p;
    return { transform: `translate(${dx * Math.min(1, p * 1.6) + (Math.random() - .5) * j}px,${dy * Math.min(1, p * 1.6) + (Math.random() - .5) * j}px) scale(${1 + p * .55}) rotate(${(Math.random() - .5) * j * .4}deg)` }; });
  const move = f.animate(kf, { duration: 2200, easing: 'ease-in', fill: 'forwards' }); await move.finished;
  rising = false;
  // 2) robbanás: fehér-arany villanás, lökéshullám, aranyérmék és szikrák
  f.classList.remove('charging'); f.classList.add('open', 'glow');
  const fr = f.getBoundingClientRect(); cx = fr.left + fr.width / 2; cy = fr.top + fr.height / 2;
  const flash = document.createElement('div'); flash.className = 'rare-flash gold'; layer.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 0 }], { duration: 1300, fill: 'forwards' });
  for (let k = 0; k < 3; k++) { const ring = document.createElement('i'); ring.className = 'gold-ring'; ring.style.left = cx + 'px'; ring.style.top = cy + 'px'; layer.appendChild(ring);
    ring.animate([{ transform: 'translate(-50%,-50%) scale(.1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(9)', opacity: 0 }], { duration: 1100, delay: k * 160, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'both' }); }
  const cols = ['#fff6d0', '#ffe07a', '#ffc21a', '#e6a100', '#ffffff'];
  for (let k = 0; k < 90; k++) {
    const s = document.createElement('i'), coin = k % 3 === 0; s.className = coin ? 'gold-coin' : 'rare-spark';
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260, sz = coin ? 12 + Math.random() * 8 : 4 + Math.random() * 8;
    s.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;${coin ? '' : `background:${cols[k % cols.length]};box-shadow:0 0 ${sz * 2}px ${cols[k % cols.length]}`}`;
    layer.appendChild(s);
    s.animate([{ transform: 'translate(-50%,-50%) scale(1) rotateY(0deg)', opacity: 1 },
               { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + (coin ? 140 : 0)}px)) scale(.4) rotateY(${coin ? 720 : 0}deg)`, opacity: 0 }],
              { duration: 900 + Math.random() * 900, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' });
  }
  await sleep(450);
  // 3) bemutató: a lap forogva középre száll, óriás arany felirat, folyamatos aranyeső
  const show = document.createElement('div'); show.className = 'rare-show gold';
  show.innerHTML = `<div class="rare-rays big gold"></div><div class="gold-rain"></div><div class="rare-card">${pcHTML(c, { big: true, foil: true })}</div>
    <div class="rare-banner gold-banner">${c.hero ? 'ARANY HŐS' : 'ARANY LAP'}</div><div class="gold-sub">${c.hero ? 'A legritkább lap a játékban' : `Az ${SETS[CARD[c.id].set]?.name || ''} legritkább lapja`}</div>
    <div class="rare-name">${c.hero ? HERO[c.hero].name : CARD[c.id].name}${c.isNew ? ' · Új!' : c.dupe ? ` · már megvolt: +${c.dupe} coin` : ''}</div><div class="op-hint" style="visibility:hidden">Koppints a folytatáshoz</div>`;
  layer.appendChild(show);
  const rain = show.querySelector('.gold-rain');
  for (let k = 0; k < 46; k++) { const d = document.createElement('i'); d.className = k % 4 ? 'gr-flake' : 'gr-coin';
    d.style.cssText = `left:${Math.random() * 100}%;animation-delay:${(Math.random() * 3).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 2.2).toFixed(2)}s;--s:${(.6 + Math.random() * .8).toFixed(2)}`; rain.appendChild(d); }
  const card = show.querySelector('.rare-card');
  show.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
  card.animate([{ transform: `translate(${cx - innerWidth / 2}px,${cy - innerHeight / 2}px) scale(.4) rotateY(0deg)` }, { transform: 'translate(0,-10px) scale(1.12) rotateY(720deg)', offset: .78 }, { transform: 'none' }],
               { duration: 1500, easing: 'cubic-bezier(.2,.8,.3,1)' });
  show.querySelector('.gold-banner').animate([{ transform: 'scale(3.2)', opacity: 0, letterSpacing: '.5em' }, { transform: 'scale(1)', opacity: 1, letterSpacing: '.06em' }], { duration: 650, delay: 1100, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'backwards' });
  show.querySelector('.gold-sub').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 1600, fill: 'backwards' });
  rays.remove();
  await sleep(2400);   // az első pár másodpercet nem lehet átugrani: ennek súlya van
  const hint = show.querySelector('.op-hint'); hint.style.visibility = 'visible';
  await Promise.race([sleep(12000), new Promise(res => show.addEventListener('click', ev => { ev.stopPropagation(); res(); }, { once: true }))]);
  await layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).finished;
  layer.remove(); o.classList.remove('rare-dim', 'gold-dim');
  move.cancel(); f.style.transform = '';   // a lap visszakerül a helyére a sorban
}
function goldMote(parent, x, y, tx, ty) {
  const s = document.createElement('i'), sz = 2 + Math.random() * 5; s.className = 'rare-spark';
  s.style.cssText = `left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:#ffd76a;box-shadow:0 0 ${sz * 3}px #ffc21a`;
  parent.appendChild(s);
  s.animate([{ transform: 'translate(-50%,-50%)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: `translate(calc(-50% + ${(tx - x) * .85}px), calc(-50% + ${(ty - y) * .85}px))`, opacity: 0 }],
            { duration: 900 + Math.random() * 700, easing: 'ease-in', fill: 'forwards' }).finished.then(() => s.remove());
}

// ---- különleges bontás: legendás vagy Full Art lap ----
async function rareReveal(o, f, c) {
  const leg = !c.hero && CARD[c.id].rarity === 'l', fa = !!c.foil;
  const vari = !c.hero && !!CARD[c.id].variantOf, goldC = !c.hero && !!CARD[c.id].goldVar;
  const kind = goldC ? 'leg' : vari && !fa ? 'var' : fa && leg ? 'both' : fa ? 'fa' : 'leg';
  const r = f.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  o.classList.add('rare-dim');
  // 1) a lap megremeg, egyre erősebben izzik, mögötte fénysugarak kezdenek forogni
  const rays = document.createElement('div'); rays.className = `rare-rays ${kind}`;
  rays.style.left = cx + 'px'; rays.style.top = cy + 'px'; o.appendChild(rays);
  rays.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(40deg)' }], { duration: 1100, easing: 'ease-out', fill: 'forwards' });
  f.classList.add('charging', kind);
  await f.animate([
    { transform: 'translate(0,0) scale(1)' }, { transform: 'translate(-2px,1px) scale(1.02)' }, { transform: 'translate(2px,-1px) scale(1.03)' },
    { transform: 'translate(-3px,-2px) scale(1.05)' }, { transform: 'translate(3px,2px) scale(1.07)' }, { transform: 'translate(-4px,1px) scale(1.09)' },
    { transform: 'translate(4px,-2px) scale(1.11)' }, { transform: 'translate(0,0) scale(1.14)' }], { duration: 1000, easing: 'ease-in' }).finished;
  // 2) felfordul, nagy villanás, szikrák
  f.classList.remove('charging'); f.classList.add('open', 'glow');
  const flash = document.createElement('div'); flash.className = `rare-flash ${kind}`; o.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: .65, offset: .15 }, { opacity: 0 }], { duration: 900, fill: 'forwards' }).finished.then(() => flash.remove());
  const cols = kind === 'var' ? ['#7dffc4', '#e6ffb0', '#b9ffd9', '#ffffff'] : kind === 'leg' ? ['#fff4c2', '#ffd24a', '#ffb300', '#ffffff'] : ['#ff8fd0', '#8fd4ff', '#b6ffcf', '#ffe28a', '#ffffff'];
  for (let k = 0; k < 44; k++) {
    const s = document.createElement('i'); s.className = 'rare-spark';
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 170, sz = 4 + Math.random() * 7;
    s.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;background:${cols[k % cols.length]};box-shadow:0 0 ${sz * 2}px ${cols[k % cols.length]}`;
    o.appendChild(s);
    s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }],
              { duration: 700 + Math.random() * 600, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' }).finished.then(() => s.remove());
  }
  await sleep(380);
  // 3) bemutató: a lap nagyban középre ugrik, felirattal
  const show = document.createElement('div'); show.className = `rare-show ${kind}`;
  const label = c.hero ? 'Full Art hős!' : goldC ? '★ Arany lap!' : vari ? '✦ Ritka változat!' : kind === 'both' ? 'Legendás · Full Art!' : kind === 'fa' ? 'Full Art!' : 'Legendás!';
  show.innerHTML = `<div class="rare-rays big ${kind}"></div><div class="rare-card">${pcHTML(c, { big: true, foil: c.foil })}</div>
    <div class="rare-banner">${label}</div><div class="rare-name">${c.hero ? `${HERO[c.hero].name} – Full Art hős` : CARD[c.id].name}${c.isNew ? ' · Új!' : ''}</div>${vari ? `<div class="var-sub">A(z) ${CARD[CARD[c.id].variantOf].name} különleges, ritka kinézete – ugyanúgy játszható</div>` : ''}<div class="op-hint">Koppints a folytatáshoz</div>`;
  o.appendChild(show);
  const card = show.querySelector('.rare-card');
  show.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' });
  card.animate([{ transform: `translate(${cx - innerWidth / 2}px,${cy - innerHeight / 2}px) scale(.45) rotateY(0deg)` }, { transform: 'translate(0,0) scale(1.06) rotateY(360deg)', offset: .75 }, { transform: 'none' }],
               { duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)' });
  show.querySelector('.rare-banner').animate([{ transform: 'scale(2.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, delay: 500, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'backwards' });
  rays.remove();
  await Promise.race([sleep(4500), new Promise(res => show.addEventListener('click', ev => { ev.stopPropagation(); res(); }, { once: true }))]);
  await show.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished;
  show.remove(); o.classList.remove('rare-dim');
}

// ---- paklik ----
// Kezdőpaklik: ha megvan egy lap különleges változata (pl. Pifti, TZS), automatikusan azt teszi be a sima helyett (2026-10-12)
function upgradeList(list) {
  if (!Store.p) return list;
  const out = { ...list };
  for (const [id, k] of Object.entries(list)) {
    const vars = CARDS.filter(v => v.variantOf === id && owned(v.id) > 0).sort((a, b) => (b.goldVar ? 1 : 0) - (a.goldVar ? 1 : 0) || owned(b.id) - owned(a.id));   /* az arany változat előre (2026-10-21) */
    let left = k;
    for (const v of vars) { const use = Math.min(left, owned(v.id) - (out[v.id] || 0)); if (use > 0) { out[v.id] = (out[v.id] || 0) + use; left -= use; } }
    if (left < k) { if (left) out[id] = left; else delete out[id]; }
  }
  return out;
}
// ---- paklisegéd (2026-10-12): kiegészíti a paklit 20 lapra a játékos SAJÁT lapjaiból ----
// A már betett lapokat megtartja. Sorrend: a hős kánon eseménye → a hős kezdőpaklijának lapjai (azok összhangban vannak a hőssel)
// → a többi a ritkaság, a lapfajta (a kezdőpakli aránya szerint) és az energiagörbe alapján. Ha megvan egy lap különleges változata, azt teszi be.
// [DECKHELP-START]
const DH_CURVE = [0, 5, 7, 4, 2, 1, 1];   // cél: hány lap legyen 0,1,2,3,4,5,6+ energiás (a kezdőpaklik átlaga)
const DH_RW = { k: 1, r: 1.5, e: 2.2, l: 3 };
function deckHelperFill(list0, hero, own) {
  const list = { ...list0 }, n = () => Object.values(list).reduce((a, b) => a + b, 0);
  const bo = id => CARD[id].variantOf || id;
  const same = id => Object.entries(list).reduce((a, [x, k]) => a + (bo(x) === bo(id) ? k : 0), 0);
  const cap = id => CARD[id].rarity === 'l' ? 1 : 2;
  const ok = id => { const c = CARD[id]; return c && !c.token && !c.off && own(id) > (list[id] || 0) && same(id) < cap(id) && (!c.hero || c.hero === hero); };
  const fam = {}; for (const c of CARDS) if (!c.token && !c.off) (fam[bo(c.id)] = fam[bo(c.id)] || []).push(c.id);
  for (const k in fam) fam[k].sort((a, b) => (CARD[a].variantOf ? 0 : 1) - (CARD[b].variantOf ? 0 : 1));   // a különleges változat előre
  const pick = base => (fam[base] || []).find(ok);
  const stK = Object.keys(DECKS).find(k => DECKS[k].hero === hero), st = {}, tyShare = {};
  if (stK) { let t = 0; for (const [id, k] of Object.entries(DECKS[stK].list)) { st[bo(id)] = (st[bo(id)] || 0) + k; tyShare[CARD[id].type] = (tyShare[CARD[id].type] || 0) + k; t += k; } for (const x in tyShare) tyShare[x] /= t; }
  const curve = () => { const c = [0, 0, 0, 0, 0, 0, 0]; for (const [id, k] of Object.entries(list)) c[Math.min(6, CARD[id].cost)] += k; return c; };
  const chars = () => Object.entries(list).reduce((a, [id, k]) => a + (CARD[id].type === 'char' ? k : 0), 0);
  const added = [];
  const put = id => { list[id] = (list[id] || 0) + 1; added.push(id); };
  while (n() < DECK_SIZE) {
    const cv = curve(), left = DECK_SIZE - n(), needChar = Math.max(0, 11 - chars()) >= left;
    let best = null, bs = -1e9;
    for (const base in fam) {
      const id = pick(base); if (!id) continue;
      const c = CARD[id]; if (needChar && c.type !== 'char') continue;
      const b = Math.min(6, c.cost), need = DH_CURVE[b] - cv[b];
      let sc = DH_RW[c.rarity] || 1;
      if (c.hero === hero) sc += 6;                                  // a hős saját kánon eseménye
      if (st[base]) sc += 2.5 + 0.5 * Math.max(0, st[base] - same(id));   // a kezdőpakliban is benne van
      sc += 3 * (tyShare[c.type] || 0.05);
      sc += need > 0 ? 0.4 * Math.min(need, 3) : need - 0.6;          // energiagörbe
      if (same(id)) sc -= 0.25;
      if (sc > bs) { bs = sc; best = id; }
    }
    if (!best) break;   // nincs több betehető lap
    put(best);
  }
  return { list, added };
}
// Bot paklija szintenként (2026-10-16, Tomi), meccsenként más (mérés: tools/botdeck.js, „játékos” = kezdőpakli + Normál agy):
// 1 Könnyű = kezdőpakli + 3 véletlen csere azonos típusú/költségű közönséges vagy ritka lapra (bot nyer ~21%, mint eddig)
// 2 Normál = a paklisegéd a közönséges–epikus lapok véletlen 70%-ából (~52%, eddig 50%)
// 3 Nehéz = a paklisegéd minden nem legendás lap véletlen 75%-ából (~67%, eddig 62%)
// 4 Mester = a paklisegéd a teljes lapkészletből (+6 élet a startMatch-ben)
const BOT_DECK = { 1: { swaps: 3, rar: 'kr' }, 2: { share: 0.7, rar: 'kre' }, 3: { share: 0.75, noLeg: true } };
function botDeckFor(hero, lv, rnd = Math.random) {
  const stK = Object.keys(DECKS).find(k => DECKS[k].hero === hero); if (!stK) return null;
  const pool = CARDS.filter(c => !c.token && !c.off && !c.passOnly && !c.eventOnly && !c.shopOnly && !c.wheelOnly && !c.variantOf && !c.finisher && (!c.hero || c.hero === hero) && !(c.set && typeof setLive === 'function' && !setLive(c.set)));   /* bot: meg nem jelent szett nélkül */
  const cap = id => CARD[id].rarity === 'l' ? 1 : 2;
  if (lv >= 4 || (BOT_DECK[lv] && BOT_DECK[lv].share)) {
    const cf = BOT_DECK[lv] || {}, sh = lv >= 4 ? 1 : cf.share, keep = new Set(pool.filter(c => (cf.rar ? cf.rar.includes(c.rarity) : (!cf.noLeg || c.rarity !== 'l')) && rnd() < sh).map(c => c.id));
    const own = id => { const c = CARD[id]; return c.finisher && c.hero === hero ? 1 : keep.has(id) ? cap(id) : 0; };
    const { list } = deckHelperFill({}, hero, own);
    return Object.values(list).reduce((a, b) => a + b, 0) === DECK_SIZE ? list : { ...DECKS[stK].list };
  }
  const cfg = BOT_DECK[lv] || BOT_DECK[2], list = { ...DECKS[stK].list };
  const bo = id => CARD[id].variantOf || id, famN = id => Object.entries(list).reduce((a, [x, n]) => a + (bo(x) === bo(id) ? n : 0), 0);
  for (let k = 0; k < cfg.swaps; k++) {
    const flat = Object.entries(list).flatMap(([id, n]) => Array(n).fill(id)).filter(id => !CARD[id].finisher && !CARD[id].hero);
    const out = flat[Math.floor(rnd() * flat.length)]; if (!out) break;
    const o = CARD[out];
    const RK = { k: 0, r: 1, e: 2, l: 3 }, okR = c => cfg.rar.includes(c.rarity) && (!cfg.up || RK[c.rarity] >= RK[o.rarity]);   // up: nem cserél gyengébb ritkaságra
    let cand = pool.filter(c => c.type === o.type && c.cost === o.cost && c.id !== out && okR(c) && famN(c.id) < cap(c.id));
    if (!cand.length) cand = pool.filter(c => c.type === o.type && Math.abs(c.cost - o.cost) <= 1 && c.id !== out && okR(c) && famN(c.id) < cap(c.id));
    if (!cand.length) continue;
    const inn = cand[Math.floor(rnd() * cand.length)].id;
    if (!--list[out]) delete list[out]; list[inn] = (list[inn] || 0) + 1;
  }
  return list;
}
// [DECKHELP-END]
function allDecks() {
  const starters = Object.entries(DECKS).filter(([, d]) => !d.set || setLive(d.set)).map(([id, d]) => ({ id, name: d.name, desc: d.desc, hero: d.hero, list: upgradeList(d.list), starter: true, set: d.set }));   /* szett-kezdőpakli csak a megjelenéstől */
  return starters.concat(Store.p ? Store.p.decks : []);
}
const deckCount = list => Object.values(list).reduce((a, b) => a + b, 0);
function deckProblem(list, hero, loan) {   /* loan: szett-kezdőpakli – kölcsönpakli, a lapjait nem kell birtokolni (2026-10-18) */
  if (hero !== undefined && !HERO[hero]) return 'Válassz hőst';
  const n = deckCount(list);
  if (n !== DECK_SIZE) return `${n}/${DECK_SIZE} lap`;
  for (const [id, k] of Object.entries(list)) if (k > 0 && CARD[id].off) return `${CARD[id].name}: még nem elérhető`;
  if (!loan) for (const [id, k] of Object.entries(list)) if (k > owned(id)) return `Hiányzik: ${CARD[id].name}`;
  for (const id of Object.keys(list)) if (CARD[id].hero && list[id] > 0 && CARD[id].hero !== hero) return `${CARD[id].name}: csak ${HERO[CARD[id].hero].name} paklijába`;
  return null;
}
/* Kölcsönpakli (szett-kezdőpakli, 2026-10-19, Tomi): paklinként 3 meccs, utána lejár */
const LOAN_MAX = 3;
const isLoan = d => !!(d && d.starter && d.set);
const loanLeft = d => LOAN_MAX - ((Store.p?.loan || {})[d.id] || 0);
const deckIssue = d => isLoan(d) && loanLeft(d) <= 0 ? 'lejárt a kölcsönpakli' : deckProblem(d.list, d.hero || null, isLoan(d));
function loanUse(deckId, matchKey) {   /* meccs indulásakor számol (kilépéssel sem lehet megúszni); matchKey: PvP-ben meccsenként egyszer */
  const p = Store.p, d = allDecks().find(x => x.id === deckId); if (!p || !isLoan(d)) return;
  if (matchKey) { p.loanM = p.loanM || []; if (p.loanM.includes(matchKey)) return; p.loanM = [...p.loanM.slice(-20), matchKey]; }
  p.loan = { ...(p.loan || {}), [d.id]: ((p.loan || {})[d.id] || 0) + 1 }; save();
  const left = loanLeft(d);
  setTimeout(() => toast(left > 0 ? `🌷 Kölcsönpakli: még ${left} meccs ezzel a paklival` : '🌷 Ez az utolsó kölcsönmeccs ezzel a paklival!'), 1200);
}
function loanOutModal() {
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal"><h3>🌷 Ezek csak kölcsön paklik voltak!</h3><p class="live">Az Amsterdam Hősei kezdőpaklikat ${LOAN_MAX}-${LOAN_MAX} meccsig próbálhattad ki. Gyűjtsd össze a lapjaikat <b>Amsterdam packokból</b>, és rakd össze a saját változatodat a <b>Paklik</b> menüben (a kölcsönpaklit megnyitva a <b>Másolat</b> gombbal ki is indulhatsz belőle).</p><button class="btn primary" data-x>Értem</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]') || e.target === o) o.remove(); };
  $('#layer').appendChild(o);
}
function heroPortrait(hid, cls = '') {
  const h = HERO[hid];
  if (!h) return `<span class="hp-img empty ${cls}">?</span>`;
  const sk = heroSkin(hid), aid = isPort(sk) ? sk : sk === 'gold' && ART['g_' + hid] ? 'g_' + hid : hid;
  return `<span class="hp-img ${cls}${aid !== hid ? ' gold' : ''}" style="--h:${h.hue};${ART[aid] ? `background-image:url('${artSrc(aid, false)}')` : ''}">${ART[aid] ? '' : initials(h.name)}</span>`;
}
function renderDecks() {
  const ds = allDecks().sort((a, b) => (a.starter ? 1 : 0) - (b.starter ? 1 : 0));   /* a saját paklik legfelül (2026-10-24) */
  $('#decksBody').innerHTML = `<button class="btn primary" id="newDeck">+ Új pakli</button><button class="btn" id="impDeck">📥 Pakli beillesztése</button>
    <div class="deck-list">${ds.map(d => {
      const prob = deckIssue(d), h = HERO[d.hero];
      return `<button class="deck-card" data-deck="${d.id}">
        ${heroPortrait(d.hero, 'dc-hero')}
        <span class="dc-txt"><b></b><em>${h ? h.name : 'Nincs hős'}</em><small>${isLoan(d) ? (loanLeft(d) > 0 ? `🌷 Kölcsönpakli · még ${loanLeft(d)} meccs` : '🌷 Kölcsönpakli · lejárt') : d.starter ? 'Kezdőpakli · nem szerkeszthető' : prob ? prob : 'Játékra kész'}</small></span>
        <span class="dc-go">${d.starter ? 'Megnéz' : 'Szerkeszt'}</span></button>`;
    }).join('')}</div>`;
  $('#decksBody').querySelectorAll('.deck-card').forEach((b, i) => b.querySelector('b').textContent = ds[i].name);
  $('#newDeck').onclick = () => pickHero(null, hid => openEditor(null, hid));
  $('#impDeck').onclick = () => deckImportModal('');
  $('#decksBody').querySelector('.deck-list').onclick = e => { const b = e.target.closest('[data-deck]'); if (b) openEditor(b.dataset.deck); };
}

// hős választó (új paklinál és a pakli hősére koppintva)
function pickHero(current, done, title, sub) {
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal hero-pick"><h3>${title || 'Válassz hőst a paklihoz'}</h3><p class="live">${sub || 'A hős a 20 lapon kívül van: ő a te arcod a meccsen, és a képessége végig hat.'}</p>
    <div class="hp-list">${HEROES.map(h => `<button class="hero-row" data-h="${h.id}" aria-pressed="${h.id === current}">${heroPortrait(h.id)}<span><b>${h.name}${title && ownsHeroFa(h.id) ? ' ✨' : ''}</b><small>${h.text}</small></span></button>`).join('')}</div>
    <button class="btn ghost" data-x>Mégse</button></div>`;
  o.onclick = e => {
    const b = e.target.closest('[data-h]');
    if (b) { o.remove(); done(b.dataset.h); return; }
    if (e.target.closest('[data-x]') || e.target === o) o.remove();
  };
  $('#layer').appendChild(o);
}

const ED = { deck: null, filter: 'all', readonly: false };
function openEditor(deckId, heroId) {
  const src = allDecks().find(d => d.id === deckId);
  ED.readonly = !!src?.starter;
  ED.deck = src ? { id: src.id, name: src.name, hero: src.hero || null, list: { ...src.list }, starter: src.starter }
               : { id: 'd' + Date.now().toString(36), name: `${HERO[heroId]?.name || 'Saját'} pakli ${Store.p.decks.length + 1}`, hero: heroId || null, list: {} };
  ED.isNew = !src; ED.filter = 'all'; ED.set = 'all'; ED.undo = null;
  show('scr-edit'); renderEditor();
}
function renderEditor() {
  const d = ED.deck, n = deckCount(d.list), prob = deckIssue(d), h = HERO[d.hero];
  $('#edName').value = d.name; $('#edName').readOnly = ED.readonly;
  $('#edCount').textContent = `${n}/${DECK_SIZE}`; $('#edCount').className = 'ed-count' + (n === DECK_SIZE ? ' full' : '');
  $('#edHero').innerHTML = `${heroPortrait(d.hero)}<span class="eh-txt"><b>${h ? h.name : 'Válassz hőst'}</b><small>${h ? h.text : 'Koppints ide'}</small></span>${ED.readonly ? '' : '<i class="eh-edit">Csere</i>'}`;
  $('#edHero').disabled = ED.readonly;
  const rows = Object.entries(d.list).sort(([a], [b]) => CARD[a].cost - CARD[b].cost || CARD[a].name.localeCompare(CARD[b].name, 'hu'));
  const curve = [0, 0, 0, 0, 0, 0, 0];
  for (const [id, k] of rows) curve[Math.min(6, CARD[id].cost)] += k;
  const mx = Math.max(1, ...curve);
  $('#edCurve').innerHTML = curve.map((v, i) => `<span><i style="height:${v / mx * 100}%"></i><em>${i === 6 ? '6+' : i}</em></span>`).join('');
  $('#edList').innerHTML = rows.length ? rows.map(([id, k]) => {
      const c = CARD[id];
      return `<button class="ed-row ${TYPE[c.type][1]}${c.rarity === 'l' ? ' leg' : ''}" data-rm="${id}" ${ED.readonly ? 'disabled' : ''} aria-label="${c.name}, ${k} db – koppints az eltávolításhoz">
        <span class="er-art" style="${ART[id] ? `background-image:url('${artSrc(id, false)}');background-position:${ART[id].pos || '50% 30%'}` : `--h:${hueOf(id)}`}"></span>
        <span class="er-cost">${cardCostBase(id)}</span><span class="er-name">${c.name}</span><span class="er-n">${c.rarity === 'l' ? '★' : k > 1 ? '×' + k : ''}</span></button>`;
    }).join('')
    : `<p class="ed-empty">${ED.readonly ? 'Üres pakli.' : 'Még üres. Koppints a bal oldali lapokra, és itt jelennek meg.'}</p>`;
  const pool = PLAYABLE.filter(c => owned(c.id) > 0 && (!c.hero || c.hero === d.hero) && (ED.filter === 'all' || c.type === ED.filter) && (!ED.set || ED.set === 'all' || cardSet(c) === ED.set))   // kánon eseményt csak a saját hőse kap; szett-szűrő (2026-10-19)
                    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, 'hu'));
  $('#edPool').innerHTML = pool.map(c => {
    const inDeck = d.list[c.id] || 0, cap = Math.min(maxCopies(c.id) - (sameCount(d.list, c.id) - inDeck), owned(c.id));
    return `<button class="ed-card${inDeck >= cap || n >= DECK_SIZE ? ' full' : ''}${inDeck ? ' in' : ''}" data-add="${c.id}" ${ED.readonly ? 'disabled' : ''}>
      ${cardHTML(c.id, { foil: ownsFoil(c.id) })}<span class="ed-own">${inDeck ? `${inDeck}/${cap} a pakliban` : `${cap} db`}</span></button>`;
  }).join('') || `<p class="ed-empty">${ED.set && ED.set !== 'all' ? 'Ebből a szettből és fajtából' : 'Ebből a fajtából'} nincs még lapod.</p>`;
  document.querySelectorAll('#edFilter button').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === ED.filter));
  { const sets = cfSets(); if (ED.set && ED.set !== 'all' && !sets.some(([k]) => k === ED.set)) ED.set = 'all';
    $('#edSetFilter').innerHTML = [['all', 'Minden szett'], ...sets].map(([k, n]) => `<button data-s="${k}" aria-pressed="${(ED.set || 'all') === k}">${k === 'hw' ? '🎃 ' : k === 'ah' ? '🌷 ' : ''}${k === 'ah' ? 'Amsterdam' : n}</button>`).join(''); }
  $('#edSave').hidden = ED.readonly; $('#edDelete').hidden = ED.readonly || ED.isNew; $('#edCopy').hidden = !ED.readonly;
  $('#edHelp').parentNode.hidden = ED.readonly;
  $('#edHelp').textContent = ED.undo ? '↶ Visszavonás' : n >= DECK_SIZE ? '🪄 Kész a pakli' : `🪄 Segíts! (+${DECK_SIZE - n} lap)`;
  $('#edHelp').classList.toggle('undo', !!ED.undo);
  /* Laci javaslata (2026-10-21): ha van meg egy lap szebb változata (arany / ritka változat), egy gombbal lecseréli. A Full Art magától csillog, ahhoz nem kell semmi. */
  { const up = ED.readonly ? null : upgradeList(d.list), nUp = up ? Object.keys(d.list).reduce((a, id) => a + Math.max(0, (d.list[id] || 0) - (up[id] || 0)), 0) : 0;
    let ub = $('#edUpg'); if (!ub) { ub = document.createElement('button'); ub.id = 'edUpg'; ub.className = 'btn small ed-help ed-upg'; $('#edHelp').parentNode.appendChild(ub);
      ub.onclick = () => { const dd = ED.deck, prev = { ...dd.list }, nl = upgradeList(dd.list); dd.list = nl; ED.undo = prev; renderEditor(); toast('✨ Lecseréltem a szebb változatokra – a hatásuk ugyanaz'); }; }
    ub.hidden = !nUp; ub.textContent = `✨ Szebb változatok (${nUp})`; }
  $('#edShare').disabled = !n;
  $('#edStatus').textContent = ED.readonly ? 'Kezdőpakli – másold le, ha módosítanád.' : prob ? `Még nem játszható: ${prob}` : '✓ Játékra kész';
  $('#edStatus').className = 'ed-status' + (!ED.readonly && !prob ? ' ok' : '');
}
const cardCostBase = id => CARD[id].cost;
$('#edHero').onclick = () => { if (!ED.readonly) pickHero(ED.deck.hero, hid => { ED.deck.hero = hid; ED.undo = null; renderEditor(); }); };
// koppintás: hozzáad; hosszú nyomás / jobb klikk: részletek
let edPress = null;
$('#edPool').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-add]'); if (!b) return;
  edPress = { b, t: setTimeout(() => { edPress.long = true; openModal(cardHTML(b.dataset.add, { big: true, foil: ownsFoil(b.dataset.add) }), `${owned(b.dataset.add)} db a gyűjteményedben`, cardHelpHTML(b.dataset.add)); }, 450) };
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => $('#edPool').addEventListener(t, () => { if (edPress) clearTimeout(edPress.t); }));
$('#edPool').addEventListener('click', e => {
  const b = e.target.closest('[data-add]'); if (!b) return;
  if (edPress && edPress.long) { edPress = null; return; }
  edPress = null;
  if (ED.readonly) { openModal(cardHTML(b.dataset.add, { big: true, foil: ownsFoil(b.dataset.add) }), `${owned(b.dataset.add)} db a gyűjteményedben`, cardHelpHTML(b.dataset.add)); return; }
  const id = b.dataset.add, d = ED.deck.list;
  if (deckCount(d) >= DECK_SIZE) { toast('A pakli tele van (20 lap)'); return; }
  if (CARD[id].hero && CARD[id].hero !== ED.deck.hero) { toast(`Ez ${HERO[CARD[id].hero].name} kánon eseménye, csak az ő paklijába teheted`); return; }
  if (sameCount(d, id) > (d[id] || 0) && sameCount(d, id) >= maxCopies(id)) { toast('A változattal együtt is max. 2'); return; }
  if ((d[id] || 0) >= Math.min(maxCopies(id), owned(id))) { toast(owned(id) < maxCopies(id) ? 'Nincs több ebből a lapból' : CARD[id].rarity === 'l' ? 'Legendásból 1 lehet a pakliban' : 'Egy lapból legfeljebb 2 lehet'); return; }
  d[id] = (d[id] || 0) + 1; ED.undo = null; renderEditor();
  const row = $(`#edList [data-rm="${id}"]`);
  if (row) { row.scrollIntoView({ block: 'nearest' }); row.animate([{ background: 'rgba(255,211,77,.45)' }, { background: '' }], { duration: 500 }); }
});
$('#edPool').addEventListener('contextmenu', e => { const b = e.target.closest('[data-add]'); if (b) { e.preventDefault(); } });
/* hosszú nyomás a pakli listájában is: a lap részletei (Laci javaslata, 2026-10-21) */
let edLPress = null;
$('#edList').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-rm]'); if (!b) return;
  edLPress = { t: setTimeout(() => { edLPress.long = true; const id = b.dataset.rm; openModal(cardHTML(id, { big: true, foil: ownsFoil(id) }), `${ED.deck.list[id] || 0} db a pakliban · ${owned(id)} db a gyűjteményedben`, cardHelpHTML(id)); }, 450) };
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => $('#edList').addEventListener(t, () => { if (edLPress) clearTimeout(edLPress.t); }));
$('#edList').addEventListener('contextmenu', e => { if (e.target.closest('[data-rm]')) e.preventDefault(); });
$('#edList').addEventListener('click', e => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  if (edLPress && edLPress.long) { edLPress = null; return; }
  edLPress = null;
  if (ED.readonly) { openModal(cardHTML(b.dataset.rm, { big: true, foil: ownsFoil(b.dataset.rm) }), '', cardHelpHTML(b.dataset.rm)); return; }
  const d = ED.deck.list, id = b.dataset.rm; d[id]--; if (!d[id]) delete d[id]; ED.undo = null; renderEditor();
});
$('#edFilter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { ED.filter = b.dataset.f; renderEditor(); } });
$('#edSetFilter').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { ED.set = b.dataset.s; renderEditor(); } });
$('#edName').addEventListener('input', e => { if (!ED.readonly) ED.deck.name = e.target.value.slice(0, 24); });
$('#edSave').onclick = async () => {
  const d = ED.deck; d.name = (d.name || '').trim() || 'Névtelen pakli';
  if (!d.hero) { toast('Előbb válassz hőst a paklihoz'); return pickHero(null, hid => { d.hero = hid; renderEditor(); }); }
  const i = Store.p.decks.findIndex(x => x.id === d.id);
  const rec = { id: d.id, name: d.name, hero: d.hero, list: d.list };
  if (i >= 0) Store.p.decks[i] = rec; else Store.p.decks.push(rec);
  ED.isNew = false; await save(); toast('Pakli elmentve'); show('scr-decks'); renderDecks();
};
$('#edCopy').onclick = () => {
  ED.deck = { id: 'd' + Date.now().toString(36), name: ED.deck.name + ' (saját)', hero: ED.deck.hero, list: { ...ED.deck.list } };
  ED.readonly = false; ED.isNew = true; renderEditor(); toast('Másolat kész, most már szerkesztheted');
};
$('#edDelete').onclick = () => { $('#edConfirm').hidden = false; };
$('#edConfirmNo').onclick = () => { $('#edConfirm').hidden = true; };
$('#edConfirmYes').onclick = async () => {
  Store.p.decks = Store.p.decks.filter(x => x.id !== ED.deck.id);
  $('#edConfirm').hidden = true; await save(); toast('Pakli törölve'); show('scr-decks'); renderDecks();
};
$('#edBack').onclick = () => { show('scr-decks'); renderDecks(); };
// 🪄 paklisegéd gomb
function edHelpRun() {
  const d = ED.deck;
  if (ED.undo) { d.list = ED.undo; ED.undo = null; renderEditor(); toast('Javaslat visszavonva'); return; }
  if (!d.hero) { toast('Előbb válassz hőst – a hőshöz illő lapokat keresem'); return pickHero(null, hid => { d.hero = hid; renderEditor(); edHelpRun(); }); }
  if (deckCount(d.list) >= DECK_SIZE) { toast('Tele a pakli – vegyél ki pár lapot, és a helyükre javaslok'); return; }
  const prev = { ...d.list }, r = deckHelperFill(d.list, d.hero, owned);
  if (!r.added.length) { toast('Nincs több betehető lapod – nyiss packokat!'); return; }
  d.list = r.list; ED.undo = prev; renderEditor();
  const ids = [...new Set(r.added)];
  ids.forEach(id => { const row = $(`#edList [data-rm="${id}"]`); if (row) row.animate([{ background: 'rgba(160,120,255,.6)' }, { background: '' }], { duration: 1100 }); });
  toast(deckCount(d.list) >= DECK_SIZE ? `🪄 ${r.added.length} lapot tettem be – kész a pakli!` : `🪄 ${r.added.length} lapot tettem be – több nincs, ami beférne`);
}
$('#edHelp').onclick = edHelpRun;

// ---- pakli megosztása kóddal / linkkel (2026-10-12) ----
// Kód: BOU-P1.<base64url(hős|név|lap*db,…)>.<ellenőrző összeg>. A link: …/?deck=<kód>
const DK_PREFIX = 'BOU-P1.';
function deckCode(d) {
  const body = [d.hero || '', (d.name || '').replace(/\|/g, ' ').slice(0, 24), Object.entries(d.list).filter(([, k]) => k > 0).map(([id, k]) => id + '*' + k).join(',')].join('|');
  return DK_PREFIX + b64u(body) + '.' + pvpHash(body).toString(36).padStart(7, '0');   // fix 7 karakter, hogy a kód utáni szöveg ne ragadjon hozzá
}
function parseDeckCode(text) {
  const m = String(text || '').replace(/\s+/g, '').match(/BOU-P1\.([A-Za-z0-9_-]+)\.([0-9a-z]{7})/);
  if (!m) throw new Error('Nem találok paklikódot. Másold be az egész üzenetet vagy a linket.');
  let body; try { body = unb64u(m[1]); } catch { throw new Error('A kód sérült – másold ki újra az egészet.'); }
  if (pvpHash(body).toString(36).padStart(7, '0') !== m[2]) throw new Error('A kód hiányos vagy sérült – másold ki újra az egészet.');
  const [hero, name, rows] = body.split('|');
  if (!HERO[hero]) throw new Error('Ismeretlen hős a kódban – frissítsd az appot.');
  const list = {}; let unknown = 0;
  for (const r of (rows || '').split(',').filter(Boolean)) { const [id, k] = r.split('*'); if (CARD[id] && !CARD[id].token) list[id] = (list[id] || 0) + Math.max(1, Math.min(2, +k || 1)); else unknown++; }
  return { hero, name: name || 'Kapott pakli', list, unknown };
}
// a kapott listából azt rakja össze, ami a saját gyűjteményedben megvan (ha az adott lap nincs meg, de a változata igen, azt teszi be)
function adaptDeckList(list) {
  const out = {}, miss = {};
  for (const [id, k] of Object.entries(list)) {
    const base = baseOf(id), fam = [id, ...CARDS.filter(c => baseOf(c.id) === base && c.id !== id).map(c => c.id)];
    let left = k;
    for (const f of fam) {
      if (!left) break;
      const room = Math.min(owned(f) - (out[f] || 0), maxCopies(f) - sameCount(out, f));
      const use = Math.min(left, Math.max(0, room)); if (use > 0) { out[f] = (out[f] || 0) + use; left -= use; }
    }
    if (left) miss[base] = (miss[base] || 0) + left;
  }
  return { list: out, miss };
}
function deckShareModal() {
  const d = ED.deck, code = deckCode(d), url = INV_URL + '?deck=' + code, h = HERO[d.hero];
  const text = `Nézd meg a(z) „${d.name}” paklimat (${h ? h.name : '?'}) a Best of Us-ban! Másold ki ezt az üzenetet, és a játékban: Paklik → 📥 Pakli beillesztése.`;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box"><h3>📤 Pakli megosztása</h3>
    <p class="live">Küldd el a haverodnak (Messenger, bármi). Ő a Paklik menüben a <b>📥 Pakli beillesztése</b> gombbal bemásolja, és megkapja a saját paklijai közé – abból, ami az ő gyűjteményében megvan.</p>
    <textarea class="xfer-code" readonly rows="4"></textarea>
    <button class="btn primary" data-share>Küldés…</button><button class="btn" data-copy>Kód másolása</button><button class="btn ghost" data-x>Bezár</button></div>`;
  o.querySelector('textarea').value = text + '\n' + url;
  o.onclick = async e => {
    if (e.target.closest('[data-x]') || e.target === o) return o.remove();
    if (e.target.closest('[data-share]')) {
      try { if (navigator.share) { await navigator.share({ title: 'Best of Us pakli', text, url }); return; } } catch (er) { if (er && er.name === 'AbortError') return; }
      e.target.closest('[data-share]').nextElementSibling.click(); return;
    }
    if (e.target.closest('[data-copy]')) {
      try { await navigator.clipboard.writeText(text + '\n' + url); toast('Kimásolva ✔ – illeszd be a chatbe'); }
      catch { const t = o.querySelector('textarea'); t.focus(); t.select(); toast('Jelöld ki és másold ki a szöveget'); }
    }
  };
  $('#layer').appendChild(o);
}
$('#edShare').onclick = () => { if (deckCount(ED.deck.list)) deckShareModal(); };
function deckImportModal(pre) {
  if (!Store.p) return;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box"><h3>📥 Pakli beillesztése</h3>
    <p class="live">Másold be ide a haverod üzenetét vagy a paklikódot (BOU-P1.…).</p>
    <textarea class="xfer-code" rows="4" placeholder="BOU-P1.…"></textarea>
    ${navigator.clipboard?.readText ? '<button class="btn small" data-paste>📋 Beillesztés a vágólapról</button>' : ''}
    <div data-prev></div>
    <button class="btn primary" data-go disabled>Hozzáadás a paklijaimhoz</button><button class="btn ghost" data-x>Mégse</button></div>`;
  const ta = o.querySelector('textarea'), prev = o.querySelector('[data-prev]'), go = o.querySelector('[data-go]');
  let cur = null;
  const upd = () => {
    cur = null; go.disabled = true;
    if (!ta.value.trim()) { prev.innerHTML = ''; return; }
    let r; try { r = parseDeckCode(ta.value); } catch (er) { prev.innerHTML = `<p class="dk-err"></p>`; prev.firstChild.textContent = er.message; return; }
    const a = adaptDeckList(r.list), want = deckCount(r.list), have = deckCount(a.list);
    const miss = Object.entries(a.miss).map(([id, k]) => CARD[id].name + (k > 1 ? ' ×' + k : ''));
    cur = { ...r, list: a.list, missN: want - have + r.unknown };
    prev.innerHTML = `<div class="dk-prev">${heroPortrait(r.hero)}<span><b></b><small>${HERO[r.hero].name} · ${want} lap · neked ${have} megvan belőle</small>${miss.length || r.unknown ? `<small class="miss">Hiányzik: ${miss.join(', ')}${r.unknown ? `${miss.length ? ', ' : ''}${r.unknown} ismeretlen lap (frissítsd az appot)` : ''} – a 🪄 gombbal kiegészítheted a saját lapjaidból.</small>` : '<small>✓ Minden lapod megvan hozzá!</small>'}</span></div>`;
    prev.querySelector('b').textContent = r.name;
    go.disabled = false;
  };
  ta.addEventListener('input', upd);
  if (pre) { ta.value = pre; upd(); }
  o.onclick = async e => {
    if (e.target.closest('[data-x]') || e.target === o) return o.remove();
    if (e.target.closest('[data-paste]')) { try { ta.value = await navigator.clipboard.readText(); upd(); } catch { toast('Nem sikerült – nyomd hosszan a mezőt, és Beillesztés'); } return; }
    if (e.target.closest('[data-go]') && cur) {
      o.remove();
      ED.readonly = false; ED.isNew = true; ED.filter = 'all'; ED.undo = null;
      ED.deck = { id: 'd' + Date.now().toString(36), name: cur.name.slice(0, 24), hero: cur.hero, list: cur.list };
      show('scr-edit'); renderEditor();
      toast(cur.missN ? `${cur.missN} lap hiányzott – a 🪄 Segíts! gomb pótolja` : 'Megvan! Nyomd meg a Mentést');
    }
  };
  $('#layer').appendChild(o);
  if (!pre) setTimeout(() => ta.focus(), 50);
}
// …/?deck=KÓD link: eltesszük, és a menübe érve felajánljuk a beillesztést
try {
  const q = new URLSearchParams(location.search);
  if (q.has('deck')) { localStorage.setItem('bou_deck', q.get('deck') || ''); history.replaceState(null, '', location.pathname + location.hash); }
} catch (e) {}
function deckLinkCheck() {
  if (!Store.p || Store.p.onboard || (typeof S !== 'undefined' && S) || document.querySelector('#layer .overlay')) return;   // majd ha szabad a menü (bemutató, napi ajándék után)
  let c = ''; try { c = localStorage.getItem('bou_deck') || ''; if (c) localStorage.removeItem('bou_deck'); } catch {}
  if (c) deckImportModal(c.startsWith(DK_PREFIX) ? c : DK_PREFIX + c);
}

// ---- küldetések ----
// Napi: 3 küldetés, helyi éjfélkor cserélődnek, mindegyik 1 Base set packot ad.
// Heti: 1 nehezebb küldetés, hétfő 0:01-kor cserélődik, 1 Shiny packot ad.
const Q_DAILY = [
  { id: 'win1',   goal: 1,  txt: 'Nyerj 1 meccset',                         f: m => m.win ? 1 : 0 },
  { id: 'play3',  goal: 3,  txt: 'Játssz le 3 meccset',                     f: m => 1 },
  { id: 'act5',   goal: 5,  txt: 'Játssz ki 5 akciót',                      f: m => m.actions },
  { id: 'item4',  goal: 4,  txt: 'Tegyél fel 4 eszközt',                    f: m => m.items },
  { id: 'char8',  goal: 8,  txt: 'Játssz ki 8 karaktert',                   f: m => m.chars },
  { id: 'dmg30',  goal: 30, txt: 'Okozz 30 sebzést az ellenfél hősének',    f: m => m.heroDmg },
  { id: 'kill6',  goal: 6,  txt: 'Pusztíts el 6 ellenséges karaktert',      f: m => m.kills },
  { id: 'loc2',   goal: 2,  txt: 'Játssz ki 2 helyszínt',                   f: m => m.locs },
  { id: 'big3',   goal: 3,  txt: 'Játssz ki 3 legalább 5 energiás lapot',   f: m => m.big },
  { id: 'hero',   goal: 1,  txt: h => `Nyerj egy meccset ${HERO[h].name} hőssel`, f: (m, q) => m.win && m.hero === q.h ? 1 : 0, hero: true },
];
const Q_WEEKLY = [
  { id: 'wwin7',  goal: 7,   txt: 'Nyerj 7 meccset',                         f: m => m.win ? 1 : 0 },
  { id: 'w3hero', goal: 3,   txt: 'Nyerj 3 különböző hőssel',                f: (m, q) => m.win && !(q.seen || []).includes(m.hero) ? ((q.seen = [...(q.seen || []), m.hero]), 1) : 0 },
  { id: 'wdmg',   goal: 150, txt: 'Okozz 150 sebzést az ellenfél hősének',   f: m => m.heroDmg },
  { id: 'wkill',  goal: 30,  txt: 'Pusztíts el 30 ellenséges karaktert',     f: m => m.kills },
  { id: 'wplay12',goal: 12,  txt: 'Játssz le 12 meccset',                    f: m => 1 },
];
const qDef = (pool, id) => pool.find(d => d.id === id);
const qText = (pool, q) => { const d = qDef(pool, q.id); return typeof d.txt === 'function' ? d.txt(q.h) : d.txt; };
function hashStr(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
function weekKey(d = new Date()) {   // a hét hétfő 0:01-kor kezdődik (helyi idő)
  const t = new Date(d.getTime() - 60000); const day = (t.getDay() + 6) % 7;
  const mon = new Date(t.getFullYear(), t.getMonth(), t.getDate() - day);
  return mon.toLocaleDateString('sv');
}
function weekEnds(d = new Date()) { const k = weekKey(d).split('-').map(Number); return new Date(k[0], k[1] - 1, k[2] + 7, 0, 1); }
function ensureQuests(p) {
  p.quests = p.quests || {};
  const Q = p.quests, day = today(), wk = weekKey();
  if (Q.day !== day) {
    const r = seeded(hashStr('d' + day + (Store.uid || p.name || '')));
    const pool = Q_DAILY.slice(), pick = [];
    while (pick.length < 3) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    Q.day = day;
    Q.daily = pick.map(d => ({ id: d.id, prog: 0, done: false, ...(d.hero ? { h: HEROES[Math.floor(r() * HEROES.length)].id } : {}) }));
  }
  if (Q.week !== wk) {
    const r = seeded(hashStr('w' + wk + (Store.uid || p.name || '')));
    Q.week = wk; Q.weekly = { id: Q_WEEKLY[Math.floor(r() * Q_WEEKLY.length)].id, prog: 0, done: false };
  }
  return Q;
}
// meccs végén: a meccs statisztikái alapján halad; teljesítéskor azonnal jóváírja a jutalmat
/* Amsterdam Hősei limitált küldetések (2026-10-19, Tomi): a megjelenéstől 2 hétig; egyenként 2 Amsterdam booster, az utolsó 5 */
const AHQ_END = SET_RELEASE.ah + 14 * 864e5;
const AHQ = [
  { id: 'win1',   t: 'Nyerj 1 meccset', goal: 1, f: m => m.win ? 1 : 0 },
  { id: 'play3',  t: 'Játssz 1 meccset legalább 3 Amsterdam Hősei lappal a paklidban', goal: 1, f: m => m.ah >= 3 ? 1 : 0 },
  { id: 'dmg100', t: 'Okozz összesen 100 sebzést az ellenfél hősének', goal: 100, f: m => m.heroDmg || 0 },
  { id: 'win3',   t: 'Nyerj 1 meccset legalább 3 Amsterdam Hősei lappal a paklidban', goal: 1, f: m => m.win && m.ah >= 3 ? 1 : 0 },
  { id: 'rk',     t: 'Nyerj 1 ranked meccset', goal: 1, f: m => m.win && m.ranked ? 1 : 0 },
  { id: 'fr',     t: 'Játssz egy PvP meccset egy barátod ellen', goal: 1, f: m => m.friend ? 1 : 0 },
  { id: 'play10', t: 'Játssz 1 meccset legalább 10 Amsterdam Hősei lappal a paklidban', goal: 1, f: m => m.ah >= 10 ? 1 : 0 },
  { id: 'all',    t: 'Teljesítsd az összes Amsterdam Hősei küldetést', goal: 7, all: true, rew: 5 },
];
const ahqLive = () => setLive('ah') && Date.now() < AHQ_END;
const ahCount = list => Object.entries(list || {}).reduce((a, [id, n]) => a + (CARD[id]?.set === 'ah' ? n : 0), 0);
function ahqState(p) { p.ahq = p.ahq || { prog: {}, done: [] }; return p.ahq; }
function ahqOnMatch(m, got) {   /* a meccs végén: haladás + jutalom (azonnal jóváírva, mint a napi küldetésnél) */
  const p = Store.p; if (!p || !ahqLive()) return;
  const st = ahqState(p);
  const finish = q => { st.done.push(q.id); const n = q.rew || 2; p.ahPacks = (p.ahPacks || 0) + n; got.push({ txt: q.t, rew: `${n} Amsterdam booster`, ah: true }); };
  for (const q of AHQ) { if (q.all || st.done.includes(q.id)) continue;
    st.prog[q.id] = Math.min(q.goal, (st.prog[q.id] || 0) + (q.f(m) || 0)); if (st.prog[q.id] >= q.goal) finish(q); }
  const fin = AHQ.find(q => q.all); st.prog.all = AHQ.filter(q => !q.all && st.done.includes(q.id)).length;
  if (!st.done.includes(fin.id) && st.prog.all >= fin.goal) finish(fin);
}
function questsOnMatch(m) {
  const p = Store.p; if (!p) return [];
  const Q = ensureQuests(p), got = [];
  const step = (pool, q, reward) => {
    if (q.done) return;
    q.prog = Math.min(qDef(pool, q.id).goal, q.prog + (qDef(pool, q.id).f(m, q) || 0));
    if (q.prog >= qDef(pool, q.id).goal) { q.done = true; reward(); got.push({ txt: qText(pool, q), rew: setLive('ah') ? (pool === Q_WEEKLY ? '1 Amsterdam Shiny pack' : '1 Amsterdam pack') : (pool === Q_WEEKLY ? '1 Shiny pack' : '1 pack'), weekly: pool === Q_WEEKLY }); }
  };
  /* 2026-10-19 19:00-tól (Tomi): a napi küldetés Amsterdam packot, a heti Amsterdam Shiny packot ad */
  for (const q of Q.daily) step(Q_DAILY, q, () => { if (setLive('ah')) p.ahPacks = (p.ahPacks || 0) + 1; else p.giftPacks = (p.giftPacks || 0) + 1; });
  step(Q_WEEKLY, Q.weekly, () => { if (setLive('ah')) p.ahShinyPacks = (p.ahShinyPacks || 0) + 1; else p.shinyPacks = (p.shinyPacks || 0) + 1; });
  try { ahqOnMatch(m, got); } catch (e) {}
  save(); renderQuestBadge();
  return got;
}
function renderQuestBadge() {
  const b = $('#questBadge'); if (!b || !Store.p) return;
  const Q = ensureQuests(Store.p), n = Q.daily.filter(q => q.done).length + (Q.weekly.done ? 1 : 0);
  b.textContent = `${n}/4`;
  /* Amsterdam limitált küldetések jelzése a menüben (2026-10-19, Tomi) */
  const tile = $('#goQuests'), sm = tile?.querySelector('.m-txt small'); if (!tile || !sm) return;
  const st = ahqState(Store.p), nd = AHQ.filter(q => st.done.includes(q.id)).length, on = ahqLive() && nd < AHQ.length;
  tile.classList.toggle('ah-hot', on); tile.classList.toggle('ah-new', on && !Store.p.ahqSeen);
  sm.innerHTML = on ? `🌷 <span class="ah-q">Limitált Amsterdam küldetések</span> · ${nd}/${AHQ.length} kész` : '3 napi + 1 heti feladat';
}
function renderQuests() {
  const p = Store.p; if (!p) return;
  const Q = ensureQuests(p);
  const row = (pool, q, rew, cls) => { const d = qDef(pool, q.id);
    return `<div class="q-row ${cls}${q.done ? ' done' : ''}"><div class="q-main"><b>${qText(pool, q)}</b>
      <div class="q-bar"><i style="width:${q.prog / d.goal * 100}%"></i><span>${q.prog}/${d.goal}</span></div></div>
      <div class="q-rew">${q.done ? '<span class="q-ok">✓</span>' : ''}${rew}</div></div>`; };
  const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const hrs = ms => { const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return h >= 24 ? `${Math.floor(h / 24)} nap ${h % 24} óra` : `${h} óra ${m} perc`; };
  const st = ahqState(p), ahRow = q => { const pr = st.prog[q.id] || 0, dn = st.done.includes(q.id);
    return `<div class="q-row ah${q.all ? ' weekly' : ' daily'}${dn ? ' done' : ''}"><div class="q-main"><b>${q.t}</b>
      <div class="q-bar"><i style="width:${Math.min(100, pr / q.goal * 100)}%"></i><span>${Math.min(pr, q.goal)}/${q.goal}</span></div></div>
      <div class="q-rew">${dn ? '<span class="q-ok">✓</span>' : ''}<span class="q-pack ah"></span><em>${q.rew || 2} Amsterdam</em></div></div>`; };
  const ahBlock = ahqLive() ? `<div class="lbl">🌷 Amsterdam Hősei – limitált küldetések <small>· még ${hrs(AHQ_END - now)}</small></div>${AHQ.map(ahRow).join('')}` : '';
  $('#questBody').innerHTML = `${ahBlock}
    <div class="lbl">Napi küldetések <small>· új feladatok ${hrs(mid - now)} múlva</small></div>
    ${Q.daily.map(q => row(Q_DAILY, q, setLive('ah') ? '<span class="q-pack ah"></span><em>1 Amsterdam</em>' : '<span class="q-pack"></span><em>1 pack</em>', 'daily')).join('')}
    <div class="lbl">Heti küldetés <small>· hétfő 0:01-kor frissül (${hrs(weekEnds() - now)})</small></div>
    ${row(Q_WEEKLY, Q.weekly, setLive('ah') ? '<span class="q-pack shiny ah"></span><em>1 Amsterdam Shiny</em>' : '<span class="q-pack shiny"></span><em>1 Shiny</em>', 'weekly')}
    <p class="q-note">A haladás meccs végén számít${ahqLive() ? ' (az Amsterdam-küldetéseknél a PvP és a ranked meccs is)' : ' (a bot elleni meccseken)'}. A jutalom teljesítéskor azonnal jóváíródik, a Boosterek menüben bonthatod ki.</p>`;
}

// ---- Season Pass (ingyenes) ----
// XP: meccs (győzelem 60 / döntetlen 40 / vereség 30) + napi küldetés 100 + heti küldetés 300.
// 30 szint, szintenként 250 XP; a 30. után minden további 250 XP ráadás packot ad.
// A jutalmat kézzel kell átvenni; ami a szezon végéig átvétlen marad, a következő szezon indulásakor automatikusan jóváíródik.
const PASS_XP = { win: 60, draw: 40, loss: 30, daily: 100, weekly: 300, perLevel: 250 };
const SEASONS = [
  { id: 's1', name: '0. szezon · Bétateszt', start: new Date(2026, 8, 28, 0, 0), end: new Date(2026, 9, 12, 0, 0),
    tiers: [
      { coins: 50 }, { packs: 1 }, { coins: 75 }, { packs: 1 }, { shiny: 1 },
      { coins: 100 }, { packs: 2 }, { coins: 75 }, { packs: 1 }, { shiny: 1 },
      { coins: 100 }, { card: 'c_pifti2' }, { coins: 100 }, { packs: 1 }, { shiny: 1 },
      { coins: 150 }, { packs: 2 }, { card: 'c_tzs2' }, { packs: 2 }, { shiny: 1 },
      { coins: 150 }, { packs: 2 }, { coins: 150 }, { packs: 3 }, { card: 'i_aranylanc' },
      { coins: 200 }, { packs: 3 }, { shiny: 1 }, { coins: 250 }, { heroPick: true },
    ] },
  // 2026-10-12: a játék indulása – 30 napos szezon, a ranked első szezonja is
  { id: 's2', name: '1. szezon · Nyitókör', start: new Date(2026, 9, 12, 0, 0), end: new Date(2026, 10, 11, 0, 0),
    tiers: [
      { coins: 50 }, { packs: 1 }, { coins: 75 }, { card: 'c_pifti2', had: 250 }, { shiny: 1 },
      { coins: 100 }, { packs: 2 }, { card: 'c_tzs2', had: 250 }, { packs: 1 }, { port: 'p_laci_kave' },
      { coins: 100 }, { packs: 2 }, { coins: 100 }, { packs: 1 }, { port: 'p_milo_busz' },
      { coins: 150 }, { packs: 2 }, { shiny: 1 }, { packs: 2 }, { card: 'c_nyitinap' },
      { coins: 150 }, { packs: 2 }, { coins: 150 }, { packs: 3 }, { port: 'p_krisz_vip' },
      { coins: 200 }, { packs: 3 }, { shiny: 1 }, { coins: 250 }, { goldPick: true },
    ] },
];
const curSeason = (d = new Date()) => SEASONS.find(s => d >= s.start && d < s.end) || null;
const passLevel = xp => Math.floor(xp / PASS_XP.perLevel);
function rewLabel(r) {
  if (r.coins) return `${r.coins} coin`;
  if (r.packs) return `${r.packs} Base pack`;
  if (r.shiny) return `${r.shiny} Shiny pack`;
  if (r.fa) return `${r.fa} Full Art pack`;
  if (r.card) return CARD[r.card].variantOf ? `${CARD[r.card].name} – különleges változat` : `${CARD[r.card].name} – Full Art`;
  if (r.heroPick) return 'Választott Full Art hős';
  if (r.goldPick) return 'Választott Arany hős';
  if (r.port) return `${PORTRAITS[r.port].name} – hős portré`;
  return '';
}
function rewIcon(r) {
  if (r.coins) return '<span class="coin sp-coin" aria-hidden="true"></span>';
  if (r.packs) return `<span class="q-pack" aria-hidden="true"></span>${r.packs > 1 ? `<i class="sp-x">×${r.packs}</i>` : ''}`;
  if (r.shiny) return '<span class="q-pack shiny" aria-hidden="true"></span>';
  if (r.fa) return '<span class="q-pack fa" aria-hidden="true"></span>';
  if (r.card) return ART[r.card] ? `<span class="sp-thumb" aria-hidden="true" style="background-image:url('${artSrc(r.card)}')"></span>` : '<span class="sp-mystery" aria-hidden="true"><b>★</b></span>';
  if (r.heroPick) return '<span class="sp-mystery" aria-hidden="true"><b>?</b></span>';
  if (r.goldPick) return '<span class="sp-mystery gold" aria-hidden="true"><b>★</b></span>';
  if (r.port) return ART[r.port] ? `<span class="sp-thumb" aria-hidden="true" style="background-image:url('${artSrc(r.port)}')"></span>` : '';
  return '';
}
// jutalom jóváírása; kártya/hős esetén a megmutatandó lapot adja vissza
function grantRew(p, r, heroId) {
  if (r.coins) p.coins += r.coins;
  else if (r.packs) p.giftPacks = (p.giftPacks || 0) + r.packs;
  else if (r.shiny) p.shinyPacks = (p.shinyPacks || 0) + r.shiny;
  else if (r.fa) p.faPacks = (p.faPacks || 0) + r.fa;
  else if (r.card && r.had && ((p.coll[r.card]?.n || 0) + (p.coll[r.card]?.f || 0)) > 0) { p.coins += r.had; return { coinsInstead: r.had }; }   // már megvan (a 0. szezonból) → helyette coin
  else if (r.port) { if (!(p.portraits || []).includes(r.port)) p.portraits = [...(p.portraits || []), r.port]; p.heroSkin = { ...(p.heroSkin || {}), [PORTRAITS[r.port].hero]: r.port }; return { port: r.port }; }
  else if (r.goldPick) { const h = heroId || GOLD_HEROES[0]; p.heroGold = p.heroGold || {}; if (p.heroGold[h]) p.coins += ECON.goldDupe; else p.heroGold[h] = 1; p.heroSkin = { ...(p.heroSkin || {}), [h]: 'gold' }; return { goldHero: h }; }
  else if (r.card) { const e = p.coll[r.card] || (p.coll[r.card] = { n: 0, f: 0 }); e.f += CARD[r.card].variantOf ? 2 : 1; return { id: r.card, foil: true }; }   // változatból rögtön 2 (packból nem szerezhető, így kijön egy pakli)
  else if (r.heroPick) {
    const h = heroId || (HEROES.find(x => !(p.heroFa || {})[x.id]) || HEROES[0]).id;
    p.heroFa = p.heroFa || {}; p.heroFa[h] = (p.heroFa[h] || 0) + 1; return { hero: h, foil: true };
  }
  return null;
}
function ensurePass(p) {
  const s = curSeason();
  p.pass = p.pass || { season: null, xp: 0, claimed: [], extra: 0 };
  if (s && p.pass.season !== s.id) {
    const old = SEASONS.find(x => x.id === p.pass.season);
    if (old) { const lv = Math.min(old.tiers.length, passLevel(p.pass.xp));   // átvétlen jutalmak automatikusan
      for (let i = 0; i < lv; i++) if (!p.pass.claimed.includes(i)) grantRew(p, old.tiers[i]); }
    p.pass = { season: s.id, xp: 0, claimed: [], extra: 0 };
  }
  return p.pass;
}
function passClaimable(p) {
  const s = SEASONS.find(x => x.id === p.pass?.season); if (!s) return 0;
  const lv = passLevel(p.pass.xp), n = Math.min(s.tiers.length, lv);
  let c = 0; for (let i = 0; i < n; i++) if (!p.pass.claimed.includes(i)) c++;
  return c + Math.max(0, lv - s.tiers.length - (p.pass.extra || 0));
}
// meccs végén: XP jóváírás; visszaadja a kijelzéshez szükséges adatokat
function passOnMatch(result, quests) {
  const p = Store.p; if (!p) return null;
  const s = curSeason(); if (!s) return null;
  const P = ensurePass(p), before = passLevel(P.xp);
  let gain = PASS_XP[result] || 0;
  for (const q of quests) { if (q.ah) continue; gain += q.weekly ? PASS_XP.weekly : PASS_XP.daily; }   /* az Amsterdam-küldetés nem ad XP-t */
  P.xp += gain; save(); renderPassBadge();
  const lv = passLevel(P.xp);
  return { gain, lv, up: lv > before, inLv: P.xp % PASS_XP.perLevel };
}
function renderPassBadge() {
  const b = $('#passBadge'), sm = $('#passSub'); if (!b || !Store.p) return;
  const s = curSeason();
  if (!s) { b.textContent = '—'; if (sm) sm.textContent = 'A szezon véget ért'; return; }
  const P = ensurePass(Store.p), lv = passLevel(P.xp), c = passClaimable(Store.p);
  b.textContent = `${Math.min(lv, s.tiers.length)}. szint`; b.classList.toggle('hot', c > 0);
  const days = Math.ceil((s.end - new Date()) / 86400000);
  if (sm) sm.textContent = c > 0 ? `${c} átvehető jutalom!` : `${s.name.split(' · ')[0]} · még ${days} nap`;
}
function showPassReveal(got) {
  if (got.coinsInstead) { toast(`+${got.coinsInstead} coin`); return; }
  if (got.port || got.goldHero) {
    const hid = got.port ? PORTRAITS[got.port].hero : got.goldHero, h = HERO[hid];
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="modal sp-reveal"><h3>Season Pass jutalom</h3>${heroCardHTML(h, got.port ? { big: true, port: got.port } : { big: true, gold: true, foil: true })}
      <p class="live">${got.port ? `${PORTRAITS[got.port].name} – ${h.name} új portréja, mindig Full Artban. Rögtön ezt viseli – a Gyűjteményben a hősre koppintva visszaválthatsz.` : `Arany ${h.name}! Mostantól ezt viseli – a Gyűjteményben a hősre koppintva visszaválthatsz.`}</p><button class="btn primary" data-x>Szuper!</button></div>`;
    o.onclick = e => { if (e.target.closest('[data-x]')) o.remove(); };
    $('#layer').appendChild(o); renderMenuFan(); return;
  }
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal sp-reveal"><h3>Season Pass jutalom</h3>${pcHTML(got, { big: true, foil: true })}
    <p class="live">${pcName(got)} – ${!got.hero && CARD[got.id].variantOf ? 'különleges változat, Full Art – 2 példány' : 'Full Art'}. Bekerült a gyűjteményedbe.</p><button class="btn primary" data-x>Szuper!</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]')) o.remove(); };
  $('#layer').appendChild(o);
}
// Season Pass: minden átvett jutalom felfedéssel (2026-10-18, Tomi – „legyen meg a reward érzés”, mint a Halloween eventnél)
function passRevealData(r, got) {
  const big = (img, n, cap) => `<div class="spr-big"><img src="${img}" alt="">${n > 1 ? `<b class="spr-x">×${n}</b>` : ''}<em>${cap}</em></div>`;
  if (got && got.coinsInstead) return { inner: `<div class="spr-big"><span class="coin spr-coin"></span><em>+${got.coinsInstead} coin</em></div>`, label: '+ Coin!', name: `${got.coinsInstead} coin`, sub: 'Ez a lap már megvolt, ezért coint kaptál helyette.' };
  if (got && got.port) { const P = PORTRAITS[got.port], h = HERO[P.hero]; return { inner: heroCardHTML(h, { big: true, port: got.port }), label: 'Új skin!', name: P.name, sub: `${h.name} mostantól ezt viseli, mindig Full Artban – a Gyűjteményben a hősre koppintva visszaválthatsz.` }; }
  if (got && got.goldHero) { const h = HERO[got.goldHero]; return { inner: heroCardHTML(h, { big: true, gold: true, foil: true }), label: 'Arany hős!', name: `Arany ${h.name}`, sub: 'Mostantól ezt viseli – a Gyűjteményben a hősre koppintva visszaválthatsz.' }; }
  if (got && got.hero) { const h = HERO[got.hero]; return { inner: heroCardHTML(h, { big: true, foil: true }), label: 'Full Art hős!', name: h.name, sub: 'Bekerült a gyűjteményedbe.' }; }
  if (got && got.id) return { inner: cardHTML(got.id, { big: true, foil: true }), label: 'Új lap!', name: CARD[got.id].name, sub: `${CARD[got.id].variantOf ? 'Különleges változat, Full Art – 2 példány' : 'Full Art'} · bekerült a gyűjteményedbe` };
  if (r.coins) return { inner: `<div class="spr-big"><span class="coin spr-coin"></span><em>+${r.coins}</em></div>`, label: '+ Coin!', name: `${r.coins} coin`, sub: 'Jóváírtuk a coinjaid közé.' };
  if (r.packs) return { inner: big('art/ui/pack-base.webp', r.packs, ''), label: r.packs > 1 ? 'Új packok!' : 'Új pack!', name: `${r.packs} Base set booster`, sub: 'A Boltban, az ajándékok között bonthatod ki.' };
  if (r.shiny) return { inner: big('art/ui/pack-shiny.webp', r.shiny, ''), label: 'Shiny pack!', name: `${r.shiny} Shiny pack`, sub: 'A Boltban, az ajándékok között bonthatod ki.' };
  if (r.fa) return { inner: `<div class="spr-fa">${big('art/ui/pack-base.webp', r.fa, '')}</div>`, label: 'Full Art pack!', name: `${r.fa} Full Art pack`, sub: 'Minden lapja Full Art – a Boltban bonthatod ki.' };
  return null;
}
function passReveal(r, got) {
  const d = passRevealData(r, got); if (!d) { toast(`+${rewLabel(r)}`); return Promise.resolve(); }
  if (got && (got.port || got.goldHero)) renderMenuFan();
  return rewardRevealShow({ theme: 'sp', myst: `<img class="spr-myst" src="${(BACKS[myBack()] || BACKS.base).src}" alt="Rejtett jutalom">`, ...d });
}
function claimTier(i) {
  const p = Store.p, s = curSeason() || SEASONS.find(x => x.id === p.pass?.season); if (!s) return;
  const P = p.pass; if (P.claimed.includes(i) || passLevel(P.xp) < i + 1) return;
  const r = s.tiers[i];
  const finish = hero => {
    const got = grantRew(p, r, hero); P.claimed.push(i); save(); renderPass(); renderProfileBar();
    passReveal(r, got);
  };
  if (r.heroPick) pickHero(null, finish, 'Válaszd ki a Full Art hősödet', 'Ennek a hősnek a Full Art változatát kapod meg. A már meglévőket ✨ jelzi.');
  else if (r.goldPick) pickHero(null, finish, 'Válaszd ki az Arany hősödet', 'Ennek a hősnek az Arany változatát kapod meg (ha már megvan, helyette coint).');
  else finish();
}
function claimAll() {
  const p = Store.p, s = SEASONS.find(x => x.id === p.pass?.season); if (!s) return;
  const P = p.pass, lv = passLevel(P.xp); let n = 0, hero = -1, shown = null;
  for (let i = 0; i < Math.min(lv, s.tiers.length); i++) {
    if (P.claimed.includes(i)) continue;
    if (s.tiers[i].heroPick || s.tiers[i].goldPick) { hero = i; continue; }   // a hőst külön kell kiválasztani
    const got = grantRew(p, s.tiers[i]); P.claimed.push(i); n++; shown = shown || []; shown.push([s.tiers[i], got]);
  }
  const ex = Math.max(0, lv - s.tiers.length - (P.extra || 0));
  if (ex) { p.giftPacks = (p.giftPacks || 0) + ex; P.extra = (P.extra || 0) + ex; n += ex; }
  save(); renderPass(); renderProfileBar();
  (async () => {   /* egyenként felfedjük őket (max. 6, a többi egy összesítőben) */
    const L = shown || [];
    for (const [r, got] of L.slice(0, 6)) await passReveal(r, got);
    if (L.length > 6) toast(`+ még ${L.length - 6} jutalom: ${L.slice(6).map(([r, g]) => g && g.coinsInstead ? `${g.coinsInstead} coin` : rewLabel(r)).join(', ')}`);
    if (ex) toast(`+${ex} ajándék pack (a 30. szint fölött)`);
    if (hero >= 0) setTimeout(() => claimTier(hero), 300);
  })();
}
function renderPass() {
  const p = Store.p; if (!p) return;
  const s = curSeason(), P = ensurePass(p), S1 = s || SEASONS.find(x => x.id === P.season);
  const body = $('#passBody');
  if (!S1) { body.innerHTML = '<p class="q-note">Jelenleg nincs futó szezon. Hamarosan jön a következő!</p>'; return; }
  const lv = passLevel(P.xp), max = S1.tiers.length, inLv = P.xp % PASS_XP.perLevel, c = passClaimable(p);
  const days = s ? Math.max(0, Math.ceil((s.end - new Date()) / 86400000)) : 0;
  const done = lv >= max;
  const row = (r, i) => {
    const st = P.claimed.includes(i) ? 'claimed' : lv >= i + 1 ? 'ready' : 'locked';
    const big = r.shiny || r.fa || r.card || r.heroPick || r.goldPick || r.port;
    return `<div class="sp-row ${st}${big ? ' big' : ''}${i === lv ? ' cur' : ''}" data-i="${i}">
      <div class="sp-lv"><b>${i + 1}</b></div>
      <div class="sp-ic">${rewIcon(r)}</div>
      <div class="sp-name"><b>${rewLabel(r)}</b>${r.heroPick || r.goldPick ? '<small>Te választod ki, melyik hős legyen</small>' : r.port ? '<small>Csak a Season Passból · mindig Full Art</small>' : r.card ? `<small>${CARD[r.card].passOnly ? 'Csak Full Art, csak a Season Passból' : `${RAR[CARD[r.card].rarity]}, garantált Full Art`}</small>` : ''}</div>
      <div class="sp-act">${st === 'claimed' ? '<span class="q-ok">✓</span>' : st === 'ready' ? `<button class="btn primary sp-claim" data-c="${i}">Átvesz</button>` : '<span class="sp-lock" aria-label="Zárolva">🔒</span>'}</div>
    </div>`;
  };
  const extraReady = Math.max(0, lv - max - (P.extra || 0));
  body.innerHTML = `
    <div class="sp-head orn">
      <div class="sp-title"><b>${S1.name}</b><small>${s ? `Még ${days} nap · ingyenes, mindenkinek` : 'A szezon véget ért'}</small></div>
      <div class="sp-level"><span class="sp-num">${Math.min(lv, max)}</span><small>/ ${max}. szint</small></div>
      <div class="q-bar sp-bar"><i style="width:${done && !s ? 100 : inLv / PASS_XP.perLevel * 100}%"></i><span>${inLv} / ${PASS_XP.perLevel} XP${done ? ' · ráadás' : ''}</span></div>
      ${c > 0 ? `<button class="btn primary sp-all" id="passAll">Mind átveszem (${c})</button>` : ''}
    </div>
    <div class="sp-list">${S1.tiers.map(row).join('')}
      <div class="sp-row extra${extraReady ? ' ready' : ''}"><div class="sp-lv"><b>30+</b></div><div class="sp-ic"><span class="q-pack" aria-hidden="true"></span></div>
        <div class="sp-name"><b>Ráadás: 1 Base pack</b><small>A 30. szint után minden ${PASS_XP.perLevel} XP-ért${P.extra ? ` · eddig ${P.extra} db` : ''}</small></div>
        <div class="sp-act">${extraReady ? `<button class="btn primary sp-claim" data-c="x">Átvesz${extraReady > 1 ? ` (${extraReady})` : ''}</button>` : ''}</div></div>
    </div>
    <p class="q-note"><b>XP-t így kapsz:</b> győzelem ${PASS_XP.win}, döntetlen ${PASS_XP.draw}, vereség ${PASS_XP.loss} · teljesített napi küldetés ${PASS_XP.daily} · heti küldetés ${PASS_XP.weekly}. A packokat a Boosterek menüben bonthatod ki. Ha valamit nem veszel át a szezon végéig, a következő szezon indulásakor automatikusan megkapod.</p>`;
  body.onclick = e => { const b = e.target.closest('[data-c]'); if (b) { b.dataset.c === 'x' ? claimAll() : claimTier(+b.dataset.c); return; }
    if (e.target.closest('#passAll')) claimAll(); };
  const cur = body.querySelector('.sp-row.ready:not(.claimed)') || body.querySelector('.sp-row.cur');
  if (cur) requestAnimationFrame(() => cur.scrollIntoView({ block: 'center' }));
  renderPassBadge();
}
$('#goPass').onclick = () => { if (needProfile()) return; renderPass(); show('scr-pass'); };

// ---- időszakos eventek (2026-10-15: első a Halloween) ----
// Egy event = kezdet/vég + pontcsík (goal) + napi és egyszeri event-küldetések + jutalmak pontküszöbökön.
// A jutalmakat kézzel kell átvenni („Átvesz”); a vége után még claimUntil-ig átvehetők, utána ami elérve, de átvétlen, magától jóváíródik.
// Tesztelés élesítés előtt: …/?ev=test (csak az adott telefonon látszik), kikapcsolás: ?ev=off
try { const q = new URLSearchParams(location.search); if (q.has('ev')) { localStorage.setItem('bou_evtest', q.get('ev') === 'off' ? '' : '1'); history.replaceState(null, '', location.pathname + location.hash); } } catch (e) {}
const evTest = () => { try { return localStorage.getItem('bou_evtest') === '1'; } catch { return false; } };
const EVENTS = [
  // draft: true → csak teszt módban látszik (?ev=test). Élesítve: 2026-10-15 19:00 (Tomi)
  { id: 'hw26', name: 'Halloween', icon: '🎃', theme: 'hw', music: 'art/snd/halloween.m4a', img: { btn: 'art/ui/ev-hw-btn.webp', banner: 'art/ui/ev-hw-banner.webp', pt: 'art/ui/ev-pumpkin.webp' }, teaser: new Date(2026, 9, 15, 0, 0), start: new Date(2026, 9, 15, 19, 0), end: new Date(2026, 10, 3, 0, 0), claimUntil: new Date(2026, 10, 10, 0, 0), goal: 100,
    sub: 'Gyűjts tökpontokat, és vidd haza a Halloween skineket és lapokat!',
    pts: 'tökpont',
    daily: [
      { id: 'd_play2', goal: 2, pts: 5, txt: 'Játssz le 2 meccset', f: m => 1 },
      { id: 'd_win1',  goal: 1, pts: 5, txt: 'Nyerj 1 meccset', f: m => m.win ? 1 : 0 },
      { id: 'd_kill5', goal: 5, pts: 5, txt: 'Pusztíts el 5 ellenséges karaktert', f: m => m.kills },
    ],
    quests: [
      { id: 'q_win5', goal: 5,   pts: 10, txt: 'Nyerj 5 meccset', f: m => m.win ? 1 : 0 },
      { id: 'q_hard', goal: 1,   pts: 10, txt: 'Nyerj a Nehéz bot ellen (rankedben Aranytól is számít)', f: m => m.win && (m.lv || 0) >= 3 ? 1 : 0 },
      { id: 'q_rk2',  goal: 2,   pts: 5,  txt: 'Nyerj 2 ranked meccset', f: m => m.win && m.ranked ? 1 : 0 },
      { id: 'q_pvp',  goal: 1,   pts: 5,  txt: 'Játssz egy PvP meccset egy barátod ellen', f: m => m.pvp ? 1 : 0 },
      { id: 'q_dmg',  goal: 100, pts: 10, txt: 'Okozz összesen 100 sebzést az ellenfél hősének', f: m => m.heroDmg },
    ],
    // a jutalmak: Tomi küldi (5 skin + 3 új lap); amíg nincs meg, „?” helykitöltő
    rewards: [
      // a 3 új lap korán jár (befolyásolja a játékot), a skinek és a hátlap később (Tomi kérése, 2026-10-15)
      { at: 10, card: 'a_alarc', foil: true }, { at: 20, card: 'a_polaroid', foil: true }, { at: 30, card: 'a_hwparty', foil: true }, { at: 40, back: 'halloween' }, { at: 50, port: 'p_gabi_hw' },
      { at: 60, port: 'p_david_hw' }, { at: 75, port: 'p_bence_hw' }, { at: 90, port: 'p_tomi_hw' }, { at: 100, port: 'p_laci_hw' },
    ] },
];
// a futó (vagy még átvehető) event; teszt módban a még el nem indult is látszik
function curEvent(d = new Date()) {
  return EVENTS.find(e => !e.draft && d >= (e.teaser || e.start) && d < (e.claimUntil || e.end)) || (evTest() ? EVENTS.find(e => d < (e.claimUntil || e.end)) : null) || null;
}
const evPre = (e, d = new Date()) => !!e && d < e.start && !evTest();   // előzetes: a gomb szürke, pont még nem jár
const evMood = (e, d = new Date()) => !!e && !e.draft && d < e.end && d >= (e.teaser || e.start) || (!!e && evTest() && d < e.end);   // háttér + zene
const evLive = (e, d = new Date()) => !!e && d < e.end && ((d >= e.start && !e.draft) || evTest());
function ensureEv(p) {
  const e = curEvent(); p.evs = p.evs || {};
  // lejárt eventek elért, de át nem vett jutalmai magától
  for (const old of EVENTS) { const st = p.evs[old.id]; if (!st || st.closed || new Date() < (old.claimUntil || old.end)) continue;
    for (const [i, r] of old.rewards.entries()) if (st.pts >= r.at && !st.claimed.includes(i) && !r.tbd) evGrant(p, r);
    st.closed = true; p._dirty = true; }
  if (!e) return null;
  const st = p.evs[e.id] || (p.evs[e.id] = { pts: 0, day: '', daily: {}, q: {}, claimed: [] });
  if (st.day !== today()) { st.day = today(); st.daily = {}; }
  return st;
}
function evGrant(p, r) {
  if (r.back) { if (!(p.backs || []).includes(r.back)) p.backs = [...(p.backs || []), r.back]; p.cardBack = r.back; try { applyBack(); } catch (e) {} return { back: r.back }; }
  if (r.port) { if (!(p.portraits || []).includes(r.port)) p.portraits = [...(p.portraits || []), r.port]; p.heroSkin = { ...(p.heroSkin || {}), [PORTRAITS[r.port].hero]: r.port }; return { port: r.port }; }
  if (r.card) { const e = p.coll[r.card] || (p.coll[r.card] = { n: 0, f: 0 }); const n = r.n || (CARD[r.card].rarity === 'l' ? 1 : 2); if (r.foil) e.f += n; else e.n += n; return { id: r.card, foil: !!r.foil, n }; }
  return grantRew(p, r);
}
// meccs végén: event-pontok; visszaadja a teljesített event-küldetéseket
function eventOnMatch(m) {
  const p = Store.p; if (!p) return null; const e = curEvent(); if (!evLive(e)) return null;
  const st = ensureEv(p), got = []; let gain = 0;
  const step = (d, rec, key) => { const q = rec[key] || (rec[key] = { prog: 0, done: false }); if (q.done) return;
    q.prog = Math.min(d.goal, q.prog + (d.f(m) || 0));
    if (q.prog >= d.goal) { q.done = true; gain += d.pts; got.push({ txt: d.txt, pts: d.pts }); } };
  for (const d of e.daily) step(d, st.daily, d.id);
  for (const d of e.quests) step(d, st.q, d.id);
  const before = st.pts; st.pts = Math.min(e.goal, st.pts + gain);
  save(); renderEventTile();
  return { e, got, gain: st.pts - before, pts: st.pts, newRew: e.rewards.filter(r => before < r.at && st.pts >= r.at).length };
}
function evResultHTML(r) {
  if (!r || !r.got.length) return '';
  return `<div class="ev-pop">${r.e.img ? `<img src="${r.e.img.pt}" alt="" aria-hidden="true">` : r.e.icon} <b>+${r.gain} ${r.e.pts}</b> · ${r.pts}/${r.e.goal}${r.newRew ? ` · <em>Új jutalom vár!</em>` : ''}<small>${r.got.map(g => `✓ ${g.txt}`).join(' · ')}</small></div>`;
}
function evClaimable(p, e) { const st = p.evs?.[e.id]; if (!st) return 0; return e.rewards.filter((r, i) => st.pts >= r.at && !st.claimed.includes(i) && !r.tbd).length; }
function renderEventTile() {
  const t = $('#goEvent'); if (!t) return;
  const p = Store.p, e = curEvent();
  document.body.classList.toggle('ev-hw', !!(e && evMood(e) && e.theme === 'hw'));   // eseményes menü-háttér (már az előzetes alatt is)
  try { Music.sync(); } catch (err) {}
  t.hidden = !p || !e || p.onboard; if (t.hidden) return;
  const st = ensureEv(p), c = evClaimable(p, e), now = new Date();
  t.dataset.theme = e.theme || ''; t.setAttribute('aria-label', `${e.name} event – ${st.pts}/${e.goal} pont`);
  if (e.img) $('#evImg').src = e.img.btn;
  const left = e.end - now, d = Math.floor(left / 864e5), h = Math.floor(left % 864e5 / 36e5);
  const tag = $('#evSub');
  const pre = evPre(e, now); t.classList.toggle('ev-pre', pre);
  tag.textContent = pre ? `${now.toDateString() === e.start.toDateString() ? 'Ma' : huDay(e.start)} ${e.start.getHours()}:${String(e.start.getMinutes()).padStart(2, '0')}-kor indul` : now < e.start || e.draft ? 'Teszt mód' : now >= e.end ? (c ? 'Vedd át a jutalmakat!' : 'Véget ért') : c ? `${c} jutalom vár!` : `Még ${d ? `${d} nap` : `${h} óra`}`;
  tag.classList.toggle('hot', c > 0);
  $('#evBadge').innerHTML = `<span>${st.pts}<small>/${e.goal}</small></span>`; $('#evBadge').classList.toggle('hot', c > 0);
}
// jutalom-felfedő képernyő (Laci kérése, 2026-10-16): a „?” lap megremeg, villan, és előtűnik a skin / lap / hátlap
async function evRewardReveal(e, got) {
  let inner, label, name, sub;
  if (got.port) { const P = PORTRAITS[got.port], h = HERO[P.hero]; inner = heroCardHTML(h, { big: true, port: got.port }); label = 'Új skin!'; name = P.name; sub = `${h.name} mostantól ezt viseli – a Gyűjteményben a hősre koppintva visszaválthatsz.`; }
  else if (got.id) { inner = cardHTML(got.id, { big: true, foil: got.foil }); label = 'Új lap!'; name = CARD[got.id].name; sub = `${RAR[CARD[got.id].rarity]}${got.foil ? ' · Full Art' : ''} · ${got.n} példány bekerült a gyűjteményedbe`; }
  else if (got.back) { const b = BACKS[got.back]; inner = `<img class="evr-back" src="${b.src}" alt="${b.name} hátlap">`; label = 'Új hátlap!'; name = `${b.name} hátlap`; sub = 'Már ezt használod – az ellenfeleid is ezt látják. A Gyűjteményben a 🃏 Hátlap gombbal válthatsz.'; }
  else { evShowGot(got, e); return; }
  if (got.port) renderMenuFan();
  return rewardRevealShow({ theme: 'hw', myst: '<img class="evr-myst" src="art/ui/ev-hw-myst.webp" alt="Rejtett jutalom">', inner, label, name, sub });
}
// közös jutalom-felfedés (Halloween event, Season Pass): rejtett lap → rázkódás → villanás + szikrák → a jutalom
async function rewardRevealShow({ theme, myst, inner, label, name, sub }) {
  const o = document.createElement('div'); o.className = `overlay opening ev-reveal rr-${theme}`;
  o.innerHTML = `<div class="rare-show ${theme}"><div class="rare-rays big ${theme}"></div><div class="rare-card">${myst}</div>
    <div class="rare-banner" hidden>${label}</div><div class="rare-name" hidden>${escH(name)}</div><div class="var-sub" hidden>${sub}</div><div class="op-hint">Koppints a felfedéshez</div></div>`;
  $('#layer').appendChild(o);
  const show = o.querySelector('.rare-show'), card = o.querySelector('.rare-card'), hint = o.querySelector('.op-hint');
  show.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' });
  card.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], { duration: 1400, iterations: Infinity, easing: 'ease-in-out' });
  const tap = () => new Promise(res => o.addEventListener('click', ev => { ev.stopPropagation(); res(); }, { once: true }));
  await Promise.race([tap(), sleep(2200)]);
  hint.textContent = '';
  card.getAnimations().forEach(a => a.cancel());
  await card.animate([0, -3, 3, -5, 5, -7, 7, 0].map((x, k) => ({ transform: `translate(${x}px,${k % 2 ? 1 : -1}px) scale(${1 + k * 0.02})` })), { duration: 800, easing: 'ease-in' }).finished;
  const r = card.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const flash = document.createElement('div'); flash.className = 'rare-flash ' + theme; o.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: .7, offset: .15 }, { opacity: 0 }], { duration: 900, fill: 'forwards' }).finished.then(() => flash.remove());
  const cols = theme === 'sp' ? ['#ffd34d', '#ffe9a8', '#5fd0ff', '#ffffff', '#f5b400'] : ['#ffb347', '#ff7a00', '#c77dff', '#ffe08a', '#ffffff'];
  for (let k = 0; k < 44; k++) {
    const sp = document.createElement('i'); sp.className = 'rare-spark';
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 170, sz = 4 + Math.random() * 7;
    sp.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;background:${cols[k % cols.length]};box-shadow:0 0 ${sz * 2}px ${cols[k % cols.length]}`;
    o.appendChild(sp);
    sp.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }],
               { duration: 700 + Math.random() * 600, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' }).finished.then(() => sp.remove());
  }
  card.innerHTML = inner;
  card.animate([{ transform: 'scale(.55) rotateY(-180deg)', opacity: .4 }, { transform: 'scale(1.08) rotateY(0deg)', opacity: 1, offset: .7 }, { transform: 'none' }], { duration: 800, easing: 'cubic-bezier(.2,.8,.3,1)' });
  ['.rare-banner', '.rare-name', '.var-sub'].forEach(q => { const el = o.querySelector(q); el.hidden = false; });
  o.querySelector('.rare-banner').animate([{ transform: 'scale(2.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, delay: 450, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'backwards' });
  await sleep(700); hint.textContent = 'Koppints a folytatáshoz';
  await tap();
  await show.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished;
  o.remove();
}
function evShowGot(got, e) {
  if (!got) return;
  if (got.back) { const b = BACKS[got.back], o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="modal acct-box bk-new"><h3>${e.icon} Új hátlap: ${b.name}</h3><img src="${b.src}" alt="${b.name} hátlap" style="width:min(60vw,240px);border-radius:12px;display:block;margin:6px auto 10px;box-shadow:0 0 24px rgba(255,140,30,.5)">
      <p class="live">Már ezt használod – az ellenfeleid is ezt látják. A Gyűjteményben a 🃏 Hátlap gombbal bármikor válthatsz.</p><button class="btn primary" data-x>Szuper!</button></div>`;
    o.onclick = ev => { if (ev.target.closest('[data-x]')) o.remove(); }; $('#layer').appendChild(o); return; }
  if (got.port) { const h = HERO[PORTRAITS[got.port].hero];
    openModal(heroCardHTML(h, { big: true, port: got.port }), `${e.icon} ${PORTRAITS[got.port].name} – ${h.name} új skinje, mindig Full Artban. Rögtön ezt viseli – a Gyűjteményben a hősre koppintva visszaválthatsz.`, ''); renderMenuFan(); return; }
  if (got.id) { openModal(cardHTML(got.id, { big: true, foil: got.foil }), `${e.icon} ${CARD[got.id].name} – ${got.n} példány bekerült a gyűjteményedbe.`, cardHelpHTML(got.id)); return; }
  showPassReveal(got);
}
function evClaim(i) {
  const p = Store.p, e = curEvent(); if (!e) return; const st = ensureEv(p), r = e.rewards[i];
  if (!r || r.tbd || st.claimed.includes(i) || st.pts < r.at) return;
  const got = evGrant(p, r); st.claimed.push(i); save(); renderEvent(); renderProfileBar();
  if (got) evRewardReveal(e, got); else toast(`+${rewLabel(r)}`);
}
// jutalom megtekintése (a lap mit tud, a skin hogy néz ki)
const huDay = d => `${['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'][d.getMonth()]} ${d.getDate()}`;
function evPreview(r, reached) {
  if (!r || r.tbd) return toast('Hamarosan kiderül…');
  const when = `${reached ? 'Elérted' : 'Megszerezheted'}: ${r.at} tökpont`;
  if (r.card) return openModal(cardHTML(r.card, { big: true, foil: r.foil }), `${when} · ${r.foil ? 'Full Art, ' : ''}${CARD[r.card].rarity === 'l' ? '1 példány' : '2 példány'}`, cardHelpHTML(r.card));
  if (r.port) { const P = PORTRAITS[r.port]; return openModal(heroCardHTML(HERO[P.hero], { big: true, port: r.port }), `${P.name} – ${HERO[P.hero].name} Halloween skinje, mindig Full Art · ${when}`, ''); }
  if (r.back) { const b = BACKS[r.back], o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="modal acct-box"><h3>${b.name} hátlap</h3><img src="${b.src}" alt="${b.name} hátlap" style="width:min(60vw,240px);border-radius:12px;display:block;margin:6px auto 10px;box-shadow:0 0 24px rgba(255,140,30,.5)"><p class="live">A pakli hátoldala – az ellenfeleid is ezt látják. ${when}.</p><button class="btn primary" data-x>Rendben</button></div>`;
    o.onclick = ev => { if (ev.target.closest('[data-x]') || ev.target === o) o.remove(); }; $('#layer').appendChild(o); return; }
}
function evRewLabel(r) { if (r.tbd) return r.tbd; if (r.back) return `${BACKS[r.back].name} hátlap`; if (r.port) return PORTRAITS[r.port].name; if (r.card) return CARD[r.card].name; return rewLabel(r); }
function evRewIcon(r) {
  if (r.tbd) return '<span class="ev-myst" aria-hidden="true"></span>';
  if (r.back) return `<span class="ev-back" aria-hidden="true" style="background-image:url('${BACKS[r.back].sm}')"></span>`;
  if (r.card) return ART[r.card] ? `<span class="sp-thumb" aria-hidden="true" style="background-image:url('${artSrc(r.card)}')"></span>` : '<span class="sp-mystery" aria-hidden="true"><b>★</b></span>';
  return rewIcon(r);
}
function renderEvent() {
  const p = Store.p, e = curEvent(), body = $('#evBody'); if (!p || !body) return;
  if (!e) { body.innerHTML = '<p class="q-note">Most nincs futó event. Figyeld a főmenüt!</p>'; return; }
  const st = ensureEv(p), now = new Date(), live = evLive(e), c = evClaimable(p, e);
  const left = e.end - now, d = Math.floor(left / 864e5), h = Math.floor(left % 864e5 / 36e5);
  const pct = st.pts / e.goal * 100;
  const marks = e.rewards.map((r, i) => `<span class="ev-mark${st.pts >= r.at ? ' on' : ''}${st.claimed.includes(i) ? ' got' : ''}" style="left:${r.at / e.goal * 100}%"><i></i><b>${r.at}</b></span>`).join('');
  const qrow = (d, q) => { q = q || { prog: 0, done: false };
    return `<div class="q-row ev-q${q.done ? ' done' : ''}"><div class="q-main"><b>${d.txt}</b><div class="q-bar"><i style="width:${q.prog / d.goal * 100}%"></i><span>${q.prog}/${d.goal}</span></div></div>
      <div class="q-rew">${q.done ? '<span class="q-ok">✓</span>' : `<em class="ev-pts">+${d.pts}<img src="${e.img.pt}" alt="tökpont"></em>`}</div></div>`; };
  const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), hl = Math.floor((mid - now) / 36e5), ml = Math.floor((mid - now) % 36e5 / 6e4);
  const rrow = (r, i) => { const stt = st.claimed.includes(i) ? 'claimed' : st.pts >= r.at && !r.tbd ? 'ready' : 'locked';
    return `<div class="sp-row ev-row big ${stt}" data-ev="${i}" role="button" tabindex="0" aria-label="${escH(evRewLabel(r))} – megnézem"><div class="sp-lv ev-at"><b>${r.at}</b></div><div class="sp-ic">${evRewIcon(r)}</div>
      <div class="sp-name"><b>${evRewLabel(r)}</b><small>${r.tbd ? 'Hamarosan kiderül…' : r.back ? 'Csak ebből az eventből · az ellenfeleid is látják' : r.port ? `${HERO[PORTRAITS[r.port].hero].name} skin · csak ebből az eventből` : r.card ? `Új lap · ${RAR[CARD[r.card].rarity]} · csak ebből az eventből` : ''}</small></div>
      <div class="sp-act">${stt === 'claimed' ? '<span class="q-ok">✓</span>' : stt === 'ready' ? `<button class="btn primary sp-claim" data-ec="${i}">Átvesz</button>` : '<span class="sp-lock" aria-label="Zárolva">🔒</span>'}</div></div>`; };
  body.dataset.theme = e.theme || ''; $('#scr-event h2').textContent = `${e.name} event`;
  body.innerHTML = `
    <div class="ev-head">
      <div class="ev-ban"><img src="${e.img.banner}" alt="${e.name}"><div class="ev-when">${now < e.start || e.draft ? 'Teszt mód<br><small>a játékosok még nem látják</small>' : live ? `Még ${d ? `${d} nap ${h} óra` : `${h} óra`}<br><small>${huDay(new Date(e.end - 1))}-ig tart</small>` : `Véget ért<br><small>a jutalmak ${huDay(new Date(e.claimUntil - 1))}-ig átvehetők</small>`}</div></div>
      <p class="ev-sub">${e.sub}</p>
      <div class="ev-score"><img src="${e.img.pt}" alt="" aria-hidden="true"><span class="ev-num">${st.pts}</span><small>/ ${e.goal} ${e.pts}</small></div>
      <div class="ev-track"><div class="ev-in"><div class="ev-fill" style="clip-path:inset(0 ${100 - pct}% 0 0 round 999px)"></div>${marks}</div></div>
      ${c > 1 ? `<button class="btn primary sp-all" id="evAll">Mind átveszem (${c})</button>` : ''}
    </div>
    <div class="lbl">Napi event-küldetések <small>· újak ${hl} óra ${ml} perc múlva</small></div>
    ${e.daily.map(d => qrow(d, st.daily[d.id])).join('')}
    <div class="lbl">Event-kihívások <small>· egyszer teljesíthetők</small></div>
    ${e.quests.map(d => qrow(d, st.q[d.id])).join('')}
    <div class="lbl">Jutalmak <small>· koppints rájuk a részletekhez</small></div>
    <div class="sp-list ev-list">${e.rewards.map(rrow).join('')}</div>
    <p class="q-note">A ${e.pts} meccs végén számít (bot, ranked és PvP meccsen is). ${e.goal} ponttal minden jutalom a tiéd. Ha az event végéig valamit nem veszel át, az még egy hétig itt vár, utána magától jóváíródik.</p>`;
  body.onclick = ev => { const b = ev.target.closest('[data-ec]'); if (b) return evClaim(+b.dataset.ec);
    const rv = ev.target.closest('[data-ev]'); if (rv) return evPreview(e.rewards[+rv.dataset.ev], st.pts >= e.rewards[+rv.dataset.ev].at);
    if (ev.target.closest('#evAll')) { const gots = [];
      e.rewards.forEach((r, i) => { if (st.pts >= r.at && !st.claimed.includes(i) && !r.tbd) { const g = evGrant(p, r); st.claimed.push(i); if (g) gots.push(g); } });
      save(); renderEvent(); renderProfileBar(); renderMenuFan();
      (async () => { for (const g of gots) await evRewardReveal(e, g); })(); } };
  renderEventTile();
}
// ---- event-zene (2026-10-15): csak a menükben szól, meccs közben nem; az első koppintás indítja (iPhone) ----
const Music = { el: null, src: null, ctx: null, gain: null,
  VOL: { menu: 1, game: 0.45 },   // meccs közben halkabban (Tomi, 2026-10-15)
  pref() { try { return localStorage.getItem('bou_music') !== '0'; } catch { return true; } },
  set(v) { try { localStorage.setItem('bou_music', v ? '1' : '0'); } catch {} this.sync(); },
  want() { const e = curEvent(); return e && e.music && evMood(e) ? e.music : null; },
  sync() {
    const src = this.want(), btn = $('#musicBtn'), sep = $('#musicSep');
    if (btn) { btn.hidden = !src; btn.textContent = this.pref() ? '🔊 Zene' : '🔇 Zene'; } if (sep) sep.hidden = !src;
    const on = src && this.pref() && !document.hidden;
    if (!on) { if (this.el && !this.el.paused) this.el.pause(); return; }
    if (!this.el || this.src !== src) {
      if (this.el) this.el.pause();
      this.el = new Audio(src); this.el.loop = true; this.el.preload = 'auto'; this.src = src;
      /* iPhone-on az <audio> hangereje kódból nem állítható, ezért Web Audio erősítőn (GainNode) át megy */
      try { const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { this.ctx = this.ctx || new AC(); const n = this.ctx.createMediaElementSource(this.el); this.gain = this.ctx.createGain(); n.connect(this.gain); this.gain.connect(this.ctx.destination); }
      } catch (e) { this.gain = null; }
    }
    const vol = document.body.classList.contains('in-game') ? this.VOL.game : this.VOL.menu;
    if (this.gain && this.ctx) { try { this.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.35); } catch (e) { this.gain.gain.value = vol; }
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }
    else this.el.volume = vol;
    if (this.el.paused) this.el.play().catch(() => {});   /* ha a böngésző még nem engedi, a következő koppintás elindítja */
  } };
document.addEventListener('pointerdown', () => { try { Music.sync(); } catch (e) {} }, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { try { Music.sync(); } catch (e) {} });
{ const _sh = show; show = function (id) { _sh(id); try { Music.sync(); } catch (e) {} }; }
$('#musicBtn').onclick = () => { Music.set(!Music.pref()); toast(Music.pref() ? '🔊 Zene bekapcsolva' : '🔇 Zene kikapcsolva'); };
$('#goEvent').onclick = () => { if (needProfile()) return; const e = curEvent();
  if (evPre(e)) return evTeaserModal(e, false);
  renderEvent(); show('scr-event'); };
const evStartTxt = e => `${huDay(e.start)}-én ${e.start.getHours()}:${String(e.start.getMinutes()).padStart(2, '0')}-tól`;
// előzetes ablak: a szürke gombra koppintva, illetve az indulás előtti ajándéknál
function evTeaserModal(e, gift) {
  const o = document.createElement('div'); o.className = 'overlay';
  const started = new Date() >= e.start;
  o.innerHTML = `<div class="modal acct-box ev-teaser"><img class="evt-ban" src="${e.img.banner}" alt="${e.name}">
    <h3>${started ? `${e.icon} Elindult a ${e.name} event!` : `${e.icon} A ${e.name} event ${evStartTxt(e)} indul!`}</h3>
    <p class="live">Gyűjts tökpontokat napi küldetésekkel és kihívásokkal: <b>3 új lap</b>, a <b>Halloween hátlap</b> és <b>5 Halloween skin</b> vár rád.</p>
    ${gift ? `<p class="evt-gift"><span class="q-pack shiny" aria-hidden="true"></span><span>${started ? 'Az indulás' : 'Az event'} örömére ajándékba kapsz <b>1 Shiny boostert</b> – már a Boltban vár!</span></p>
    <button class="btn primary" data-open>Kinyitom most</button><button class="btn ghost" data-x>Később</button>` : '<button class="btn primary" data-x>Rendben</button>'}</div>`;
  o.onclick = ev => { if (ev.target.closest('[data-open]')) { o.remove(); buyPack('base', 'shinyGift'); return; }
    if (ev.target.closest('[data-x]') || ev.target === o) { o.remove(); renderProfileBar(); setTimeout(() => { try { chestPopup(); } catch (er) {} }, 200); } };
  $('#layer').appendChild(o);
}
// egyszeri ajándék az event előzetesekor / alatt: 1 Shiny pack (Tomi, 2026-10-15)
/* Amszterdam hősei (2026-10-18): előzetes naponta egyszer a megjelenésig, utána egyszeri „megérkezett” ablak */
/* Amsterdam Hősei megjelenés (2026-10-19 19:00, Tomi): mindenki kap 3 ingyen Amsterdam boostert, profilonként egyszer */
const AH_LAUNCH_PACKS = 3;
function ahLaunchGift() {
  const p = Store.p; if (!p || p.onboard || !setLive('ah') || TEST_MODE) return;
  p.gifts = p.gifts || []; if (p.gifts.includes('ah-launch-packs')) return;
  p.gifts.push('ah-launch-packs'); p.ahPacks = (p.ahPacks || 0) + AH_LAUNCH_PACKS; p._dirty = true; save();
}
function ahNewsCheck() {
  const p = Store.p; if (!p || p.onboard || TEST_MODE || (typeof S !== 'undefined' && S) || $('#layer .overlay') || $('#scr-menu').hidden) return false;
  const live = setLive('ah'), key = live ? 'ah-launch' : 'ah-teaser-' + today();
  p.news = p.news || []; if (p.news.includes(key)) return false;
  if (live && Date.now() > SET_RELEASE.ah + 7 * 864e5) return false;   /* egy hét után már nem jelenik meg */
  p.news.push(key); save();
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box ah-news">
    <p class="ah-news-t">${live ? 'Megérkezett a Best of Us TCG első tematikus miniszettje: az „Amsterdam Hősei”!' : `A Best of Us TCG első tematikus miniszettje, az „Amsterdam Hősei” ${new Date(SET_RELEASE.ah).toDateString() === new Date().toDateString() ? 'ma' : 'hétfőn'} érkezik 19:00 órakor!`}</p>
    <div class="ah-news-packs"><img src="art/ui/pack-ah.webp" alt="Amsterdam Hősei booster"><img src="art/ui/pack-ahshiny.webp" alt="Amsterdam Hősei Shiny booster"></div>
    ${live ? `<p class="live">🎁 <b>Ajándékba kaptál ${AH_LAUNCH_PACKS} Amsterdam boostert</b> – a Boltban bonthatod ki! 26 új lap, két új képesség (Igézhetetlen, Feltámadás), saját booster a Boltban – és minden hősnek egy Amsterdam kölcsönpakli, amit ${LOAN_MAX} meccsig kipróbálhatsz.</p><button class="btn primary" data-shop>Irány a Bolt</button><button class="btn ghost" data-x>Később</button>` : '<button class="btn primary" data-x>Alig várom!</button>'}</div>`;
  o.onclick = ev => { if (ev.target.closest('[data-shop]')) { o.remove(); renderShop(); show('scr-shop'); return; }
    if (ev.target.closest('[data-x]') || ev.target === o) { o.remove(); setTimeout(() => { try { chestPopup(); } catch (er) {} }, 200); } };
  $('#layer').appendChild(o);
  return true;
}
function evGiftCheck() {
  const p = Store.p, e = curEvent(); if (!p || p.onboard || !e || e.draft || (typeof S !== 'undefined' && S) || $('#layer .overlay')) return;
  if (new Date() >= e.end) return;
  const id = `${e.id}-gift`; p.gifts = p.gifts || []; if (p.gifts.includes(id)) return;
  p.gifts.push(id); p.shinyPacks = (p.shinyPacks || 0) + 1; save(); renderProfileBar();
  evTeaserModal(e, true);
}

// ---- oktató meccs: fix lapok, fix ellenfél-lépések, lépésről lépésre vezetve ----
// A játékos (Tomi) mindig ugyanazokat a lapokat húzza, a bot (Dávid, 12 élet) az első 4 körében mindig ugyanazt rakja le.
// Egy lépés: info (Tovább gomb) · play (csak a megadott lap a megadott helyre játszható ki) · tap (koppints a kiemelt elemre) · end (Kör vége).
const TUT_BOT = { 1: [['c_pifti', { k:'slot', i:1 }]], 2: [['c_kovacs', { k:'slot', i:1 }]], 3: [['c_zoli', { k:'slot', i:0 }]], 4: [['c_pifti', { k:'slot', i:2 }]] };
const tutHand = id => { const i = S.players[ME].hand.findIndex(c => c.id === id); return i >= 0 ? $(`#hand .card[data-hi="${i}"]`) : null; };
const TUT_STEPS = [
  { turn: 1, kind: 'info', at: () => null, txt: '<b>Üdv a Best of Us-ban!</b> Ez egy gyakorló meccs: lépésről lépésre megmutatom, hogyan kell játszani. Te vagy lent (Tomi), fent az ellenfél (Dávid).' },
  { turn: 1, kind: 'info', at: () => $('#eBar .hpbar'), txt: 'Ez az ellenfél hősének élete: <b>12</b>. Az nyer, aki előbb <b>nullára viszi az ellenfél hősét</b>.' },
  { turn: 1, kind: 'info', at: () => $('#pBar .en'), txt: 'Ez a kék kristály és a mellette lévő szám az <b>energiád</b>: most 1/1. <b>Minden körben eggyel több</b> lesz (legfeljebb 6). Ebből fizeted a lapokat.' },
  { turn: 1, kind: 'play', card: 'c_pifti', t: { k:'slot', side: 'me', i: 1 }, at: () => ui.sel != null ? cellEl(ME, 1) : tutHand('c_pifti'),
    txt: '<b>Húzd fel Piftit a kiemelt helyre!</b> A lap bal felső sarkában lévő szám az ára: 1 energia. (Ha csak rákoppintasz, nagyban megnézheted.)' },
  { turn: 1, kind: 'info', at: () => unitAt(ME, 1), txt: 'Pifti a táblán van. Az újonnan lerakott karakter <b>egy kört pihen</b>, a következő körödtől támad. <b>Fontos:</b> a karaktereidet nem kell irányítanod – <b>minden köröd végén maguktól támadnak</b>!' },
  { turn: 1, kind: 'end', at: () => $('#endBtn'), txt: 'Most nincs több energiád. Nyomd meg a <b>Kör vége</b> gombot – ilyenkor a karaktereid <b>maguktól</b> támadnak, aztán az ellenfél jön.' },
  { turn: 2, kind: 'info', at: () => unitAt(BOT, 1), txt: 'Az ellenfél is lerakott egy Piftit, <b>pont a tiéd elé</b>. A karakterek mindig a velük szemben állót ütik.' },
  { turn: 2, kind: 'info', at: () => $('#pBar .en'), txt: 'Új kör: <b>2 energiád</b> van, és húztál egy új lapot. Most megtanulsz eszközt és akciót kijátszani.' },
  { turn: 2, kind: 'play', card: 'i_napszemuveg', t: { k:'unit', side: 'me', i: 1 }, at: () => ui.sel != null ? cellEl(ME, 1) : tutHand('i_napszemuveg'),
    txt: '<b>Eszköz:</b> húzd a Napszemüveget a <b>saját Piftidre</b>. +1 támadást és +1 életet ad – Tomi hősöd képessége miatt még +1 életet, és mivel ez a köröd első eszköze, ingyen van!' },
  { turn: 2, kind: 'play', card: 'a_dinnyes', t: { k:'unit', side: 'bot', i: 1 }, at: () => ui.sel != null ? cellEl(BOT, 1) : tutHand('a_dinnyes'),
    txt: '<b>Akció:</b> a Dinnyés Absolute Vodka 3 sebzést okoz. Húzd rá az <b>ellenfél Piftijére</b>!' },
  { turn: 2, kind: 'info', at: () => cellEl(BOT, 1), txt: 'Kiütötted! Most <b>üres a sáv</b> a Piftid előtt. Ha szemben nincs senki, a karaktered <b>az ellenfél hősét üti</b>.' },
  { turn: 2, kind: 'end', at: () => $('#endBtn'), txt: 'Nyomd meg a <b>Kör vége</b> gombot, és figyeld, ahogy Pifti odacsap!' },
  { turn: 3, kind: 'tap', at: () => unitAt(BOT, 1), txt: 'Az ellenfél új lapot rakott le. <b>Koppints rá</b>, hogy megnézd, mit tud!' },
  { turn: 3, kind: 'info', at: () => unitAt(BOT, 1), txt: 'Kovács Bence gyenge, de <b>ha meghal, még 2-t üt</b>. A Piftid le fogja ütni, de a visszaütéstől ő is elesik. Ez egy csere – néha megéri.' },
  { turn: 3, kind: 'play', card: 'c_vajda', t: { k:'slot', side: 'me', i: 2 }, at: () => ui.sel != null ? cellEl(ME, 2) : tutHand('c_vajda'),
    txt: '<b>Rakd le Vajda Petit</b> a kiemelt helyre. Előtte üres a sáv, így jövő körtől az ellenfél hősét fogja ütni.' },
  { turn: 3, kind: 'end', at: () => $('#endBtn'), txt: 'Kör vége! Pifti és Kovács Bence most megütközik.' },
  { turn: 4, kind: 'info', at: () => $('#pBar .hpbar'), txt: 'Au! Az ellenfél Gál Zolija <b>Lendülettel</b> rögtön támadott, és mivel előtte <b>üres volt a sáv</b>, a hősödet ütötte. Ne hagyj üres sávot!' },
  { turn: 4, kind: 'tap', at: () => $('#pBar .hport-hit'), txt: 'Minden hősnek van egy képessége. <b>Koppints a hősöd portréjára</b>, és megmutatja.' },
  { turn: 4, kind: 'play', card: 'c_veghtomi', t: { k:'slot', side: 'me', i: 0 }, at: () => ui.sel != null ? cellEl(ME, 0) : tutHand('c_veghtomi'),
    txt: '<b>Rakd le Végh Tomit</b> a bal szélső helyre. <b>Provokáció</b>: amíg él, az ellenfél karakterei mindig őt támadják – megvéd a többieket.' },
  { turn: 4, kind: 'end', at: () => $('#endBtn'), txt: 'Kör vége – Vajda Peti most az ellenfél hősét üti!' },
  { turn: 5, kind: 'info', at: () => $('#eBar .hpbar'), txt: '<b>Szuper, ennyi az alap!</b> Innentől egyedül játszol: vidd le Dávid maradék életét. Ha nem tudod, mit csinál egy lap, csak koppints rá.', last: true },
];
// ---- további leckék (2026-10-09): rövid, fix meccs-helyzetek, amelyek egy-egy témát mutatnak meg ----
const TUT2_STEPS = [
  { turn: 3, kind: 'info', at: () => null, txt: '<b>2. lecke – Trükkös lapok.</b> Megmutatom a különleges képességeket: <b>Sunyulás</b>, <b>Láthatatlan</b>, <b>Lendület</b>, <b>Pajzs</b> és <b>Izom</b>.' },
  { turn: 3, kind: 'tap', at: () => unitAt(BOT, 2), txt: 'Az ellenfél egyik lapja <b>lefordítva</b> áll. <b>Koppints rá!</b>' },
  { turn: 3, kind: 'info', at: () => unitAt(BOT, 2), txt: 'Ez a <b>Sunyulás</b>: nem látod, mi az. Akkor fordul fel, amikor <b>támad</b>, amikor <b>megtámadják</b>, vagy amikor ellenséges hatás éri.' },
  { turn: 3, kind: 'play', card: 'c_amszterdam', t: { k:'slot', side: 'me', i: 3 }, at: () => ui.sel != null ? cellEl(ME, 3) : tutHand('c_amszterdam'),
    txt: 'Neked is van ilyen lapod. <b>Rakd le Bencét a jobb szélre</b> – lefordítva kerül le, az ellenfél nem tudja, mi az.' },
  { turn: 3, kind: 'play', card: 'c_alvari', t: { k:'slot', side: 'me', i: 1 }, at: () => ui.sel != null ? cellEl(ME, 1) : tutHand('c_alvari'),
    txt: '<b>Alvári Roli Láthatatlan.</b> Rakd le Toma elé!' },
  { turn: 3, kind: 'info', at: () => unitAt(ME, 1), txt: 'A <b>Láthatatlan</b> lapon átmennek a támadások: Toma most nem Rolit, hanem <b>a hősödet</b> üti. Roli viszont minden körben megüti Tomát, és Toma <b>nem tud visszaütni</b>.' },
  { turn: 3, kind: 'end', at: () => $('#endBtn'), txt: 'Nyomd meg a <b>Kör vége</b> gombot, és figyeld az ellenfél lapjait!' },
  { turn: 4, kind: 'info', at: () => unitAt(BOT, 2), txt: '<b>Felfordult!</b> Barna, az életunt volt – támadott, ezért láthatóvá vált. Toma pedig átütött Rolin, egyenesen a hősödbe.' },
  { turn: 4, kind: 'play', card: 'c_vajda', t: { k:'slot', side: 'me', i: 2 }, at: () => ui.sel != null ? cellEl(ME, 2) : tutHand('c_vajda'),
    txt: '<b>Rakd le Vajda Petit</b> Barna elé.' },
  { turn: 4, kind: 'play', card: 'i_energiaital', t: { k:'unit', side: 'me', i: 2 }, at: () => ui.sel != null ? cellEl(ME, 2) : tutHand('i_energiaital'),
    txt: 'Az <b>Energiaital</b> +2 támadást és <b>Lendületet</b> ad: akinek Lendülete van, már a lerakása körében támad. <b>Húzd Vajdára!</b>' },
  { turn: 4, kind: 'end', at: () => $('#endBtn'), txt: '<b>Kör vége</b> – Vajda azonnal üt, Roli sebzi Tomát, és a rejtett Bencéd is támad.' },
  { turn: 5, kind: 'info', at: () => $('#pBar .hpbar'), txt: 'Bence elesett, de <b>halálakor 3 életet gyógyított</b> a hősödön. Sok lapnak van ilyen halálhatása – érdemes elolvasni őket.' },
  { turn: 5, kind: 'play', card: 'i_borkabat', t: { k:'unit', side: 'me', i: 2 }, at: () => ui.sel != null ? cellEl(ME, 2) : tutHand('i_borkabat'),
    txt: 'A <b>Bőrkabát Pajzsot</b> ad: az első sebzést teljesen elnyeli. <b>Húzd Vajdára!</b>' },
  { turn: 5, kind: 'play', card: 'i_uto', t: { k:'unit', side: 'me', i: 2 }, at: () => ui.sel != null ? cellEl(ME, 2) : tutHand('i_uto'),
    txt: '<b>TomiNegan ütője</b>: +3 támadás és <b>Izom</b> – ha Vajda megöli a szemben állót, a <b>maradék sebzés az ellenfél hősét</b> éri. Húzd Vajdára!' },
  { turn: 5, kind: 'end', at: () => $('#endBtn'), txt: '<b>Kör vége</b> – Vajda átüt Piftin, a Pajzs pedig elnyeli a visszaütést!' },
  { turn: 6, kind: 'info', at: () => $('#eBar .hpbar'), txt: '<b>Ennyi!</b> Már ismered a trükkös képességeket. Fejezd be a meccset egyedül – ha nem tudod, mit csinál egy lap, koppints rá.', last: true },
];
const TUT3_STEPS = [
  { turn: 6, kind: 'info', at: () => null, txt: '<b>3. lecke – Helyszínek és a Kánon esemény.</b> Most a játék legnagyobb lapjait mutatom meg. Kezdésnek 6 energiád van.' },
  { turn: 6, kind: 'play', card: 'l_barhole', t: { k:'none' }, at: () => ui.sel != null ? $('#pLane') : tutHand('l_barhole'),
    txt: '<b>Helyszín:</b> a pálya közepére kerül, és <b>mindkét félre</b> hat. Húzd a <b>Barhole</b>-t a pályára (bárhova)!' },
  { turn: 6, kind: 'info', at: () => $('#loc'), txt: 'A Barhole miatt <b>minden lap 1-gyel olcsóbb</b> – az ellenfélnek is! Egyszerre csak egy helyszín lehet: ha valaki újat rak le, <b>lecseréli</b> a régit.' },
  { turn: 6, kind: 'info', at: () => tutHand('f_egyutt'), txt: 'Ez egy <b>Kánon esemény</b>: minden hősnek van egy saját, ultra erős lapja, és csak az ő paklijába tehető (a jobb felső sarokban a hős portréja). Gabié az <b>Együtt sírtok, együtt nevettek</b>.' },
  { turn: 6, kind: 'play', card: 'f_egyutt', t: { k:'none' }, at: () => ui.sel != null ? $('#pLane') : tutHand('f_egyutt'),
    txt: '<b>Játszd ki!</b> Húzd a pályára – a Barhole miatt 6 helyett most csak 5 energiába kerül.' },
  { turn: 6, kind: 'info', at: () => unitAt(ME, 0), txt: 'Megjött <b>Gyerek Zana</b> és <b>Gyerek Gabi</b>! Zanának <b>Lendülete</b> van, ezért már most támad – előtte üres a sáv, így egyenesen a hőst üti.' },
  { turn: 6, kind: 'end', at: () => $('#endBtn'), txt: '<b>Kör vége!</b>' },
  { turn: 7, kind: 'info', at: () => $('#loc'), txt: 'Az ellenfél <b>lecserélte a helyszínt</b> Budapest Parkra: mostantól minden lap 1-gyel <b>drágább</b>. A helyszínekért is megy a harc!' },
  { turn: 7, kind: 'info', at: () => $('#eBar .hpbar'), txt: '<b>Most már mindent tudsz!</b> Fejezd be a meccset egyedül. A pakliépítőben minden hősnek ott a saját Kánon eseménye – próbáld ki mindet!', last: true },
];
const LESSONS = [
  { id: 1, name: 'Alapok', desc: 'Energia, karakterek, eszköz, akció, támadás, Provokáció.', steps: TUT_STEPS, bot: TUT_BOT },
  { id: 2, name: 'Trükkös lapok', desc: 'Sunyulás, Láthatatlan, Lendület, Pajzs, Izom, halálhatás.', steps: TUT2_STEPS, reward: 1,
    bot: { 3: [['c_pifti', { k:'slot', i:3 }]], 4: [['c_pifti', { k:'slot', i:2 }]] } },
  { id: 3, name: 'Helyszín és Kánon esemény', desc: 'Helyszínek, a hősök ultra lapja (Kánon esemény), helyszín csere.', steps: TUT3_STEPS, reward: 1,
    bot: { 6: [['l_park', { k:'none' }], ['c_pifti', { k:'slot', i:0 }]] } },
];
const tutLesson = () => LESSONS[S?.tut?.l || 0];
const tutStep = () => S && S.tut && !S.tut.free ? tutLesson().steps[S.tut.step] : null;
function tutBotPlan() { const b = S && S.tut ? tutLesson().bot : null; const m = b && b[S.players[BOT].turns]; return m ? [...m] : null; }
const tutSide = x => x === 'me' ? ME : BOT;
function tutUnit(id, owner, x = {}) { const u = makeUnit(S, id, owner); u.owner = owner; u.fresh = false; return Object.assign(u, x); }
function startTutorial(opt = {}) {
  const l = opt.lesson || 0;
  if (l === 1) return startLesson2(opt);
  if (l === 2) return startLesson3(opt);
  const mine = { c_gyuri:2, c_sasi:2, a_cheddar:2, c_kovacs:2, a_dinnyes:2, c_zoli:2, i_napszemuveg:2, c_rebi:1, c_boros:1, i_energiaital:1, c_vajda:1, c_pifti:1, c_veghtomi:1 };
  const bot = { c_pifti:2, c_gyuri:2, c_kovacs:2, c_rebi:2, a_dinnyes:2, c_zoli:2, i_napszemuveg:2, a_cheddar:2, c_vajda:2, a_delfin:2 };
  S = newGame('tomi', mine, 'david', bot, ME); S.noCoin = true; S.events = [];
  const P = S.players[ME], B = S.players[BOT], card = id => ({ uid: ++S.uidc, id });
  P.hand = ['c_pifti', 'i_napszemuveg', 'a_dinnyes', 'c_vajda'].map(card);
  P.deck = [...shuffle(['c_gyuri', 'a_cheddar', 'c_kovacs', 'c_zoli', 'i_napszemuveg', 'c_rebi', 'c_boros', 'i_energiaital', 'a_dinnyes', 'c_sasi', 'a_cheddar', 'c_gyuri', 'c_kovacs']), 'c_veghtomi', 'c_sasi', 'c_gyuri'];
  B.hand = ['c_pifti', 'c_kovacs', 'c_zoli', 'c_pifti'].map(card);
  B.deck = shuffle(['c_gyuri', 'c_gyuri', 'c_rebi', 'a_dinnyes', 'c_kovacs', 'a_cheddar', 'c_vajda', 'a_delfin', 'i_napszemuveg', 'c_rebi', 'c_zoli', 'a_cheddar']);
  B.hp = B.maxHp = 12;
  tutGo({ l: 0, onboard: !!opt.onboard });
}
function tutGo(t) {
  S.tut = { step: 0, free: false, ...t };
  ui.sel = null; ui.pend = null; busy = false; ui.handSeen = null; ui.botHandN = null; ui.flying = new Set();
  show('scr-game'); $('#layer').innerHTML = ''; render();
}
// közös: a játékos köre egy megadott körszámmal (és energiával) indul
function tutSetTurn(myTurns, botTurns) {
  const P = S.players[ME], B = S.players[BOT];
  P.turns = myTurns; P.maxEnergy = P.energy = Math.min(6, myTurns); B.turns = botTurns; B.maxEnergy = Math.min(6, botTurns);
}
const TUT_FILL = { c_gyuri:2, c_pifti:2, c_kovacs:2, c_rebi:2, a_dinnyes:2, c_zoli:2, c_vajda:2, a_cheddar:2, c_sasi:2, i_napszemuveg:2 };
function startLesson2() {
  S = newGame('bence', TUT_FILL, 'david', TUT_FILL, ME); S.noCoin = true; S.events = [];
  const P = S.players[ME], B = S.players[BOT], card = id => ({ uid: ++S.uidc, id });
  tutSetTurn(3, 2);
  P.hand = ['c_alvari', 'c_amszterdam', 'c_vajda', 'i_energiaital', 'i_borkabat', 'i_uto'].map(card);
  P.deck = shuffle(['c_gyuri', 'c_kovacs', 'c_rebi', 'a_dinnyes', 'c_zoli', 'c_sasi', 'c_vajda', 'a_cheddar', 'c_pifti', 'c_gyuri', 'a_dinnyes', 'c_sasi']);
  B.hand = ['c_pifti', 'c_pifti', 'c_kovacs'].map(card);
  B.deck = shuffle(['c_gyuri', 'c_rebi', 'c_kovacs', 'a_cheddar', 'c_pifti', 'c_zoli', 'c_rebi', 'c_kovacs', 'c_gyuri', 'a_cheddar']);
  B.board = [null, tutUnit('c_sasi', BOT), tutUnit('c_barnaelet', BOT), null];
  B.hp = B.maxHp = 12;
  tutGo({ l: 1 });
}
function startLesson3() {
  S = newGame('gabi', TUT_FILL, 'barna', TUT_FILL, ME); S.noCoin = true; S.events = [];
  const P = S.players[ME], B = S.players[BOT], card = id => ({ uid: ++S.uidc, id });
  tutSetTurn(6, 5);
  P.hand = ['l_barhole', 'f_egyutt', 'c_sasi', 'a_dinnyes'].map(card);
  P.deck = shuffle(['c_gyuri', 'c_vajda', 'c_rebi', 'a_dinnyes', 'c_zoli', 'c_sasi', 'c_vajda', 'a_cheddar', 'c_pifti', 'c_gyuri', 'a_dinnyes', 'c_veghtomi']);
  B.hand = ['l_park', 'c_pifti', 'c_kovacs'].map(card);
  B.deck = shuffle(['c_gyuri', 'c_rebi', 'c_kovacs', 'a_cheddar', 'c_pifti', 'c_zoli', 'c_rebi', 'c_kovacs', 'c_gyuri', 'a_cheddar']);
  B.board = [null, null, tutUnit('c_sasi', BOT), tutUnit('c_rebi', BOT)];
  B.hp = B.maxHp = 9;
  tutGo({ l: 2 });
}
function tutAdvance() { S.tut.step++; if (!tutLesson().steps[S.tut.step]) S.tut.free = true; tutHide(); if (!busy) render(); setTimeout(tutCheck, 200); }   // újrarajzolás: a lapok szürkesége a lépéshez igazodjon
function tutHide() { COACH.el?.remove(); COACH.ring?.remove(); COACH.el = COACH.ring = null; }
const COACH = { el: null, ring: null, cur: null };
function tutPlace(step) {
  const t = step.at(), b = COACH.el, W = innerWidth, H = innerHeight, bw = Math.min(330, W - 24);
  b.style.width = bw + 'px';
  if (!t) { COACH.ring.hidden = true; b.style.left = (W - bw) / 2 + 'px'; b.style.top = H * 0.36 + 'px'; b.style.bottom = ''; return; }
  const r = t.getBoundingClientRect(); COACH.ring.hidden = false;
  Object.assign(COACH.ring.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
  const up = r.top + r.height / 2 > H / 2;
  b.style.top = up ? '' : Math.min(H - 170, r.bottom + 14) + 'px';
  b.style.bottom = up ? Math.max(10, H - r.top + 14) + 'px' : '';
  b.style.left = Math.max(12, Math.min(W - bw - 12, r.left + r.width / 2 - bw / 2)) + 'px';
}
function tutCheck() {
  const st = tutStep();
  if (!st || $('#scr-game').hidden) { if (COACH.el) tutHide(); return; }
  if (st.kind === 'play' && !S.players[ME].hand.some(c => c.id === st.card)) return tutAdvance();   // kijátszotta
  const quiet = busy || S.winner != null || S.active !== ME || ui.drag || $('#layer .overlay') || S.players[ME].turns !== st.turn;
  if (quiet) { if (COACH.el) COACH.el.hidden = COACH.ring.hidden = true; return; }
  if (!COACH.el || COACH.cur !== st) {
    tutHide(); COACH.cur = st;
    COACH.ring = document.createElement('div'); COACH.ring.className = 'coach-ring';
    COACH.el = document.createElement('div'); COACH.el.className = 'coach';
    COACH.el.innerHTML = `<small class="coach-n">${S.tut.l ? `${S.tut.l + 1}. lecke` : 'Oktató'} · ${S.tut.step + 1}/${tutLesson().steps.length}</small><p>${st.txt}</p>`
      + (st.kind === 'info' ? `<div><button class="btn primary" data-c="ok">${st.last ? 'Játsszunk!' : 'Tovább'}</button>${S.tut.step === 0 && !S.tut.onboard && !S.tut.l ? '<button class="btn ghost" data-c="skip">Kihagyom</button>' : ''}</div>` : `<div class="coach-do">${st.kind === 'end' ? '👉 Kör vége' : st.kind === 'tap' ? '👉 Koppints a kiemelt elemre' : '👉 Húzd a lapot a kiemelt helyre'}</div>`);
    COACH.el.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return;
      if (b.dataset.c === 'skip') { tutHide(); S.tut = null; if (Store.p) { Store.p.tutSkip = true; save(); } openBotPick(); return; }
      tutAdvance(); };
    document.body.append(COACH.ring, COACH.el);
  }
  COACH.el.hidden = false; tutPlace(st);
}
// csak a lépés által kért lap és célpont engedélyezett
const _targetsFor = targetsFor, _whyNot = whyNot;
targetsFor = function (s, pi, id) {
  const T = _targetsFor(s, pi, id), st = s === S ? tutStep() : null;
  if (!st || pi !== ME) return T;
  if (st.kind !== 'play' || id !== st.card) return [];
  if (st.t.k === 'none') return T.filter(t => t.k === 'none');
  return T.filter(t => t.side === tutSide(st.t.side) && t.i === st.t.i && !t.t2);
};
whyNot = function (s, pi, hi) {
  const st = s === S ? tutStep() : null, h = s.players[pi]?.hand[hi];
  if (st && pi === ME && h && (st.kind !== 'play' || h.id !== st.card)) return 'Most még ne ezt – kövesd a sárga buborékot';
  return _whyNot(s, pi, hi);
};
document.addEventListener('click', e => {
  const st = tutStep(); if (!st || st.kind !== 'tap' || S.active !== ME || busy) return;
  const t = st.at(); if (t && t.contains(e.target)) setTimeout(tutAdvance, 60);
}, true);
window.addEventListener('resize', () => { const st = tutStep(); if (st && COACH.el) tutPlace(st); });
setInterval(() => { if (tutStep() || COACH.el) tutCheck(); }, 350);   // pl. egy felugró ablak bezárása után is előjöjjön a következő lépés
function tutFinish() {
  const win = S.winner === ME, L = S.tut?.l || 0, les = LESSONS[L], next = LESSONS[L + 1];
  if (S.tut?.onboard) return onboardDone(win);
  const p = Store.p; let gift = 0;
  if (p) {
    if (!L && !p.tutDone) p.tutDone = true;
    p.lessons = p.lessons || {};
    if (!p.lessons[les.id]) { p.lessons[les.id] = true; if (les.reward) { gift = les.reward; p.giftPacks = (p.giftPacks || 0) + gift; } }
    save();
  }
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal result${win ? '' : ' lose'}"><h2>${win ? 'Megvan!' : 'Most nem jött össze'}</h2>
    <p>${L ? `${win ? 'Teljesítetted' : 'Végigjártad'} a(z) <b>${les.name}</b> leckét.` : win ? 'Megnyerted a gyakorló meccset – most már tudod az alapokat.' : 'Semmi gond, a lényeget már tudod.'}${next ? ` Jöhet a következő: <b>${next.name}</b>.` : ' Most már mindent tudsz – jöhetnek az igazi meccsek!'}</p>
    ${gift ? `<p class="tut-gift">🎁 Jutalom: <b>${gift} booster pack</b> – a Boosterek menüben vár.</p>` : ''}
    <div class="row">${next ? `<button class="btn primary" data-r="next">${L + 2}. lecke</button>` : '<button class="btn primary" data-r="play">Igazi meccs</button>'}<button class="btn" data-r="list">Leckék</button></div>
    <button class="btn ghost" data-r="menu">Menü</button></div>`;
  o.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; o.remove();
    const r = b.dataset.r;
    if (r === 'next') startTutorial({ lesson: L + 1 });
    else if (r === 'play') openBotPick();
    else { S = null; renderMenuFan(); renderProfileBar(); show('scr-menu'); if (r === 'list') lessonPicker(); } };
  setTimeout(() => $('#layer').appendChild(o), 700);
}
function lessonPicker() {
  const p = Store.p || {}, done = p.lessons || {};
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal lesson-box"><h3>🎓 Oktató</h3><p class="live">Rövid, vezetett meccsek – mindegyik egy témát mutat meg.</p>
    ${LESSONS.map((l, i) => { const ok = done[l.id] || (i === 0 && p.tutDone);
      return `<button class="lesson-row${ok ? ' done' : ''}" data-l="${i}"><span class="ls-n">${ok ? '✔' : i + 1}</span><span class="ls-t"><b>${l.name}</b><small>${l.desc}</small></span>${l.reward && !done[l.id] ? `<span class="ls-gift">🎁 ${l.reward} pack</span>` : ''}</button>`; }).join('')}
    <button class="btn" data-x>Bezárás</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]') || e.target === o) return o.remove();
    const b = e.target.closest('[data-l]'); if (!b) return; o.remove(); startTutorial({ lesson: +b.dataset.l }); };
  $('#layer').appendChild(o);
}
// ================= új játékosok bevezetője: rövid bemutató → gyakorló meccs → főmenü =================
const INTRO = [
  { t: 'Üdv a Best of Us-ban!', p: 'A banda saját kártyajátéka: a haverokból lettek a lapok. Gyűjtsd őket, építs paklit, és verd meg a többieket!',
    v: () => `<div class="in-fan">${['barna', 'krisz', 'gabi'].map(h => heroCardHTML(HERO[h], { foil: true })).join('')}</div>` },
  { t: 'A cél', p: 'Mindkét félnek van egy hőse. Az nyer, aki előbb <b>nullára viszi az ellenfél hősének életét</b>.',
    v: () => `<div class="in-duel"><div class="in-hero">${heroPortrait('tomi', 'in-port')}<b>Te</b><span class="in-hp"><i></i></span></div><div class="in-vs">VS</div><div class="in-hero foe">${heroPortrait('david', 'in-port')}<b>Ellenfél</b><span class="in-hp drain"><i></i><em></em></span></div></div>` },
  { t: 'Energia és lapok', p: 'Minden körben <b>eggyel több energiád</b> van (legfeljebb 6). A lap bal felső sarkában az ára – ebből rakod le a lapokat.',
    v: () => `<div class="in-gems">${Array.from({ length: 6 }, (_, k) => `<i style="--k:${k}"></i>`).join('')}</div><div class="in-row">${['c_pifti', 'c_gyuri', 'c_vajda'].map(id => cardHTML(id)).join('')}</div>` },
  { t: 'Négyféle lap', p: '<b>Karakter</b> – harcol a táblán · <b>Eszköz</b> – felszereled vele · <b>Akció</b> – egyszeri hatás · <b>Helyszín</b> – mindkét félre hat.',
    v: () => `<div class="in-row four">${[['c_pifti', 'Karakter'], ['i_napszemuveg', 'Eszköz'], ['a_dinnyes', 'Akció'], ['l_barhole', 'Helyszín']].map(([id, n]) => `<div class="in-type">${cardHTML(id)}<small>${n}</small></div>`).join('')}</div>` },
  { t: 'Így megy a harc', p: 'Nem kell irányítanod őket: a köröd végén a karaktereid <b>maguktól támadnak</b> – a velük szemben állót ütik, ha előttük <b>üres a sáv</b>, egyenesen az ellenfél hősét!',
    v: () => `<div class="in-board"><div class="in-lane"><div class="in-slot">${cardHTML('c_kovacs')}</div><div class="in-slot empty"><span>üres</span></div></div>
      <div class="in-lane me"><div class="in-slot hit">${cardHTML('c_vajda')}</div><div class="in-slot hit2">${cardHTML('c_pifti')}</div></div><div class="in-face">💥</div></div>` },
  { t: 'Gyűjts, bonts, nyerj!', p: 'Nyerj meccseket, bonts boostereket, vadászd a <b>Full Art</b> és a legritkább <b>Arany</b> lapokat – és mérkőzz a haverokkal élő <b>PvP</b>-ben!',
    v: () => `<div class="in-collect"><div class="in-pack">${packHTML('base')}</div>${heroCardHTML(HERO.krisz, { gold: true })}${cardHTML('c_zana', { foil: true })}</div>` },
];
function showIntro() {
  return new Promise(done => {
    const o = document.createElement('div'); o.className = 'overlay intro';
    o.innerHTML = `<div class="in-track">${INTRO.map((sl, i) => `<section class="in-slide" data-i="${i}"><div class="in-vis">${sl.v()}</div><h2>${sl.t}</h2><p>${sl.p}</p></section>`).join('')}</div>
      <div class="in-foot"><div class="in-dots">${INTRO.map((_, i) => `<i data-d="${i}"></i>`).join('')}</div><button class="btn primary in-next">Tovább</button></div>`;
    document.body.appendChild(o);
    const track = o.querySelector('.in-track'), next = o.querySelector('.in-next');
    let cur = 0;
    const go = i => {
      cur = Math.max(0, Math.min(INTRO.length - 1, i));
      track.style.transform = `translateX(${-cur * 100}%)`;
      o.querySelectorAll('.in-slide').forEach((el, k) => el.classList.toggle('on', k === cur));
      o.querySelectorAll('.in-dots i').forEach((d, k) => d.classList.toggle('on', k === cur));
      next.textContent = cur === INTRO.length - 1 ? 'Jöhet a gyakorló meccs! ⚔️' : 'Tovább';
    };
    next.onclick = () => { if (cur < INTRO.length - 1) return go(cur + 1); o.classList.add('out'); setTimeout(() => { o.remove(); done(); }, 350); };
    o.querySelector('.in-dots').onclick = e => { const d = e.target.closest('[data-d]'); if (d) go(+d.dataset.d); };
    let sx = null, sy = null;   // lapozás húzással
    o.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    o.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1)); });
    requestAnimationFrame(() => go(0));
  });
}
async function startOnboarding() {
  if (ONB.running) return; ONB.running = true;
  $('#layer').innerHTML = '';
  await showIntro();
  startTutorial({ onboard: true });
  toast('Kövesd a sárga buborékokat!');
}
const ONB = { running: false };
function onboardDone(win) {
  ONB.running = false;
  const p = Store.p; if (p) { p.tutDone = true; delete p.onboard; save(); }
  const o = document.createElement('div'); o.className = 'overlay onb-done';
  o.innerHTML = `<div class="modal onb-box"><div class="onb-burst" aria-hidden="true"></div><h2>${win ? 'Megvan! 🎉' : 'Szép volt! 👏'}</h2>
    <p>${win ? 'Megnyerted a gyakorló meccset – már mindent tudsz, ami kell.' : 'Most nem jött össze, de az alapokat már tudod – élesben jobban fog menni!'}</p>
    <div class="onb-gift"><div class="onb-pack">${packHTML('base')}</div><div><b>Üdvözlő ajándék</b><span>${WELCOME.packs} Base set booster + ${WELCOME.shinyPacks} Shiny pack vár rád a <b>Boosterek</b> menüben.</span></div></div>
    <button class="btn primary" data-r="menu">Irány a főmenü!</button><button class="btn ghost" data-r="again">Következő lecke: Trükkös lapok (🎁 +1 pack)</button></div>`;
  o.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; o.remove(); tutHide();
    if (b.dataset.r === 'again') return startTutorial({ lesson: 1 });
    S = null; renderMenuFan(); renderProfileBar(); show('scr-menu'); setTimeout(() => toast(`Üdv, ${Store.p?.name || ''}! Kezdd a boosterek bontásával 🎁`), 400); };
  setTimeout(() => $('#layer').appendChild(o), 700);
}

$('#goTut').onclick = () => { if (needProfile()) return; lessonPicker(); };

// ======================= PvP (barátok egymás ellen) =======================
// Egy meccs = egy közös dokumentum: pvp/<id>. Mindig az lép, akinek a köre van; ő számol, és a teljes állást visszaírja.
// A másik gép ugyanabból a véletlenmagból lejátssza ugyanazt (animációval), aztán átveszi a beírt állást.
const PVP = { list: [], unsub: null, id: null, v: 0, queue: [], running: false, writing: Promise.resolve(), mullUnsub: null, finalizing: false,
  room: null, mroom: null, mroomOff: [], searching: null, searchDeck: null, hb: null, creating: false, turnAt: 0, afk: [0, 0], lastEmote: 0 };
const TURN_SEC = 75, AFK_GRACE = 15, MULL_SEC = 45;   // élő meccs: kör ideje, a türelmi idő, a kezdő kéz ideje (mp)
const pvpHash = str => { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function pvpSeed(tag) { seedRng(pvpHash(PVP.id + ':' + (tag || PVP.v + 1))); }
const pvpDoc = id => Store.db.doc('pvp/' + id);
const pvpMine = d => d.host?.uid === Store.uid || d.guest?.uid === Store.uid;
const pvpSideOf = d => d.host?.uid === Store.uid ? 0 : 1;
const pvpClean = s => { const c = JSON.parse(JSON.stringify(s)); delete c.events; delete c.qs; delete c.pvp; delete c.qDone; delete c.log; return c; };
function pvpMyTurn(d) {
  if (!pvpMine(d)) return false;
  const me = pvpSideOf(d);
  if (d.status === 'mull') return !(d.mulled || [])[me];
  return d.status === 'play' && d.state && d.state.active === me && d.state.winner == null;
}
function pvpStart() { if (TEST_MODE) return;   // egyetlen feliratkozás az összes PvP-meccsre (lobbi, jelvény és a futó meccs is ebből él)
  if (PVP.unsub || !Store.db || !Store.uid) return;
  const onList = list => {
    PVP.list = list;
    renderPvpBadge();
    if (!$('#scr-pvp').hidden) renderPvp();
    const cur = PVP.id && PVP.list.find(d => d.id === PVP.id);
    if (cur) pvpOnMatch(cur);
    const sr = PVP.searching && PVP.list.find(d => d.id === PVP.searching);
    if (sr && sr.status === 'mull' && sr.state) { pvpStopSearch(); pvpEnter(sr.id, sr); }
    if (PVP.id && PVP.mullSeen !== undefined) pvpTryFinalize(PVP.id);
    frOnPvpList();
  };
  if (window.APP_MODE) {   // saját szerveren: csak a saját meccseimet és a nyitott kihívásokat figyelem (kevesebb adatforgalom)
    const parts = { mine: [], open: [] };
    const merge = () => { const m = new Map(); for (const d of parts.open.concat(parts.mine)) m.set(d.id, d); onList([...m.values()]); };
    const col = Store.db.collection('pvp'), fail = () => { PVP.unsub?.(); PVP.unsub = null; };
    const u1 = col.where('parts', 'array-contains', Store.uid).onSnapshot(s => { parts.mine = s.docs.map(d => ({ id: d.id, ...d.data() })); merge(); }, fail);
    const u2 = col.where('status', '==', 'open').onSnapshot(s => { parts.open = s.docs.map(d => ({ id: d.id, ...d.data() })); merge(); }, fail);
    PVP.unsub = () => { u1(); u2(); };
    return;
  }
  PVP.unsub = Store.db.collection('pvp').onSnapshot(snap => onList(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => { PVP.unsub = null; });
}
const pvpVerOk = d => !window.APP_MODE || ((d.host?.ver || '') === (window.APP_VERSION || '') && !window.APP_NEWER?.());
function renderPvpBadge() {
  const b = $('#pvpBadge'), sub = $('#pvpSub'); if (!b) return;
  if (!Store.db || !Store.uid) { b.hidden = true; if (sub) sub.textContent = 'Felhőmentés kell hozzá'; return; }
  const turn = PVP.list.filter(pvpMyTurn).length, open = PVP.list.filter(d => d.status === 'open' && !d.ranked && !pvpMine(d) && (!d.to || d.to === Store.uid) && (!d.live || Date.now() - (d.seen || 0) < 20000)).length;
  b.hidden = !(turn || open); b.textContent = turn ? `${turn} – te jössz!` : `${open} kihívás`;
  b.classList.toggle('hot', !!turn);
  if (sub) sub.textContent = turn ? 'Valaki vár a lépésedre' : open ? 'Nyitott kihívás vár rád' : 'Játssz a barátaid ellen';
}
function pvpWho(d, side) { const p = side === 0 ? d.host : d.guest; return p ? escH(p.name || 'Játékos') : '…'; }
function renderPvp() {
  const body = $('#pvpBody');
  if (!Store.db || !Store.uid) { body.innerHTML = '<p class="q-note">A PvP-hez felhőben mentett profil kell (Claude-fiókkal megnyitva). Ezen az eszközön most csak a bot ellen tudsz játszani.</p>'; return; }
  const now = Date.now(), L = PVP.list;
  const mine = L.filter(d => pvpMine(d) && (d.status === 'mull' || d.status === 'play')).sort((a, b) => pvpMyTurn(b) - pvpMyTurn(a) || (b.updated || 0) - (a.updated || 0));
  const myOpen = L.filter(d => d.status === 'open' && d.host?.uid === Store.uid);
  const others = L.filter(d => d.status === 'open' && !d.ranked && d.host?.uid !== Store.uid && (!d.to || d.to === Store.uid) && (d.live ? now - (d.seen || 0) < 20000 : now - (d.created || 0) < 3 * 864e5));
  const done = L.filter(d => pvpMine(d) && d.status === 'done').sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 5);
  const ago = t => { const m = Math.round((now - (t || now)) / 60000); return m < 1 ? 'most' : m < 60 ? `${m} perce` : m < 1440 ? `${Math.round(m / 60)} órája` : `${Math.round(m / 1440)} napja`; };
  const heroOf = p => p ? heroPortrait(p.hero, 'pv-hero') : '';
  const row = (d, btn, sub) => { const me = pvpSideOf(d), op = 1 - me, opP = op === 0 ? d.host : d.guest;
    return `<div class="pv-row${pvpMyTurn(d) ? ' hot' : ''}">${heroOf(opP)}<div class="pv-txt"><b>${pvpWho(d, op)}</b><small>${sub}</small></div>${btn}</div>`; };
  const online = pvpOnline();
  body.innerHTML = `
    <button class="btn primary pv-live" id="pvpQuick">⚡ Élő meccs keresése</button>
    <p class="pv-online">${online === null ? '' : online.length ? `🟢 Most a PvP-ben: <b>${online.map(escH).join(', ')}</b>` : 'Most rajtad kívül senki sincs a PvP-ben – indíts keresést, és szólj a haveroknak!'}</p>
    <button class="btn" id="pvpNew" ${myOpen.some(d => !d.live) ? 'disabled' : ''}>📨 Ráérős kihívás</button>
    ${myOpen.filter(d => !d.live).map(d => `<div class="pv-row mine">${heroOf(d.host)}<div class="pv-txt"><b>A kihívásod nyitva van</b><small>${HERO[d.host.hero]?.name} · ${escH(d.host.deckName || '')} · várja, hogy valaki elfogadja</small></div><button class="btn ghost" data-cancel="${d.id}">Visszavonom</button></div>`).join('')}
    <div class="lbl">Folyamatban lévő meccseid</div>
    ${mine.length ? mine.map(d => row(d, `<button class="btn ${pvpMyTurn(d) ? 'primary' : ''}" data-go="${d.id}">${pvpMyTurn(d) ? 'Te jössz!' : 'Megnézem'}</button>`,
        d.status === 'mull' ? 'Kezdő kéz választása' : `${Math.ceil((d.state?.half || 1) / 2)}. kör · te ${d.state?.players[pvpSideOf(d)].hp} ❤ · ő ${d.state?.players[1 - pvpSideOf(d)].hp} ❤ · ${ago(d.updated)}`)).join('')
      : '<p class="q-note">Nincs futó meccsed.</p>'}
    <div class="lbl">Nyitott kihívások</div>
    ${others.length ? others.map(d => `<div class="pv-row">${heroOf(d.host)}<div class="pv-txt"><b>${pvpWho(d, 0)}</b><small>${d.live ? '⚡ Élő meccsre vár · ' : ''}${HERO[d.host.hero]?.name} · ${ago(d.created)}</small></div><button class="btn primary" data-join="${d.id}">Elfogadom</button></div>`).join('')
      : '<p class="q-note">Most senki nem hív ki. Hozz létre egy kihívást, és szólj a haveroknak!</p>'}
    ${done.length ? `<div class="lbl">Legutóbbi meccsek</div>${done.map(d => row(d, `<span class="pv-res ${d.winner === pvpSideOf(d) ? 'w' : d.winner === 'draw' ? 'd' : 'l'}">${d.winner === pvpSideOf(d) ? 'Nyertél' : d.winner === 'draw' ? 'Döntetlen' : 'Vesztettél'}</span>`, ago(d.updated))).join('')}` : ''}
    <p class="q-note"><b>Élő meccs:</b> mint a Hearthstone – egyszerre vagytok bent, ${TURN_SEC} mp egy kör, a Kör vége gomb alatt fogy az idő. Ha valakinek kétszer lejár az ideje úgy, hogy nincs ott, elveszti a meccset. Menet közben gyors üzeneteket (💬) is küldhettek.</p>
    <p class="q-note"><b>Ráérős kihívás:</b> nem kell egyszerre fent lennetek. Lépj, aztán a barátod akkor folytatja, amikor ráér – a menüben jelezzük, ha te jössz. A PvP-meccs is ad coint, küldetés-haladást és Season Pass XP-t.</p>`;
  body.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'pvpNew') return pvpPickDeck('Melyik paklival hívod ki őket?', pvpCreate);
    if (b.id === 'pvpQuick') return pvpPickDeck('Melyik paklival játszol?', pvpQuick);
    if (b.dataset.cancel) return pvpDoc(b.dataset.cancel).delete().catch(() => toast('Nem sikerült visszavonni'));
    if (b.dataset.join) { const jd = PVP.list.find(x => x.id === b.dataset.join);
      if (jd && !pvpVerOk(jd)) return toast(window.APP_NEWER?.() ? 'Frissítsd a játékot (fent: Frissítés), utána játszhattok!' : 'Neki régebbi verziója van – szólj neki, hogy frissítsen!');
      return pvpPickDeck('Melyik paklival fogadod el?', dk => pvpJoin(b.dataset.join, dk)); }
    if (b.dataset.go) return pvpEnter(b.dataset.go);
  };
  pvpCleanup();
}
function pvpPickDeck(title, done, opt = {}) {   // ugyanaz a pakliválasztó képernyő, mint a bot elleni meccsnél
  openDeckPick({ title: title.replace(/<[^>]*>/g, ''), note: opt.note || 'Válaszd ki, melyik paklival játszol. A hőst a pakli határozza meg.', btn: opt.btn || 'Ezzel játszom', done, ...opt });
}
const pvpMe = dk => ({ ver: window.APP_VERSION || '', uid: Store.uid, name: Store.p.name || 'Játékos', hero: dk.hero, deckName: dk.name, deckId: dk.id || null, list: { ...dk.list },
  cos: { back: myBack(), crown: myCrown(), heroGold: heroSkin(dk.hero) === 'gold', heroFa: heroSkin(dk.hero) === 'fa', port: isPort(heroSkin(dk.hero)) ? heroSkin(dk.hero) : null, foils: Object.keys(dk.list).filter(id => ownsFoil(id)), foilN: myFoils(dk.list) } });   // amit az ellenfél is lát: Full Art hős és lapok
async function pvpCreate(dk) {
  try { await Store.db.collection('pvp').add({ parts: [Store.uid], status: 'open', created: Date.now(), updated: Date.now(), host: pvpMe(dk), guest: null, v: 0 }); toast('Kihívás létrehozva – szólj a haveroknak!'); }
  catch (e) { toast(e?.code === 'quota_exceeded' ? 'Megtelt a tárhely, próbáld később' : 'Nem sikerült létrehozni (lehet, hogy nincs írási jogod)'); }
}
async function pvpJoin(id, dk) {
  const ref = pvpDoc(id);
  try {
    const lease = await ref.acquire({ holder: Store.uid, ttlMs: 5000 });
    if (!lease.acquired) { toast('Épp más is csatlakozik, próbáld újra'); return false; }
    const snap = await ref.get(); const d = snap.exists ? snap.data() : null;
    if (!d || d.status !== 'open' || d.guest) { toast(d ? 'Ezt a kihívást már elfogadta valaki' : 'Ez a keresés közben megszűnt'); return false; }
    const guest = pvpMe(dk), first = Math.random() < .5 ? 0 : 1;
    PVP.id = id; seedRng(pvpHash(id + ':start'));
    const s = newGame(d.host.hero, { ...d.host.list }, guest.hero, { ...guest.list }, first, { mulligan: true, foils: [d.host.cos?.foilN || {}, guest.cos?.foilN || {}] });
    unseedRng();
    s.names = [d.host.name, guest.name];
    s.cos = [d.host.cos || { heroFa: false, foils: [] }, guest.cos];
    const upd = { parts: [d.host.uid, Store.uid], guest, status: 'mull', first, v: 0, state: pvpClean(s), mulled: [false, false], updated: Date.now(), mullAt: Date.now(), afk: [0, 0] };
    /* 2026-10-18: tranzakcióban – ha a gazda közben lezárta (bothoz ment / Mégse), nem lépünk be egy halott meccsbe */
    const ok = await Store.db.runTransaction(async tx => { const sn = await tx.get(ref); const x = sn.exists ? sn.data() : null;
      if (!x || x.status !== 'open' || x.guest) return false; tx.update(ref, upd); return true; });
    if (!ok) { PVP.id = null; toast('Ez a keresés közben megszűnt'); return false; }
    pvpEnter(id, { id, ...d, ...upd });
    return true;
  } catch { toast('Nem sikerült csatlakozni'); return false; }
}
// belépés egy meccsbe (új vagy folytatott)
function pvpEnter(id, fresh) {
  const d = fresh || PVP.list.find(x => x.id === id); if (!d || !d.state) { toast('Betöltés…'); return; }
  const side = pvpSideOf(d);
  { const mine = side === 0 ? d.host : d.guest; if (mine?.deckId && d.status === 'mull') loanUse(mine.deckId, 'pvp:' + id); }   /* kölcsönpakli-számláló */
  ME = side; BOT = 1 - side;
  PVP.id = id; PVP.v = d.v; PVP.queue = []; PVP.running = false;
  S = { ...JSON.parse(JSON.stringify(d.state)), events: [], pvp: { id, side, live: !!d.live, ranked: !!d.ranked, list: (side === 0 ? d.host : d.guest)?.list || {}, opp: (side === 0 ? d.guest : d.host)?.uid || null } };
  PVP.turnAt = d.turnAt || Date.now(); PVP.afk = d.afk || [0, 0];
  pvpJoinRoom(id, side); pvpPresence();
  ui.sel = null; ui.pend = null; busy = false; ui.handSeen = null; ui.botHandN = null; ui.flying = new Set();
  show('scr-game'); $('#layer').innerHTML = '';
  if (d.status === 'mull' && !(d.mulled || [])[side]) {   // új meccs: előbb a „X vs Y” képernyő, utána a kezdő kéz
    vsIntro().then(() => { if (!S || S.pvp?.id !== id) return; render(); setTimeout(() => showMulligan(d.first), 500); });
    pvpWatchMull(d); return;
  }
  render();
  if (d.status === 'mull') {
    if (!(d.mulled || [])[side]) setTimeout(() => showMulligan(d.first), 500);
    else pvpWaitMsg();
    pvpWatchMull(d);
  } else if (d.status === 'done' || S.winner != null) endMatch();
  else if (S.active === ME) turnBanner(true);
}
function pvpWaitMsg() {
  if ($('#layer .pv-wait')) return;
  const o = document.createElement('div'); o.className = 'overlay pv-wait';
  o.innerHTML = `<div class="modal"><h3>Várakozás az ellenfélre…</h3><p class="live">Még választja a kezdő kezét. Amint kész, indul a meccs – addig kiléphetsz, a meccs megmarad.</p><button class="btn" data-x>Vissza a PvP-hez</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]')) { o.remove(); pvpLeave(); } };
  $('#layer').appendChild(o);
}
async function pvpSendMull(idx) {
  const side = S.pvp.side;
  try {
    await Store.db.doc(`pvp/${PVP.id}/mull/${side}`).set({ idx, at: Date.now() });
    const d = PVP.list.find(x => x.id === PVP.id); const mulled = [...(d?.mulled || [false, false])]; mulled[side] = true;
    await pvpDoc(PVP.id).update({ mulled, updated: Date.now() });
  } catch { toast('Nem sikerült elküldeni, próbáld újra'); }
}
function pvpWatchMull(d) {   // ha mindkét fél döntött: bárki véglegesítheti (ugyanabból a magból ugyanaz jön ki)
  PVP.mullUnsub?.();
  PVP.mullUnsub = Store.db.collection(`pvp/${d.id}/mull`).onSnapshot(async snap => {
    const m = {}; snap.docs.forEach(x => { m[x.id] = x.data().idx; });
    PVP.mullSeen = m; pvpTryFinalize(d.id);
  }, () => {});
}
async function pvpTryFinalize(id) {   // élő meccsben: aki nem dönt időben a kezdő kezéről, az megtartja a lapjait
  const d = PVP.list.find(x => x.id === id), m = { ...(PVP.mullSeen || {}) };
  if (!d || d.status !== 'mull' || PVP.finalizing) return;
  if (d.live && Date.now() - (d.mullAt || 0) > MULL_SEC * 1000) { if (!m[0]) m[0] = []; if (!m[1]) m[1] = []; }
  {
    const cur = d;
    if (!m[0] || !m[1]) return;
    PVP.finalizing = true;
    try {
      const s = JSON.parse(JSON.stringify(cur.state));
      seedRng(pvpHash(d.id + ':m0')); mulligan(s, 0, m[0]);
      seedRng(pvpHash(d.id + ':m1')); mulligan(s, 1, m[1]);
      seedRng(pvpHash(d.id + ':begin')); beginGame(s); unseedRng();
      await pvpDoc(d.id).update({ state: pvpClean(s), v: 1, status: 'play', last: { v: 1, kind: 'start' }, updated: Date.now(), turnAt: Date.now() });
      PVP.mroom?.emit('ping', { v: 1 }).catch(() => {});
      Store.db.doc(`pvp/${d.id}/mull/0`).delete().catch(() => {}); Store.db.doc(`pvp/${d.id}/mull/1`).delete().catch(() => {});
    } catch {} finally { PVP.finalizing = false; }
  }
}
// a saját lépés visszaírása (egyszerre egy írás)
function pvpPush(kind, extra = {}, more = {}) {
  const v = PVP.v + 1; PVP.v = v;
  const body = { state: pvpClean(S), v, last: { v, by: ME, kind, ...extra }, updated: Date.now(),
                 status: S.winner != null ? 'done' : 'play', winner: S.winner ?? null, reason: S.reason ?? null, ...more };
  if (kind === 'end') { body.turnAt = PVP.turnAt = Date.now(); if (!extra.auto) { PVP.afk = [...PVP.afk]; PVP.afk[ME] = 0; body.afk = PVP.afk; } }
  const id = PVP.id;
  PVP.writing = PVP.writing.then(() => pvpDoc(id).update(body)).then(() => PVP.mroom?.emit('ping', { v }).catch(() => {})).catch(async e => {
    if (e?.code === 'unavailable') { await sleep(600); return pvpDoc(id).update(body).catch(() => toast('A lépést nem sikerült elküldeni – nézd meg a netet')); }
    toast('A lépést nem sikerült elküldeni – nézd meg a netet');
  });
}
// érkező változás a futó meccsben
function pvpOnMatch(d) {
  if (!S || !S.pvp || S.pvp.id !== d.id) return;
  if (d.status === 'mull') { if ((d.mulled || [])[S.pvp.side] && !$('#layer .overlay.mull')) pvpWaitMsg(); return; }
  if ((d.v || 0) <= PVP.v) return;
  PVP.queue.push(d); pvpDrain();
}
async function pvpDrain() {
  if (PVP.running) return; PVP.running = true;
  try {
    while (PVP.queue.length) {
      while (busy) await sleep(150);
      const d = PVP.queue.shift(); if ((d.v || 0) <= PVP.v) continue;
      const wasMull = S.phase === 'mulligan';
      if (wasMull) { $('#layer').querySelectorAll('.overlay').forEach(o => o.remove()); }
      const L = d.last || {};
      if (!wasMull && d.v === PVP.v + 1 && L.by !== ME && (L.kind === 'play' || L.kind === 'end' || L.kind === 'move')) {
        busy = true; render();
        pvpSeed(d.v);
        try {
          if (L.kind === 'play') {
            const hi = S.players[BOT].hand.findIndex((c, i) => i === L.hi && c.id === L.id);
            if (hi >= 0) { await showPlayed(L.id, L.t, !!S.players[BOT].hand[hi].foil); await runFx(() => playCard(S, BOT, hi, L.t)); }
          } else if (L.kind === 'move') await runFx(() => moveUnit(S, BOT, L.a, L.b));
          else await resolveEnd();
        } catch {}
        unseedRng();
      }
      if (!wasMull && L.by !== ME && d.v === PVP.v + 1 && JSON.stringify(pvpClean(S)) !== JSON.stringify(d.state)) PVP.desync = (PVP.desync || 0) + 1;
      PVP.v = d.v;   // a beírt állás a mérvadó
      if (d.turnAt) PVP.turnAt = d.turnAt; if (d.afk) PVP.afk = d.afk;
      const keepSeen = ui.handSeen;
      S = { ...JSON.parse(JSON.stringify(d.state)), events: [], pvp: S.pvp, qs: S.qs, qDone: S.qDone, log: S.log };
      if (wasMull) ui.handSeen = null; else ui.handSeen = keepSeen;
      busy = false; render();
      if (S.winner != null) { endMatch(); break; }
      if (L.by !== ME && S.active === ME) { if (L.kind === 'forfeit') toast('Az ellenfél feladta'); else { if (L.auto) toast('Lejárt az ellenfél ideje'); turnBanner(true); } }
      if (L.by === ME && S.active !== ME && L.kind === 'end') turnBanner(false);
      if (wasMull) toast(S.active === ME ? 'Te kezdesz!' : 'Az ellenfél kezd');
    }
  } finally { PVP.running = false; }
}
function pvpLeave() {
  PVP.mullUnsub?.(); PVP.mullUnsub = null; PVP.id = null; PVP.queue = []; PVP.mullSeen = undefined;
  PVP.mroomOff.forEach(f => f()); PVP.mroomOff = []; PVP.mroom?.leave().catch(() => {}); PVP.mroom = null; if ($('#ttBar')) $('#ttBar').hidden = true;
  S = null; busy = false; ME = 0; BOT = 1;
  $('#layer').innerHTML = ''; renderPvp(); show('scr-pvp'); pvpPresence();
}
function pvpForfeit() {
  if (!S?.pvp || S.winner != null) return;
  S.winner = BOT; S.reason = 'forfeit'; pvpPush('forfeit'); render(); endMatch();
}
function pvpEndMatch() {
  const w = S.winner, win = w === ME, draw = w === 'draw', id = S.pvp.id;
  const p = Store.p; p.pvpSeen = p.pvpSeen || [];
  let reward = '';
  if (!p.pvpSeen.includes(id)) {   // a jutalom meccsenként egyszer jár
    p.pvpSeen = [...p.pvpSeen.slice(-40), id];
    const aw = awardMatch(draw ? 'draw' : win ? 'win' : 'loss');
    const fr = (typeof frOn === 'function' && frOn()) && FR.list.some(d => d.status === 'accepted' && frOther(d) === S.pvp.opp);
    const qd = questsOnMatch({ win, hero: S.players[ME].heroId, ah: ahCount(S.pvp.list), ranked: !!S.pvp.ranked, friend: !!fr, ...(S.qs || { actions: 0, items: 0, chars: 0, locs: 0, big: 0, heroDmg: 0, kills: 0 }) });
    const px = passOnMatch(draw ? 'draw' : win ? 'win' : 'loss', qd);
    try { S.evRes = eventOnMatch({ win, pvp: true, ranked: !!S.pvp.ranked, lv: S.pvp.ranked ? 3 : 0, hero: S.players[ME].heroId, ...(S.qs || { actions: 0, items: 0, chars: 0, locs: 0, big: 0, heroDmg: 0, kills: 0 }) }); } catch (e) {}
    p.pvp = p.pvp || { w: 0, l: 0, d: 0 }; p.pvp[win ? 'w' : draw ? 'd' : 'l']++; save();
    if (S.pvp.ranked) S.rkRes = rankOnMatch(draw ? 'draw' : win ? 'win' : 'loss');
    reward = (aw ? `<div class="reward"><span class="coin" aria-hidden="true"></span><b>+${aw.gain}</b><small>coin · ma ${aw.today}/${ECON.dailyCap}</small></div>` : '')
      + qd.map(q => `<div class="q-done-pop">✓ Küldetés teljesítve: <b>${q.txt}</b><em>+${q.rew}</em></div>`).join('')
      + (px ? `<div class="sp-pop${px.up ? ' up' : ''}"><b>+${px.gain} XP</b> Season Pass</div>` : '') + evResultHTML(S.evRes) + rkResultHTML(S.rkRes);
  }
  const opp = escH(S.names?.[BOT] || 'Az ellenfél');
  const why = S.reason === 'forfeit' ? (win ? `${opp} feladta a meccset.` : 'Feladtad a meccset.')
    : S.reason === 'afk' ? (win ? `${opp} elhagyta a meccset (kétszer lejárt az ideje).` : 'Kétszer lejárt az időd, így elvesztetted a meccset.')
    : S.reason === 'time' ? `Letelt a ${MAX_HALF / 2} kör. Életek: te ${S.players[ME].hp}, ${opp} ${S.players[BOT].hp}.`
    : draw ? 'Mindkét hős egyszerre dőlt ki.' : win ? `${opp} hőse kiütve!` : `${opp} kiütötte a hősödet.`;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal result${win ? '' : ' lose'}${draw ? '' : ' resart'}">${draw ? '<h2 class="banner-h"><img src="art/ui/banner-draw.webp" alt="Döntetlen"></h2>' : resultArt(win)}<p>${why}</p>${S.killShot && S.reason !== 'time' ? `<span class="ko-why">🏁 Döntő csapás: ${S.killShot}</span>` : ''}${reward}
    <button class="btn small ghost res-log" data-log>📜 Mi történt a meccsen?</button>
    <div class="row"><button class="btn" data-r="menu">Menü</button><button class="btn primary" data-r="pvp">PvP</button></div></div>`;
  o.onclick = e => { if (e.target.closest('[data-log]')) { openLog(); return; } const b = e.target.closest('[data-r]'); if (!b) return; o.remove();
    if (b.dataset.r === 'pvp') pvpLeave(); else { pvpLeave(); renderMenuFan(); renderProfileBar(); show('scr-menu'); } };
  setTimeout(() => $('#layer').appendChild(o), 700);
}
function pvpCleanup() {   // régi, lezárt meccsek és elavult kihívások törlése (csak a sajátjait törli)
  const now = Date.now();
  for (const d of PVP.list) {
    if (d.host?.uid !== Store.uid) continue;
    if ((d.status === 'done' && now - (d.updated || 0) > 7 * 864e5) || (d.status === 'open' && (d.live ? now - (d.seen || 0) > 60000 : now - (d.created || 0) > 3 * 864e5))) pvpDoc(d.id).delete().catch(() => {});
  }
}
// ---- élő PvP: keresés, szoba (azonnali jelzés, jelenlét, gyors üzenetek), körszámláló ----
function pvpOnline() {   // kik vannak most a PvP-ben (a jelenlétük alapján)
  if (!PVP.room) return null;
  const seen = new Map();
  for (const p of PVP.room.peers()) { const pr = p.presence || {}; if (pr.pvp && pr.uid && pr.uid !== Store.uid) seen.set(pr.uid, pr.name || 'Valaki'); }
  return [...seen.values()];
}
function pvpPresence() {
  const inPvp = !!PVP.searching || !!(S && S.pvp) || !$('#scr-pvp').hidden;
  PVP.room?.presence({ pvp: inPvp ? 1 : 0, uid: Store.uid || '', name: Store.p?.name || '' }).catch(() => {});
}
async function pvpRoomInit() { if (TEST_MODE) return;
  try { PVP.room = await window.claude?.use?.('room') ?? null; } catch { PVP.room = null; }
  if (!PVP.room) return;
  let t = null;
  PVP.room.onPeers(() => { clearTimeout(t); t = setTimeout(() => { if (!$('#scr-pvp').hidden) renderPvp(); }, 300); }, () => {});
  pvpPresence();
}
async function pvpJoinRoom(id, side) {
  if (!PVP.room || PVP.mroom) return;
  try {
    const r = await PVP.room.join('m-' + id.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 44));
    if (!S?.pvp || S.pvp.id !== id) { r.leave().catch(() => {}); return; }
    PVP.mroom = r;
    r.presence({ uid: Store.uid, side }).catch(() => {});
    PVP.mroomOff = [
      r.on('ping', m => { if (!m.isMe) pvpRefetch(); }, () => {}),
      r.on('emote', m => { if (!m.isMe && typeof m.data?.k === 'number') pvpShowEmote(BOT, m.data.k); }, () => {}),
      r.onPeers(() => pvpOppDot(), () => {}),
    ];
  } catch {}
}
function pvpRefetch() { if (!PVP.id) return; const id = PVP.id; pvpDoc(id).get().then(s => { if (s.exists && PVP.id === id) pvpOnMatch({ id, ...s.data() }); }).catch(() => {}); }
function pvpOppOnline() {
  if (!PVP.mroom) return null;
  return PVP.mroom.peers().some(p => !p.isMe && p.presence?.uid && p.presence.uid !== Store.uid);
}
function pvpOppDot() {
  const bar = $('#eBar'); if (!bar || !S?.pvp) return;
  let dot = bar.querySelector('.odot');
  if (!dot) { const sm = bar.querySelector('.hname small'); if (!sm) return; dot = document.createElement('i'); dot.className = 'odot'; sm.prepend(dot); }
  const on = pvpOppOnline(); dot.className = 'odot' + (on === true ? ' on' : on === false ? ' off' : ''); dot.title = on ? 'Online' : on === false ? 'Nincs itt' : '';
}
const EMOTES = ['Szia! 👋', 'Jó lépés! 👍', 'Hoppá… 😅', 'Ezt nézd! 😎', 'Köszi! 🍻', 'Na ne! 😤'];
function pvpShowEmote(side, k) {
  const bar = side === ME ? $('#pBar') : $('#eBar'); if (!bar || !EMOTES[k]) return;
  const r = bar.getBoundingClientRect(), b = document.createElement('div');
  b.className = 'emote' + (side === ME ? ' me' : ''); b.textContent = EMOTES[k];
  b.style.left = Math.max(8, side === ME ? r.left + 70 : r.right - 240) + 'px';
  b.style.top = (side === ME ? r.top - 46 : r.bottom + 8) + 'px';
  $('#layer').appendChild(b); setTimeout(() => b.remove(), 2600);
}
function pvpEmoteMenu() {
  if (!S?.pvp) return;
  if (!PVP.mroom) return toast('A gyors üzenetek most nem érhetők el');
  const o = document.createElement('div'); o.className = 'overlay emo-pick';
  o.innerHTML = `<div class="emo-box">${EMOTES.map((t, k) => `<button class="btn" data-k="${k}">${t}</button>`).join('')}</div>`;
  o.onclick = e => { const b = e.target.closest('[data-k]'); o.remove(); if (!b) return;
    if (Date.now() - PVP.lastEmote < 2500) return toast('Kicsit lassabban 🙂');
    PVP.lastEmote = Date.now(); const k = +b.dataset.k;
    pvpShowEmote(ME, k); PVP.mroom?.emit('emote', { k }).catch(() => {}); };
  $('#layer').appendChild(o);
}
// gyors (élő) meccs keresése: ha van friss élő kihívás, beugrunk; ha nincs, nyitunk egyet és várunk
function pvpQuick(dk) {
  PVP.searchDeck = dk; PVP.searchT0 = Date.now();
  const o = document.createElement('div'); o.className = 'overlay pv-search';
  o.innerHTML = `<div class="modal"><div class="pv-spin">⚔️</div><h3>${PVP.friendTo ? `Várjuk: ${escH(PVP.friendTo.name)}` : PVP.ranked ? '🏆 Ranked ellenfél keresése…' : 'Ellenfél keresése…'}</h3><p class="live" id="pvSearchT">0:00</p><p class="live">${PVP.ranked ? (PVP.rkBot ? '20 másodpercig élő ellenfelet keresünk – ha nincs senki, egy bot ellen játszol, a rangod úgy is számít.' : 'Élő ellenfelet keresünk – addig várunk, amíg valaki nem jön. Szólj a haveroknak, hogy nyomják meg ők is a Ranked meccset!') : PVP.friendTo ? 'Elküldtük neki a kihívást – amint elfogadja, indul a meccs.' : 'Amint valaki más is élő meccset keres, indul a játék. Szólj a haveroknak, hogy nyomják meg ők is az „Élő meccs keresése” gombot!'}</p><button class="btn" data-x>Mégse</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]')) pvpStopSearch(true); };
  $('#layer').appendChild(o);
  pvpSearchTick(); PVP.hb = setInterval(pvpSearchTick, 4000);
  PVP.searchClock = setInterval(() => { const s = Math.floor((Date.now() - PVP.searchT0) / 1000), el = $('#pvSearchT'); if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
  pvpPresence();
}
async function pvpSearchTick() {
  if (!PVP.searchDeck) return;
  const now = Date.now(), mine = PVP.searching && PVP.list.find(d => d.id === PVP.searching);
  if (mine && mine.status !== 'open') return;
  const cands = PVP.friendTo ? [] : PVP.list.filter(d => d.live && d.status === 'open' && !d.guest && !d.to && !!d.ranked === !!PVP.ranked && pvpVerOk(d) && d.host?.uid !== Store.uid && now - (d.seen || 0) < 20000).sort((a, b) => (a.created || 0) - (b.created || 0));
  const target = cands.find(d => !mine || (d.created || 0) < (mine.created || 0));   // a később indult keresés csatlakozik a korábbihoz
  if (target) {
    const dk = PVP.searchDeck;
    if (PVP.searching) { await pvpDoc(PVP.searching).delete().catch(() => {}); PVP.searching = null; }
    clearInterval(PVP.hb);
    const ok = await pvpJoin(target.id, dk);
    if (ok) { pvpStopSearch(); return; }
    if (PVP.searchDeck) PVP.hb = setInterval(pvpSearchTick, 4000);
    return;
  }
  if (PVP.ranked && PVP.rkBot && now - PVP.searchT0 > 20000 && !PVP.friendTo) {   // ranked: 20 mp után bot
    /* 2026-10-18 javítás: előbb atomian lezárjuk a saját keresésünket – ha közben valaki csatlakozott, az élő meccsbe lépünk, nem a bothoz */
    const dk = PVP.searchDeck; clearInterval(PVP.hb); PVP.hb = null;
    const r = await pvpCloseSearch(PVP.searching);
    if (!PVP.searchDeck && !r.joined) return;   /* közben Mégse */
    if (r.joined) { pvpStopSearch(); pvpEnter(r.joined.id, r.joined); return; }
    if (r.err) { if (PVP.searchDeck) PVP.hb = setInterval(pvpSearchTick, 4000); return; }
    PVP.searching = null; pvpStopSearch(true); rankedBot(dk); return;
  }
  if (!mine && !PVP.creating && !PVP.searching) {
    PVP.creating = true;
    const ft = PVP.friendTo, extra = ft ? { to: ft.uid, toName: ft.name } : {};
    try { const ref = await Store.db.collection('pvp').add({ parts: ft ? [Store.uid, ft.uid] : [Store.uid], status: 'open', live: true, created: now, seen: now, updated: now, host: pvpMe(PVP.searchDeck), guest: null, v: 0, ...(PVP.ranked && !ft ? { ranked: true } : {}), ...extra }); PVP.searching = ref.id; }
    catch { toast('Nem sikerült keresést indítani (lehet, hogy nincs írási jogod)'); pvpStopSearch(); }
    finally { PVP.creating = false; }
  } else if (mine) { PVP.friendSeen = true; pvpDoc(mine.id).update({ seen: now }).catch(() => {}); }
  else if (PVP.friendTo && PVP.searching && PVP.friendSeen) { toast(`${PVP.friendTo.name} most nem ér rá`); pvpStopSearch(); }   // elutasította (törölte a kihívást)
}
// a saját nyitott keresés lezárása tranzakcióban: { closed } = töröltük; { joined: doc } = valaki már csatlakozott; { err } = nem sikerült
async function pvpCloseSearch(id) {
  if (!id) return { closed: true };
  const ref = pvpDoc(id);
  try {
    const r = await Store.db.runTransaction(async tx => {
      const sn = await tx.get(ref); if (!sn.exists) return { closed: true };
      const d = sn.data();
      if (d.status === 'open' && !d.guest) { tx.delete(ref); return { closed: true }; }
      return { joined: { id, ...d } };
    });
    if (r.joined && !r.joined.state) { const sn = await ref.get(); if (sn.exists) r.joined = { id, ...sn.data() }; }
    return r;
  } catch (e) { return { err: true }; }
}
function pvpStopSearch(cancel) {
  clearInterval(PVP.hb); clearInterval(PVP.searchClock); PVP.hb = null;
  if (cancel && PVP.searching) { const sid = PVP.searching;   /* tranzakcióval: ha közben valaki csatlakozott, nem töröljük alóla – a meccs a PvP-listában folytatható */
    pvpCloseSearch(sid).then(r => { if (r.joined && r.joined.status === 'mull') toast('Közben csatlakozott valaki – a meccset a PvP menüben folytathatod'); }); }
  PVP.searching = null; PVP.searchDeck = null; PVP.friendTo = null; PVP.friendSeen = false; PVP.ranked = false;
  $('#layer .pv-search')?.remove(); pvpPresence();
  // ha egy lezárt meccs képernyőjén maradt (pl. „Újabb ranked” → Mégse), vigyük vissza a menübe
  if (cancel && !$('#scr-game').hidden && (!S || S.winner != null)) { busy = false; S = null; renderMenuFan(); renderProfileBar(); show('scr-menu'); }
}
// körszámláló élő meccsben; ha a soros játékos nincs ott, a másik gép zárja le helyette a kört
async function pvpAutoEnd() {
  if (busy || PVP.running || !S?.pvp || S.winner != null || S.active === ME) return;
  busy = true; render();
  pvpSeed(); await resolveEnd(); unseedRng();
  const afk = [...PVP.afk]; afk[BOT] = (afk[BOT] || 0) + 1; PVP.afk = afk;
  if (afk[BOT] >= 2 && S.winner == null) { S.winner = ME; S.reason = 'afk'; }
  pvpPush('end', { auto: true }, { afk });
  busy = false; render();
  if (S.winner != null) return endMatch();
  toast('Az ellenfél nem lépett – a köre lejárt, te jössz!');
}
setInterval(() => {
  const bar = $('#ttBar'); if (!bar) return;
  if (!S?.pvp?.live || S.winner != null || $('#scr-game').hidden) { bar.hidden = true; return; }
  if (S.phase === 'mulligan') { bar.hidden = true; if (PVP.id) pvpTryFinalize(PVP.id); return; }
  const left = TURN_SEC - (Date.now() - PVP.turnAt) / 1000, l = Math.max(0, left);
  bar.hidden = false;
  bar.querySelector('i').style.width = Math.min(100, l / TURN_SEC * 100) + '%';
  bar.querySelector('span').textContent = `${S.active === ME ? 'Te' : 'Ő'} · ${Math.floor(l / 60)}:${String(Math.floor(l % 60)).padStart(2, '0')}`;
  bar.classList.toggle('low', l <= 15); bar.classList.toggle('mine', S.active === ME);
  if (left <= 0 && S.active === ME && !busy && !PVP.running) { toast('Lejárt az időd!'); $('#endBtn').onclick(); }
  else if (left <= -AFK_GRACE && S.active !== ME) pvpAutoEnd();
}, 500);
$('#emoBtn').onclick = () => pvpEmoteMenu();

$('#goPvp').onclick = () => { if (needProfile()) return; if (TEST_MODE) return toast('🧪 A teszt oldalon ez nem elérhető'); pvpStart(); renderPvp(); show('scr-pvp'); pvpPresence(); };

// ---- menü gombok ----
$('#goShop').onclick = () => { if (needProfile()) return; renderShop(); show('scr-shop'); };
$('#goDecks').onclick = () => { if (needProfile()) return; renderDecks(); show('scr-decks'); };
$('#goWheel').onclick = () => { if (needProfile()) return; openWheel(); };
$('#goQuests').onclick = () => { if (needProfile()) return; if (ahqLive() && !Store.p.ahqSeen) { Store.p.ahqSeen = true; save(); renderQuestBadge(); } renderQuests(); show('scr-quests'); };

bootProfile();

// ======================= Barátok: barátkód, jelölés, kihívás, lapcsere (csak a saját appban) =======================
// Firestore: pub/<uid> (nyilvános kártya: név, kód, győzelmek, cserélhető lapok) · friends/<a_b> (parts, status) · trades/<id> (parts, from, to, give, want, status)
const FR = { list: [], trades: [], pub: {}, unsubF: null, unsubT: null, seenCh: new Set(), busy: false, pubT: null };
const FR_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const frCode = uid => { let h = pvpHash('bou:' + uid), s = ''; for (let i = 0; i < 6; i++) { s += FR_ABC[h % 32]; h = Math.floor(h / 32) ^ pvpHash(s + uid); h >>>= 0; } return s; };
const frOn = () => !!(window.APP_MODE && Store.db && Store.uid && Store.p);
const frPair = (a, b) => [a, b].sort().join('_');
const frOther = d => d.parts.find(u => u !== Store.uid);
const frName = uid => FR.pub[uid]?.name || (FR.list.find(d => frOther(d) === uid) || {}).names?.[uid] || 'Barát';
const tradable = id => { const c = CARD[id]; return c && !c.token && !c.variantOf && !c.foilOnly && !c.passOnly && !c.eventOnly && !c.shopOnly; };
const RAR_ORDER = { l: 0, e: 1, r: 2, k: 3 };
// eszköztípus (2026-10-13): megmérjük, ki milyen eszközön játszik (telefon / tablet / gép) – a nagy képernyős fejlesztésekhez
function devKind() {
  const touch = navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches, a = Math.min(screen.width, screen.height);
  return touch ? (a >= 600 ? 'tablet' : 'phone') : 'pc';
}
function frPubSync(now) { if (TEST_MODE) return;
  if (!frOn()) return;
  clearTimeout(FR.pubT);
  FR.pubT = setTimeout(() => {
    const p = Store.p, coll = {};
    for (const [id, e] of Object.entries(p.coll || {})) if (tradable(id) && (e.n || e.f)) coll[id] = [e.n || 0, e.f || 0];
    const rk = ensureRank(p); Store.db.doc('pub/' + Store.uid).set({ name: p.name, code: frCode(Store.uid), w: p.stats?.w || 0, rank: { season: rk.season, t: rk.t, st: rk.st, lp: rk.lp, g: rk.games || 0, w: rk.w || 0 }, rkh: Object.fromEntries(Object.entries(p.rkHist || {}).slice(-4)), crown: crownOk(p.crown) ? { k: p.crown.k, until: p.crown.until } : null, coll, ver: window.APP_VERSION || '', dev: devKind(), updated: Date.now() }).catch(() => {});
  }, now ? 50 : 2500);
}
// ---- meghívó link: …/?inv=<barátkód> – aki ezzel regisztrál (vagy belép), automatikusan barátja lesz a meghívónak ----
const INV_URL = 'https://bestofus.pages.dev/';
const frInvGet = () => { try { return localStorage.getItem('bou_inv') || ''; } catch { return ''; } };
async function frInvName(code) {
  try { const q = await Store.db.collection('pub').where('code', '==', code).limit(1).get(); return q.empty ? '' : (q.docs[0].data().name || 'Valaki'); } catch { return ''; }
}
async function frApplyInvite() {
  const code = frInvGet(); if (!code || !frOn() || FR.invBusy) return;
  FR.invBusy = true;
  try {
    if (code === frCode(Store.uid)) return localStorage.removeItem('bou_inv');
    const q = await Store.db.collection('pub').where('code', '==', code).limit(1).get();
    if (q.empty) return localStorage.removeItem('bou_inv');
    const doc = q.docs[0], uid = doc.id, other = doc.data(), id = frPair(Store.uid, uid);
    const ex = await Store.db.doc('friends/' + id).get().catch(() => null);
    if (ex?.exists && ex.data().status === 'accepted') { localStorage.removeItem('bou_inv'); return; }
    // a meghívó a linkkel már beleegyezett → rögtön elfogadott barátság
    await Store.db.doc('friends/' + id).set({ parts: [Store.uid, uid], from: uid, names: { [Store.uid]: Store.p.name, [uid]: other.name || '' }, status: 'accepted', via: 'invite', created: Date.now(), since: Date.now() });
    localStorage.removeItem('bou_inv');
    toast(`🤝 ${other.name || 'A meghívód'} mostantól a barátod!`);
  } catch (e) { /* majd a következő indításkor újra */ }
  finally { FR.invBusy = false; }
}
async function frShareInvite() {
  const code = frCode(Store.uid), url = INV_URL + '?inv=' + code;
  const text = `Gyere játszani velem a Best of Us-ban – a banda saját kártyajátéka! A linkkel regisztrálva automatikusan barátok leszünk (meghívó kódom: ${code}).`;
  try { if (navigator.share) { await navigator.share({ title: 'Best of Us', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); toast('Meghívó link kimásolva ✔'); } catch { toast(url); }
}
function frStart() { if (TEST_MODE) return;
  if (!frOn() || FR.unsubF) return;
  frPubSync(true);
  FR.unsubF = Store.db.collection('friends').where('parts', 'array-contains', Store.uid).onSnapshot(s => {
    FR.list = s.docs.map(d => ({ id: d.id, ...d.data() }));
    if (frInvGet()) frApplyInvite();
    FR.list.filter(d => d.status === 'accepted').forEach(d => frFetchPub(frOther(d)));
    frRefresh();
  }, () => { FR.unsubF = null; });
  FR.unsubT = Store.db.collection('trades').where('parts', 'array-contains', Store.uid).onSnapshot(s => {
    FR.trades = s.docs.map(d => ({ id: d.id, ...d.data() }));
    frProcessTrades(); frRefresh();
  }, () => { FR.unsubT = null; });
}
async function frFetchPub(uid, force) {
  if (!uid || (FR.pub[uid] && !force && Date.now() - FR.pub[uid]._at < 60000)) return FR.pub[uid];
  try { const s = await Store.db.doc('pub/' + uid).get(); if (s.exists) { FR.pub[uid] = { ...s.data(), _at: Date.now() }; frRefresh(); } } catch {}
  return FR.pub[uid];
}
const frIncomingCh = () => PVP.list.filter(d => d.status === 'open' && d.to === Store.uid && d.live && Date.now() - (d.seen || 0) < 20000);
function frBadgeCount() {
  if (!frOn()) return 0;
  const req = FR.list.filter(d => d.status === 'pending' && d.from !== Store.uid).length;
  const tr = FR.trades.filter(t => t.status === 'offer' && t.to === Store.uid).length;
  return req + tr + frIncomingCh().length;
}
function frRefresh() {
  const b = $('#friendBadge'); if (b) { const n = frBadgeCount(); b.hidden = !n; b.textContent = n; }
  const t = $('#goFriends'); if (t) t.hidden = !window.APP_MODE;
  if (!$('#scr-friends').hidden) renderFriends();
}
// PvP-listából: új kihívás érkezett tőle → felugró ablak
function frOnPvpList() {
  if (!frOn()) return;
  for (const d of frIncomingCh()) {
    if (FR.seenCh.has(d.id)) continue; FR.seenCh.add(d.id);
    if (S && !$('#scr-game').hidden) { toast(`⚔️ ${d.host?.name || 'Egy barátod'} kihívott! (Barátok menü)`); continue; }
    frChallengePopup(d);
  }
  frRefresh();
}
function frChallengePopup(d) {
  const o = document.createElement('div'); o.className = 'overlay fr-ch';
  o.innerHTML = `<div class="modal acct-box fr-chbox"><div class="pv-spin">⚔️</div><h3></h3><p class="live">Élő meccsre hív – ${escH(HERO[d.host?.hero]?.name || '')} paklival.</p>
    <button class="btn primary" data-a="ok">Elfogadom</button><button class="btn" data-a="no">Most nem</button></div>`;
  o.querySelector('h3').textContent = `${d.host?.name || 'Egy barátod'} kihívott!`;
  o.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; o.remove();
    if (b.dataset.a === 'no') return pvpDoc(d.id).delete().catch(() => {});
    frAcceptChallenge(d); };
  $('#layer').appendChild(o);
}
function frAcceptChallenge(d) {
  const cur = PVP.list.find(x => x.id === d.id);
  if (!cur || cur.status !== 'open') return toast('Ez a kihívás már nem él');
  if (!pvpVerOk(cur)) return toast(window.APP_NEWER?.() ? 'Frissítsd a játékot (fent: Frissítés), utána játszhattok!' : 'Neki régebbi verziója van – szólj neki, hogy frissítsen!');
  pvpPickDeck('Melyik paklival fogadod el?', dk => pvpJoin(d.id, dk));
}
function frChallenge(uid) {
  if (PVP.searching) return toast('Már vársz egy meccsre');
  const name = frName(uid);
  pvpPickDeck(`Melyik paklival hívod ki: ${escH(name)}?`, dk => { PVP.friendTo = { uid, name }; PVP.friendSeen = false; pvpQuick(dk); });
}
// ---- barátjelölés ----
async function frAdd(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) return toast('A barátkód 6 karakter');
  if (code === frCode(Store.uid)) return toast('Ez a saját kódod 🙂');
  try {
    const q = await Store.db.collection('pub').where('code', '==', code).limit(1).get();
    if (q.empty) return toast('Nincs ilyen kódú játékos');
    const doc = q.docs[0], uid = doc.id, other = doc.data();
    const id = frPair(Store.uid, uid), ex = FR.list.find(d => d.id === id);
    if (ex?.status === 'accepted') return toast(`${other.name} már a barátod`);
    if (ex?.status === 'pending' && ex.from !== Store.uid) { await frAccept(id); return; }
    await Store.db.doc('friends/' + id).set({ parts: [Store.uid, uid], from: Store.uid, names: { [Store.uid]: Store.p.name, [uid]: other.name || '' }, status: 'pending', created: Date.now() });
    toast(`Jelölés elküldve: ${other.name}`);
  } catch (e) { toast('Nem sikerült – próbáld újra'); }
}
async function frAccept(id) { try { await Store.db.doc('friends/' + id).update({ status: 'accepted', since: Date.now(), ['names.' + Store.uid]: Store.p.name }); toast('Új barát! 🤝'); } catch { toast('Nem sikerült'); } }
async function frRemove(id) { try { await Store.db.doc('friends/' + id).delete(); } catch { toast('Nem sikerült'); } }
// ---- lapcsere: azonos ritkaság, Full Art csak Full Artra, naponta egy ----
const tradeDoneToday = () => Store.p?.tradeDay === today();
const myPendingOffer = () => FR.trades.find(t => t.from === Store.uid && t.status === 'offer');
function collTake(p, id, foil) { const e = p.coll[id]; if (!e) return false; if (foil) { if (!(e.f > 0)) return false; e.f--; } else { if (!(e.n > 0)) return false; e.n--; } return true; }
function collGive(p, id, foil) { const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); if (foil) e.f++; else e.n++; }
const tHist = (p, withName, gave, got) => { p.tradeHist = [{ at: Date.now(), with: withName || 'Barát', gave, got }].concat(p.tradeHist || []).slice(0, 40); };
const tLog = (p, id) => { p.tradeLog = (p.tradeLog || []).concat(id).slice(-40); };
const cardLabel = (c) => `${CARD[c.id].name}${c.foil ? ' (Full Art)' : ''}`;
async function frProcessTrades() {
  const p = Store.p; if (!p || FR.busy) return;
  FR.busy = true;
  try {
    for (const t of FR.trades) {
      if (t.from !== Store.uid) continue;
      const done = (p.tradeLog || []).includes(t.id);
      if (t.status === 'accepted' && !done) {          // a barát elfogadta: megkapom, amit kértem
        collGive(p, t.want.id, t.want.foil); tLog(p, t.id); tHist(p, t.names?.[t.to], t.give, t.want); await save();
        toast(`🔄 Csere kész: megkaptad – ${cardLabel(t.want)}!`);
        await Store.db.doc('trades/' + t.id).delete().catch(() => {});
      } else if (t.status === 'accepted' && done) await Store.db.doc('trades/' + t.id).delete().catch(() => {});
      else if (t.status === 'declined') {              // elutasította: visszakapom a félretett lapot, és ma újra próbálhatok
        if (!done) { collGive(p, t.give.id, t.give.foil); tLog(p, t.id); if (p.tradeDay === today() && t.day === today()) p.tradeDay = ''; await save();
          toast(`${escH(t.names?.[t.to] || 'A barátod')} most nem kérte a cserét – visszakaptad a lapod`); }
        await Store.db.doc('trades/' + t.id).delete().catch(() => {});
      }
    }
  } finally { FR.busy = false; }
}
async function frOffer(uid, want, give) {
  const p = Store.p;
  if (tradeDoneToday()) return toast('Ma már cseréltél – holnap újra!');
  if (myPendingOffer()) return toast('Már van egy függő cserejavaslatod');
  if (!collTake(p, give.id, give.foil)) return toast('Ez a lap már nincs meg');
  p.tradeDay = today(); await save();                  // a felajánlott lap félre van téve, amíg a barát dönt
  try {
    await Store.db.collection('trades').add({ parts: [Store.uid, uid], from: Store.uid, to: uid, names: { [Store.uid]: p.name, [uid]: frName(uid) },
      give, want, status: 'offer', day: today(), created: Date.now() });
    toast('Cserejavaslat elküldve 🔄');
  } catch { collGive(p, give.id, give.foil); p.tradeDay = ''; await save(); toast('Nem sikerült elküldeni'); }
}
async function frCancelOffer(t) {
  let ok = false;
  try { ok = await Store.db.runTransaction(async tx => { const r = Store.db.doc('trades/' + t.id), s = await tx.get(r); if (!s.exists || s.data().status !== 'offer') return false; tx.update(r, { status: 'cancelled' }); return true; }); } catch {}
  if (!ok) return toast('Már nem vonható vissza – nézd meg, mi lett vele');
  const p = Store.p; collGive(p, t.give.id, t.give.foil); tLog(p, t.id); if (p.tradeDay === today() && t.day === today()) p.tradeDay = ''; await save();
  await Store.db.doc('trades/' + t.id).delete().catch(() => {}); toast('Cserejavaslat visszavonva');
}
async function frAnswer(t, yes) {
  const p = Store.p, r = Store.db.doc('trades/' + t.id);
  if (!yes) { await r.update({ status: 'declined' }).catch(() => {}); return; }
  if (tradeDoneToday()) return toast('Ma már cseréltél – holnap fogadhatod el!');
  const e = p.coll[t.want.id]; if (!e || !(t.want.foil ? e.f > 0 : e.n > 0)) return toast('Ez a lap már nincs meg neked');
  let ok = false;
  try { ok = await Store.db.runTransaction(async tx => { const s = await tx.get(r); if (!s.exists || s.data().status !== 'offer') return false; tx.update(r, { status: 'accepted', at: Date.now() }); return true; }); } catch {}
  if (!ok) return toast('Ezt a cserét már visszavonták');
  collTake(p, t.want.id, t.want.foil); collGive(p, t.give.id, t.give.foil); p.tradeDay = today(); tLog(p, t.id); tHist(p, t.names?.[t.from], t.want, t.give);
  await save(); frPubSync();
  toast(`🔄 Csere kész: megkaptad – ${cardLabel(t.give)}!`);
}
// csere összeállítása: 1) mit kérsz tőle 2) mit adsz érte 3) megerősítés
async function frTradeModal(uid) {
  if (tradeDoneToday()) return toast('Ma már cseréltél – holnap újra!');
  if (myPendingOffer()) return toast('Már van egy függő cserejavaslatod – várd meg, vagy vond vissza');
  const pub = await frFetchPub(uid, true); if (!pub) return toast('Nem sikerült betölteni a lapjait');
  const name = pub.name || 'Barát';
  const theirs = [];
  for (const [id, [n, f]] of Object.entries(pub.coll || {})) { if (!tradable(id)) continue; if (n > 0) theirs.push({ id, foil: false, k: n }); if (f > 0) theirs.push({ id, foil: true, k: f }); }
  const sortC = a => a.sort((x, y) => (x.foil === y.foil ? 0 : x.foil ? -1 : 1) || RAR_ORDER[CARD[x.id].rarity] - RAR_ORDER[CARD[y.id].rarity] || CARD[x.id].cost - CARD[y.id].cost);
  sortC(theirs);
  const o = document.createElement('div'); o.className = 'overlay fr-trade';
  /* szűrés + keresés a cserében (2026-10-19, Tomi): név/szöveg, szett, fajta, ritkaság, Full Art – lépésenként külön */
  const TF = { q: '', set: '', type: '', rar: '', fa: '' };
  const tfOk = c => { const C = CARD[c.id];
    return (!TF.q || cfNorm(C.name + ' ' + (C.text || '')).includes(cfNorm(TF.q))) && (!TF.set || cardSet(C) === TF.set) && (!TF.type || C.type === TF.type)
      && (!TF.rar || C.rarity === TF.rar) && (!TF.fa || (TF.fa === 'fa') === !!c.foil); };
  const tfBar = rar => { const ch = (g, v, t) => `<button class="cf-chip${TF[g] === v ? ' on' : ''}" data-tf="${g}" data-v="${v}" aria-pressed="${TF[g] === v}">${t}</button>`;
    return `<div class="tr-filt"><label class="cf-search"><span class="sr-only">Keresés</span><input class="tr-q" type="search" placeholder="Keresés…" value="${escH(TF.q)}" autocomplete="off"></label>
      <div class="cf-row">${cfSets().map(([k, n]) => ch('set', k, `<span class="lbl-t">${k === 'hw' ? '🎃 ' : k === 'ah' ? '🌷 ' : ''}${k === 'ah' ? 'Amsterdam' : n}</span>`)).join('')}</div>
      <div class="cf-row">${CF_TYPES.map(([k, n]) => ch('type', k, `<img src="art/ui/ic-type-${k}.webp" alt=""><span class="lbl-t">${n}</span>`)).join('')}</div>
      ${rar ? `<div class="cf-row">${['k', 'r', 'e', 'l'].map(k => ch('rar', k, `<i class="rar r-${k}" aria-label="${RAR[k]}"></i>`)).join('')}${ch('fa', 'n', '<span class="lbl-t">Sima</span>')}${ch('fa', 'fa', '<span class="lbl-t">Full Art</span>')}</div>` : ''}</div>`; };
  const tfReset = () => { TF.q = TF.set = TF.type = TF.rar = TF.fa = ''; };
  const cell = (c, i, pick) => `<button class="tr-c" data-${pick}="${i}">${cardHTML(c.id, { foil: c.foil })}<span class="tr-n">×${c.k}${pick === 'w' && owned(c.id) ? ` · neked ${owned(c.id)}` : ''}</span></button>`;
  const grid = (arr, pick, extra) => { const v = arr.map((c, i) => [c, i]).filter(([c]) => tfOk(c)), x = (extra || []).filter(tfOk);
    if (!v.length && !x.length) return `<div class="tr-grid"><p class="q-note tr-none">${arr.length ? 'Nincs a szűrésnek megfelelő lap.' : pick === 'w' ? 'Neki még nincs cserélhető lapja.' : ''}</p></div>`;
    return `<div class="tr-grid">${v.map(([c, i]) => cell(c, i, pick)).join('')}${x.map(c => `<div class="tr-c tr-off">${cardHTML(c.id, { foil: c.foil })}<span class="tr-n">${c.why}</span></div>`).join('')}</div>`; };
  const tfWire = (arr, pick, extra) => { const box = o.querySelector('.tr-box'), q = box.querySelector('.tr-q');
    const re = () => { box.querySelector('.tr-grid').outerHTML = grid(arr, pick, extra && TF.q ? extra : null); };
    q.oninput = () => { TF.q = q.value.trim(); re(); };
    box.querySelector('.tr-filt').onclick = e => { const b = e.target.closest('[data-tf]'); if (!b) return; e.stopPropagation();
      TF[b.dataset.tf] = TF[b.dataset.tf] === b.dataset.v ? '' : b.dataset.v;
      box.querySelectorAll(`[data-tf="${b.dataset.tf}"]`).forEach(x => { const on = TF[x.dataset.tf] === x.dataset.v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); re(); }; };
  const step1 = () => {
    o.innerHTML = `<div class="modal tr-box"><h3>${escH(name)} lapjai – melyiket kéred?</h3><p class="live">Csak azonos ritkaságú lapot adhatsz érte, Full Artot Full Artért. Naponta egy csere.</p>
      ${theirs.length ? tfBar(true) : ''}${grid(theirs, 'w')}<button class="btn" data-x>Mégse</button></div>`;
    if (theirs.length) tfWire(theirs, 'w');
  };
  let want = null;
  const step2 = () => {
    const mine = []; for (const [id, e] of Object.entries(Store.p.coll)) { if (!tradable(id) || id === want.id || CARD[id].rarity !== CARD[want.id].rarity) continue; const k = want.foil ? e.f : e.n; if (k > 0) mine.push({ id, foil: want.foil, k }); }
    sortC(mine); o._mine = mine;
    /* kereséskor a többi (más ritkaságú / nem Full Art) lapod is látszik, szürkén, hogy kiderüljön, miért nem adható */
    const off = [], wr = CARD[want.id].rarity; for (const [id, e] of Object.entries(Store.p.coll)) { if (!tradable(id) || mine.some(m => m.id === id) || !(e.n || e.f)) continue;
      const k = want.foil ? e.f : e.n, foil = k > 0 ? want.foil : !want.foil;   /* miért nem adható: ugyanaz a lap / más ritkaság / csak a másik változat (Full Art ↔ sima) van meg */
      off.push({ id, foil, k: k || (want.foil ? e.n : e.f), why: id === want.id ? 'Ugyanezt a lapot kéred' : CARD[id].rarity !== wr ? `${RAR[CARD[id].rarity]} – ezért nem adható` : want.foil ? 'Csak sima példányod van – Full Artért nem adható' : 'Csak Full Art példányod van – csak Full Artért adható' }); }
    const faOnly = off.filter(c => c.id !== want.id && CARD[c.id].rarity === wr).length;
    tfReset();
    o.innerHTML = `<div class="modal tr-box"><h3>Mit adsz érte?</h3><div class="tr-want">${cardHTML(want.id, { foil: want.foil })}<span>${RAR[CARD[want.id].rarity]}${want.foil ? ' · Full Art' : ''} – csak ${want.foil ? 'Full Art ' : ''}${RAR[CARD[want.id].rarity].toLowerCase()} lapot adhatsz érte</span></div>
      ${faOnly ? `<p class="q-note tr-fa">ℹ️ ${faOnly} ${RAR[wr].toLowerCase()} lapod csak ${want.foil ? 'sima' : 'Full Art'} változatban van meg – ${want.foil ? 'sima lapért' : 'Full Art lapért'} adhatod őket (keresésnél szürkén látszanak).</p>` : ''}${mine.length || off.length ? tfBar(false) + grid(mine, 'g') : ''}${mine.length ? '' : `<p class="q-note">Nincs olyan ${want.foil ? 'Full Art ' : ''}${RAR[wr].toLowerCase()} lapod, amit adhatnál érte.</p>`}<button class="btn" data-back1>Vissza</button></div>`;
    if (mine.length || off.length) tfWire(mine, 'g', off);
  };
  const step3 = give => {
    const inDeck = (Store.p.decks || []).some(d => d.list[give.id] && d.list[give.id] >= owned(give.id));
    o.innerHTML = `<div class="modal tr-box"><h3>Csere – ${escH(name)}</h3>
      <div class="tr-pair"><div>${cardHTML(give.id, { foil: give.foil })}<small>Adod</small></div><span class="tr-arrow">⇄</span><div>${cardHTML(want.id, { foil: want.foil })}<small>Kapod</small></div></div>
      ${owned(give.id) === 1 ? '<p class="tr-warn">⚠️ Ez az utolsó példányod ebből a lapból.</p>' : ''}${inDeck ? '<p class="tr-warn">⚠️ Az egyik paklidban szerepel – csere után hiányozni fog belőle.</p>' : ''}
      <p class="live">A lapod félreteszem, amíg ${escH(name)} dönt. Ha nemet mond, visszakapod.</p>
      <button class="btn primary" data-send>🔄 Csere ajánlása</button><button class="btn" data-back2>Vissza</button></div>`;
    o._give = give;
  };
  o.onclick = async e => {
    const b = e.target.closest('button'); if (e.target === o || (b && b.hasAttribute('data-x'))) return o.remove(); if (!b) return;
    if (b.dataset.w != null) { want = theirs[+b.dataset.w]; return step2(); }
    if (b.dataset.g != null) return step3(o._mine[+b.dataset.g]);
    if (b.hasAttribute('data-back1')) { tfReset(); return step1(); }
    if (b.hasAttribute('data-back2')) return step2();
    if (b.hasAttribute('data-send')) { b.disabled = true; o.remove(); await frOffer(uid, { id: want.id, foil: want.foil }, o._give); }
  };
  step1(); $('#layer').appendChild(o);
}
// ---- Barátok képernyő ----
function renderFriends() {
  const body = $('#frBody'); if (!body) return;
  if (!frOn()) { body.innerHTML = '<p class="q-note">A barátlista a Best of Us appban érhető el (bestofus.pages.dev).</p>'; return; }
  const me = Store.uid, online = new Set(); for (const pr of (PVP.room?.peers() || [])) if (pr.presence?.uid) online.add(pr.presence.uid);
  const reqIn = FR.list.filter(d => d.status === 'pending' && d.from !== me), reqOut = FR.list.filter(d => d.status === 'pending' && d.from === me);
  const fr = FR.list.filter(d => d.status === 'accepted').sort((a, b) => online.has(frOther(b)) - online.has(frOther(a)) || frName(frOther(a)).localeCompare(frName(frOther(b)), 'hu'));
  const chIn = frIncomingCh(), trIn = FR.trades.filter(t => t.status === 'offer' && t.to === me), trOut = FR.trades.filter(t => t.status === 'offer' && t.from === me);
  const av = n => `<span class="fr-av">${escH((n || '?').trim().charAt(0).toUpperCase())}</span>`;
  const mini = c => `<span class="fr-mini">${cardHTML(c.id, { foil: c.foil })}</span>`;
  body.innerHTML = `
    <div class="fr-code"><div><small>A te barátkódod</small><b>${frCode(me)}</b></div><button class="btn" data-copy>Másolás</button></div>
    <button class="btn primary fr-share" data-share>📤 Meghívó küldése</button>
    <p class="q-note fr-share-note">Aki a linkeddel regisztrál, automatikusan a barátod lesz.</p>
    <form class="fr-add" autocomplete="off"><input id="frIn" maxlength="7" placeholder="Barát kódja" autocapitalize="characters" spellcheck="false"><button class="btn primary">Jelölés</button></form>
    ${chIn.length ? `<div class="lbl">⚔️ Kihívtak</div>${chIn.map(d => `<div class="pv-row hot">${av(d.host?.name)}<div class="pv-txt"><b>${escH(d.host?.name || '')}</b><small>Élő meccsre vár · ${escH(HERO[d.host?.hero]?.name || '')}</small></div><button class="btn primary" data-chacc="${d.id}">Elfogadom</button></div>`).join('')}` : ''}
    ${trIn.length ? `<div class="lbl">🔄 Cserejavaslatok</div>${trIn.map(t => `<div class="tr-row"><div class="tr-who"><b>${escH(t.names?.[t.from] || 'Barát')}</b> cserélne veled</div>
      <div class="tr-pair sm"><div>${mini(t.give)}<small>Kapod</small></div><span class="tr-arrow">⇄</span><div>${mini(t.want)}<small>Adod${owned(t.want.id) ? ` (van ${owned(t.want.id)})` : ' – nincs meg!'}</small></div></div>
      <div class="tr-btns"><button class="btn primary" data-tyes="${t.id}">Elfogadom</button><button class="btn" data-tno="${t.id}">Nem</button></div></div>`).join('')}` : ''}
    ${reqIn.length ? `<div class="lbl">Jelöltek</div>${reqIn.map(d => `<div class="pv-row hot">${av(d.names?.[d.from])}<div class="pv-txt"><b>${escH(d.names?.[d.from] || 'Valaki')}</b><small>barátnak jelölt</small></div><div class="fr-btns"><button class="btn primary" data-acc="${d.id}">Elfogad</button><button class="btn ghost" data-rm="${d.id}">✕</button></div></div>`).join('')}` : ''}
    <div class="lbl">Barátaid (${fr.length})</div>
    ${fr.length ? fr.map(d => { const u = frOther(d), on = online.has(u), pub = FR.pub[u];
      return `<div class="pv-row fr-row">${av(frName(u))}<div class="pv-txt"><b>${escH(frName(u))}</b><small><i class="odot ${on ? 'on' : ''}"></i>${on ? 'Online' : 'Offline'}${pub ? ` · ${pub.w || 0} győzelem` : ''}</small></div>
        <div class="fr-btns"><button class="btn primary" data-ch="${u}" title="Kihívás">⚔️</button><button class="btn" data-tr="${u}" title="Csere">🔄</button><button class="btn ghost" data-rmf="${d.id}" title="Törlés">⋯</button></div></div>`; }).join('')
      : '<p class="q-note">Még nincs barátod. Küldd el a kódodat a haveroknak, vagy írd be az övékét!</p>'}
    ${reqOut.length ? `<div class="lbl">Elküldött jelölések</div>${reqOut.map(d => `<div class="pv-row mine">${av(d.names?.[frOther(d)])}<div class="pv-txt"><b>${escH(d.names?.[frOther(d)] || 'Barát')}</b><small>még nem fogadta el</small></div><button class="btn ghost" data-rm="${d.id}">Visszavon</button></div>`).join('')}` : ''}
    ${trOut.length ? `<div class="lbl">Elküldött csere</div>${trOut.map(t => `<div class="tr-row mine"><div class="tr-who">Várjuk <b>${escH(t.names?.[t.to] || 'a barátod')}</b> válaszát</div>
      <div class="tr-pair sm"><div>${mini(t.give)}<small>Adod</small></div><span class="tr-arrow">⇄</span><div>${mini(t.want)}<small>Kapod</small></div></div><div class="tr-btns"><button class="btn ghost" data-tcan="${t.id}">Visszavonom</button></div></div>`).join('')}` : ''}
    <div class="lbl">Csere-előzmények</div>${(Store.p.tradeHist || []).length ? `<div class="tr-hist">${Store.p.tradeHist.slice(0, FR.histAll ? 40 : 5).map(h => `<div class="th-row"><span class="fr-mini">${cardHTML(h.gave.id, { foil: h.gave.foil })}</span><span class="th-mid"><b>${escH(h.with)}</b><small>${new Date(h.at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}</small><span class="tr-arrow">⇄</span><small>adtad · kaptad</small></span><span class="fr-mini">${cardHTML(h.got.id, { foil: h.got.foil })}</span></div>`).join('')}</div>${Store.p.tradeHist.length > 5 && !FR.histAll ? '<button class="btn ghost" data-histall>Összes előzmény</button>' : ''}` : '<p class="q-note">Még nincs rögzített cseréd – a következő cserédtől itt látod, kivel mit mire cseréltél.</p>'}
    <p class="q-note">🔄 <b>Csere:</b> azonos ritkaságú lapok, Full Art csak Full Artért, naponta egy. ${tradeDoneToday() ? '<b>Ma már cseréltél</b> – holnap újra.' : 'Mai cseréd még elérhető.'}</p>`;
  const nm = body.querySelectorAll('.pv-txt b'); // (a nevek már escapelve)
  body.querySelector('.fr-add').onsubmit = e => { e.preventDefault(); frAdd($('#frIn').value); $('#frIn').value = ''; };
  body.onclick = async e => {
    const b = e.target.closest('button'); if (!b || b.closest('form')) return;
    const ds = b.dataset;
    if (b.hasAttribute('data-share')) return frShareInvite();
    if (b.hasAttribute('data-copy')) { try { await navigator.clipboard.writeText(frCode(me)); toast('Kód kimásolva ✔'); } catch { toast(frCode(me)); } return; }
    if (ds.acc) return frAccept(ds.acc);
    if (ds.rm) return frRemove(ds.rm);
    if (ds.rmf) { if (confirm('Törlöd a barátlistádról?')) frRemove(ds.rmf); return; }
    if (ds.ch) return frChallenge(ds.ch);
    if (ds.tr) return frTradeModal(ds.tr);
    if (ds.chacc) { const d = PVP.list.find(x => x.id === ds.chacc); if (d) frAcceptChallenge(d); return; }
    if (ds.tyes || ds.tno) { const t = FR.trades.find(x => x.id === (ds.tyes || ds.tno)); if (!t) return; b.disabled = true;
      if (ds.tyes) { const c = confirm(`Elfogadod? Kapod: ${cardLabel(t.give)} · adod: ${cardLabel(t.want)}`); if (!c) { b.disabled = false; return; } }
      return frAnswer(t, !!ds.tyes); }
    if (ds.tcan) { const t = FR.trades.find(x => x.id === ds.tcan); if (t) frCancelOffer(t); }
    if (b.hasAttribute('data-histall')) { FR.histAll = true; renderFriends(); }
  };
}
$('#goFriends').onclick = () => { if (needProfile()) return; if (TEST_MODE) return toast('🧪 A teszt oldalon ez nem elérhető'); frStart(); renderFriends(); show('scr-friends'); FR.list.filter(d => d.status === 'accepted').forEach(d => frFetchPub(frOther(d), true)); };

// ---- duplikátumok kézi beváltása (Gyűjtemény) ----
function dupeList(p) {   // ami 2 példány fölött van (előbb a sima példányok mennek, a Full Art marad)
  const out = []; let coins = 0;
  for (const [id, e] of Object.entries(p.coll || {})) {
    if (!CARD[id]) continue;
    let extra = e.n + e.f - DUPE_KEEP; if (extra <= 0) continue;
    const n = Math.min(extra, e.n), f = Math.min(extra - n, e.f);
    const c = n * dupeVal(id, false) + f * dupeVal(id, true); coins += c; out.push({ id, n, f, coins: c });
  }
  out.sort((a, b) => b.coins - a.coins || RAR_ORDER[CARD[a.id].rarity] - RAR_ORDER[CARD[b.id].rarity]);
  return { out, coins };
}
function dupeModal() {
  const d = dupeList(Store.p); if (!d.out.length) return toast('Nincs 2 példány fölötti lapod');
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal tr-box"><h3>♻️ Duplikátumok beváltása</h3><p class="live">Minden lapból 2 példány megmarad (a Full Art-ot megtartom), a többi coinra vált. Előtte érdemes megnézni, nem cserélnéd-e el valamelyiket egy barátoddal!</p>
    <div class="tr-grid">${d.out.map(x => `<div class="tr-c">${cardHTML(x.id)}<span class="tr-n">−${x.n + x.f}${x.f ? ` (${x.f} FA)` : ''} · +${x.coins}</span></div>`).join('')}</div>
    <button class="btn primary" data-go>Beváltom: +${d.coins} coin</button><button class="btn" data-x>Mégse</button></div>`;
  o.onclick = async e => { const b = e.target.closest('button'); if (e.target === o || (b && b.hasAttribute('data-x'))) return o.remove(); if (!b) return;
    if (b.hasAttribute('data-go')) { b.disabled = true; const r = convertDupes(Store.p); await save(); frPubSync(); o.remove(); renderProfileBar(); renderColl(); toast(`♻️ Beváltva: +${r.coins} coin`); } };
  $('#layer').appendChild(o);
}

// ======================= Ranked (2026-10-09) =======================
// Bronz 5–1 → Ezüst 5–1 → Arany 5–1 → Legenda. Győzelem +1 csillag (3. győzelemtől sorozatban +1 bónusz).
// Bronz és Ezüst 5: vereség nem visz el csillagot. Ezüst 5 alá nem lehet visszaesni.
// Ezüst 4–1: csak minden második vereség vesz el csillagot („Kitartás”); győzelem után az első vereség ingyenes.
// Arany: minden vereség −1 csillag, 0 csillagnál visszaesés. Legenda: Legenda-pont (+1/−1), onnan nem esel vissza.
// Szezon = a Season Pass szezonja (ha nincs, naptári hónap). Szezonváltáskor a szezon legjobb rangja szerinti jutalom, majd újrakezdés Bronz 5-ről.
const RANKED_ON = true;   // 2026-10-09: kész, de még kikapcsolva – a szezon indulásakor true (és a jutalmak véglegesítése)
/* Rangok: Bronz 0–4, Ezüst 5–9, Arany 10–14, (2. ranked szezontól) Smaragd 15–19, Gyémánt 20–24, Legenda.
   Az 1. ranked szezonban ('s2') a Legenda még 15 (Arany után) – 2026-10-19, Tomi: az új szezonban Smaragd és Gyémánt is van. */
const RK_NAMES = ['Bronz', 'Ezüst', 'Arany', 'Smaragd', 'Gyémánt'];
const rkLegOf = sid => sid === 's2' ? 15 : 25;
const rkLeg = () => rkLegOf(rkSeason().id);
const rkNeed = t => t < 5 ? 2 : t < 10 ? 3 : t < 15 ? 4 : 5;
const rkTierClsL = (t, leg) => t >= leg ? 'legend' : ['bronze', 'silver', 'gold', 'emerald', 'diamond'][Math.floor(t / 5)];
const rkTierCls = t => rkTierClsL(t, rkLeg());
const rkNameL = (t, leg) => t >= leg ? 'Legenda' : `${RK_NAMES[Math.floor(t / 5)]} ${5 - (t % 5)}`;
const rkName = t => rkNameL(t, rkLeg());
const RK_REWARDS_S1 = [   // 2026-10-12, Tomi: minden elért lépcső jutalma jár (halmozódik) – 1. ranked szezon
  { min: 1,  name: 'Bronz 4',  rew: { packs: 2 } },
  { min: 5,  name: 'Ezüst 5',  rew: { shiny: 2 } },
  { min: 10, name: 'Arany 5',  rew: { coins: 1000 } },
  { min: 15, name: 'Legenda',  rew: { back: 'legend' } },
];
const RK_REWARDS_S2 = [   // 2. ranked szezontól (2026-10-23): Smaragd és Gyémánt lépcső is
  { min: 1,  name: 'Bronz 4',   rew: { packs: 2 } },
  { min: 5,  name: 'Ezüst 5',   rew: { shiny: 2 } },
  { min: 10, name: 'Arany 5',   rew: { coins: 1000 } },
  { min: 15, name: 'Smaragd 5', rew: { shiny: 3 } },
  { min: 20, name: 'Gyémánt 5', rew: { coins: 2000 } },
  { min: 25, name: 'Legenda',   rew: { back: 'legend' } },
];
/* 2. ranked szezon extra jutalmai (2026-10-23, Tomi) – a designok később jönnek. Amíg nincs kész (grant nincs megadva), „hamarosan” felirattal látszik;
   amikor elkészül (grant függvény + ready), mindenki megkapja, aki abban a szezonban elérte a lépcsőt – akkor is, ha a szezon már véget ért (rkHist[szezon].best). */
const RK_LATER = { r2: [
  { min: 5,  key: 'r2_gabi',  name: 'Gabi, a Beton hős-portré', grant: p => { if (!(p.portraits || []).includes('p_gabi_beton')) p.portraits = [...(p.portraits || []), 'p_gabi_beton']; p.heroSkin = { ...(p.heroSkin || {}), gabi: 'p_gabi_beton' }; }, show: () => heroCardHTML(HERO.gabi, { big: true, port: 'p_gabi_beton' }), note: 'Gabi mostantól ezt a portrét viseli – a Gyűjteményben a hősre koppintva visszaválthatsz.' },   /* 2026-10-23 (Tomi): Ezüst 5 */
  { min: 10, key: 'r2_back',  name: 'S2 Ranked hátlap' },
  { min: 15, key: 'r2_var',   name: 'Legendás ??? változat' },
  { min: 20, key: 'r2_dia',   name: 'új Gyémánt lap' },
  { min: 25, key: 'r2_port',  name: 'mozgó Gyémánt hős-portré' },
] };
const rkLaterFor = (sid, min) => (RK_LATER[sid] || []).filter(x => x.min === min);
function rkLaterCheck(p) {   /* elkészült extra jutalmak kiosztása (egyszer, p.rkLater[key]) */
  if (!p) return []; const got = [];
  for (const [sid, xs] of Object.entries(RK_LATER)) {
    const best = p.rank && p.rank.season === sid ? p.rank.best || 0 : (p.rkHist && p.rkHist[sid] ? p.rkHist[sid].best || 0 : -1);
    for (const x of xs) { if (!x.grant || best < x.min || (p.rkLater || {})[x.key]) continue; x.grant(p); (p.rkLater = p.rkLater || {})[x.key] = Date.now(); got.push(x); }
  }
  if (got.length) { save(); renderMenuFan?.();
    const sh = got.find(x => x.show);
    if (sh) openModal(sh.show(), `🎁 Ranked jutalom (${rkNameL(sh.min, rkLegOf('r2'))}): ${got.map(x => x.name).join(', ')}! ${sh.note || ''}`, '');
    else toast(`🎁 Ranked jutalom megérkezett: ${got.map(x => x.name).join(', ')}`); }
  return got;
}
const rkRewTable = sid => sid === 's2' ? RK_REWARDS_S1 : RK_REWARDS_S2;
const rkRewardFor = t => [...rkRewTable(rkSeason().id)].reverse().find(r => t >= r.min) || null;
const rkRewardsUpTo = (t, sid) => rkRewTable(sid || rkSeason().id).filter(r => t >= r.min);
const rkRewText = r => [r.crown ? `👑 ${CROWN_NAME[r.crown]} korona a hősöd portréján (a következő szezon végéig, mindenki látja)` : '', r.shiny ? `${r.shiny} Shiny pack` : '', r.packs ? `${r.packs} booster pack` : '', r.coins ? `${r.coins} coin` : '', r.back ? `${BACKS[r.back].name} hátlap` : ''].filter(Boolean).join(' + ');
/* Ranked szezonok – 2026-10-19 óta a Season Passtól függetlenül (Tomi). Az első id-ja 's2' marad, hogy a meglévő rangok ne nullázódjanak. */
const RK_SEASONS = [
  { id: 's2', name: '1. ranked szezon', start: new Date(2026, 9, 12, 0, 0), end: new Date(2026, 9, 23, 0, 0) },
  { id: 'r2', name: '2. ranked szezon', start: new Date(2026, 9, 23, 0, 0), end: new Date(2026, 10, 11, 0, 0) },
];
/* Szezonvégi jutalom az első háromnak: RK_TOP_REW[szezon] = [1., 2., 3. hely jutalma], pl. { coins: 2000, shiny: 5 } (rkGrant formátum). Tomi küldi. */
const RK_TOP_REW = { s2: [{ crown: 'gold' }, { crown: 'silver' }, { crown: 'bronze' }] };   /* 2026-10-22 (Tomi): az első három egy kis koronát kap a hős portréja bal felső sarkába – mindenki látja */
/* Korona: a következő ranked szezon végéig látszik (ha nincs következő felvéve: 30 napig). p.crown = { k, pos, season, until } – a pub-ban is (barátok, ranglista), PvP-ben a cos-ban. */
const CROWN_K = ['gold', 'silver', 'bronze'], CROWN_NAME = { gold: 'arany', silver: 'ezüst', bronze: 'bronz' };
const crownUntil = sid => { const i = RK_SEASONS.findIndex(x => x.id === sid), nx = RK_SEASONS[i + 1]; return nx ? nx.end.getTime() : RK_SEASONS[i].end.getTime() + 30 * 864e5; };
const crownOk = c => !!c && CROWN_K.includes(c.k) && Date.now() < (c.until || 0);
const myCrown = () => { const c = Store.p && Store.p.crown; return crownOk(c) ? c.k : null; };
const crownHTML = (k, cls = '') => k && CROWN_K.includes(k) ? `<i class="crown cr-${k}${cls ? ' ' + cls : ''}" role="img" aria-label="${CROWN_NAME[k]} korona – ranked top 3" title="Ranked szezon ${CROWN_K.indexOf(k) + 1}. helyezett"></i>` : '';
function rkSeason() { const now = new Date(), r = RK_SEASONS.find(x => now >= x.start && now < x.end); if (r) return { id: r.id, end: r.end, name: r.name };
  const s = curSeason(); if (s) return { id: s.id, end: s.end, name: s.name }; const d = new Date(); return { id: `m${d.getFullYear()}-${d.getMonth() + 1}`, end: new Date(d.getFullYear(), d.getMonth() + 1, 1), name: `${d.getFullYear()}. ${d.getMonth() + 1}. havi szezon` }; }
function rkFresh(season) { return { season, t: 0, st: 0, streak: 0, shield: false, lp: 0, best: 0, w: 0, l: 0, games: 0 }; }
// a profil rangja; szezonváltáskor jutalom + újrakezdés
function ensureRank(p) {
  if (!p) return null;
  const se = rkSeason();
  if (!p.rank) { p.rank = rkFresh(se.id); return p.rank; }
  if (p.rank.season !== se.id) {
    const old = p.rank;
    const got = old.games > 0 && RANKED_ON ? rkRewardsUpTo(old.best, old.season).filter(x => !(old.claimed || []).includes(x.min)) : [];   // amit menet közben még nem kapott meg
    if (got.length || old.games > 0) {
      const rw = {};
      for (const x of got) for (const [k, v] of Object.entries(x.rew)) rw[k] = k === 'back' ? v : (rw[k] || 0) + v;
      rkGrant(p, rw);
      p.rankReward = { season: old.season, best: old.best, lp: old.lp, w: old.w, l: old.l, rew: rw, seen: false, leg: rkLegOf(old.season) };
    }
    if (old.games > 0) { p.rkHist = { ...(p.rkHist || {}), [old.season]: { t: old.t, st: old.st, lp: old.lp || 0, best: old.best, w: old.w, l: old.l, g: old.games } }; }   /* a szezon végeredménye (top 3 számításhoz) */
    p.rank = rkFresh(se.id); p._dirty = true; save();
  }
  return p.rank;
}
// egy ranked meccs eredménye → új rang; visszaadja, mi történt (a kijelzéshez)
function rankOnMatch(res) {
  const p = Store.p, r = ensureRank(p); if (!r) return null;
  const before = { t: r.t, st: r.st, lp: r.lp };
  let note = '';
  r.games++; delete r.pend;
  if (res === 'win') {
    r.w++;
    const bonus = r.streak >= 2 && r.t < rkLeg() && !(rkHard() && r.t >= 10) ? 1 : 0;   // 2. szezontól Aranyban nincs bónusz csillag
    r.streak++; r.shield = false;
    if (r.t >= rkLeg()) { r.lp++; note = '+1 Legenda-pont'; }
    else {
      r.st += 1 + bonus; if (bonus) note = `🔥 Győzelmi sorozat: +1 bónusz csillag`;
      while (r.t < rkLeg() && r.st >= rkNeed(r.t)) { r.st -= rkNeed(r.t); r.t++; }
      if (r.t >= rkLeg()) r.st = 0;
    }
  } else if (res === 'loss') {
    r.l++; r.streak = 0;
    if (r.t >= rkLeg()) { r.lp = Math.max(0, r.lp - 1); note = r.lp || before.lp ? '−1 Legenda-pont' : 'A Legenda rangot nem veszítheted el'; }
    else if (r.t <= 5) note = r.t < 5 ? 'Bronzban a vereség nem visz el csillagot' : 'Ezüst 5 alá nem eshetsz vissza';
    else {
      let lose = true;
      if (r.t < 10) { if (!r.shield) { r.shield = true; lose = false; note = '🛡 Kitartás: ezt a vereséget nem számoltuk'; } else r.shield = false; }
      if (lose) {
        // 2026-10-13, Tomi: az elért ligából nem lehet visszaesni – Ezüst 5 és Arany 5 alá sem, csak a ligán belüli számokban
        const floor = r.t >= 20 ? 20 : r.t >= 15 ? 15 : r.t >= 10 ? 10 : 5;   /* Smaragd 5 és Gyémánt 5 alá sem lehet visszaesni */
        if (r.st > 0) r.st--;
        else if (r.t > floor) { r.t--; r.st = rkNeed(r.t) - 1; note = 'Visszaestél egy fokozatot'; }
        else note = `${rkName(floor)} alá nem eshetsz vissza`;
      }
    }
  } else note = 'Döntetlen: a rangod nem változott';
  r.best = Math.max(r.best, r.t);
  const rew = rkClaimDue(p, true);
  save(); frPubSync();
  return { before, after: { t: r.t, st: r.st, lp: r.lp }, res, note, up: r.t > before.t, down: r.t < before.t, rew };
}
function rkEmblem(t, cls = '', leg) {
  const lg = leg || rkLeg(); return `<span class="rk-emb ${rkTierClsL(t, lg)} ${cls}" aria-hidden="true"><i>${t >= lg ? '★' : 5 - (t % 5)}</i></span>`;
}
function rkStars(t, st, anim) {
  if (t >= rkLeg()) return '';
  return `<span class="rk-stars">${Array.from({ length: rkNeed(t) }, (_, k) => `<i class="${k < st ? 'on' : ''}${anim != null && k === anim ? ' pop' : ''}"></i>`).join('')}</span>`;
}
// a meccs végi ablakba: rangváltozás
// 2026-10-13: a lépcső jutalma azonnal jár, amikor eléred (szezononként egyszer) – nem csak a szezon végén
function rkGrant(p, rew) {
  if (rew.packs) p.giftPacks = (p.giftPacks || 0) + rew.packs;
  if (rew.shiny) p.shinyPacks = (p.shinyPacks || 0) + rew.shiny;
  if (rew.coins) p.coins += rew.coins;
  if (rew.crown) p.crown = { k: rew.crown, pos: rew.pos, season: rew.season, until: rew.until };
  if (rew.back && !(p.backs || []).includes(rew.back)) { p.backs = [...(p.backs || []), rew.back]; p.cardBack = rew.back; try { applyBack(); } catch (e) {} }
}
function rkClaimDue(p, fromMatch) {
  const r = p && p.rank; if (!r || !RANKED_ON) return [];
  const due = rkRewTable(r.season).filter(x => r.best >= x.min && !(r.claimed || []).includes(x.min));
  if (!due.length) return [];
  for (const x of due) rkGrant(p, x.rew);
  r.claimed = [...(r.claimed || []), ...due.map(x => x.min)];
  if (!fromMatch) p.rkNew = [...(p.rkNew || []), ...due.map(x => x.min)];   // menüben felugró ablak
  save(); return due;
}
function rkTierPopup() {
  const p = Store.p; if (!p || !(p.rkNew || []).length || $('#layer .overlay')) return;
  const xs = rkRewTable(rkSeason().id).filter(x => p.rkNew.includes(x.min));
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box" style="text-align:center;justify-items:center"><h3>🏆 Ranked jutalom</h3>${rkEmblem(xs[xs.length - 1].min, 'lg')}
    ${xs.map(x => `<p class="tut-gift"><b>${x.name}</b> elérve: <b>${rkRewText(x.rew)}</b></p>`).join('')}
    <p class="live">${xs.some(x => x.rew.packs || x.rew.shiny) ? 'A packok a Boosterek menüben várnak.' : ''}${xs.some(x => x.rew.back) ? ' Az új hátlapot már használod.' : ''}</p><button class="btn primary" data-x>Szuper!</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]')) { o.remove(); p.rkNew = []; save(); renderProfileBar(); } };
  $('#layer').appendChild(o);
}
function rkResultHTML(x) {
  if (!x) return '';
  const a = x.after, gained = x.res === 'win' && !x.up && a.t < rkLeg() ? a.st - 1 : null;
  return `<div class="rk-res${x.up ? ' up' : x.down ? ' down' : ''}">${rkEmblem(a.t, 'sm')}<div class="rk-res-t"><b>${x.up ? `Szintlépés! ${rkName(a.t)}` : x.down ? `${rkName(a.t)}` : rkName(a.t)}</b>
    ${a.t >= rkLeg() ? `<small>${a.lp} Legenda-pont</small>` : rkStars(a.t, a.st, gained)}${x.note ? `<small class="rk-note">${x.note}</small>` : ''}</div></div>${(x.rew || []).map(y => `<div class="q-done-pop">🎁 Ranked jutalom – <b>${y.name}</b>: <em>${rkRewText(y.rew)}</em></div>`).join('')}`;
}
// menü csempe
// ---- hátlapok (2026-10-12): a játékos választhat; a Legenda hátlap a ranked Legenda jutalma ----
const BACKS = {
  base:   { name: 'Klasszikus', src: 'art/back.webp', sm: 'art/sm/back.webp', how: 'Alap hátlap' },
  legend: { name: 'Legenda', src: 'art/back_legend.webp', sm: 'art/sm/back_legend.webp', how: 'Ranked jutalom: érj el Legendát egy szezonban' },
  // 2026-10-12: gyűjtő- és győzelmi hátlap (automatikusan jár, ha teljesül)
  collector: { name: 'Ametiszt', src: 'art/back_collector.webp', sm: 'art/sm/back_collector.webp', how: 'Gyűjtsd össze a Base set összes lapját (sima is elég)',
    prog: p => { const [a, b] = backCollProg(p); return `${a}/${b} lap megvan`; }, earned: p => { const [a, b] = backCollProg(p); return a >= b; } },
  halloween: { name: 'Halloween', src: 'art/back_halloween.webp', sm: 'art/sm/back_halloween.webp', how: 'Halloween event jutalom (2026. október–november)' },
  // 2026-10-18: az Amsterdam Hősei szett gyűjtői hátlapja (a szett minden lapjából 1; Full Art / arany nem kell, de számít)
  amsterdam: { name: 'Amsterdam', src: 'art/back_amsterdam.webp', sm: 'art/sm/back_amsterdam.webp', how: 'Gyűjtsd össze az Amsterdam Hősei szett összes lapját (sima is elég)', set: 'ah',
    msg: 'Összegyűjtötted az Amsterdam Hősei szett összes lapját – ez a hátlap a szett gyűjtőinek jutalma.',
    prog: p => { const [a, b] = backCollProg(p, 'ah'); return `${a}/${b} lap megvan`; }, earned: p => { const [a, b] = backCollProg(p, 'ah'); return a >= b; } },
  champion: { name: 'Rubin', src: 'art/back_champion.webp', sm: 'art/sm/back_champion.webp', how: 'Nyerj meg 50 meccset',
    prog: p => `${Math.min(50, p.stats?.w || 0)}/50 győzelem`, earned: p => (p.stats?.w || 0) >= 50 },
};
// a Base set minden lapjából legalább 1 (sima vagy Full Art; a lap variánsa is számít)
function backCollProg(p, setId = 'base') {
  const fam = id => [id, ...CARDS.filter(c => c.variantOf === id).map(c => c.id)];
  const has = id => fam(id).some(x => { const e = p.coll?.[x]; return e && (e.n || 0) + (e.f || 0) > 0; });
  const all = SETS[setId].cards; return [all.filter(has).length, all.length];
}
// ha teljesült egy hátlap feltétele, megkapja, és a menüben felugrik
function backAwardCheck() {
  const p = Store.p; if (!p || p.onboard || (typeof S !== 'undefined' && S) || $('#layer .overlay')) return;
  const k = Object.keys(BACKS).find(k => BACKS[k].earned && !ownsBack(k) && (!BACKS[k].set || setLive(BACKS[k].set)) && BACKS[k].earned(p)); if (!k) return;
  p.backs = [...(p.backs || []), k]; save();
  const b = BACKS[k], o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box bk-new"><h3>🎉 Új hátlap: ${b.name}!</h3><div class="bk-new-art" style="background-image:url('${b.src}')"></div>
    <p class="live">${b.msg || (k === 'collector' ? 'Összegyűjtötted a Base set összes lapját – ez a hátlap a gyűjtők jutalma.' : 'Megnyertél 50 meccset – ez a hátlap a bajnokoké.')} Bármikor válthatsz a Gyűjteményben a 🃏 Hátlap gombbal.</p>
    <button class="btn primary" data-use>Ezt használom</button><button class="btn ghost" data-x>Maradok a mostaninál</button></div>`;
  o.onclick = e => {
    if (e.target.closest('[data-use]')) { p.cardBack = k; applyBack(); save(); toast(`${b.name} hátlap beállítva`); }
    else if (!e.target.closest('[data-x]')) return;
    o.remove(); setTimeout(() => { try { backAwardCheck(); deckLinkCheck(); chestPopup(); } catch (er) {} }, 200);
  };
  $('#layer').appendChild(o);
}
const ownsBack = k => k === 'base' || (Store.p?.backs || []).includes(k);
const myBack = () => { const k = Store.p?.cardBack; return k && BACKS[k] && ownsBack(k) ? k : 'base'; };
const backVars = k => { const b = BACKS[k] || BACKS.base; return `--bk:url('${b.src}');--bk-sm:url('${b.sm}')`; };
function applyBack() { const b = BACKS[myBack()]; const r = document.documentElement.style; r.setProperty('--bk', `url('${b.src}')`); r.setProperty('--bk-sm', `url('${b.sm}')`); }
function backPicker() {
  const p = Store.p; if (!p) return;
  const o = document.createElement('div'); o.className = 'overlay';
  const draw = () => { o.innerHTML = `<div class="modal acct-box"><h3>🃏 Hátlap</h3><p class="live">Ez látszik a lapjaid hátoldalán: a paklidon, húzáskor, és a rejtett lapjaidon (PvP-ben az ellenfeled is ezt látja).</p>
    <div class="bk-list">${Object.entries(BACKS).filter(([, b]) => !b.set || setLive(b.set)).map(([k, b]) => `<button class="bk-opt${myBack() === k ? ' on' : ''}${ownsBack(k) ? '' : ' lock'}" data-bk="${k}"><i style="background-image:url('${b.sm}')"></i><b>${b.name}${ownsBack(k) ? '' : ' 🔒'}</b><small>${myBack() === k ? 'Használatban' : ownsBack(k) ? 'Koppints a választáshoz' : b.how + (b.prog ? ` · ${b.prog(p)}` : '')}</small></button>`).join('')}</div>
    <button class="btn primary" data-x>Kész</button></div>`; };
  draw();
  o.onclick = e => { if (e.target.closest('[data-x]') || e.target === o) return o.remove();
    const b = e.target.closest('[data-bk]'); if (!b) return; const k = b.dataset.bk;
    if (!ownsBack(k)) return toast(BACKS[k].how);
    p.cardBack = k; applyBack(); save(); draw(); };
  $('#layer').appendChild(o);
}
// ---- Best of Us TCG nap (2026-10-12): aznap belépők ajándék Bence-portrét kapnak, felugró ablakkal ----
const DAY_GIFT = { id: 'bou-day-2026-10-12', from: Date.UTC(2026, 9, 11, 22, 0, 0), until: Date.UTC(2026, 9, 12, 22, 0, 0), port: 'p_bence_kerites' };   // 2026-10-12 0:00–23:59:59 magyar idő szerint
function dayGiftCheck() {
  const p = Store.p; if (!p || p.onboard || (typeof S !== 'undefined' && S) || $('#layer .overlay')) return;
  const now = Date.now();
  p.gifts = p.gifts || [];
  if (now < DAY_GIFT.from || now >= DAY_GIFT.until || p.gifts.includes(DAY_GIFT.id)) return;
  p.gifts.push(DAY_GIFT.id);
  const k = DAY_GIFT.port, P = PORTRAITS[k], h = HERO[P.hero];
  if (!(p.portraits || []).includes(k)) p.portraits = [...(p.portraits || []), k];
  p.heroSkin = { ...(p.heroSkin || {}), [P.hero]: k };
  save(); renderMenuFan();
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal sp-reveal"><h3>🎉 Boldog Best of Us TCG napot!</h3>${heroCardHTML(h, { big: true, port: k })}
    <p class="live">Ma indul a játék – ezért ajándékba kapod <b>${P.name}</b> portrét: ${h.name} új kinézete, mindig Full Artban. Rögtön ezt viseli – a Gyűjteményben a hősre koppintva visszaválthatsz.</p><button class="btn primary" data-x>Köszi!</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]')) { o.remove(); setTimeout(() => { try { backAwardCheck(); deckLinkCheck(); chestPopup(); } catch (er) {} }, 200); } };
  $('#layer').appendChild(o);
}
function renderRankTile() {
  const el = $('#rankSub'), em = $('#rankEmb'); if (!el || !Store.p) return;
  const r = ensureRank(Store.p);
  $('#goRanked')?.classList.toggle('off', !RANKED_ON);
  if (!RANKED_ON) { el.textContent = 'A szezon hamarosan indul'; if (em) em.innerHTML = rkEmblem(0, 'sm'); return; }
  if (r.pend && !(S && S.ranked)) { rankOnMatch('loss'); toast('Félbehagyott ranked meccs: vereségnek számított'); }
  el.textContent = r.t >= rkLeg() ? `Legenda · ${r.lp} pont` : `${rkName(r.t)} · ${r.st}/${rkNeed(r.t)} csillag`;
  if (em) em.innerHTML = rkEmblem(r.t, 'sm');
  if (!$('#scr-menu').hidden) { rkClaimDue(Store.p); rkTierPopup(); rkLaterCheck(Store.p); }   // akik már elérték a lépcsőt, most megkapják
  const rw = Store.p.rankReward; if (rw && !rw.seen) rkRewardPopup();
  if (!$('#scr-menu').hidden && !rkTopCheck.done) { rkTopCheck.done = true; setTimeout(() => rkTopCheck().catch(() => {}), 1500); }   /* top 3 szezonjutalom (indításonként egyszer néz rá) */
}
// szezon végeredménye: mindenki, aki abban a szezonban játszott (pub: rkh[szezon] vagy még a régi rank mező)
const rkCmpL = leg => (a, b) => b.t - a.t || (b.t >= leg ? (b.lp || 0) - (a.lp || 0) : b.st - a.st) || (b.w || 0) - (a.w || 0);
async function rkFinalBoard(seasonId) {
  const q = await Store.db.collection('pub').limit(500).get();
  return q.docs.map(d => { const x = d.data(), h = (x.rkh || {})[seasonId] || (x.rank && x.rank.season === seasonId ? x.rank : null);
    return h && ((h.g || 0) > 0 || h.t > 0 || h.st > 0) ? { uid: d.id, name: x.name, ...h } : null; }).filter(Boolean).sort(rkCmpL(rkLegOf(seasonId)));
}
async function rkTopCheck() {   /* lezárt szezon, amihez már van top 3 jutalom: ha benne vagy, egyszer megkapod */
  const p = Store.p; if (!p || !Store.db || !Store.uid || TEST_MODE) return;
  for (const se of RK_SEASONS) {
    const rew = RK_TOP_REW[se.id]; if (!rew || Date.now() < se.end.getTime() + 36e5) continue;   /* a zárás után 1 órával (mindenki adata felkerül) */
    p.rkTop = p.rkTop || {}; if (p.rkTop[se.id] != null) continue;
    let board; try { board = await rkFinalBoard(se.id); } catch (e) { return; }
    const pos = board.slice(0, 3).findIndex(x => x.uid === Store.uid);
    p.rkTop[se.id] = pos; save();
    if (pos >= 0 && rew[pos]) { rkGrant(p, { ...rew[pos], pos, season: se.id, until: crownUntil(se.id) }); save(); renderProfileBar(); frPubSync(true);
      const o = document.createElement('div'); o.className = 'overlay';
      o.className = 'overlay rk-top-pop';   /* 2026-10-22 (Tomi): gratuláció */
      o.innerHTML = `<div class="modal acct-box"><div class="rk-top-crown">${crownHTML(rew[pos].crown)}</div><h3>Gratulálunk! ${pos + 1}. helyezett lettél!</h3><p class="live">${/^(1|5|[AEIOUÁÉÍÓÖŐÚÜŰ])/i.test(se.name) ? 'Az' : 'A'} ${escH(se.name)} végén a ranglista ${['élén', 'második helyén', 'harmadik helyén'][pos]} végeztél. 🏆</p><p class="tut-gift">🎁 Jutalom: <b>${rkRewText(rew[pos])}</b></p><button class="btn primary" data-x>Köszönöm!</button></div>`;
      o.onclick = e => { if (e.target.closest('[data-x]')) o.remove(); }; $('#layer').appendChild(o); }
  }
}
function rkRewardPopup() {
  const p = Store.p, rw = p.rankReward; if (!rw || rw.seen || $('#layer .rk-season')) return;
  const o = document.createElement('div'); o.className = 'overlay rk-season';
  o.innerHTML = `<div class="modal acct-box"><h3>🏆 Véget ért a ranked szezon</h3>${rkEmblem(rw.best, 'lg', rw.leg || 15)}
    <p class="live">A szezon legjobb rangod: <b>${rkNameL(rw.best, rw.leg || 15)}</b>${rw.best >= (rw.leg || 15) ? ` (${rw.lp} Legenda-pont)` : ''} · ${rw.w} győzelem, ${rw.l} vereség.</p>
    ${rkRewText(rw.rew) ? `<p class="tut-gift">🎁 Jutalom: <b>${rkRewText(rw.rew)}</b>${rw.rew.packs || rw.rew.shiny ? ' – a packok a Boosterek menüben várnak' : ''}${rw.rew.back ? '. Az új hátlapot már használod (a Gyűjteményben a 🃏 Hátlap gombbal válthatsz)' : ''}.</p>` : '<p class="tut-gift">🎁 A lépcsők jutalmát már menet közben megkaptad.</p>'}
    <p class="live">Az új szezon Bronz 5-ről indul. Hajrá!</p><button class="btn primary" data-x>Szuper!</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]')) { o.remove(); rw.seen = true; save(); } };
  $('#layer').appendChild(o);
}
function renderRanked() {
  const body = $('#rankBody'); if (!body || !Store.p) return;
  setTimeout(() => rkLoadBoard(), 0);   // a ranglista percenként legfeljebb egyszer frissül
  const r = ensureRank(Store.p), se = rkSeason();
  const days = Math.max(0, Math.ceil((se.end - new Date()) / 864e5));
  const me = { name: Store.p.name, t: r.t, st: r.st, lp: r.lp, me: true, crown: myCrown() };
  const frIds = (typeof frOn === 'function' && frOn()) ? FR.list.filter(d => d.status === 'accepted').map(frOther) : [];
  const fr = frIds.map(u => { const pb = FR.pub[u]; return pb && pb.rank && pb.rank.season === se.id ? { uid: u, name: pb.name, code: pb.code, w: pb.w, crown: crownOk(pb.crown) ? pb.crown.k : null, ...pb.rank } : null; }).filter(Boolean);
  // 2026-10-12: a ranglistán mindenki rajta van, aki ebben a szezonban játszott rankedet (a „pub” profilokból)
  const all = RKB.season === se.id ? RKB.list.filter(x => x.uid !== Store.uid) : [];
  const others = RKB.tab === 'fr' ? fr : [...all, ...fr.filter(f => !all.some(x => x.uid === f.uid))];
  const board = [me, ...others].sort((a, b) => b.t - a.t || (b.t >= rkLeg() ? b.lp - a.lp : b.st - a.st));
  const myPos = board.indexOf(me), shown = board.slice(0, 50);
  if (myPos >= 50) shown.push(me);
  const frSet = new Set(frIds), pend = new Set((typeof frOn === 'function' && frOn()) ? FR.list.filter(d => d.status === 'pending').map(frOther) : []);
  body.innerHTML = `
    <div class="rk-hero">${rkEmblem(r.t, 'xl')}<div class="rk-name">${rkName(r.t)}</div>
      ${r.t >= rkLeg() ? `<div class="rk-lp">${r.lp} Legenda-pont</div>` : rkStars(r.t, r.st)}
      <small class="rk-sea">${escH(se.name)} · még ${days} nap · ${r.w} győzelem, ${r.l} vereség${r.streak >= 2 ? ` · 🔥 ${r.streak} győzelem sorozat` : ''}</small></div>
    <button class="rk-playimg" id="rkPlay" aria-label="Ranked meccs"></button>
    <p class="q-note rk-how">${Store.p.rkBot !== false ? `Élő ellenfelet keresünk; ha 20 mp alatt nincs senki, egy bot ellen játszol – a rangod mindkét esetben számít. A bot a ranggal erősödik (most: ${BOT_LV_NAME[rkBotLv()]}).` : 'Csak élő ellenfél ellen játszol: addig vársz, amíg valaki nem jön.'} (A pakliválasztásnál állíthatod.)</p>
    <div class="lbl">Jutalmak – a lépcső elérésekor azonnal járnak</div>
    <div class="rk-rews">${rkRewTable(se.id).map(x => `<div class="rk-rew${r.best >= x.min ? ' got' : ''}">${rkEmblem(x.min, 'xs')}<span><b>${x.name}</b><small>${rkRewText(x.rew)}${rkLaterFor(se.id, x.min).map(l => ` + ${l.name}${l.grant ? '' : ' <em class="rk-soon">hamarosan</em>'}`).join('')}</small></span>${r.best >= x.min ? '<em>elérve</em>' : ''}</div>`).join('')}</div>
    <div class="lbl rk-lbhead"><span>Ranglista</span><span class="seg rk-tabs" role="group"><button data-rkt="all" aria-pressed="${RKB.tab !== 'fr'}">Mindenki</button><button data-rkt="fr" aria-pressed="${RKB.tab === 'fr'}">Barátok</button></span></div>
    <div class="rk-board">${shown.map(x => `<${x.me ? 'div' : 'button'} class="rk-row${x.me ? ' me' : ''}"${x.me ? '' : ` data-rkp="${x.uid}"`}><span class="rk-pos">${board.indexOf(x) + 1}.</span>${rkEmblem(x.t, 'xs')}<b>${crownHTML(x.crown, 'cr-inl')}${escH(x.name || 'Játékos')}${!x.me && frSet.has(x.uid) ? ' <i class="rk-fr" title="Barátod">🤝</i>' : !x.me && pend.has(x.uid) ? ' <i class="rk-fr" title="Jelölés folyamatban">⏳</i>' : ''}</b><small>${x.t >= rkLeg() ? `Legenda · ${x.lp || 0} pont` : `${rkName(x.t)} · ${x.st}★`}</small></${x.me ? 'div' : 'button'}>`).join('')}
      ${others.length ? '' : `<p class="q-note">${RKB.tab === 'fr' ? 'Még egy barátod sem játszott ranked meccset ebben a szezonban.' : RKB.busy ? 'Ranglista betöltése…' : 'Még senki más nem játszott ranked meccset ebben a szezonban.'}</p>`}
      ${RKB.tab !== 'fr' ? '<p class="q-note rk-tip">Koppints egy játékosra – innen is bejelölheted barátnak.</p>' : ''}</div>
    <details class="rk-rules"><summary>Hogyan működik?</summary><ul>
      ${rkLeg() > 15 ? `<li><b>Új ligák:</b> Arany után jön a 💚 <b>Smaragd</b> és a 💎 <b>Gyémánt</b> (5–5 fokozat), csak utána a Legenda.</li>` : ''}
      <li>Győzelem: +1 csillag. Sorozatban a 3. győzelemtől minden győzelem dupla, azaz 2 csillagot ér – ${rkHard() ? 'csak Bronzban és Ezüstben (Aranytól felfelé nem)' : 'Bronzban, Ezüstben és Aranyban is'}.</li>${rkHard() ? '\n      <li>Aranyban és Smaragdban a Nehéz, Gyémánttól a Mester bot jön (erős pakli, +6 élet), ha nincs élő ellenfél.</li>' : '\n      <li>A 2. ranked szezontól (okt. 23.) nehezebb lesz: Arany után Smaragd és Gyémánt liga jön, Aranytól nem jár dupla csillag, és Gyémánttól a Mester bot jön (erős pakli, +6 élet).</li>'}
      <li>Az elért ligából nem esel vissza: ${rkLeg() > 15 ? 'Ezüst 5, Arany 5, Smaragd 5 és Gyémánt 5' : 'Ezüst 5 és Arany 5'} alá sem, csak a ligán belül.</li>
      <li>Bronzban 2, Ezüstben 3, Aranyban 4${rkLeg() > 15 ? ', Smaragdban és Gyémántban 5' : ''} csillag kell egy fokozathoz. ${rkLeg() > 15 ? 'Gyémánt 1' : 'Arany 1'} után jön a Legenda.</li>
      <li>Bronzban és Ezüst 5-ön a vereség nem visz el csillagot, és Ezüst 5 alá már nem eshetsz vissza.</li>
      <li>Ezüst 4–1: csak minden második vereség vesz el csillagot (🛡 Kitartás), és egy győzelem után az első vereség mindig ingyenes.</li>
      <li>Aranytól minden vereség −1 csillag, és 0 csillagnál visszaesel egy fokozatot – de a liga 5-ös fokozata alá nem.</li>
      <li>Legendában Legenda-pontokat gyűjtesz, onnan már nem esel vissza.</li>
      <li>A lépcsők jutalma (${rkRewTable(se.id).map(x => x.name).join(', ')}) azonnal jár, amikor eléred – szezononként egyszer.</li>
      <li>👑 A szezon végén a ranglista első három helyezettje koronát kap (arany, ezüst, bronz) a hőse portréjára – a következő szezon végéig mindenki látja: meccsen, a VS képernyőn és a ranglistán.</li>
      <li>A szezon vége: ${se.end.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })} – utána mindenki Bronz 5-ről kezd, és az első három helyezett külön jutalmat kap.</li></ul></details>`;
  $('#rkPlay').onclick = () => pvpPickDeck('Ranked pakli', dk => rankedSearch(dk), { ranked: true, btn: '🏆 Ranked meccs indítása', note: 'Válaszd ki, melyik paklival mész rankedbe.' });
}
// ranked keresés: élő ellenfél (20 mp), különben bot
function rankedSearch(dk) {
  if (!RANKED_ON) return toast('A ranked szezon még nem indult el');
  if (window.APP_MODE && Store.db && Store.uid) { PVP.ranked = true; PVP.rkBot = Store.p?.rkBot !== false; PVP.friendTo = null; pvpQuick(dk); }
  else rankedBot(dk);
}
// bot-szint (2026-10-12): a bot elleni meccsben választható; az új játékosnak (első 5 meccs) Könnyű az alap.
// Rankedben a rang dönt: Bronz 5–3 Könnyű, Bronz 2 – Ezüst 1 Normál, Arany és Legenda Nehéz.
function botLvPref() { const p = Store.p; if (!p) return 2; if (p.botLv) return p.botLv; const g = (p.stats?.w || 0) + (p.stats?.l || 0) + (p.stats?.d || 0); return g < 5 ? 1 : 2; }
function rkBotLv() { const r = ensureRank(Store.p); const t = r ? r.t : 0; return t <= 2 ? 1 : t < 10 ? 2 : rkHard() && t >= 20 ? 4 : 3; }   /* 2026-10-20 (Tomi): Mester bot csak Gyémánttól (Gyémánt + Legenda), Arany/Smaragd: Nehéz */
// 2. szezontól (2026-11-11, Tomi döntése 2026-10-13): Aranyban nincs dupla csillag; Mester bot Gyémánttól (2026-10-20)
const rkHard = () => Date.now() >= RK_SEASONS[0].end.getTime();   /* a 2. ranked szezontól (2026-10-23) */
function rankedBot(dk) {
  ui.deck = dk.id;
  startMatch(dk.hero, dk.id, { ranked: true });
  toast('Nincs most élő ellenfél – bot ellen játszol (a rangod számít)');
}
// ---- ranked ranglista: minden játékos (2026-10-12) ----
const RKB = { list: [], season: null, at: 0, busy: false, tab: 'all' };
async function rkLoadBoard(force) {
  if (!(typeof frOn === 'function' && frOn()) || RKB.busy) return;
  const se = rkSeason();
  if (!force && RKB.season === se.id && Date.now() - RKB.at < 60000) return;
  RKB.busy = true;
  try {
    const q = await Store.db.collection('pub').where('rank.season', '==', se.id).limit(300).get();
    RKB.list = q.docs.map(d => ({ uid: d.id, ...d.data() })).filter(x => x.rank && (x.rank.g > 0 || x.rank.t > 0 || x.rank.st > 0))
      .map(x => ({ uid: x.uid, name: x.name, code: x.code, w: x.w || 0, crown: crownOk(x.crown) ? x.crown.k : null, ...x.rank }));
    RKB.season = se.id; RKB.at = Date.now();
  } catch (e) { RKB.at = Date.now(); /* offline: marad a régi lista, egy percig nem próbálja újra */ }
  RKB.busy = false;
  if (!$('#scr-ranked').hidden) renderRanked();
}
function rkPlayerCard(uid) {
  const se = rkSeason(), x = RKB.list.find(y => y.uid === uid) || (() => { const pb = FR.pub[uid]; return pb ? { uid, name: pb.name, code: pb.code, w: pb.w || 0, ...(pb.rank || {}) } : null; })();
  if (!x) return;
  const fd = FR.list.find(d => d.id === frPair(Store.uid, uid));
  const st = !fd ? 'none' : fd.status === 'accepted' ? 'fr' : fd.from === Store.uid ? 'sent' : 'in';
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal acct-box rk-pcard"><div class="rk-pc-top">${rkEmblem(x.season === se.id ? x.t : 0, 'sm')}<span><b></b><small>${x.season === se.id ? (x.t >= rkLeg() ? `Legenda · ${x.lp || 0} pont` : `${rkName(x.t)} · ${x.st}★`) : 'Ebben a szezonban még nem játszott rankedet'}</small><small>${x.w || 0} győzelem összesen${x.season === se.id && x.g ? ` · ${x.g} ranked meccs` : ''}</small></span></div>
    ${st === 'fr' ? '<p class="live">🤝 Már a barátod. A Barátok menüben kihívhatod, vagy cserélhettek lapot.</p>'
      : st === 'sent' ? '<p class="live">⏳ Barátjelölés elküldve – várjuk, hogy elfogadja.</p>'
      : st === 'in' ? '<p class="live">Ő már bejelölt téged barátnak!</p><button class="btn primary" data-add>🤝 Elfogadom</button>'
      : '<button class="btn primary" data-add>➕ Bejelölöm barátnak</button>'}
    <button class="btn ghost" data-x>Bezár</button></div>`;
  o.querySelector('b').textContent = x.name || 'Játékos';
  o.onclick = async e => {
    if (e.target.closest('[data-x]') || e.target === o) return o.remove();
    const b = e.target.closest('[data-add]'); if (!b) return;
    b.disabled = true;
    if (st === 'in') await frAccept(fd.id); else await frAdd(x.code || '');
    o.remove(); setTimeout(() => { if (!$('#scr-ranked').hidden) renderRanked(); }, 600);
  };
  $('#layer').appendChild(o);
}
$('#rankBody').addEventListener('click', e => {
  const t = e.target.closest('[data-rkt]'); if (t) { RKB.tab = t.dataset.rkt; renderRanked(); return; }
  const r = e.target.closest('[data-rkp]'); if (r) rkPlayerCard(r.dataset.rkp);
});
$('#goRanked').onclick = () => { if (needProfile()) return; if (TEST_MODE) return toast('🧪 A teszt oldalon ez nem elérhető'); if (!RANKED_ON) return toast('🏆 A ranked szezon hamarosan indul!'); if (typeof frStart === 'function' && frOn()) { frStart(); FR.list.filter(d => d.status === 'accepted').forEach(d => frFetchPub(frOther(d), true)); } renderRanked(); show('scr-ranked'); rkLoadBoard(); };
