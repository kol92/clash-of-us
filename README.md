# Best of Us

A banda saját kártyajátéka – telepíthető webapp (iPhone, Android).

- `site/` – a kész, kitehető játék. **Ezt teszi ki a Cloudflare Pages** (Build output directory: `site`).
- `src/` – a játék forrása (motor, felület, gyűjtés/PvP, Firebase-réteg, build-szkript). A képek a `site/art` mappában vannak.

Frissítés: a forrás módosítása után `python3 src/build-app.py "újdonság szövege"` (a képeket `src/art`-ként várja – másold vissza a `site/art`-ból), majd a `dist/` tartalma kerül a `site/` mappába.
