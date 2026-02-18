const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isProduction = process.env.NODE_ENV === 'production';

// Main content script (runs in isolated world)
const contentOptions = {
  entryPoints: ['src/content.ts'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  minify: isProduction,
  sourcemap: !isProduction,
  logLevel: 'info',
};

// Background service worker
const backgroundOptions = {
  entryPoints: ['src/background.ts'],
  bundle: true,
  outfile: 'dist/background.js',
  format: 'iife',
  minify: isProduction,
  sourcemap: !isProduction,
  logLevel: 'info',
};

// Data bridge script (runs in MAIN world)
const bridgeOptions = {
  entryPoints: ['src/sites/youtube/data-bridge.ts'],
  bundle: true,
  outfile: 'dist/data-bridge.js',
  format: 'iife',
  minify: isProduction,
  sourcemap: !isProduction,
  logLevel: 'info',
};

function copyAssets() {
  fs.mkdirSync('dist', { recursive: true });
  const manifest = fs.readFileSync('manifest.json', 'utf8');
  fs.writeFileSync(path.join('dist', 'manifest.json'), manifest.replaceAll('dist/', ''));
  fs.cpSync('icons', path.join('dist', 'icons'), { recursive: true });
  console.log('[build] Copied manifest.json and icons/ to dist/');
}

async function build() {
  if (isWatch) {
    const ctx1 = await esbuild.context(contentOptions);
    const ctx2 = await esbuild.context(bridgeOptions);
    const ctx3 = await esbuild.context(backgroundOptions);
    await ctx1.watch();
    await ctx2.watch();
    await ctx3.watch();
    copyAssets();
    console.log('[esbuild] Watching for changes...');
  } else {
    await esbuild.build(contentOptions);
    await esbuild.build(bridgeOptions);
    await esbuild.build(backgroundOptions);
    copyAssets();
    console.log('[esbuild] Build complete');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
