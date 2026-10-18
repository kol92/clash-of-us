# Amsterdam Hősei – első mini-szett (élesítve 2026-10-18, megjelenik 2026-10-19 19:00)

> 2026-10-18: a név a pack feliratát követi: „Amsterdam Hősei”, a lapok „…, Amsterdam hőse”. Az alábbi régebbi bejegyzésekben még „Amszterdam” írásmód szerepelhet. Bolt-sorrend, küldetés-jutalmak, időzár: lásd doc.md.

**Állapot (2026-10-16):** csak a teszt oldalon (https://teszt.bestofus.pages.dev). Élesbe csak Tomi szavára, a `teszt` ág `main`-be olvasztásával kerül. Megjelenés: valamikor októberben.

- **Téma:** a társaság 2022-es amszterdami útja.
- **Méret:** **26 lap** (13 gyakori / 6 ritka / 4 epikus / 3 legendás).
- **Beszerzés:** csak a Boltban, saját packból: **Amszterdam hősei booster** (50 coin, 3 lap) és **Amszterdam Shiny** (250 coin, a legjobb lap biztosan Full Art). Csak a szett lapjai vannak benne (nincs Full Art hős, arany hős, Base set-változat); ha egy ritkaságból nincs lap, eggyel lejjebb sorsol. A Base set packokba nem kerülnek az új lapok. Saját pack-grafika (Astra, 2026-10-16): zöld „Booster pack” és türkiz holografikus „Shiny pack” (`art/ui/pack-ah.webp`, `pack-ahshiny.webp` + `sm/`; a tartalomra vágva, oldalt átlátszó szegéllyel 600×965-re igazítva, hogy a feltépés ugyanott fusson, mint a Base set packnál). A Boltban és a bontásnál is ezek látszanak.
- **Kiosztás:** senki nem kap belőle ingyen (a kezdőgyűjtemény és a `STARTER_ADDS` kizárja a `set`-es lapokat). A Game Over sem jár automatikusan, mint a régi Kánon lapok.
- **Gyűjtemény:** szett-szűrő „🌷 Amszterdam hősei” (csak a teszt oldalon látszik). Kód: a lapokon `set:'ah'`, `SETS.ah` (meta.js), `CF_SETS` (ui.js).

## Lapképek
- **Mind a 26 lapnak és a Betti tokennek van képe (2026-10-17: új kép a Végtelen tripnek, a Reptéri ellenőrzés is megkapta a sajátját – addig tévesen képesnek írtam).** A Bong drágább példányai (`a_bong2…10`) ugyanazt a képet kapják.

## Arany lapok (2026-10-17)
- Három lapnak van **★ Arany** változata (külön kép, arany keret, „★ Arany lap” szalag, ugyanaz a hatás): **Isten hozott Amszterdamban** (a_welcome_g), **High Hawaiians** (a_hawaiians_g), **Game Over** (f_gameover_g – arany keretben, nem a piros Kánon-keretben).
- Csak az Amszterdam hősei boosterből: a pack első lapja helyén **0,5%** (sima) / **5%** (Shiny) eséllyel, mint a Base set arany hősei (`ECON.goldPlain` / `goldShiny`). Mérve 20 000 bontásból: 0,52% / 4,86%; Base set packba nem kerül. A sima 20%-os változat-esély és a Shiny változat-hely nem adja (`goldVar` kizárva).
- Pakliban az alaplappal együtt számít (2-es, Game Overnél 1-es korlát), nem cserélhető. Motor: `variantOf` + `goldVar`; az akciók hatása mostantól az alaplap szerint fut (`switch (bid(c.id))`). Felfedés: „★ Arany lap!”. **Javítva 2026-10-18:** az első változatban arany lap húzásakor a pack-bontás hibára futott (a kód arany *hősnek* vette, és a hős adatait kereste), így a pack meg sem nyílt – ezért nem jött arany (Tomi ~100 Shiny packból). Most a felfedés „ARANY LAP” felirattal fut; mérve 3000 vásárolt Shiny packból 4,77%.

## Új kulcsszavak
- **Igézhetetlen** (`elusive`): akcióval és más lapok kijátszáskori hatásával nem célozható – se a gazdája, se az ellenfél (Dinnyés, Ír kávé, Vera, Zsibrita, Reptéri ellenőrzés stb.). A véletlen célzású hatások kihagyják (Alekosz, Molnár Zsolti, Koktélarmageddon, Tomi, a parti lelke, Among Us, Cápa érkezése). **Eszköz rátehető** (saját és ellenséges is, Tomi döntése). A mindenkit érő hatások eltalálják (Tálca shot, JBL, Nyiti, Mosh Pit, Game Over). Jel a lapon: 🛡.
- **Feltámadás** (`revive`, ugyanaz a mechanika, mint Gabi, a legyőzhetetlen): amikor először meghal, 1 élettel feléled a helyén (az eszközei lekerülnek); másodszorra végleg meghal. Jel: ♻.
- Motor: `kwC(u, kulcsszó)` – a lapra nyomtatott kulcsszó, ha a Süti nem vette el (`u.noKw`); `isEl(u)` = Igézhetetlen.

## A lapok (név · költség · értékek · ritkaság · hatás)
**Karakterek**
- **Sasi, Amszterdam hőse** (c_ah_sasi) · 4 · 2/6 · gyakori · Lendület
- **Tomi, Amszterdam hőse** (c_ah_tomi) · 3 · 1/4 · gyakori · Igézhetetlen
- **Barna, Amszterdam hőse** (c_ah_barna) · 3 · 3/2 · gyakori · kijátszáskor egy Varázsgomba a paklidba
- **Laci, Amszterdam hőse** (c_ah_laci) · 2 · 2/2 · gyakori · kijátszáskor **egy** Ír kávé a kezedbe (2026-10-18: kettő helyett egy, Tomi)
- **Ati, Amszterdam hőse** (c_ah_ati) · 5 · 3/4 · gyakori · kijátszáskor maga mellé idéz egy 2/2-es **Bettit** (c_betti, token, nem gyűjthető; előbb jobbra, aztán balra, különben bárhova)
- **Bence, Amszterdam terrorja** (c_ah_bence) · 6 · **3/5** · legendás · Lendület, Feltámadás (2026-10-18: 4/5 → 3/5, Tomi)
- **Barna vízipipája** (c_vizipipa) · 1 · 0/2 · epikus · az **ellenfél oldalára** teszed le (te választod az üres helyét). Nem támad. Amelyik karakter támadással elpusztítja, +2/+2-t kap (a Pajzs nem véd ellene, nincs). Ha az ellenfél visszaküldi a kezébe (Vera, Csend), ő teheti le a te oldaladra. A bot „csalinak” értékeli (annak jó, aki üti).
- **PP, a váratlan** (c_ppvar) · 2 · 3/1 · epikus · Sunyulás; ha egy karakter megtámadja, 2-vel kisebb sebzést okoz neki (a 2 támadású nem sebzi, a 3-as 1-et üt). Amikor PP támad, a visszaütés normál. Nem kulcsszó, a Süti nem veszi el (a Sunyulást igen).
- **Drog kereső kutya** (c_kutya) · 2 · 2/1 · ritka · Sunyulás; halálakor az ellenfél eldob egy véletlen lapot a kezéből

**Eszközök**
- **Börtönlánc** (i_lanc) · 2 · ritka · ellenséges karakterre teszed; a karakter a gazdája minden körének elején 1 sebzést kap (láncanként). Igézhetetlenre is rátehető (eszköz). A STOP nem szedi le (az az ellenfél eszközeit veszi le a saját karaktereiről, ez pedig a te eszközöd).
- **Varázsgomba** (i_gomba) · 1 · gyakori · +1/+1; minden további gomba ugyanazon a karakteren eggyel többet ad (2. +2/+2, 3. +3/+3…). A STOP a halmozott bónuszt is leveszi.
- **Cigi** (i_cigi) · 1 · gyakori · ellenséges karakterre: −1/−1, az élete ettől nem mehet 1 alá

**Akciók**
- **Isten hozott Amszterdamban** (a_welcome) · 1 · gyakori · öt véletlen Amszterdam hősei lapot kever a paklidba (önmagát és a tokeneket nem). **Mindig a kezdő kezedben van** (egy példány a pakli tetejére kerül a kezdő húzás előtt), hacsak a kezdő kéz cseréjénél le nem cseréled – akkor visszakerül a pakliba. Mérés (2026-10-17, 2000 meccs, kezdőpaklikba téve): **32,0%** – a bot mindig kijátssza (átl. a 2. körében), de az 5 véletlen szett-lap felhígítja a kezdőpaklit, és a lap egy kezdő-kéz helyet + egy kört elvisz. Változatok: 0 energia 30,5% · **+ húzz 1 lapot 44,7%** · 0 energia + húzás 42,0%. (Kapcsoló: `CARD.a_welcome.drawN`, most kikapcsolva.) Szett-paklikban kevésbé hígít.
- **Végtelen trip** (a_trip) · 3 · legendás · egy saját karaktered (nem Igézhetetlen), majd választasz: **Múltba** – visszakapja a lerakáskori (lapra nyomtatott) értékeit, minden később kapott hatás lekerül (eszközök a temetőbe, bénulás, Süti, kapott erők); **Jövőbe** – eltűnik a tábláról, a következő saját köröd elején +3/+3-mal visszatér az eredeti helyére (ha foglalt: az első szabad helyre, ha nincs: végleg eltűnik, a temetőbe kerül). Az eszközei vele utaznak. (`p.future`)
- **Csend a vihar előtt** (a_csend) · 5 · epikus · válassz két különböző ellenséges karaktert (nem Igézhetetlen, nem Cápa): visszakerülnek az ellenfél kezébe (az eszközeik a temetőbe, token eltűnik, teli kéznél elég). Ha csak egy választható ellenség van, egy is elég.
- **Ír kávé** (a_irkave) · 1 · gyakori · egy saját karaktered Pajzsot kap (értelmezés: csak saját)
- **Süti** (a_suti) · 1 · gyakori · egy választott ellenséges karakter elveszíti minden kulcsszavát (Lendület, Provokáció, Pajzs, Izom, Sunyulás – felfordul –, Láthatatlan, Igézhetetlen, Feltámadás). A lap szövegében leírt képességek (pl. halálhatás) megmaradnak; a később kapott eszközök kulcsszavai működnek. Jel: 🍪. (Tomi: célzott, csak ellenséges.)
- **High Hawaiians** (a_hawaiians) · 4 · epikus · öt Varázsgomba a paklidba
- **Reptéri ellenőrzés** (a_repter) · 6 · ritka · válassz egy karaktert (saját vagy ellenséges, nem Igézhetetlen, nem Cápa), majd a túloldal egy üres helyét – oda kerül. Az eszközök gazdája marad, aki rátette; az átkerült karakter abban a körben pihen, rejtett lap felfordul. Ha a túloldalon nincs üres hely, nem célozható.
- **Bong** (a_bong) · 1 · ritka · kijátszáskor az ellenfél kezébe kerül 1-gyel drágábban (`a_bong2…a_bong10` token-példányok, legfeljebb 10). Akinek a **saját köre végén** a kezében van Bong, eldobja, és a hőse annyit sebződik, amennyibe a lap kerül (Akácfa nélkül) – ez arra is vonatkozik, aki húzta. A bot „forró krumpliként” kezeli (nála maradva büntetés).
- **Ír reggeli** (a_irreggeli) · 6 · gyakori · mindkét hős élete maximumra gyógyul
- **Utcai füst** (a_utcaifust) · 4 · ritka · minden saját karaktered rejtett lesz, és véletlenszerűen összekeverednek a saját helyeiden (üres helyre is kerülhetnek; zárt JBL-hely és Cápa kimarad)
- **Game Over** (f_gameover) · 6 · legendás · **az első közös Kánon esemény** – bármelyik hős paklijába tehető (legendás: 1/pakli). A maximum életed 10 lesz (ha több volt, 10-re esik); az ellenfél összes karaktere elpusztul (a Pajzs nem véd, a Feltámadás igen; a Cápa marad); az ellenfél hőse 5 sebzést kap.

**Helyszínek** (mindkét félre hatnak)
- **Elfekvő** (l_elfekvo) · 4 · gyakori · minden karakter, amelyik támadott, a következő körében bénult (a visszaütés nem számít támadásnak)
- **Coffee Shop** (l_coffeeshop) · 3 · ritka · minden kör végén a soron lévő játékos paklijába egy véletlen eszköz kerül (bármelyik gyűjthető eszköz, bolti/Pass/event nélkül)
- **Vöröslámpás negyed** (l_voros) · 1 · gyakori · minden kör végén, a támadások előtt a soron lévő játékos egy véletlen karaktere végleg +1 támadást kap (`preAttack`)

## Egyensúly – első mérés (2026-10-16, `tools/pt.js`, 1500 meccs/lap, ±2,5%)
A lapot minden kezdőpakliban egy hasonló költségű karakter helyére teszi. Egészséges sáv: 47–54%.

| Lap | % | Összevetés |
|---|---|---|
| Laci, A. hőse (2) | **58,1** – erős | Gyuri 47,4 |
| Bence, A. terrorja (6, leg.) | **56,9** – erős | Udvarhelyi 47,4 |
| Reptéri ellenőrzés (6) | **56,3** – erős | Kancsó Long Island 49,0 |
| Game Over (6, Kánon) | **61,0** – nagyon erős | |
| Ati, A. hőse (5) | 54,0 | |
| Sasi, A. hőse (4) | 53,9 | Vajda 55,2 |
| Drog kereső kutya (2) | 51,1 | |
| Ír kávé (1) | 49,2 | Dinnyés 51,7 |
| Barna, A. hőse (3) | 47,0 | |
| Cigi (1) | 46,8 | |
| Tomi, A. hőse (3) | 45,8 – gyengébb | |
| Varázsgomba (1) | 44,6 | |
| Ír reggeli (6) | 41,5 | |
| Vöröslámpás negyed (1) | 41,1 | Akácfa 43,1 |
| High Hawaiians (4) | 39,9 | Tubi 51,5 |
| Süti (1) | 39,9 | |
| Coffee Shop (3) | 39,4 | |
| Utcai füst (4) | 39,1 | |
| Bong (1) | 38,5 | |
| Elfekvő (4) | 37,9 | |
| Csend a vihar előtt (5) | 47,5 | Tubi 46,4 |
| PP, a váratlan (2) | 49,7 | Drog kereső kutya 52,2 |
| Végtelen trip (3) | 45,9 | |
| Barna vízipipája (1) | 43,7 – a bot nem tudja jól elhelyezni | |
| Börtönlánc (2) | 38,9 – a bot alulértékeli (a későbbi sebzést nem számolja) | Csattogós lepke 49,9 |

Megjegyzés: a bot a helyzeti lapokat (helyszínek, Süti, Utcai füst, Bong, a pakliba kevert gombák) alulhasználja, ezek számai lefelé torzítanak – élő játékban erősebbek lehetnek. Döntésre vár (Tomi): Laci, Bence terrorja, Reptéri és Game Over gyengítése; Tomi, A. hőse, High Hawaiians, Elfekvő erősítése.

## Tesztek
- `tools/ah_test.js` – minden új lap és kulcsszó (45 ellenőrzés + 60 bot-meccs az új lapokkal).
- Teszt oldal: `src/deploy-test.sh` (a `teszt` ágon). A teszt mód (`TEST_MODE`, ui.js eleje): az éles profil másolatával indul, csak helyben ment, a felhő-kapcsolat (`Store.db`) le van választva, PvP / barátok / ranked tiltva; a lila sávban „+1000 coin” és „Újramásolás”.
- **Teljes gyűjtemény teszteléshez (2026-10-17):** a teszt oldalon a `TEST_ALL_CARDS` listán lévő profilnevek (most: **Btppictures**) minden betöltéskor megkapják az összes gyűjthető lapot (legendásból 1, a többiből 2 példány, bolti / Pass / event / változat lapokkal együtt). Csak a teszt oldal helyi másolatát érinti. Kód: `testGrantAll` (meta.js).

## Nagy mérés (2026-10-17, ~68 000 meccs, `tools/bigsim.js` + `tools/pt.js`)
**1. Hősök a kezdőpaklijukkal** (hősönként 2400 meccs, ±2%) – éles motor → teszt motor: Barna 47,0→48,3 · Bence 49,3→49,2 · Gabi 49,2→51,5 · Krisz 50,3→48,8 · Laci 49,5→47,7 · Tomi 53,1→53,8 · Dávid 48,5→51,3 · Milo 53,5→53,2 · Sasi 48,7→48,2. Mind a 47–54% sávban; az Amszterdam-motorváltozások a mostani játékot nem borítják (az eltérések a mérési zajon belül vannak).

**2. Hősök változatos paklikkal** (paklisegéd a lapkészlet véletlen 75%-ából, hősönként ~800 meccs, ±3,5%) – Amszterdammal / nélküle: Tomi 58,1/55,6 · Barna 55,1/52,6 · Bence 52,1/51,1 · Gabi 51,9/54,8 · Milo 51,9/50,9 · Sasi 50,8/53,1 · Krisz 46,4/48,5 · Laci 43,6/44,1 · Dávid 40,1/39,3. A szett nem tolja el a hősöket; Dávid és Laci a szettől függetlenül gyenge a „nem kezdőpaklis” paklikkal (a hős-képességük a kezdőpakli lapjaira épít).
A paklisegéd a szettből szinte csak az epikus/legendás lapokat választja (PP 29%, vízipipa 28%, Végtelen trip 18% a paklik közül) – a gyakoriakat a ritkaság-súlyozás miatt alig.

**Gyengítések (2026-10-18, Tomi döntése)** – kezdőpaklikba téve, 3000 meccs/lap:
- Bence, A. terrorja 4/5 → 3/5: 55,6% → **51,4%** ✔
- Laci, A. hőse 2 → 1 Ír kávé: 57,3% → **55,7%** (2 energiás helyen; a többi 2-es lap 47–52%). Kipróbálva még: 1/2-es statokkal 50,0%, 3 energiával 51,3%, 2/1-gyel 54,2% – Tomi döntésére vár.
- Game Over (még nem módosítva): most 62,8%; 3 sebzés a hősnek 59,6%; **hős-sebzés nélkül 53,8%**.
- Reptéri ellenőrzés (még nem módosítva): most 55,1%; csak ≤4 energiás karakter 55,0%; csak ≤4 támadású 54,6%; **az áttett karakter −2 támadás 52,3%**.
(A 6 energia a maximum, ezért drágítás nem opció ezeknél.)

**3. „Csak Amszterdam” pakli** (a szett + Kánon, a kezdőpaklik ellen): 16–34% – a szett magában nem pakli, a Base set lapjaival keverve működik (ez egy 25 lapos mini-szettnél várható).

**4. Lapok egyenként** (2000 meccs/lap, ±2,2%; sáv 47–54%)
| Lap | % | | Lap | % |
|---|---|---|---|---|
| Game Over | **60,0** túl erős | | Ír kávé | 44,4 |
| Bence, A. terrorja | **57,5** erős | | Ír reggeli | 42,6 |
| Laci, A. hőse | **55,9** erős | | Süti | 42,4 |
| Reptéri ellenőrzés | **55,8** erős | | Börtönlánc | 41,4* |
| Ati, A. hőse | 54,0 | | High Hawaiians | 40,8* |
| Sasi, A. hőse | 50,5 | | Utcai füst | 40,4* |
| PP, a váratlan | 49,5 | | Bong | 39,9* |
| Végtelen trip | 49,5 | | Elfekvő | 39,8* |
| Drog kereső kutya | 48,7 | | Vöröslámpás negyed | 39,6* |
| Varázsgomba | 48,7 | | Coffee Shop | 38,8* |
| Barna, A. hőse | 48,6 | | Barna vízipipája | 43,5* |
| Csend a vihar előtt | 48,0 | | | |
| Cigi | 47,2 | | | |
| Tomi, A. hőse | 45,2 | | | |
Viszonyítás (régi lapok, ugyanígy mérve): Vajda 50,3 · Tubi 51,4 · Dinnyés 50,5 · Kancsó 48,5 · Csattogós lepke 48,4 · Gyuri 48,0 · Udvarhelyi 47,7 · Akácfa söröző 41,9.
\* A botok ezeket rosszul játsszák (helyszín, késleltetett vagy helyzeti hatás) – a régi Akácfa is 41,9-et hoz ugyanígy, tehát ezek élőben valószínűleg rendben vannak.
