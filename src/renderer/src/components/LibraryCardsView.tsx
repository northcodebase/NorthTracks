import React, { useState } from 'react';
import { Heart, ListMusic, Plus, Music2 } from 'lucide-react';
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

const PlaylistCover: React.FC<{ coverArts: string[] }> = ({ coverArts }) => {
  if (coverArts.length === 0) {
    return (
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: 'var(--bg-main)', 
          color: 'var(--text-muted)' 
        }}
      >
        <ListMusic size={32} />
      </div>
    );
  }
  if (coverArts.length < 4) {
    return (
      <img 
        src={coverArts[0]} 
        alt="Playlist Cover" 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          display: 'block'
        }} 
      />
    );
  }
  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gridTemplateRows: '1fr 1fr', 
        width: '100%', 
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <img src={coverArts[0]} alt="Cover 1" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <img src={coverArts[1]} alt="Cover 2" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <img src={coverArts[2]} alt="Cover 3" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <img src={coverArts[3]} alt="Cover 4" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
};

export const LibraryCardsView: React.FC<LibraryCardsViewProps> = ({
  customPlaylists,
  likedTracksCount,
  libraryTracks,
  onOpenPlaylist,
  onNewPlaylist,
  onNavigateToGenre,
  onNavigateToLiked,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Resolve covers for a playlist using global library tracks metadata
  const getPlaylistCoverArts = (playlistTrackPaths: string[]): string[] => {
    const coverArts: string[] = [];
    for (const filePath of playlistTrackPaths) {
      const match = libraryTracks.find((t) => t.filePath === filePath);
      if (match && match.coverArt && !coverArts.includes(match.coverArt)) {
        coverArts.push(match.coverArt);
        if (coverArts.length >= 4) break; // Limit to 4 for mosaic layout
      }
    }
    return coverArts;
  };

  // Group library tracks by genre to auto-generate genre folder cards
  const genreGroupsMap: Record<string, { name: string; trackCount: number; coverArt?: string }> = {};
  libraryTracks.forEach((track) => {
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

  const genreGroups = Object.values(genreGroupsMap).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="content-area fade-in" style={{ height: '100%', overflowY: 'auto', padding: '32px' }}>
      
      {/* SECTION 1: Your Collection */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Your Collection
        </h2>
        
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
            gap: '16px' 
          }}
        >
          {/* Liked Songs Card */}
          <div 
            className="card liked-songs-card"
            onClick={onNavigateToLiked}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              cursor: 'pointer', 
              borderRadius: '12px',
              overflow: 'hidden',
              border: 'none',
              padding: '16px',
              minHeight: '185px',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
          >
            <div 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--text-on-primary)'
              }}
            >
              <Heart size={18} fill="currentColor" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-on-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Liked Songs
              </h3>
              <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
                {likedTracksCount} {likedTracksCount === 1 ? 'song' : 'songs'}
              </span>
            </div>
          </div>

          {/* Genre Folder Cards */}
          {genreGroups.map((genre) => {
            const imageKey = `lib-genre-${genre.name}`;
            const hasCover = genre.coverArt && !failedImages[imageKey];
            return (
              <div 
                key={genre.name}
                className="card genre-explore-card"
                onClick={() => onNavigateToGenre(genre.name)}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  cursor: 'pointer', 
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-medium)',
                  padding: '12px',
                  backgroundColor: 'var(--bg-card)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
              >
                <div 
                  className="genre-card-cover-container"
                  style={{ 
                    position: 'relative', 
                    width: '100%', 
                    aspectRatio: '1', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px'
                  }}
                >
                  {hasCover ? (
                    <img 
                      src={genre.coverArt} 
                      alt={genre.name}
                      onError={() => setFailedImages(prev => ({ ...prev, [imageKey]: true }))}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <Music2 size={36} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                  >
                    {genre.name}
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {genre.trackCount} {genre.trackCount === 1 ? 'track' : 'tracks'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Your Playlists */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Your Playlists
          </h2>
          <button 
            className="toolbar-btn" 
            onClick={onNewPlaylist}
            style={{ 
              backgroundColor: 'var(--primary)', 
              borderColor: 'var(--primary)', 
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            <span>New Playlist</span>
          </button>
        </div>

        {customPlaylists.length === 0 ? (
          <div 
            style={{ 
              padding: '32px', 
              textAlign: 'center', 
              color: 'var(--text-secondary)', 
              border: '1px dashed var(--border-medium)',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-card)'
            }}
          >
            No playlists yet — click + to create one
          </div>
        ) : (
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
              gap: '16px', 
              paddingBottom: '40px' 
            }}
          >
            {customPlaylists.map((playlist) => {
              const coverArts = getPlaylistCoverArts(playlist.tracks);
              return (
                <div 
                  key={playlist.id}
                  className="card playlist-explore-card"
                  onClick={() => onOpenPlaylist(playlist.id)}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    cursor: 'pointer', 
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-medium)',
                    padding: '12px',
                    backgroundColor: 'var(--bg-card)',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                >
                  <div 
                    className="playlist-card-cover-container"
                    style={{ 
                      position: 'relative', 
                      width: '100%', 
                      aspectRatio: '1', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-main)',
                      marginBottom: '12px'
                    }}
                  >
                    {playlist.coverArt ? (
                      <img 
                        src={playlist.coverArt} 
                        alt={playlist.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <PlaylistCover coverArts={coverArts} />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                    >
                      {playlist.name}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

