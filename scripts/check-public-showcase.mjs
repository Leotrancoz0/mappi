import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const required = [
  'README.md',
  'NOTICE.md',
  'SECURITY.md',
  'docs/ARCHITECTURE.md',
  'docs/MODULES.md',
  'public/mappi.svg',
  'public/og-mappi-v2.png',
];

const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) throw new Error(`Required files are missing: ${missing.join(', ')}`);

const ignored = new Set(['.git', '.next', '.vinext', '.wrangler', 'dist', 'node_modules']);
const textExtensions = new Set(['.css', '.js', '.json', '.md', '.mjs', '.svg', '.ts', '.tsx']);

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    if (ignored.has(name) || name === 'package-lock.json' || name === 'check-public-showcase.mjs') return [];
    const absolute = join(directory, name);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}

const files = walk(root).filter((file) => textExtensions.has(extname(file)));
const violations = [];
const identityRules = [
  { label: 'marca anterior', pattern: /\bTopo\b|topoleiloes|cliqueshop/iu },
  { label: 'rota administrativa', pattern: /\/admin(?:\/|\b)/iu },
  { label: 'identificador interno', pattern: /topo-hub-|hub\.topoleiloes|\/(?:mappi|flows)(?:\/|['"\s])/iu },
  { label: 'credencial', pattern: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|api[_-]?key\s*[:=]|client[_-]?secret\s*[:=]/iu },
  { label: 'IP address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/u },
];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const display = relative(root, file).replaceAll('\\', '/');
  for (const rule of identityRules) {
    if (rule.pattern.test(text)) violations.push(`${display}: ${rule.label}`);
  }

  if (display.startsWith('app/') || display.startsWith('scripts/')) {
    if (/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|sendBeacon|document\.cookie/u.test(text)) {
      violations.push(`${display}: chamada externa ou acesso a cookie`);
    }
    const remoteUrls = text.match(/https?:\/\/[^\s'"`)]+/gu) ?? [];
    for (const url of remoteUrls) {
      if (url.includes('${')) continue;
      if (!/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/u.test(url)) {
        violations.push(`${display}: URL remota ${url}`);
      }
    }
  }
}

const png = readFileSync(join(root, 'public/og-mappi-v2.png'));
const pngSignature = '89504e470d0a1a0a';
if (png.subarray(0, 8).toString('hex') !== pngSignature) violations.push('public/og-mappi-v2.png: invalid PNG signature');
if (png.length < 20_000) violations.push('public/og-mappi-v2.png: social image is unexpectedly small');
if (existsSync(join(root, 'LICENSE')) || existsSync(join(root, 'LICENSE.md'))) {
  violations.push('LICENSE: this proprietary case study must not declare an open-source license');
}

if (violations.length) {
  console.error(JSON.stringify({ status: 'failed', violations }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'ok',
  filesChecked: files.length,
  requiredArtifacts: required.length,
  remoteCalls: 0,
  productionIdentifiers: 0,
}, null, 2));
