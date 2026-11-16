// Verify every scene renders: no exceptions, models load where expected,
// and slide 4 stays procedural.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\EdgeCore\\158.0.4370.21\\msedge.exe';
const PORT = 9370;
const base = process.argv[2] || 'http://127.0.0.1:3000/';
const profile = path.join(process.env.TEMP || '.', 'edge-check-' + Date.now());

const child = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox',
  '--window-size=1440,900', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function req(p, method = 'GET') {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error(d.slice(0, 60))); } });
    });
    r.on('error', reject); r.end();
  });
}
async function waitUp() {
  for (let i = 0; i < 60; i++) { try { await req('/json/version'); return; } catch { await sleep(300); } }
  throw new Error('no devtools');
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map(); const handlers = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id !== undefined && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    } else if (m.method) handlers.forEach((h) => h(m));
  });
  const ready = new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  return { ws, ready, send, on: (h) => handlers.push(h) };
}

try {
  await waitUp();
  const target = await req('/json/new?about:blank', 'PUT');
  const c = connect(target.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Runtime.enable');
  await c.send('Page.enable');
  await c.send('Network.enable');

  const exceptions = [];
  const glbRequests = [];
  c.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      exceptions.push((m.params.exceptionDetails?.exception?.description || '').slice(0, 160));
    }
    if (m.method === 'Network.responseReceived' && m.params.response.url.endsWith('.glb')) {
      glbRequests.push(m.params.response.url.split('/').pop());
    }
  });

  // Slide 4 must request zero models; the rest must load theirs.
  const SLIDES = [2, 4, 8, 9, 13, 17, 19, 20];
  for (const n of SLIDES) {
    glbRequests.length = 0;
    await c.send('Page.navigate', { url: `${base}?slide=${n}` });
    await sleep(11000);
    const r = await c.send('Runtime.evaluate', {
      expression: `(() => {
        const deck = document.querySelector('[data-testid="presentation-deck"]');
        const canvas = document.querySelector('canvas');
        return JSON.stringify({
          slide: deck?.dataset.slideId,
          canvas: canvas ? canvas.width + 'x' + canvas.height : 'none',
        });
      })()`,
      returnByValue: true,
    });
    const loaded = [...new Set(glbRequests)].join(', ') || 'none';
    console.log(`slide ${String(n).padStart(2)}: ${r.result.value}  models=[${loaded}]`);
  }

  console.log(`\npage exceptions: ${exceptions.length}`);
  exceptions.slice(0, 8).forEach((e) => console.log('  ' + e));
  c.ws.close();
} catch (e) {
  console.log('FAILED:', e.message);
} finally {
  child.kill();
}
