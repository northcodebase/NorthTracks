import React from 'react';
import { Heart, ChevronLeft, Construction } from 'lucide-react';
import { Track } from './LibraryView';

interface LikedViewProps {
  browseLibrary: Track[];
  likedTracks: string[];
  onToggleLike: (filePath: string) => void;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  currentlyPlayingPath: string | undefined;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onBack: () => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: Track) => void;
  onNavigateToArtist?: (artistName: string) => void;
}

export const LikedView: React.FC<LikedViewProps> = ({
  onBack,
}) => {
  return (
    <div className="library-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '16px 24px 24px 24px', gap: '16px' }}>
      {/* Top Toolbar */}
      <div className="library-toolbar" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            className="scroll-arrow-btn"
            title="Back to Library"
          >
            <ChevronLeft size={18} />
          </button>
          <Heart size={18} fill="#a78bfa" color="#a78bfa" className="library-brand-icon" />
          <h2>Liked Songs</h2>
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
