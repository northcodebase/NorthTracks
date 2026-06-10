import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  Play, 
  Trash2, 
  Music2, 
  Clock, 
  Pencil, 
  Shuffle, 
  ListMusic,
  Plus
} from 'lucide-react';

interface Track {
  filePath: string;
  title: string;
  artist: string;
  album: string;
  genre: string[];
  duration: number;
  bitrate: number;
  coverArt?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  coverArt?: string;
}

interface PlaylistsViewProps {
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  libraryTracks: Track[];
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onNewPlaylist: () => void;
  onDeletePlaylist: (id: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, filePath: string) => void;
  onSavePlaylists: (playlists: Playlist[]) => void;
  setCurrentView: (view: string) => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onOpenPlaylist?: (id: string | null) => void;
  onPlaylistContextMenu?: (e: React.MouseEvent, playlistId: string, playlistName: string, isCustom: boolean) => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  playlists,
  selectedPlaylistId,
  libraryTracks,
  onPlayTrack,
  onNewPlaylist,
  onDeletePlaylist,
  onRemoveTrackFromPlaylist,
  onSavePlaylists,
  setCurrentView,
  onTrackContextMenu,
  onNavigateToArtist,
  onOpenPlaylist,
  onPlaylistContextMenu
}) => {
  const currentPlaylist = playlists.find(p => p.id === selectedPlaylistId);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');

  useEffect(() => {
    if (currentPlaylist) {
      setEditingNameValue(currentPlaylist.name);
    }
  }, [selectedPlaylistId, currentPlaylist]);

  const handleNameSave = () => {
    if (!currentPlaylist) return;
    const trimmed = editingNameValue.trim();
    if (trimmed && trimmed !== currentPlaylist.name) {
      const updated = playlists.map(pl => {
        if (pl.id === currentPlaylist.id) {
          return { ...pl, name: trimmed };
        }
        return pl;
      });
      onSavePlaylists(updated);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      if (currentPlaylist) {
        setEditingNameValue(currentPlaylist.name);
      }
      setIsEditingName(false);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentPlaylist) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result;
          const updated = playlists.map(pl => {
            if (pl.id === currentPlaylist.id) {
              return { ...pl, coverArt: base64Data };
            }
            return pl;
          });
          onSavePlaylists(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Resolve playlist tracks
  const playlistTracks = currentPlaylist
    ? currentPlaylist.tracks
        .map(filePath => libraryTracks.find(t => t.filePath === filePath))
        .filter((t): t is Track => !!t)
    : [];

  // Index (list of all playlists)
  if (!currentPlaylist) {
    return (
      <div className="content-area fade-in" style={{ padding: '20px 24px', height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Playlists</h2>
          <button 
            onClick={onNewPlaylist} 
            className="button-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <Plus size={14} />
            <span>New Playlist</span>
          </button>
        </div>

        {playlists.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
            <div style={{ opacity: 0.5, marginBottom: '16px' }}>
              <ListMusic size={48} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No Playlists Created</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', textAlign: 'center' }}>
              Create a custom playlist to group your favorite songs together.
            </p>
          </div>
        ) : (
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
              gap: '16px',
              paddingBottom: '24px'
            }}
          >
            {playlists.map((pl) => {
              let coverArt = pl.coverArt;
              if (!coverArt) {
                const firstTrack = pl.tracks
                  .map(filePath => libraryTracks.find(t => t.filePath === filePath))
                  .find(t => t && t.coverArt);
                if (firstTrack) {
                  coverArt = firstTrack.coverArt;
                }
              }

              return (
                <div
                  key={pl.id}
                  onClick={() => onOpenPlaylist?.(pl.id)}
                  style={{
                    padding: '12px',
                    boxSizing: 'border-box',
                    background: 'var(--color-background-secondary)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  onContextMenu={(e) => onPlaylistContextMenu?.(e, pl.id, pl.name, true)}
                >
                  <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {coverArt ? (
                      <img 
                        src={coverArt} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          background: 'linear-gradient(135deg, var(--primary, #7c5cbf) 0%, var(--primary-hover, #906fd5) 100%)', 
                          color: '#ffffff' 
                        }}
                      >
                        <Music2 size={32} />
                      </div>
                    )}
                  </div>
                  <div 
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                    title={pl.name}
                  >
                    {pl.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                    {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Cover image display logic for detail view
  let detailCoverArt = currentPlaylist.coverArt;
  if (!detailCoverArt) {
    const firstTrack = playlistTracks.find(t => t.coverArt);
    if (firstTrack) {
      detailCoverArt = firstTrack.coverArt;
    }
  }

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
        {/* Crisp background cover image */}
        {detailCoverArt ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${detailCoverArt})`,
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

        {/* Dark overlay gradient */}
        <div
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
          onClick={() => onOpenPlaylist?.(null)}
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
          title="Back to Playlists"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Header content */}
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', gap: '24px', alignItems: 'flex-end', width: '100%' }}>
          {/* Cover Art Thumbnail (120x120px) with Camera overlay */}
          <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)', flexShrink: 0 }}>
            {detailCoverArt ? (
              <img 
                src={detailCoverArt} 
                alt="Playlist Cover" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Music2 size={40} />
              </div>
            )}
            
            {/* Edit Cover Overlay (Camera icon) */}
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
              title="Change Playlist Cover Art"
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
                  onBlur={handleNameSave}
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
                    {currentPlaylist.name}
                  </h1>
                  <button
                    onClick={() => {
                      setEditingNameValue(currentPlaylist.name);
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
                    title="Rename Playlist"
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
                {playlistTracks.length} {playlistTracks.length === 1 ? 'song' : 'songs'}
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => playlistTracks.length > 0 && onPlayTrack(playlistTracks[0], playlistTracks)}
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
                  disabled={playlistTracks.length === 0}
                >
                  <Play size={16} fill="white" />
                  Play
                </button>
                <button
                  onClick={() => {
                    if (playlistTracks.length > 0) {
                      const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5);
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
                  disabled={playlistTracks.length === 0}
                >
                  <Shuffle size={16} />
                  Shuffle
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the playlist "${currentPlaylist.name}"?`)) {
                      onDeletePlaylist(currentPlaylist.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '10px 20px',
                    borderRadius: '24px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, background 0.2s'
                  }}
                  title="Delete Playlist"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks Table */}
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
        {playlistTracks.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px 0' }}>
            <Music2 size={48} className="empty-icon" style={{ opacity: 0.5, marginBottom: '12px' }} />
            <h3>No Tracks in Playlist</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Right-click on tracks in library to add them here.</p>
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
              {playlistTracks.map((track, idx) => {
                return (
                  <tr 
                    key={track.filePath} 
                    onContextMenu={(e) => onTrackContextMenu?.(e, track)}
                  >
                    {/* Track Number */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {idx + 1}
                    </td>

                    {/* Title */}
                    <td
                      className="track-title-cell"
                      onClick={() => onPlayTrack(track, playlistTracks)}
                      style={{ cursor: 'pointer', verticalAlign: 'middle' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {track.coverArt ? (
                          <img
                            src={track.coverArt}
                            alt="Cover"
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
                          {track.title}
                        </span>
                      </div>
                    </td>

                    {/* Artist */}
                    <td style={{ verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                      <span 
                        style={{ cursor: onNavigateToArtist ? 'pointer' : 'default' }}
                        onClick={() => onNavigateToArtist?.(track.artist)}
                      >
                        {track.artist}
                      </span>
                    </td>

                    {/* Duration */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {formatTime(track.duration)}
                      </span>
                    </td>

                    {/* Remove Action */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrackFromPlaylist(currentPlaylist.id, track.filePath);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444',
                          opacity: 0.8,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                        title="Remove from Playlist"
                      >
                        <Trash2 size={16} />
                      </button>
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
