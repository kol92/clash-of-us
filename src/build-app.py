#!/usr/bin/env python3
"""Best of Us – az önálló (telepíthető) app összerakása a játék forrásaiból.
Kimenet: dist/ – ezt kell feltölteni a GitHub-tárolóba (a Cloudflare onnan teszi ki).
Használat: python3 build-app.py [megjegyzés az Újdonságokhoz]"""
import hashlib, json, os, re, shutil, sys, time
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(SRC, 'dist')
FB = '/home/claude/app/node_modules/firebase'
VERSION = time.strftime('%Y.%m.%d-%H%M')
NOTE = ' '.join(sys.argv[1:]).strip()

shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(DIST)

# 1) képek (csak a webp-k), vendor Firebase, ikonok
shutil.copytree(os.path.join(SRC, 'art'), os.path.join(DIST, 'art'), ignore=shutil.ignore_patterns('*.png', '*.jpg', '*.psd'))
os.makedirs(os.path.join(DIST, 'vendor'))
for n in ['app', 'auth', 'firestore', 'database']:
    shutil.copy(f'{FB}/firebase-{n}-compat.js', os.path.join(DIST, 'vendor', f'firebase-{n}-compat.js'))
os.makedirs(os.path.join(DIST, 'icons'))
# az app ikonja (BU embléma): teljes kitöltésű, így Androidon a kör/csepp alakú vágás is csak a díszek szélét veszi le
emb = Image.open(os.path.join(SRC, 'app', 'icon.png')).convert('RGB')
for sz in (180, 192, 512):
    emb.resize((sz, sz), Image.LANCZOS).save(os.path.join(DIST, 'icons', f'icon-{sz}.png'), optimize=True)
for sz in (192, 512):
    emb.resize((sz, sz), Image.LANCZOS).save(os.path.join(DIST, 'icons', f'maskable-{sz}.png'), optimize=True)
emb.resize((32, 32), Image.LANCZOS).save(os.path.join(DIST, 'icons', 'favicon-32.png'))

# 2) index.html: a játék héja + scriptek
shell = open(os.path.join(SRC, 'shell.html'), encoding='utf-8').read()
shell = shell.replace('<title>Clash of Us</title>', '<title>Best of Us</title>')
cut = shell.rindex('</style>') + len('</style>')
head, body = shell[:cut], shell[cut:]
head = head.replace('<meta charset="utf-8">', '', 1)
game = ''.join(open(os.path.join(SRC, f), encoding='utf-8').read() for f in ('engine.js', 'ui.js', 'meta.js'))
backend = open(os.path.join(SRC, 'app', 'backend.js'), encoding='utf-8').read()
pwa = open(os.path.join(SRC, 'app', 'pwa.js'), encoding='utf-8').read()
html = f'''<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1c21">
<meta name="description" content="Best of Us – a banda saját kártyajátéka">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32">\n<link rel="icon" href="icons/icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Best of Us">
{head}
</head>
<body>
{body}
<script src="vendor/firebase-app-compat.js"></script>
<script src="vendor/firebase-auth-compat.js"></script>
<script src="vendor/firebase-firestore-compat.js"></script>
<script src="vendor/firebase-database-compat.js"></script>
<script>window.APP_VERSION = {json.dumps(VERSION)};</script>
<script>{backend}</script>
<script>{pwa}</script>
<script>
{game}
</script>
</body>
</html>
'''
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(html)

# 3) manifest, service worker, verzió, Cloudflare fejlécek
manifest = {
    'name': 'Best of Us', 'short_name': 'Best of Us', 'lang': 'hu', 'start_url': './', 'scope': './',
    'display': 'standalone', 'orientation': 'portrait', 'background_color': '#071217', 'theme_color': '#0b1c21',
    'description': 'A banda saját kártyajátéka',
    'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
              {'src': 'icons/maskable-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'maskable'},
              {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
}
json.dump(manifest, open(os.path.join(DIST, 'manifest.webmanifest'), 'w'), ensure_ascii=False, indent=1)
h = hashlib.sha1()   # ha bármelyik kép vagy a Firebase-könyvtár változik, a telefon újratölti őket
for root, _, files in sorted(os.walk(DIST)):
    for f in sorted(files):
        if '/art' in root or '/vendor' in root or '/icons' in root:
            p = os.path.join(root, f); h.update(p.encode()); h.update(open(p, 'rb').read())
sw = open(os.path.join(SRC, 'app', 'sw.js'), encoding='utf-8').read()
sw = sw.replace('__APP_VERSION__', VERSION).replace("'bou-assets-v1'", repr('bou-assets-' + h.hexdigest()[:10]))
open(os.path.join(DIST, 'sw.js'), 'w', encoding='utf-8').write(sw)
json.dump({'v': VERSION, 'note': NOTE}, open(os.path.join(DIST, 'version.json'), 'w'), ensure_ascii=False)
open(os.path.join(DIST, '_headers'), 'w').write('''/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/version.json
  Cache-Control: no-store
/art/*
  Cache-Control: public, max-age=604800
/vendor/*
  Cache-Control: public, max-age=604800
''')
open(os.path.join(DIST, 'README.md'), 'w', encoding='utf-8').write(
    '# Best of Us\n\nA banda saját kártyajátéka – telepíthető webapp.\n\nEz a tároló a kész, kitehető játékot tartalmazza; a Cloudflare Pages minden feltöltés után automatikusan kiteszi.\n')
total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(DIST) for f in fs)
print('verzió', VERSION, '· méret', round(total / 1e6, 1), 'MB')
