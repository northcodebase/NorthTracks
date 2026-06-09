import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Search } from 'lucide-react';

// Define the interface for the exposed Electron APIs
interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getWindowState: () => Promise<{ isMaximized: boolean }>;
  onWindowStateChanged: (callback: (state: { isMaximized: boolean }) => void) => () => void;
  scanLibrary: (sourceFolder: string) => Promise<any[]>;
  organizeLibrary: (tracks: any[]) => Promise<any>;
  reorganizeFolders: () => Promise<{ filesMoved: number; foldersRenamed: number }>;
  getGenreFolders: (forceRefresh?: boolean) => Promise<any[]>;
  getThemeSync: () => string;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<any>;
  testDiscordRpc: (clientId: string) => Promise<{ success: boolean; message: string }>;
  openExternal: (url: string) => Promise<boolean>;
  getLikedTracks: () => Promise<string[]>;
  saveLikedTracks: (likedTracks: string[]) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  getLibrary: () => Promise<any[]>;
  saveLibrary: (tracks: any[]) => Promise<boolean>;
  getActivities: () => Promise<any[]>;
  getPlaylists: () => Promise<any[]>;
  savePlaylists: (playlists: any[]) => Promise<boolean>;
  deleteFile: (filePath: string) => Promise<boolean>;
  playTrack: (filePath: string) => Promise<string>;
  getLyrics: (filePath: string) => Promise<{ type: string; lyrics: string }>;
  onOrganizeProgress: (callback: (progress: { current: number; total: number }) => void) => () => void;
  deleteSourceFiles: (filePaths: string[]) => Promise<{ deleted: number; failed: number; errors: string[] }>;
  clearLibraryCache: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  deleteOrganizedMusic: () => Promise<boolean>;
  updatePlaybackState: (isPlaying: boolean, track?: { title: string; artist: string; album: string; coverArt?: string }) => Promise<boolean>;
  onThumbarControl: (callback: (action: string) => void) => () => void;
  showInExplorer: (filePath: string) => Promise<boolean>;
  applyVisualStyle: (style: 'solid' | 'acrylic' | 'glow') => Promise<boolean>;
  getSystemInfo: () => Promise<{ isWin11: boolean }>;
  onVisualStyleChanged: (callback: (style: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

interface TitlebarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({ searchQuery, onSearch }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const hasAPI = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (!hasAPI || !window.electronAPI) return;

    // Get initial state
    window.electronAPI.getWindowState().then((state) => {
      setIsMaximized(state.isMaximized);
    });

    // Listen to window state changes
    const unsubscribe = window.electronAPI.onWindowStateChanged((state) => {
      setIsMaximized(state.isMaximized);
    });

    return () => {
      unsubscribe();
    };
  }, [hasAPI]);

  const handleMinimize = () => {
    if (hasAPI && window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (hasAPI && window.electronAPI) {
      window.electronAPI.maximize();
    }
  };

  const handleClose = () => {
    if (hasAPI && window.electronAPI) {
      window.electronAPI.close();
    }
  };

  return (
    <header className="titlebar">
      {/* Absolute positioned drag region behind everything else */}
      <div className="titlebar-drag-region"></div>

      {/* Centered Search Bar */}
      <div className="titlebar-search-container" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Search className="titlebar-search-icon" size={14} />
        <input
          id="global-search-input"
          type="text"
          className="titlebar-search-input"
          placeholder="Search songs, artists, genres..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="titlebar-search-clear-btn" 
            onClick={() => onSearch('')}
            title="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div style={{ flex: 1 }}></div>

      <div className="titlebar-controls" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button className="control-btn minimize" onClick={handleMinimize} title="Minimize">
          <Minus size={14} />
        </button>
        <button className="control-btn maximize" onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
          <Square size={14} />
        </button>
        <button className="control-btn close" onClick={handleClose} title="Close">
          <X size={14} />
        </button>
      </div>
    </header>
  );
};
