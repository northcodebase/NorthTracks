import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, Heart, Music2, Clock, MoreVertical, Shuffle } from 'lucide-react';
import { Track } from './ExploreView';

interface GenreViewProps {
  genre: string;
  tracks: Track[];
  onBack: () => void;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onToggleLike: (filePath: string) => void;
  likedTracks: string[];
  currentlyPlayingPath: string | undefined;
  isPlaying: boolean;
  onEditTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track) => void;
}

export const GenreView: React.FC<GenreViewProps> = ({
  genre,
  tracks,
  onBack,
  onPlayTrack,
  onToggleLike,
  likedTracks,
  currentlyPlayingPath,
  onEditTrack,
  onAddToQueue,
  onTrackContextMenu
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const closeAll = () => setActiveDropdown(null);
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

  const firstTrackCover = tracks.find((t) => t.coverArt)?.coverArt;

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayClick = (track: Track) => {
    onPlayTrack(track, tracks);
  };

  const handleShare = (track: Track) => {
    navigator.clipboard.writeText(track.filePath);
    alert(`File path copied to clipboard: ${track.filePath}`);
  };

  return (
    <div className="content-area fade-in" style={{ padding: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Redesigned 240px tall hero header */}
      <div
        className="genre-header"
        style={{
          position: 'relative',
          height: '240px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '24px 32px',
          flexShrink: 0,
        }}
      >
        {/* Blurred background cover image */}
        {firstTrackCover ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${firstTrackCover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(20px) brightness(0.5)',
              zIndex: 1,
              transform: 'scale(1.1)'
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'var(--primary)',
              filter: 'brightness(0.5)',
              zIndex: 1
            }}
          />
        )}

        {/* Dark overlay gradient & Vignette */}
        <div
          className="genre-header-vignette"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.6) 80%), linear-gradient(to top, var(--bg-main) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)',
            zIndex: 2
          }}
        />

        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            color: 'white',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 3,
            transition: 'background 0.2s',
          }}
          className="back-btn"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Header content */}
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.1 }}>
            {genre}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
              {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => tracks.length > 0 && onPlayTrack(tracks[0], tracks)}
                className="genre-play-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '24px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, background 0.2s'
                }}
              >
                <Play size={16} fill="white" />
                Play
              </button>
              <button
                onClick={() => {
                  if (tracks.length > 0) {
                    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                    onPlayTrack(shuffled[0], shuffled);
                  }
                }}
                className="genre-shuffle-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '10px 24px',
                  borderRadius: '24px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, background 0.2s'
                }}
              >
                <Shuffle size={16} />
                Shuffle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Track List Below */}
      <div className="table-container" style={{ flex: 1, padding: '24px 32px 40px 32px' }}>
        {tracks.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px 0' }}>
            <Music2 size={48} className="empty-icon" style={{ opacity: 0.5, marginBottom: '12px' }} />
            <h3>No Tracks Found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>No tracks are available in this genre folder.</p>
          </div>
        ) : (
          <table className="tracks-table">
            <thead>
              <tr>
                <th style={{ width: '68px', textAlign: 'center' }}></th>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th>Title</th>
                <th style={{ width: '100px', textAlign: 'center' }}><Clock size={14} /></th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => {
                const isActive = track.filePath === currentlyPlayingPath;

                const currentBasename = track.filePath.split(/[\\/]/).pop()?.toLowerCase();
                const isLiked = likedTracks.includes(track.filePath) ||
                  (!!currentBasename && likedTracks.some(p => p.split(/[\\/]/).pop()?.toLowerCase() === currentBasename));

                const imageKey = `genre-track-${track.filePath}-${idx}`;
                const hasCover = track.coverArt && !failedImages[imageKey];

                return (
                  <tr 
                    key={track.filePath} 
                    className={isActive ? 'playing-row' : ''}
                    onContextMenu={(e) => onTrackContextMenu?.(e, track)}
                  >
                    {/* Cover Art Thumbnail (48x48) */}
                    <td style={{ textAlign: 'center', width: '68px', padding: '8px 6px' }}>
                      {hasCover ? (
                        <img
                          src={track.coverArt}
                          alt="Cover"
                          onError={() => {
                            setFailedImages(prev => ({ ...prev, [imageKey]: true }));
                          }}
                          style={{
                            width: '48px',
                            height: '48px',
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
                            width: '48px',
                            height: '48px',
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
                          <Music2 size={20} />
                        </div>
                      )}
                    </td>

                    {/* Track Number */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>

                    {/* Title & Artist */}
                    <td
                      className="track-title-cell"
                      title={track.filePath}
                      onClick={() => handlePlayClick(track)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="track-title-text" style={{ fontWeight: 600 }}>
                        {track.title.replace(/\s*[\(\[](feat|ft|featuring|with)\.?[^\)\]]*[\)\]]/gi, '').trim()}
                      </div>
                      <div className="track-artist-text" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 400 }}>
                        {track.artist}
                      </div>
                    </td>

                    {/* Duration */}
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {formatTime(track.duration)}
                    </td>

                    {/* Redesigned Actions: Like & More popover */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleLike(track.filePath); }}
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

                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === track.filePath ? null : track.filePath);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-secondary)'
                            }}
                            title="More Actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeDropdown === track.filePath && (
                            <div className="track-action-dropdown">
                              <button onClick={() => handlePlayClick(track)}>Play</button>
                              <button onClick={() => { onAddToQueue(track); setActiveDropdown(null); }}>Add to Queue</button>
                              <button onClick={() => { alert(`Added "${track.title}" to playlist`); setActiveDropdown(null); }}>Add to Playlist</button>
                              <button onClick={() => { alert(`Album: ${track.title}`); setActiveDropdown(null); }}>Go to Album</button>
                              <button onClick={() => { handleShare(track); setActiveDropdown(null); }}>Share File Path</button>
                              <button onClick={() => { onEditTrack(track); setActiveDropdown(null); }}>Properties</button>
                            </div>
                          )}
                        </div>
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
