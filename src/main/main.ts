import { app, BrowserWindow, ipcMain, dialog, protocol, net, nativeImage, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import NodeID3 from 'node-id3';
import { scanLibrary, findFolderImage, getAudioFiles, limitConcurrency } from './scanner';
import { organizeLibrary, clearGenreMapCache, normalizeGenreName, reorganizeFolders } from './organizer';
import { getSettings, saveSettings } from './settings';
import { initializeDiscordRpc, shutdownDiscordRpc, updateDiscordActivity, testDiscordRpcConnection } from './discord';

// Register custom media protocol scheme as privileged (must be called before app ready)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

let libraryFilePath = '';
let logFilePath = '';
let playlistsFilePath = '';
let browseLibraryFilePath = '';

// App is ready or we initialize paths inside app.whenReady() or directly using app.getPath() after app is ready.
// Wait, calling app.getPath('appData') before app ready is safe in Electron as long as it's not a path that depends on user-data, but to be safe let's initialize them at module level using a function or inside whenReady, or resolve them as soon as app is ready.
// Actually, app.getPath('appData') is safe to call before ready. To be extremely safe, we can initialize them immediately.
try {
  const appData = app.getPath('appData');
  libraryFilePath = path.join(appData, 'NorthTracks', 'library.json');
  logFilePath = path.join(appData, 'NorthTracks', 'import-log.json');
  playlistsFilePath = path.join(appData, 'NorthTracks', 'playlists.json');
  browseLibraryFilePath = path.join(appData, 'NorthTracks', 'browse-library.json');
} catch (e) {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  libraryFilePath = path.join(appData, 'NorthTracks', 'library.json');
  logFilePath = path.join(appData, 'NorthTracks', 'import-log.json');
  playlistsFilePath = path.join(appData, 'NorthTracks', 'playlists.json');
  browseLibraryFilePath = path.join(appData, 'NorthTracks', 'browse-library.json');
}

function getThemeSync(): string {
  try {
    const userDataPath = app.getPath('userData');
    const settingsFilePath = path.join(userDataPath, 'settings.json');
    if (fs.existsSync(settingsFilePath)) {
      const content = fs.readFileSync(settingsFilePath, 'utf-8');
      const match = content.match(/"theme"\s*:\s*"([^"]+)"/);
      if (match) {
        return match[1];
      }
    }
  } catch (e) {
    console.error('Failed to read theme synchronously:', e);
  }
  return 'dark';
}

ipcMain.on('get-theme-sync', (event) => {
  event.returnValue = getThemeSync();
});

let mainWindow: BrowserWindow | null = null;

// System Media Transport Controls (SMTC) native modules configuration
let wmpotatoInstance: any = null;
try {
  const WMPotato = require('@jellybrick/wmpotato');
  if (WMPotato) {
    wmpotatoInstance = new WMPotato();
  }
} catch (e) {
  console.log('@jellybrick/wmpotato is not available.');
}

let winAudioInstance: any = null;
try {
  winAudioInstance = require('win-audio');
} catch (e) {
  console.log('win-audio is not available.');
}

function updateTaskbarThumbnailButtons(playing: boolean) {
  if (!mainWindow) return;
  try {
    if (process.platform !== 'win32') return;

    const playIcon = nativeImage.createFromDataURL('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>');
    const pauseIcon = nativeImage.createFromDataURL('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>');
    const prevIcon = nativeImage.createFromDataURL('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>');
    const nextIcon = nativeImage.createFromDataURL('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>');

    mainWindow.setThumbarButtons([
      {
        tooltip: 'Previous',
        icon: prevIcon,
        click() {
          mainWindow?.webContents.send('thumbar-control', 'prev');
        }
      },
      {
        tooltip: playing ? 'Pause' : 'Play',
        icon: playing ? pauseIcon : playIcon,
        click() {
          mainWindow?.webContents.send('thumbar-control', 'toggle-play');
        }
      },
      {
        tooltip: 'Next',
        icon: nextIcon,
        click() {
          mainWindow?.webContents.send('thumbar-control', 'next');
        }
      }
    ]);
  } catch (err) {
    console.error('Failed to set thumbar buttons:', err);
  }
}

