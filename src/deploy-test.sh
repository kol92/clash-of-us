#!/usr/bin/env bash
# Best of Us – kitétel a TESZT oldalra (teszt ág → Cloudflare előnézet: https://teszt.bestofus.pages.dev).
# Használat (a repó gyökeréből, a `teszt` ágon):  bash src/deploy-test.sh "commit üzenet"
# Előtte behúzza a main friss állását (hogy a teszt oldal ne maradjon le az élestől);
# a buildelt site/ és az announce.json ütközését magától feloldja (újrabuildel), más ütközésnél megáll.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MSG="${1:-Teszt frissítés}"
cd "$ROOT"
[ "$(git rev-parse --abbrev-ref HEAD)" = "teszt" ] || { echo "Csak a teszt ágon futtasd (git checkout teszt)"; exit 1; }
git fetch -q origin main
if ! git merge -q --no-edit origin/main; then
  BAD=$(git diff --name-only --diff-filter=U | grep -v -E '^(site/|src/announce\.json$)' || true)
  if [ -n "$BAD" ]; then echo "Ütközés a forrásban, kézzel kell feloldani:"; echo "$BAD"; exit 1; fi
  git checkout --ours -- src/announce.json 2>/dev/null || true
  git diff --name-only --diff-filter=U | grep '^site/' | xargs -r git rm -q --cached -- 2>/dev/null || true
  git add -A src/announce.json
  git commit -q --no-edit -m "main behúzása a teszt ágba"
fi
cd "$ROOT/src"
node tools/fin_test.js | grep -q "MINDEN RENDBEN 2" || { echo "fin_test HIBA – nem teszem ki"; node tools/fin_test.js | grep HIBA; exit 1; }
python3 build-app.py ""
python3 - <<'PY' || { echo "SZINTAXISHIBA a buildben – nem teszem ki"; exit 1; }
import re, subprocess, sys, tempfile, os
html = open('dist/index.html', encoding='utf-8').read()
bad = 0
for k, js in enumerate(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)):
    if not js.strip(): continue
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f: f.write(js); fn = f.name
    r = subprocess.run(['node', '--check', fn], capture_output=True, text=True); os.unlink(fn)
    if r.returncode: bad += 1; print(f'script #{k}:', r.stderr.strip().splitlines()[:4])
sys.exit(1 if bad else 0)
PY
rm -rf "$ROOT/site" && mkdir "$ROOT/site" && cp -a "$ROOT/src/dist/." "$ROOT/site/"
cd "$ROOT"
git add -A
git commit -q -m "$MSG" || echo "(nincs új változás)"
git push -q -u origin teszt
echo "Kint: https://teszt.bestofus.pages.dev (1–3 perc)"
