import React, { useEffect, useState, useRef } from 'react';
import { Home, Search, X, Music2 } from 'lucide-react';
import { Track } from './LibraryView';
import { WindowControls } from './WindowControls';

interface TitlebarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  libraryTracks: Track[];
  onPlayTrack: (track: Track) => void;
  onNavigateHome: () => void;
}

/** Reads the current theme from the root element's data-theme attribute. */
function getIsDark(): boolean {
  const theme = document.documentElement.getAttribute('data-theme');
  // Treat missing attribute (default) as dark since :root defaults are dark.
  return theme !== 'light';
}

export const Titlebar: React.FC<TitlebarProps> = ({
  searchQuery,
  onSearch,
  libraryTracks,
  onPlayTrack,
  onNavigateHome,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Track[]>([]);
  const [isDark, setIsDark] = useState<boolean>(getIsDark);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track theme changes via MutationObserver on <html data-theme>
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(getIsDark());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  // Track scroll position of the main scroll container (.app-content or .content-area)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && typeof target.scrollTop === 'number') {
        const classes = target.classList;
        if (
          classes &&
          (classes.contains('app-content') ||
            classes.contains('scrollable') ||
            classes.contains('library-view') ||
            classes.contains('content-area'))
        ) {
          setIsScrolled(target.scrollTop > 0);
        }
      }
    };

    // Listen to all scroll events during the capture phase
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('northtracks-recent-searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load recent searches:', err);
    }
  }, []);

  // Save a track to recent searches
  const saveToRecentSearches = (track: Track) => {
    let updated = [track, ...recentSearches.filter((t) => t.filePath !== track.filePath)];
    if (updated.length > 8) {
      updated = updated.slice(0, 8);
    }
    setRecentSearches(updated);
    try {
      localStorage.setItem('northtracks-recent-searches', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save recent searches:', err);
    }
  };

  // Clear recent searches
  const handleClearRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('northtracks-recent-searches');
    } catch (err) {
      console.error('Failed to clear recent searches:', err);
    }
  };

  // Keyboard shortcut Ctrl+L / Cmd+L to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsDropdownOpen(true);
      } else if (e.key === 'Escape') {
        inputRef.current?.blur();
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Filter tracks based on search query
  const getFilteredTracks = () => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return libraryTracks.filter((track) => {
      const title = (track.title || '').toLowerCase();
      const artist = (track.artist || '').toLowerCase();
      const album = (track.album || '').toLowerCase();
      const genre = (track.genre || []).join(' ').toLowerCase();

      return (
        title.includes(q) ||
        artist.includes(q) ||
        album.includes(q) ||
        genre.includes(q)
      );
    });
  };

  const filteredTracks = getFilteredTracks();

  // Play track and save to recents
  const handleSelectTrack = (track: Track) => {
    onPlayTrack(track);
    saveToRecentSearches(track);
    setIsDropdownOpen(false);
  };

  // ─── Transparent Glassmorphism styles (theme-aware, applied inline) ───────
  const headerStyle = {
    height: '62px', // visually aligns with the sidebar divider/option break (16px padding-top + 40px logo height + 6px margin-top = 62px)
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    position: 'relative',
    padding: '0 16px',
    width: '100%',
    WebkitAppRegion: 'drag',
    flexShrink: 0,
    zIndex: 50,
    transition: 'background-color 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease, box-shadow 0.25s ease',
    
    // When scrolled, apply subtle glassmorphism background and bottom border.
    // Otherwise, keep it fully transparent and borderless.
    backgroundColor: isScrolled
      ? (isDark ? 'rgba(15, 15, 15, 0.75)' : 'rgba(245, 245, 245, 0.75)')
      : 'transparent',
    borderBottom: isScrolled
      ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)')
      : '1px solid transparent',
    backdropFilter: isScrolled ? 'blur(12px)' : 'none',
    WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
    boxShadow: isScrolled
      ? (isDark ? '0 4px 20px rgba(0, 0, 0, 0.15)' : '0 4px 20px rgba(0, 0, 0, 0.03)')
      : 'none',
  } as React.CSSProperties;
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <header className="titlebar" style={headerStyle}>
      {/* Home navigation button */}
      <button
        className="titlebar-home-btn"
        onClick={onNavigateHome}
        title="Go to Home"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        <Home size={22} />
      </button>

      {/* Central Search pill container */}
      <div className="titlebar-search-wrapper" ref={searchContainerRef}>
        <div 
          className="titlebar-search-container"
          style={{
            border: 'none',
            backgroundColor: isFocused
              ? (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)')
              : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
            height: '36px',
            borderRadius: '18px',
            boxShadow: isFocused
              ? `0 0 0 2px ${isDark ? 'rgba(124, 92, 191, 0.4)' : 'rgba(124, 92, 191, 0.2)'}`
              : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Search className="titlebar-search-icon" size={14} />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            className="titlebar-search-input"
            placeholder="What do you want to play?"
            value={searchQuery}
            onFocus={() => {
              setIsDropdownOpen(true);
              setIsFocused(true);
            }}
            onBlur={() => {
              setIsFocused(false);
            }}
            onChange={(e) => {
              onSearch(e.target.value);
              setIsDropdownOpen(true);
            }}
          />
          {searchQuery ? (
            <button
              className="titlebar-search-clear-btn"
              onClick={() => {
                onSearch('');
                inputRef.current?.focus();
              }}
              title="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <div className="titlebar-shortcut-hint">
              <kbd>Ctrl</kbd> <kbd>L</kbd>
            </div>
          )}
        </div>

        {/* Dropdown search panel */}
        {isDropdownOpen && (
          <div className="titlebar-search-dropdown" ref={dropdownRef}>
            {!searchQuery.trim() ? (
              // Recent Searches list
              <div className="dropdown-section">
                <div className="dropdown-section-header">Recent Searches</div>
                {recentSearches.length === 0 ? (
                  <div className="dropdown-empty-state">No recent searches</div>
                ) : (
                  <>
                    <div className="dropdown-list">
                      {recentSearches.map((track) => (
                        <div
                          key={`recent-${track.filePath}`}
                          className="dropdown-row"
                          onClick={() => handleSelectTrack(track)}
                        >
                          <div className="dropdown-row-cover">
                            {track.coverArt ? (
                              <img src={track.coverArt} alt="" />
                            ) : (
                              <Music2 size={16} />
                            )}
                          </div>
                          <div className="dropdown-row-meta">
                            <span className="dropdown-row-title">{track.title || 'Unknown Title'}</span>
                            <span className="dropdown-row-subtitle">
                              {track.artist || 'Unknown Artist'}
                            </span>
                          </div>
                          <span className="dropdown-row-type">
                            Song • {track.artist || 'Artist'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="dropdown-clear-btn"
                      onClick={handleClearRecent}
                    >
                      Clear recent searches
                    </button>
                  </>
                )}
              </div>
            ) : (
              // Live Search results
              <div className="dropdown-section">
                <div className="dropdown-section-header">Search Results</div>
                {filteredTracks.length === 0 ? (
                  <div className="dropdown-empty-state">No results found for "{searchQuery}"</div>
                ) : (
                  <div className="dropdown-list scrollable">
                    {filteredTracks.slice(0, 15).map((track) => (
                      <div
                        key={`result-${track.filePath}`}
                        className="dropdown-row"
                        onClick={() => handleSelectTrack(track)}
                      >
                        <div className="dropdown-row-cover">
                          {track.coverArt ? (
                            <img src={track.coverArt} alt="" />
                          ) : (
                            <Music2 size={16} />
                          )}
                        </div>
                        <div className="dropdown-row-meta">
                          <span className="dropdown-row-title">{track.title || 'Unknown Title'}</span>
                          <span className="dropdown-row-subtitle">
                            {track.artist || 'Unknown Artist'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Window controls — positioned at top-right via CSS (.window-controls-container) */}
      <WindowControls />
    </header>
  );
};
