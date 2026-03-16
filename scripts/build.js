/**
 * build.js — Minify all JS and CSS files in public/ using esbuild.
 *
 * - Overwrites files in-place (same filenames, same paths).
 * - No bundling, no renaming — CSP nonces and template references stay valid.
 * - Run via: npm run build
 * - Called automatically by Dockerfile before production deployment.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function findFiles(dir, ext) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      results.push(...findFiles(fullPath, ext));
    } else if (path.extname(entry) === ext) {
      results.push(fullPath);
    }
  }
  return results;
}

async function build() {
  const jsFiles = findFiles(path.join(PUBLIC_DIR, 'js'), '.js');
  const cssFiles = findFiles(path.join(PUBLIC_DIR, 'css'), '.css');
  const allFiles = [...jsFiles, ...cssFiles];

  console.log(`[build] Minifying ${jsFiles.length} JS + ${cssFiles.length} CSS files...`);

  let totalSaved = 0;

  for (const file of allFiles) {
    const original = fs.readFileSync(file, 'utf8');
    const ext = path.extname(file);

    const { code } = await esbuild.transform(original, {
      minify: true,
      loader: ext === '.css' ? 'css' : 'js',
    });

    fs.writeFileSync(file, code);
    totalSaved += original.length - code.length;
  }

  const savedKB = (totalSaved / 1024).toFixed(1);
  console.log(`[build] Done. ${allFiles.length} files minified (${savedKB} KB saved).`);
}

build().catch((err) => {
  console.error('[build] Error:', err);
  process.exit(1);
});
