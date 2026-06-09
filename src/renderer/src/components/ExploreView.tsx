import React, { useState } from 'react';
import { Compass, Music2, Play, Search, X } from 'lucide-react';

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

interface GenreGroup {
  name: string;
  trackCount: number;
  coverArt?: string;
}

interface ExploreViewProps {
  onNavigateToGenre: (genre: string) => void;
  tracks: Track[];
  playCounts: Record<string, number>;
  onPlayTrack: (track: Track, queue?: Track[]) => void;
  onEditTrack: (track: Track) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onNavigateToGenre,
  tracks,
  playCounts,
  onPlayTrack,
  onEditTrack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Process tracks into genre groups
  const genreGroupsMap: Record<string, GenreGroup> = {};
  tracks.forEach((track) => {
    const genreName = track.genre && track.genre[0] ? track.genre[0].trim() : 'Unsorted';
    if (!genreGroupsMap[genreName]) {
      genreGroupsMap[genreName] = {
        name: genreName,
        trackCount: 0,
        coverArt: track.coverArt,
      };
    }
    genreGroupsMap[genreName].trackCount++;
    if (!genreGroupsMap[genreName].coverArt && track.coverArt) {
      genreGroupsMap[genreName].coverArt = track.coverArt;
    }
  });
  const genreGroups = Object.values(genreGroupsMap).sort((a, b) => a.name.localeCompare(b.name));

  // Filter tracks for search query
  const query = searchQuery.toLowerCase().trim();
  const filteredTracks = tracks.filter((track) => {
    if (!query) return true;
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.album.toLowerCase().includes(query) ||
      (track.genre && track.genre.some((g) => g.toLowerCase().includes(query)))
    );
  });

  if (tracks.length === 0) {
    return (
      <div className="content-area fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
          <Music2 size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No Categories Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', textAlign: 'center' }}>
            No music files organized by genre are present. Go to <strong>Import & Scan</strong> to scan your library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area fade-in" style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Search Bar Toolbar */}
      <div 
        className="library-toolbar" 
        style={{ 
          borderBottom: '1px solid var(--border-light)', 
          paddingBottom: '16px', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          flexShrink: 0
        }}
      >
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Compass size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Explore Catalog</h2>
        </div>

        {/* Unified Search Input */}
        <div className="search-container" style={{ margin: 0, maxWidth: '360px', width: '100%', flex: 1 }}>
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

      {/* RENDER VIEW ACCORDING TO SEARCH STATE */}
      {searchQuery ? (
        /* SEARCH RESULTS SUB-VIEW */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
            Search Results for "{searchQuery}" ({filteredTracks.length} found)
          </h3>
          {filteredTracks.length === 0 ? (
            <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <Search size={36} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '16px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No matches found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
                Check spelling or search for another title, artist, or genre folder.
              </p>
            </div>
          ) : (
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '16px', 
                paddingBottom: '40px' 
              }}
            >
              {filteredTracks.map((track) => {
                const count = playCounts[track.filePath] || 0;
                const hasCover = track.coverArt && !failedImages[track.filePath];
                const imageKey = `search-result-${track.filePath}`;
                return (
                  <div 
                    key={track.filePath}
                    className="card hover-scale-card"
                    style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      padding: '12px', 
                      alignItems: 'center', 
                      border: '1px solid var(--border-medium)', 
                      backgroundColor: 'var(--bg-card)', 
                      position: 'relative',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                  >
                    {/* Left Cover Image */}
                    <div style={{ width: '64px', height: '64px', overflow: 'hidden', backgroundColor: 'var(--bg-main)', flexShrink: 0, position: 'relative' }}>
                      {hasCover ? (
                        <img 
                          src={track.coverArt} 
                          alt={track.title} 
                          onError={() => setFailedImages(prev => ({ ...prev, [imageKey]: true }))}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <Music2 size={24} />
                        </div>
                      )}
                    </div>

                    {/* Middle details */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <h4 
                        style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: 'var(--text-primary)', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap', 
                          margin: 0 
                        }} 
                        title={track.title}
                      >
                        {track.title}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                        {track.artist}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 500 }}>
                        {count > 0 ? `${count} ${count === 1 ? 'play' : 'plays'}` : 'Not played yet'}
                      </span>
                    </div>

                    {/* Right actions */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button 
                        onClick={() => onPlayTrack(track, filteredTracks)}
                        style={{ 
                          background: 'var(--primary)', 
                          border: 'none', 
                          color: '#ffffff', 
                          width: '32px', 
                          height: '32px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer' 
                        }}
                        className="play-row-btn"
                        title="Play Track"
                      >
                        <Play size={14} fill="currentColor" style={{ marginLeft: '2px' }} />
                      </button>
                      <button 
                        onClick={() => onEditTrack(track)}
                        style={{ 
                          background: 'transparent', 
                          border: '1px solid var(--border-medium)', 
                          color: 'var(--text-secondary)', 
                          width: '32px', 
                          height: '32px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer',
                          padding: 0
                        }}
                        title="Edit Track Info"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* UNIFIED SCROLLABLE SINGLE PAGE DASHBOARD */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '40px' }}>
          
          {/* SECTION 1: Moods and genres */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'none' }}>Moods and genres</h3>
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '16px' 
              }}
            >
              {genreGroups.map((genre, idx) => {
                // Accent left border color based on index
                const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
                const accentColor = colors[idx % colors.length];

                return (
                  <div 
                    key={genre.name}
                    className="card hover-scale-card"
                    onClick={() => onNavigateToGenre(genre.name)}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      cursor: 'pointer', 
                      border: '1px solid var(--border-medium)',
                      borderLeft: `4px solid ${accentColor}`,
                      padding: '16px 20px',
                      backgroundColor: 'var(--bg-card)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                      justifyContent: 'center',
                      minHeight: '80px'
                    }}
                  >
                    <h4 
                      style={{ 
                        fontSize: '15px', 
                        fontWeight: 700, 
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: 0
                      }}
                    >
                      {genre.name}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {genre.trackCount} {genre.trackCount === 1 ? 'track' : 'tracks'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
