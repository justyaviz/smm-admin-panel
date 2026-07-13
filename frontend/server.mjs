import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
const apiUrl = String(process.env.API_URL || process.env.VITE_API_URL || '').replace(/\/$/, '');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

if (!existsSync(root)) {
  console.error('dist papkasi topilmadi. Avval npm run build bajaring.');
  process.exit(1);
}

createServer((request, response) => {
  try {
    const rawPath = decodeURIComponent((request.url || '/').split('?')[0]);

    if (rawPath === '/runtime-config.js') {
      response.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(`window.__ALOOSMM_CONFIG__ = ${JSON.stringify({ API_URL: apiUrl })};`);
      return;
    }

    if (rawPath === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: true, apiConfigured: Boolean(apiUrl) }));
      return;
    }

    const safePath = normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = join(root, safePath === '/' ? 'index.html' : safePath);

    if (!filePath.startsWith(root)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(root, 'index.html');
    }

    const extension = extname(filePath).toLowerCase();
    response.setHeader('Content-Type', mime[extension] || 'application/octet-stream');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Cache-Control', extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable');
    createReadStream(filePath).pipe(response);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end('Internal Server Error');
  }
}).listen(port, host, () => {
  console.log(`Frontend http://${host}:${port} manzilida ishga tushdi`);
  console.log(apiUrl ? `API: ${apiUrl}` : 'Ogohlantirish: API_URL belgilanmagan.');
});