function getWindowsBuildNumber(): number {
  if (process.platform !== 'win32') return 0;
  const release = os.release();
  const parts = release.split('.');
  if (parts.length >= 3) {
    const build = parseInt(parts[2], 10);
    return isNaN(build) ? 0 : build;
  }
  return 0;
}

async function createWindow(settings?: any) {
  const initialTheme = getThemeSync();
  let bgColor = initialTheme === 'light' ? '#f5f5f5' : '#0f0f0f';
  let transparent = false;
  let backgroundMaterial: 'acrylic' | 'none' | undefined = undefined;

  let resolvedStyle = 'solid';
  try {
    const activeSettings = settings || await getSettings();
    resolvedStyle = activeSettings.visualStyle || 'solid';

    // Windows 11 Build number check
    const isWin11 = getWindowsBuildNumber() >= 22000;
    if ((resolvedStyle === 'acrylic' || resolvedStyle === 'glow') && !isWin11) {
      resolvedStyle = 'solid';
      await saveSettings({ visualStyle: 'solid' });
    }
  } catch (e) {
    console.error('Failed to resolve visualStyle in createWindow:', e);
  }

  if (resolvedStyle === 'acrylic' || resolvedStyle === 'glow') {
    transparent = true;
    bgColor = '#00000000';
    backgroundMaterial = 'acrylic';
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // frameless window
    titleBarStyle: 'hidden',
    transparent,
    backgroundMaterial,
    backgroundColor: bgColor,
    icon: path.join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // ── Block all browser-like keyboard shortcuts ─────────────────────────────
  // Intercept key events before Chromium processes them.
  const isDev = !!process.env.VITE_DEV_SERVER_URL;

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta; // meta = Cmd on macOS
    const shift = input.shift;
    const alt = input.alt;
    const k = input.key.toLowerCase();

    // DevTools — Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C / F12
    if ((ctrl && shift && (k === 'i' || k === 'j' || k === 'c')) || k === 'f12') {
      event.preventDefault();
      return;
    }

    // Page reload — Ctrl+R / Ctrl+Shift+R / F5 / Ctrl+F5
    if ((ctrl && k === 'r') || (ctrl && shift && k === 'r') || k === 'f5') {
      event.preventDefault();
      return;
    }

    // Find in page — Ctrl+F / Ctrl+G (find next)
    if (ctrl && (k === 'f' || k === 'g')) {
      event.preventDefault();
      return;
    }

    // Print — Ctrl+P
    if (ctrl && k === 'p') {
      event.preventDefault();
      return;
    }

    // View source — Ctrl+U
    if (ctrl && k === 'u') {
      event.preventDefault();
      return;
    }

    // Browser history navigation — Alt+Left / Alt+Right
    if (alt && (k === 'arrowleft' || k === 'arrowright')) {
      event.preventDefault();
      return;
    }

    // New tab / New window / Close tab — Ctrl+T / Ctrl+N
    // (Ctrl+W is intentionally not blocked; some users map it to close the app)
    if (ctrl && (k === 't' || k === 'n')) {
      event.preventDefault();
      return;
    }

    // Address bar focus — Ctrl+L
    if (ctrl && k === 'l') {
      event.preventDefault();
      return;
    }

    // Bookmarks — Ctrl+D / Ctrl+Shift+D
    if (ctrl && (k === 'd')) {
      event.preventDefault();
      return;
    }
  });

  // Block DevTools from being opened in production (via menu or any other path)
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  // Remove the default Chromium right-click context menu entirely.
  // It shows "Inspect Element", "View Page Source", "Save as…", etc.
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault();
  });

  // Prevent the window from navigating away from the app (e.g. clicking an
  // external <a href> that somehow bubbles to the shell).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL() ?? '';
    if (url !== currentUrl) {
      event.preventDefault();
    }
  });

  // Prevent new browser windows from opening (e.g. target="_blank" links).
  // External URLs are opened in the system browser via shell.openExternal instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  // ─────────────────────────────────────────────────────────────────────────

  mainWindow.once('ready-to-show', () => {
    updateTaskbarThumbnailButtons(false);
  });

  // Load appropriate URL/File
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Send visual style back on load finished
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('visual-style', resolvedStyle);
  });

  // Window state event listeners to send status to React renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-state-changed', { isMaximized: false });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup auto-updater listeners and check for updates
  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-status', 'update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-status', 'update-downloaded');
  });

  autoUpdater.checkForUpdatesAndNotify();
}

