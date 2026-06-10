import React from 'react';
import { ListMusic, Construction } from 'lucide-react';
import { Track } from './LibraryView';

interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  coverArt?: string;
}

interface LibraryCardsViewProps {
  customPlaylists: Playlist[];
  likedTracksCount: number;
  libraryTracks: Track[];
  onOpenPlaylist: (id: string) => void;
  onOpenLiked?: () => void;
  onNewPlaylist: () => void;
  onNavigateToGenre: (genre: string) => void;
  onNavigateToLiked: () => void;
}

export const LibraryCardsView: React.FC<LibraryCardsViewProps> = () => {
  return (
    <div className="content-area fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 24px 24px 24px', gap: '16px' }}>
      
      {/* Header */}
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
          <ListMusic size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Your Collection</h2>
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
