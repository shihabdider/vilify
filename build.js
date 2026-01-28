const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');
const isProduction = process.env.NODE_ENV === 'production';

const buildOptions = {
  entryPoints: ['src/content.js'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  minify: isProduction,
  sourcemap: !isProduction,
  logLevel: 'info',
};

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('[esbuild] Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log('[esbuild] Build complete');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
