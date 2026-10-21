/**
 * Gera o artefato publicado em `dist/`, carimbando versão, commit e canal
 * nas meta tags do index.html e em um version.json consultável.
 */
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { RAIZ, resolverVersao } from './version.mjs';

const DIST = join(RAIZ, 'dist');
const OBRIGATORIOS = ['index.html', 'assets', '.nojekyll'];

const info = resolverVersao();

for (const item of OBRIGATORIOS) {
  if (!existsSync(join(RAIZ, item))) {
    console.error(`erro: arquivo obrigatório ausente — ${item}`);
    process.exit(1);
  }
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const item of OBRIGATORIOS) {
  cpSync(join(RAIZ, item), join(DIST, item), { recursive: true });
}

/**
 * Substitui o conteúdo de uma meta tag, exigindo exatamente uma ocorrência.
 */
function carimbar(html, meta, valor) {
  const regex = new RegExp(`(<meta name="${meta}" content=")[^"]*(")`, 'g');
  const total = (html.match(regex) || []).length;
  if (total !== 1) {
    throw new Error(`esperava 1 ocorrência de <meta name="${meta}"> no index.html, encontrei ${total}`);
  }
  return html.replace(regex, (_, inicio, fim) => `${inicio}${valor}${fim}`);
}

let html = readFileSync(join(DIST, 'index.html'), 'utf8');
html = carimbar(html, 'app-version', info.version);
html = carimbar(html, 'app-commit', info.commit);
html = carimbar(html, 'app-channel', info.channelLabel);
writeFileSync(join(DIST, 'index.html'), html);

const metadados = {
  name: info.name,
  version: info.version,
  channel: info.channel,
  channelLabel: info.channelLabel,
  commit: info.commit,
  commitFull: info.commitFull,
  ref: info.ref,
  runNumber: info.runNumber,
  repository: info.repository,
  builtAt: info.builtAt,
};
writeFileSync(join(DIST, 'version.json'), `${JSON.stringify(metadados, null, 2)}\n`);

for (const item of ['index.html', 'version.json', '.nojekyll', 'assets/css/styles.css']) {
  if (!existsSync(join(DIST, item))) {
    console.error(`erro: artefato incompleto — dist/${item}`);
    process.exit(1);
  }
}

console.log('Build concluído em dist/');
console.log(`  versão  v${info.version}`);
console.log(`  canal   ${info.channelLabel}`);
console.log(`  commit  ${info.commit}`);
console.log(`  data    ${info.builtAt}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const resumo = [
    '### Site gerado',
    '',
    '| Campo | Valor |',
    '| --- | --- |',
    `| Versão | \`v${info.version}\` |`,
    `| Canal | ${info.channelLabel} |`,
    `| Commit | \`${info.commit}\` |`,
    `| Gerado em | ${info.builtAt} |`,
    '',
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo);
}
