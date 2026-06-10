import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Music2,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  FileText,
  Share2,
  X
} from 'lucide-react';
import { Track } from './LibraryView';
import { useArtistImage } from '../hooks/useArtistImage';

interface NowPlayingViewProps {
  currentTrack: Track | null;
  tracks: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isShuffle: boolean;
  onToggleShuffle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  onToggleRepeat: () => void;
  likedTracks: string[];
  onToggleLike: (filePath: string) => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (time: number) => void;
  onClose: () => void;
}

interface LyricLine {
  time: number;
  text: string;
}

// LRC Timecode parser [mm:ss.xx]
const parseLRC = (lrcText: string): LyricLine[] => {
  const lines = lrcText.split(/\r?\n/);
  const parsed: LyricLine[] = [];
  const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
  
  for (const line of lines) {
    timeRegex.lastIndex = 0;
    const match = timeRegex.exec(line);
    if (match) {
      // Remove all timestamp tags to extract lyric text
      const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
      
      timeRegex.lastIndex = 0;
      let m;
      while ((m = timeRegex.exec(line)) !== null) {
        const mins = parseInt(m[1], 10);
        const secs = parseFloat(m[2]);
        const time = mins * 60 + secs;
        parsed.push({ time, text });
      }
    }
  }
  
  parsed.sort((a, b) => a.time - b.time);
  return parsed;
};

// Main lyric parser with plain-text distribution fallback
const parseLyrics = (lyricData: { type: string; lyrics: string }, duration: number): LyricLine[] => {
  if (!lyricData.lyrics || lyricData.lyrics.trim().length === 0) return [];
  
  const hasTimestamps = /\[\d+:\d+(?:\.\d+)?\]/.test(lyricData.lyrics);
  if (hasTimestamps) {
    return parseLRC(lyricData.lyrics);
  }
  
  // Plain text fallback
  const lines = lyricData.lyrics
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
    
  if (lines.length === 0) return [];
  
  // Distribute lines evenly across song duration
  const step = duration > 0 ? duration / (lines.length + 1) : 4;
  return lines.map((text, idx) => ({
    time: step * (idx + 0.5),
    text
  }));
};

