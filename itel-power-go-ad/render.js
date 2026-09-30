// Renders index.html frame by frame and pipes JPEGs into ffmpeg.
// usage: node render.js <ffmpeg> <out.mp4> [audio.wav] [--stills t1,t2,...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const [ffmpeg, out, audio] = process.argv.slice(2);
const stillsArg = process.argv.indexOf('--stills');
const FPS = 30;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?render=1');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([document.fonts.load('400 100px Anton'), document.fonts.load('900 100px Montserrat'), document.fonts.load('500 100px Montserrat')]));
  const grab = t => page.evaluate(t => { render(t); return document.getElementById('c').toDataURL('image/jpeg', 0.95); }, t);
  if (stillsArg > 0) {
    fs.mkdirSync(out, { recursive: true });
    for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
      fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.jpg`), Buffer.from((await grab(t)).split(',')[1], 'base64'));
    }
    await browser.close(); return;
  }
  const args = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (audio) args.push('-i', audio);
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push(out);
  const ff = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'inherit'] });
  const N = 20 * FPS;
  for (let i = 0; i < N; i++) {
    const buf = Buffer.from((await grab(i / FPS)).split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${N}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
