import {readdir, readFile, writeFile, mkdir} from 'node:fs/promises';
import {extname, join, relative} from 'node:path';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const root = 'dist';
const assets = {};
for (const name of await readdir(root, {recursive: true})) {
  const contentType = contentTypes[extname(name)];
  if (!contentType || name.startsWith('server') || name.startsWith('.openai')) continue;
  const path = join(root, name);
  assets['/' + relative(root, path).replaceAll('\\', '/')] = [contentType, (await readFile(path)).toString('base64')];
}
if (!assets['/index.html'] || !assets['/sw.js']) throw new Error('Build the web app before packaging the Worker.');
const worker = await readFile('worker/account.mjs', 'utf8');
await mkdir(join(root, 'server'), {recursive: true});
await writeFile(join(root, 'server/index.js'),
  `${worker}\nexport default {fetch: createSiteHandler(${JSON.stringify(assets)})};\n`);
console.log(`Packaged ${Object.keys(assets).length} web assets with the account API.`);
