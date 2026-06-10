import React, { useRef, useState, useEffect } from 'react';
import {
  Heart,
  Shuffle,
  SkipBack,
  Pause,
  Play,
  SkipForward,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Maximize2,
  MoreHorizontal,
  SlidersHorizontal,
  Keyboard,
  Sparkles,
  Music,
  RefreshCw,
  Music2,
  Info,
  FolderPlus,
  FolderOpen,
  Copy,
  Plus,
  ChevronDown
} from 'lucide-react';
import { Track } from './LibraryView';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  setVolume: (vol: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isShuffle: boolean;
  setIsShuffle: (shuffle: boolean) => void;
  repeatMode: 'off' | 'all' | 'one';
  handleToggleRepeat: () => void;
  likedTracks: string[];
  handleToggleLike: (filePath: string) => void;
  dislikedTracks: string[];
  handleToggleDislike: (filePath: string) => void;
  handlePrevTrack: () => void;
  handleNextTrack: () => void;
  handleTogglePlay: () => void;
  isQueueOpen: boolean;
  setIsQueueOpen: (open: boolean) => void;
  showNowPlaying: boolean;
  setShowNowPlaying: (show: boolean) => void;
  showPlayerMoreMenu: boolean;
  setShowPlayerMoreMenu: (show: boolean) => void;
  isEQOpen: boolean;
  setIsEQOpen: (open: boolean) => void;
  isKeyboardHelpOpen: boolean;
  setIsKeyboardHelpOpen: (open: boolean) => void;
  setCurrentView: (view: string) => void;
  setSettingsCategory: (category: string | null) => void;
  addLog: (log: string) => void;
  toggleFullscreen: () => void;
  onSeek: (time: number) => void;
  onShowInfo: (track: Track) => void;
  playlists: any[];
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  onCreatePlaylistWithTrack: (track: Track) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  isShuffle,
  setIsShuffle,
  repeatMode,
  handleToggleRepeat,
  likedTracks,
  handleToggleLike,
  handlePrevTrack,
  handleNextTrack,
  handleTogglePlay,
  isQueueOpen,
  setIsQueueOpen,
  showNowPlaying,
  setShowNowPlaying,
  showPlayerMoreMenu,
  setShowPlayerMoreMenu,
  isEQOpen,
  setIsEQOpen,
  isKeyboardHelpOpen,
  setIsKeyboardHelpOpen,
  setCurrentView,
  setSettingsCategory,
  addLog,
  toggleFullscreen,
  onSeek,
  onShowInfo,
  playlists,
  onAddToPlaylist,
  onCreatePlaylistWithTrack,
}) => {
  const [playerImageFailed, setPlayerImageFailed] = useState(false);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);

  useEffect(() => {
    if (!showPlayerMoreMenu) {
      setShowPlaylistSubmenu(false);
    }
  }, [showPlayerMoreMenu]);

  // Drag states for Progress Bar (Scrubbing)
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const [isProgressHovered, setIsProgressHovered] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const scrubPositionRef = useRef(0);

  // Drag states for Volume Slider
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);

  useEffect(() => {
    setPlayerImageFailed(false);
  }, [currentTrack]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to calculate time from clientX
  const getScrubTimeFromX = (clientX: number): number => {
    if (!progressContainerRef.current || duration <= 0) return 0;
    const rect = progressContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const rawTime = percentage * duration;
    if (isNaN(rawTime) || !isFinite(rawTime)) return 0;
    return Math.max(0, Math.min(duration, rawTime));
  };

  // Progress Bar Drag Handlers
  const handleProgressStart = (clientX: number) => {
    if (!progressContainerRef.current || duration <= 0) return;
    
    // Cancel any pending scroll seek timeouts and clear scrollTime preview
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    setScrollTime(null);

    const initialTime = getScrubTimeFromX(clientX);
    setIsScrubbing(true);
    setScrubPosition(initialTime);
    scrubPositionRef.current = initialTime;
    onSeek(initialTime); // Immediate seek on mousedown
  };

  const handleProgressMove = (clientX: number) => {
    if (!progressContainerRef.current || duration <= 0) return;
    const newTime = getScrubTimeFromX(clientX);
    setScrubPosition(newTime);
    scrubPositionRef.current = newTime;
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleProgressMove(e.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      onSeek(scrubPositionRef.current);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleProgressMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsScrubbing(false);
      onSeek(scrubPositionRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isScrubbing]);

  // Volume Slider Drag Handlers
  const handleVolumeStart = (clientX: number) => {
    if (!volumeContainerRef.current) return;
    setIsVolumeDragging(true);
    updateVolumeFromX(clientX);
  };

  const updateVolumeFromX = (clientX: number) => {
    if (!volumeContainerRef.current) return;
    const rect = volumeContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, x / rect.width));
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  useEffect(() => {
    if (!isVolumeDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateVolumeFromX(e.clientX);
    };

    const handleMouseUp = () => {
      setIsVolumeDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateVolumeFromX(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsVolumeDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isVolumeDragging]);

  // Scroll/Wheel handler for Volume Container
  useEffect(() => {
    const container = volumeContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = 0.05;
      let newVolume = volume;
      if (e.deltaY < 0) {
        newVolume = Math.min(1, volume + step);
      } else if (e.deltaY > 0) {
        newVolume = Math.max(0, volume - step);
      }
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [volume, setVolume, setIsMuted]);

  // Local state for scroll seek preview
  const [scrollTime, setScrollTime] = useState<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs for currentTime, duration and onSeek to avoid re-triggering the wheel listener effect
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);

  useEffect(() => {
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
    onSeekRef.current = onSeek;
  }, [currentTime, duration, onSeek]);

  // Scroll/Wheel handler for Progress (Seek) Container
  useEffect(() => {
    const container = progressContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const currentDuration = durationRef.current;
      if (currentDuration <= 0) return;

      e.preventDefault();
      const step = 5; // 5 seconds step

      setScrollTime((prevTime) => {
        const baseTime = prevTime !== null ? prevTime : currentTimeRef.current;
        const newTime = Math.max(0, Math.min(currentDuration, baseTime + (e.deltaY < 0 ? step : -step)));

        // Debounce actual seek
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          onSeekRef.current(newTime);
          setScrollTime(null);
          scrollTimeoutRef.current = null;
        }, 250);

        return newTime;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const displayTime = scrollTime !== null 
    ? scrollTime 
    : (isScrubbing ? scrubPosition : currentTime);

  // Styles for Seek / Scrub Bar (YouTube Music absolute top layout)
  const progressContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-8px', // Position hit target exactly over the top border
    left: 0,
    right: 0,
    height: '16px', // Invisible hit target
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    zIndex: 10,
  };

  const progressTrackStyle: React.CSSProperties = {
    width: '100%',
    height: (isProgressHovered || isScrubbing) ? '5px' : '3px',
    backgroundColor: 'var(--border-medium, rgba(255,255,255,0.15))',
    position: 'relative',
    overflow: 'visible',
    transition: 'height 0.1s ease',
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    width: `${duration > 0 ? (displayTime / duration) * 100 : 0}%`,
    backgroundColor: 'var(--accent, #7c5cbf)',
    position: 'absolute',
    left: 0,
    top: 0,
    transition: 'none',
  };

  const progressThumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: `${duration > 0 ? (displayTime / duration) * 100 : 0}%`,
    transform: 'translate(-50%, -50%)',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent, #7c5cbf)',
    opacity: (isProgressHovered || isScrubbing) ? 1 : 0,
    transition: 'opacity 0.1s ease',
    pointerEvents: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  };

  // Styles for Volume Slider
  const volumeContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '90px',
    height: '24px', // 20px+ hit target
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
  };

  const volumeTrackStyle: React.CSSProperties = {
    width: '100%',
    height: (isVolumeHovered || isVolumeDragging) ? '7px' : '5px',
    backgroundColor: 'var(--border-medium, rgba(255,255,255,0.15))',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'visible',
    transition: 'height 0.15s ease',
  };

  const volumeFillStyle: React.CSSProperties = {
    height: '100%',
    width: `${volume * 100}%`,
    backgroundColor: 'var(--accent, #7c5cbf)',
    borderRadius: '4px',
    position: 'absolute',
    left: 0,
    top: 0,
  };

  const volumeThumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: `${volume * 100}%`,
    transform: 'translate(-50%, -50%)',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent, #7c5cbf)',
    opacity: (isVolumeHovered || isVolumeDragging) ? 1 : 0,
    transition: 'opacity 0.1s ease',
    pointerEvents: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  };

  return (
    <div className="player-bar">
      {/* Progress Bar Container: Absolute positioned at the top edge */}
      <div
        ref={progressContainerRef}
        style={progressContainerStyle}
        onMouseDown={(e) => handleProgressStart(e.clientX)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            handleProgressStart(e.touches[0].clientX);
          }
        }}
        onMouseEnter={() => setIsProgressHovered(true)}
        onMouseLeave={() => setIsProgressHovered(false)}
      >
        <div style={progressTrackStyle}>
          <div style={progressFillStyle} />
          <div style={progressThumbStyle} />
        </div>
      </div>

      {/* Left zone — playback controls and current/duration times */}
      <div className="player-controls-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="player-btn control-btn-prev"
          onClick={handlePrevTrack}
          disabled={!currentTrack}
          title="Previous Track"
        >
          <SkipBack size={18} />
        </button>
        <button
          className="player-btn control-btn-play"
          onClick={handleTogglePlay}
          disabled={!currentTrack}
          title={isPlaying ? "Pause" : "Play"}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            color: 'var(--player-btn-hover, #ffffff)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.1s ease',
            flexShrink: 0,
          }}
        >
          {isPlaying ? (
            <Pause size={20} fill="currentColor" color="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" color="currentColor" style={{ marginLeft: '2px' }} />
          )}
        </button>
        <button
          className="player-btn control-btn-next"
          onClick={handleNextTrack}
          disabled={!currentTrack}
          title="Next Track"
        >
          <SkipForward size={18} />
        </button>

        <div
          className="player-time-display"
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginLeft: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
        >
          {formatTime(displayTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Center zone — album art, metadata, like, and three-dots */}
      <div className="player-track-info-center" style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', minWidth: 0, overflow: 'visible' }}>
        <div className="player-album-art">
          {currentTrack && currentTrack.coverArt && !playerImageFailed ? (
            <img
              src={currentTrack.coverArt}
              alt=""
              onError={() => setPlayerImageFailed(true)}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          ) : (
            <Music2 size={20} color="#6b7280" />
          )}
        </div>

        <div className="player-metadata" style={{ gap: '2px', minWidth: 0, overflow: 'hidden' }}>
          <div
            className="player-track-title"
            title={currentTrack ? currentTrack.title : 'No Track Selected'}
            style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {currentTrack ? currentTrack.title : 'No Track Selected'}
          </div>
          <div
            className="player-track-artist"
            title={currentTrack ? currentTrack.artist : ''}
            style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {currentTrack ? currentTrack.artist : ''}
          </div>
        </div>

        {currentTrack && (
          <div className="player-feedback-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
            {/* Heart (Like) button */}
            <button
              onClick={() => handleToggleLike(currentTrack.filePath)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '50%',
                flexShrink: 0,
                color: likedTracks.includes(currentTrack.filePath) ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'background-color 0.2s ease',
                outline: 'none',
              }}
              title={likedTracks.includes(currentTrack.filePath) ? "Remove from Liked" : "Like Song"}
            >
              <Heart
                size={16}
                fill={likedTracks.includes(currentTrack.filePath) ? 'var(--primary)' : 'none'}
                color={likedTracks.includes(currentTrack.filePath) ? 'var(--primary)' : 'currentColor'}
              />
            </button>

            {/* Three-dots menu button */}
            <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
              <button
                className={`player-btn ${showPlayerMoreMenu ? 'active' : ''}`}
                onClick={() => setShowPlayerMoreMenu(!showPlayerMoreMenu)}
                title="More"
                style={{
                  color: showPlayerMoreMenu ? 'var(--primary)' : 'var(--player-btn-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '50%',
                  outline: 'none',
                }}
              >
                <MoreHorizontal size={16} />
              </button>
              {showPlayerMoreMenu && (
                <div className="player-more-menu" onContextMenu={(e) => e.preventDefault()}>
                  <button
                    onClick={() => {
                      onShowInfo(currentTrack);
                      setShowPlayerMoreMenu(false);
                    }}
                  >
                    <Info size={14} style={{ marginRight: '8px' }} />
                    Track Info
                  </button>

                  <div className="player-submenu-wrapper" style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlaylistSubmenu(!showPlaylistSubmenu);
                      }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FolderPlus size={14} style={{ marginRight: '8px' }} />
                        Add to Playlist
                      </div>
                      <span style={{ fontSize: '10px', opacity: 0.7 }}>▶</span>
                    </button>

                    {showPlaylistSubmenu && (
                      <div
                        className="player-more-menu"
                        style={{
                          position: 'absolute',
                          right: '100%',
                          bottom: 0,
                          marginRight: '8px',
                          zIndex: 101,
                          maxHeight: '200px',
                          overflowY: 'auto',
                        }}
                      >
                        {playlists.map((pl) => (
                          <button
                            key={pl.id}
                            onClick={() => {
                              onAddToPlaylist(pl.id, currentTrack);
                              setShowPlaylistSubmenu(false);
                              setShowPlayerMoreMenu(false);
                            }}
                          >
                            <Plus size={12} style={{ marginRight: '8px' }} />
                            {pl.name}
                          </button>
                        ))}
                        {playlists.length > 0 && <div className="sidebar-divider" style={{ margin: '4px 0', width: '100%' }} />}
                        <button
                          onClick={() => {
                            onCreatePlaylistWithTrack(currentTrack);
                            setShowPlaylistSubmenu(false);
                            setShowPlayerMoreMenu(false);
                          }}
                        >
                          <Plus size={12} style={{ marginRight: '8px' }} />
                          + New Playlist
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      if (window.electronAPI?.showInExplorer) {
                        await window.electronAPI.showInExplorer(currentTrack.filePath);
                      }
                      setShowPlayerMoreMenu(false);
                    }}
                  >
                    <FolderOpen size={14} style={{ marginRight: '8px' }} />
                    Show in Explorer
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentTrack.filePath);
                      addLog(`[system] copied track path to clipboard: "${currentTrack.filePath}"`);
                      setShowPlayerMoreMenu(false);
                    }}
                  >
                    <Copy size={14} style={{ marginRight: '8px' }} />
                    Copy Path
                  </button>
                  <div className="sidebar-divider" style={{ margin: '4px 0', width: '100%' }} />

                  {/* Utility / Audio options */}
                  <button
                    onClick={() => {
                      setIsEQOpen(!isEQOpen);
                      setShowPlayerMoreMenu(false);
                    }}
                    className={isEQOpen ? 'active' : ''}
                  >
                    <SlidersHorizontal size={14} style={{ marginRight: '8px' }} />
                    Equalizer
                  </button>
                  <button
                    onClick={() => {
                      setIsKeyboardHelpOpen(!isKeyboardHelpOpen);
                      setShowPlayerMoreMenu(false);
                    }}
                    className={isKeyboardHelpOpen ? 'active' : ''}
                  >
                    <Keyboard size={14} style={{ marginRight: '8px' }} />
                    Keyboard Shortcuts
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('preferences');
                      setSettingsCategory('playback');
                      setShowPlayerMoreMenu(false);
                      addLog('[player] navigation to audio settings');
                    }}
                  >
                    <Sparkles size={14} style={{ marginRight: '8px' }} />
                    Audio Settings
                  </button>
                  <button
                    onClick={() => {
                      addLog('[player] Replay Gain setting toggled');
                      setShowPlayerMoreMenu(false);
                    }}
                  >
                    <Music size={14} style={{ marginRight: '8px' }} />
                    Replay Gain
                  </button>
                  <button
                    onClick={() => {
                      addLog('[player] Crossfade setting toggled');
                      setShowPlayerMoreMenu(false);
                    }}
                  >
                    <RefreshCw size={14} style={{ marginRight: '8px' }} />
                    Crossfade
                  </button>
                  <button
                    onClick={() => {
                      toggleFullscreen();
                      setShowPlayerMoreMenu(false);
                    }}
                  >
                    <Maximize2 size={14} style={{ marginRight: '8px' }} />
                    Window Fullscreen
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right zone — volume, queue, repeat, shuffle, fullscreen/minimize */}
      <div className="player-utilities-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => {
            if (volume > 0 && !isMuted) {
              setIsMuted(true);
            } else {
              setIsMuted(false);
              if (volume === 0) {
                setVolume(0.8);
              }
            }
          }}
          title={(volume === 0 || isMuted) ? "Unmute" : "Mute"}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            flexShrink: 0,
          }}
        >
          {(volume === 0 || isMuted) ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <div
          ref={volumeContainerRef}
          style={volumeContainerStyle}
          onMouseDown={(e) => handleVolumeStart(e.clientX)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handleVolumeStart(e.touches[0].clientX);
            }
          }}
          onMouseEnter={() => setIsVolumeHovered(true)}
          onMouseLeave={() => setIsVolumeHovered(false)}
        >
          <div style={volumeTrackStyle}>
            <div style={volumeFillStyle} />
            <div style={volumeThumbStyle} />
          </div>
        </div>

        {/* Queue toggle button */}
        <button
          className={`player-btn ${isQueueOpen ? 'active' : ''}`}
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          title="Queue"
          style={{
            color: isQueueOpen ? 'var(--primary)' : 'var(--player-btn-color)',
            flexShrink: 0
          }}
        >
          <ListMusic size={16} />
        </button>

        {/* Repeat toggle button */}
        <button
          className={`player-btn repeat-btn ${repeatMode !== 'off' ? 'active' : ''}`}
          onClick={handleToggleRepeat}
          disabled={!currentTrack}
          title={`Repeat: ${repeatMode}`}
          style={{ color: repeatMode !== 'off' ? 'var(--primary)' : 'var(--player-btn-color)', flexShrink: 0 }}
        >
          {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
        </button>

        {/* Shuffle toggle button */}
        <button
          className={`player-btn shuffle-btn ${isShuffle ? 'active' : ''}`}
          onClick={() => setIsShuffle(!isShuffle)}
          disabled={!currentTrack}
          title="Shuffle"
          style={{ color: isShuffle ? 'var(--primary)' : 'var(--player-btn-color)', flexShrink: 0 }}
        >
          <Shuffle size={16} />
        </button>

        {/* Fullscreen/Minimize toggle button */}
        <button
          className={`player-btn ${showNowPlaying ? 'active' : ''}`}
          onClick={() => setShowNowPlaying(!showNowPlaying)}
          title={showNowPlaying ? "Minimize" : "Fullscreen Player"}
          style={{
            color: showNowPlaying ? 'var(--primary)' : 'var(--player-btn-color)',
            flexShrink: 0
          }}
        >
          {showNowPlaying ? <ChevronDown size={18} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
};
