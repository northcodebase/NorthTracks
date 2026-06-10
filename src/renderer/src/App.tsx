import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Sparkles,
  Music,
  Music2,
  X,
  AlertTriangle,
  Copy
} from 'lucide-react';
import { WindowControls } from './components/WindowControls';
import { Titlebar } from './components/Titlebar';
import { LibraryView, Track } from './components/LibraryView';
import { SettingsView } from './components/SettingsView';
import { NowPlayingView } from './components/NowPlayingView';
import { LikedView } from './components/LikedView';
import { useTheme } from './contexts/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { ExploreView } from './components/ExploreView';
import { LibraryCardsView } from './components/LibraryCardsView';
import { HomeView } from './components/HomeView';
import { GenreView } from './components/GenreView';
import { ArtistView } from './components/ArtistView';
import { audioEngine } from './audio/AudioEngine';
import { EQPanel } from './components/EQPanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { KeyboardHelpModal } from './components/KeyboardHelpModal';
import { ContextMenu } from './components/ContextMenu';
import { TrackInfoModal } from './components/TrackInfoModal';
import { PlayerBar } from './components/PlayerBar';
import { PlaylistsView } from './components/PlaylistsView';

// Seeded pseudo-random number generator (LCG)
function seedRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with custom random generator
function seededShuffle<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  const rnd = seedRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

