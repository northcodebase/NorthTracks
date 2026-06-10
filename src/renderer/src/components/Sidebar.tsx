import React, { useState, useEffect, useRef } from 'react';
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
  settingsCategory,
  setSettingsCategory,
}) => {
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem('northtracks-sidebar-width');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) {
        if (parsed <= 52) return 52;
        return Math.max(180, Math.min(280, parsed));
      }
    }
    return 220; // Default width
  });

  const [lastWidth, setLastWidth] = useState<number>(() => {
    const saved = localStorage.getItem('northtracks-sidebar-width');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 180 && parsed <= 280) return parsed;
    }
    return 220;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const widthRef = useRef<number>(width);
  const releaseXRef = useRef<number>(width);

  const updateWidth = (newWidth: number) => {
    widthRef.current = newWidth;
    setWidth(newWidth);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setTransitionEnabled(false);
    releaseXRef.current = widthRef.current;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      setTransitionEnabled(false);
      releaseXRef.current = widthRef.current;
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const clientX = e.clientX;
      const minWidth = 180;
      const maxWidth = 280;

      releaseXRef.current = clientX;
      const currentW = widthRef.current;

      if (clientX < minWidth) {
        if (currentW !== 52) {
          setTransitionEnabled(true);
          updateWidth(52);
          localStorage.setItem('northtracks-sidebar-width', '52');
        }
      } else {
        const targetWidth = Math.min(maxWidth, clientX);
        if (currentW === 52) {
          setTransitionEnabled(true);
          updateWidth(targetWidth);
          setLastWidth(targetWidth);
          localStorage.setItem('northtracks-sidebar-width', String(targetWidth));
        } else {
          setTransitionEnabled(false);
          updateWidth(targetWidth);
          setLastWidth(targetWidth);
          localStorage.setItem('northtracks-sidebar-width', String(targetWidth));
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const clientX = e.touches[0].clientX;
        const minWidth = 180;
        const maxWidth = 280;

        releaseXRef.current = clientX;
        const currentW = widthRef.current;

        if (clientX < minWidth) {
          if (currentW !== 52) {
            setTransitionEnabled(true);
            updateWidth(52);
            localStorage.setItem('northtracks-sidebar-width', '52');
          }
        } else {
          const targetWidth = Math.min(maxWidth, clientX);
          if (currentW === 52) {
            setTransitionEnabled(true);
            updateWidth(targetWidth);
            setLastWidth(targetWidth);
            localStorage.setItem('northtracks-sidebar-width', String(targetWidth));
          } else {
            setTransitionEnabled(false);
            updateWidth(targetWidth);
            setLastWidth(targetWidth);
            localStorage.setItem('northtracks-sidebar-width', String(targetWidth));
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setTransitionEnabled(true);
      const finalX = releaseXRef.current;
      if (finalX < 180) {
        updateWidth(52);
        localStorage.setItem('northtracks-sidebar-width', '52');
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setTransitionEnabled(true);
      const finalX = releaseXRef.current;
      if (finalX < 180) {
        updateWidth(52);
        localStorage.setItem('northtracks-sidebar-width', '52');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const toggleSidebar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTransitionEnabled(true);
    if (widthRef.current > 52) {
      updateWidth(52);
      localStorage.setItem('northtracks-sidebar-width', '52');
    } else {
      updateWidth(lastWidth);
      localStorage.setItem('northtracks-sidebar-width', String(lastWidth));
    }
  };

  const isSettingsActive = currentView === 'preferences' && settingsCategory !== null;

  const itemStyle = (isActive: boolean, isDanger = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: width > 52 ? 'flex-start' : 'center',
    padding: width > 52 ? '10px 12px' : '10px 0',
    borderRadius: '6px',
    color: isDanger
      ? '#e53e3e'
      : isActive
        ? 'var(--text-primary)'
        : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    width: '100%',
    boxSizing: 'border-box',
    borderLeft: width > 52 ? `2px solid ${isActive ? 'var(--primary)' : 'transparent'}` : 'none',
    borderTopLeftRadius: (isActive && width > 52) ? '2px' : '6px',
    borderBottomLeftRadius: (isActive && width > 52) ? '2px' : '6px',
  });

  const labelStyle: React.CSSProperties = {
    opacity: width > 52 ? 1 : 0,
    width: width > 52 ? 'auto' : '0px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    transition: 'opacity 200ms ease, width 200ms ease',
    marginLeft: width > 52 ? '12px' : '0px',
    display: 'inline-block',
  };

  return (
    <aside
      className={`sidebar ${width > 52 ? 'sidebar-expanded' : 'sidebar-collapsed'}`}
      style={{
        width: `${width}px`,
        transition: transitionEnabled ? 'width 200ms ease, padding 200ms ease' : 'none',
        position: 'relative',
        padding: width > 52 ? '16px 8px 0 8px' : '16px 4px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      {/* Drag Resize Handle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '4px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 1000,
          backgroundColor: isHandleHovered || isDragging ? 'var(--primary, #7c5cbf)' : 'transparent',
          opacity: isHandleHovered || isDragging ? 0.6 : 0,
          transition: 'background-color 0.2s ease, opacity 0.2s ease',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseEnter={() => setIsHandleHovered(true)}
        onMouseLeave={() => setIsHandleHovered(false)}
      />

      {/* Header containing App Icon and App Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: width > 52 ? 'flex-start' : 'center',
          gap: width > 52 ? '10px' : '0px',
          padding: width > 52 ? '4px 12px 12px 12px' : '4px 0 12px 0',
          overflow: 'hidden',
          height: '40px',
          flexShrink: 0,
          WebkitAppRegion: 'drag',
          width: '100%',
        } as React.CSSProperties}
      >
        <AppIcon size={22} />
        <span
          className="logo-text"
          style={{
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            textTransform: 'none',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            opacity: width > 52 ? 1 : 0,
            width: width > 52 ? 'auto' : '0px',
            overflow: 'hidden',
            transition: 'opacity 200ms ease, width 200ms ease',
            display: 'inline-block',
          }}
        >
          NorthTracks
        </span>
      </div>
      <div className="sidebar-divider" style={{ width: '100%' }} />

      {(isSettingsActive && width > 52) ? (
        <>
          {/* Back button row / section title */}
          <div
            style={itemStyle(false)}
            onClick={() => {
              onViewChange('home');
              setSettingsCategory(null);
            }}
            title="Back to Home"
          >
            <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
              <ChevronLeft size={16} />
            </div>
            <span style={labelStyle} className="sidebar-label">Preferences</span>
          </div>

          <div className="sidebar-divider" />

          {/* Preferences Categories */}
          <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={itemStyle(settingsCategory === 'directories')}
              onClick={() => setSettingsCategory('directories')}
              title=""
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <FolderOpen size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Directories</span>
            </div>

            <div
              style={itemStyle(settingsCategory === 'playback')}
              onClick={() => setSettingsCategory('playback')}
              title=""
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Music2 size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Playback</span>
            </div>

            <div
              style={itemStyle(settingsCategory === 'integrations')}
              onClick={() => setSettingsCategory('integrations')}
              title=""
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Plug size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Integrations</span>
            </div>

            <div
              style={itemStyle(settingsCategory === 'appearance')}
              onClick={() => setSettingsCategory('appearance')}
              title=""
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Palette size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Appearance</span>
            </div>

            <div
              style={itemStyle(settingsCategory === 'library')}
              onClick={() => setSettingsCategory('library')}
              title=""
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Library size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Library</span>
            </div>

            <div
              style={itemStyle(settingsCategory === 'danger', true)}
              onClick={() => setSettingsCategory('danger')}
              title=""
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <AlertTriangle size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Danger Zone</span>
            </div>
          </nav>
        </>
      ) : (
        <>
          {/* Main Navigation Items (Top Section - Block 1) */}
          <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={itemStyle(currentView === 'home')}
              onClick={() => onViewChange('home')}
              title={width <= 52 ? "Home" : ""}
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Home size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Home</span>
            </div>

            <div
              style={itemStyle(currentView === 'explore')}
              onClick={() => onViewChange('explore')}
              title={width <= 52 ? "Explore" : ""}
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Compass size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Explore</span>
            </div>

            <div
              style={itemStyle(currentView === 'library')}
              onClick={() => onViewChange('library')}
              title={width <= 52 ? "Library" : ""}
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Library size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Library</span>
            </div>
          </nav>

          <div className="sidebar-divider" style={{ width: '100%' }} />

          {/* Music Library Sections (Middle Section - Block 2) */}
          <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={itemStyle(currentView === 'playlists')}
              onClick={() => onViewChange('playlists')}
              title={width <= 52 ? "Playlists" : ""}
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <ListMusic size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Playlists</span>
            </div>

            <div
              style={itemStyle(currentView === 'liked')}
              onClick={() => onViewChange('liked')}
              title={width <= 52 ? "Liked Songs" : ""}
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px', position: 'relative' }}>
                <Heart size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Liked Songs</span>
            </div>
          </nav>
        </>
      )}

      {/* Spacer to push management items down */}
      <div style={{ flex: 1 }} />

      <div className="sidebar-bottom" style={{ width: '100%' }}>
        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          title={width <= 52 ? "Expand" : "Collapse"}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: width > 52 ? 'flex-start' : 'center',
            padding: width > 52 ? '8px 16px' : '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: '8px',
            width: width > 52 ? '100%' : '36px',
            margin: width > 52 ? '0' : '0 auto',
            gap: width > 52 ? '12px' : '0px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          className="sidebar-toggle-btn"
        >
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
            {width > 52 ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </div>
          <span style={labelStyle} className="sidebar-label">Collapse</span>
        </button>

        <div className="sidebar-divider" style={{ width: '100%' }} />

        {(!isSettingsActive || width <= 52) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            {/* Import & Scan */}
            <div
              style={itemStyle(currentView === 'catalog')}
              onClick={() => onViewChange('catalog')}
              title={width <= 52 ? "Import & Scan" : ""}
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <FolderInput size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Import & Scan</span>
            </div>

            {/* Preferences */}
            <div
              style={itemStyle(currentView === 'preferences')}
              onClick={() => onViewChange('preferences')}
              title={width <= 52 ? "Preferences" : ""}
            >
              <div className="sidebar-icon-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Settings size={20} />
              </div>
              <span style={labelStyle} className="sidebar-label">Preferences</span>
            </div>
          </div>
        )}

        {/* Sidebar Footer containing version and theme toggle */}
        {width > 52 && (
          <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--sidebar-footer-border)' }}>
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
        )}
      </div>
    </aside>
  );
};
