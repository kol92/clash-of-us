#!/usr/bin/env bash
# Best of Us – build + kitétel egy lépésben.
# Használat (a repó gyökeréből):  bash src/deploy.sh "Újdonság szövege"   (üres "" = nem jelenik meg Újdonságként)
#                                 bash src/deploy.sh "szöveg" "commit üzenet"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTE="${1:-}"; MSG="${2:-${NOTE:-Frissítés}}"
cd "$ROOT/src"
node tools/fin_test.js | grep -q "MINDEN RENDBEN 2" || { echo "fin_test HIBA – nem teszem ki"; node tools/fin_test.js | grep HIBA; exit 1; }
python3 build-app.py "$NOTE"
# szintaxis-ellenőrzés: a kész index.html minden beágyazott scriptje (egy elgépelés az egész appot leállítaná)
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
git commit -q -m "$MSG"
git push
