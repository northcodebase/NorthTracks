import React, { useState } from 'react';
import { ChevronLeft, Play, Heart, Music2, Clock, MoreVertical, Shuffle } from 'lucide-react';
import { Track } from './LibraryView';
import { ArtistLinks } from './ArtistLinks';

interface LikedViewProps {
  browseLibrary: Track[];
  libraryTracks: Track[];
  likedTracks: string[];
  onToggleLike: (filePath: string) => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  currentlyPlayingPath: string | undefined;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onBack: () => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track) => void;
  onNavigateToArtist: (artistName: string) => void;
  onAddToQueue: (track: Track) => void;
  onEditTrack: (track: Track) => void;
}

export const LikedView: React.FC<LikedViewProps> = ({
  browseLibrary,
  libraryTracks,
  likedTracks,
  onToggleLike,
  onPlayTrack,
  currentlyPlayingPath,
  onBack,
  onTrackContextMenu,
  onNavigateToArtist,
  onAddToQueue,
  onEditTrack,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Filter tracks to get all liked ones
  const tracksList = browseLibrary && browseLibrary.length > 0 ? browseLibrary : libraryTracks;
  const tracks = tracksList.filter(track => {
    const currentBasename = track.filePath.split(/[\\/]/).pop()?.toLowerCase();
    return likedTracks.includes(track.filePath) ||
      (!!currentBasename && likedTracks.some(p => p.split(/[\\/]/).pop()?.toLowerCase() === currentBasename));
  });



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

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      onPlayTrack(tracks[0], tracks);
    }
  };

  const handleShuffleAll = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      onPlayTrack(shuffled[0], shuffled);
    }
  };

  const handleShare = (track: Track) => {
    navigator.clipboard.writeText(track.filePath);
    alert(`File path copied to clipboard: ${track.filePath}`);
  };

  return (
    <div className="content-area fade-in" style={{ padding: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* 240px tall hero header */}
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
        {/* Crisp background cover image with blur */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)',
            zIndex: 1
          }}
        />

        {/* Dark overlay gradient & Vignette */}
        <div
          className="genre-header-vignette"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8))',
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
          title="Back to Library"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Header content */}
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', gap: '24px', alignItems: 'flex-end', width: '100%' }}>
          {/* Greater Heart Cover Art Thumbnail (120x120px) */}
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c5cbf 0%, #9061f9 50%, #6366f1 100%)',
            boxShadow: '0 8px 24px rgba(124, 92, 191, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            zIndex: 3
          }}>
            <Heart size={56} fill="white" color="white" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }} />
          </div>

          {/* Title and Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.1 }}>
              Liked Songs
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
              </span>
              {tracks.length > 0 && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handlePlayAll}
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
                    onClick={handleShuffleAll}
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Track List Below */}
      <div 
        className="table-container" 
        style={{ 
          padding: '24px 32px 40px 32px', 
          overflow: 'visible', 
          height: 'auto', 
          flex: 'none',
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          boxShadow: 'none'
        }}
      >
        {tracks.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '250px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '40px 48px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              maxWidth: '400px',
              textAlign: 'center'
            }}>
              <Heart size={48} color="var(--primary)" />
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>No Liked Songs</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Go to the library or home page to add songs you love to your liked collection.
              </div>
            </div>
          </div>
        ) : (
          <table className="tracks-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center', position: 'static' }}>#</th>
                <th style={{ position: 'static' }}>Title</th>
                <th style={{ position: 'static' }}>Artist</th>
                <th style={{ width: '120px', textAlign: 'center', position: 'static' }}><Clock size={14} /></th>
                <th style={{ width: '80px', textAlign: 'center', position: 'static' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => {
                const isActive = track.filePath === currentlyPlayingPath;
                const imageKey = `liked-track-${track.filePath}-${idx}`;
                const hasCover = track.coverArt && !failedImages[imageKey];

                return (
                  <tr 
                    key={track.filePath} 
                    className={isActive ? 'playing-row' : ''}
                    onContextMenu={(e) => onTrackContextMenu?.(e, track)}
                  >
                    {/* Track Number */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {idx + 1}
                    </td>

                    {/* Title & Cover Thumbnail */}
                    <td
                      className="track-title-cell"
                      title={track.filePath}
                      onClick={() => handlePlayClick(track)}
                      style={{ cursor: 'pointer', verticalAlign: 'middle' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {hasCover ? (
                          <img
                            src={track.coverArt}
                            alt="Cover"
                            onError={() => {
                              setFailedImages(prev => ({ ...prev, [imageKey]: true }));
                            }}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1px solid var(--border-light)',
                              flexShrink: 0
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
                              flexShrink: 0
                            }}
                          >
                            <Music2 size={16} />
                          </div>
                        )}
                        <span style={{ fontWeight: 600 }}>
                          {track.title.replace(/\s*[\(\[](feat|ft|featuring|with)\.?[^\)\]]*[\)\]]/gi, '').trim()}
                        </span>
                      </div>
                    </td>

                    {/* Artist Links */}
                    <td style={{ verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                      <ArtistLinks artist={track.artist} onNavigate={onNavigateToArtist} />
                    </td>

                    {/* Like Toggle (Heart) & Duration */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
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
                          title="Unlike Track"
                        >
                          <Heart
                            size={16}
                            fill="#a78bfa"
                            color="#a78bfa"
                          />
                        </button>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {formatTime(track.duration)}
                        </span>
                      </div>
                    </td>

                    {/* More actions dropdown */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
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
                            <button onClick={() => { onEditTrack(track); setActiveDropdown(null); }}>Properties</button>
                            <button onClick={() => { handleShare(track); setActiveDropdown(null); }}>Share File Path</button>
                          </div>
                        )}
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