// Window control IPC handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});

// Sync initial state on request
ipcMain.handle('get-window-state', () => {
  return {
    isMaximized: mainWindow ? mainWindow.isMaximized() : false
  };
});

ipcMain.handle('show-in-explorer', async (_event, filePath: string) => {
  try {
    if (filePath) {
      shell.showItemInFolder(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to show file in explorer:', err);
    return false;
  }
});

ipcMain.handle('rename-folder', async (_event, oldPath: string, newPath: string) => {
  try {
    if (fs.existsSync(oldPath)) {
      const parentDir = path.dirname(newPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      await fs.promises.rename(oldPath, newPath);
      return true;
    }
    throw new Error('Source folder does not exist');
  } catch (err) {
    console.error('Failed to rename folder:', err);
    throw err;
  }
});


ipcMain.handle('apply-visual-style', async (_event, styleValue: 'solid' | 'acrylic' | 'glow') => {
  try {
    if (mainWindow) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Cancel', 'Restart'],
        defaultId: 1,
        title: 'Restart Required',
        message: 'NorthTracks will restart to apply the new visual style. Continue?',
        cancelId: 0
      });
      if (choice === 1) {
        await saveSettings({ visualStyle: styleValue });
        app.relaunch();
        app.exit(0);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Failed to apply visual style:', err);
    return false;
  }
});

ipcMain.handle('get-system-info', () => {
  return {
    isWin11: getWindowsBuildNumber() >= 22000
  };
});

// Scan library IPC handler
ipcMain.handle('scan-library', async (_event, sourceFolder: string) => {
  try {
    const tracks = await scanLibrary(sourceFolder);

    // Log the first track's coverArt field length to console after scanning to verify it is being stored correctly
    if (tracks.length > 0) {
      const firstCover = tracks[0].coverArt;
      if (firstCover) {
        console.log(`First track's coverArt field length: ${firstCover.length}`);
      } else {
        console.log(`First track has no coverArt.`);
      }
    } else {
      console.log(`No tracks scanned.`);
    }

    // Normalize genres
    clearGenreMapCache();
    const normalizedTracks = tracks.map(t => {
      if (t.genre && t.genre.length > 0) {
        return {
          ...t,
          genre: t.genre.map((g: string) => normalizeGenreName(g))
        };
      }
      return t;
    });

    // Save to library.json
    try {
      const logDir = path.dirname(libraryFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.writeFileSync(libraryFilePath, JSON.stringify(normalizedTracks, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write library.json file:', e);
    }

    // Append scan activity log to import-log.json
    try {
      const timestamp = new Date().toISOString();
      const scanLog = {
        timestamp,
        source: 'Scanner Indexer',
        destination: sourceFolder,
        status: 'success',
        error: `Scanned and cataloged ${normalizedTracks.length} audio files.`
      };

      let logs: any[] = [];
      const logDir = path.dirname(logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      if (fs.existsSync(logFilePath)) {
        try {
          const content = fs.readFileSync(logFilePath, 'utf-8');
          logs = JSON.parse(content);
          if (!Array.isArray(logs)) logs = [];
        } catch (e) {
          logs = [];
        }
      }
      logs.push(scanLog);
      fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write import-log.json for scan activity:', e);
    }

    return normalizedTracks;
  } catch (err: any) {
    console.error('Failed to scan library:', err);
    throw err;
  }
});

// Get library IPC handler
ipcMain.handle('get-library', async () => {
  try {
    clearGenreMapCache();
    if (fs.existsSync(libraryFilePath)) {
      const content = await fs.promises.readFile(libraryFilePath, 'utf-8');
      const tracks = JSON.parse(content);
      if (Array.isArray(tracks)) {
        return tracks.map(t => {
          if (t.coverArt && t.coverArt.startsWith('file:///')) {
            t.coverArt = t.coverArt.replace('file:///', 'media:///');
          }
          if (t.genre && t.genre.length > 0) {
            return {
              ...t,
              genre: t.genre.map((g: string) => normalizeGenreName(g))
            };
          }
          return t;
        });
      }
      return tracks;
    }
    return [];
  } catch (err) {
    console.error('Failed to read library file:', err);
    return [];
  }
});

// Save library IPC handler
ipcMain.handle('save-library', async (_event, tracks: any[]) => {
  try {
    const logDir = path.dirname(libraryFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(libraryFilePath, JSON.stringify(tracks, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save library file:', err);
    throw err;
  }
});

// Get activities IPC handler (last 5 from import-log.json)
ipcMain.handle('get-activities', async () => {
  try {
    if (fs.existsSync(logFilePath)) {
      const content = await fs.promises.readFile(logFilePath, 'utf-8');
      const logs = JSON.parse(content);
      if (Array.isArray(logs)) {
        return logs.slice(-5).reverse();
      }
    }
    return [];
  } catch (err) {
    console.error('Failed to read import log file:', err);
    return [];
  }
});

// Get playlists IPC handler
ipcMain.handle('get-playlists', async () => {
  try {
    if (fs.existsSync(playlistsFilePath)) {
      const content = await fs.promises.readFile(playlistsFilePath, 'utf-8');
      return JSON.parse(content);
    }
    return [];
  } catch (err) {
    console.error('Failed to read playlists file:', err);
    return [];
  }
});

// Save playlists IPC handler
ipcMain.handle('save-playlists', async (_event, playlists: any[]) => {
  try {
    const logDir = path.dirname(playlistsFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save playlists file:', err);
    throw err;
  }
});

// Organize library IPC handler
ipcMain.handle('organize-library', async (event, tracks: any[]) => {
  try {
    const result = await organizeLibrary(tracks, (current, total) => {
      event.sender.send('organize-progress', { current, total });
    });
    return result;
  } catch (err: any) {
    console.error('Failed to organize library:', err);
    throw err;
  }
});

// Reorganize folders IPC handler
ipcMain.handle('reorganize-folders', async () => {
  try {
    const settings = await getSettings();
    const destinationFolderPath = settings.destinationFolderPath || 'C:\\Users\\North\\Music';
    const result = await reorganizeFolders(destinationFolderPath);

    // Append reorganize activity log to import-log.json
    try {
      const timestamp = new Date().toISOString();
      const reorganizeLog = {
        timestamp,
        source: 'Reorganize Folders',
        destination: destinationFolderPath,
        status: 'success',
        error: `Reorganized ${result.filesMoved} files across ${result.foldersRenamed} folders.`
      };

      let logs: any[] = [];
      const logDir = path.dirname(logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      if (fs.existsSync(logFilePath)) {
        try {
          const content = fs.readFileSync(logFilePath, 'utf-8');
          logs = JSON.parse(content);
          if (!Array.isArray(logs)) logs = [];
        } catch (e) {
          logs = [];
        }
      }
      logs.push(reorganizeLog);
      fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write import-log.json for reorganize activity:', e);
    }

    return result;
  } catch (err: any) {
    console.error('Failed to reorganize folders:', err);
    throw err;
  }
});

// Settings IPC handlers
ipcMain.handle('get-settings', async () => {
  try {
    return await getSettings();
  } catch (err: any) {
    console.error('Failed to get settings:', err);
    throw err;
  }
});

ipcMain.handle('save-settings', async (_event, settings: any) => {
  try {
    const prevSettings = await getSettings();
    const result = await saveSettings(settings);
    if (settings.destinationFolderPath !== undefined && settings.destinationFolderPath !== prevSettings.destinationFolderPath) {
      if (fs.existsSync(browseLibraryFilePath)) {
        try {
          fs.unlinkSync(browseLibraryFilePath);
        } catch (e) {
          console.error('Failed to delete browse cache on settings destination change:', e);
        }
      }
    }

    // Dynamic Discord RPC update on settings change
    if (result.discordEnabled) {
      initializeDiscordRpc();
    } else {
      shutdownDiscordRpc();
    }

    return result;
  } catch (err: any) {
    console.error('Failed to save settings:', err);
    throw err;
  }
});

ipcMain.handle('test-discord-rpc', async (_, clientId: string) => {
  try {
    return await testDiscordRpcConnection(clientId);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('open-external', async (_, url: string) => {
  try {
    const { shell } = require('electron');
    await shell.openExternal(url);
    return true;
  } catch (err) {
    console.error('Failed to open external URL:', err);
    return false;
  }
});

// Liked tracks IPC handlers
ipcMain.handle('get-liked-tracks', async () => {
  try {
    const settings = await getSettings();
    return settings.likedTracks || [];
  } catch (err: any) {
    console.error('Failed to get liked tracks:', err);
    throw err;
  }
});

ipcMain.handle('save-liked-tracks', async (_event, likedTracks: string[]) => {
  try {
    await saveSettings({ likedTracks });
    return true;
  } catch (err: any) {
    console.error('Failed to save liked tracks:', err);
    throw err;
  }
});

// Play track IPC handler
ipcMain.handle('play-track', async (_event, filePath: string) => {
  try {
    const formattedPath = filePath.replace(/\\/g, '/');
    return `media:///${formattedPath}`;
  } catch (err: any) {
    console.error('Failed to get play track URL:', err);
    throw err;
  }
});

// Get lyrics IPC handler
ipcMain.handle('get-lyrics', async (_event, filePath: string) => {
  try {
    const ext = path.extname(filePath);
    const lrcPath = filePath.substring(0, filePath.length - ext.length) + '.lrc';
    if (fs.existsSync(lrcPath)) {
      const content = fs.readFileSync(lrcPath, 'utf-8');
      return { type: 'lrc', lyrics: content };
    }

    const txtPath = filePath.substring(0, filePath.length - ext.length) + '.txt';
    if (fs.existsSync(txtPath)) {
      const content = fs.readFileSync(txtPath, 'utf-8');
      return { type: 'txt', lyrics: content };
    }

    const { parseFile } = await import('music-metadata');
    const metadata = await parseFile(filePath);

    if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
      const extracted = metadata.common.lyrics.map((l: any) => {
        if (typeof l === 'string') return l;
        if (l && typeof l === 'object') return l.text || l.lyrics || JSON.stringify(l);
        return String(l);
      }).filter(Boolean).join('\n');
      if (extracted.trim().length > 0) {
        return { type: 'embedded', lyrics: extracted };
      }
    }

    for (const format of Object.keys(metadata.native || {})) {
      const tags = metadata.native[format] || [];
      for (const tag of tags) {
        const key = (tag.id || '').toLowerCase();
        if (key === 'uslt' || key.includes('lyrics')) {
          if (typeof tag.value === 'string') {
            return { type: 'embedded', lyrics: tag.value };
          } else if (Array.isArray(tag.value)) {
            const val = tag.value.map((v: any) => {
              if (typeof v === 'string') return v;
              if (v && typeof v === 'object') return v.text || v.lyrics || JSON.stringify(v);
              return String(v);
            }).join('\n');
            return { type: 'embedded', lyrics: val };
          } else if (tag.value && typeof tag.value === 'object') {
            const obj = tag.value as any;
            const val = obj.text || obj.lyrics || JSON.stringify(tag.value);
            return { type: 'embedded', lyrics: val };
          }
        }
      }
    }

    return { type: 'none', lyrics: '' };
  } catch (err) {
    console.error('Failed to get lyrics:', err);
    return { type: 'none', lyrics: '' };
  }
});

// Delete file IPC handler
ipcMain.handle('delete-file', async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    throw new Error('File does not exist');
  } catch (err: any) {
    console.error('Failed to delete file:', err);
    throw err;
  }
});

// Delete source files IPC handler
ipcMain.handle('delete-source-files', async (_, filePaths: string[]) => {
  const results = { deleted: 0, failed: 0, errors: [] as string[] }

  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        results.deleted++
      }
    } catch (err: any) {
      results.failed++
      results.errors.push(`Failed to delete: ${filePath}`)
    }
  }

  return results
})

ipcMain.handle('clear-library-cache', async () => {
  const libraryPath = path.join(app.getPath('userData'), 'library.json')
  if (fs.existsSync(libraryPath)) fs.unlinkSync(libraryPath)
  return true
})

ipcMain.handle('reset-settings', async () => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath)
  return true
})

ipcMain.handle('delete-organized-music', async () => {
  const settings = await getSettings()
  const destPath = settings.destinationFolderPath
  if (!destPath || !fs.existsSync(destPath)) return false
  fs.rmSync(destPath, { recursive: true, force: true })
  fs.mkdirSync(destPath, { recursive: true })
  return true
})

ipcMain.handle('write-track-metadata', async (_event, filePath: string, tags: any) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' };
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.flac' || ext === '.m4a') {
      return { success: false, error: 'Format not yet supported' };
    }

    if (ext !== '.mp3') {
      return { success: false, error: `Unsupported file format: ${ext}` };
    }

    const id3Tags: any = {};

    if (tags.title !== undefined) id3Tags.title = tags.title;
    if (tags.artist !== undefined) id3Tags.artist = tags.artist;
    if (tags.album !== undefined) id3Tags.album = tags.album;
    if (tags.genre !== undefined) {
      id3Tags.genre = Array.isArray(tags.genre) ? tags.genre.join(', ') : tags.genre;
    }

    if (tags.image !== undefined && tags.image !== null) {
      try {
        let mime = 'image/jpeg';
        let buffer: Buffer | null = null;

        if (typeof tags.image === 'string') {
          if (tags.image.startsWith('data:')) {
            const match = tags.image.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mime = match[1];
              buffer = Buffer.from(match[2], 'base64');
            }
          } else if (tags.image.startsWith('media://') || tags.image.startsWith('file://')) {
            const localPath = getFilePathFromMediaUrl(tags.image);
            if (localPath && fs.existsSync(localPath)) {
              buffer = fs.readFileSync(localPath);
              mime = localPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            }
          } else if (fs.existsSync(tags.image)) {
            buffer = fs.readFileSync(tags.image);
            mime = tags.image.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          } else {
            // Try raw base64 string
            try {
              buffer = Buffer.from(tags.image, 'base64');
              if (buffer.length > 4) {
                if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
                  mime = 'image/png';
                } else {
                  mime = 'image/jpeg';
                }
              }
            } catch (e) {
              console.error('Failed to parse raw base64 string:', e);
            }
          }
        }

        if (buffer) {
          id3Tags.image = {
            mime,
            type: {
              id: 3,
              name: 'front cover'
            },
            description: 'Cover Art',
            imageBuffer: buffer
          };
        }
      } catch (imageErr: any) {
        console.error('Error processing cover art image tag:', imageErr);
      }
    }

    // Update tags on the mp3 file
    const success = NodeID3.update(id3Tags, filePath);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to write ID3 tags' };
    }
  } catch (err: any) {
    console.error('Error in write-track-metadata handler:', err);
    return { success: false, error: err.message || String(err) };
  }
});

