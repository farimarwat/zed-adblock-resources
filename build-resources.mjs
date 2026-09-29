// Builds dist/resources.json for Brave's adblock-rust engine from uBlock Origin's source.
//
// Usage: node build-resources.mjs <path-to-uBlock-checkout> <output-dir> [ubo-version]
//
// Output:
//   resources.json  scriptlets (+js rules) and redirect resources ($redirect rules)
//   version.json    which uBO version it was built from, and when

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const [uboDir, outDir, uboVersion = 'unknown'] = process.argv.slice(2);
if (!uboDir || !outDir) {
    console.error('Usage: node build-resources.mjs <uBlock-dir> <out-dir> [version]');
    process.exit(1);
}

const load = async (rel) => import(pathToFileURL(path.resolve(uboDir, rel)).href);

// ── Scriptlets ──────────────────────────────────────────────────
// uBO registers each scriptlet with: name, aliases, fn, dependencies, requiresTrust.
// "*.fn" entries are helper functions used by other scriptlets.
const { builtinScriptlets } = await load('src/js/resources/scriptlets.js');

const TRUSTED = 1; // adblock-rust permission bit for trusted lists

const scriptlets = builtinScriptlets.map(s => {
    const resource = {
        name: s.name,
        aliases: s.aliases ?? [],
        kind: { mime: s.name.endsWith('.fn') ? 'fn/javascript' : 'application/javascript' },
        content: Buffer.from(s.fn.toString()).toString('base64'),
    };
    if (s.dependencies?.length) resource.dependencies = s.dependencies;
    if (s.requiresTrust) resource.permission = TRUSTED;
    return resource;
});

// ── Redirect resources ──────────────────────────────────────────
// Harmless stand-ins (empty scripts, 1x1 images, …) returned instead of blocked files.
const { default: redirectMap } = await load('src/js/redirect-resources.js');

const MIME = {
    '.gif': 'image/gif', '.png': 'image/png', '.js': 'application/javascript',
    '.txt': 'text/plain', '.html': 'text/html', '.css': 'text/css',
    '.json': 'application/json', '.xml': 'text/xml', '.mp3': 'audio/mp3', '.mp4': 'video/mp4',
};

const scriptletNames = new Set(scriptlets.map(s => s.name));
const redirects = [];
for (const [name, details] of redirectMap) {
    if (scriptletNames.has(name)) continue;
    const file = path.resolve(uboDir, 'src/web_accessible_resources', name);
    const mime = MIME[path.extname(name)];
    if (!fs.existsSync(file) || !mime) continue;
    redirects.push({
        name,
        aliases: [details?.alias].flat().filter(Boolean),
        kind: { mime },
        content: fs.readFileSync(file).toString('base64'),
    });
}

// ── Sanity checks — never publish a broken file ─────────────────
const required = ['json-prune.js', 'set-constant.js', 'trusted-replace-xhr-response.js'];
const missing = required.filter(n => !scriptletNames.has(n));
if (scriptlets.length < 100 || missing.length) {
    console.error(`Refusing to publish: ${scriptlets.length} scriptlets, missing ${missing.join(', ')}`);
    process.exit(1);
}

const resources = [...scriptlets, ...redirects];
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'resources.json'), JSON.stringify(resources));
fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify({
    uboVersion,
    generatedAt: new Date().toISOString(),
    scriptlets: scriptlets.length,
    trusted: scriptlets.filter(s => s.permission).length,
    redirects: redirects.length,
}, null, 2));

console.log(`uBO ${uboVersion}: ${scriptlets.length} scriptlets, ${redirects.length} redirects`);
