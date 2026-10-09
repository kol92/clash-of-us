# Best of Us (Clash of Us) – fejlesztői átadó Claude-nak

Ez a repó a **Best of Us** (belső név: Clash of Us) teljes forrása: egy telefonos, gyűjtögetős kártyajáték (TCG) a baráti társaságról. Telepíthető webapp (PWA), élesben: **https://bestofus.pages.dev**.

**A felhasználóval mindig magyarul beszélj.** A felhasználó (Tomi, GitHub: kol92) új lapokat küld képpel, funkciókat kér, hibát jelez, és UI-csomagokat hoz Astrától (ChatGPT-s UI-tervező). Te megvalósítod, teszteled, kiteszed, és frissíted a szabálydokumentumot.

## Felépítés

| Hely | Mi van benne |
|---|---|
| `site/` | A kész, kitett játék. **A Cloudflare Pages ezt teszi ki a `main` ágról** (Build output directory: `site`, nincs build parancs). Kézzel ne szerkeszd – mindig a buildből jön. |
| `src/engine.js` | Játékmotor: lapok (`CARDS`), hősök (`HEROES`), kezdőpaklik (`DECKS`), szabályok, bot (`botChoose`). Node-ból is betölthető (tesztek). |
| `src/ui.js` | Meccsfelület, animációk (`runFx`), meccsnapló (`logEvents`), lapképek (`ART`), portrék (`PORTRAITS`), főmenü. |
| `src/meta.js` | Minden a meccsen kívül: profil, gyűjtemény, boosterek, bolt, szerencsekerék, küldetések, Season Pass, barátok/csere, PvP. Gazdaság: `ECON` (2. sor). |
| `src/shell.html` | A HTML-váz és az összes CSS. |
| `src/build-app.py` | Build: `src/dist/`-be rakja össze az appot (képek hash-verziózva, service worker, manifest, ikonok). |
| `src/deploy.sh` | Build + teszt + `site/` frissítés + commit + push egy lépésben. |
| `src/app/` | `backend.js` (Firebase réteg), `pwa.js`, `sw.js`, app-ikonok (`icon.png`, `icon-maskable.png`). |
| `src/art/` | Lapképek `.webp`-ben (`art/NEV.webp` 800×1067, `art/sm/NEV.webp` 360×480), UI-elemek `art/ui/`-ban. |
| `src/vendor/` | Firebase compat JS (a build innen másolja). |
| `src/tools/` | Tesztek és szimulációk (lásd lent). |
| `src/doc.md` | **A szabálydokumentum** – minden lap, mechanika, gazdasági szám, döntés és változás dátummal. Minden változtatásnál frissítsd. |
| `src/firestore.rules` | Firestore biztonsági szabályok (a Firebase konzolban kell élesíteni, ha változik). |

Backend: Firebase projekt `clash-of-us` (Auth + Firestore + Realtime Database, europe-west1). A konfiguráció a `src/app/backend.js`-ben van.

## Kitétel

```bash
cd <repo>
bash src/deploy.sh "Rövid magyar újdonság-szöveg" "commit üzenet"
```
- Az első paraméter az **Újdonságok** szöveg, amit a játékosok frissítéskor látnak. **Személyes / rejtett / technikai változásnál legyen üres: `""`.**
- A szkript előbb lefuttatja a `tools/fin_test.js`-t; ha hibát talál, nem tesz ki semmit.
- Push után a Cloudflare 1–3 perc alatt kiteszi. A játékosoknak az app teljes bezárása + újranyitása hozza be az új verziót.
- Ha a session commit-aláírást (Co-Authored-By stb.) kér, add a commit üzenethez.

Csak build (kitétel nélkül): `cd src && python3 build-app.py ""` → `src/dist/`. Kell hozzá: Python 3 + Pillow (`pip install pillow`).

## Új lap felvétele (a leggyakoribb feladat)

1. **Motor** – `src/engine.js`, a `CARDS` tömbbe:
   `{ id:'c_valami', type:'char', name:'…', cost:3, atk:3, hp:2, rarity:'r', sneak:true, text:'…' }`
   - Típusok: `char`, `action` (a_), `item` (i_), `loc` (l_), Kánon esemény (f_). Ritkaság: `k` közönséges, `r` ritka, `e` epikus, `l` legendás (gyémánt: `rarKey` → 'd').
   - Kulcsszavak: `sneak` (Sunyulás, rejtve lép be), `taunt` (Provokátor), `muscle` (Izom), `deathDraw` / `deathHeal` / `deathGift` / `deathKill` / `deathBlast` (halálkor), `token:true` (nem gyűjthető, csak keletkezik).
   - Egyedi hatás: a `playCard`-ban (`bid(c.id) === '…'`), kör eleji hatás a `startTurn`-ben (pl. `atiFlee`, `sharkSwim`), halálhatás a `cleanup`-ban. Új eseményt `ev(s, {t:'…', side, i})`-vel küldj, és add hozzá a `ui.js` `logEvents`-éhez (napló) és a `runFx`-hez (lebegő felirat / animáció).
   - Változat-lap: `variantOf:'c_alap'` (ugyanaz a hatás, más kép). Bolti változat: `shopOnly:true, price:100`.
