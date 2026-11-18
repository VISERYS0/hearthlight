import { chromium } from 'playwright-core';
// Usage: node serve.ts --port 8123 & then: SEED=14 node tools/shoot.mjs screenshots  (needs playwright-core and Chrome)
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const external = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => { if (!r.url().startsWith('http://localhost:8123/') && !r.url().startsWith('data:')) external.push(r.url()); });
const shots = [['1-title.jpg', 'title'], ['2-play.jpg', 'play'], ['3-boons.jpg', 'boons'], ['4-end.jpg', 'end']];
for (const [name, shot] of shots) {
  await page.goto(`http://localhost:8123/?shot=${shot}&seed=${process.env.SEED ?? 7}`);
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 60000 });
  await page.screenshot({ path: `${out}/${name}`, type: 'jpeg', quality: 86 });
}
// Live play-test: title, start, move, shoot, dash, flare, pause.
await page.goto('http://localhost:8123/?seed=3');
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/live-title.jpg', type: 'jpeg' });
await page.mouse.click(640, 300);
await page.waitForTimeout(500);
const status1 = await page.textContent('#status');
await page.mouse.move(900, 200);
await page.mouse.down();
await page.keyboard.down('KeyD');
await page.waitForTimeout(700);
await page.keyboard.up('KeyD');
await page.keyboard.press('Space');
await page.keyboard.down('KeyW');
await page.waitForTimeout(500);
await page.keyboard.up('KeyW');
await page.mouse.click(700, 300, { button: 'right' });
await page.mouse.down();
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/live-play.jpg', type: 'jpeg' });
await page.keyboard.press('KeyP');
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/live-pause.jpg', type: 'jpeg' });
await page.keyboard.press('KeyP');
await page.mouse.up();
console.log(JSON.stringify({ status1, status2: await page.textContent('#status'), errors, external }));
await browser.close();
