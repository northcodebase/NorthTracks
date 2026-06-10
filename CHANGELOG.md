# Changelog

## [1.1.0] — 2026-06-10

### ✨ New Features

#### Artist Detail Page
- Clicking any artist name now opens a dedicated **Artist Page**
- Auto-fetches artist cover art from the **iTunes Search API** (free, no API key)
- User can manually upload a custom artist image
- **Like button** for artists — persisted to disk via `electron-store`
- Shows all songs in the library where that artist appears
- Immersive banner layout with back navigation

#### Artist Links Component
- Artist names in song rows are now **clickable pill tags**
- Maximum **2 artist names** shown per track — no more overflow
- Displayed in: Library, Genre pages, Home recommendations, Artist page track list

#### Dual Image Controls on Genre/Playlist Pages
- **Cover thumbnail** (bottom-left camera icon) — changes the small card image
- **"Change Background"** pill button (top-right of banner) — changes the full banner independently
- Both are persisted separately per genre in `electron-store`
- Custom cover images **instantly sync** to the Home page "Your Playlists" cards — no reload needed

---

### 🎨 UI / Design Changes

#### Home Page
- Removed: *Most Played* and *Continue Listening* sections
- Renamed: *Recommended for Today* → **Picked for You Today**
- Added: **Your Playlists** horizontal scroll section
  - Auto-generates cards from genre folders + custom playlists
  - Each card shows its own cover art (custom or auto-picked from tracks)
- **Top Songs** redesigned as a billboard-style **two-column numbered chart**
- Fully dark theme throughout

#### Genre / Playlist Detail Page
- **240px immersive hero banner** with full-width background image
- Dark gradient overlay + vignette for readability
- Title, song count, Play and Shuffle buttons positioned inside the banner
- Back button styled as glass-pill overlay
- Track list directly below banner — no disconnected card/border

#### Song Titles
- Auto-strip `(feat. ...)`, `[ft. ...]`, `(with ...)`, `(featuring ...)` suffixes from displayed titles
- Clean title shown everywhere — full title still accessible via tooltip

#### Player Bar
- **Heart (Like) button** moved next to song duration display (left zone, near controls)
- Removed from the cluttered center metadata area
- Progress bar: scroll mouse wheel to seek ±5 seconds
- Volume slider: scroll mouse wheel to adjust volume
- Both sliders expand height on hover; scrub thumb appears only on hover

---

### 🔧 Bug Fixes

- Fixed: Artist name underline showing on all artists — now only appears on hover
- Fixed: Genre page header looked disconnected from the track list — now seamlessly connected
- Fixed: Custom cover image not updating in Home page "Your Playlists" after changing in genre page
- Fixed: `window.electronAPI` crashes when preload is unavailable — all calls now use optional chaining

---

### 🏗️ Architecture / Code Quality

- Resolved **50+ TypeScript `noUnusedLocals` / `noUnusedParameters` errors** — build now compiles cleanly
- Removed hundreds of lines of ghost/dead code from `LikedView`, `PlaylistsView`, `ExploreView`, `LibraryCardsView`
- Added `customGenreCovers` state map in `App.tsx` — single source of truth for all genre cover art
- All genre covers loaded from `electron-store` on app startup for instant display

---

## [1.0.0] — Initial Release

- Music library scanner (local files)
- Genre folder organisation
- Playlist creation
- Home page with recommendations
- Audio player with EQ, queue, keyboard shortcuts
- Explore and Library views
- Settings and Preferences
