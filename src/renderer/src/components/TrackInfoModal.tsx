import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Track } from './LibraryView';

interface TrackInfoModalProps {
  track: Track;
  onClose: () => void;
}

export const TrackInfoModal: React.FC<TrackInfoModalProps> = ({ track, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Format size to MB
  const formatSize = (bytes?: number) => {
    if (!bytes || isNaN(bytes)) return 'Unknown Size';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (mtime?: number) => {
    if (!mtime || isNaN(mtime)) return 'Unknown Date';
    return new Date(mtime).toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration
  const formatDuration = (secs?: number) => {
    if (secs === undefined || isNaN(secs) || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Format bitrate
  const formatBitrate = (br?: number) => {
    if (!br || isNaN(br)) return 'Unknown Bitrate';
    // If it's stored in bps (e.g. 320000), convert to kbps
    if (br > 10000) {
      return `${Math.round(br / 1000)} kbps`;
    }
    return `${br} kbps`;
  };

  return (
    <div className="meta-modal-overlay" onClick={onClose}>
      <div className="meta-modal" onClick={(e) => e.stopPropagation()}>
        <div className="meta-modal-header">
          <span className="meta-modal-title">Track Metadata Info</span>
          <button className="meta-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="meta-modal-body">
          <div className="meta-grid-row">
            <span className="meta-grid-label">Title</span>
            <span className="meta-grid-value" style={{ fontWeight: 600 }}>{track.title}</span>
          </div>

          <div className="meta-grid-row">
            <span className="meta-grid-label">Artist</span>
            <span className="meta-grid-value">{track.artist}</span>
          </div>

          <div className="meta-grid-row">
            <span className="meta-grid-label">Album</span>
            <span className="meta-grid-value">{track.album || 'Unknown Album'}</span>
          </div>

          <div className="meta-grid-row">
            <span className="meta-grid-label">Genre</span>
            <span className="meta-grid-value">{track.genre?.join(', ') || 'Unsorted'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="meta-grid-row">
              <span className="meta-grid-label">Duration</span>
              <span className="meta-grid-value">{formatDuration(track.duration)}</span>
            </div>
            <div className="meta-grid-row">
              <span className="meta-grid-label">Bitrate</span>
              <span className="meta-grid-value">{formatBitrate(track.bitrate)}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="meta-grid-row">
              <span className="meta-grid-label">File Size</span>
              <span className="meta-grid-value">{formatSize((track as any).size)}</span>
            </div>
            <div className="meta-grid-row">
              <span className="meta-grid-label">Last Modified</span>
              <span className="meta-grid-value">{formatDate((track as any).mtime)}</span>
            </div>
          </div>

          <div className="meta-grid-row" style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '12px' }}>
            <span className="meta-grid-label">File Path</span>
            <span className="meta-grid-value" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {track.filePath}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
