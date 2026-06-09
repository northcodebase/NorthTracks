const esbuild = require('esbuild');
const vite = require('vite');
const path = require('path');

async function build() {
  console.log('Building renderer (React)...');
  await vite.build({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
  });

  console.log('Building main process (Electron)...');
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/main/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node16',
    external: ['electron', 'music-metadata', 'electron-store'],
    outfile: path.resolve(__dirname, '../dist/main/main.js'),
    minify: true,
  });

  console.log('Building preload process (Electron)...');
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/main/preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node16',
    external: ['electron', 'music-metadata', 'electron-store'],
    outfile: path.resolve(__dirname, '../dist/main/preload.js'),
    minify: true,
  });

  console.log('Build completed successfully!');
}

build().catch((err) => {
  console.error('Build failed with error:', err);
  process.exit(1);
});
