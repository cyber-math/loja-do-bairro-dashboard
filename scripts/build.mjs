/**
 * Gera o artefato estático em dist/ e carimba versão, commit e canal.
 *
 * Sem bundler e sem dependências: apenas cópia de arquivos e edição do
 * index.html para injetar as meta tags consumidas pelo painel.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, resolveVersion } from './version.mjs';

const DIST = join(ROOT, 'dist');
const FILES = ['index.html', '.nojekyll', 'README.md'];
const DIRS = ['assets'];

function fail(message) {
  console.error(`erro: ${message}`);
  process.exit(1);
}

for (const file of FILES) {
  if (!existsSync(join(ROOT, file))) fail(`arquivo obrigatório ausente — ${file}`);
}
for (const dir of DIRS) {
  if (!existsSync(join(ROOT, dir))) fail(`pasta obrigatória ausente — ${dir}`);
}

const info = resolveVersion();

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const file of FILES) {
  cpSync(join(ROOT, file), join(DIST, file));
}
for (const dir of DIRS) {
  cpSync(join(ROOT, dir), join(DIST, dir), { recursive: true });
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stampMeta(html, name, content) {
  const tag = `<meta name="${name}" content="${escapeAttribute(content)}">`;
  const pattern = new RegExp(
    `<meta\\b[^>]*\\bname=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
    'gi'
  );

  if (html.match(pattern)) return html.replace(pattern, tag);
  if (!/<\/head\s*>/i.test(html)) {
    throw new Error('index.html não possui </head> para receber as meta tags');
  }
  return html.replace(/<\/head\s*>/i, `  ${tag}\n</head>`);
}

const indexPath = join(DIST, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = stampMeta(html, 'app-version', info.version);
html = stampMeta(html, 'app-commit', info.commit);
html = stampMeta(html, 'app-channel', info.channelLabel);
writeFileSync(indexPath, html);

const metadata = {
  version: info.version,
  commit: info.commit,
  channel: info.channel,
  builtAt: info.builtAt,
};
writeFileSync(
  join(DIST, 'version.json'),
  `${JSON.stringify(metadata, null, 2)}\n`
);

for (const file of [...FILES, 'version.json']) {
  if (!existsSync(join(DIST, file))) fail(`artefato incompleto — ${file}`);
}

const size = (path) => readFileSync(path).length;
console.log('Build concluído.');
console.log(`  artefato  ${relative(ROOT, DIST)}/`);
console.log(`  versão    v${info.version}`);
console.log(`  canal     ${info.channelLabel}`);
console.log(`  commit    ${info.commit}`);
console.log(`  gerado em ${info.builtAt}`);
console.log(`  index     ${size(indexPath)} bytes`);
