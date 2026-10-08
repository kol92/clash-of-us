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
rm -rf "$ROOT/site" && mkdir "$ROOT/site" && cp -a "$ROOT/src/dist/." "$ROOT/site/"
cd "$ROOT"
git add -A
git commit -q -m "$MSG"
git push