let currentPlayingTrack: any = null;

ipcMain.handle('update-playback-state', async (_, isPlaying: boolean, track?: any) => {
  if (track) {
    currentPlayingTrack = track;
  }

  // Update Discord RPC if enabled
  try {
    const settings = await getSettings();
    if (settings.discordEnabled) {
      if (currentPlayingTrack) {
        updateDiscordActivity(isPlaying, currentPlayingTrack.title, currentPlayingTrack.artist);
      }
    }
  } catch (err) {
    console.error('Failed to update Discord RPC activity:', err);
  }

  try {
    if (wmpotatoInstance) {
      if (track) {
        wmpotatoInstance.setMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
          cover: track.coverArt
        });
      }
      wmpotatoInstance.setPlaybackStatus(isPlaying ? 'playing' : 'paused');
    }
  } catch (err) {
    console.error('Failed to update wmpotato metadata:', err);
  }

  try {
    if (winAudioInstance) {
      if (typeof winAudioInstance.setMetadata === 'function') {
        winAudioInstance.setMetadata(track);
      }
    }
  } catch (err) {
    console.error('Failed to update win-audio metadata:', err);
  }

  // Update taskbar thumbnail buttons
  updateTaskbarThumbnailButtons(isPlaying);

  return true;
});

// Select folder dialog handler
ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled) {
      return null;
    }
    return result.filePaths[0];
  } catch (err: any) {
    console.error('Failed to open directory dialog:', err);
    throw err;
  }
});

