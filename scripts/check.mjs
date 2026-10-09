import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const fail = message => { throw new Error(message); };
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if(new Set(ids).size !== ids.length) fail('Duplicate HTML IDs.');
for (const [, id] of html.matchAll(/(?:href|aria-controls)="#?([^"\s]+)"/g)) {
  if(id.startsWith('i-') || /^(?:agents|automation|experience|engineering|contact|overview|main|nav-links|architecture-panel)$/.test(id)) {
    if(!ids.includes(id)) fail(`Missing anchor: ${id}`);
  }
}
for (const [, asset] of html.matchAll(/(?:href|content)="(assets\/[^"#]+)"|url\('([^']+)'\)/g)) {
  if(asset) await access(path.join(root, asset));
}
for (const [, asset] of html.matchAll(/url\('([^']+)'\)/g)) await access(path.join(root, asset));
for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
for (const [, metadata] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(metadata);
JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
if(!html.includes('prefers-reduced-motion')) fail('Reduced-motion support is missing.');
if(!html.includes('name="viewport"')) fail('Viewport declaration is missing.');
if(!html.includes('role="tablist"') || !html.includes('<dialog')) fail('Expected project interactions are missing.');
const pdf = await readFile(path.join(root, 'assets', 'Mohammad_Elsayed_CV.pdf'));
if(pdf.subarray(0, 5).toString() !== '%PDF-') fail('Downloadable CV is not a PDF.');
console.log('Passed: JavaScript syntax, JSON metadata, local assets, anchors, CV file, and responsive/accessibility declarations.');
console.log('This structural check does not replace browser rendering and interaction testing.');
