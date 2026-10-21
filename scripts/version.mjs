/**
 * Resolve a versão e os metadados do build.
 *
 * Ordem de precedência:
 *   1. APP_VERSION            — override manual (canal "release").
 *   2. Tag do Git `vX.Y.Z`    — canal "release".
 *   3. `version` do package.json — canal "main" (branch) ou "local".
 *
 * Uso:
 *   node scripts/version.mjs              # resumo legível
 *   node scripts/version.mjs --json       # metadados em JSON
 *   node scripts/version.mjs --verify-tag v1.2.3   # falha se divergir do package.json
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function lerPacote() {
  return JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
}

function repoDoRemote() {
  const remote = git(['remote', 'get-url', 'origin']);
  if (!remote) return '';
  const achado = remote.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  return achado ? `${achado[1]}/${achado[2]}` : '';
}

/**
 * @returns {{
 *   name: string, version: string, channel: string, channelLabel: string,
 *   commit: string, commitFull: string, ref: string, runNumber: string,
 *   repository: string, builtAt: string
 * }}
 */
export function resolverVersao() {
  const pacote = lerPacote();
  const refType = String(process.env.GITHUB_REF_TYPE || '');
  const refName = String(process.env.GITHUB_REF_NAME || '');
  const forcada = String(process.env.APP_VERSION || '').trim().replace(/^v/i, '');

  let version;
  let channel;

  if (forcada) {
    version = forcada;
    channel = 'release';
  } else if (refType === 'tag') {
    version = refName.replace(/^v/i, '');
    channel = 'release';
  } else {
    version = String(pacote.version || '');
    channel = refType === 'branch' ? refName || 'main' : 'local';
  }

  if (!SEMVER.test(version)) {
    throw new Error(`Versão inválida: "${version}" (esperado semver, ex.: 1.2.3)`);
  }

  const commitFull = process.env.GITHUB_SHA || git(['rev-parse', 'HEAD']) || 'local';
  const sujo = channel === 'local' && git(['status', '--porcelain']) !== '';
  const commit = commitFull === 'local' ? 'local' : commitFull.slice(0, 7);

  const channelLabel =
    channel === 'release'
      ? 'Release · tag'
      : channel === 'local'
        ? 'Local · sem CI'
        : `Branch · ${channel}`;

  return {
    name: pacote.name,
    version,
    channel,
    channelLabel,
    commit: sujo ? `${commit}-dirty` : commit,
    commitFull,
    ref: refName || channel,
    runNumber: String(process.env.GITHUB_RUN_NUMBER || ''),
    repository: process.env.GITHUB_REPOSITORY || repoDoRemote(),
    builtAt: new Date().toISOString(),
  };
}

function imprimirResumo(info) {
  console.log(`  projeto   ${info.name}`);
  console.log(`  versão    v${info.version}`);
  console.log(`  canal     ${info.channelLabel}`);
  console.log(`  commit    ${info.commit}`);
  if (info.repository) console.log(`  repo      ${info.repository}`);
  if (info.runNumber) console.log(`  execução  #${info.runNumber}`);
}

const executadoDireto =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (executadoDireto) {
  const info = resolverVersao();
  const args = process.argv.slice(2);
  const indiceTag = args.indexOf('--verify-tag');

  if (args.includes('--json')) {
    console.log(JSON.stringify(info, null, 2));
  } else if (indiceTag !== -1) {
    const esperada = String(args[indiceTag + 1] || '').replace(/^v/i, '');
    const pacote = lerPacote();
    if (esperada !== pacote.version) {
      console.error(
        `Tag v${esperada} não corresponde ao package.json (v${pacote.version}). ` +
          'Rode `npm version` antes de taguear.'
      );
      process.exit(1);
    }
    console.log(`Tag v${esperada} confere com o package.json.`);
  } else {
    imprimirResumo(info);
  }

  if (process.env.GITHUB_OUTPUT) {
    const linhas = Object.entries(info)
      .map(([chave, valor]) => `${chave}=${valor}`)
      .join('\n');
    appendFileSync(process.env.GITHUB_OUTPUT, `${linhas}\n`);
  }
}
