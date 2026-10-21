/**
 * Resolve a versão publicada a partir do package.json e do contexto do CI.
 *
 * Regras de canal:
 *   - tag `vX.Y.Z` no CI  -> "release" (versão sem o "v")
 *   - branch `main`       -> "main"
 *   - qualquer outro caso -> "local"
 *
 * Uso:
 *   node scripts/version.mjs
 *   node scripts/version.mjs --verify-tag v1.0.0
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function readPackage() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
}

/**
 * @returns {{
 *   version: string,
 *   channel: 'release' | 'main' | 'local',
 *   channelLabel: string,
 *   commit: string,
 *   builtAt: string
 * }}
 */
export function resolveVersion() {
  const pkg = readPackage();
  const refType = String(process.env.GITHUB_REF_TYPE || '');
  const refName = String(process.env.GITHUB_REF_NAME || '');

  let version = String(pkg.version || '');
  let channel = 'local';

  if (refType === 'tag' && refName.startsWith('v')) {
    version = refName.slice(1);
    channel = 'release';
  } else if (refName === 'main') {
    channel = 'main';
  }

  if (!SEMVER.test(version)) {
    throw new Error(`versão inválida no package.json: "${version}" (esperado X.Y.Z)`);
  }

  const commitFull = process.env.GITHUB_SHA || git(['rev-parse', 'HEAD']) || 'local';
  const hasChanges = commitFull !== 'local' && git(['status', '--porcelain']) !== '';
  const commit = commitFull === 'local'
    ? 'local'
    : `${commitFull.slice(0, 7)}${hasChanges ? '-dirty' : ''}`;

  const channelLabel =
    channel === 'release' ? 'Release · tag'
      : channel === 'main' ? 'Branch · main'
        : 'Local · sem CI';

  return {
    version,
    channel,
    channelLabel,
    commit,
    builtAt: new Date().toISOString(),
  };
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const tagIndex = args.indexOf('--verify-tag');

  try {
    if (tagIndex !== -1) {
      const tag = String(args[tagIndex + 1] || process.env.GITHUB_REF_NAME || '').trim();
      const expected = tag.replace(/^v/, '');
      const { version: packageVersion } = readPackage();

      if (!tag.startsWith('v') || expected !== packageVersion) {
        console.error(
          `Tag "${tag}" não corresponde ao package.json (v${packageVersion}). ` +
            'Rode `npm version` e envie a tag correta.'
        );
        process.exit(1);
      }

      console.log(`Tag ${tag} confere com o package.json (v${packageVersion}).`);
    } else {
      const info = resolveVersion();
      console.log(
        JSON.stringify(
          {
            version: info.version,
            channel: info.channel,
            commit: info.commit,
            builtAt: info.builtAt,
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    console.error(`erro: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
