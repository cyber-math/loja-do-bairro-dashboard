/**
 * Verificações do site estático antes do build/deploy.
 * Sem dependências externas; falha com exit code 1 quando algo está errado.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { ROOT } from './version.mjs';

const failures = [];
const warnings = [];
let passed = 0;

const ok = (message) => {
  passed += 1;
  console.log(`  ok    ${message}`);
};
const warn = (message) => {
  warnings.push(message);
  console.log(`  aviso ${message}`);
};
const fail = (message) => {
  failures.push(message);
  console.log(`  erro  ${message}`);
};
const section = (title) => console.log(`\n${title}`);

function toPosix(path) {
  return path.split(sep).join('/');
}

section('1. Arquivos e referências do index.html');

const indexPath = join(ROOT, 'index.html');
let html = '';

if (!existsSync(indexPath)) {
  fail('index.html não encontrado');
} else {
  ok('index.html encontrado');
  html = readFileSync(indexPath, 'utf8');

  const references = [
    ...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi),
  ].map((match) => match[1].trim());

  const local = references.filter(
    (ref) => ref && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)
  );

  if (local.length === 0) warn('nenhuma referência local encontrada no index.html');

  for (const ref of local) {
    let decoded;
    try {
      decoded = decodeURIComponent(ref.split(/[?#]/)[0]);
    } catch {
      fail(`referência com URL inválida — ${ref}`);
      continue;
    }

    if (!decoded) continue;
    if (decoded.startsWith('/')) {
      fail(`referência absoluta quebra o GitHub Pages — ${ref}`);
      continue;
    }

    const target = resolve(ROOT, decoded);
    const rel = relative(ROOT, target);
    if (rel.startsWith('..') || rel === '' || resolve(target) !== target) {
      fail(`referência fora do projeto — ${ref}`);
      continue;
    }

    if (existsSync(target) && statSync(target).isFile()) {
      ok(`referência local existe — ${ref}`);
    } else {
      fail(`referência local não encontrada — ${ref}`);
    }
  }
}

section('2. Sintaxe dos JavaScript em assets/js');

const jsDir = join(ROOT, 'assets', 'js');
const jsFiles = [];

function collectJs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectJs(path);
    else if (entry.isFile() && extname(entry.name) === '.js') jsFiles.push(path);
  }
}

if (!existsSync(jsDir)) {
  fail('pasta assets/js não encontrada');
} else {
  collectJs(jsDir);
  if (jsFiles.length === 0) fail('nenhum arquivo .js em assets/js');

  for (const file of jsFiles.sort()) {
    const name = toPosix(relative(ROOT, file));
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
      ok(`sintaxe válida — ${name}`);
    } catch (error) {
      const detail = String(error.stderr || error.stdout || error.message)
        .split(/\r?\n/)
        .find((line) => line.trim()) || 'erro desconhecido';
      fail(`sintaxe inválida — ${name}: ${detail.trim()}`);
    }
  }
}

section('3. IDs duplicados no HTML');

if (!html) {
  warn('verificação ignorada porque o index.html não pôde ser lido');
} else {
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');

  const seen = new Map();
  for (const match of markup.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    const id = match[1];
    seen.set(id, (seen.get(id) || 0) + 1);
  }

  const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
  if (duplicates.length === 0) {
    ok(`nenhum ID duplicado (${seen.size} IDs únicos)`);
  } else {
    for (const [id, count] of duplicates) {
      fail(`ID duplicado — "${id}" aparece ${count} vezes`);
    }
  }
}

section('4. Encoding dos arquivos de texto');

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.zip', '.gz', '.tar', '.7z', '.rar', '.pdf', '.mp3', '.mp4', '.webm',
]);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist']);
let scanned = 0;
const corrupted = [];

function scanTextFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) scanTextFiles(join(dir, entry.name));
      continue;
    }
    if (!entry.isFile() || BINARY_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      continue;
    }

    const path = join(dir, entry.name);
    let content;
    try {
      content = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    scanned += 1;
    if (content.includes('\uFFFD')) corrupted.push(toPosix(relative(ROOT, path)));
  }
}

scanTextFiles(ROOT);
if (corrupted.length === 0) {
  ok(`nenhum caractere de substituição U+FFFD (${scanned} arquivos de texto)`);
} else {
  for (const file of corrupted) {
    fail(`caractere U+FFFD encontrado — ${file} (encoding quebrado)`);
  }
}

section('5. Marcadores de versão');

if (!html) {
  warn('verificação ignorada porque o index.html não pôde ser lido');
} else {
  const hasMeta = /<meta\b[^>]*\bname\s*=\s*["']app-version["'][^>]*>/i.test(html);
  const hasPlaceholder = /\bdata-app-version\b/i.test(html);
  if (hasMeta || hasPlaceholder) {
    ok(
      hasMeta && hasPlaceholder
        ? 'meta app-version e placeholder data-app-version presentes'
        : hasMeta
          ? 'meta app-version presente'
          : 'placeholder data-app-version presente'
    );
  } else {
    fail('index.html não contém <meta name="app-version"> nem data-app-version');
  }
}

section('6. GitHub Pages');

if (existsSync(join(ROOT, '.nojekyll'))) ok('.nojekyll presente');
else fail('.nojekyll ausente (necessário para o GitHub Pages)');

console.log(`\n${'-'.repeat(60)}`);
if (failures.length > 0) {
  console.error(
    `Check falhou: ${failures.length} erro(s), ${warnings.length} aviso(s), ${passed} verificação(ões) ok.`
  );
  process.exit(1);
}

console.log(
  `Check concluído: ${passed} verificação(ões) ok, ${warnings.length} aviso(s).`
);
