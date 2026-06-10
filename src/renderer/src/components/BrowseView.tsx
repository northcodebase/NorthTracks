import React, { useState } from 'react';
import { 
  Music2, 
  RefreshCw, 
  Search, 
  X, 
  Play, 
  Pause, 
  Clock, 
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  Heart
} from 'lucide-react';
import { Track } from './LibraryView';
import { ArtistLinks } from './ArtistLinks';

interface BrowseViewProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  loaded: boolean;
  setLoaded: (loaded: boolean) => void;
  onPlayTrack: (track: any, queue?: any[]) => void;
  currentlyPlayingPath: string | undefined;
  isPlaying: boolean;
  onTogglePlay: () => void;
  likedTracks: string[];
  onToggleLike: (filePath: string) => void;
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track) => void;
  onNavigateToArtist: (artistName: string) => void;
}

export const BrowseView: React.FC<BrowseViewProps> = ({
  tracks,
  setTracks,
  loaded,
  setLoaded,
  onPlayTrack,
  currentlyPlayingPath,
  isPlaying,
  onTogglePlay,
  likedTracks,
  onToggleLike,
  selectedGenre,
  setSelectedGenre,
  onTrackContextMenu,
  onNavigateToArtist,
}) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const loadTracks = async (forceRefresh = false) => {
    if (!window.electronAPI?.getGenreFolders) {
      showNotification('error', 'Browse API not available');
      return;
    }

    setLoading(true);
    showNotification('info', 'Loading destination music folder...');
    try {
      const result = await window.electronAPI.getGenreFolders(forceRefresh);
      setTracks(result || []);
      setLoaded(true);
      showNotification('success', `Successfully loaded ${result.length} tracks.`);
    } catch (err: any) {
      console.error('Failed to load browse music:', err);
      showNotification('error', `Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) {
    return (
      <div className="library-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="logo-icon" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '14px', fontWeight: 500 }}>Loading library metadata...</p>
        </div>
      </div>
    );
  }

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Get unique genres for filter chips
  const genres = ['All', ...Array.from(new Set(tracks.map(t => t.genre[0] || 'Unsorted'))).sort()];

  // Filter tracks by selected genre chip and search query
  const filteredTracks = tracks.filter(track => {
    const genreMatch = selectedGenre === 'All' || (track.genre[0] || 'Unsorted') === selectedGenre;
    const query = searchQuery.toLowerCase().trim();
    const searchMatch = !query || 
      track.title.toLowerCase().includes(query) || 
      track.artist.toLowerCase().includes(query);
    return genreMatch && searchMatch;
  });

  const handlePlayClick = (track: Track) => {
    if (track.filePath === currentlyPlayingPath) {
      onTogglePlay();
    } else {
      onPlayTrack(track, filteredTracks);
    }
  };

  return (
    <div className="library-view">
      {/* Top Toolbar */}
      <div className="library-toolbar">
        <div className="toolbar-left">
          <Music2 size={18} className="library-brand-icon" />
          <h2>Browse Music</h2>
        </div>
        <div className="toolbar-right" style={{ gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
          {/* Search bar inside the toolbar */}
          <div className="search-container" style={{ margin: 0, maxWidth: '280px', flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search music..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
          
          <button className="toolbar-btn" onClick={() => loadTracks(true)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'logo-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`notification-banner ${notification.type}`}>
          <div className="banner-content">
            {notification.type === 'success' && <CheckCircle size={16} />}
            {notification.type === 'error' && <AlertTriangle size={16} />}
            {notification.type === 'info' && <RefreshCw size={16} className="logo-icon" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Genre Filter Chips */}
      <div className="browse-chips-container">
        {genres.map(genre => (
          <button
            key={genre}
            className={`genre-chip ${selectedGenre === genre ? 'active' : ''}`}
            onClick={() => setSelectedGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Tracks Grid table */}
      <div className="table-container" style={{ flex: 1 }}>
        {tracks.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={48} className="empty-icon" />
            <h3>No Music in Destination Folder</h3>
            <p>Go to the <strong>Source Scan</strong> view to scan and copy music to your destination folder.</p>
            <button className="button-primary" style={{ marginTop: '12px' }} onClick={() => loadTracks(true)} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'logo-icon' : ''} />
              <span>Refresh Directory</span>
            </button>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="empty-state">
            <Search size={48} className="empty-icon" />
            <h3>No Matches Found</h3>
            <p>No tracks matching your current filters were found.</p>
          </div>
        ) : (
          <table className="tracks-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}></th>
                <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                <th>Title</th>
                <th>Genre Folder</th>
                <th style={{ width: '100px', textAlign: 'center' }}><Clock size={14} /></th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.map((track, idx) => {
                const isActive = track.filePath === currentlyPlayingPath;
                const isCurrentPlaying = isActive && isPlaying;

                const currentBasename = track.filePath.split(/[\\/]/).pop()?.toLowerCase();
                const isLiked = likedTracks.includes(track.filePath) || 
                  (!!currentBasename && likedTracks.some(p => p.split(/[\\/]/).pop()?.toLowerCase() === currentBasename));
                
                return (
                  <tr 
                    key={track.filePath} 
                    className={isActive ? 'playing-row' : ''}
                    onContextMenu={(e) => onTrackContextMenu?.(e, track)}
                  >
                    <td style={{ textAlign: 'center', width: '60px', padding: '6px' }}>
                      {track.coverArt && !failedImages[track.filePath] ? (
                        <img 
                          src={track.coverArt} 
                          alt="Cover" 
                          onError={() => {
                            setFailedImages(prev => ({ ...prev, [track.filePath]: true }));
                          }}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            display: 'block',
                            margin: '0 auto',
                            border: '1px solid var(--border-light)'
                          }}
                        />
                      ) : (
                        <div 
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            margin: '0 auto'
                          }}
                        >
                          <Music2 size={16} />
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td 
                      className="track-title-cell" 
                      title={track.filePath}
                      onClick={() => handlePlayClick(track)}
                    >
                      <div className="track-title-text">
                        {track.title.replace(/\s*[\(\[](feat|ft|featuring|with)\.?[^\)\]]*[\)\]]/gi, '').trim()}
                      </div>
                      <div className="track-artist-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 400 }}>
                        <ArtistLinks artist={track.artist} onNavigate={onNavigateToArtist} />
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {track.genre[0] || 'Unsorted'}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {formatTime(track.duration)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => onToggleLike(track.filePath)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title={isLiked ? "Unlike Track" : "Like Track"}
                        >
                          <Heart 
                            size={16} 
                            fill={isLiked ? "#a78bfa" : "none"} 
                            color={isLiked ? "#a78bfa" : "#6b7280"} 
                          />
                        </button>
                        <button
                          onClick={() => handlePlayClick(track)}
                          style={{
                            background: isCurrentPlaying ? 'var(--primary)' : 'transparent',
                            border: '1px solid var(--border-light)',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: isCurrentPlaying ? 'white' : 'var(--text-primary)',
                            transition: 'all 0.2s ease',
                            padding: 0
                          }}
                          title={isCurrentPlaying ? 'Pause' : 'Play'}
                          className="play-row-btn"
                        >
                          {isCurrentPlaying ? <Pause size={12} fill="white" /> : <Play size={12} style={{ marginLeft: '1px' }} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
