import asyncio, sys
from playwright.async_api import async_playwright
import os; FAKE=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'fakefb.js')).read()
PORT=sys.argv[1]; JS=sys.argv[2]; OUT=sys.argv[3]
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(); ctx=await br.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
        async def route(r):
            u=r.request.url
            if 'vendor/firebase-app-compat' in u: await r.fulfill(body=FAKE, content_type='text/javascript')
            elif 'vendor/firebase-' in u: await r.fulfill(body='', content_type='text/javascript')
            elif 'fonts.g' in u: await r.fulfill(body='', content_type='text/css')
            else: await r.continue_()
        await ctx.route('**/*', route)
        A=await ctx.new_page(); errs=[]; A.on('pageerror',lambda e:errs.append(str(e)))
        await A.add_init_script("window.__UID='uU';"); await A.goto(f'http://localhost:{PORT}/dist/'); await A.wait_for_timeout(1200)
        await A.fill('#pname','Teszt'); await A.click('#createForm button[type=submit]'); await A.wait_for_timeout(500)
        await A.evaluate("document.querySelectorAll('.overlay').forEach(o=>o.remove()); ONB.running=false;")
        await A.evaluate(open(JS).read())
        await A.wait_for_function('window.__done', timeout=240000); await A.wait_for_timeout(500); await A.screenshot(path=OUT)
        print(OUT, errs); await br.close()
asyncio.run(main())
