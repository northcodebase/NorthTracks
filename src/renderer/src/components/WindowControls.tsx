import React, { useEffect, useState } from 'react';

interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  getWindowState: () => Promise<{ isMaximized: boolean }>;
  onWindowStateChanged: (callback: (state: { isMaximized: boolean }) => void) => () => void;
  restartApp: () => void;
  onUpdateStatus: (cb: (event: any, message: string) => void) => void;
  [key: string]: any;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const hasAPI = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (!hasAPI || !window.electronAPI) return;

    window.electronAPI.getWindowState().then((state) => {
      setIsMaximized(state.isMaximized);
    });

    const unsubscribe = window.electronAPI.onWindowStateChanged((state) => {
      setIsMaximized(state.isMaximized);
    });

    return () => {
      unsubscribe();
    };
  }, [hasAPI]);

  const handleMinimize = () => {
    if (hasAPI && window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (hasAPI && window.electronAPI?.maximizeWindow) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (hasAPI && window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  return (
    <div className="window-controls-container">
      <button className="window-control-btn minimize" onClick={handleMinimize}>
        {"\uE921"}
      </button>
      <button className="window-control-btn maximize" onClick={handleMaximize}>
        {isMaximized ? "\uE923" : "\uE922"}
      </button>
      <button className="window-control-btn close" onClick={handleClose}>
        {"\uE8BB"}
      </button>
    </div>
  );
};
