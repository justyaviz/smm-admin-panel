import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
const backendUrl = String(process.env.API_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');

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

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('So‘rov hajmi juda katta.');
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function proxyApi(request, response, rawPath) {
  if (!backendUrl) {
    sendJson(response, 503, {
      message: 'Frontend servisida API_URL belgilanmagan.',
      code: 'API_URL_MISSING',
    });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const body = request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await readRequestBody(request);

    const headers = {};
    for (const name of ['content-type', 'authorization', 'accept', 'user-agent']) {
      const value = request.headers[name];
      if (value) headers[name] = value;
    }
    headers['x-forwarded-host'] = request.headers.host || '';
    headers['x-forwarded-proto'] = request.headers['x-forwarded-proto'] || 'https';

    const upstream = await fetch(`${backendUrl}${rawPath}`, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
      redirect: 'manual',
    });

    const payload = Buffer.from(await upstream.arrayBuffer());
    response.statusCode = upstream.status;
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(payload);
  } catch (error) {
    const timeoutError = error?.name === 'AbortError';
    sendJson(response, timeoutError ? 504 : 502, {
      message: timeoutError
        ? 'Backend javob berish vaqti tugadi.'
        : 'Backend bilan aloqa o‘rnatilmadi.',
      code: timeoutError ? 'BACKEND_TIMEOUT' : 'BACKEND_UNREACHABLE',
    });
  } finally {
    clearTimeout(timeout);
  }
}

createServer(async (request, response) => {
  try {
    const rawPath = decodeURIComponent((request.url || '/').split('?')[0]);

    if (rawPath.startsWith('/api/')) {
      await proxyApi(request, response, request.url || rawPath);
      return;
    }

    if (rawPath === '/runtime-config.js') {
      response.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      });
      // Browser API so‘rovlarini shu frontend domeniga yuboradi; server backendga proxy qiladi.
      response.end('window.__ALOOSMM_CONFIG__ = { API_URL: "" };');
      return;
    }

    if (rawPath === '/health') {
      sendJson(response, 200, { ok: true, apiConfigured: Boolean(backendUrl) });
      return;
    }

    const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
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
    sendJson(response, 500, { message: 'Frontend serverda ichki xato yuz berdi.' });
  }
}).listen(port, host, () => {
  console.log(`Frontend http://${host}:${port} manzilida ishga tushdi`);
  console.log(backendUrl ? `Backend proxy: ${backendUrl}` : 'Ogohlantirish: API_URL belgilanmagan.');
});
