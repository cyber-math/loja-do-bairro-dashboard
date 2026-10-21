/**
 * Servidor HTTP estático mínimo, sem dependências.
 * Serve `dist/` quando o build existe; caso contrário, a raiz do projeto.
 *
 * Uso: npm start  (porta 8000, sobrescreva com PORT=3000)
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { RAIZ } from './version.mjs';

const PORTA = Number(process.env.PORT || 8000);
const DIST = join(RAIZ, 'dist');
const BASE = existsSync(join(DIST, 'index.html')) ? DIST : RAIZ;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

createServer((req, res) => {
  const caminhoUrl = decodeURIComponent((req.url || '/').split('?')[0]);
  let caminho = resolve(join(BASE, normalize(caminhoUrl)));

  if (caminho !== BASE && !caminho.startsWith(BASE + sep)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }).end('403');
    return;
  }

  if (existsSync(caminho) && statSync(caminho).isDirectory()) {
    caminho = join(caminho, 'index.html');
  }

  if (!existsSync(caminho)) {
    res
      .writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
      .end('<!doctype html><meta charset="utf-8"><title>404</title><h1>404</h1>');
    return;
  }

  res.writeHead(200, {
    'content-type': TIPOS[extname(caminho).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(caminho).pipe(res);
}).listen(PORTA, () => {
  console.log(`Servindo ${BASE}`);
  console.log(`→ http://localhost:${PORTA}`);
});
