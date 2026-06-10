import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, Heart, Music2, Clock, MoreVertical, Shuffle, Pencil } from 'lucide-react';
import { Track } from './ExploreView';
import { ArtistLinks } from './ArtistLinks';

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
  onNavigateToArtist: (artistName: string) => void;
  /** Called with the updated base64 cover whenever user changes the cover image */
  onCoverChange?: (genre: string, base64: string) => void;
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
  onTrackContextMenu,
  onNavigateToArtist,
  onCoverChange,
  onRenameGenre,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [customCover, setCustomCover] = useState<string | null>(null);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(genre);

  useEffect(() => {
    setEditingNameValue(genre);
  }, [genre]);

  const handleNameSave = () => {
    const trimmed = editingNameValue.trim();
    if (trimmed && trimmed !== genre) {
      onRenameGenre?.(genre, trimmed);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditingNameValue(genre);
      setIsEditingName(false);
    }
  };

  const handleNameBlur = () => {
    handleNameSave();
  };

  useEffect(() => {
    const loadCustomCover = async () => {
      if (window.electronAPI?.getSettings) {
        try {
          const settings = await window.electronAPI.getSettings();
          const savedCover = settings[`custom-genre-cover-${genre}`];
          if (savedCover) setCustomCover(savedCover);
          else setCustomCover(null);
          const savedBg = settings[`custom-genre-bg-${genre}`];
          if (savedBg) setCustomBg(savedBg);
          else setCustomBg(null);
        } catch (e) {
          console.error('Failed to load custom genre cover:', e);
        }
      }
    };
    loadCustomCover();
  }, [genre]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result;
          setCustomCover(base64Data);
          if (window.electronAPI?.saveSettings) {
            try {
              await window.electronAPI.saveSettings({
                [`custom-genre-cover-${genre}`]: base64Data
              });
            } catch (err) {
              console.error('Failed to save custom genre cover settings:', err);
            }
          }
          onCoverChange?.(genre, base64Data);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result;
          setCustomBg(base64Data);
          if (window.electronAPI?.saveSettings) {
            try {
              await window.electronAPI.saveSettings({
                [`custom-genre-bg-${genre}`]: base64Data
              });
            } catch (err) {
              console.error('Failed to save custom genre bg:', err);
            }
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Background: prefer custom bg, then custom cover, then first track cover art
  const bgImageToUse = customBg || customCover || tracks.find((t) => t.coverArt)?.coverArt;
  // Thumbnail cover: prefer custom cover, then first track cover
  const coverImageToUse = customCover || tracks.find((t) => t.coverArt)?.coverArt;

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
        {/* Crisp background cover image */}
        {bgImageToUse ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${bgImageToUse})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 1
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
              zIndex: 1
            }}
          />
        )}

        {/* Change Background button — top-right corner of banner */}
        <label
          title="Change Background Image"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0,0,0,0.55)',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'background 0.2s',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Change Background
          <input type="file" accept="image/*" onChange={handleBgImageChange} style={{ display: 'none' }} />
        </label>

        {/* Dark overlay gradient & Vignette */}
        <div
          className="genre-header-vignette"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
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
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', gap: '24px', alignItems: 'flex-end', width: '100%' }}>
          {/* Cover Art Thumbnail (120x120px) */}
          <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)', flexShrink: 0 }}>
            {coverImageToUse ? (
              <img 
                src={coverImageToUse} 
                alt="Cover Art" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Music2 size={40} />
              </div>
            )}
            
            {/* Edit Cover Overlay / Button */}
            <label 
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              title="Change Cover Art"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleCoverImageChange} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>

          {/* Title and Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, width: '100%' }}>
              {isEditingName ? (
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={handleNameBlur}
                  autoFocus
                  style={{
                    fontSize: '48px',
                    fontWeight: 800,
                    color: 'white',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '2px solid var(--primary)',
                    outline: 'none',
                    width: '100%',
                    padding: 0,
                    margin: 0,
                    fontFamily: 'inherit',
                    lineHeight: 1.1
                  }}
                />
              ) : (
                <>
                  <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {genre}
                  </h1>
                  <button
                    onClick={() => {
                      setEditingNameValue(genre);
                      setIsEditingName(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      borderRadius: '50%',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    className="rename-btn"
                    title="Rename Genre Folder"
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                  >
                    <Pencil size={20} />
                  </button>
                </>
              )}
            </div>
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
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px 0' }}>
            <Music2 size={48} className="empty-icon" style={{ opacity: 0.5, marginBottom: '12px' }} />
            <h3>No Tracks Found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>No tracks are available in this genre folder.</p>
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
                    {/* Track Number */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {idx + 1}
                    </td>

                    {/* Title (Cover Art Thumbnail & Track Name next to it) */}
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

                    {/* Artist Category Column */}
                    <td style={{ verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                      <ArtistLinks artist={track.artist} onNavigate={onNavigateToArtist} />
                    </td>

                    {/* Like Button & Duration */}
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
                          title={isLiked ? "Unlike Track" : "Like Track"}
                        >
                          <Heart
                            size={16}
                            fill={isLiked ? "#a78bfa" : "none"}
                            color={isLiked ? "#a78bfa" : "#6b7280"}
                          />
                        </button>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {formatTime(track.duration)}
                        </span>
                      </div>
                    </td>

                    {/* Actions: More actions dropdown */}
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
                            <button onClick={() => { alert(`Added "${track.title}" to playlist`); setActiveDropdown(null); }}>Add to Playlist</button>
                            <button onClick={() => { alert(`Album: ${track.title}`); setActiveDropdown(null); }}>Go to Album</button>
                            <button onClick={() => { handleShare(track); setActiveDropdown(null); }}>Share File Path</button>
                            <button onClick={() => { onEditTrack(track); setActiveDropdown(null); }}>Properties</button>
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
