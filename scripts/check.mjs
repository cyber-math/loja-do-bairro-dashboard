/**
 * Verificações de CI do site estático — sem dependências externas.
 *
 * Valida arquivos obrigatórios, referências locais do index.html, sintaxe dos
 * scripts e os marcadores usados pelo build para carimbar a versão.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { RAIZ } from './version.mjs';

const falhas = [];
const avisos = [];
let aprovadas = 0;

const ok = (texto) => {
  aprovadas += 1;
  console.log(`  ok     ${texto}`);
};
const erro = (texto) => {
  falhas.push(texto);
  console.log(`  erro   ${texto}`);
};
const aviso = (texto) => {
  avisos.push(texto);
  console.log(`  aviso  ${texto}`);
};
const secao = (titulo) => console.log(`\n${titulo}`);

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/* ------------------------------------------------------------------ *
 * 1. Arquivos obrigatórios                                            *
 * ------------------------------------------------------------------ */
secao('Arquivos obrigatórios');
for (const item of [
  'index.html',
  'package.json',
  'README.md',
  'CHANGELOG.md',
  '.nojekyll',
  'assets/css/styles.css',
  'assets/js/app.js',
  'assets/js/charts.js',
  'assets/js/data.js',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/version.mjs',
  '.github/workflows/ci.yml',
  '.github/workflows/pages.yml',
  '.github/workflows/release.yml',
]) {
  if (existsSync(join(RAIZ, item))) ok(item);
  else erro(`arquivo obrigatório ausente — ${item}`);
}

/* ------------------------------------------------------------------ *
 * 2. Referências locais do index.html                                  *
 * ------------------------------------------------------------------ */
secao('Referências do index.html');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((url) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url));

for (const ref of refs) {
  const caminho = ref.split(/[?#]/)[0];
  if (!caminho) continue;
  if (caminho.startsWith('/')) {
    erro(`referência absoluta quebra no GitHub Pages — ${caminho}`);
    continue;
  }
  if (existsSync(resolve(RAIZ, caminho))) ok(`resolvido — ${caminho}`);
  else erro(`referência local inexistente — ${caminho}`);
}

/* ------------------------------------------------------------------ *
 * 3. Sintaxe dos scripts                                              *
 * ------------------------------------------------------------------ */
secao('Sintaxe dos scripts');

function listarJs(dir) {
  return readdirSync(dir).flatMap((entrada) => {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) return listarJs(caminho);
    return extname(entrada) === '.js' ? [caminho] : [];
  });
}

for (const arquivo of listarJs(join(RAIZ, 'assets'))) {
  try {
    execFileSync(process.execPath, ['--check', arquivo], { stdio: 'pipe' });
    ok(`sintaxe válida — ${relative(RAIZ, arquivo).replace(/\\/g, '/')}`);
  } catch (e) {
    erro(`erro de sintaxe em ${relative(RAIZ, arquivo)}: ${String(e.stderr || e.message).split('\n')[0]}`);
  }
}

/* ------------------------------------------------------------------ *
 * 4. Marcadores de versão                                             *
 * ------------------------------------------------------------------ */
secao('Marcadores de versão');
for (const meta of ['app-version', 'app-commit', 'app-channel']) {
  const total = (html.match(new RegExp(`<meta name="${meta}" content="[^"]*">`, 'g')) || []).length;
  if (total === 1) ok(`meta ${meta}`);
  else erro(`esperava 1 <meta name="${meta}">, encontrei ${total}`);
}
for (const atributo of ['data-app-version', 'data-app-commit', 'data-app-channel']) {
  const total = (html.match(new RegExp(`\\s${atributo}(?=[\\s>])`, 'g')) || []).length;
  if (total >= 1) ok(`placeholder ${atributo}`);
  else erro(`placeholder ${atributo} ausente no index.html`);
}

/* ------------------------------------------------------------------ *
 * 5. Metadados do projeto                                            *
 * ------------------------------------------------------------------ */
secao('Metadados');
try {
  const pacote = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
  if (SEMVER.test(String(pacote.version || ''))) ok(`versão semver — v${pacote.version}`);
  else erro(`versão inválida no package.json — "${pacote.version}"`);
  if (pacote.private === true) ok('pacote marcado como private');
  else aviso('package.json sem "private": true');
  if (pacote.scripts && pacote.scripts.check && pacote.scripts.build) ok('scripts check/build declarados');
  else erro('package.json precisa dos scripts "check" e "build"');
} catch (e) {
  erro(`package.json ilegível — ${e.message}`);
}

/* ------------------------------------------------------------------ *
 * Resultado                                                          *
 * ------------------------------------------------------------------ */
console.log(`\n${'-'.repeat(60)}`);
if (falhas.length > 0) {
  console.error(`${falhas.length} problema(s) encontrado(s).`);
  process.exit(1);
}
console.log(`Checagem concluída: ${aprovadas} verificações ok, ${avisos.length} aviso(s).`);
