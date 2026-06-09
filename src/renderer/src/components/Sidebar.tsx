import React, { useState } from 'react';
import { AppIcon } from './AppIcon';
import { 
  Home, 
  Compass, 
  Library, 
  FolderInput, 
  Settings, 
  Sun, 
  Moon, 
  Heart, 
  ListMusic,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  FolderOpen,
  Music2,
  Plug,
  Palette,
  AlertTriangle
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  likedTracksCount: number;
  customPlaylists: any[];
  settingsCategory: string | null;
  setSettingsCategory: (category: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  theme,
  onToggleTheme,
  likedTracksCount,
  settingsCategory,
  setSettingsCategory,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return localStorage.getItem('sidebar-expanded') !== 'false';
  });

  const toggleSidebar = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem('sidebar-expanded', String(next));
  };

  const isSettingsActive = currentView === 'preferences' && settingsCategory !== null;

  return (
    <aside className={`sidebar ${isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 12px 12px 12px', overflow: 'hidden', height: '40px', flexShrink: 0, WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <AppIcon size={22} />
        {isExpanded && (
          <span className="logo-text" style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'none', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            NorthTracks
          </span>
        )}
      </div>
      <div className="sidebar-divider" />

      {isSettingsActive ? (
        <>
          {/* Back button row / section title */}
          <div 
            className="sidebar-item"
            onClick={() => {
              onViewChange('home');
              setSettingsCategory(null);
            }}
            title="Back to Home"
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div className="sidebar-icon-wrapper">
              <ChevronLeft size={16} />
            </div>
            <span className="sidebar-label" style={{ fontSize: '13px', fontWeight: 500 }}>Preferences</span>
          </div>

          <div className="sidebar-divider" />

          {/* Preferences Categories */}
          <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div 
              className={`sidebar-item sidebar-nav-item ${settingsCategory === 'directories' ? 'active' : ''}`}
              onClick={() => setSettingsCategory('directories')}
              title="Directories"
            >
              <div className="sidebar-icon-wrapper">
                <FolderOpen size={20} />
              </div>
              <span className="sidebar-label">Directories</span>
            </div>

            <div 
              className={`sidebar-item sidebar-nav-item ${settingsCategory === 'playback' ? 'active' : ''}`}
              onClick={() => setSettingsCategory('playback')}
              title="Playback"
            >
              <div className="sidebar-icon-wrapper">
                <Music2 size={20} />
              </div>
              <span className="sidebar-label">Playback</span>
            </div>

            <div 
              className={`sidebar-item sidebar-nav-item ${settingsCategory === 'integrations' ? 'active' : ''}`}
              onClick={() => setSettingsCategory('integrations')}
              title="Integrations"
            >
              <div className="sidebar-icon-wrapper">
                <Plug size={20} />
              </div>
              <span className="sidebar-label">Integrations</span>
            </div>

            <div 
              className={`sidebar-item sidebar-nav-item ${settingsCategory === 'appearance' ? 'active' : ''}`}
              onClick={() => setSettingsCategory('appearance')}
              title="Appearance"
            >
              <div className="sidebar-icon-wrapper">
                <Palette size={20} />
              </div>
              <span className="sidebar-label">Appearance</span>
            </div>

            <div 
              className={`sidebar-item sidebar-nav-item ${settingsCategory === 'library' ? 'active' : ''}`}
              onClick={() => setSettingsCategory('library')}
              title="Library"
            >
              <div className="sidebar-icon-wrapper">
                <Library size={20} />
              </div>
              <span className="sidebar-label">Library</span>
            </div>

            <div 
              className={`sidebar-item sidebar-nav-item danger-item ${settingsCategory === 'danger' ? 'active' : ''}`}
              onClick={() => setSettingsCategory('danger')}
              title="Danger Zone"
              style={{ color: '#e53e3e' }}
            >
              <div className="sidebar-icon-wrapper" style={{ color: '#e53e3e' }}>
                <AlertTriangle size={20} />
              </div>
              <span className="sidebar-label" style={{ color: '#e53e3e' }}>Danger Zone</span>
            </div>
          </nav>
        </>
      ) : (
        <>
          {/* Main Navigation Items (Top Section - Block 1) */}
          <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div 
              className={`sidebar-item sidebar-nav-item ${currentView === 'home' ? 'active' : ''}`}
              onClick={() => onViewChange('home')}
              title="Home"
            >
              <div className="sidebar-icon-wrapper">
                <Home size={20} />
              </div>
              <span className="sidebar-label">Home</span>
            </div>

            <div 
              className={`sidebar-item sidebar-nav-item ${currentView === 'explore' ? 'active' : ''}`}
              onClick={() => onViewChange('explore')}
              title="Explore"
            >
              <div className="sidebar-icon-wrapper">
                <Compass size={20} />
              </div>
              <span className="sidebar-label">Explore</span>
            </div>

            <div 
              className={`sidebar-item sidebar-nav-item ${currentView === 'library' ? 'active' : ''}`}
              onClick={() => onViewChange('library')}
              title="Library"
            >
              <div className="sidebar-icon-wrapper">
                <Library size={20} />
              </div>
              <span className="sidebar-label">Library</span>
            </div>
          </nav>

          <div className="sidebar-divider" />

          {/* Music Library Sections (Middle Section - Block 2) */}
          <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div 
              className={`sidebar-item sidebar-nav-item ${currentView === 'playlists' ? 'active' : ''}`}
              onClick={() => onViewChange('playlists')}
              title="Playlists"
            >
              <div className="sidebar-icon-wrapper">
                <ListMusic size={20} />
              </div>
              <span className="sidebar-label">Playlists</span>
            </div>

            <div 
              className={`sidebar-item sidebar-nav-item ${currentView === 'liked' ? 'active' : ''}`}
              onClick={() => onViewChange('liked')}
              title="Liked Songs"
            >
              <div className="sidebar-icon-wrapper" style={{ position: 'relative' }}>
                <Heart size={20} />
                {likedTracksCount > 0 && (
                  <span className="sidebar-liked-badge">
                    {likedTracksCount}
                  </span>
                )}
              </div>
              <span className="sidebar-label">Liked Songs</span>
            </div>
          </nav>
        </>
      )}

      {/* Spacer to push management items down */}
      <div style={{ flex: 1 }} />

      <div className="sidebar-bottom">
        {/* Toggle button lives here now */}
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded 
            ? <PanelLeftClose size={18} /> 
            : <PanelLeftOpen size={18} />
          }
          {isExpanded && (
            <span className="sidebar-label">Collapse</span>
          )}
        </button>

        <div className="sidebar-divider" />

        {!isSettingsActive && (
          <>
            {/* Import & Scan */}
            <div 
              className={`sidebar-item sidebar-nav-item ${currentView === 'catalog' ? 'active' : ''}`}
              onClick={() => onViewChange('catalog')}
              title="Import & Scan"
            >
              <div className="sidebar-icon-wrapper">
                <FolderInput size={20} />
              </div>
              <span className="sidebar-label">Import & Scan</span>
            </div>

            {/* Preferences */}
            <div 
              className={`sidebar-item sidebar-nav-item ${currentView === 'preferences' ? 'active' : ''}`}
              onClick={() => onViewChange('preferences')}
              title="Preferences"
            >
              <div className="sidebar-icon-wrapper">
                <Settings size={20} />
              </div>
              <span className="sidebar-label">Preferences</span>
            </div>
          </>
        )}

        {/* Sidebar Footer containing version and theme toggle */}
        <div className="sidebar-footer">
          <span className="sidebar-label sidebar-footer-version" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            v1.0.0
          </span>
          <button
            className={`theme-toggle-pill ${theme}`}
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div className="theme-toggle-circle">
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};