// Get genre folders (destination music folder files) IPC handler
ipcMain.handle('get-genre-folders', async (_event, forceRefresh?: boolean) => {
  try {
    const settings = await getSettings();
    const destinationFolderPath = settings.destinationFolderPath || 'C:\\Users\\North\\Music';

    if (!fs.existsSync(destinationFolderPath)) {
      return [];
    }

    // Load existing cache into a Map for instant lookup
    const cacheMap = new Map<string, any>();
    if (fs.existsSync(browseLibraryFilePath)) {
      try {
        const content = await fs.promises.readFile(browseLibraryFilePath, 'utf-8');
        const cachedTracks = JSON.parse(content);
        if (Array.isArray(cachedTracks)) {
          for (const track of cachedTracks) {
            if (track && track.filePath) {
              if (track.coverArt && track.coverArt.startsWith('file:///')) {
                track.coverArt = track.coverArt.replace('file:///', 'media:///');
              }
              cacheMap.set(track.filePath, track);
            }
          }
        }
      } catch (cacheErr) {
        console.error('Failed to read browse library cache for incremental scanning:', cacheErr);
      }
    }

    const { parseFile } = await import('music-metadata');
    const audioFiles = getAudioFiles(destinationFolderPath);

    // Resolve Cache Directory
    let cacheDir = '';
    try {
      const { app } = await import('electron');
      cacheDir = path.join(app.getPath('userData'), 'ArtPreviews');
    } catch (e) {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      cacheDir = path.join(appData, 'northtracks', 'ArtPreviews');
    }

    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
    } catch (e) {
      console.error('Failed to create ArtPreviews directory:', e);
    }

    const folderImageCache = new Map<string, string | undefined>();

    const rawTracks = await limitConcurrency(audioFiles, 5, async (filePath) => {
      try {
        const stat = await fs.promises.stat(filePath);

        // If not forceRefresh, check if the file is unmodified in the cache
        if (!forceRefresh) {
          const cached = cacheMap.get(filePath);
          if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
            let imageExists = true;
            if (cached.coverArt && cached.coverArt.startsWith('media:///')) {
              const imgPath = getFilePathFromMediaUrl(cached.coverArt);
              if (imgPath && !fs.existsSync(imgPath)) {
                imageExists = false;
              }
            }
            if (imageExists) {
              return cached; // Return cached data directly!
            }
          }
        }

        const relative = path.relative(destinationFolderPath, filePath);
        const parts = relative.split(path.sep);
        const genreFolder = parts.length > 1 ? parts[0] : 'Unsorted';

        // Parse filename
        const filename = path.basename(filePath);
        const ext = path.extname(filename);
        const base = path.basename(filename, ext).trim();
        const nameParts = base.split(' - ').map(p => p.trim());
        let artist = 'Unknown Artist';
        let title = base;
        if (nameParts.length >= 3) {
          artist = nameParts[1];
          title = nameParts.slice(2).join(' - ');
        } else if (nameParts.length === 2) {
          artist = nameParts[0];
          title = nameParts[1];
        }

        // Read metadata
        let duration = 0;
        let coverArt: string | undefined = undefined;
        try {
          const metadata = await parseFile(filePath);
          duration = metadata.format.duration || 0;

          const pictures = metadata.common.picture;
          if (pictures && pictures.length > 0) {
            const pic = pictures[0];
            try {
              let format = pic.format || 'image/jpeg';
              if (!format.includes('/')) {
                format = `image/${format}`;
              }
              const ext = format.includes('png') ? '.png' : '.jpg';
              const hash = crypto.createHash('md5').update(filePath).digest('hex');
              const cacheImagePath = path.join(cacheDir, `${hash}${ext}`);

              if (!fs.existsSync(cacheImagePath)) {
                const buffer = Buffer.isBuffer(pic.data) ? pic.data : Buffer.from(pic.data as any);
                await fs.promises.writeFile(cacheImagePath, buffer);
              }
              coverArt = `media:///${cacheImagePath.replace(/\\/g, '/')}`;
            } catch (e) {
              console.error('Failed to save browse cover art to file:', e);
            }
          } else {
            const dir = path.dirname(filePath);
            let localImgPath = folderImageCache.get(dir);
            if (!folderImageCache.has(dir)) {
              localImgPath = findFolderImage(filePath);
              folderImageCache.set(dir, localImgPath);
            }
            if (localImgPath) {
              coverArt = `media:///${localImgPath.replace(/\\/g, '/')}`;
            }
          }
        } catch (e) {
          const dir = path.dirname(filePath);
          let localImgPath = folderImageCache.get(dir);
          if (!folderImageCache.has(dir)) {
            localImgPath = findFolderImage(filePath);
            folderImageCache.set(dir, localImgPath);
          }
          if (localImgPath) {
            coverArt = `media:///${localImgPath.replace(/\\/g, '/')}`;
          }
        }

        return {
          filePath,
          title,
          artist,
          genre: [genreFolder],
          duration,
          coverArt,
          mtime: stat.mtimeMs,
          size: stat.size
        };
      } catch (err) {
        console.error('Error processing browse track:', filePath, err);
        return {
          filePath,
          title: path.basename(filePath, path.extname(filePath)),
          artist: 'Unknown Artist',
          genre: ['Unsorted'],
          duration: 0,
          coverArt: undefined
        };
      }
    });

    const tracks = rawTracks.filter(Boolean);

    // Save scan to browse-library.json cache
    try {
      const dir = path.dirname(browseLibraryFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(browseLibraryFilePath, JSON.stringify(tracks, null, 2), 'utf-8');
    } catch (writeErr) {
      console.error('Failed to write browse library cache:', writeErr);
    }

    return tracks;
  } catch (err) {
    console.error('Failed to get genre folders:', err);
    throw err;
  }
});


function getFilePathFromMediaUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    let filePath = decodeURIComponent(url.pathname);
    if (process.platform === 'win32') {
      if (url.host && url.host.length === 1) {
        filePath = url.host + ':' + filePath;
      } else if (filePath.startsWith('/')) {
        filePath = filePath.slice(1);
      }
    }
    return filePath;
  } catch (e) {
    return '';
  }
}

app.whenReady().then(() => {
  // Register custom media protocol handler to serve local media files securely
  protocol.handle('media', (request) => {
    try {
      const filePath = getFilePathFromMediaUrl(request.url);
      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      const lowerPath = filePath.toLowerCase();
      let contentType = 'audio/mpeg';
      if (lowerPath.endsWith('.flac')) contentType = 'audio/flac';
      else if (lowerPath.endsWith('.wav')) contentType = 'audio/wav';
      else if (lowerPath.endsWith('.m4a') || lowerPath.endsWith('.mp4')) contentType = 'audio/mp4';
      else if (lowerPath.endsWith('.png')) contentType = 'image/png';
      else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (lowerPath.endsWith('.webp')) contentType = 'image/webp';

      const range = request.headers.get('range');
      if (range) {
        const stat = fs.statSync(filePath);
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });

        return new Response(file as any, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      const file = fs.createReadStream(filePath);
      const stat = fs.statSync(filePath);
      return new Response(file as any, {
        status: 200,
        headers: {
          'Content-Length': stat.size.toString(),
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (err) {
      console.error('Failed to handle media protocol request:', err);
      return new Response('File not found', { status: 404 });
    }
  });

  getSettings().then((settings) => {
    createWindow(settings);
  }).catch(() => {
    createWindow();
  });

  // Initialize Discord RPC on startup if enabled in settings
  getSettings().then((settings) => {
    if (settings.discordEnabled) {
      initializeDiscordRpc();
    }
  }).catch((err) => {
    console.error('Failed to auto-start Discord RPC:', err);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  shutdownDiscordRpc();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