// Generate recommendations based on listening history
function getRecommendations(tracks: Track[], playHistory: Record<string, number>): Track[] {
  if (!tracks || tracks.length === 0) return [];
  const historyEmpty = !playHistory || Object.keys(playHistory).length === 0 || Object.values(playHistory).reduce((a, b) => a + b, 0) === 0;
  if (historyEmpty) {
    return tracks;
  }

  const genrePlayCounts: Record<string, number> = {};
  tracks.forEach(track => {
    const count = playHistory[track.filePath] || 0;
    if (track.genre && Array.isArray(track.genre)) {
      track.genre.forEach(g => {
        const trimmed = g.trim();
        if (trimmed) {
          genrePlayCounts[trimmed] = (genrePlayCounts[trimmed] || 0) + count;
        }
      });
    }
  });

  const topGenres = Object.entries(genrePlayCounts)
    .filter(([genre]) => genre.toLowerCase() !== 'unsorted' && genre.toLowerCase() !== 'unknown')
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre.toLowerCase());

  const eligibleTracks = tracks.filter(track => {
    if (!track.genre || !Array.isArray(track.genre)) return false;
    return track.genre.some(g => topGenres.includes(g.trim().toLowerCase()));
  });

  eligibleTracks.sort((a, b) => {
    const countA = playHistory[a.filePath] || 0;
    const countB = playHistory[b.filePath] || 0;
    if (countA !== countB) return countA - countB;
    return a.title.localeCompare(b.title);
  });

  let recommended = eligibleTracks.slice(0, 8);

  if (recommended.length < 8) {
    const extraTracks = tracks.filter(t => !recommended.some(r => r.filePath === t.filePath));
    extraTracks.sort((a, b) => {
      const countA = playHistory[a.filePath] || 0;
      const countB = playHistory[b.filePath] || 0;
      if (countA !== countB) return countA - countB;
      return a.title.localeCompare(b.title);
    });
    recommended = [...recommended, ...extraTracks.slice(0, 8 - recommended.length)];
  }

  return recommended;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // Context Menu & Track Info Modal States
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    track: Track;
    onEditGenre?: () => void;
  } | null>(null);
  const [infoTrack, setInfoTrack] = useState<Track | null>(null);

  const [currentView, setCurrentView] = useState<'home' | 'genre' | 'explore' | 'library' | 'catalog' | 'preferences' | 'liked' | 'playlists' | 'terminal' | 'dashboard' | 'artist'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  const [settingsCategory, setSettingsCategory] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [likedArtists, setLikedArtists] = useState<string[]>([]);
  const [backTab, setBackTab] = useState<'home' | 'explore' | 'library' | 'liked' | 'genre'>('explore');
  const [customGenreCovers, setCustomGenreCovers] = useState<Record<string, string>>({});

  // Load liked artists on mount
  useEffect(() => {
    const loadLikedArtists = async () => {
      if (window.electronAPI?.getSettings) {
        try {
          const settings = await window.electronAPI.getSettings();
          if (settings.likedArtists) {
            setLikedArtists(settings.likedArtists);
          }
        } catch (e) {
          console.error('Failed to load liked artists:', e);
        }
      }
    };
    loadLikedArtists();

    // Load all saved custom genre covers from settings
    const loadCustomGenreCovers = async () => {
      if (window.electronAPI?.getSettings) {
        try {
          const settings = await window.electronAPI.getSettings();
          const covers: Record<string, string> = {};
          Object.keys(settings).forEach(key => {
            if (key.startsWith('custom-genre-cover-')) {
              const genre = key.replace('custom-genre-cover-', '');
              covers[genre] = settings[key];
            }
          });
          if (Object.keys(covers).length > 0) {
            setCustomGenreCovers(covers);
          }
        } catch (e) {
          console.error('Failed to load custom genre covers:', e);
        }
      }
    };
    loadCustomGenreCovers();
  }, []);

  const handleToggleLikeArtist = async (artistName: string) => {
    let updated;
    if (likedArtists.includes(artistName)) {
      updated = likedArtists.filter(a => a !== artistName);
    } else {
      updated = [...likedArtists, artistName];
    }
    setLikedArtists(updated);
    if (window.electronAPI?.saveSettings) {
      try {
        await window.electronAPI.saveSettings({ likedArtists: updated });
      } catch (err) {
        console.error('Failed to save liked artists settings:', err);
      }
    }
  };

  const handleGenreCoverChange = (genre: string, base64: string) => {
    setCustomGenreCovers(prev => ({ ...prev, [genre]: base64 }));
  };

  const handleNavigateToArtist = (artistName: string) => {
    setBackTab(currentView === 'genre' || currentView === 'home' || currentView === 'explore' || currentView === 'library' || currentView === 'liked' ? currentView : 'explore');
    setSelectedArtist(artistName);
    setCurrentView('artist');
  };
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  void recentlyPlayed; // used in HomeView
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [browseLibrary, setBrowseLibrary] = useState<Track[]>([]);
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [dislikedTracks, setDislikedTracks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('northtracks-disliked-tracks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [hasScannedInSession, setHasScannedInSession] = useState(false);

  // Play counts state
  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('track-play-counts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const updateContinueListening = async (track: Track, time: number, duration: number) => {
    if (!track || duration <= 0) return;
    const percent = time / duration;
    try {
      const settings = await window.electronAPI?.getSettings?.();
      if (!settings) return;
      let list = settings.continueListening || [];
      if (percent > 0 && percent < 0.90) {
        const trackWithProgress = {
          ...track,
          currentTime: time
        };
        list = list.filter((t: any) => t.filePath !== track.filePath);
        list.unshift(trackWithProgress);
        if (list.length > 10) {
          list = list.slice(0, 10);
        }
      } else if (percent >= 0.90) {
        list = list.filter((t: any) => t.filePath !== track.filePath);
      }
      await window.electronAPI?.saveSettings?.({ continueListening: list });
      setContinueListening(list);
    } catch (e) {
      console.error('Failed to update continue listening:', e);
    }
  };

  const handleRefreshRecommendations = async () => {
    try {
      const settings = await window.electronAPI?.getSettings?.();
      if (!settings) return;
      const tracksList = settings?.cachedLibrary && settings.cachedLibrary.length > 0
        ? settings.cachedLibrary
        : browseLibrary;
      const hist = settings?.playHistory || {};
      const todayStr = new Date().toDateString();
      const recList = getRecommendations(tracksList, hist);
      const newSeed = `${todayStr}_${Date.now()}`;
      const shuffled = seededShuffle(recList, newSeed).slice(0, 8);
      await window.electronAPI?.saveSettings?.({
        dailyRecommendations: {
          generatedDate: todayStr,
          tracks: shuffled
        }
      });
      setRecommendations(shuffled);
      addLog('[recommendations] manually regenerated recommendations.');
    } catch (e) {
      console.error('Failed to refresh recommendations:', e);
    }
  };

  // Custom playlist modal state
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Track editor modal state
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editCoverArt, setEditCoverArt] = useState('');

  // Player States
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [playerImageFailed, setPlayerImageFailed] = useState(false); // used in NowPlayingView via closure
  void playerImageFailed; // suppress unused warning — passed to NowPlayingView
  const [continueListening, setContinueListening] = useState<Track[]>([]);
  void continueListening; // used in HomeView
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [dominantColor, setDominantColor] = useState<{ r: number; g: number; b: number }>({ r: 124, g: 92, b: 191 });
  void dominantColor; // suppress unused warning — passed to NowPlayingView
  const [currentQueue, setCurrentQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isEQOpen, setIsEQOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [showPlayerMoreMenu, setShowPlayerMoreMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [logs, setLogs] = useState<string[]>([
    '[system] initializing northtracks kernel...',
    '[system] secure connection established locally.',
    '[build] esbuild compiler registered successfully.',
    '[vite] hot module replacement active on port 5173.',
    '[electron] window host container 1280x800 initialized.',
  ]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.player-more-menu') && !target.closest('.player-btn')) {
        setShowPlayerMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleAddToQueue = (track: Track) => {
    setCurrentQueue(prev => {
      if (prev.some(t => t.filePath === track.filePath)) return prev;
      return [...prev, track];
    });
    addLog(`[queue] added to queue: "${track.title}"`);
  };

  const handlePlayTrack = async (track: Track, customQueue?: Track[]) => {
    if (!window.electronAPI?.playTrack) return;
    try {
      if (currentTrack && audioRef.current && currentTrack.filePath !== track.filePath) {
        await updateContinueListening(currentTrack, audioRef.current.currentTime, audioRef.current.duration);
      }
      // Increment play count
      setPlayCounts(prev => {
        const next = { ...prev, [track.filePath]: (prev[track.filePath] || 0) + 1 };
        localStorage.setItem('track-play-counts', JSON.stringify(next));
        window.electronAPI?.saveSettings?.({ playHistory: next });
        return next;
      });

      setRecentlyPlayed(prev => {
        const filtered = prev.filter(t => t.filePath !== track.filePath);
        return [track, ...filtered].slice(0, 20);
      });
      if (customQueue) {
        setCurrentQueue(customQueue);
      } else {
        if (currentQueue.length === 0 && libraryTracks.some(t => t.filePath === track.filePath)) {
          setCurrentQueue(libraryTracks);
        }
      }
      addLog(`[player] loading track: "${track.title}" by ${track.artist}`);
      const fileUrl = await window.electronAPI.playTrack(track.filePath);
      setCurrentTrack(track);
      if (audioRef.current) {
        audioEngine.initialize(audioRef.current);
        audioEngine.resume();
        audioRef.current.src = fileUrl;
        audioRef.current.load();
        audioRef.current.volume = volume;
        audioRef.current.play().catch(err => console.error('Audio playback error:', err));
        setIsPlaying(true);
        updateMediaSession(track, true);

        // Auto-normalization on track change
        const saved = localStorage.getItem('eq-settings');
        const normalizationEnabled = saved ? JSON.parse(saved).normalization : false;
        if (normalizationEnabled) {
          setTimeout(() => {
            if (audioRef.current) {
              const gain = audioEngine.analyzeAndNormalize(audioRef.current);
              audioEngine.setNormalizationGain(gain);
            }
          }, 500); // wait for track to load
        }
      }
    } catch (err: any) {
      addLog(`[player] failed to load track: ${err.message}`);
      console.error('Failed to play track:', err);
    }
  };

  const handleTogglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      addLog(`[player] playback paused`);
      updateMediaSession(currentTrack, false);
    } else {
      audioEngine.initialize(audioRef.current);
      audioEngine.resume();
      audioRef.current.play().catch(err => console.error('Audio playback error:', err));
      setIsPlaying(true);
      addLog(`[player] playback resumed`);
      updateMediaSession(currentTrack, true);
    }
  };


  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = false;
    }
    setIsMuted(false);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleNextTrack = async () => {
    const queue = currentQueue.length > 0 ? currentQueue : libraryTracks;
    if (!currentTrack || queue.length === 0) return;

    if (isShuffle) {
      let pickFromSameGenre = false;
      try {
        const settings = await window.electronAPI?.getSettings?.();
        if (settings?.smartShuffle !== false) {
          pickFromSameGenre = Math.random() < 0.7;
        }
      } catch (e) {
        console.error(e);
      }

      let selectedTrack: Track | null = null;
      if (pickFromSameGenre) {
        const currentGenre = currentTrack.genre && currentTrack.genre[0] ? currentTrack.genre[0].trim().toLowerCase() : null;
        if (currentGenre) {
          const sameGenreTracks = queue.filter(t =>
            t.filePath !== currentTrack.filePath &&
            t.genre && t.genre[0] && t.genre[0].trim().toLowerCase() === currentGenre
          );
          if (sameGenreTracks.length > 0) {
            selectedTrack = sameGenreTracks[Math.floor(Math.random() * sameGenreTracks.length)];
          }
        }
      }

      if (!selectedTrack) {
        const randomIndex = Math.floor(Math.random() * queue.length);
        selectedTrack = queue[randomIndex];
      }

      handlePlayTrack(selectedTrack);
      return;
    }

    const currentIndex = queue.findIndex(t => t.filePath === currentTrack.filePath);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % queue.length;
    handlePlayTrack(queue[nextIndex]);
  };

  const handleTrackEnded = () => {
    if (currentTrack && audioRef.current) {
      updateContinueListening(currentTrack, audioRef.current.duration, audioRef.current.duration);
    }
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.error(err));
      }
      return;
    }

    const queue = currentQueue.length > 0 ? currentQueue : libraryTracks;
    if (!currentTrack || queue.length === 0) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      handlePlayTrack(queue[randomIndex]);
      return;
    }

    const currentIndex = queue.findIndex(t => t.filePath === currentTrack.filePath);
    if (currentIndex === -1) return;

    const isLastTrack = currentIndex === queue.length - 1;
    if (isLastTrack && repeatMode === 'off') {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      addLog(`[player] queue completed`);
      updateMediaSession(currentTrack, false);
    } else {
      const nextIndex = (currentIndex + 1) % queue.length;
      handlePlayTrack(queue[nextIndex]);
    }
  };

  const handleToggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handlePrevTrack = () => {
    const queue = currentQueue.length > 0 ? currentQueue : libraryTracks;
    if (!currentTrack || queue.length === 0) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      handlePlayTrack(queue[randomIndex]);
      return;
    }

    const currentIndex = queue.findIndex(t => t.filePath === currentTrack.filePath);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    handlePlayTrack(queue[prevIndex]);
  };

  const updateMediaSession = (track: Track, playing: boolean) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        artwork: track.coverArt ? [{ src: track.coverArt, sizes: '512x512', type: 'image/png' }] : []
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
    if (window.electronAPI?.updatePlaybackState) {
      window.electronAPI.updatePlaybackState(playing, {
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        coverArt: track.coverArt || undefined
      });
    }
  };

  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          handleTogglePlay();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          handleTogglePlay();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlePrevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handleNextTrack();
        });
      } catch (err) {
        console.error('Failed to configure MediaSession handlers:', err);
      }
    }
  }, [currentTrack, isPlaying, currentQueue, libraryTracks, isShuffle]);

  useEffect(() => {
    if (window.electronAPI?.onThumbarControl) {
      const unsubscribe = window.electronAPI.onThumbarControl((action: string) => {
        if (action === 'toggle-play') {
          handleTogglePlay();
        } else if (action === 'next') {
          handleNextTrack();
        } else if (action === 'prev') {
          handlePrevTrack();
        }
      });
      return unsubscribe;
    }
    return undefined;
  }, [isPlaying, currentTrack, currentQueue, libraryTracks, isShuffle]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const loadDashboardData = async () => {
    if (window.electronAPI) {
      try {
        const [pl, lib, act, settings, liked] = await Promise.all([
          window.electronAPI.getPlaylists(),
          window.electronAPI.getLibrary(),
          window.electronAPI.getActivities(),
          window.electronAPI.getSettings(),
          window.electronAPI.getLikedTracks ? window.electronAPI.getLikedTracks() : Promise.resolve([]),
        ]);
        setPlaylists(pl || []);
        setActivities(act || []);
        setLikedTracks(liked || []);

        if (settings?.visualStyle) {
          document.documentElement.setAttribute('data-visual', settings.visualStyle);
        } else {
          document.documentElement.setAttribute('data-visual', 'solid');
        }

        const initialTracks = settings?.cachedLibrary && settings.cachedLibrary.length > 0
          ? settings.cachedLibrary
          : (lib || []);
        setLibraryTracks(initialTracks);

        setContinueListening(settings?.continueListening || []);

        if (settings?.playHistory) {
          setPlayCounts(settings.playHistory);
          localStorage.setItem('track-play-counts', JSON.stringify(settings.playHistory));
        }

        const todayStr = new Date().toDateString();
        let recs = settings?.dailyRecommendations;
        if (!recs || recs.generatedDate !== todayStr || !recs.tracks || recs.tracks.length === 0) {
          const hist = settings?.playHistory || {};
          const recList = getRecommendations(initialTracks, hist);
          const shuffled = seededShuffle(recList, todayStr).slice(0, 8);
          recs = {
            generatedDate: todayStr,
            tracks: shuffled
          };
          await window.electronAPI.saveSettings({ dailyRecommendations: recs });
        }
        setRecommendations(recs.tracks || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }
  };

  const handleToggleLike = async (filePath: string) => {
    if (!window.electronAPI?.saveLikedTracks) return;

    const currentBasename = filePath.split(/[\\/]/).pop()?.toLowerCase();
    let isAlreadyLiked = false;
    let matchingPathInLiked: string | null = null;

    if (likedTracks.includes(filePath)) {
      isAlreadyLiked = true;
      matchingPathInLiked = filePath;
    } else if (currentBasename) {
      const foundPath = likedTracks.find(p => p.split(/[\\/]/).pop()?.toLowerCase() === currentBasename);
      if (foundPath) {
        isAlreadyLiked = true;
        matchingPathInLiked = foundPath;
      }
    }

    let updatedLikedTracks: string[];
    if (isAlreadyLiked && matchingPathInLiked) {
      updatedLikedTracks = likedTracks.filter(p => p !== matchingPathInLiked);
      addLog(`[liked] removed from liked songs: "${filePath.split(/[\\/]/).pop()}"`);
    } else {
      updatedLikedTracks = [...likedTracks, filePath];
      addLog(`[liked] added to liked songs: "${filePath.split(/[\\/]/).pop()}"`);

      if (dislikedTracks.includes(filePath)) {
        const updatedDisliked = dislikedTracks.filter(p => p !== filePath);
        setDislikedTracks(updatedDisliked);
        localStorage.setItem('northtracks-disliked-tracks', JSON.stringify(updatedDisliked));
      }
    }

    setLikedTracks(updatedLikedTracks);
    await window.electronAPI.saveLikedTracks(updatedLikedTracks);
  };

  const handleToggleDislike = (filePath: string) => {
    let updatedDisliked: string[];
    if (dislikedTracks.includes(filePath)) {
      updatedDisliked = dislikedTracks.filter(p => p !== filePath);
      addLog(`[disliked] removed from disliked songs: "${filePath.split(/[\\/]/).pop()}"`);
    } else {
      updatedDisliked = [...dislikedTracks, filePath];
      addLog(`[disliked] added to disliked songs: "${filePath.split(/[\\/]/).pop()}"`);

      const currentBasename = filePath.split(/[\\/]/).pop()?.toLowerCase();
      let isAlreadyLiked = false;
      let matchingPathInLiked: string | null = null;

      if (likedTracks.includes(filePath)) {
        isAlreadyLiked = true;
        matchingPathInLiked = filePath;
      } else if (currentBasename) {
        const foundPath = likedTracks.find(p => p.split(/[\\/]/).pop()?.toLowerCase() === currentBasename);
        if (foundPath) {
          isAlreadyLiked = true;
          matchingPathInLiked = foundPath;
        }
      }

      if (isAlreadyLiked && matchingPathInLiked) {
        const updatedLiked = likedTracks.filter(p => p !== matchingPathInLiked);
        setLikedTracks(updatedLiked);
        if (window.electronAPI?.saveLikedTracks) {
          window.electronAPI.saveLikedTracks(updatedLiked);
        }
      }
    }
    setDislikedTracks(updatedDisliked);
    localStorage.setItem('northtracks-disliked-tracks', JSON.stringify(updatedDisliked));
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onVisualStyleChanged) {
      const unsubscribe = window.electronAPI.onVisualStyleChanged((style: string) => {
        document.documentElement.setAttribute('data-visual', style);
      });
      return unsubscribe;
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!currentTrack || !currentTrack.coverArt) {
      setDominantColor({ r: 124, g: 92, b: 191 });
      document.documentElement.style.setProperty('--dominant-r', '124');
      document.documentElement.style.setProperty('--dominant-g', '92');
      document.documentElement.style.setProperty('--dominant-b', '191');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setDominantColor({ r: 124, g: 92, b: 191 });
          return;
        }
        ctx.drawImage(img, 0, 0, 10, 10);
        const imgData = ctx.getImageData(0, 0, 10, 10);
        const data = imgData.data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a > 0) {
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }
        }
        if (count > 0) {
          const rAvg = Math.round(rSum / count);
          const gAvg = Math.round(gSum / count);
          const bAvg = Math.round(bSum / count);
          setDominantColor({ r: rAvg, g: gAvg, b: bAvg });
          document.documentElement.style.setProperty('--dominant-r', String(rAvg));
          document.documentElement.style.setProperty('--dominant-g', String(gAvg));
          document.documentElement.style.setProperty('--dominant-b', String(bAvg));
        } else {
          setDominantColor({ r: 124, g: 92, b: 191 });
          document.documentElement.style.setProperty('--dominant-r', '124');
          document.documentElement.style.setProperty('--dominant-g', '92');
          document.documentElement.style.setProperty('--dominant-b', '191');
        }
      } catch (err) {
        console.error('Error extracting dominant color:', err);
        setDominantColor({ r: 124, g: 92, b: 191 });
        document.documentElement.style.setProperty('--dominant-r', '124');
        document.documentElement.style.setProperty('--dominant-g', '92');
        document.documentElement.style.setProperty('--dominant-b', '191');
      }
    };
    img.onerror = () => {
      setDominantColor({ r: 124, g: 92, b: 191 });
      document.documentElement.style.setProperty('--dominant-r', '124');
      document.documentElement.style.setProperty('--dominant-g', '92');
      document.documentElement.style.setProperty('--dominant-b', '191');
    };
    img.src = currentTrack.coverArt;
  }, [currentTrack]);

  useEffect(() => {
    const prefetchBrowseLibrary = async () => {
      if (window.electronAPI?.getGenreFolders) {
        try {
          const result = await window.electronAPI.getGenreFolders();
          setBrowseLibrary(result || []);
        } catch (e) {
          console.error('Failed to pre-load browse library:', e);
        }
      }
    };
    prefetchBrowseLibrary();
  }, []);

  useEffect(() => {
    setPlayerImageFailed(false);
  }, [currentTrack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
          (searchInput as HTMLInputElement).select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = repeatMode === 'one';
    }
  }, [repeatMode]);

  useEffect(() => {
    // Load saved EQ settings on start
    const saved = localStorage.getItem('eq-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.bands) {
          audioEngine.setAllEQBands(settings.bands);
        }
        if (settings.reverb !== undefined) {
          audioEngine.setReverb(settings.reverb);
        }
        if (settings.stereoWidth !== undefined) {
          audioEngine.setStereoWidth(settings.stereoWidth);
        }
      } catch (e) {
        console.error('Failed to load saved EQ settings:', e);
      }
    }

    if (audioRef.current) {
      audioEngine.initialize(audioRef.current);
    }
  }, []);

  useKeyboardShortcuts({
    onPlayPause: handleTogglePlay,
    onNext: handleNextTrack,
    onPrev: handlePrevTrack,
    onVolumeUp: () => {
      const newVol = Math.min(1, volume + 0.05);
      setVolume(newVol);
      if (audioRef.current) audioRef.current.volume = newVol;
    },
    onVolumeDown: () => {
      const newVol = Math.max(0, volume - 0.05);
      setVolume(newVol);
      if (audioRef.current) audioRef.current.volume = newVol;
    },
    onMute: () => {
      if (audioRef.current) {
        audioRef.current.muted = !audioRef.current.muted;
        setIsMuted(prev => !prev);
      }
    },
    onSeekForward: () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          duration,
          currentTime + 10
        );
      }
    },
    onSeekBackward: () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(
          0,
          currentTime - 10
        );
      }
    },
    onLike: () => {
      if (currentTrack) handleToggleLike(currentTrack.filePath);
    },
    onShowHelp: () => {
      setIsKeyboardHelpOpen(true);
    },
    isEnabled: true
  });

  const handleDashboardScan = async () => {
    if (loadingScan) return;

    let sourcePath = '';
    let settings: any = null;
    try {
      settings = await window.electronAPI?.getSettings();
      sourcePath = settings?.sourceFolderPath || 'D:\\Media\\Audio\\Music';
    } catch (e) {
      sourcePath = 'D:\\Media\\Audio\\Music';
    }

    setLoadingScan(true);
    addLog(`[dashboard] initiating quick scanning over: ${sourcePath}...`);
    try {
      if (window.electronAPI) {
        const rawTracks = await window.electronAPI.scanLibrary(sourcePath);

        // Apply overrides mapping (filename -> genre)
        const genreOverrides = settings?.genreOverrides || {};
        const mappedTracks = rawTracks.map((track: any) => {
          const filename = track.filePath.split(/[\\/]/).pop() || '';
          if (genreOverrides[filename] !== undefined) {
            return {
              ...track,
              genre: [genreOverrides[filename]]
            };
          }
          return track;
        });

        // Save to settings cachedLibrary & persist scan date
        const scanDate = new Date().toLocaleString();
        await window.electronAPI.saveSettings({
          lastScanDate: scanDate,
          cachedLibrary: mappedTracks
        });

        addLog('[dashboard] quick scan completed successfully.');
        await loadDashboardData();
      }
    } catch (err: any) {
      addLog(`[dashboard] scan failed: ${err.message}`);
      alert(`Scan failed: ${err.message}`);
    } finally {
      setLoadingScan(false);
    }
  };

  const handleCreatePlaylist = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setNewPlaylistName('');
    setShowCreatePlaylistModal(true);
  };

  const handleConfirmCreatePlaylist = async () => {
    const name = newPlaylistName.trim();
    if (name) {
      const newPlaylist = {
        id: Date.now().toString(),
        name,
        tracks: [],
        coverArt: undefined
      };
      const updated = [...playlists, newPlaylist];
      setPlaylists(updated);
      addLog(`[playlist] created new playlist: "${name}"`);
      setShowCreatePlaylistModal(false);
      setNewPlaylistName('');
      setSelectedPlaylistId(newPlaylist.id);
      setCurrentView('playlists');
      if (window.electronAPI?.savePlaylists) {
        await window.electronAPI.savePlaylists(updated);
      }
    }
  };

  const handleTrackContextMenu = (
    e: React.MouseEvent,
    track: Track,
    onEditGenre?: () => void
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      track,
      onEditGenre
    });
  };

  const handlePlayNext = (track: Track) => {
    setCurrentQueue(prev => {
      const filtered = prev.filter(t => t.filePath !== track.filePath);
      if (!currentTrack) {
        return [track];
      }
      const activeIdx = filtered.findIndex(t => t.filePath === currentTrack.filePath);
      if (activeIdx === -1) {
        return [track, ...filtered];
      }
      const newQueue = [...filtered];
      newQueue.splice(activeIdx + 1, 0, track);
      return newQueue;
    });
    addLog(`[queue] set to play next: "${track.title}"`);
  };

  const handleAddTrackToPlaylist = async (playlistId: string, track: Track) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    const updated = playlists.map(pl => {
      if (pl.id === playlistId) {
        if (pl.tracks.includes(track.filePath)) return pl;
        return {
          ...pl,
          tracks: [...pl.tracks, track.filePath]
        };
      }
      return pl;
    });
    setPlaylists(updated);
    addLog(`[playlist] added "${track.title}" to "${playlist.name}"`);
    if (window.electronAPI?.savePlaylists) {
      await window.electronAPI.savePlaylists(updated);
    }
  };

  const handleCreatePlaylistWithTrack = async (track: Track) => {
    const name = window.prompt("Enter new playlist name:");
    if (!name) return;
    const trimmed = name.trim();
    if (trimmed) {
      const newPlaylist = {
        id: Date.now().toString(),
        name: trimmed,
        tracks: [track.filePath],
        coverArt: undefined
      };
      const updated = [...playlists, newPlaylist];
      setPlaylists(updated);
      addLog(`[playlist] created playlist "${trimmed}" with track "${track.title}"`);
      if (window.electronAPI?.savePlaylists) {
        await window.electronAPI.savePlaylists(updated);
      }
    }
  };

  const handleEditGenreGeneral = async (track: Track) => {
    const newGenre = window.prompt(`Edit genre for "${track.title}":`, track.genre?.[0] || '');
    if (newGenre === null) return;
    const trimmed = newGenre.trim();

    const updatedLibrary = libraryTracks.map(t => {
      if (t.filePath === track.filePath) {
        return { ...t, genre: trimmed ? [trimmed] : [] };
      }
      return t;
    });
    setLibraryTracks(updatedLibrary);

    setBrowseLibrary(prev => prev.map(t => {
      if (t.filePath === track.filePath) {
        return { ...t, genre: trimmed ? [trimmed] : [] };
      }
      return t;
    }));

    if (window.electronAPI?.saveLibrary) {
      try {
        await window.electronAPI.saveLibrary(updatedLibrary);
        const settings = await window.electronAPI.getSettings();
        const updatedOverrides = { ...settings?.genreOverrides, [track.filePath.split(/[\\/]/).pop() || '']: trimmed };
        await window.electronAPI.saveSettings({
          genreOverrides: updatedOverrides,
          cachedLibrary: updatedLibrary
        });
        addLog(`[library] updated genre for "${track.title}" to "${trimmed || 'Unsorted'}"`);
      } catch (err) {
        console.error('Failed to save general genre edit:', err);
      }
    }
  };

  const handleEditTrackClick = (track: Track) => {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditArtist(track.artist);
    setEditCoverArt(track.coverArt || '');
  };

  const handleSaveTrackEdit = async () => {
    if (!editingTrack) return;

    const title = editTitle.trim();
    const artist = editArtist.trim();

    // Update track in libraryTracks state
    const updatedLibrary = libraryTracks.map(t => {
      if (t.filePath === editingTrack.filePath) {
        return { ...t, title, artist, coverArt: editCoverArt };
      }
      return t;
    });
    setLibraryTracks(updatedLibrary);

    // Update track in browseLibrary state
    setBrowseLibrary(prev => prev.map(t => {
      if (t.filePath === editingTrack.filePath) {
        return { ...t, title, artist, coverArt: editCoverArt };
      }
      return t;
    }));

    // Update current queue tracks
    setCurrentQueue(prev => prev.map(t => {
      if (t.filePath === editingTrack.filePath) {
        return { ...t, title, artist, coverArt: editCoverArt };
      }
      return t;
    }));

    // Update recently played
    setRecentlyPlayed(prev => prev.map(t => {
      if (t.filePath === editingTrack.filePath) {
        return { ...t, title, artist, coverArt: editCoverArt };
      }
      return t;
    }));

    // Update current track if playing
    if (currentTrack?.filePath === editingTrack.filePath) {
      setCurrentTrack(prev => prev ? { ...prev, title, artist, coverArt: editCoverArt } : null);
    }

    setEditingTrack(null);

    // Save to library.json
    if (window.electronAPI?.saveLibrary) {
      try {
        await window.electronAPI.saveLibrary(updatedLibrary);
        await window.electronAPI.saveSettings({ cachedLibrary: updatedLibrary });
      } catch (err) {
        console.error('Failed to save library after edit:', err);
      }
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    const currentPlaylist = playlists.find(p => p.id === id);
    if (!currentPlaylist) return;

    if (confirm(`Are you sure you want to delete the playlist "${currentPlaylist.name}"?`)) {
      const updated = playlists.filter(p => p.id !== id);
      setPlaylists(updated);
      setSelectedPlaylistId(null);
      addLog(`[playlist] deleted playlist: "${currentPlaylist.name}"`);
      if (window.electronAPI?.savePlaylists) {
        await window.electronAPI.savePlaylists(updated);
      }
    }
  };

  const handleRemoveTrackFromPlaylist = async (playlistId: string, filePath: string) => {
    const currentPlaylist = playlists.find(p => p.id === playlistId);
    const filename = filePath.split(/[\\/]/).pop() || '';

    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          tracks: p.tracks.filter((f: string) => f !== filePath)
        };
      }
      return p;
    });
    setPlaylists(updated);
    addLog(`[playlist] removed "${filename}" from "${currentPlaylist?.name}"`);
    if (window.electronAPI?.savePlaylists) {
      await window.electronAPI.savePlaylists(updated);
    }
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="app-container" style={{ position: 'relative' }}>

      {/* Main Workspace Frame */}
      <div className="main-content">

        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onViewChange={(view: any) => {
            setSelectedPlaylistId(null);
            if (view === 'preferences') {
              setSettingsCategory('directories');
            } else {
              setSettingsCategory(null);
            }
            setCurrentView(view);
          }}
          theme={theme === 'light' ? 'light' : 'dark'}
          onToggleTheme={toggleTheme}
          likedTracksCount={likedTracks.length}
          customPlaylists={playlists}
          settingsCategory={settingsCategory}
          setSettingsCategory={setSettingsCategory}
        />

        {/* Right Area: Main app layout container */}
        <div className="app-main" style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
          {/* Redesigned top titlebar/header component */}
          <Titlebar
            searchQuery={searchQuery}
            onSearch={handleSearch}
            libraryTracks={libraryTracks}
            onPlayTrack={handlePlayTrack}
            onNavigateHome={() => setCurrentView('home')}
          />

          {/* Floating Window Controls */}
          <WindowControls />

          <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', width: '100%', minHeight: 0 }}>
            <div className="app-content">
              {currentView === 'catalog' ? (
                <LibraryView
                  tracks={libraryTracks}
                  setTracks={setLibraryTracks}
                  onPlayTrack={handlePlayTrack}
                  likedTracks={likedTracks}
                  onToggleLike={handleToggleLike}
                  onEditTrack={handleEditTrackClick}
                  onAddToQueue={handleAddToQueue}
                  onTrackContextMenu={handleTrackContextMenu}
                  hasScannedInSession={hasScannedInSession}
                  setHasScannedInSession={setHasScannedInSession}
                  onNavigateToArtist={handleNavigateToArtist}
                />
              ) : currentView === 'home' ? (
                <HomeView
                  onNavigateToGenre={(genre) => { setBackTab('home'); setSelectedGenre(genre); setCurrentView('genre'); }}
                  onPlayTrack={handlePlayTrack}
                  tracks={browseLibrary}
                  playCounts={playCounts}
                  onEditTrack={handleEditTrackClick}
                  currentTrack={currentTrack}
                  onTrackContextMenu={handleTrackContextMenu}
                  recommendations={recommendations}
                  onRefreshRecommendations={handleRefreshRecommendations}
                  customPlaylists={playlists}
                  onOpenPlaylist={(id) => { setSelectedPlaylistId(id); setCurrentView('playlists'); }}
                  onNavigateToArtist={handleNavigateToArtist}
                  customGenreCovers={customGenreCovers}
                />
              ) : currentView === 'explore' ? (
                <ExploreView
                  onNavigateToGenre={(genre) => { setBackTab('explore'); setSelectedGenre(genre); setCurrentView('genre'); }}
                  tracks={browseLibrary}
                  playCounts={playCounts}
                  onPlayTrack={handlePlayTrack}
                  onEditTrack={handleEditTrackClick}
                  onNavigateToArtist={handleNavigateToArtist}
                />
              ) : currentView === 'genre' ? (
                <GenreView
                  genre={selectedGenre}
                  onBack={() => setCurrentView(backTab)}
                  tracks={browseLibrary.filter(t => {
                    const g = t.genre && t.genre[0] ? t.genre[0].trim().toLowerCase() : 'unsorted';
                    const target = selectedGenre.toLowerCase();
                    if (target === 'pop') return g.includes('pop');
                    if (target === 'rock') return g.includes('rock');
                    if (target === 'hip-hop') return g.includes('hip') || g.includes('rap');
                    if (target === 'indian') return g.includes('india') || g.includes('hindi') || g.includes('bollywood') || g.includes('indische') || g.includes('punjabi');
                    if (target === 'electronic') return g.includes('electro') || g.includes('edm') || g.includes('house') || g.includes('techno') || g.includes('dance');
                    if (target === 'soundtracks') return g.includes('soundtrack') || g.includes('ost') || g.includes('score') || g.includes('theme');
                    return g === target;
                  })}
                  onPlayTrack={handlePlayTrack}
                  onToggleLike={handleToggleLike}
                  likedTracks={likedTracks}
                  currentlyPlayingPath={currentTrack?.filePath}
                  isPlaying={isPlaying}
                  onEditTrack={handleEditTrackClick}
                  onAddToQueue={handleAddToQueue}
                  onTrackContextMenu={handleTrackContextMenu}
                  onNavigateToArtist={handleNavigateToArtist}
                  onCoverChange={handleGenreCoverChange}
                />
              ) : currentView === 'artist' ? (
                <ArtistView
                  artist={selectedArtist}
                  onBack={() => setCurrentView(backTab)}
                  tracks={browseLibrary.filter(t => {
                    if (!t.artist) return false;
                    const names = t.artist.split(/,\s*|&|;|\band\b/i).map(s => s.trim().toLowerCase());
                    return names.includes(selectedArtist.toLowerCase());
                  })}
                  onPlayTrack={handlePlayTrack}
                  onToggleLike={handleToggleLike}
                  likedTracks={likedTracks}
                  currentlyPlayingPath={currentTrack?.filePath}
                  isPlaying={isPlaying}
                  onEditTrack={handleEditTrackClick}
                  onAddToQueue={handleAddToQueue}
                  onTrackContextMenu={handleTrackContextMenu}
                  likedArtists={likedArtists}
                  onToggleLikeArtist={handleToggleLikeArtist}
                  onNavigateToArtist={handleNavigateToArtist}
                />
              ) : currentView === 'library' ? (
                <LibraryCardsView
                  customPlaylists={playlists}
                  likedTracksCount={likedTracks.length}
                  libraryTracks={libraryTracks}
                  onOpenPlaylist={(id) => {
                    setSelectedPlaylistId(id);
                    setCurrentView('playlists');
                  }}
                  onNewPlaylist={() => handleCreatePlaylist()}
                  onNavigateToGenre={(genre) => { setBackTab('library'); setSelectedGenre(genre); setCurrentView('genre'); }}
                  onNavigateToLiked={() => setCurrentView('liked')}
                />
              ) : currentView === 'liked' ? (
                <LikedView
                  browseLibrary={browseLibrary}
                  likedTracks={likedTracks}
                  onToggleLike={handleToggleLike}
                  onPlayTrack={handlePlayTrack}
                  currentlyPlayingPath={currentTrack?.filePath}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  onBack={() => setCurrentView('library')}
                  onTrackContextMenu={handleTrackContextMenu}
                />
              ) : currentView === 'preferences' ? (
                <SettingsView settingsCategory={settingsCategory} />
              ) : (
                <main className="content-area fade-in">
                  {/* TAB 1: DASHBOARD */}
                  {currentView === 'dashboard' && (
                    <>
                      {/* Welcome Banner */}
                      <div className="dashboard-header" style={{ marginBottom: '8px' }}>
                        <div>
                          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '4px' }}>
                            NorthTracks
                          </h1>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {today}
                          </p>
                        </div>
                        <button
                          className="button-primary"
                          onClick={handleDashboardScan}
                          disabled={loadingScan}
                        >
                          <RefreshCw size={14} className={loadingScan ? 'logo-icon' : ''} />
                          <span>{loadingScan ? 'Scanning...' : 'Scan Now'}</span>
                        </button>
                      </div>

                      {/* Metrics Row */}
                      <div className="dashboard-grid">
                        <div className="card">
                          <div className="stat-header">
                            <span>TOTAL TRACKS</span>
                            <Music size={14} className="stat-icon" />
                          </div>
                          <div className="metric-value">{libraryTracks.length}</div>
                          <div className="stat-desc">
                            <span>Indexed library audio files</span>
                          </div>
                        </div>

                        <div className="card">
                          <div className="stat-header">
                            <span>DUPLICATES DETECTED</span>
                            <AlertTriangle size={14} className="stat-icon" style={{ color: 'var(--warning)' }} />
                          </div>
                          <div className="metric-value" style={{ color: libraryTracks.filter(t => t.isDuplicate).length > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                            {libraryTracks.filter(t => t.isDuplicate).length}
                          </div>
                          <div className="stat-desc">
                            <span>Skip-marked audio duplicates</span>
                          </div>
                        </div>

                        <div className="card">
                          <div className="stat-header">
                            <span>GENRES FOUND</span>
                            <Sparkles size={14} className="stat-icon" />
                          </div>
                          <div className="metric-value">
                            {(() => {
                              const uniqueGenres = new Set<string>();
                              libraryTracks.forEach(t => {
                                if (t.genre && t.genre.length > 0 && t.genre[0].trim()) {
                                  uniqueGenres.add(t.genre[0].trim());
                                }
                              });
                              return uniqueGenres.size;
                            })()}
                          </div>
                          <div className="stat-desc">
                            <span>Unique categorized audio genres</span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Activity Section */}
                      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TerminalIcon size={16} style={{ color: 'var(--primary)' }} />
                          <span>Recent Activity</span>
                        </h3>
                        <div className="recent-list" style={{ marginTop: '0px' }}>
                          {activities.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                              No recent activity logs found.
                            </div>
                          ) : (
                            activities.slice(0, 5).map((act, idx) => (
                              <div className="recent-item" key={idx} style={{ padding: '10px 12px' }}>
                                <div className="item-info">
                                  <div className="item-icon-box" style={{ width: '28px', height: '28px' }}>
                                    {act.source === 'Scanner Indexer' ? <RefreshCw size={12} /> : <Copy size={12} />}
                                  </div>
                                  <div className="item-details">
                                    <h4 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                      {act.source === 'Scanner Indexer'
                                        ? act.error || 'Scanned source library.'
                                        : `Copied "${act.source.split(/[\\/]/).pop() || ''}" to organized genre folder: ${act.destination.split(/[\\/]/).slice(-2, -1)[0] || 'Unsorted'}`
                                      }
                                    </h4>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {new Date(act.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <span className={`status-badge ${act.status === 'success' ? 'success' : 'warning'}`}>
                                  {act.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* TAB 2: PLAYLISTS */}
                  {currentView === 'playlists' && (
                    <PlaylistsView
                      playlists={playlists}
                      selectedPlaylistId={selectedPlaylistId}
                      libraryTracks={libraryTracks}
                      onPlayTrack={handlePlayTrack}
                      onNewPlaylist={() => handleCreatePlaylist()}
                      onDeletePlaylist={handleDeletePlaylist}
                      onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
                      onSavePlaylists={async (updated) => {
                        setPlaylists(updated);
                        if (window.electronAPI?.savePlaylists) {
                          await window.electronAPI.savePlaylists(updated);
                        }
                      }}
                      setCurrentView={(v) => setCurrentView(v as any)}
                    />
                  )}

                  {/* TAB 3: TERMINAL LOGS */}
                  {currentView === 'terminal' && (
                    <div className="fade-in" style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>Local Console logs</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Compiler, builder outputs, and system tasks</p>
                      </div>

                      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
                        <div className="mock-terminal" style={{ flex: 1 }}>
                          <div className="terminal-header">
                            <span>northtracks-terminal</span>
                            <button
                              onClick={() => setLogs(['[system] log cache cleared.'])}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                            >
                              Clear Logs
                            </button>
                          </div>
                          <div className="terminal-lines" style={{ padding: '8px 0' }}>
                            {logs.map((log, idx) => {
                              let className = 'terminal-line';
                              if (log.includes('[system]')) className += ' cmd';
                              if (log.includes('success') || log.includes('complete')) className += ' success';
                              return (
                                <div className={className} key={idx}>
                                  {log}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                </main>
              )}
            </div> {/* Close app-content */}

            {/* Queue Drawer */}
            <div className={`queue-drawer ${isQueueOpen ? 'queue-drawer-open' : 'queue-drawer-closed'}`}>
              <div className="queue-drawer-header">
                <h3>Play Queue</h3>
                <button onClick={() => setIsQueueOpen(false)} className="close-drawer-btn">
                  <X size={16} />
                </button>
              </div>
              <div className="queue-drawer-list">
                {currentQueue.length === 0 ? (
                  <div className="queue-drawer-empty">Queue is empty</div>
                ) : (
                  currentQueue.map((track, idx) => {
                    const isActive = currentTrack?.filePath === track.filePath;
                    return (
                      <div
                        key={`queue-${track.filePath}-${idx}`}
                        className={`queue-drawer-item ${isActive ? 'active' : ''}`}
                        onClick={() => handlePlayTrack(track)}
                      >
                        <div className="queue-drawer-index">{idx + 1}</div>
                        {track.coverArt ? (
                          <img className="queue-drawer-art" src={track.coverArt} alt="" />
                        ) : (
                          <div className="queue-drawer-art-placeholder">
                            <Music2 size={12} />
                          </div>
                        )}
                        <div className="queue-drawer-meta">
                          <div className="queue-drawer-title" title={track.title}>{track.title}</div>
                          <div className="queue-drawer-artist" title={track.artist}>{track.artist}</div>
                        </div>
                        <div className="queue-drawer-duration">{formatTime(track.duration)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <EQPanel
            isOpen={isEQOpen}
            onClose={() => setIsEQOpen(false)}
            audioEngine={audioEngine}
          />

          <KeyboardHelpModal
            isOpen={isKeyboardHelpOpen}
            onClose={() => setIsKeyboardHelpOpen(false)}
          />

          <PlayerBar
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            setVolume={(vol) => {
              setVolume(vol);
              if (audioRef.current) {
                audioRef.current.volume = vol;
              }
            }}
            isMuted={isMuted}
            setIsMuted={(muted) => {
              setIsMuted(muted);
              if (audioRef.current) {
                audioRef.current.muted = muted;
              }
            }}
            isShuffle={isShuffle}
            setIsShuffle={setIsShuffle}
            repeatMode={repeatMode}
            handleToggleRepeat={handleToggleRepeat}
            likedTracks={likedTracks}
            handleToggleLike={handleToggleLike}
            dislikedTracks={dislikedTracks}
            handleToggleDislike={handleToggleDislike}
            handlePrevTrack={handlePrevTrack}
            handleNextTrack={handleNextTrack}
            handleTogglePlay={handleTogglePlay}
            isQueueOpen={isQueueOpen}
            setIsQueueOpen={setIsQueueOpen}
            showNowPlaying={showNowPlaying}
            setShowNowPlaying={setShowNowPlaying}
            showPlayerMoreMenu={showPlayerMoreMenu}
            setShowPlayerMoreMenu={setShowPlayerMoreMenu}
            isEQOpen={isEQOpen}
            setIsEQOpen={setIsEQOpen}
            isKeyboardHelpOpen={isKeyboardHelpOpen}
            setIsKeyboardHelpOpen={setIsKeyboardHelpOpen}
            setCurrentView={(v) => setCurrentView(v as any)}
            setSettingsCategory={setSettingsCategory}
            addLog={addLog}
            toggleFullscreen={toggleFullscreen}
            onSeek={handleSeek}
            onShowInfo={setInfoTrack}
            playlists={playlists}
            onAddToPlaylist={handleAddTrackToPlaylist}
            onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
          />
        </div> {/* Close app-main */}
      </div> {/* Close main-content */}

      {/* Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onDurationChange={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={handleTrackEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          if (currentTrack && audioRef.current) {
            updateContinueListening(currentTrack, audioRef.current.currentTime, audioRef.current.duration);
          }
        }}
      />

      {showNowPlaying && (
        <NowPlayingView
          currentTrack={currentTrack}
          tracks={currentQueue}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isShuffle={isShuffle}
          onToggleShuffle={() => setIsShuffle(!isShuffle)}
          repeatMode={repeatMode}
          onToggleRepeat={handleToggleRepeat}
          likedTracks={likedTracks}
          onToggleLike={handleToggleLike}
          onPlayTrack={handlePlayTrack}
          onTogglePlay={handleTogglePlay}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          onSeek={handleSeek}
          onClose={() => setShowNowPlaying(false)}
        />
      )}

      {/* Custom Playlist Creation Modal */}
      {showCreatePlaylistModal && (
        <div className="modal-overlay">
          <div className="settings-modal fade-in" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Create New Playlist</h3>
              <button className="close-modal-btn" onClick={() => { setShowCreatePlaylistModal(false); setNewPlaylistName(''); }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Playlist Name</label>
                <input
                  type="text"
                  placeholder="My Playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      await handleConfirmCreatePlaylist();
                    }
                  }}
                  autoFocus
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px',
                    width: '100%',
                    marginTop: '6px'
                  }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid var(--border-light)' }}>
              <button
                className="btn-secondary"
                onClick={() => { setShowCreatePlaylistModal(false); setNewPlaylistName(''); }}
                style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-primary)', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                className="btn-accent"
                onClick={handleConfirmCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: 500 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Track Editor Modal */}
      {editingTrack && (
        <div className="modal-overlay">
          <div className="settings-modal fade-in" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Edit Track Metadata</h3>
              <button className="close-modal-btn" onClick={() => setEditingTrack(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  onClick={() => document.getElementById('edit-track-image-input')?.click()}
                  title="Click to change cover image"
                >
                  {editCoverArt ? (
                    <img src={editCoverArt} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Music2 size={24} style={{ color: 'var(--text-muted)' }} />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      fontSize: '9px',
                      textAlign: 'center',
                      padding: '2px 0'
                    }}
                  >
                    Upload
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontSize: '11px' }}>Original File Path</small>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={editingTrack.filePath}>
                    {editingTrack.filePath}
                  </div>
                </div>
              </div>

              <input
                type="file"
                id="edit-track-image-input"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setEditCoverArt(event.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Track Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Song Title"
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px',
                    width: '100%'
                  }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Artist</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  placeholder="Artist"
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px',
                    width: '100%'
                  }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid var(--border-light)' }}>
              <button
                className="btn-secondary"
                onClick={() => setEditingTrack(null)}
                style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-primary)', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                className="btn-accent"
                onClick={handleSaveTrackEdit}
                style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: 500 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={contextMenu.track}
          isLiked={likedTracks.includes(contextMenu.track.filePath) || (!!contextMenu.track.filePath.split(/[\\/]/).pop()?.toLowerCase() && likedTracks.some(p => p.split(/[\\/]/).pop()?.toLowerCase() === contextMenu.track.filePath.split(/[\\/]/).pop()?.toLowerCase()))}
          playlists={playlists}
          onClose={() => setContextMenu(null)}
          onPlayNow={() => handlePlayTrack(contextMenu.track)}
          onPlayNext={() => handlePlayNext(contextMenu.track)}
          onAddToQueue={() => handleAddToQueue(contextMenu.track)}
          onToggleLike={() => handleToggleLike(contextMenu.track.filePath)}
          onAddToPlaylist={(plId) => handleAddTrackToPlaylist(plId, contextMenu.track)}
          onCreatePlaylistWithTrack={() => handleCreatePlaylistWithTrack(contextMenu.track)}
          onShowInExplorer={async () => {
            if (window.electronAPI?.showInExplorer) {
              await window.electronAPI.showInExplorer(contextMenu.track.filePath);
            }
          }}
          onCopyPath={() => {
            navigator.clipboard.writeText(contextMenu.track.filePath);
            addLog(`[system] copied track path to clipboard: "${contextMenu.track.filePath}"`);
          }}
          onEditGenre={() => {
            if (contextMenu.onEditGenre) {
              contextMenu.onEditGenre();
            } else {
              handleEditGenreGeneral(contextMenu.track);
            }
          }}
          onShowInfo={() => setInfoTrack(contextMenu.track)}
        />
      )}

      {infoTrack && (
        <TrackInfoModal
          track={infoTrack}
          onClose={() => setInfoTrack(null)}
        />
      )}
    </div>
  );
}
