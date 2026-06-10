import React, { useState, useEffect, useRef } from 'react';
import { AppIcon } from './AppIcon';
import { ArtistLinks } from './ArtistLinks';
import { 
  FolderOpen,
  FolderSearch,
  Search, 
  Settings as SettingsIcon, 
  RefreshCw, 
  Copy, 
  AlertTriangle, 
  X, 
  CheckCircle,
  Clock,
  Music,
  FolderSync,
  Heart,
  MoreVertical,
  Trash2,
  Pencil,
  Check
} from 'lucide-react';

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
}

interface AppSettings {
  sourceFolderPath: string;
  destinationFolderPath: string;
  lastScanDate: string;
  genreOverrides: Record<string, string>;
}

interface DuplicatePair {
  original: Track;
  duplicate: Track;
  key: string;
}

const detectDuplicates = (tracksList: Track[]): Track[] => {
  const resetTracks = tracksList.map(t => ({ ...t, isDuplicate: false }));
  const groups = new Map<string, number[]>();
  resetTracks.forEach((track, index) => {
    const key = `${track.title.toLowerCase().trim()}|${track.artist.toLowerCase().trim()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(index);
  });

  groups.forEach((indices) => {
    if (indices.length > 1) {
      for (let i = 0; i < indices.length - 1; i++) {
        resetTracks[indices[i]].isDuplicate = true;
      }
    }
  });
  return resetTracks;
};

interface LibraryViewProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  onPlayTrack?: (track: Track, queue?: Track[]) => void;
  likedTracks: string[];
  onToggleLike: (filePath: string) => void;
  onEditTrack?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track, onEditGenre?: () => void) => void;
  hasScannedInSession: boolean;
  setHasScannedInSession: (val: boolean) => void;
  onNavigateToArtist: (artistName: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ 
  tracks, 
  setTracks, 
  onPlayTrack, 
  likedTracks,
  onToggleLike,
  onEditTrack,
  onAddToQueue,
  onTrackContextMenu,
  hasScannedInSession,
  setHasScannedInSession,
  onNavigateToArtist
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AppSettings>({
    sourceFolderPath: '',
    destinationFolderPath: '',
    lastScanDate: '',
    genreOverrides: {},
  });

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Manage collapse state of the source setup card
  const [isCardCollapsed, setIsCardCollapsed] = useState(true);

  useEffect(() => {
    if (settings.sourceFolderPath && tracks.length > 0) {
      setIsCardCollapsed(true);
    } else {
      setIsCardCollapsed(false);
    }
  }, [settings.sourceFolderPath, tracks.length === 0]);

  useEffect(() => {
    const closeAll = () => setActiveDropdown(null);
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings Form State
  const [srcPathInput, setSrcPathInput] = useState('');
  const [destPathInput, setDestPathInput] = useState('');

  // Inline Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingGenre, setEditingGenre] = useState('');

  // Inline metadata editing form state
  const [expandedTrackPath, setExpandedTrackPath] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editGenreState, setEditGenreState] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [saveSuccessPath, setSaveSuccessPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // Image load error tracking
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Copy Progress & Summary States
  const [isCopying, setIsCopying] = useState(false);
  const [copyProgress, setCopyProgress] = useState<{ current: number; total: number } | null>(null);
  const [copySummary, setCopySummary] = useState<{
    successCount: number;
    failedCount: number;
    duplicateCount: number;
    unsortedCount: number;
  } | null>(null);

  // Playlist management
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);

  // Duplicate manager state
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);
  const [skippedPaths, setSkippedPaths] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    isOpen: boolean;
    filePaths: string[];
    count: number;
  }>({ isOpen: false, filePaths: [], count: 0 });

  const loadPlaylists = async () => {
    if (window.electronAPI?.getPlaylists) {
      const pl = await window.electronAPI.getPlaylists();
      setPlaylists(pl || []);
    }
  };

  const handleSkipPair = (pair: DuplicatePair) => {
    setSkippedPaths(prev => [...prev, pair.duplicate.filePath]);
  };

  const handleKeepVersion = async (pair: DuplicatePair, keep: 'original' | 'duplicate') => {
    if (!window.electronAPI?.deleteFile) {
      showNotification('error', 'API for deleting files is not available.');
      return;
    }

    const fileToDelete = keep === 'original' ? pair.duplicate.filePath : pair.original.filePath;

    try {
      showNotification('info', `Deleting file: ${fileToDelete.split(/[\\/]/).pop()}...`);
      await window.electronAPI.deleteFile(fileToDelete);
      
      // Update tracks state
      let updatedTracks = tracks.filter(t => t.filePath !== fileToDelete);
      
      // Re-run duplicate detection on remaining tracks list
      updatedTracks = detectDuplicates(updatedTracks);

      setTracks(updatedTracks);
      showNotification('success', `Deleted duplicate file successfully.`);

      // Persist the updated library cache to settings and library JSON file
      await window.electronAPI.saveLibrary(updatedTracks);
      await window.electronAPI.saveSettings({ cachedLibrary: updatedTracks });

    } catch (err: any) {
      showNotification('error', `Failed to delete file: ${err.message}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.electronAPI?.deleteFile) {
      showNotification('error', 'API for deleting files is not available.');
      return;
    }

    if (selectedPaths.length === 0) return;

    if (!confirm(`Are you sure you want to delete the ${selectedPaths.length} selected duplicate files from disk? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    showNotification('info', `Deleting ${selectedPaths.length} files...`);

    let successCount = 0;
    let failedCount = 0;

    for (const filePath of selectedPaths) {
      try {
        await window.electronAPI.deleteFile(filePath);
        successCount++;
      } catch (e) {
        failedCount++;
      }
    }

    // 1. Remove deleted files from state
    let remainingTracks = tracks.filter(t => !selectedPaths.includes(t.filePath));

    // 2. Re-detect duplicates on remaining tracks
    remainingTracks = detectDuplicates(remainingTracks);

    setTracks(remainingTracks);

    // 3. Clear selection state
    setSelectedPaths([]);

    // 4. Persist updated library
    try {
      await window.electronAPI.saveLibrary(remainingTracks);
      await window.electronAPI.saveSettings({ cachedLibrary: remainingTracks });
      showNotification('success', `Successfully deleted ${successCount} files.`);
    } catch (err) {
      showNotification('error', 'Failed to update library store.');
    }

    setLoading(false);
  };

  const handleRemoveAllDuplicates = async () => {
    if (!window.electronAPI?.deleteFile) {
      showNotification('error', 'API for deleting files is not available.');
      return;
    }

    const duplicates = tracks.filter(t => t.isDuplicate);
    if (duplicates.length === 0) return;

    if (!confirm(`Are you sure you want to delete all ${duplicates.length} duplicate files from disk? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    showNotification('info', `Deleting ${duplicates.length} duplicate files...`);

    let successCount = 0;
    let failedCount = 0;

    for (const track of duplicates) {
      try {
        await window.electronAPI.deleteFile(track.filePath);
        successCount++;
      } catch (e) {
        failedCount++;
      }
    }

    // 1. Remove deleted files from state
    let remainingTracks = tracks.filter(t => !duplicates.some(d => d.filePath === t.filePath));

    // 2. Re-detect duplicates on remaining tracks
    remainingTracks = detectDuplicates(remainingTracks);

    setTracks(remainingTracks);
    setSelectedPaths([]);

    // 3. Persist updated library
    try {
      await window.electronAPI.saveLibrary(remainingTracks);
      await window.electronAPI.saveSettings({ cachedLibrary: remainingTracks });
      showNotification('success', `Successfully deleted all duplicate files.`);
    } catch (err) {
      showNotification('error', 'Failed to update library store.');
    }

    setLoading(false);
  };

  const handleAddToPlaylist = async (playlistId: string, track: Track) => {
    const updatedPlaylists = playlists.map(pl => {
      if (pl.id === playlistId) {
        if (pl.tracks.includes(track.filePath)) return pl;
        return {
          ...pl,
          tracks: [...pl.tracks, track.filePath]
        };
      }
      return pl;
    });

    setPlaylists(updatedPlaylists);
    setSelectedTrackForPlaylist(null);
    showNotification('success', `Added "${track.title}" to playlist.`);

    if (window.electronAPI?.savePlaylists) {
      await window.electronAPI.savePlaylists(updatedPlaylists);
    }
  };

  useEffect(() => {
    loadSettingsAndData();
    loadPlaylists();

    // Listen to progress updates from organizer main process
    let unsubscribeProgress: (() => void) | undefined;
    if (window.electronAPI?.onOrganizeProgress) {
      unsubscribeProgress = window.electronAPI.onOrganizeProgress((progress: { current: number; total: number }) => {
        setCopyProgress(progress);
      });
    }

    return () => {
      if (unsubscribeProgress) {
        unsubscribeProgress();
      }
    };
  }, []);

  const loadSettingsAndData = async () => {
    if (window.electronAPI) {
      try {
        const currentSettings = await window.electronAPI.getSettings();
        setSettings(currentSettings);
        setSrcPathInput(currentSettings.sourceFolderPath);
        setDestPathInput(currentSettings.destinationFolderPath);
      } catch (err) {
        showNotification('error', 'Failed to retrieve application configuration settings.');
      }
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // 1. Scan Library Source
  const handleScan = async (pathToScan?: string) => {
    const targetPath = (typeof pathToScan === 'string' ? pathToScan : null) || settings.sourceFolderPath;
    if (!targetPath) {
      showNotification('error', 'Please select or configure a source folder first.');
      return;
    }

    setLoading(true);
    setCopySummary(null); // Clear previous summary
    showNotification('info', 'Scanning source folder recursively...');

    try {
      if (window.electronAPI) {
        let currentSettings = settings;
        if (targetPath !== settings.sourceFolderPath) {
          currentSettings = await window.electronAPI.saveSettings({ 
            sourceFolderPath: targetPath 
          });
          setSettings(currentSettings);
        }

        const rawTracks = await window.electronAPI.scanLibrary(targetPath);
        
        // Apply overrides mapping (filename -> genre)
        const mappedTracks = rawTracks.map((track: Track) => {
          const filename = track.filePath.split(/[\\/]/).pop() || '';
          if (currentSettings.genreOverrides[filename] !== undefined) {
            return {
              ...track,
              genre: [currentSettings.genreOverrides[filename]]
            };
          }
          return track;
        });

        // Persist scan date and save library tracks
        const scanDate = new Date().toLocaleString();
        await window.electronAPI.saveLibrary(mappedTracks);
        const updatedSettings = await window.electronAPI.saveSettings({ 
          lastScanDate: scanDate,
          cachedLibrary: mappedTracks
        });
        setSettings(updatedSettings);
        setTracks(mappedTracks);
        setIsCardCollapsed(true);
        setHasScannedInSession(true);
        showNotification('success', `Scan complete. Found ${mappedTracks.length} tracks.`);
      }
    } catch (err: any) {
      showNotification('error', `Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Inline editing helpers
  const startEditing = (index: number, track: Track) => {
    setEditingIndex(index);
    setEditingGenre(track.genre[0] || '');
  };

  const saveInlineGenre = async (index: number) => {
    if (editingIndex === null) return;

    const track = tracks[index];
    const filename = track.filePath.split(/[\\/]/).pop() || '';
    const newGenre = editingGenre.trim();

    // 1. Update state locally
    const updatedTracks = [...tracks];
    updatedTracks[index] = {
      ...track,
      genre: newGenre ? [newGenre] : []
    };
    setTracks(updatedTracks);

    // 2. Persist to settings & library JSON file
    if (window.electronAPI) {
      try {
        const updatedOverrides = { ...settings.genreOverrides, [filename]: newGenre };
        
        // Save using saveLibrary handler (to library.json)
        await window.electronAPI.saveLibrary(updatedTracks);
        
        // Also sync settings cachedLibrary
        const updatedSettings = await window.electronAPI.saveSettings({ 
          genreOverrides: updatedOverrides,
          cachedLibrary: updatedTracks
        });
        setSettings(updatedSettings);
      } catch (err) {
        showNotification('error', 'Failed to save inline genre override.');
      }
    }

    setEditingIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      saveInlineGenre(index);
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
    }
  };

  const startInlineEditing = (track: Track) => {
    if (expandedTrackPath === track.filePath) {
      setExpandedTrackPath(null);
      return;
    }
    setExpandedTrackPath(track.filePath);
    setEditTitle(track.title || '');
    setEditArtist(track.artist || '');
    setEditAlbum(track.album || '');
    setEditGenreState(track.genre?.[0] || '');
    setEditImage(track.coverArt || null);
    setSaveSuccessPath(null);
  };

  const cancelInlineEditing = () => {
    setExpandedTrackPath(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, track: Track) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setEditImage(reader.result);
          setFailedImages(prev => ({ ...prev, [track.filePath + '_edit']: false }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveInlineMetadata = async (track: Track) => {
    if (isSavingMetadata) return;
    setIsSavingMetadata(true);

    try {
      if (window.electronAPI?.writeTrackMetadata) {
        const result = await window.electronAPI.writeTrackMetadata(track.filePath, {
          title: editTitle,
          artist: editArtist,
          album: editAlbum,
          genre: editGenreState,
          image: editImage
        });

        if (result && result.success) {
          const updatedTracks = tracks.map(t => {
            if (t.filePath === track.filePath) {
              return {
                ...t,
                title: editTitle,
                artist: editArtist,
                album: editAlbum,
                genre: editGenreState ? [editGenreState] : [],
                coverArt: editImage || t.coverArt
              };
            }
            return t;
          });
          setTracks(updatedTracks);

          try {
            await window.electronAPI.saveLibrary(updatedTracks);
            const updatedSettings = await window.electronAPI.saveSettings({
              cachedLibrary: updatedTracks
            });
            setSettings(updatedSettings);
          } catch (persistErr) {
            console.error('Failed to sync library cache files:', persistErr);
          }

          setSaveSuccessPath(track.filePath);

          setTimeout(() => {
            setExpandedTrackPath(null);
            setSaveSuccessPath(null);
          }, 1000);
        } else {
          showNotification('error', result?.error || 'Failed to update track metadata');
        }
      } else {
        showNotification('error', 'Metadata writing API is not available.');
      }
    } catch (err: any) {
      showNotification('error', `Error writing metadata: ${err.message || err}`);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // 3. Copy/Organize operation
  const handleOrganize = async () => {
    if (tracks.length === 0) {
      showNotification('info', 'No tracks parsed. Scan your source folder first.');
      return;
    }

    setLoading(true);
    setIsCopying(true);
    setCopySummary(null);

    // Calculate unique count to copy
    const uniqueCount = tracks.filter(t => !t.isDuplicate).length;
    setCopyProgress({ current: 0, total: uniqueCount });
    showNotification('info', 'Copying unique files to organized genre directories...');

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.organizeLibrary(tracks);
        setCopySummary({
          successCount: result.successCount,
          failedCount: result.failedCount,
          duplicateCount: result.duplicateCount,
          unsortedCount: result.unsortedCount
        });
        showNotification(
          'success',
          `Import finished. Copied: ${result.successCount} files, Skipped/Failed: ${result.failedCount} files.`
        );
        if (result.successCount > 0 && result.logs) {
          const copiedFilePaths = result.logs
            .filter((log: any) => log.status === 'success')
            .map((log: any) => log.source);
          if (copiedFilePaths.length > 0) {
            setDeleteConfirmData({
              isOpen: true,
              filePaths: copiedFilePaths,
              count: copiedFilePaths.length
            });
          }
        }
      }
    } catch (err: any) {
      showNotification('error', `Organizer failed: ${err.message}`);
    } finally {
      setLoading(false);
      setIsCopying(false);
      setCopyProgress(null);
    }
  };

  const handleReorganizeFolders = async () => {
    setLoading(true);
    showNotification('info', 'Reorganizing destination music directory structure...');
    try {
      if (window.electronAPI?.reorganizeFolders) {
        const result = await window.electronAPI.reorganizeFolders();
        showNotification(
          'success',
          `Reorganized ${result.filesMoved} files across ${result.foldersRenamed} folders.`
        );
      } else {
        showNotification('error', 'API for folder reorganization is not available.');
      }
    } catch (err: any) {
      showNotification('error', `Reorganization failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. Settings update
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        const updated = await window.electronAPI.saveSettings({
          sourceFolderPath: srcPathInput,
          destinationFolderPath: destPathInput
        });
        setSettings(updated);
        setShowSettings(false);
        showNotification('success', 'Configuration settings saved successfully.');
      } catch (err: any) {
        showNotification('error', `Failed to save settings: ${err.message}`);
      }
    }
  };

  // Duration Formatter (MM:SS)
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Search Filter
  const filteredTracks = tracks.filter(t => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const titleMatch = t.title?.toLowerCase().includes(query);
    const artistMatch = t.artist?.toLowerCase().includes(query);
    const genreMatch = t.genre?.some(g => g?.toLowerCase().includes(query));
    return titleMatch || artistMatch || genreMatch;
  });

  return (
    <div className="library-view">
      {/* Top Toolbar */}
      <div className="library-toolbar">
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Music size={18} className="library-brand-icon" />
          <h2>Media Catalog</h2>
          {hasScannedInSession && (
            <span style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              background: 'var(--bg-main)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginLeft: '8px'
            }}>
              {tracks.length} tracks found
            </span>
          )}
        </div>
        <div className="toolbar-right">
          <button className="toolbar-btn" onClick={() => handleScan()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'logo-icon' : ''} />
            <span>Scan Source</span>
          </button>
          <button className="toolbar-btn" onClick={handleOrganize} disabled={loading}>
            <Copy size={14} />
            <span>Copy to Music Folder</span>
          </button>
          <button className="toolbar-btn" onClick={handleReorganizeFolders} disabled={loading}>
            <FolderSync size={14} />
            <span>Reorganize Folders</span>
          </button>
          {tracks.some(t => t.isDuplicate) && (
            <button className="toolbar-btn" onClick={() => setShowDuplicateManager(true)}>
              <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
              <span>Manage Duplicates</span>
            </button>
          )}
          <button className="toolbar-btn settings" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={14} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`notification-banner ${notification.type}`}>
          <div className="banner-content">
            {notification.type === 'success' && <CheckCircle size={16} />}
            {notification.type === 'error' && <AlertTriangle size={16} />}
            {notification.type === 'info' && <RefreshCw size={16} className="logo-icon" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Source Folder Setup Card */}
      {isCardCollapsed && settings.sourceFolderPath && tracks.length > 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <FolderOpen size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Source Folder: <strong>{settings.sourceFolderPath}</strong>
          </span>
          <button 
            type="button" 
            onClick={() => {
              setIsCardCollapsed(false);
              setTracks([]);
              setHasScannedInSession(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '4px',
              marginLeft: 'auto',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Change
          </button>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <FolderOpen size={24} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text" 
              value={srcPathInput}
              onChange={(e) => {
                setSrcPathInput(e.target.value);
                setTracks([]);
                setHasScannedInSession(false);
              }}
              placeholder="Select source folder..."
              style={{
                flex: 1,
                background: 'var(--bg-main)',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
            <button 
              type="button" 
              className="btn-browse" 
              onClick={async () => {
                if (window.electronAPI?.selectFolder) {
                  const selected = await window.electronAPI.selectFolder();
                  if (selected) {
                    setSrcPathInput(selected);
                    setTracks([]);
                    setHasScannedInSession(false);
                  }
                }
              }}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
              }}
            >
              <span>Browse</span>
            </button>
          </div>
          <button 
            type="button" 
            className="button-primary"
            onClick={() => handleScan(srcPathInput)}
            disabled={loading}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              flexShrink: 0
            }}
          >
            {loading ? <span>Scanning...</span> : <span>Scan Now</span>}
          </button>
        </div>
      )}

      {!hasScannedInSession ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
          <FolderSearch size={48} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            No tracks scanned yet
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '360px', margin: 0, textAlign: 'center' }}>
            Set your source folder above and click Scan Source to load your music files
          </p>
        </div>
      ) : (
        <>
          {/* Search and Stats Section */}
          <div className="library-actions">
            <div className="search-container">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search songs, artists, genres..." 
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

          {/* Tracks Grid table */}
          <div className="table-container">
            {tracks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" style={{ opacity: 0.5, marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <AppIcon size={48} />
                </div>
                <h3>No Audio Tracks Found</h3>
                <p>Click "Scan Now" to search files inside your configured media source directory.</p>
                <button className="button-primary" style={{ marginTop: '12px' }} onClick={() => handleScan()} disabled={loading}>
                  <RefreshCw size={14} className={loading ? 'logo-icon' : ''} />
                  <span>Scan Now</span>
                </button>
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="empty-state">
                <Search size={48} className="empty-icon" />
                <h3>No Matches Found</h3>
                <p>No tracks matching "{searchQuery}" were found in your library.</p>
              </div>
            ) : (
              <table className="tracks-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}></th>
                <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                <th>Title</th>
                <th>Genre</th>
                <th style={{ width: '100px', textAlign: 'center' }}><Clock size={14} /></th>
                <th style={{ width: '140px', textAlign: 'center' }}>Duplicate Status</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.map((track, idx) => {
                const classes = [];
                if (track.isDuplicate) classes.push('duplicate-row');

                const currentBasename = track.filePath.split(/[\\/]/).pop()?.toLowerCase();
                const isLiked = likedTracks.includes(track.filePath) || 
                  (!!currentBasename && likedTracks.some(p => p.split(/[\\/]/).pop()?.toLowerCase() === currentBasename));

                return (
                  <React.Fragment key={track.filePath || idx}>
                    <tr 
                      className={classes.join(' ')}
                      onContextMenu={(e) => onTrackContextMenu?.(e, track, () => startEditing(idx, track))}
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
                          <div style={{ 
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
                          }}>
                            <Music size={16} />
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td 
                        className="track-title-cell" 
                        title={track.filePath}
                        onClick={() => onPlayTrack?.(track, filteredTracks)}
                      >
                        <div className="track-title-text">
                          {track.title.replace(/\s*[\(\[](feat|ft)\.?\s+[^\]\)]+[\)\]]/i, '').trim()}
                        </div>
                        <div className="track-artist-text" style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 400 }}>
                          <ArtistLinks artist={track.artist} onNavigate={onNavigateToArtist} />
                        </div>
                      </td>
                      
                      {/* Inline editable Genre Cell */}
                      <td 
                        className="genre-cell-editable"
                        onClick={() => startEditing(idx, track)}
                      >
                        {editingIndex === idx ? (
                          <input
                            className="inline-genre-input"
                            type="text"
                            value={editingGenre}
                            onChange={(e) => setEditingGenre(e.target.value)}
                            onBlur={() => saveInlineGenre(idx)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            autoFocus
                          />
                        ) : (
                          <div className="genre-text-wrap">
                            <span>{track.genre[0] || 'Unsorted'}</span>
                            <span className="genre-edit-tip">Click to Edit</span>
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {formatDuration(track.duration)}
                      </td>
                      
                      <td style={{ textAlign: 'center' }}>
                        {track.isDuplicate ? (
                          <span className="badge-duplicate">
                            <AlertTriangle size={10} />
                            <span>Duplicate</span>
                          </span>
                        ) : (
                          <span className="badge-unique">Unique</span>
                        )}
                      </td>

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
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); startInlineEditing(track); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: expandedTrackPath === track.filePath ? 'var(--accent, #7c5cbf)' : 'var(--text-secondary)'
                            }}
                            title="Edit Metadata"
                          >
                            <Pencil size={16} />
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
                                <button onClick={() => onPlayTrack?.(track, tracks)}>Play</button>
                                <button onClick={() => { onAddToQueue?.(track); setActiveDropdown(null); }}>Add to Queue</button>
                                <button onClick={() => { setSelectedTrackForPlaylist(track); setActiveDropdown(null); }}>Add to Playlist</button>
                                <button onClick={() => { alert(`Album: ${track.album}`); setActiveDropdown(null); }}>Go to Album</button>
                                <button onClick={() => { 
                                  navigator.clipboard.writeText(track.filePath);
                                  alert(`File path copied to clipboard: ${track.filePath}`);
                                  setActiveDropdown(null);
                                }}>Share File Path</button>
                                <button onClick={() => { onEditTrack?.(track); setActiveDropdown(null); }}>Properties</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {expandedTrackPath === track.filePath && (
                      <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <td colSpan={7} style={{ padding: '16px 24px', borderTop: 'none' }}>
                          <div style={{
                            display: 'flex',
                            gap: '24px',
                            alignItems: 'flex-start',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '16px'
                          }}>
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, track)}
                              style={{ display: 'none' }}
                            />

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                              {editImage && !failedImages[track.filePath + '_edit'] ? (
                                <img 
                                  src={editImage} 
                                  alt="Cover Art Preview" 
                                  onError={() => {
                                    setFailedImages(prev => ({ ...prev, [track.filePath + '_edit']: true }));
                                  }}
                                  style={{ 
                                    width: '90px', 
                                    height: '90px', 
                                    borderRadius: '8px', 
                                    objectFit: 'cover',
                                    border: '1px solid var(--border-light)'
                                  }} 
                                />
                              ) : (
                                <div style={{ 
                                  width: '90px', 
                                  height: '90px', 
                                  borderRadius: '8px', 
                                  backgroundColor: 'var(--bg-main)', 
                                  border: '1px solid var(--border)',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  color: 'var(--text-muted)'
                                }}>
                                  <Music size={32} />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                  backgroundColor: 'var(--bg-main)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                Change
                              </button>
                            </div>

                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Title</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  style={{
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none'
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Artist</label>
                                <input
                                  type="text"
                                  value={editArtist}
                                  onChange={(e) => setEditArtist(e.target.value)}
                                  style={{
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none'
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Album</label>
                                <input
                                  type="text"
                                  value={editAlbum}
                                  onChange={(e) => setEditAlbum(e.target.value)}
                                  style={{
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none'
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Genre</label>
                                <input
                                  type="text"
                                  value={editGenreState}
                                  onChange={(e) => setEditGenreState(e.target.value)}
                                  style={{
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none'
                                  }}
                                />
                              </div>

                              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                <button
                                  type="button"
                                  onClick={cancelInlineEditing}
                                  disabled={isSavingMetadata || saveSuccessPath === track.filePath}
                                  style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    outline: 'none'
                                  }}
                                >
                                  Cancel
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => saveInlineMetadata(track)}
                                  disabled={isSavingMetadata || saveSuccessPath === track.filePath}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: saveSuccessPath === track.filePath ? '#22c55e' : 'var(--accent, #7c5cbf)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: (isSavingMetadata || saveSuccessPath === track.filePath) ? 'default' : 'pointer',
                                    outline: 'none',
                                    transition: 'background-color 0.2s ease'
                                  }}
                                >
                                  {saveSuccessPath === track.filePath ? (
                                    <>
                                      <Check size={16} />
                                      <span>Saved</span>
                                    </>
                                  ) : isSavingMetadata ? (
                                    <span>Saving...</span>
                                  ) : (
                                    <span>Save Changes</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )}

      {/* Copy Progress Overlay */}
      {isCopying && copyProgress && (
        <div className="modal-overlay">
          <div className="settings-modal fade-in" style={{ maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
              <RefreshCw size={36} className="logo-icon" style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Copying Files...</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Copying track {copyProgress.current} of {copyProgress.total} unique files
              </p>
              
              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--bg-main)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginTop: '8px',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${copyProgress.total > 0 ? (copyProgress.current / copyProgress.total) * 100 : 0}%`,
                  backgroundColor: 'var(--primary)',
                  transition: 'width 0.1s ease'
                }}></div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Please do not close NorthTracks
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Copy Summary Modal */}
      {copySummary && (
        <div className="modal-overlay">
          <div className="settings-modal fade-in" style={{ maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                  <span>Copy Complete</span>
                </h3>
                <button 
                  onClick={() => setCopySummary(null)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tracks Copied Successfully:</span>
                  <strong style={{ color: 'var(--success)' }}>{copySummary.successCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Duplicates Skipped:</span>
                  <strong style={{ color: 'var(--warning)' }}>{copySummary.duplicateCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tracks Moved to Unsorted:</span>
                  <strong style={{ color: 'var(--primary)' }}>{copySummary.unsortedCount}</strong>
                </div>
                {copySummary.failedCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Failed Copies:</span>
                    <strong style={{ color: 'var(--danger)' }}>{copySummary.failedCount}</strong>
                  </div>
                )}
              </div>
              
              <button 
                className="button-primary" 
                style={{ width: '100%', justifyContent: 'center' }} 
                onClick={() => setCopySummary(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Sheet Overlay */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="settings-modal fade-in">
            <div className="modal-header">
              <h3>Configuration Settings</h3>
              <button className="close-modal-btn" onClick={() => setShowSettings(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Source Media Directory</label>
                  <input 
                    type="text" 
                    value={srcPathInput}
                    onChange={(e) => {
                      setSrcPathInput(e.target.value);
                      setTracks([]);
                      setHasScannedInSession(false);
                    }}
                    placeholder="D:\Media\Audio\Music"
                    required
                  />
                  <small>Folder scanned recursively for MP3, M4A, FLAC, and WAV files.</small>
                </div>

                <div className="form-group">
                  <label>Destination Organized Directory</label>
                  <input 
                    type="text" 
                    value={destPathInput}
                    onChange={(e) => setDestPathInput(e.target.value)}
                    placeholder="C:\Users\North\Music"
                    required
                  />
                  <small>Output path where sorted files are copied (organized by genre).</small>
                </div>

                <div className="form-group" style={{ opacity: 0.8 }}>
                  <label>Last Scan Registered</label>
                  <input 
                    type="text" 
                    value={settings.lastScanDate || 'Never'} 
                    disabled 
                    style={{ backgroundColor: '#131316', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowSettings(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-accent">
                  Save Configurations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Playlist Modal Overlay */}
      {selectedTrackForPlaylist && (
        <div className="modal-overlay">
          <div className="settings-modal fade-in" style={{ maxWidth: '400px', padding: '24px' }}>
            <div className="modal-header" style={{ padding: '0 0 12px 0', marginBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Add to Playlist</h3>
              <button 
                className="close-modal-btn" 
                onClick={() => setSelectedTrackForPlaylist(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {playlists.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No playlists found. Go to the Playlists tab to create one!
                </div>
              ) : (
                playlists.map(pl => {
                  const isAlreadyAdded = pl.tracks.includes(selectedTrackForPlaylist.filePath);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => handleAddToPlaylist(pl.id, selectedTrackForPlaylist)}
                      disabled={isAlreadyAdded}
                      className="sidebar-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-light)',
                        padding: '10px 14px',
                        cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                        opacity: isAlreadyAdded ? 0.6 : 1,
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{pl.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {isAlreadyAdded ? 'Already added' : `${pl.tracks.length} tracks`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add to Duplicate Manager Modal Overlay */}
      {showDuplicateManager && (
        <div className="modal-overlay" style={{ background: 'var(--bg-deep)', padding: '32px', display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', top: 0, left: 0, position: 'fixed', zIndex: 3000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
                <span>Manage Duplicate Tracks</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                Review duplicate file matches detected in your library. Choose which version to keep on disk.
              </p>
            </div>
            <button 
              onClick={() => {
                setSelectedPaths([]);
                setShowDuplicateManager(false);
              }}
              className="close-modal-btn"
              style={{ padding: '8px' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Warning Banner */}
          <div style={{ 
            backgroundColor: 'rgba(245, 158, 11, 0.08)', 
            border: '1px solid rgba(245, 158, 11, 0.2)', 
            color: 'var(--warning)', 
            borderRadius: '6px', 
            padding: '12px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            fontSize: '13px', 
            fontWeight: 500,
            marginBottom: '20px'
          }}>
            <AlertTriangle size={16} />
            <span>Resolve duplicates before copying to Music Folder. Duplicates will not be copied.</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px', marginBottom: '20px' }}>
            {(() => {
              // Construct pairs
              const pairs: DuplicatePair[] = [];
              tracks.forEach(track => {
                if (track.isDuplicate) {
                  const key = `${track.title.toLowerCase().trim()}|${track.artist.toLowerCase().trim()}`;
                  const original = tracks.find(t => 
                    !t.isDuplicate && 
                    `${t.title.toLowerCase().trim()}|${t.artist.toLowerCase().trim()}` === key
                  );
                  if (original && !skippedPaths.includes(track.filePath)) {
                    pairs.push({ original, duplicate: track, key });
                  }
                }
              });

              if (pairs.length === 0) {
                return (
                  <div className="empty-state" style={{ minHeight: '300px' }}>
                    <CheckCircle size={48} style={{ color: 'var(--success)', opacity: 0.8 }} />
                    <h3>No Duplicates Remaining</h3>
                    <p>All duplicate tracks have been resolved or skipped.</p>
                  </div>
                );
              }

              return (
                <>
                  {/* Duplicate Bulk Actions Toolbar */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    backgroundColor: 'var(--bg-card)', 
                    padding: '12px 16px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-light)',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="select-all-duplicates"
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        checked={pairs.length > 0 && selectedPaths.length === pairs.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPaths(pairs.map(p => p.duplicate.filePath));
                          } else {
                            setSelectedPaths([]);
                          }
                        }}
                      />
                      <label htmlFor="select-all-duplicates" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}>
                        Select All ({pairs.length} pairs)
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn-accent"
                        style={{ 
                          fontSize: '12.5px', 
                          padding: '8px 16px', 
                          backgroundColor: 'var(--danger)', 
                          opacity: selectedPaths.length === 0 ? 0.5 : 1,
                          cursor: selectedPaths.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                        disabled={selectedPaths.length === 0}
                        onClick={handleDeleteSelected}
                      >
                        Delete Selected ({selectedPaths.length})
                      </button>
                      <button 
                        className="btn-accent"
                        style={{ fontSize: '12.5px', padding: '8px 16px', backgroundColor: 'var(--danger)' }}
                        onClick={handleRemoveAllDuplicates}
                      >
                        Remove All Duplicates
                      </button>
                    </div>
                  </div>

                  {pairs.map((pair, index) => {
                    const isChecked = selectedPaths.includes(pair.duplicate.filePath);
                    return (
                      <div key={index} className="card" style={{ display: 'flex', gap: '16px', padding: '20px', border: '1px solid var(--border-medium)', alignItems: 'center' }}>
                        {/* Checkbox */}
                        <div style={{ flexShrink: 0, paddingRight: '4px' }}>
                          <input 
                            type="checkbox" 
                            style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPaths(prev => [...prev, pair.duplicate.filePath]);
                              } else {
                                setSelectedPaths(prev => prev.filter(p => p !== pair.duplicate.filePath));
                              }
                            }}
                          />
                        </div>

                        {/* Content Area */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Original version */}
                            <div style={{ flex: 1, minWidth: '260px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Version</span>
                              <h4 style={{ fontSize: '15px', fontWeight: 600, marginTop: '8px', color: 'var(--text-primary)' }}>{pair.original.title}</h4>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{pair.original.artist} • {pair.original.album}</p>
                              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span><strong>Path:</strong> {pair.original.filePath}</span>
                                <span><strong>Bitrate:</strong> {pair.original.bitrate ? `${Math.round(pair.original.bitrate / 1000)} kbps` : 'Unknown'}</span>
                                <span><strong>Duration:</strong> {formatDuration(pair.original.duration)}</span>
                              </div>
                            </div>

                            {/* Duplicate version */}
                            <div style={{ flex: 1, minWidth: '260px', background: 'rgba(245, 158, 11, 0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                              <span style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duplicate Copy</span>
                              <h4 style={{ fontSize: '15px', fontWeight: 600, marginTop: '8px', color: 'var(--text-primary)' }}>{pair.duplicate.title}</h4>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{pair.duplicate.artist} • {pair.duplicate.album}</p>
                              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span><strong>Path:</strong> {pair.duplicate.filePath}</span>
                                <span><strong>Bitrate:</strong> {pair.duplicate.bitrate ? `${Math.round(pair.duplicate.bitrate / 1000)} kbps` : 'Unknown'}</span>
                                <span><strong>Duration:</strong> {formatDuration(pair.duplicate.duration)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
                            <button 
                              onClick={() => handleKeepVersion(pair, 'original')}
                              className="btn-accent"
                              style={{ fontSize: '12.5px', padding: '6px 14px', backgroundColor: 'var(--primary)' }}
                            >
                              Keep Original
                            </button>
                            <button 
                              onClick={() => handleKeepVersion(pair, 'duplicate')}
                              className="btn-accent"
                              style={{ fontSize: '12.5px', padding: '6px 14px', backgroundColor: 'var(--warning)', color: '#000', fontWeight: 600 }}
                            >
                              Keep This One
                            </button>
                            <button 
                              onClick={() => handleSkipPair(pair)}
                              className="btn-secondary"
                              style={{ fontSize: '12.5px', padding: '6px 14px' }}
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => {
                setSelectedPaths([]);
                setShowDuplicateManager(false);
              }}
            >
              Close Manager
            </button>
            <button 
              className="button-primary" 
              onClick={handleOrganize}
              disabled={loading}
              style={{ padding: '10px 20px' }}
            >
              <Copy size={16} />
              <span>Copy Uniques to Music Folder</span>
            </button>
          </div>
        </div>
      )}

      {deleteConfirmData.isOpen && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            
            <div className="confirm-icon">
              <Trash2 size={32} color="var(--color-danger, #e53e3e)" />
            </div>
            
            <h2 className="confirm-title">Delete Source Files?</h2>
            
            <p className="confirm-message">
              {deleteConfirmData.count} file(s) were successfully copied 
              to your Music folder. Do you want to delete the original 
              source files to free up space?
            </p>
            
            <div className="confirm-warning">
              ⚠️ This cannot be undone. Make sure your files were 
              copied correctly before proceeding.
            </div>
            
            <div className="confirm-actions">
              <button 
                className="confirm-btn-cancel"
                onClick={() => setDeleteConfirmData(
                  { isOpen: false, filePaths: [], count: 0 }
                )}
              >
                Keep Original Files
              </button>
              <button 
                className="confirm-btn-danger"
                onClick={async () => {
                  if (window.electronAPI?.deleteSourceFiles) {
                    const result = await window.electronAPI.deleteSourceFiles(
                      deleteConfirmData.filePaths
                    )
                    setDeleteConfirmData({ isOpen: false, filePaths: [], count: 0 })
                    if (result.deleted > 0) {
                      showNotification('success', `Deleted ${result.deleted} source file(s)`)
                    }
                    if (result.failed > 0) {
                      showNotification('error', `Warning: ${result.failed} file(s) could not be deleted`)
                    }
                  }
                }}
              >
                <Trash2 size={14} />
                Delete {deleteConfirmData.count} Source Files
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};