2. **Kép** – a beküldött képet 3:4-re vágd (középre), és mentsd két méretben:
   ```python
   from PIL import Image
   im = Image.open(SRC).convert('RGB'); w, h = im.size; t = round(w*4/3)
   if t < h: y = (h-t)//2; im = im.crop((0, y, w, y+t))
   elif t > h: nw = round(h*3/4); x = (w-nw)//2; im = im.crop((x, 0, x+nw, h))
   im.resize((800,1067), Image.LANCZOS).save('src/art/NEV.webp', quality=82)
   im.resize((360,480), Image.LANCZOS).save('src/art/sm/NEV.webp', quality=82)
   ```
   Majd a `ui.js` `ART` objektumába: `c_valami: { src:'art/NEV.webp', av:'50% 22%', pos:'50% 24%' },` (av/pos = az arc helye a kis és nagy kivágásban).
3. **Kiosztás** – ha a lap ritka (vagy közönséges), mindenki kapjon belőle: `src/meta.js` `STARTER_ADDS`-ba új, eggyel nagyobb kulcs (pl. `22: ['c_valami']`). Epikus/legendás lapot NEM osztunk ki, azok packból jönnek.
4. **Teszt + egyensúly** (lásd lent), aztán **`src/doc.md`** frissítése (lap leírása, dátum, kiosztási verzió, teszteredmény), majd kitétel.

## Tesztek és szimulációk (`src/tools/`, futtatás a `src` mappából)

- `node tools/fin_test.js` – motor-regresszió, a végén **„MINDEN RENDBEN” és „MINDEN RENDBEN 2”** kell. Új mechanikához írj hasonló kis tesztet (példa: `tools/ati_test.js`).
- `LO=2 HI=4 node tools/pt.js c_valami 3000` – a lapot minden kezdőpakliban egy LO–HI költségű karakter helyére teszi, és kiírja a nyerési %-ot a többi kezdőpakli ellen. ~47–54% az egészséges sáv; hasonló költségű lapokkal hasonlítsd össze. `PATCH='E.CARD.c_x.atk=4'` env-vel számok kipróbálhatók.
- `node tools/swap6.js c_valami 900` – ugyanez 4–6 költségű helyre.
- `node tools/hero.js`, `node tools/fp.js N` (kezdő/második játékos aránya), `node sim.js` (hősök egymás ellen).
- UI-képernyőkép (Playwright + Chromium): `cd src && python3 -m http.server 8799 &`, majd `python3 tools/ui1.py 8799 valami.js kimenet.png` – a `valami.js` a betöltött játékban fut (pl. `cardHTML('c_valami',{big:true})` kirajzolása, vagy egy összerakott meccsállás `newGame(...)`, `render()`). A Firebase-t a `tools/fakefb.js` helyettesíti. `tools/match.js` + `ui2.py` = egy teljes bot-meccs UI-ban.

## Fontos szokások, döntések

- A játékos felé minden szöveg magyar, tegező.
- Egyensúly: a hősök saját kezdőpaklival 46–54% között vannak, kezdő/második játékos ~50/50 (a második kap egy 0-s „Egy pohár víz” lapot). Új lapnál ezt ne borítsd.
- Full Art példányonként számít (`s.foilCnt`). A gyémánt lap mindig Full Art.
- Boltból vagy Season Passból vett változat-lapból 2 példány jár.
- Napi coin-plafon: `ECON.dailyCap` (most 200). A szerencsekerék coinja nem számít bele.
- Bolt: limitált kínálat, `SHOP_REFRESH` (meta.js) a következő frissítés dátuma (most `2026-10-16`). Rotációkor a felhasználó küldi az új kínálatot, és új dátumot kell beállítani.
- A bot sosem cseréli le a saját Munkahelyét helyszínre.
- Ranked (meta.js vége): **jelenleg kikapcsolva (`RANKED_ON = false`)** – Tomi szól, mikor induljon, és megadja a jutalmakat (`RK_REWARDS`). Rang a `p.rank`-ban, szezon = `curSeason()` (Season Pass) vagy naptári hónap. A `SEASONS` listában most csak az 1. szezon van (2026-11-02-ig) – a következő Season Pass szezont fel kell venni.
- A szabálydokumentum (`src/doc.md`) a felhasználó claude.ai Projectjében is megvan („claude/clash-of-us-szabalyok.md”). Ha van Project-hozzáférésed, minden változás után töltsd fel oda is.

## Nyitott ötletek / teendők

- Hibajelentő gomb + hibanapló a játékban.
- Tesztelés két valódi telefonon (PvP, csere).
- Hangok.
- Astrától várt UI-elemek: modal keret, inaktív fül, Munkahely helyszínkép, Season Pass / Küldetések / Barátok / PvP fejlécek, mulligan képernyő, belépő képernyő.
- 2026-10-16: bolt-rotáció.
