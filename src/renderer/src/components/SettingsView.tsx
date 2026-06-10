import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Save, 
  Settings as SettingsIcon, 
  Shield, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Music2, 
  Plug, 
  Palette,
  Lock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsViewProps {
  settingsCategory: string | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settingsCategory }) => {
  const { theme, setTheme } = useTheme();

  const [destinationFolderPath, setDestinationFolderPath] = useState('');
  const [autoDetectDuplicates, setAutoDetectDuplicates] = useState(true);
  const [watchSourceFolder, setWatchSourceFolder] = useState(false);
  const [autoplayNextTrack, setAutoplayNextTrack] = useState(true);
  const [rememberPlaybackPosition, setRememberPlaybackPosition] = useState(false);
  const [smartShuffle, setSmartShuffle] = useState(true);
  
  // Discord RPC Config States
  const [discordRpcEnabled, setDiscordRpcEnabled] = useState(false);
  const [discordShowElapsed, setDiscordShowElapsed] = useState(true);


  const [visualStyle, setVisualStyle] = useState<'solid' | 'acrylic' | 'glow'>('solid');
  const [initialVisualStyle, setInitialVisualStyle] = useState<'solid' | 'acrylic' | 'glow'>('solid');
  const [isWin11, setIsWin11] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const [lastScanDate, setLastScanDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const [stats, setStats] = useState({
    totalTracks: 0,
    totalSize: '0 MB',
    totalGenres: 0,
    lastScan: 'Never'
  });
  
  const [dangerConfirm, setDangerConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadStats();
    if (window.electronAPI?.getSystemInfo) {
      window.electronAPI.getSystemInfo().then((info: { isWin11: boolean }) => {
        setIsWin11(info.isWin11);
      });
    }
  }, []);

  const loadStats = async () => {
    if (window.electronAPI?.getGenreFolders) {
      try {
        const destTracks = await window.electronAPI.getGenreFolders();
        const settingsData = await window.electronAPI.getSettings();
        
        const totalTracks = destTracks.length;
        
        let bytesSum = 0;
        destTracks.forEach((track: any) => {
          if (track.size) {
            bytesSum += track.size;
          }
        });
        const mb = bytesSum / (1024 * 1024);
        const totalSize = mb > 1024 
          ? `${(mb / 1024).toFixed(1)} GB` 
          : `${Math.round(mb)} MB`;
        
        const uniqueGenres = new Set<string>();
        destTracks.forEach((track: any) => {
          if (track.genre && track.genre[0]) {
            uniqueGenres.add(track.genre[0]);
          }
        });
        
        setStats({
          totalTracks,
          totalSize,
          totalGenres: uniqueGenres.size,
          lastScan: settingsData.lastScanDate || 'Never'
        });
      } catch (err) {
        console.error('Failed to load library statistics:', err);
      }
    }
  };

  const handleDangerAction = (action: string) => {
    setDangerConfirm(action);
  };

  const loadSettings = async () => {
    if (window.electronAPI) {
      try {
        const s = await window.electronAPI.getSettings();
        setDestinationFolderPath(s.destinationFolderPath || '');
        setAutoDetectDuplicates(s.autoDetectDuplicates !== undefined ? s.autoDetectDuplicates : true);
        setWatchSourceFolder(s.watchSourceFolder !== undefined ? s.watchSourceFolder : false);
        
        setAutoplayNextTrack(s.autoplayNextTrack !== undefined ? s.autoplayNextTrack : true);
        setRememberPlaybackPosition(s.rememberPlaybackPosition !== undefined ? s.rememberPlaybackPosition : false);
        setSmartShuffle(s.smartShuffle !== undefined ? s.smartShuffle : true);
        
        setDiscordRpcEnabled(s.discordEnabled !== undefined ? s.discordEnabled : false);
        setDiscordShowElapsed(s.discordShowElapsed !== undefined ? s.discordShowElapsed : true);

        setVisualStyle(s.visualStyle || 'solid');
        setInitialVisualStyle(s.visualStyle || 'solid');
        setFontSize(s.fontSize || 'medium');
        setLastScanDate(s.lastScanDate || 'Never');
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBrowseDest = async () => {
    if (window.electronAPI?.selectFolder) {
      const selected = await window.electronAPI.selectFolder();
      if (selected) {
        setDestinationFolderPath(selected);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        const isStyleChanged = visualStyle !== initialVisualStyle;
        
        await window.electronAPI.saveSettings({
          destinationFolderPath,
          autoDetectDuplicates,
          watchSourceFolder,
          discordEnabled: discordRpcEnabled,
          discordShowElapsed: discordShowElapsed,
          autoplayNextTrack,
          rememberPlaybackPosition,
          visualStyle,
          fontSize,
          smartShuffle,
        });

        if (isStyleChanged) {
          const success = await window.electronAPI.applyVisualStyle(visualStyle);
          if (!success) {
            setVisualStyle(initialVisualStyle);
            return;
          }
        } else {
          setSuccessMsg('Settings saved successfully!');
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="settings-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading settings configurations...</p>
      </div>
    );
  }

  const getCategoryTitle = () => {
    switch (settingsCategory) {
      case 'directories': return 'Directories';
      case 'playback': return 'Playback';
      case 'integrations': return 'Integrations';
      case 'appearance': return 'Appearance';
      case 'library': return 'Library';
      case 'danger': return 'Danger Zone';
      default: return 'Preferences';
    }
  };

  const isSaveable = ['directories', 'playback', 'integrations', 'appearance'].includes(settingsCategory || '');

  return (
    <div className="settings-content-panel fade-in" style={{ height: '100%', width: '100%', overflowY: 'auto' }}>
      <div className="settings-header">
        <div className="toolbar-left">
          <h2>{getCategoryTitle()}</h2>
        </div>
      </div>

      {successMsg && (
        <div className="notification-banner success" style={{ marginBottom: '20px' }}>
          <div className="banner-content">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="settings-form-layout" style={{ maxWidth: 'none', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* CATEGORY: DIRECTORIES */}
        {settingsCategory === 'directories' && (
          <div className="settings-content-section fade-in">
            <div className="card settings-card">
              <h3 className="settings-section-title">Directory Folders</h3>
              <p className="settings-section-desc">Configure target directories where NorthTracks scans and organizes local audio libraries.</p>
              
              <div className="form-group">
                <label>Destination Music Folder</label>
                <div className="path-picker-row">
                  <input 
                    type="text" 
                    value={destinationFolderPath}
                    onChange={(e) => setDestinationFolderPath(e.target.value)}
                    placeholder="C:\Users\North\Music"
                    required
                  />
                  <button type="button" className="btn-browse" onClick={handleBrowseDest}>
                    <FolderOpen size={14} />
                    <span>Browse</span>
                  </button>
                </div>
                <small>Specifies where unique tracks are copied and structured by genre name folder.</small>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: PLAYBACK */}
        {settingsCategory === 'playback' && (
          <div className="settings-content-section fade-in">
            <div className="card settings-card">
              <h3 className="settings-section-title">Playback Options</h3>
              <p className="settings-section-desc">Manage custom automation options for duplicate processing and playback state.</p>

              {/* Toggle 1: Auto detect duplicates */}
              <div className="toggle-row">
                <div className="toggle-info">
                  <div className="toggle-label-box">
                    <Shield size={14} className="toggle-icon-accent" />
                    <h4>Auto-detect duplicates</h4>
                  </div>
                  <p>Compares track Title + Artist combination and marks lower-numbered matches as duplicates.</p>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={autoDetectDuplicates}
                    onChange={(e) => setAutoDetectDuplicates(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {/* Toggle 2: Watch source directory */}
              <div className="toggle-row" style={{ marginTop: '16px' }}>
                <div className="toggle-info">
                  <div className="toggle-label-box">
                    <Eye size={14} className="toggle-icon-accent" />
                    <h4>Watch source folder for new files</h4>
                  </div>
                  <p>Enables hot folder monitoring to sync and catalog new track additions in real time.</p>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={watchSourceFolder}
                    onChange={(e) => setWatchSourceFolder(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {/* Toggle 3: Autoplay next track */}
              <div className="toggle-row" style={{ marginTop: '16px' }}>
                <div className="toggle-info">
                  <div className="toggle-label-box">
                    <Music2 size={14} className="toggle-icon-accent" />
                    <h4>Autoplay next track</h4>
                  </div>
                  <p>Automatically start playing the next track in the queue when the current track finishes.</p>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={autoplayNextTrack}
                    onChange={(e) => setAutoplayNextTrack(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {/* Toggle 4: Remember playback position */}
              <div className="toggle-row" style={{ marginTop: '16px' }}>
                <div className="toggle-info">
                  <div className="toggle-label-box">
                    <SettingsIcon size={14} className="toggle-icon-accent" />
                    <h4>Remember playback position</h4>
                  </div>
                  <p>Save and restore where you left off in a track when reopening the application.</p>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={rememberPlaybackPosition}
                    onChange={(e) => setRememberPlaybackPosition(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              {/* Toggle 5: Smart Shuffle */}
              <div className="toggle-row" style={{ marginTop: '16px' }}>
                <div className="toggle-info">
                  <div className="toggle-label-box">
                    <SettingsIcon size={14} className="toggle-icon-accent" />
                    <h4>Smart Shuffle</h4>
                  </div>
                  <p>Plays songs matching your current genre taste instead of fully random shuffle.</p>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={smartShuffle}
                    onChange={(e) => setSmartShuffle(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: INTEGRATIONS */}
        {settingsCategory === 'integrations' && (
          <div className="settings-content-section fade-in">
            <div className="card settings-card">
              <h3 className="settings-section-title">Integrations</h3>
              <p className="settings-section-desc">Connect NorthTracks with external services and applications.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-label-box">
                      <Plug size={14} className="toggle-icon-accent" />
                      <h4>Show music activity on Discord</h4>
                    </div>
                    <p>Displays your currently playing song in your Discord profile status. Requires Discord to be running.</p>
                  </div>
                  <label className="switch-toggle">
                    <input 
                      type="checkbox" 
                      checked={discordRpcEnabled}
                      onChange={(e) => setDiscordRpcEnabled(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <div className="toggle-row" style={{
                  opacity: discordRpcEnabled ? 1 : 0.4,
                  pointerEvents: discordRpcEnabled ? 'auto' : 'none',
                  transition: 'opacity 0.2s ease'
                }}>
                  <div className="toggle-info">
                    <div className="toggle-label-box">
                      <SettingsIcon size={14} className="toggle-icon-accent" />
                      <h4>Show elapsed time</h4>
                    </div>
                    <p>Show how long the current song has been playing</p>
                  </div>
                  <label className="switch-toggle">
                    <input 
                      type="checkbox" 
                      checked={discordShowElapsed}
                      onChange={(e) => setDiscordShowElapsed(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="card settings-card" style={{ marginTop: '20px' }}>
              <div className="integrations-roadmap">
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Integrations Roadmap</h4>
                <div className="roadmap-card">
                  <Plug size={16} />
                  <span>Last.fm Scrobbling — Coming Soon</span>
                </div>
                <div className="roadmap-card" style={{ marginTop: '8px' }}>
                  <Plug size={16} />
                  <span>Spotify Sync — Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: APPEARANCE */}
        {settingsCategory === 'appearance' && (
          <div className="settings-content-section fade-in">
            <div className="card settings-card">
              <h3 className="settings-section-title">Visual Style</h3>
              <p className="settings-section-desc">Select the visual rendering overlay style for the workspace window.</p>
              <div className="appearance-cards-row">
                <div 
                  className={`appearance-card ${visualStyle === 'solid' ? 'active' : ''}`}
                  onClick={() => setVisualStyle('solid')}
                >
                  <Palette size={20} />
                  <span className="appearance-card-title">Solid</span>
                  <span className="appearance-card-desc">Clean solid background colors</span>
                </div>
                <div 
                  className={`appearance-card ${visualStyle === 'acrylic' ? 'active' : ''} ${!isWin11 ? 'disabled' : ''}`}
                  onClick={() => isWin11 && setVisualStyle('acrylic')}
                  title={!isWin11 ? "Requires Windows 11 (build 22000 or later)" : undefined}
                >
                  {!isWin11 ? <Lock size={20} style={{ color: 'var(--text-muted)' }} /> : <Palette size={20} style={{ color: 'var(--primary)' }} />}
                  <span className="appearance-card-title">Acrylic</span>
                  <span className="appearance-card-desc">Subtle glassmorphic blur overlay</span>
                </div>
                <div 
                  className={`appearance-card ${visualStyle === 'glow' ? 'active' : ''} ${!isWin11 ? 'disabled' : ''}`}
                  onClick={() => isWin11 && setVisualStyle('glow')}
                  title={!isWin11 ? "Requires Windows 11 (build 22000 or later)" : undefined}
                >
                  {!isWin11 ? <Lock size={20} style={{ color: 'var(--text-muted)' }} /> : <Palette size={20} style={{ filter: 'drop-shadow(0 0 6px var(--primary))' }} />}
                  <span className="appearance-card-title">Acrylic + Glow</span>
                  <span className="appearance-card-desc">Acrylic with neon primary accents</span>
                </div>
              </div>
            </div>

            <div className="card settings-card">
              <h3 className="settings-section-title">Theme</h3>
              <p className="settings-section-desc">Customize app color palette option.</p>
              <div className="theme-buttons-row">
                <button 
                  type="button" 
                  className={`toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  Light
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${theme === 'system' ? 'active' : ''}`}
                  onClick={() => setTheme('system')}
                >
                  System
                </button>
              </div>
            </div>

            <div className="card settings-card">
              <h3 className="settings-section-title">Font Size</h3>
              <p className="settings-section-desc">Adjust the workspace text scaling option.</p>
              <div className="font-buttons-row">
                <button 
                  type="button" 
                  className={`toggle-btn ${fontSize === 'small' ? 'active' : ''}`}
                  onClick={() => setFontSize('small')}
                >
                  Small
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${fontSize === 'medium' ? 'active' : ''}`}
                  onClick={() => setFontSize('medium')}
                >
                  Medium
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${fontSize === 'large' ? 'active' : ''}`}
                  onClick={() => setFontSize('large')}
                >
                  Large
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: LIBRARY */}
        {settingsCategory === 'library' && (
          <div className="settings-content-section fade-in">
            <div className="card settings-card">
              <h3 className="settings-section-title">Library Statistics</h3>
              <p className="settings-section-desc">Overview of your organized music library.</p>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{stats.totalTracks}</span>
                  <span className="stat-label">Total Tracks</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.totalSize}</span>
                  <span className="stat-label">Library Size</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.totalGenres}</span>
                  <span className="stat-label">Genres</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{stats.lastScan}</span>
                  <span className="stat-label">Last Scan</span>
                </div>
              </div>
            </div>

            <div className="card settings-card" style={{ opacity: 0.85 }}>
              <h3 className="settings-section-title" style={{ fontSize: '12px', marginBottom: '8px' }}>System Info</h3>
              <div className="info-stat-row">
                <span>Last Directory Scan Date:</span>
                <strong>{lastScanDate}</strong>
              </div>
            </div>

            <div className="card settings-card">
              <h3 className="settings-section-title">Library Cache</h3>
              <p className="settings-section-desc">Clears cached index data. Your files are not affected, but next scan will recompute metadata.</p>
              <div style={{ marginTop: '12px' }}>
                <button 
                  type="button" 
                  className="outlined-btn-normal"
                  onClick={() => handleDangerAction('clear-cache')}
                >
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: DANGER ZONE */}
        {settingsCategory === 'danger' && (
          <div className="settings-content-section fade-in">
            <div className="warning-banner">
              <AlertTriangle size={18} />
              <span>These actions are permanent and cannot be undone.</span>
            </div>

            <div className="card settings-card settings-danger-zone">
              <h3 className="settings-section-title danger-title">
                ⚠️ Danger Zone
              </h3>
              <p className="settings-section-desc">
                Highly critical actions affecting configuration preferences and target directories.
              </p>
              
              <div className="danger-actions">
                <div className="danger-row-layout">
                  <div className="danger-row-info">
                    <span className="danger-row-title">Reset All Settings</span>
                    <span className="danger-row-desc">
                      Resets all preferences to defaults. Your music files are safe.
                    </span>
                  </div>
                  <button 
                    type="button"
                    className="danger-btn-mild"
                    onClick={() => handleDangerAction('reset-settings')}
                  >
                    Reset Settings
                  </button>
                </div>
                
                <div className="danger-row-layout">
                  <div className="danger-row-info">
                    <span className="danger-row-title">Delete All Organized Music</span>
                    <span className="danger-row-desc">
                      Permanently deletes ALL files from your destination folder.
                    </span>
                  </div>
                  <button 
                    type="button"
                    className="danger-btn-severe"
                    onClick={() => handleDangerAction('delete-organized')}
                  >
                    Delete All Music
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Spacer to provide bottom breathing room or scrolling offset */}
        <div style={{ height: isSaveable ? '80px' : '24px', flexShrink: 0 }} />

        {/* Sticky Save Button Footer */}
        {isSaveable && (
          <div className="sticky-footer">
            <button type="submit" className="button-primary save-settings-btn">
              <Save size={14} />
              <span>Save Settings</span>
            </button>
          </div>
        )}

      </form>

      {/* Confirmation overlays */}
      {dangerConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <div className="confirm-icon">
              <AlertTriangle size={32} color="#e53e3e" />
            </div>
            <h2 className="confirm-title">
              {dangerConfirm === 'clear-cache' && 'Clear Library Cache?'}
              {dangerConfirm === 'reset-settings' && 'Reset All Settings?'}
              {dangerConfirm === 'delete-organized' && 'Delete All Organized Music?'}
            </h2>
            <p className="confirm-message">
              {dangerConfirm === 'clear-cache' && 
                'Your cached library data will be cleared. Music files are safe.'}
              {dangerConfirm === 'reset-settings' && 
                'All settings will return to defaults. Music files are safe.'}
              {dangerConfirm === 'delete-organized' && 
                'ALL music files in your destination folder will be permanently deleted. This CANNOT be undone.'}
            </p>
            <div className="confirm-actions">
              <button 
                type="button"
                className="confirm-btn-cancel"
                onClick={() => setDangerConfirm(null)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="confirm-btn-danger"
                onClick={async () => {
                  if (window.electronAPI) {
                    if (dangerConfirm === 'clear-cache') {
                      await window.electronAPI.clearLibraryCache()
                    } else if (dangerConfirm === 'reset-settings') {
                      await window.electronAPI.resetSettings()
                    } else if (dangerConfirm === 'delete-organized') {
                      await window.electronAPI.deleteOrganizedMusic()
                    }
                  }
                  setDangerConfirm(null);
                  loadStats();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
