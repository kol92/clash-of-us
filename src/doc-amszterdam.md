# Amszterdam hősei – első mini-szett (TESZT, a `teszt` ágon)

**Állapot (2026-10-16):** csak a teszt oldalon (https://teszt.bestofus.pages.dev). Élesbe csak Tomi szavára, a `teszt` ág `main`-be olvasztásával kerül. Megjelenés: valamikor októberben.

- **Téma:** a társaság 2022-es amszterdami útja.
- **Méret:** 25 lap lesz, most 20 van kész (12 gyakori / 5 ritka / 1 epikus / 2 legendás). Javaslat a hátralévő 5-re: 3 epikus, 1 legendás, 1 ritka (→ 12/6/4/3), hogy a saját packokban ne mindig ugyanaz az egy epikus jöjjön.
- **Beszerzés:** csak a Boltban, saját packból: **Amszterdam hősei booster** (50 coin, 3 lap) és **Amszterdam Shiny** (250 coin, a legjobb lap biztosan Full Art). Csak a szett lapjai vannak benne (nincs Full Art hős, arany hős, Base set-változat); ha egy ritkaságból nincs lap, eggyel lejjebb sorsol. A Base set packokba nem kerülnek az új lapok. Saját pack-grafika (Astra, 2026-10-16): zöld „Booster pack” és türkiz holografikus „Shiny pack” (`art/ui/pack-ah.webp`, `pack-ahshiny.webp` + `sm/`; a tartalomra vágva, oldalt átlátszó szegéllyel 600×965-re igazítva, hogy a feltépés ugyanott fusson, mint a Base set packnál). A Boltban és a bontásnál is ezek látszanak.
- **Kiosztás:** senki nem kap belőle ingyen (a kezdőgyűjtemény és a `STARTER_ADDS` kizárja a `set`-es lapokat). A Game Over sem jár automatikusan, mint a régi Kánon lapok.
- **Gyűjtemény:** szett-szűrő „🌷 Amszterdam hősei” (csak a teszt oldalon látszik). Kód: a lapokon `set:'ah'`, `SETS.ah` (meta.js), `CF_SETS` (ui.js).

## Lapképek
- **Kész (16/20, 2026-10-16):** Süti, Bence terrorja, Sasi, Barna, Laci, Tomi, Utcai füst, Drog kereső kutya, High Hawaiians, Vöröslámpás negyed, Game Over, Elfekvő, Varázsgomba, Cigi, Ír reggeli, Caffee Shop (`art/ah_*.webp`, ART-bejegyzés a ui.js-ben).
- **Még nincs képe:** Ati, Ír kávé, Reptéri ellenőrzés, Bong (+ a Betti token).

## Új kulcsszavak
- **Igézhetetlen** (`elusive`): akcióval és más lapok kijátszáskori hatásával nem célozható – se a gazdája, se az ellenfél (Dinnyés, Ír kávé, Vera, Zsibrita, Reptéri ellenőrzés stb.). A véletlen célzású hatások kihagyják (Alekosz, Molnár Zsolti, Koktélarmageddon, Tomi, a parti lelke, Among Us, Cápa érkezése). **Eszköz rátehető** (saját és ellenséges is, Tomi döntése). A mindenkit érő hatások eltalálják (Tálca shot, JBL, Nyiti, Mosh Pit, Game Over). Jel a lapon: 🛡.
- **Feltámadás** (`revive`, ugyanaz a mechanika, mint Gabi, a legyőzhetetlen): amikor először meghal, 1 élettel feléled a helyén (az eszközei lekerülnek); másodszorra végleg meghal. Jel: ♻.
- Motor: `kwC(u, kulcsszó)` – a lapra nyomtatott kulcsszó, ha a Süti nem vette el (`u.noKw`); `isEl(u)` = Igézhetetlen.

## A lapok (név · költség · értékek · ritkaság · hatás)
**Karakterek**
- **Sasi, Amszterdam hőse** (c_ah_sasi) · 4 · 2/6 · gyakori · Lendület
- **Tomi, Amszterdam hőse** (c_ah_tomi) · 3 · 1/4 · gyakori · Igézhetetlen
- **Barna, Amszterdam hőse** (c_ah_barna) · 3 · 3/2 · gyakori · kijátszáskor egy Varázsgomba a paklidba
- **Laci, Amszterdam hőse** (c_ah_laci) · 2 · 2/2 · gyakori · kijátszáskor két Ír kávé a kezedbe
- **Ati, Amszterdam hőse** (c_ah_ati) · 5 · 3/4 · gyakori · kijátszáskor maga mellé idéz egy 2/2-es **Bettit** (c_betti, token, nem gyűjthető; előbb jobbra, aztán balra, különben bárhova)
- **Bence, Amszterdam terrorja** (c_ah_bence) · 6 · 4/5 · legendás · Lendület, Feltámadás
- **Drog kereső kutya** (c_kutya) · 2 · 2/1 · ritka · Sunyulás; halálakor az ellenfél eldob egy véletlen lapot a kezéből

**Eszközök**
- **Varázsgomba** (i_gomba) · 1 · gyakori · +1/+1; minden további gomba ugyanazon a karakteren eggyel többet ad (2. +2/+2, 3. +3/+3…). A STOP a halmozott bónuszt is leveszi.
- **Cigi** (i_cigi) · 1 · gyakori · ellenséges karakterre: −1/−1, az élete ettől nem mehet 1 alá

**Akciók**
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
- **Caffee Shop** (l_coffeeshop) · 3 · ritka · minden kör végén a soron lévő játékos paklijába egy véletlen eszköz kerül (bármelyik gyűjthető eszköz, bolti/Pass/event nélkül)
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
| Caffee Shop (3) | 39,4 | |
| Utcai füst (4) | 39,1 | |
| Bong (1) | 38,5 | |
| Elfekvő (4) | 37,9 | |

Megjegyzés: a bot a helyzeti lapokat (helyszínek, Süti, Utcai füst, Bong, a pakliba kevert gombák) alulhasználja, ezek számai lefelé torzítanak – élő játékban erősebbek lehetnek. Döntésre vár (Tomi): Laci, Bence terrorja, Reptéri és Game Over gyengítése; Tomi, A. hőse, High Hawaiians, Elfekvő erősítése.

## Tesztek
- `tools/ah_test.js` – minden új lap és kulcsszó (45 ellenőrzés + 60 bot-meccs az új lapokkal).
- Teszt oldal: `src/deploy-test.sh` (a `teszt` ágon). A teszt mód (`TEST_MODE`, ui.js eleje): az éles profil másolatával indul, csak helyben ment, a felhő-kapcsolat (`Store.db`) le van választva, PvP / barátok / ranked tiltva; a lila sávban „+1000 coin” és „Újramásolás”.
