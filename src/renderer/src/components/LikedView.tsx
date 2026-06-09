import React, { useState } from 'react';
import { 
  Music2, 
  Search, 
  X, 
  Play, 
  Pause, 
  Clock, 
  Heart,
  ChevronLeft
} from 'lucide-react';
import { Track } from './LibraryView';

interface LikedViewProps {
  browseLibrary: Track[];
  likedTracks: string[];
  onToggleLike: (filePath: string) => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  currentlyPlayingPath: string | undefined;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onBack: () => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track) => void;
}

export const LikedView: React.FC<LikedViewProps> = ({
  browseLibrary,
  likedTracks,
  onToggleLike,
  onPlayTrack,
  currentlyPlayingPath,
  isPlaying,
  onTogglePlay,
  onBack,
  onTrackContextMenu
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Cross-reference likedTracks (stored file paths) with browseLibrary (tracks in destination folder)
  const likedSongs = browseLibrary.filter(track => {
    if (likedTracks.includes(track.filePath)) return true;
    const currentBasename = track.filePath.split(/[\\/]/).pop()?.toLowerCase();
    if (!currentBasename) return false;
    return likedTracks.some(p => p.split(/[\\/]/).pop()?.toLowerCase() === currentBasename);
  });

  // Filter by search query
  const filteredLikedSongs = likedSongs.filter(track => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query)
    );
  });

  const handlePlayClick = (track: Track) => {
    if (track.filePath === currentlyPlayingPath) {
      onTogglePlay();
    } else {
      onPlayTrack(track, filteredLikedSongs);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hasLikedSongs = likedSongs.length > 0;

  return (
    <div className="library-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Toolbar */}
      <div className="library-toolbar">
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            className="scroll-arrow-btn"
            title="Back to Library"
          >
            <ChevronLeft size={18} />
          </button>
          <Heart size={18} fill="#a78bfa" color="#a78bfa" className="library-brand-icon" />
          <h2>
            Liked Songs {hasLikedSongs && `· ${likedSongs.length} track${likedSongs.length === 1 ? '' : 's'}`}
          </h2>
        </div>
        {hasLikedSongs && (
          <div className="toolbar-right" style={{ gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
            <div className="search-container" style={{ margin: 0, maxWidth: '280px', flex: 1 }}>
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search liked songs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
        {!hasLikedSongs ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '350px', textAlign: 'center', padding: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(124, 92, 191, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              color: '#a78bfa',
              border: '1px solid rgba(124, 92, 191, 0.15)'
            }}>
              <Heart size={36} fill="#a78bfa" color="#a78bfa" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>No liked songs yet</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', lineHeight: '1.6' }}>
              Click the heart icon next to any track to save it here.
            </p>
          </div>
        ) : filteredLikedSongs.length === 0 ? (
          <div className="empty-state">
            <Search size={48} className="empty-icon" />
            <h3>No Matches Found</h3>
            <p>No tracks matching "{searchQuery}" were found in your Liked Songs.</p>
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
              {filteredLikedSongs.map((track, idx) => {
                const isActive = track.filePath === currentlyPlayingPath;
                const isCurrentPlaying = isActive && isPlaying;

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
                        {track.artist}
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
                          title="Unlike Track"
                        >
                          <Heart 
                            size={16} 
                            fill="#a78bfa" 
                            color="#a78bfa" 
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
