import { contextBridge, ipcRenderer } from 'electron';

// Synchronously bootstrap theme to prevent visual dark/light flashing on load
try {
  const theme = ipcRenderer.sendSync('get-theme-sync');
  document.documentElement.setAttribute('data-theme', theme || 'dark');
} catch (e) {
  console.error('Failed to bootstrap theme synchronously in preload:', e);
}

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  scanLibrary: (sourceFolder: string) => ipcRenderer.invoke('scan-library', sourceFolder),
  organizeLibrary: (tracks: any[]) => ipcRenderer.invoke('organize-library', tracks),
  reorganizeFolders: () => ipcRenderer.invoke('reorganize-folders'),
  getGenreFolders: (forceRefresh?: boolean) => ipcRenderer.invoke('get-genre-folders', forceRefresh),
  getThemeSync: () => ipcRenderer.sendSync('get-theme-sync'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  testDiscordRpc: (clientId: string) => ipcRenderer.invoke('test-discord-rpc', clientId),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getLikedTracks: () => ipcRenderer.invoke('get-liked-tracks'),
  saveLikedTracks: (likedTracks: string[]) => ipcRenderer.invoke('save-liked-tracks', likedTracks),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getLibrary: () => ipcRenderer.invoke('get-library'),
  saveLibrary: (tracks: any[]) => ipcRenderer.invoke('save-library', tracks),
  getActivities: () => ipcRenderer.invoke('get-activities'),
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  savePlaylists: (playlists: any[]) => ipcRenderer.invoke('save-playlists', playlists),
  deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
  playTrack: (filePath: string) => ipcRenderer.invoke('play-track', filePath),
  getLyrics: (filePath: string) => ipcRenderer.invoke('get-lyrics', filePath),
  onWindowStateChanged: (callback: (state: { isMaximized: boolean }) => void) => {
    const listener = (_event: any, state: { isMaximized: boolean }) => callback(state);
    ipcRenderer.on('window-state-changed', listener);
    return () => {
      ipcRenderer.removeListener('window-state-changed', listener);
    };
  },
  onOrganizeProgress: (callback: (progress: { current: number; total: number }) => void) => {
    const listener = (_event: any, progress: { current: number; total: number }) => callback(progress);
    ipcRenderer.on('organize-progress', listener);
    return () => {
      ipcRenderer.removeListener('organize-progress', listener);
    };
  },
  deleteSourceFiles: (filePaths: string[]) => ipcRenderer.invoke('delete-source-files', filePaths),
  clearLibraryCache: () => ipcRenderer.invoke('clear-library-cache'),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  deleteOrganizedMusic: () => ipcRenderer.invoke('delete-organized-music'),
  updatePlaybackState: (isPlaying: boolean, track?: { title: string; artist: string; album: string; coverArt?: string }) =>
    ipcRenderer.invoke('update-playback-state', isPlaying, track),
  onThumbarControl: (callback: (action: string) => void) => {
    const listener = (_event: any, action: string) => callback(action);
    ipcRenderer.on('thumbar-control', listener);
    return () => {
      ipcRenderer.removeListener('thumbar-control', listener);
    };
  },
  showInExplorer: (filePath: string) => ipcRenderer.invoke('show-in-explorer', filePath),
  applyVisualStyle: (style: 'solid' | 'acrylic' | 'glow') => ipcRenderer.invoke('apply-visual-style', style),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  onVisualStyleChanged: (callback: (style: string) => void) => {
    const listener = (_event: any, style: string) => callback(style);
    ipcRenderer.on('visual-style', listener);
    return () => {
      ipcRenderer.removeListener('visual-style', listener);
    };
  },
  writeTrackMetadata: (filePath: string, tags: object) => ipcRenderer.invoke('write-track-metadata', filePath, tags),
});
