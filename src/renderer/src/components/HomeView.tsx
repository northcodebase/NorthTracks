import React, { useRef, useEffect } from 'react';
import { Music2, RefreshCw, Play, ListMusic } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { ArtistLinks } from './ArtistLinks';
import { useArtistImage } from '../hooks/useArtistImage';

export interface Track {
  filePath: string;
  title: string;
  artist: string;
  album: string;
  genre: string[];
  duration: number;
  bitrate: number;
  isDuplicate?: boolean;
  coverArt?: string;
  currentTime?: number;
}

interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  coverArt?: string;
}

interface HomeViewProps {
  onNavigateToGenre: (genre: string) => void;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  tracks: Track[];
  playCounts: Record<string, number>;
  onEditTrack: (track: Track) => void;
  currentTrack: Track | null;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track) => void;
  recommendations: Track[];
  onRefreshRecommendations: () => void;
  customPlaylists: Playlist[];
  onOpenPlaylist: (id: string) => void;
  onNavigateToArtist: (artistName: string) => void;
  /** Map of genre name -> custom cover base64 (set by user in GenreView) */
  customGenreCovers?: Record<string, string>;
  onNavigateToPlaylists?: () => void;
  onPlaylistContextMenu?: (e: React.MouseEvent, playlistId: string, playlistName: string, isCustom: boolean) => void;
}

