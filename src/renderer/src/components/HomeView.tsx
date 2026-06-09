import React from 'react';
import { Music2, RefreshCw, Play } from 'lucide-react';
import { AppIcon } from './AppIcon';

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

interface HomeViewProps {
  recentlyPlayed: Track[];
  onNavigateToGenre: (genre: string) => void;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  tracks: Track[];
  playCounts: Record<string, number>;
  onEditTrack: (track: Track) => void;
  currentTrack: Track | null;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track) => void;
  continueListening: Track[];
  recommendations: Track[];
  onRefreshRecommendations: () => void;
}

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs === Infinity) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const HomeView: React.FC<HomeViewProps> = ({
  onPlayTrack,
  tracks,
  playCounts,
  onTrackContextMenu,
  continueListening,
  recommendations,
  onRefreshRecommendations,
}) => {
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

  const mostPlayed = [...tracks]
    .filter(t => (playCounts[t.filePath] || 0) > 0)
    .sort((a, b) => (playCounts[b.filePath] || 0) - (playCounts[a.filePath] || 0))
    .slice(0, 6);

  const mostPlayedList = mostPlayed.length > 0 ? mostPlayed : topSongs.slice(0, 6);

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
          {/* First Section: Recommended for Today */}
          {recommendations.length > 0 && (
            <div id="recommendations-section" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Recommended for Today
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
                        {track.coverArt ? (
                          <img
                            src={track.coverArt}
                            alt={track.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Music2 size={32} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                      <div 
                        style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                        title={track.title}
                      >
                        {track.title}
                      </div>
                      <div 
                        style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                        title={track.artist}
                      >
                        {track.artist}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Second Section: Most Played Row */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Most Played
            </h2>
            <div 
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
              {mostPlayedList.length > 0 ? (
                mostPlayedList.slice(0, 6).map((track, idx) => {
                  const imageKey = `most-played-${track.filePath}-${idx}`;
                  const plays = playCounts[track.filePath] || 0;
                  return (
                    <div
                      key={imageKey}
                      onClick={() => onPlayTrack(track, mostPlayedList)}
                      onContextMenu={(e) => onTrackContextMenu?.(e, track)}
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
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {track.coverArt ? (
                          <img 
                            src={track.coverArt} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                            <Music2 size={32} />
                          </div>
                        )}
                      </div>
                      <div 
                        style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                        title={track.title}
                      >
                        {track.title}
                      </div>
                      <div 
                        style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                        title={track.artist}
                      >
                        {track.artist}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                        {plays} {plays === 1 ? 'play' : 'plays'}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '16px', border: '1px dashed var(--border-medium)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', width: '100%' }}>
                  No play history yet
                </div>
              )}
            </div>
          </div>

          {/* Third Section: Continue Listening Row (Conditional Render) */}
          {continueListening.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Continue Listening
              </h2>
              <div 
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
                {continueListening.slice(0, 4).map((track, idx) => {
                  const imageKey = `continue-listening-${track.filePath}-${idx}`;
                  const percent = track.duration && track.currentTime 
                    ? Math.min(100, Math.max(0, (track.currentTime / track.duration) * 100))
                    : 0;
                  return (
                    <div
                      key={imageKey}
                      onClick={() => onPlayTrack(track, continueListening)}
                      onContextMenu={(e) => onTrackContextMenu?.(e, track)}
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
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {track.coverArt ? (
                          <img 
                            src={track.coverArt} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                            <Music2 size={32} />
                          </div>
                        )}
                      </div>
                      <div 
                        style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                        title={track.title}
                      >
                        {track.title}
                      </div>
                      <div 
                        style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
                        title={track.artist}
                      >
                        {track.artist}
                      </div>
                      {track.currentTime !== undefined && track.duration > 0 && (
                        <div style={{ width: '100%', height: '2px', backgroundColor: 'var(--border-medium)', borderRadius: '1px', marginTop: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', backgroundColor: '#7c5cbf' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fourth Section: Top Songs Charts */}
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
                        <div className="top-song-artist">{track.artist}</div>
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
                        <div className="top-song-artist">{track.artist}</div>
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