export const NowPlayingView: React.FC<NowPlayingViewProps> = ({
  currentTrack,
  tracks,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  likedTracks,
  onToggleLike,
  onPlayTrack,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'queue' | 'lyrics' | null>(null);
  const [lyricsData, setLyricsData] = useState<{ type: string; lyrics: string }>({ type: 'none', lyrics: '' });
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const { imageUrl: artistImageUrl } = useArtistImage(currentTrack?.artist);
  
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const lyricContainerRef = useRef<HTMLDivElement | null>(null);

  // States & Refs for Close Button and Drag-Down Dismissal
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const dragYRef = useRef(0);
 
  // Reset image error state and load lyrics when track changes
  useEffect(() => {
    setImageFailed(false);
    if (currentTrack) {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.getLyrics) {
        electronAPI.getLyrics(currentTrack.filePath).then((data: any) => {
          setLyricsData(data);
        }).catch((err: any) => {
          console.error('Failed to load lyrics:', err);
          setLyricsData({ type: 'none', lyrics: '' });
        });
      } else {
        setLyricsData({ type: 'none', lyrics: '' });
      }
    } else {
      setLyricsData({ type: 'none', lyrics: '' });
    }
  }, [currentTrack]);

  // Parse lyrics
  useEffect(() => {
    if (lyricsData && currentTrack) {
      const parsed = parseLyrics(lyricsData, duration);
      setParsedLyrics(parsed);
    } else {
      setParsedLyrics([]);
    }
  }, [lyricsData, currentTrack, duration]);

  // Trigger slide-up on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsOpen(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleTransitionEnd = () => {
    if (!isOpen) {
      onClose(); // Parent unmounts NowPlayingView
    }
  };

  const handleProgressSeek = (clientX: number) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    onSeek(newTime);
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return;
    isDraggingRef.current = true;
    handleProgressSeek(e.clientX);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return;
    handleProgressSeek(e.clientX);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    handleProgressSeek(e.clientX);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      handleProgressSeek(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [duration]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Drag down gesture handlers and event binding
  const handleStart = (clientY: number, target: HTMLElement) => {
    const isInteractive = target.closest(
      'button, input, [role="button"], .now-playing-side-panel, .now-playing-progress-container, .now-playing-controls-row-centered, .now-playing-action-row-centered, .now-playing-seek-section-centered'
    );
    if (isInteractive) return;

    setIsDragging(true);
    startYRef.current = clientY;
    dragYRef.current = 0;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      if (deltaY > 0) {
        setDragY(deltaY);
        dragYRef.current = deltaY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const deltaY = e.touches[0].clientY - startYRef.current;
        if (deltaY > 0) {
          setDragY(deltaY);
          dragYRef.current = deltaY;
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (dragYRef.current > 80) {
        handleClose();
      }
      setDragY(0);
      dragYRef.current = 0;
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      if (dragYRef.current > 80) {
        handleClose();
      }
      setDragY(0);
      dragYRef.current = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate active lyrics index based on currentTime
  let activeIndex = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (currentTime >= parsedLyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Smooth scroll to keep active lyric centered
  useEffect(() => {
    if (lyricContainerRef.current && activeIndex >= 0 && activeSidePanel === 'lyrics') {
      const activeEl = lyricContainerRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [activeIndex, activeSidePanel]);

  // Check if currentTrack is liked
  const currentBasename = currentTrack?.filePath.split(/[\\/]/).pop()?.toLowerCase();
  const isLiked = currentTrack && (likedTracks.includes(currentTrack.filePath) || 
    (!!currentBasename && likedTracks.some(p => p.split(/[\\/]/).pop()?.toLowerCase() === currentBasename)));

  // Styles for custom elements
  const pillStyle: React.CSSProperties = {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    margin: '12px auto 0 auto',
    cursor: isDragging ? 'grabbing' : 'grab',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '24px',
    zIndex: 9999,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: isCloseHovered ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  };

  return (
    <div 
      className={`now-playing-overlay ${isOpen ? 'open' : ''}`}
      onTransitionEnd={handleTransitionEnd}
      style={{
        transform: isOpen ? `translateY(${dragY}px)` : 'translateY(100%)',
        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      onMouseDown={(e) => handleStart(e.clientY, e.target as HTMLElement)}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          handleStart(e.touches[0].clientY, e.target as HTMLElement);
        }
      }}
    >
      {/* Pill Drag Handle Indicator */}
      <div style={pillStyle} />

      {/* Fixed Close Button */}
      <button 
        style={closeButtonStyle}
        onClick={handleClose}
        onMouseEnter={() => setIsCloseHovered(true)}
        onMouseLeave={() => setIsCloseHovered(false)}
        title="Close"
      >
        <X size={20} />
      </button>

      {/* Dynamic Blurred Ambient Backdrop */}
      <div className={`now-playing-backdrop ${artistImageUrl ? 'has-artist' : ''}`}>
        {artistImageUrl ? (
          <img src={artistImageUrl} alt="" className="now-playing-artist-backdrop-img" />
        ) : currentTrack?.coverArt && !imageFailed ? (
          <img src={currentTrack.coverArt} alt="" className="now-playing-backdrop-img" />
        ) : (
          <div className="now-playing-backdrop-placeholder" />
        )}
      </div>

      {/* Centered Top Header Title */}
      <div className="now-playing-header" style={{ justifyContent: 'center' }}>
        <span className="now-playing-title-label">Now Playing</span>
      </div>

      {/* Centered Main Area */}
      <div className="now-playing-main-layout">
        <div className={`now-playing-player-section ${activeSidePanel ? 'side-panel-open' : ''}`}>
          {currentTrack ? (
            <div className="now-playing-center-card">
              {/* Large Cover Art Cover */}
              <div className="now-playing-cover-wrapper">
                {currentTrack.coverArt && !imageFailed ? (
                  <img 
                    src={currentTrack.coverArt} 
                    alt="Album Cover" 
                    onError={() => setImageFailed(true)}
                    className="now-playing-cover-img"
                  />
                ) : (
                  <div className="now-playing-cover-placeholder">
                    <Music2 size={120} color="var(--color-text-tertiary)" />
                  </div>
                )}
              </div>

              {/* Title & Artist */}
              <div className="now-playing-info-centered">
                <h2 className="now-playing-track-title-centered" title={currentTrack.title}>
                  {currentTrack.title}
                </h2>
                <p className="now-playing-track-artist-centered" title={currentTrack.artist}>
                  {currentTrack.artist}
                </p>
              </div>

              {/* Action Row */}
              <div className="now-playing-action-row-centered">
                <button 
                  className={`now-playing-action-btn ${isLiked ? 'active' : ''}`}
                  onClick={() => onToggleLike(currentTrack.filePath)}
                  title={isLiked ? "Unlike Song" : "Like Song"}
                >
                  <Heart size={18} fill={isLiked ? "var(--primary)" : "none"} color={isLiked ? "var(--primary)" : "currentColor"} />
                </button>
                
                <button 
                  className={`now-playing-action-btn ${activeSidePanel === 'queue' ? 'active' : ''}`}
                  onClick={() => setActiveSidePanel(activeSidePanel === 'queue' ? null : 'queue')}
                  title="Queue"
                >
                  <ListMusic size={18} />
                </button>

                <button 
                  className={`now-playing-action-btn ${activeSidePanel === 'lyrics' ? 'active' : ''}`}
                  onClick={() => setActiveSidePanel(activeSidePanel === 'lyrics' ? null : 'lyrics')}
                  title="Lyrics"
                >
                  <FileText size={18} />
                </button>

                <button 
                  className="now-playing-action-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(currentTrack.filePath);
                    alert(`File path copied to clipboard: ${currentTrack.filePath}`);
                  }}
                  title="Share"
                >
                  <Share2 size={18} />
                </button>
              </div>

              {/* Seek Bar */}
              <div className="now-playing-seek-section-centered">
                <div 
                  className="now-playing-progress-container"
                  ref={progressBarRef}
                  onMouseDown={handleProgressBarMouseDown}
                  onClick={handleProgressBarClick}
                  onMouseMove={handleProgressBarMouseMove}
                >
                  <div className="now-playing-progress-track">
                    <div 
                      className="now-playing-progress-fill" 
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    <div 
                      className="now-playing-progress-thumb" 
                      style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="now-playing-time-display-centered">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls Row */}
              <div className="now-playing-controls-row-centered">
                <button 
                  className={`now-playing-control-btn shuffle ${isShuffle ? 'active' : ''}`}
                  onClick={onToggleShuffle}
                  title="Shuffle"
                >
                  <Shuffle size={18} />
                </button>

                <button className="now-playing-control-btn prev" onClick={onPrevTrack} title="Previous Track">
                  <SkipBack size={24} />
                </button>

                <button className="now-playing-control-btn play-pause-centered" onClick={onTogglePlay} title={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '2px' }} />}
                </button>

                <button className="now-playing-control-btn next" onClick={onNextTrack} title="Next Track">
                  <SkipForward size={24} />
                </button>

                <button 
                  className={`now-playing-control-btn repeat ${repeatMode !== 'off' ? 'active' : ''}`}
                  onClick={onToggleRepeat}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="now-playing-empty">
              <Music2 size={64} style={{ marginBottom: '12px' }} />
              <p>No Track Selected</p>
            </div>
          )}
        </div>

        {/* Side Panel (Lyrics or Queue Drawer) */}
        {activeSidePanel && (
          <div className="now-playing-side-panel">
            <div className="now-playing-side-panel-header">
              <h3>{activeSidePanel === 'queue' ? 'Up Next' : 'Lyrics'}</h3>
              <button className="now-playing-side-panel-close" onClick={() => setActiveSidePanel(null)}>
                <ChevronDown size={20} />
              </button>
            </div>
            <div className="now-playing-side-panel-content">
              {activeSidePanel === 'queue' ? (
                <div className="now-playing-side-queue">
                  {tracks.length === 0 ? (
                    <div className="now-playing-side-empty">Queue is empty</div>
                  ) : (
                    tracks.map((track, idx) => {
                      const isActive = currentTrack?.filePath === track.filePath;
                      return (
                        <div 
                          key={`fs-queue-${track.filePath}-${idx}`}
                          className={`now-playing-side-queue-item ${isActive ? 'active' : ''}`}
                          onClick={() => onPlayTrack(track, tracks)}
                        >
                          <span className="queue-idx">{idx + 1}</span>
                          <div className="queue-meta">
                            <div className="queue-title" title={track.title}>{track.title}</div>
                            <div className="queue-artist" title={track.artist}>{track.artist}</div>
                          </div>
                          <span className="queue-dur">{formatTime(track.duration)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="now-playing-side-lyrics" ref={lyricContainerRef}>
                  {parsedLyrics.length === 0 ? (
                    <div className="now-playing-side-empty">No lyrics available</div>
                  ) : (
                    parsedLyrics.map((line, idx) => {
                      const isActiveLine = idx === activeIndex;
                      return (
                        <div
                          key={idx}
                          data-index={idx}
                          className={`now-playing-lyric-line ${isActiveLine ? 'active' : ''}`}
                          onClick={() => onSeek(line.time)}
                        >
                          {line.text}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