interface PlaylistItem {
  type: 'genre' | 'custom';
  id: string;
  name: string;
  trackCount: number;
  coverArt?: string;
}

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const RecommendationCover: React.FC<{ track: Track }> = ({ track }) => {
  const { imageUrl } = useArtistImage(track.coverArt ? undefined : track.artist);

  if (track.coverArt) {
    return (
      <img
        src={track.coverArt}
        alt={track.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={track.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  return <Music2 size={32} style={{ color: 'var(--text-muted)' }} />;
};

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateToGenre,
  onPlayTrack,
  tracks,
  playCounts,
  onTrackContextMenu,
  recommendations,
  onRefreshRecommendations,
  customPlaylists,
  onOpenPlaylist,
  onNavigateToArtist,
  customGenreCovers = {},
  onNavigateToPlaylists,
  onPlaylistContextMenu,
}) => {
  const recsScrollRef = useRef<HTMLDivElement>(null);
  const playlistsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        const container = e.currentTarget as HTMLDivElement;
        if (container) {
          container.scrollLeft += e.deltaY;
        }
      }
    };

    const recsEl = recsScrollRef.current;
    const playlistsEl = playlistsScrollRef.current;

    if (recsEl) {
      recsEl.addEventListener('wheel', handleWheel, { passive: false });
    }
    if (playlistsEl) {
      playlistsEl.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (recsEl) {
        recsEl.removeEventListener('wheel', handleWheel);
      }
      if (playlistsEl) {
        playlistsEl.removeEventListener('wheel', handleWheel);
      }
    };
  }, [tracks.length, recommendations.length, customPlaylists.length]);

  // Process top played songs (sorted by play counts)
  const topSongs = [...tracks]
    .sort((a, b) => {
      const countA = playCounts[a.filePath] || 0;
      const countB = playCounts[b.filePath] || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, 12);

  // Split top songs for the 2-column grid
  const leftColSongs = topSongs.slice(0, 6);
  const rightColSongs = topSongs.slice(6, 12);

  // Group library tracks by genre to auto-generate genre folder cards
  const genreGroupsMap: Record<string, { name: string; trackCount: number; coverArt?: string }> = {};
  tracks.forEach((track) => {
    const genreName = track.genre && track.genre[0] ? track.genre[0].trim() : 'Unsorted';
    if (!genreGroupsMap[genreName]) {
      genreGroupsMap[genreName] = {
        name: genreName,
        trackCount: 0,
        coverArt: track.coverArt,
      };
    }
    genreGroupsMap[genreName].trackCount++;
    if (!genreGroupsMap[genreName].coverArt && track.coverArt) {
      genreGroupsMap[genreName].coverArt = track.coverArt;
    }
  });

  const genrePlaylists: PlaylistItem[] = Object.values(genreGroupsMap)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(g => ({
      type: 'genre',
      id: g.name,
      name: g.name,
      trackCount: g.trackCount,
      // Prefer user-uploaded custom cover, then fall back to first track cover art
      coverArt: customGenreCovers[g.name] || g.coverArt,
    }));

  // Map custom user-created playlists
  const customPlaylistsMapped: PlaylistItem[] = customPlaylists.map(pl => {
    let coverArt = pl.coverArt;
    if (!coverArt) {
      // Find first track in the playlist that has coverArt
      const firstTrackWithCover = pl.tracks
        .map(filePath => tracks.find(t => t.filePath === filePath))
        .find(t => t && t.coverArt);
      if (firstTrackWithCover) {
        coverArt = firstTrackWithCover.coverArt;
      }
    }

    return {
      type: 'custom',
      id: pl.id,
      name: pl.name,
      trackCount: pl.tracks.length,
      coverArt,
    };
  });

  // Combine both types of playlists
  const allPlaylists = [...genrePlaylists, ...customPlaylistsMapped];

  const renderCover = (playlist: PlaylistItem) => {
    if (playlist.coverArt) {
      return (
        <img 
          src={playlist.coverArt} 
          alt="" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      );
    }
    return (
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
    );
  };

  const handlePlaylistClick = (playlist: PlaylistItem) => {
    if (playlist.type === 'custom') {
      onOpenPlaylist(playlist.id);
    } else {
      onNavigateToGenre(playlist.id);
    }
  };

  return (
    <div className="content-area fade-in" style={{ padding: '20px 24px', height: '100%', overflowY: 'auto', gap: '0px' }}>
      {tracks.length === 0 ? (
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
          <div style={{ opacity: 0.5, marginBottom: '16px' }}><AppIcon size={48} /></div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No Music Files Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', textAlign: 'center' }}>
            Go to the <strong>Import & Scan</strong> tab in the sidebar to scan your music folders.
          </p>
        </div>
      ) : (
        <>
          {/* First Section: Picked for You Today */}
          {recommendations.length > 0 && (
            <div id="recommendations-section" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Picked for You Today
                </h2>
                <button
                  onClick={onRefreshRecommendations}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '50%',
                    transition: 'background-color 0.2s, color 0.2s',
                    outline: 'none',
                  }}
                  className="refresh-btn"
                  title="Refresh recommendations"
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div 
                ref={recsScrollRef}
                style={{ 
                  display: 'flex', 
                  overflowX: 'auto', 
                  gap: '12px', 
                  paddingBottom: '8px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                className="no-scrollbar"
              >
                {recommendations.map((track, idx) => {
                  const imageKey = `rec-${track.filePath}-${idx}`;
                  return (
                    <div
                      key={imageKey}
                      onClick={() => onPlayTrack(track, recommendations)}
                      onContextMenu={(e) => onTrackContextMenu?.(e, track)}
                      style={{
                        width: '130px',
                        minWidth: '130px',
                        maxWidth: '130px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'transform 0.2s ease',
                      }}
                      className="home-recommendation-card"
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RecommendationCover track={track} />
                      </div>
                      <div 
                        style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                        title={track.title}
                      >
                        {track.title}
                      </div>
                      <div 
                        style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                      >
                        <ArtistLinks artist={track.artist} onNavigate={onNavigateToArtist} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Second Section: Your Playlists */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Your Playlists
            </h2>
            <div 
              ref={playlistsScrollRef}
              style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: '12px', 
                paddingBottom: '8px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              className="no-scrollbar"
            >
              {allPlaylists.map((playlist, idx) => {
                const imageKey = `playlist-card-${playlist.id}-${idx}`;
                return (
                  <div
                    key={imageKey}
                    onClick={() => handlePlaylistClick(playlist)}
                    style={{
                      width: '160px',
                      minWidth: '160px',
                      maxWidth: '160px',
                      padding: '8px',
                      boxSizing: 'border-box',
                      background: 'var(--color-background-secondary)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'transform 0.2s ease',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    onContextMenu={(e) => onPlaylistContextMenu?.(e, playlist.id, playlist.name, playlist.type === 'custom')}
                  >
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {renderCover(playlist)}
                    </div>
                    <div 
                      style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                      title={playlist.name}
                    >
                      {playlist.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                      {playlist.trackCount} {playlist.trackCount === 1 ? 'song' : 'songs'}
                    </div>
                  </div>
                );
              })}

              {/* See All Card */}
              <div
                onClick={() => onNavigateToPlaylists?.()}
                style={{
                  width: '160px',
                  minWidth: '160px',
                  maxWidth: '160px',
                  padding: '8px',
                  boxSizing: 'border-box',
                  background: 'var(--color-background-secondary)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'transform 0.2s ease',
                  border: 'none',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div 
                  style={{ 
                    width: '100%', 
                    aspectRatio: '1', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px dashed var(--border-medium)',
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '8px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <ListMusic size={32} style={{ color: 'var(--primary, #7c5cbf)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>See All Playlists</span>
                </div>
                <div 
                  style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                >
                  See All
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                  {allPlaylists.length} collections
                </div>
              </div>
            </div>
          </div>

          {/* Third Section: Top Songs Charts */}
          <div id="top-songs-section" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Top Songs</h2>

            <div className="top-songs-grid">
              {/* Left Column (Tracks 1-6) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {leftColSongs.map((track, idx) => {
                  const rank = idx + 1;
                  return (
                    <div
                      key={track.filePath}
                      className="top-song-row"
                      onClick={() => onPlayTrack(track, topSongs)}
                      onContextMenu={(e) => onTrackContextMenu?.(e, track)}
                    >
                      <span className="top-song-rank">#{rank}</span>
                      {track.coverArt ? (
                        <img className="top-song-art" src={track.coverArt} alt="" />
                      ) : (
                        <div className="top-song-art" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                          <Music2 size={16} />
                        </div>
                      )}
                      <div className="top-song-info">
                        <div className="top-song-title">{track.title}</div>
                        <div className="top-song-artist"><ArtistLinks artist={track.artist} onNavigate={onNavigateToArtist} /></div>
                      </div>
                      <span className="top-song-duration">{formatTime(track.duration)}</span>
                      <button className="top-song-play" style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={12} fill="currentColor" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Right Column (Tracks 7-12) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {rightColSongs.map((track, idx) => {
                  const rank = idx + 7;
                  return (
                    <div
                      key={track.filePath}
                      className="top-song-row"
                      onClick={() => onPlayTrack(track, topSongs)}
                      onContextMenu={(e) => onTrackContextMenu?.(e, track)}
                    >
                      <span className="top-song-rank">#{rank}</span>
                      {track.coverArt ? (
                        <img className="top-song-art" src={track.coverArt} alt="" />
                      ) : (
                        <div className="top-song-art" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                          <Music2 size={16} />
                        </div>
                      )}
                      <div className="top-song-info">
                        <div className="top-song-title">{track.title}</div>
                        <div className="top-song-artist"><ArtistLinks artist={track.artist} onNavigate={onNavigateToArtist} /></div>
                      </div>
                      <span className="top-song-duration">{formatTime(track.duration)}</span>
                      <button className="top-song-play" style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={12} fill="currentColor" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
