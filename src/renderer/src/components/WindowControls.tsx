import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getWindowState: () => Promise<{ isMaximized: boolean }>;
  onWindowStateChanged: (callback: (state: { isMaximized: boolean }) => void) => () => void;
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
    <div className="window-controls-container">
      <button className="window-control-btn minimize" onClick={handleMinimize} title="Minimize">
        <Minus size={14} />
      </button>
      <button className="window-control-btn maximize" onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
        <Square size={14} />
      </button>
      <button className="window-control-btn close" onClick={handleClose} title="Close">
        <X size={14} />
      </button>
    </div>
  );
};
