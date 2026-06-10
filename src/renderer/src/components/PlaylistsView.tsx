import React from 'react';
import { Construction } from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  coverArt?: string;
}

interface PlaylistsViewProps {
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  libraryTracks: any[];
  onPlayTrack: (track: any, queue?: any[]) => void;
  onNewPlaylist: () => void;
  onDeletePlaylist: (id: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, filePath: string) => void;
  onSavePlaylists: (playlists: Playlist[]) => void;
  setCurrentView: (view: string) => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = () => {
  return (
    <div className="content-area fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 24px 24px 24px', gap: '16px' }}>
      {/* Page header */}
      <div 
        className="library-toolbar" 
        style={{ 
          paddingBottom: '8px', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          flexShrink: 0
        }}
      >
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Playlists</h2>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '400px'
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
          <Construction size={48} color="var(--accent)" />
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Under Construction</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>This section is being redesigned. Check back soon.</div>
        </div>
      </div>
    </div>
  );
};
