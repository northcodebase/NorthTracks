import React from 'react';

interface ArtistLinksProps {
  artist: string;
  onNavigate: (artistName: string) => void;
}

export const ArtistLinks: React.FC<ArtistLinksProps> = ({ artist, onNavigate }) => {
  if (!artist) return <span style={{ color: 'var(--text-secondary)' }}>Unknown Artist</span>;

  // Split by common separators: commas, ampersands, semicolons, and "and"
  const actualNames = artist.split(/,\s*|&|;|\band\b/i).map(s => s.trim()).filter(Boolean);
  const limitedNames = actualNames.slice(0, 2); // maximum of 2

  const renderedElements: React.ReactNode[] = [];

  limitedNames.forEach((name, idx) => {
    renderedElements.push(
      <span
        key={`artist-${name}-${idx}`}
        className="track-artist-text"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(name);
        }}
        style={{ cursor: 'pointer' }}
      >
        {name}
      </span>
    );
    if (idx < limitedNames.length - 1) {
      renderedElements.push(<span key={`sep-${idx}`} style={{ cursor: 'default', color: 'var(--text-secondary)' }}> & </span>);
    }
  });

  return <>{renderedElements}</>;
};
