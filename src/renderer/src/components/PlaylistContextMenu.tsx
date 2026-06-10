import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { Play, Pencil, Trash2 } from 'lucide-react';

export interface PlaylistContextMenuProps {
  x: number;
  y: number;
  playlistId: string;
  playlistName: string;
  isCustom: boolean;
  onClose: () => void;
  onPlay: () => void;
  onRename: () => void;
  onDelete?: () => void;
}

export const PlaylistContextMenu: React.FC<PlaylistContextMenuProps> = ({
  x,
  y,
  isCustom,
  onClose,
  onPlay,
  onRename,
  onDelete
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x, y });

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menuWidth = rect.width || 180;
      const menuHeight = rect.height || 120;

      let nextX = x;
      let nextY = y;

      if (x + menuWidth > window.innerWidth) {
        nextX = window.innerWidth - menuWidth - 8;
      }
      if (nextX < 8) nextX = 8;

      if (y + menuHeight > window.innerHeight) {
        nextY = window.innerHeight - menuHeight - 8;
      }
      if (nextY < 8) nextY = 8;

      setCoords({ x: nextX, y: nextY });
    }
  }, [x, y]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAction = (cb: () => void) => {
    cb();
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="custom-context-menu"
      style={{ top: coords.y, left: coords.x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="context-menu-item" onClick={() => handleAction(onPlay)}>
        <span className="context-menu-item-icon"><Play size={16} /></span>
        <span className="context-menu-item-label">Play</span>
      </div>
      <div className="context-menu-item" onClick={() => handleAction(onRename)}>
        <span className="context-menu-item-icon"><Pencil size={16} /></span>
        <span className="context-menu-item-label">Rename</span>
      </div>
      {isCustom && onDelete && (
        <>
          <div className="context-menu-divider" />
          <div 
            className="context-menu-item" 
            style={{ color: '#ef4444' }} 
            onClick={() => handleAction(onDelete)}
          >
            <span className="context-menu-item-icon" style={{ color: '#ef4444' }}><Trash2 size={16} /></span>
            <span className="context-menu-item-label">Delete Playlist</span>
          </div>
        </>
      )}
    </div>
  );
};
