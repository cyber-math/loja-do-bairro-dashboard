/**
 * Servidor HTTP estático mínimo, sem dependências.
 * Serve dist/ quando o build existe; caso contrário, a raiz do projeto.
 *
 * Uso: npm start  (porta 8000; sobrescreva com PORT=3000)
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve, sep } from 'node:path';
import { ROOT } from './version.mjs';

const requestedPort = Number(process.env.PORT || 8000);
if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  console.error(`erro: PORT inválida — "${process.env.PORT}"`);
  process.exit(1);
}

const DIST = join(ROOT, 'dist');
const BASE = existsSync(join(DIST, 'index.html')) ? DIST : ROOT;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function insideBase(path) {
  const rel = relative(BASE, path);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(`..${sep}`));
}

const server = createServer((req, res) => {
  let status = 500;
  const log = () => console.log(`${req.method} ${req.url} -> ${status}`);

  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      status = 405;
      res.setHeader('allow', 'GET, HEAD');
      send(res, status, '405 Method Not Allowed');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    } catch {
      status = 400;
      send(res, status, '400 Bad Request');
      return;
    }

    if (pathname.includes('\0')) {
      status = 400;
      send(res, status, '400 Bad Request');
      return;
    }

    let filePath = resolve(BASE, `.${pathname}`);
    if (!insideBase(filePath)) {
      status = 403;
      send(res, status, '403 Forbidden');
      return;
    }

    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html');
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      status = 404;
      send(
        res,
        status,
        '<!doctype html><meta charset="utf-8"><title>404</title><h1>404</h1><p>Arquivo não encontrado.</p>',
        { 'content-type': 'text/html; charset=utf-8' }
      );
      return;
    }

    status = 200;
    res.writeHead(status, {
      'content-type': TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'content-length': statSync(filePath).size,
      'cache-control': 'no-store',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        status = 500;
        send(res, status, '500 Internal Server Error');
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  } finally {
    res.on('finish', log);
  }
});

server.listen(requestedPort, () => {
  console.log(`Servindo ${BASE}`);
  console.log(`http://localhost:${requestedPort}`);
});
