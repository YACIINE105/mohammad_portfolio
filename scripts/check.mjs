import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const fail = message => { throw new Error(message); };
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) fail('Duplicate HTML IDs.');
for (const [, id] of html.matchAll(/(?:href="#|aria-controls="|aria-labelledby=")([^"\s]+)"/g)) {
  if (!ids.includes(id)) fail(`Missing internal reference: ${id}`);
}
for (const [, asset] of html.matchAll(/(?:src|href|content)="(assets\/[^"#]+)"/g)) {
  await access(path.join(root, asset));
}
for (const [, asset] of html.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
  if (!asset.startsWith('http')) await access(path.join(root, asset));
}
for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
for (const [, script] of html.matchAll(/<script[^>]*src="(assets\/[^"]+)"/g)) {
  execFileSync(process.execPath, ['--check', path.join(root, script)], { stdio: 'pipe' });
}
for (const [, stylesheet] of html.matchAll(/href="(assets\/[^"]+\.css)"/g)) {
  const css = await readFile(path.join(root, stylesheet), 'utf8');
  for (const [, asset] of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
    if (!asset.startsWith('http')) await access(path.resolve(root, path.dirname(stylesheet), asset));
  }
}
for (const [, metadata] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(metadata);
for (const [, link] of html.matchAll(/<a\b([^>]*target="_blank"[^>]*)>/g)) {
  if (!/rel="[^"]*noopener/.test(link)) fail('External tab link is missing noopener.');
}
JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
if (html.includes('<!-- PROJECTS -->')) fail('Unfinished project content.');
if (!html.includes('prefers-reduced-motion')) fail('Reduced-motion support is missing.');
if (!html.includes('name="viewport"')) fail('Viewport declaration is missing.');
if (!html.includes('role="tablist"') || !html.includes('<dialog')) fail('Expected accessible interactions are missing.');
if (!html.includes('id="commit-list" dir="rtl"')) fail('Right-to-left commit feed is missing.');
const pdf = await readFile(path.join(root, 'assets', 'Mohammad_Elsayed_CV.pdf'));
if (pdf.subarray(0, 5).toString() !== '%PDF-') fail('Downloadable CV is not a PDF.');
const png = await readFile(path.join(root, 'assets', 'social-preview.png'));
if (png.subarray(1,4).toString() !== 'PNG') fail('Missing PNG social preview.');
console.log('Passed: JavaScript syntax, JSON metadata, local assets, internal references, external-link attributes, CV and social assets, responsive/accessibility declarations.');
console.log('Browser rendering and interaction checks are separate.');
