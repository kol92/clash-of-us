// ===== Profil, gazdaság, boosterek, paklik =====
const ECON = { goldPlain: 0.005, goldShiny: 0.05, goldDupe: 100, heroFaChance: 0.02, shinyHero: 0.15, shinyPrice: 250, shinyVariant: 0.25, packPrice: 50, dailyCap: 100, win: 25, draw: 15, loss: 10, foilChance: 0.04, pityAfter: 10,
               odds: [['l', 1.5], ['e', 6.5], ['r', 22], ['k', 70]] };
// a „token” lapok (pl. Query) csak más lap hatására kerülnek játékba: nincsenek packban, gyűjteményben, pakliban
const PLAYABLE = CARDS.filter(c => !c.token && !c.off);   // off: kánon esemény lap, amíg nincs hozzá grafika – sehol nem látszik
const SETS = { base: { name: 'Base set', cards: PLAYABLE.filter(c => !c.variantOf).map(c => c.id) } };
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
  for (const c of PLAYABLE) { if (c.variantOf) continue; if (c.rarity === 'k') coll[c.id] = { n: 2, f: 0 }; else if (c.rarity === 'r') coll[c.id] = { n: 1, f: 0 }; }
  return coll;
}
// Később bekerült gyakori lapok: a meglévő profilok is megkapják (gv = kiosztási verzió)
const STARTER_ADDS = { 2: ['a_delfin', 'i_varazsho', 'i_lepke'], 3: ['a_rehab'], 4: ['c_pp'], 5: ['c_nfc'], 6: ['a_cheddar'], 7: ['c_vajda', 'c_veghtomi'], 8: ['c_kovacs'], 9: ['a_kitiltva'], 10: ['a_haver'], 11: PLAYABLE.filter(c => c.rarity === 'r' && !c.variantOf).map(c => c.id), 12: ['c_sasimeselo'], 13: ['c_norbi'], 14: ['c_udvarhelyi'], 15: ['c_molnar'] };   // 12: Laci új kezdőpaklijához   // 11: minden ritka lapból 1 (a kezdőpaklikhoz)
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
const heroSkins = hid => ['base'].concat(ownsHeroFa(hid) ? ['fa'] : [], ownsHeroGold(hid) && ART['g_' + hid] ? ['gold'] : []);
function heroSkin(hid) {
  const have = heroSkins(hid), pref = Store.p?.heroSkin?.[hid];
  return have.includes(pref) ? pref : have[have.length - 1];
}
const SKIN_NAME = { base: 'Sima', fa: 'Full Art', gold: '✦ Arany' };
function skinModal(hid) {
  const h = HERO[hid], have = heroSkins(hid), cur = heroSkin(hid);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal tr-box skin-box"><h3>${escH(h.name)} – melyik portrét használod?</h3><p class="live">Ez látszik a meccseken (a PvP-ellenfeled is ezt látja), a pakliválasztóban és a menüben.</p>
    <div class="skin-row">${have.map(v => `<button class="skin-opt${v === cur ? ' on' : ''}" data-skin="${v}">${heroCardHTML(h, { foil: v === 'fa', gold: v === 'gold' })}<span>${SKIN_NAME[v]}${v === cur ? ' ✓' : ''}</span></button>`).join('')}</div>
    <button class="btn" data-x>Bezárás</button></div>`;
  o.onclick = async e => { const b = e.target.closest('button'); if (e.target === o || (b && b.hasAttribute('data-x'))) return o.remove(); if (!b || !b.dataset.skin) return;
    const p = Store.p; p.heroSkin = { ...(p.heroSkin || {}), [hid]: b.dataset.skin }; await save(); o.remove(); renderColl(); renderMenuFan(); toast(`${h.name}: ${SKIN_NAME[b.dataset.skin]} portré beállítva`); };
  $('#layer').appendChild(o);
}
function rollHeroGold(p) {
  const h = GOLD_HEROES[Math.floor(Math.random() * GOLD_HEROES.length)];
  p.heroGold = p.heroGold || {}; const isNew = !p.heroGold[h]; p.heroGold[h] = (p.heroGold[h] || 0) + 1;
  return { id: 'gold:' + h, hero: h, gold: true, foil: true, isNew };
}
const pcRar = c => c.gold ? 'g' : c.hero ? 'l' : CARD[c.id].rarity;
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
const freePackReady = () => !!Store.p && Store.p.freeDate !== today();

// ---- mentés: felhő (Claude-fiók) vagy ez az eszköz ----
const LS_KEY = 'bestofus_profile_v1';
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
    if (window.APP_MODE) { if (!FR.unsubF) frStart(); else frPubSync(); }
    return Store.saving;
  }
  lsSet(snap);
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
      if (snap.exists) Store.p = migrate(snap.data());
    } catch { Store.mode = 'local'; }
  } else Store.mode = 'local';
  if (Store.mode === 'local') Store.p = migrate(lsGet());
  if (Store.p && Store.p._dirty) { delete Store.p._dirty; save(); }
  if (Store.giftMsg) { const m = Store.giftMsg; Store.giftMsg = null; setTimeout(() => toast(m), 600); }
  if (Store.faMsg) { const m = Store.faMsg; Store.faMsg = null; setTimeout(() => toast(m), 4200); }
  if (Store.dupeMsg) { const m = Store.dupeMsg; Store.dupeMsg = null; setTimeout(() => toast(m), Store.giftMsg === null ? 2400 : 600); }
  renderProfileBar(); if (Store.p && GOLD_HEROES.some(ownsHeroGold)) renderMenuFan();
  if (!Store.p) showCreate(); else if (Store.p.onboard) startOnboarding();
  pvpStart(); renderPvpBadge(); pvpRoomInit(); frStart(); frRefresh();
}
function migrate(p) {
  if (!p) return null;
  p = JSON.parse(JSON.stringify(p));
  p.coll = p.coll || starterCollection(); p.decks = p.decks || [];
  p.earned = p.earned || { date: '', amt: 0 }; p.stats = p.stats || { w: 0, l: 0, d: 0 };
  for (let g = (p.gv || 1) + 1; g <= GRANT_V; g++) for (const id of STARTER_ADDS[g] || []) {
    if (!CARD[id]) continue; const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 }); if (e.n + e.f < (CARD[id].rarity === 'k' ? 2 : 1)) e.n = (CARD[id].rarity === 'k' ? 2 : 1) - e.f;
  }
  if ((p.gv || 1) < GRANT_V) p._dirty = true;
  const g = applyGifts(p); if (g) { p._dirty = true; Store.giftMsg = g.msg; }
  if (p.faPacks > 0) { p.shinyPacks = (p.shinyPacks || 0) + p.faPacks; Store.faMsg = `A ${p.faPacks} Full Art packod Shiny packká alakult`; p.faPacks = 0; p._dirty = true; }
  const dc = { coins: 0 };   // lapokat már nem váltunk be automatikusan (csere miatt) – csak kézzel, a Gyűjteményben
  // Full Art hősből elég 1: a többi darabonként 10 coint ér
  for (const h of Object.keys(p.heroGold || {})) if (p.heroGold[h] > 1) { const x = p.heroGold[h] - 1; p.heroGold[h] = 1; p.coins += x * ECON.goldDupe; dc.coins += x * ECON.goldDupe; }
  for (const h of Object.keys(p.heroFa || {})) if (p.heroFa[h] > 1) { const x = p.heroFa[h] - 1; p.heroFa[h] = 1; p.coins += x * DUPE_COIN_RARE; dc.coins += x * DUPE_COIN_RARE; }
  if (dc.coins) { p._dirty = true; Store.dupeMsg = `A fölösleges hős-példányaid beváltódtak: +${dc.coins} coin`; }
  p.gv = GRANT_V;
  // kivett lapok eltávolítása a paklikból
  for (const d of p.decks) for (const id of Object.keys(d.list)) if (!CARD[id] || CARD[id].token) delete d.list[id];
  for (const id of Object.keys(p.coll)) if (CARD[id]?.token) { delete p.coll[id]; p._dirty = true; }
  return p;
}

// ---- fiók létrehozása ----
function showCreate() {
  const o = document.createElement('div'); o.className = 'overlay create';
  o.innerHTML = `<form class="modal create-box" id="createForm" novalidate>
      <div class="cb-back" aria-hidden="true"></div>
      <h2>Új játékos</h2>
      <p>Válassz játékosnevet. Ezzel a névvel látnak majd a barátaid.</p>
      <label class="fld"><span>Játékosnév</span><input id="pname" maxlength="18" autocomplete="nickname" required></label>
      <div class="gift"><b>Kezdőcsomag</b><span>Mind a ${HEROES.length} hős · minden gyakori lap 2× · minden ritka lap 1× · ${Object.keys(DECKS).length} kész pakli (minden hősnek egy)</span></div>
      <p class="err" id="perr" hidden></p>
      <button class="btn primary" type="submit">Játékos létrehozása</button>
      <small class="where">${window.APP_MODE ? 'A profilod a fiókodhoz kötve, a felhőben mentődik.' : Store.mode === 'cloud' ? 'A profilod a Claude-fiókodhoz kötve mentődik.' : 'A profilod ezen az eszközön mentődik.'}</small>
      ${window.APP_MODE ? '<button type="button" class="linkish" id="cImport">Játszottál már a régi verzióval? Hozd át a profilod kóddal</button>' : ''}
    </form>`;
  $('#layer').appendChild(o);
  const inp = o.querySelector('#pname'); inp.value = Store.suggestName.split(' ')[0] || '';
  o.querySelector('#cImport')?.addEventListener('click', () => importModal(() => o.remove()));
  setTimeout(() => inp.focus(), 50);
  o.querySelector('#createForm').onsubmit = async e => {
    e.preventDefault();
    const name = inp.value.trim().replace(/\s+/g, ' ');
    const err = o.querySelector('#perr');
    if (name.length < 2) { err.hidden = false; err.textContent = 'A név legalább 2 karakter legyen.'; return; }
    Store.p = newProfile(name); Store.p.onboard = true; await save(); o.remove();
    renderProfileBar(); startOnboarding();
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
      <small class="where">Verzió: ${escH(window.APP_VERSION || '')}</small>
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
  if (!Store.p) { el.innerHTML = `<span class="pb-name">${Store.mode === 'loading' ? 'Profil betöltése…' : 'Nincs profil'}</span>`; return; }
  const p = Store.p, e = earnedToday();
  el.innerHTML = `<div class="pb-who"><span class="pb-name"></span><small>${p.stats.w} győzelem</small></div>
    <div class="pb-coins"><span class="coin" aria-hidden="true"></span><b>${p.coins}</b></div>
    <div class="pb-day"><small>Mai coin</small><div class="meter"><i style="width:${e / ECON.dailyCap * 100}%"></i></div><small class="num">${e}/${ECON.dailyCap}</small></div>`;
  const ss = $('#saveState'); if (ss) ss.textContent = window.APP_MODE ? '👤 Fiók' : Store.mode === 'cloud' ? '☁️ Felhőben mentve' : '📱 Ezen az eszközön mentve';
  el.querySelector('.pb-name').textContent = p.name;
  renderQuestBadge(); renderPassBadge();
  const badge = $('#shopBadge'); if (badge) badge.hidden = !freePackReady() && !(p.giftPacks > 0) && !(p.faPacks > 0) && !(p.shinyPacks > 0);
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
function openPackRoll(setId, forceFoil = false, shiny = false) {
  const p = Store.p, pool = SETS[setId].cards;
  const slots = [rollRarity(), rollRarity(), rollRarity()];
  if (slots.every(x => x === 'k')) slots[2] = 'r';                       // legalább egy ritka
  const hasEpic = slots.some(x => x === 'e' || x === 'l');
  if (!hasEpic && p.sinceEpic + 1 >= ECON.pityAfter) slots[2] = 'e';       // szánalomrendszer
  p.sinceEpic = slots.some(x => x === 'e' || x === 'l') ? 0 : p.sinceEpic + 1;
  const order = { k: 0, r: 1, e: 2, l: 3 };
  slots.sort((a, b) => order[a] - order[b]);
  const faSlot = forceFoil || shiny ? 2 : -1;   // garantált Full Art: a pack legjobb lapja lesz az
  // Shiny pack: a különleges hely 25% eséllyel változat-lap (pl. a zöld Rehab), különben Full Art
  const allVars = CARDS.filter(v => v.variantOf && !v.passOnly);
  const sr = Math.random();
  const varSlot = shiny && allVars.length && sr < ECON.shinyVariant ? 2 : -1;
  // Full Art hős: sima packban kis eséllyel a leggyengébb lap helyén, Shiny packban a különleges helyen
  const heroSlot = shiny ? (varSlot < 0 && sr < ECON.shinyVariant + ECON.shinyHero ? 2 : -1) : (Math.random() < ECON.heroFaChance ? 0 : -1);
  const goldSlot = GOLD_HEROES.length && Math.random() < (shiny ? ECON.goldShiny : ECON.goldPlain) ? 0 : -1;   // Arany hős: a pack első lapja helyén
  return slots.map((rar, si) => {
    if (si === goldSlot) return rollHeroGold(p);
    if (si === heroSlot) return rollHeroFa(p);
    const ids = pool.filter(id => CARD[id].rarity === rar);
    let id = ids[Math.floor(Math.random() * ids.length)];
    const vars = CARDS.filter(v => v.variantOf === id && !v.passOnly);
    if (vars.length && Math.random() < VARIANT_CHANCE) id = vars[Math.floor(Math.random() * vars.length)].id;
    if (si === varSlot) id = allVars[Math.floor(Math.random() * allVars.length)].id;
    const foil = (si === faSlot && si !== varSlot) || Math.random() < ECON.foilChance;
    const isNew = owned(id) === 0 || (foil && !ownsFoil(id));
    const e = p.coll[id] || (p.coll[id] = { n: 0, f: 0 });
    if (foil) e.f++; else e.n++;
    return { id, foil, isNew };
  });
}
async function buyPack(setId, free) {
  const p = Store.p; if (!p) return;
  if (free === 'fa') { if (!(p.faPacks > 0)) return; p.faPacks--; }
  else if (free === 'gift') { if (!(p.giftPacks > 0)) return; p.giftPacks--; }
  else if (free === 'shinyGift') { if (!(p.shinyPacks > 0)) return; p.shinyPacks--; }
  else if (free === 'shiny') { if (p.coins < ECON.shinyPrice) { toast('Nincs elég coinod'); return; } p.coins -= ECON.shinyPrice; }
  else if (free) { if (!freePackReady()) return; p.freeDate = today(); }
  else { if (p.coins < ECON.packPrice) { toast('Nincs elég coinod'); return; } p.coins -= ECON.packPrice; }
  p.packs++;
  const shinyMode = free === 'shiny' || free === 'shinyGift';
  const cards = openPackRoll(setId, free === 'fa', shinyMode);
  const conv = { coins: 0 };   // a lapok duplikátumai megmaradnak (cserélhetők, vagy a Gyűjteményben kézzel beválthatók)
  for (const c of cards) if (!c.hero && !c.isNew) c.have = owned(c.id);
  for (const c of cards) if (c.gold && p.heroGold[c.hero] > 1) { p.heroGold[c.hero]--; p.coins += ECON.goldDupe; conv.coins += ECON.goldDupe; c.dupe = ECON.goldDupe; }
  for (const c of cards) if (c.hero && !c.gold && p.heroFa[c.hero] > 1) { p.heroFa[c.hero]--; p.coins += DUPE_COIN_RARE; conv.coins += DUPE_COIN_RARE; c.dupe = DUPE_COIN_RARE; }
  await save(); renderProfileBar(); renderShop();
  await packOpening(setId, cards, { shiny: shinyMode });
  if (conv.coins) toast(`Fölösleges hős-példány beváltva: +${conv.coins} coin`);
}

// ---- bolt képernyő ----
function renderShop() {
  const p = Store.p; if (!p) return;
  const free = freePackReady();
  $('#shopBody').innerHTML = `
    <div class="wallet"><span class="coin" aria-hidden="true"></span><b>${p.coins}</b><small>coin</small></div>
    <div class="pack-offer">
      <div class="pack-art">${packHTML('base')}</div>
      <div class="pack-info">
        <h3>${SETS.base.name}</h3>
        <p>3 véletlen lap a teljes alapkészletből. Minden packban van legalább egy ritka vagy jobb lap.</p>
        ${p.faPacks > 0 ? `<button class="btn primary gift fa" id="faPack">✨ Full Art ajándék pack${p.faPacks > 1 ? ` (${p.faPacks})` : ''}</button>` : ''}
        ${p.giftPacks > 0 ? `<button class="btn primary gift" id="giftPack">🎁 Ajándék pack bontása${p.giftPacks > 1 ? ` (${p.giftPacks})` : ''}</button>` : ''}
        <button class="btn primary" id="freePack" ${free ? '' : 'disabled'}>${free ? 'Napi ingyen pack bontása' : 'Mai ingyen pack elhasználva'}</button>
        <button class="btn" id="buyPack" ${p.coins >= ECON.packPrice ? '' : 'disabled'}><span class="coin sm" aria-hidden="true"></span> ${ECON.packPrice} · Pack vásárlása</button>
      </div>
    </div>
    <div class="pack-offer shiny-offer">
      <div class="pack-art">${packHTML('base', { shiny: true })}</div>
      <div class="pack-info">
        <h3>Shiny ${SETS.base.name}</h3>
        <p>3 lap, amiből egy <b>biztosan különleges</b>: Full Art lap, Full Art hős, vagy ritka változat-lap (pl. a zöld Rehab). Ráadásul <b class="gold-t">${ECON.goldShiny * 100}% eséllyel ✦ Arany hős</b> is lehet benne!</p>
        ${p.shinyPacks > 0 ? `<button class="btn primary shiny-btn" id="giftShiny">🎁 Ajándék Shiny pack bontása${p.shinyPacks > 1 ? ` (${p.shinyPacks})` : ''}</button>` : ''}
        <button class="btn primary shiny-btn" id="buyShiny" ${p.coins >= ECON.shinyPrice ? '' : 'disabled'}><span class="coin sm" aria-hidden="true"></span> ${ECON.shinyPrice} · Shiny pack</button>
      </div>
    </div>
    <div class="odds"><div class="lbl">Esélyek laponként</div>
      ${[['l', 'Legendás'], ['e', 'Epikus'], ['r', 'Ritka'], ['k', 'Gyakori']].map(([k, n]) => `<div class="odd"><i class="rar r-${k}"></i><span>${n}</span><b>${ECON.odds.find(o => o[0] === k)[1]}%</b></div>`).join('')}
      <div class="odd"><i class="rar r-f"></i><span>Full Art változat (bármelyik lapból)</span><b>${ECON.foilChance * 100}%</b></div>
      <div class="odd"><i class="rar r-f"></i><span>Full Art hős (packonként)</span><b>${ECON.heroFaChance * 100}%</b></div>
      <div class="odd gold-odd"><i class="rar r-g"></i><span>✦ Arany hős (packonként · Shiny packban)</span><b>${String(ECON.goldPlain * 100).replace('.', ',')}% · ${ECON.goldShiny * 100}%</b></div>
      <small>Ha ${ECON.pityAfter} packon át nem jön epikus vagy legendás lap, a következőben biztosan lesz. Napi coin: győzelem ${ECON.win}, döntetlen ${ECON.draw}, vereség ${ECON.loss}, legfeljebb ${ECON.dailyCap}. Egy lapból legfeljebb ${DUPE_KEEP} példány marad meg, a többit a játék automatikusan beváltja: lapként ${DUPE_COIN} coin, Full Art vagy változat lap esetén ${DUPE_COIN_RARE} coin.</small>
    </div>`;
  $('#freePack').onclick = () => buyPack('base', true);
  if ($('#giftPack')) $('#giftPack').onclick = () => buyPack('base', 'gift');
  if ($('#faPack')) $('#faPack').onclick = () => buyPack('base', 'fa');
  $('#buyPack').onclick = () => buyPack('base', false);
  $('#buyShiny').onclick = () => buyPack('base', 'shiny');
  if ($('#giftShiny')) $('#giftShiny').onclick = () => buyPack('base', 'shinyGift');
}
function packHTML(setId, o = {}) {
  return `<div class="pack pk${o.shiny ? ' shiny' : ''}" role="img" aria-label="Best of Us – ${o.shiny ? 'Shiny ' : ''}${SETS[setId].name} booster pack">
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
  const hasGold = cards.some(c => c.gold);
  if (hasGold) {   // arany van a packban: a feltépett pack aranyba borul, remeg a képernyő
    o.classList.add('gold-pack');
    await pk.animate([{ transform: 'none', filter: 'brightness(1)' }, { transform: 'scale(1.06) rotate(-1.5deg)', filter: 'brightness(1.5) sepia(.6)' }, { transform: 'scale(1.1) rotate(1.5deg)', filter: 'brightness(1.8) sepia(.8)' }, { transform: 'none', filter: 'brightness(1)' }], { duration: 900, easing: 'ease-in-out' }).finished;
  }
  const flash = document.createElement('div'); flash.className = 'op-flash' + (hasGold ? ' gold' : ''); o.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 600 });
  await packEl.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(90px) scale(.9)', opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }).finished;
  packEl.remove();
  const row = document.createElement('div'); row.className = 'op-cards';
  row.innerHTML = cards.map((c, i) => `<button class="flip${c.gold ? ' goldback' : ''}" data-i="${i}" style="--rc:${RAR_COLOR[pcRar(c)]}" aria-label="Lap felfordítása">
      <span class="flip-in"><span class="face back"></span><span class="face front">${pcHTML(c, { big: true, foil: c.foil })}${c.dupe ? `<em class="newtag dupetag">+${c.dupe} coin</em>` : c.have > 2 ? `<em class="newtag dupetag">×${c.have}</em>` : c.isNew ? '<em class="newtag">Új!</em>' : ''}</span></span></button>`).join('');
  o.querySelector('.op-stage').appendChild(row);
  const hint = document.createElement('div'); hint.className = 'op-hint'; hint.textContent = 'Fordítsd fel a lapokat'; o.querySelector('.op-stage').appendChild(hint);
  row.querySelectorAll('.flip').forEach((f, i) => f.animate([{ transform: 'translateY(60px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 380, delay: 80 * i, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
  let left = cards.length;
  await new Promise(done => {
    let busyFlip = false;
    row.addEventListener('click', async e => {
      const f = e.target.closest('.flip'); if (!f || f.classList.contains('open') || busyFlip) return;
      e.stopPropagation();
      const c = cards[+f.dataset.i], rar = pcRar(c);
      if (c.gold) { busyFlip = true; await goldReveal(o, f, c); busyFlip = false; }
      else if (rar === 'l' || c.foil || (!c.hero && CARD[c.id].variantOf)) { busyFlip = true; await rareReveal(o, f, c); busyFlip = false; }
      else { f.classList.add('open'); if (rar === 'e' || (!c.hero && CARD[c.id].variantOf)) f.classList.add('glow'); }
      if (--left === 0) done();
    });
  });
  hint.textContent = 'Koppints egy lapra a részletekhez';
  const btn = document.createElement('button'); btn.className = 'btn primary op-done'; btn.textContent = 'Tovább';
  o.querySelector('.op-stage').appendChild(btn);
  row.addEventListener('click', e => { const f = e.target.closest('.flip.open'); if (f) { const c = cards[+f.dataset.i]; if (c.hero) { openModal(heroCardHTML(HERO[c.hero], { big: true, foil: true, gold: c.gold }), c.gold ? '✦ Arany hős' : 'Full Art hős'); return; } openModal(cardHTML(c.id, { big: true, foil: c.foil }), `${RAR[CARD[c.id].rarity]}${c.foil ? ' · Full Art' : ''} · most ${owned(c.id)} db van belőle`, cardHelpHTML(c.id)); } });
  await new Promise(r => btn.addEventListener('click', r, { once: true }));
  o.remove(); o.classList.remove('gold-pack'); renderShop();
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
    <div class="rare-banner gold-banner">ARANY HŐS</div><div class="gold-sub">A legritkább lap a játékban</div>
    <div class="rare-name">${HERO[c.hero].name}${c.isNew ? ' · Új!' : c.dupe ? ` · már megvolt: +${c.dupe} coin` : ''}</div><div class="op-hint" style="visibility:hidden">Koppints a folytatáshoz</div>`;
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
  const vari = !c.hero && !!CARD[c.id].variantOf;
  const kind = vari && !fa ? 'var' : fa && leg ? 'both' : fa ? 'fa' : 'leg';
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
  const label = c.hero ? 'Full Art hős!' : vari ? '✦ Ritka változat!' : kind === 'both' ? 'Legendás · Full Art!' : kind === 'fa' ? 'Full Art!' : 'Legendás!';
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
function allDecks() {
  const starters = Object.entries(DECKS).map(([id, d]) => ({ id, name: d.name, desc: d.desc, hero: d.hero, list: d.list, starter: true }));
  return starters.concat(Store.p ? Store.p.decks : []);
}
const deckCount = list => Object.values(list).reduce((a, b) => a + b, 0);
function deckProblem(list, hero) {
  if (hero !== undefined && !HERO[hero]) return 'Válassz hőst';
  const n = deckCount(list);
  if (n !== DECK_SIZE) return `${n}/${DECK_SIZE} lap`;
  for (const [id, k] of Object.entries(list)) if (k > 0 && CARD[id].off) return `${CARD[id].name}: még nem elérhető`;
  for (const [id, k] of Object.entries(list)) if (k > owned(id)) return `Hiányzik: ${CARD[id].name}`;
  for (const id of Object.keys(list)) if (CARD[id].hero && list[id] > 0 && CARD[id].hero !== hero) return `${CARD[id].name}: csak ${HERO[CARD[id].hero].name} paklijába`;
  return null;
}
const deckIssue = d => deckProblem(d.list, d.hero || null);
function heroPortrait(hid, cls = '') {
  const h = HERO[hid];
  if (!h) return `<span class="hp-img empty ${cls}">?</span>`;
  const aid = heroSkin(hid) === 'gold' && ART['g_' + hid] ? 'g_' + hid : hid;
  return `<span class="hp-img ${cls}${aid !== hid ? ' gold' : ''}" style="--h:${h.hue};${ART[aid] ? `background-image:url('${artSrc(aid, false)}')` : ''}">${ART[aid] ? '' : initials(h.name)}</span>`;
}
function renderDecks() {
  const ds = allDecks();
  $('#decksBody').innerHTML = `<button class="btn primary" id="newDeck">+ Új pakli</button>
    <div class="deck-list">${ds.map(d => {
      const prob = deckIssue(d), h = HERO[d.hero];
      return `<button class="deck-card" data-deck="${d.id}">
        ${heroPortrait(d.hero, 'dc-hero')}
        <span class="dc-txt"><b></b><em>${h ? h.name : 'Nincs hős'}</em><small>${d.starter ? 'Kezdőpakli · nem szerkeszthető' : prob ? prob : 'Játékra kész'}</small></span>
        <span class="dc-go">${d.starter ? 'Megnéz' : 'Szerkeszt'}</span></button>`;
    }).join('')}</div>`;
  $('#decksBody').querySelectorAll('.deck-card').forEach((b, i) => b.querySelector('b').textContent = ds[i].name);
  $('#newDeck').onclick = () => pickHero(null, hid => openEditor(null, hid));
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
  ED.isNew = !src; ED.filter = 'all';
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
  const pool = PLAYABLE.filter(c => owned(c.id) > 0 && (!c.hero || c.hero === d.hero) && (ED.filter === 'all' || c.type === ED.filter))   // kánon eseményt csak a saját hőse kap
                    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, 'hu'));
  $('#edPool').innerHTML = pool.map(c => {
    const inDeck = d.list[c.id] || 0, cap = Math.min(maxCopies(c.id) - (sameCount(d.list, c.id) - inDeck), owned(c.id));
    return `<button class="ed-card${inDeck >= cap || n >= DECK_SIZE ? ' full' : ''}${inDeck ? ' in' : ''}" data-add="${c.id}" ${ED.readonly ? 'disabled' : ''}>
      ${cardHTML(c.id, { foil: ownsFoil(c.id) })}<span class="ed-own">${inDeck ? `${inDeck}/${cap} a pakliban` : `${cap} db`}</span></button>`;
  }).join('') || '<p class="ed-empty">Ebből a fajtából nincs még lapod.</p>';
  document.querySelectorAll('#edFilter button').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === ED.filter));
  $('#edSave').hidden = ED.readonly; $('#edDelete').hidden = ED.readonly || ED.isNew; $('#edCopy').hidden = !ED.readonly;
  $('#edStatus').textContent = ED.readonly ? 'Kezdőpakli – másold le, ha módosítanád.' : prob ? `Még nem játszható: ${prob}` : '✓ Játékra kész';
  $('#edStatus').className = 'ed-status' + (!ED.readonly && !prob ? ' ok' : '');
}
const cardCostBase = id => CARD[id].cost;
$('#edHero').onclick = () => { if (!ED.readonly) pickHero(ED.deck.hero, hid => { ED.deck.hero = hid; renderEditor(); }); };
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
  d[id] = (d[id] || 0) + 1; renderEditor();
  const row = $(`#edList [data-rm="${id}"]`);
  if (row) { row.scrollIntoView({ block: 'nearest' }); row.animate([{ background: 'rgba(255,211,77,.45)' }, { background: '' }], { duration: 500 }); }
});
$('#edPool').addEventListener('contextmenu', e => { const b = e.target.closest('[data-add]'); if (b) { e.preventDefault(); } });
$('#edList').addEventListener('click', e => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  if (ED.readonly) { openModal(cardHTML(b.dataset.rm, { big: true, foil: ownsFoil(b.dataset.rm) }), '', cardHelpHTML(b.dataset.rm)); return; }
  const d = ED.deck.list, id = b.dataset.rm; d[id]--; if (!d[id]) delete d[id]; renderEditor();
});
$('#edFilter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { ED.filter = b.dataset.f; renderEditor(); } });
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
function questsOnMatch(m) {
  const p = Store.p; if (!p) return [];
  const Q = ensureQuests(p), got = [];
  const step = (pool, q, reward) => {
    if (q.done) return;
    q.prog = Math.min(qDef(pool, q.id).goal, q.prog + (qDef(pool, q.id).f(m, q) || 0));
    if (q.prog >= qDef(pool, q.id).goal) { q.done = true; reward(); got.push({ txt: qText(pool, q), rew: pool === Q_WEEKLY ? '1 Shiny pack' : '1 pack', weekly: pool === Q_WEEKLY }); }
  };
  for (const q of Q.daily) step(Q_DAILY, q, () => { p.giftPacks = (p.giftPacks || 0) + 1; });
  step(Q_WEEKLY, Q.weekly, () => { p.shinyPacks = (p.shinyPacks || 0) + 1; });
  save(); renderQuestBadge();
  return got;
}
function renderQuestBadge() {
  const b = $('#questBadge'); if (!b || !Store.p) return;
  const Q = ensureQuests(Store.p), n = Q.daily.filter(q => q.done).length + (Q.weekly.done ? 1 : 0);
  b.textContent = `${n}/4`;
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
  $('#questBody').innerHTML = `
    <div class="lbl">Napi küldetések <small>· új feladatok ${hrs(mid - now)} múlva</small></div>
    ${Q.daily.map(q => row(Q_DAILY, q, '<span class="q-pack"></span><em>1 pack</em>', 'daily')).join('')}
    <div class="lbl">Heti küldetés <small>· hétfő 0:01-kor frissül (${hrs(weekEnds() - now)})</small></div>
    ${row(Q_WEEKLY, Q.weekly, '<span class="q-pack shiny"></span><em>1 Shiny</em>', 'weekly')}
    <p class="q-note">A haladás meccs végén számít (a bot elleni meccseken). A jutalom teljesítéskor azonnal jóváíródik, a Boosterek menüben bonthatod ki.</p>`;
}

// ---- Season Pass (ingyenes) ----
// XP: meccs (győzelem 60 / döntetlen 40 / vereség 30) + napi küldetés 100 + heti küldetés 300.
// 30 szint, szintenként 250 XP; a 30. után minden további 250 XP ráadás packot ad.
// A jutalmat kézzel kell átvenni; ami a szezon végéig átvétlen marad, a következő szezon indulásakor automatikusan jóváíródik.
const PASS_XP = { win: 60, draw: 40, loss: 30, daily: 100, weekly: 300, perLevel: 250 };
const SEASONS = [
  { id: 's1', name: '1. szezon · Nyitókör', start: new Date(2026, 8, 28, 0, 0), end: new Date(2026, 10, 2, 0, 1),
    tiers: [
      { coins: 50 }, { packs: 1 }, { coins: 75 }, { packs: 1 }, { shiny: 1 },
      { coins: 100 }, { packs: 2 }, { coins: 75 }, { packs: 1 }, { shiny: 1 },
      { coins: 100 }, { card: 'c_pifti2' }, { coins: 100 }, { packs: 1 }, { shiny: 1 },
      { coins: 150 }, { packs: 2 }, { card: 'c_tzs2' }, { packs: 2 }, { shiny: 1 },
      { coins: 150 }, { packs: 2 }, { coins: 150 }, { packs: 3 }, { card: 'i_aranylanc' },
      { coins: 200 }, { packs: 3 }, { shiny: 1 }, { coins: 250 }, { heroPick: true },
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
  return '';
}
function rewIcon(r) {
  if (r.coins) return '<span class="coin sp-coin" aria-hidden="true"></span>';
  if (r.packs) return `<span class="q-pack" aria-hidden="true"></span>${r.packs > 1 ? `<i class="sp-x">×${r.packs}</i>` : ''}`;
  if (r.shiny) return '<span class="q-pack shiny" aria-hidden="true"></span>';
  if (r.fa) return '<span class="q-pack fa" aria-hidden="true"></span>';
  if (r.card) return ART[r.card] ? `<span class="sp-thumb" aria-hidden="true" style="background-image:url('${artSrc(r.card)}')"></span>` : '<span class="sp-mystery" aria-hidden="true"><b>★</b></span>';
  if (r.heroPick) return '<span class="sp-mystery" aria-hidden="true"><b>?</b></span>';
  return '';
}
// jutalom jóváírása; kártya/hős esetén a megmutatandó lapot adja vissza
function grantRew(p, r, heroId) {
  if (r.coins) p.coins += r.coins;
  else if (r.packs) p.giftPacks = (p.giftPacks || 0) + r.packs;
  else if (r.shiny) p.shinyPacks = (p.shinyPacks || 0) + r.shiny;
  else if (r.fa) p.faPacks = (p.faPacks || 0) + r.fa;
  else if (r.card) { const e = p.coll[r.card] || (p.coll[r.card] = { n: 0, f: 0 }); e.f++; return { id: r.card, foil: true }; }
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
  for (const q of quests) gain += q.weekly ? PASS_XP.weekly : PASS_XP.daily;
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
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal sp-reveal"><h3>Season Pass jutalom</h3>${pcHTML(got, { big: true, foil: true })}
    <p class="live">${pcName(got)} – ${!got.hero && CARD[got.id].variantOf ? 'különleges változat, Full Art' : 'Full Art'}. Bekerült a gyűjteményedbe.</p><button class="btn primary" data-x>Szuper!</button></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]')) o.remove(); };
  $('#layer').appendChild(o);
}
function claimTier(i) {
  const p = Store.p, s = curSeason() || SEASONS.find(x => x.id === p.pass?.season); if (!s) return;
  const P = p.pass; if (P.claimed.includes(i) || passLevel(P.xp) < i + 1) return;
  const r = s.tiers[i];
  const finish = hero => {
    const got = grantRew(p, r, hero); P.claimed.push(i); save(); renderPass(); renderProfileBar();
    if (got) showPassReveal(got); else toast(`+${rewLabel(r)}`);
  };
  if (r.heroPick) pickHero(null, finish, 'Válaszd ki a Full Art hősödet', 'Ennek a hősnek a Full Art változatát kapod meg. A már meglévőket ✨ jelzi.');
  else finish();
}
function claimAll() {
  const p = Store.p, s = SEASONS.find(x => x.id === p.pass?.season); if (!s) return;
  const P = p.pass, lv = passLevel(P.xp); let n = 0, hero = -1, shown = null;
  for (let i = 0; i < Math.min(lv, s.tiers.length); i++) {
    if (P.claimed.includes(i)) continue;
    if (s.tiers[i].heroPick) { hero = i; continue; }   // a hőst külön kell kiválasztani
    const got = grantRew(p, s.tiers[i]); P.claimed.push(i); n++; if (got) shown = got;
  }
  const ex = Math.max(0, lv - s.tiers.length - (P.extra || 0));
  if (ex) { p.giftPacks = (p.giftPacks || 0) + ex; P.extra = (P.extra || 0) + ex; n += ex; }
  save(); renderPass(); renderProfileBar();
  if (n) toast(`${n} jutalom átvéve`);
  if (shown) showPassReveal(shown);
  if (hero >= 0) setTimeout(() => claimTier(hero), shown ? 0 : 300);
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
    const big = r.shiny || r.fa || r.card || r.heroPick;
    return `<div class="sp-row ${st}${big ? ' big' : ''}${i === lv ? ' cur' : ''}" data-i="${i}">
      <div class="sp-lv"><b>${i + 1}</b></div>
      <div class="sp-ic">${rewIcon(r)}</div>
      <div class="sp-name"><b>${rewLabel(r)}</b>${r.heroPick ? '<small>Te választod ki, melyik hős legyen</small>' : r.card ? `<small>${CARD[r.card].passOnly ? 'Csak Full Art, csak a Season Passból' : `${RAR[CARD[r.card].rarity]}, garantált Full Art`}</small>` : ''}</div>
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
$('#goPass').onclick = () => { if (!Store.p) return showCreate(); renderPass(); show('scr-pass'); };

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
const tutStep = () => S && S.tut && !S.tut.free ? TUT_STEPS[S.tut.step] : null;
const tutSide = x => x === 'me' ? ME : BOT;
function startTutorial(opt = {}) {
  const mine = { c_gyuri:2, c_sasi:2, a_cheddar:2, c_kovacs:2, a_dinnyes:2, c_zoli:2, i_napszemuveg:2, c_rebi:1, c_boros:1, i_energiaital:1, c_vajda:1, c_pifti:1, c_veghtomi:1 };
  const bot = { c_pifti:2, c_gyuri:2, c_kovacs:2, c_rebi:2, a_dinnyes:2, c_zoli:2, i_napszemuveg:2, a_cheddar:2, c_vajda:2, a_delfin:2 };
  S = newGame('tomi', mine, 'david', bot, ME); S.events = [];
  const P = S.players[ME], B = S.players[BOT], card = id => ({ uid: ++S.uidc, id });
  P.hand = ['c_pifti', 'i_napszemuveg', 'a_dinnyes', 'c_vajda'].map(card);
  P.deck = [...shuffle(['c_gyuri', 'a_cheddar', 'c_kovacs', 'c_zoli', 'i_napszemuveg', 'c_rebi', 'c_boros', 'i_energiaital', 'a_dinnyes', 'c_sasi', 'a_cheddar', 'c_gyuri', 'c_kovacs']), 'c_veghtomi', 'c_sasi', 'c_gyuri'];
  B.hand = ['c_pifti', 'c_kovacs', 'c_zoli', 'c_pifti'].map(card);
  B.deck = shuffle(['c_gyuri', 'c_gyuri', 'c_rebi', 'a_dinnyes', 'c_kovacs', 'a_cheddar', 'c_vajda', 'a_delfin', 'i_napszemuveg', 'c_rebi', 'c_zoli', 'a_cheddar']);
  B.hp = B.maxHp = 12;
  S.tut = { step: 0, free: false, onboard: !!opt.onboard };
  ui.sel = null; ui.pend = null; busy = false; ui.handSeen = null; ui.botHandN = null; ui.flying = new Set();
  show('scr-game'); $('#layer').innerHTML = ''; render();
}
function tutAdvance() { S.tut.step++; if (!TUT_STEPS[S.tut.step]) S.tut.free = true; tutHide(); if (!busy) render(); setTimeout(tutCheck, 200); }   // újrarajzolás: a lapok szürkesége a lépéshez igazodjon
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
    COACH.el.innerHTML = `<small class="coach-n">Oktató · ${S.tut.step + 1}/${TUT_STEPS.length}</small><p>${st.txt}</p>`
      + (st.kind === 'info' ? `<div><button class="btn primary" data-c="ok">${st.last ? 'Játsszunk!' : 'Tovább'}</button>${S.tut.step === 0 && !S.tut.onboard ? '<button class="btn ghost" data-c="skip">Kihagyom</button>' : ''}</div>` : `<div class="coach-do">${st.kind === 'end' ? '👉 Kör vége' : st.kind === 'tap' ? '👉 Koppints a kiemelt elemre' : '👉 Húzd a lapot a kiemelt helyre'}</div>`);
    COACH.el.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return;
      if (b.dataset.c === 'skip') { tutHide(); S.tut = null; if (Store.p) { Store.p.tutSkip = true; save(); } renderPick(); show('scr-pick'); return; }
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
  const win = S.winner === ME;
  if (S.tut?.onboard) return onboardDone(win);
  if (Store.p && !Store.p.tutDone) { Store.p.tutDone = true; save(); }
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal result${win ? '' : ' lose'}"><h2>${win ? 'Megvan!' : 'Most nem jött össze'}</h2>
    <p>${win ? 'Megnyerted a gyakorló meccset – most már tudod az alapokat. Válassz paklit, és jöhetnek az igazi meccsek! Tipp: a meccs elején a rossz kezdő lapokat kicserélheted.' : 'Semmi gond, a lényeget már tudod. Kezdheted újra az oktatót, vagy mehetsz egy igazi meccsre.'}</p>
    <div class="row"><button class="btn" data-r="again">Oktató újra</button><button class="btn primary" data-r="play">Igazi meccs</button></div>
    <button class="btn ghost" data-r="menu">Menü</button></div>`;
  o.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; o.remove();
    if (b.dataset.r === 'again') startTutorial(); else if (b.dataset.r === 'play') { renderPick(); show('scr-pick'); } else { renderMenuFan(); renderProfileBar(); show('scr-menu'); } };
  setTimeout(() => $('#layer').appendChild(o), 700);
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
    <button class="btn primary" data-r="menu">Irány a főmenü!</button><button class="btn ghost" data-r="again">Még egy gyakorló meccs</button></div>`;
  o.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; o.remove(); tutHide();
    if (b.dataset.r === 'again') return startTutorial();
    S = null; renderMenuFan(); renderProfileBar(); show('scr-menu'); setTimeout(() => toast(`Üdv, ${Store.p?.name || ''}! Kezdd a boosterek bontásával 🎁`), 400); };
  setTimeout(() => $('#layer').appendChild(o), 700);
}

$('#goTut').onclick = () => { if (!Store.p) return showCreate(); startTutorial(); };

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
const pvpClean = s => { const c = JSON.parse(JSON.stringify(s)); delete c.events; delete c.qs; delete c.pvp; delete c.qDone; return c; };
function pvpMyTurn(d) {
  if (!pvpMine(d)) return false;
  const me = pvpSideOf(d);
  if (d.status === 'mull') return !(d.mulled || [])[me];
  return d.status === 'play' && d.state && d.state.active === me && d.state.winner == null;
}
function pvpStart() {   // egyetlen feliratkozás az összes PvP-meccsre (lobbi, jelvény és a futó meccs is ebből él)
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
  const turn = PVP.list.filter(pvpMyTurn).length, open = PVP.list.filter(d => d.status === 'open' && !pvpMine(d) && (!d.to || d.to === Store.uid) && (!d.live || Date.now() - (d.seen || 0) < 20000)).length;
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
  const others = L.filter(d => d.status === 'open' && d.host?.uid !== Store.uid && (!d.to || d.to === Store.uid) && (d.live ? now - (d.seen || 0) < 20000 : now - (d.created || 0) < 3 * 864e5));
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
function pvpPickDeck(title, done) {
  const ds = allDecks().filter(d => !deckIssue(d));
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal hero-pick"><h3>${title}</h3><div class="hp-list">${ds.map(d => `<button class="hero-row" data-d="${d.id}">${heroPortrait(d.hero)}<span><b></b><small>${HERO[d.hero].name}</small></span></button>`).join('')}</div><button class="btn ghost" data-x>Mégse</button></div>`;
  o.querySelectorAll('.hero-row b').forEach((b, i) => b.textContent = ds[i].name);
  o.onclick = e => { const b = e.target.closest('[data-d]'); if (b) { o.remove(); done(ds.find(d => d.id === b.dataset.d)); return; } if (e.target.closest('[data-x]') || e.target === o) o.remove(); };
  $('#layer').appendChild(o);
}
const pvpMe = dk => ({ ver: window.APP_VERSION || '', uid: Store.uid, name: Store.p.name || 'Játékos', hero: dk.hero, deckName: dk.name, list: { ...dk.list },
  cos: { heroGold: heroSkin(dk.hero) === 'gold', heroFa: heroSkin(dk.hero) === 'fa', foils: Object.keys(dk.list).filter(id => ownsFoil(id)) } });   // amit az ellenfél is lát: Full Art hős és lapok
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
    if (!d || d.status !== 'open' || d.guest) { toast('Ezt a kihívást már elfogadta valaki'); return false; }
    const guest = pvpMe(dk), first = Math.random() < .5 ? 0 : 1;
    PVP.id = id; seedRng(pvpHash(id + ':start'));
    const s = newGame(d.host.hero, { ...d.host.list }, guest.hero, { ...guest.list }, first, { mulligan: true });
    unseedRng();
    s.names = [d.host.name, guest.name];
    s.cos = [d.host.cos || { heroFa: false, foils: [] }, guest.cos];
    const upd = { parts: [d.host.uid, Store.uid], guest, status: 'mull', first, v: 0, state: pvpClean(s), mulled: [false, false], updated: Date.now(), mullAt: Date.now(), afk: [0, 0] };
    await ref.update(upd);
    pvpEnter(id, { id, ...d, ...upd });
    return true;
  } catch { toast('Nem sikerült csatlakozni'); return false; }
}
// belépés egy meccsbe (új vagy folytatott)
function pvpEnter(id, fresh) {
  const d = fresh || PVP.list.find(x => x.id === id); if (!d || !d.state) { toast('Betöltés…'); return; }
  const side = pvpSideOf(d);
  ME = side; BOT = 1 - side;
  PVP.id = id; PVP.v = d.v; PVP.queue = []; PVP.running = false;
  S = { ...JSON.parse(JSON.stringify(d.state)), events: [], pvp: { id, side, live: !!d.live } };
  PVP.turnAt = d.turnAt || Date.now(); PVP.afk = d.afk || [0, 0];
  pvpJoinRoom(id, side); pvpPresence();
  ui.sel = null; ui.pend = null; busy = false; ui.handSeen = null; ui.botHandN = null; ui.flying = new Set();
  show('scr-game'); $('#layer').innerHTML = ''; render();
  if (d.status === 'mull') {
    if (!(d.mulled || [])[side]) setTimeout(() => showMulligan(d.first), 500);
    else pvpWaitMsg();
    pvpWatchMull(d);
  } else if (d.status === 'done' || S.winner != null) endMatch();
  else if (S.active === ME) toast('Te jössz!');
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
      if (!wasMull && d.v === PVP.v + 1 && L.by !== ME && (L.kind === 'play' || L.kind === 'end')) {
        busy = true; render();
        pvpSeed(d.v);
        try {
          if (L.kind === 'play') {
            const hi = S.players[BOT].hand.findIndex((c, i) => i === L.hi && c.id === L.id);
            if (hi >= 0) { await showPlayed(L.id, L.t); await runFx(() => playCard(S, BOT, hi, L.t)); }
          } else await resolveEnd();
        } catch {}
        unseedRng();
      }
      if (!wasMull && L.by !== ME && d.v === PVP.v + 1 && JSON.stringify(pvpClean(S)) !== JSON.stringify(d.state)) PVP.desync = (PVP.desync || 0) + 1;
      PVP.v = d.v;   // a beírt állás a mérvadó
      if (d.turnAt) PVP.turnAt = d.turnAt; if (d.afk) PVP.afk = d.afk;
      const keepSeen = ui.handSeen;
      S = { ...JSON.parse(JSON.stringify(d.state)), events: [], pvp: S.pvp, qs: S.qs, qDone: S.qDone };
      if (wasMull) ui.handSeen = null; else ui.handSeen = keepSeen;
      busy = false; render();
      if (S.winner != null) { endMatch(); break; }
      if (L.by !== ME && S.active === ME) toast(L.kind === 'forfeit' ? 'Az ellenfél feladta' : L.auto ? 'Lejárt az ellenfél ideje – te jössz!' : 'Te jössz!');
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
    const qd = questsOnMatch({ win, hero: S.players[ME].heroId, ...(S.qs || { actions: 0, items: 0, chars: 0, locs: 0, big: 0, heroDmg: 0, kills: 0 }) });
    const px = passOnMatch(draw ? 'draw' : win ? 'win' : 'loss', qd);
    p.pvp = p.pvp || { w: 0, l: 0, d: 0 }; p.pvp[win ? 'w' : draw ? 'd' : 'l']++; save();
    reward = (aw ? `<div class="reward"><span class="coin" aria-hidden="true"></span><b>+${aw.gain}</b><small>coin · ma ${aw.today}/${ECON.dailyCap}</small></div>` : '')
      + qd.map(q => `<div class="q-done-pop">✓ Küldetés teljesítve: <b>${q.txt}</b><em>+${q.rew}</em></div>`).join('')
      + (px ? `<div class="sp-pop${px.up ? ' up' : ''}"><b>+${px.gain} XP</b> Season Pass</div>` : '');
  }
  const opp = escH(S.names?.[BOT] || 'Az ellenfél');
  const why = S.reason === 'forfeit' ? (win ? `${opp} feladta a meccset.` : 'Feladtad a meccset.')
    : S.reason === 'afk' ? (win ? `${opp} elhagyta a meccset (kétszer lejárt az ideje).` : 'Kétszer lejárt az időd, így elvesztetted a meccset.')
    : S.reason === 'time' ? `Letelt a ${MAX_HALF / 2} kör. Életek: te ${S.players[ME].hp}, ${opp} ${S.players[BOT].hp}.`
    : draw ? 'Mindkét hős egyszerre dőlt ki.' : win ? `${opp} hőse kiütve!` : `${opp} kiütötte a hősödet.`;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal result${win ? '' : ' lose'}"><h2>${draw ? 'Döntetlen' : win ? 'Győzelem!' : 'Vereség'}</h2><p>${why}</p>${reward}
    <div class="row"><button class="btn" data-r="menu">Menü</button><button class="btn primary" data-r="pvp">PvP</button></div></div>`;
  o.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; o.remove();
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
async function pvpRoomInit() {
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
  o.innerHTML = `<div class="modal"><div class="pv-spin">⚔️</div><h3>${PVP.friendTo ? `Várjuk: ${escH(PVP.friendTo.name)}` : 'Ellenfél keresése…'}</h3><p class="live" id="pvSearchT">0:00</p><p class="live">${PVP.friendTo ? 'Elküldtük neki a kihívást – amint elfogadja, indul a meccs.' : 'Amint valaki más is élő meccset keres, indul a játék. Szólj a haveroknak, hogy nyomják meg ők is az „Élő meccs keresése” gombot!'}</p><button class="btn" data-x>Mégse</button></div>`;
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
  const cands = PVP.friendTo ? [] : PVP.list.filter(d => d.live && d.status === 'open' && !d.guest && !d.to && pvpVerOk(d) && d.host?.uid !== Store.uid && now - (d.seen || 0) < 20000).sort((a, b) => (a.created || 0) - (b.created || 0));
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
  if (!mine && !PVP.creating && !PVP.searching) {
    PVP.creating = true;
    const ft = PVP.friendTo, extra = ft ? { to: ft.uid, toName: ft.name } : {};
    try { const ref = await Store.db.collection('pvp').add({ parts: ft ? [Store.uid, ft.uid] : [Store.uid], status: 'open', live: true, created: now, seen: now, updated: now, host: pvpMe(PVP.searchDeck), guest: null, v: 0, ...extra }); PVP.searching = ref.id; }
    catch { toast('Nem sikerült keresést indítani (lehet, hogy nincs írási jogod)'); pvpStopSearch(); }
    finally { PVP.creating = false; }
  } else if (mine) { PVP.friendSeen = true; pvpDoc(mine.id).update({ seen: now }).catch(() => {}); }
  else if (PVP.friendTo && PVP.searching && PVP.friendSeen) { toast(`${PVP.friendTo.name} most nem ér rá`); pvpStopSearch(); }   // elutasította (törölte a kihívást)
}
function pvpStopSearch(cancel) {
  clearInterval(PVP.hb); clearInterval(PVP.searchClock); PVP.hb = null;
  if (cancel && PVP.searching) { const d = PVP.list.find(x => x.id === PVP.searching); if (!d || d.status === 'open') pvpDoc(PVP.searching).delete().catch(() => {}); }
  PVP.searching = null; PVP.searchDeck = null; PVP.friendTo = null; PVP.friendSeen = false;
  $('#layer .pv-search')?.remove(); pvpPresence();
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

$('#goPvp').onclick = () => { if (!Store.p) return showCreate(); pvpStart(); renderPvp(); show('scr-pvp'); pvpPresence(); };

// ---- menü gombok ----
$('#goShop').onclick = () => { if (!Store.p) return showCreate(); renderShop(); show('scr-shop'); };
$('#goDecks').onclick = () => { if (!Store.p) return showCreate(); renderDecks(); show('scr-decks'); };
$('#goQuests').onclick = () => { if (!Store.p) return showCreate(); renderQuests(); show('scr-quests'); };

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
const tradable = id => { const c = CARD[id]; return c && !c.token && !c.variantOf && !c.foilOnly && !c.passOnly; };
const RAR_ORDER = { l: 0, e: 1, r: 2, k: 3 };
function frPubSync(now) {
  if (!frOn()) return;
  clearTimeout(FR.pubT);
  FR.pubT = setTimeout(() => {
    const p = Store.p, coll = {};
    for (const [id, e] of Object.entries(p.coll || {})) if (tradable(id) && (e.n || e.f)) coll[id] = [e.n || 0, e.f || 0];
    Store.db.doc('pub/' + Store.uid).set({ name: p.name, code: frCode(Store.uid), w: p.stats?.w || 0, coll, ver: window.APP_VERSION || '', updated: Date.now() }).catch(() => {});
  }, now ? 50 : 2500);
}
function frStart() {
  if (!frOn() || FR.unsubF) return;
  frPubSync(true);
  FR.unsubF = Store.db.collection('friends').where('parts', 'array-contains', Store.uid).onSnapshot(s => {
    FR.list = s.docs.map(d => ({ id: d.id, ...d.data() }));
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
  const grid = (arr, pick) => arr.length ? `<div class="tr-grid">${arr.map((c, i) => `<button class="tr-c" data-${pick}="${i}">${cardHTML(c.id, { foil: c.foil })}<span class="tr-n">×${c.k}${pick === 'w' && owned(c.id) ? ` · neked ${owned(c.id)}` : ''}</span></button>`).join('')}</div>` : '';
  const step1 = () => {
    o.innerHTML = `<div class="modal tr-box"><h3>${escH(name)} lapjai – melyiket kéred?</h3><p class="live">Csak azonos ritkaságú lapot adhatsz érte, Full Artot Full Artért. Naponta egy csere.</p>
      ${grid(theirs, 'w') || '<p class="q-note">Neki még nincs cserélhető lapja.</p>'}<button class="btn" data-x>Mégse</button></div>`;
  };
  let want = null;
  const step2 = () => {
    const mine = []; for (const [id, e] of Object.entries(Store.p.coll)) { if (!tradable(id) || id === want.id || CARD[id].rarity !== CARD[want.id].rarity) continue; const k = want.foil ? e.f : e.n; if (k > 0) mine.push({ id, foil: want.foil, k }); }
    sortC(mine); o._mine = mine;
    o.innerHTML = `<div class="modal tr-box"><h3>Mit adsz érte?</h3><div class="tr-want">${cardHTML(want.id, { foil: want.foil })}<span>${RAR[CARD[want.id].rarity]}${want.foil ? ' · Full Art' : ''}</span></div>
      ${grid(mine, 'g') || `<p class="q-note">Nincs olyan ${want.foil ? 'Full Art ' : ''}${RAR[CARD[want.id].rarity].toLowerCase()} lapod, amit adhatnál érte.</p>`}<button class="btn" data-back1>Vissza</button></div>`;
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
    if (b.hasAttribute('data-back1')) return step1();
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
$('#goFriends').onclick = () => { if (!Store.p) return showCreate(); frStart(); renderFriends(); show('scr-friends'); FR.list.filter(d => d.status === 'accepted').forEach(d => frFetchPub(frOther(d), true)); };

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
