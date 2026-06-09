# NorthTracks

A local-first music library manager and player for Windows. NorthTracks scans your music collection, organizes tracks by genre, detects and resolves duplicates, and provides a clean interface for browsing and playing your music — all without any internet connection or cloud dependency.

## Features

- Scan local music folders and read embedded metadata from MP3, M4A, FLAC, and WAV files
- Automatic duplicate detection by matching title and artist combinations
- Copy and organize music into genre-sorted folders at a destination of your choice
- Full music player with queue, shuffle, smart shuffle, repeat, and volume control
- Now Playing full-screen view with Up Next queue
- Home screen with Recently Played, Top Songs, and daily recommendations based on listening history
- Playlist management — auto-generated genre playlists and custom user playlists
- Liked Songs collection
- Global search across title, artist, and genre
- Discord Rich Presence integration
- Windows media controls and taskbar thumbnail buttons
- Light and dark mode with system preference detection
- Accent color customization
- Font selection
- Visual Style themes including Solid, Acrylic, and Acrylic with Cover Glow (Windows 11)
- Right-click context menu with playback, playlist, and file actions
- Fully offline — no internet required after installation

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- electron-store
- music-metadata
- chokidar

## Requirements

- Windows 10 or Windows 11
- Node.js 18 or later
- npm 9 or later

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/northcodebase/NorthTracks.git
cd NorthTracks
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

The built application will be in the `dist` folder. To package as a Windows installer run:

```bash
npm run package
```

## Configuration

On first launch, go to **Preferences** and set your **Source Music Folder** (the folder NorthTracks will scan) and your **Destination Music Folder** (where organized music will be copied). NorthTracks stores all application data including library cache, playlists, liked songs, play history, and settings in `%AppData%\NorthTracks`.

## Development

The project uses a standard Electron + Vite + React setup. Main process code is in `src/main`, renderer code is in `src/renderer`, and the preload script is in `src/main/preload.ts`. Build scripts are in the `scripts` folder.

## License

MIT License. See [LICENSE](LICENSE) file for details.
