const esbuild = require('esbuild');

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

async function build() {
  if (isWatch) {
    const ctx1 = await esbuild.context(contentOptions);
    const ctx2 = await esbuild.context(bridgeOptions);
    await ctx1.watch();
    await ctx2.watch();
    console.log('[esbuild] Watching for changes...');
  } else {
    await esbuild.build(contentOptions);
    await esbuild.build(bridgeOptions);
    console.log('[esbuild] Build complete');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
