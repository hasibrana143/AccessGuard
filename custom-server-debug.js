import { createServer } from 'http';
import { parse } from 'url';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import next from 'next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Forward WebSocket upgrades (/_next/hmr) to Next — without this HMR
  // fails with ERR_INVALID_HTTP_RESPONSE on every edit.
  const upgradeHandler = app.getUpgradeHandler();
  server.on('upgrade', (req, socket, head) => {
    upgradeHandler(req, socket, head);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
  
  server.on('listening', () => {
    const addr = server.address();
    console.log('Server actually listening on:', addr);
  });
  
  server.listen(3000, '127.0.0.1', (err) => {
    if (err) {
      console.error('Listen error:', err);
      throw err;
    }
    console.log('> Ready on http://127.0.0.1:3000');
  });
});
