import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { 
  Play, 
  ListStart, 
  ListPlus, 
  FolderPlus, 
  Heart, 
  FolderOpen, 
  Copy, 
  Tag, 
  Info,
  Plus
} from 'lucide-react';
import { Track } from './LibraryView';

export interface ContextMenuProps {
  x: number;
  y: number;
  track: Track;
  isLiked: boolean;
  playlists: any[];
  onClose: () => void;
  onPlayNow: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onToggleLike: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onCreatePlaylistWithTrack: () => void;
  onShowInExplorer: () => void;
  onCopyPath: () => void;
  onEditGenre: () => void;
  onShowInfo: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isLiked,
  playlists,
  onClose,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onToggleLike,
  onAddToPlaylist,
  onCreatePlaylistWithTrack,
  onShowInExplorer,
  onCopyPath,
  onEditGenre,
  onShowInfo,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x, y });

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menuWidth = rect.width || 220;
      const menuHeight = rect.height || 280;

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

  // Determine if submenu should open to the left of the main menu
  // Main menu width is 220px, Submenu width is 200px
  const submenuOnLeft = coords.x + 220 + 200 > window.innerWidth;

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
      {/* Group 1: Playback */}
      <div className="context-menu-item" onClick={() => handleAction(onPlayNow)}>
        <span className="context-menu-item-icon"><Play size={16} /></span>
        <span className="context-menu-item-label">Play Now</span>
        <span className="context-menu-item-shortcut">Enter</span>
      </div>
      <div className="context-menu-item" onClick={() => handleAction(onPlayNext)}>
        <span className="context-menu-item-icon"><ListStart size={16} /></span>
        <span className="context-menu-item-label">Play Next</span>
      </div>
      <div className="context-menu-item" onClick={() => handleAction(onAddToQueue)}>
        <span className="context-menu-item-icon"><ListPlus size={16} /></span>
        <span className="context-menu-item-label">Add to Queue</span>
        <span className="context-menu-item-shortcut">Q</span>
      </div>

      <div className="context-menu-divider" />

      {/* Group 2: Playlists */}
      <div className="context-menu-item has-submenu">
        <span className="context-menu-item-icon"><FolderPlus size={16} /></span>
        <span className="context-menu-item-label">Add to Playlist</span>
        
        {/* Playlists Submenu */}
        <div 
          className="context-submenu"
          style={submenuOnLeft ? { right: '100%', left: 'auto', marginRight: '4px' } : { left: '100%', right: 'auto', marginLeft: '4px' }}
        >
          <div className="context-submenu-list">
            {playlists.map((pl) => (
              <div 
                key={pl.id} 
                className="context-menu-item"
                onClick={() => handleAction(() => onAddToPlaylist(pl.id))}
              >
                <span className="context-menu-item-icon"><Plus size={14} /></span>
                <span className="context-menu-item-label">{pl.name}</span>
              </div>
            ))}
            {playlists.length > 0 && <div className="context-menu-divider" />}
            <div 
              className="context-menu-item"
              onClick={() => handleAction(onCreatePlaylistWithTrack)}
            >
              <span className="context-menu-item-icon"><Plus size={14} /></span>
              <span className="context-menu-item-label" style={{ fontWeight: 500 }}>+ New Playlist</span>
            </div>
          </div>
        </div>
      </div>

      <div className="context-menu-item" onClick={() => handleAction(onToggleLike)}>
        <span className="context-menu-item-icon">
          <Heart size={16} fill={isLiked ? "#a78bfa" : "none"} color={isLiked ? "#a78bfa" : "currentColor"} />
        </span>
        <span className="context-menu-item-label">
          {isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
        </span>
        <span className="context-menu-item-shortcut">L</span>
      </div>

      <div className="context-menu-divider" />

      {/* Group 3: File actions */}
      <div className="context-menu-item" onClick={() => handleAction(onShowInExplorer)}>
        <span className="context-menu-item-icon"><FolderOpen size={16} /></span>
        <span className="context-menu-item-label">Show in File Explorer</span>
      </div>
      <div className="context-menu-item" onClick={() => handleAction(onCopyPath)}>
        <span className="context-menu-item-icon"><Copy size={16} /></span>
        <span className="context-menu-item-label">Copy File Path</span>
      </div>
      <div className="context-menu-item" onClick={() => handleAction(onEditGenre)}>
        <span className="context-menu-item-icon"><Tag size={16} /></span>
        <span className="context-menu-item-label">Edit Genre</span>
        <span className="context-menu-item-shortcut">E</span>
      </div>

      <div className="context-menu-divider" />

      {/* Group 4: Info */}
      <div className="context-menu-item" onClick={() => handleAction(onShowInfo)}>
        <span className="context-menu-item-icon"><Info size={16} /></span>
        <span className="context-menu-item-label">Track Info</span>
        <span className="context-menu-item-shortcut">I</span>
      </div>
    </div>
  );
};
