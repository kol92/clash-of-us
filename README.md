# Best of Us

A banda saját kártyajátéka – telepíthető webapp (iPhone, Android): https://bestofus.pages.dev

- `site/` – a kész, kitett játék. **Ezt teszi ki a Cloudflare Pages** (Build output directory: `site`).
- `src/` – a teljes forrás: motor, felület, gyűjtés/PvP, Firebase-réteg, képek, build- és kitevő szkript, tesztek.
- `CLAUDE.md` – fejlesztői átadó: hogyan kell lapot felvenni, buildelni, tesztelni, kitenni.

Kitétel egy lépésben: `bash src/deploy.sh "Újdonság szövege"`
