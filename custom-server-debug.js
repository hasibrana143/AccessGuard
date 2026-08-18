const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
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
