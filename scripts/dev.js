const { context } = require('esbuild');
const vite = require('vite');
const childProcess = require('child_process');
const path = require('path');

async function start() {
  console.log('Starting Vite development server...');
  
  // 1. Start Vite Dev Server
  const server = await vite.createServer({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    server: {
      port: 5173,
    },
  });
  await server.listen();
  console.log('Vite server running at http://localhost:5173');

  // 2. Manage the Electron process
  let electronProcess = null;

  function restartElectron() {
    if (electronProcess) {
      console.log('Killing existing Electron process...');
      electronProcess.kill('SIGINT');
      electronProcess = null;
    }

    console.log('Spawning Electron...');
    electronProcess = childProcess.spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173',
        NODE_ENV: 'development',
      },
    });

    electronProcess.on('close', (code) => {
      // If Electron process exited and we are not restarting, exit dev script
      if (electronProcess === null) return;
      console.log(`Electron process exited with code ${code}`);
      process.exit(code || 0);
    });
  }

  // 3. Build preload with esbuild in watch mode
  console.log('Setting up preload watch context...');
  const preloadCtx = await context({
    entryPoints: [path.resolve(__dirname, '../src/main/preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node16',
    external: ['electron', 'music-metadata', 'electron-store', 'electron-updater'],
    outfile: path.resolve(__dirname, '../dist/main/preload.js'),
  });
  await preloadCtx.watch();

  // 4. Build main with esbuild in watch mode
  console.log('Setting up main process watch context...');
  const mainCtx = await context({
    entryPoints: [path.resolve(__dirname, '../src/main/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node16',
    external: ['electron', 'music-metadata', 'electron-store', 'electron-updater'],
    outfile: path.resolve(__dirname, '../dist/main/main.js'),
    plugins: [
      {
        name: 'restart-electron',
        setup(build) {
          build.onEnd(() => {
            console.log('Main process compiled, starting/restarting Electron...');
            restartElectron();
          });
        },
      },
    ],
  });
  await mainCtx.watch();
}

start().catch((err) => {
  console.error('Error starting development environment:', err);
  process.exit(1);
});
