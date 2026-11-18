// Screenshot driver: opens a URL in the local headless Chrome over CDP,
// waits for window.__shotReady, captures a PNG. Usage:
//   node shot.mjs <url> <outfile> [port]
// Chrome must be running with --remote-debugging-port=<port>.
import { writeFileSync } from 'node:fs';

const [url, outfile, portArg] = process.argv.slice(2);
const port = Number(portArg ?? 9222);
if (!url || !outfile) {
  console.error('usage: node shot.mjs <url> <outfile> [port]');
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const listResponse = await fetch(`http://127.0.0.1:${port}/json`);
const targets = await listResponse.json();
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('no page target on the debugging port');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 1;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
};

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

const deadline = Date.now() + 90000;
let ready = false;
let lastError = '';
while (Date.now() < deadline) {
  try {
    const result = await send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
    if (result.result && result.result.value === true) {
      ready = true;
      break;
    }
    const errors = await send('Runtime.evaluate', { expression: 'window.__shotError || ""', returnByValue: true });
    if (errors.result && errors.result.value) lastError = String(errors.result.value);
  } catch {
    // Target still loading; keep waiting.
  }
  await sleep(250);
}
if (!ready) throw new Error(`shot never became ready (last error: ${lastError || 'none'})`);

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(outfile, Buffer.from(shot.data, 'base64'));
console.log(`wrote ${outfile}`);
ws.close();
process.exit(0);
