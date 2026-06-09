import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

// Helper to recursively find audio files
export function getAudioFiles(dir: string, filesList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getAudioFiles(filePath, filesList);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.mp3', '.m4a', '.flac', '.wav'].includes(ext)) {
          filesList.push(filePath);
        }
      }
    }
  } catch (e) {
    // Ignore folders or files that cannot be read
  }
  return filesList;
}

export function findFolderImage(trackFilePath: string): string | undefined {
  try {
    const dir = path.dirname(trackFilePath);
    const files = fs.readdirSync(dir);
    
    // Look for exact matches first (case insensitive)
    const priorityNames = ['cover', 'folder', 'front', 'album', 'artwork'];
    for (const priority of priorityNames) {
      const match = files.find(f => {
        const ext = path.extname(f).toLowerCase();
        const base = path.basename(f, ext).toLowerCase();
        return base === priority && ['.jpg', '.jpeg', '.png'].includes(ext);
      });
      if (match) {
        return path.join(dir, match);
      }
    }
    
    // Fallback: any image file in the directory
    const anyImg = files.find(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    });
    if (anyImg) {
      return path.join(dir, anyImg);
    }
  } catch (err) {
    // Ignore errors
  }
  return undefined;
}

export interface TrackInfo {
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
export async function limitConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  
  async function worker() {
    while (index < items.length) {
      const currentIdx = index++;
      // Yield periodically to keep the Electron UI completely responsive without introducing scheduling overhead
      if (currentIdx % 25 === 0) {
        await new Promise<void>(resolve => setImmediate(resolve));
      }
      try {
        results[currentIdx] = await fn(items[currentIdx], currentIdx);
      } catch (e) {
        console.error(`Error in concurrency worker at index ${currentIdx}:`, e);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function scanLibrary(sourceFolder: string): Promise<TrackInfo[]> {
  const audioFiles = getAudioFiles(sourceFolder);
  
  // Resolve Cache Directory
  let cacheDir = '';
  try {
    const { app } = await import('electron');
    cacheDir = path.join(app.getPath('userData'), 'ArtPreviews');
  } catch (e) {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    cacheDir = path.join(appData, 'northtracks', 'ArtPreviews');
  }

  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to create ArtPreviews directory:', e);
  }

  // Dynamic import music-metadata to allow ESM compatibility inside CommonJS bundle
  const { parseFile } = await import('music-metadata');
  
  const folderImageCache = new Map<string, string | undefined>();

  const rawTracks = await limitConcurrency(audioFiles, 5, async (filePath) => {
    try {
      const metadata = await parseFile(filePath);
      const pictures = metadata.common.picture;
      let coverArt: string | undefined = undefined;
      
      if (pictures && pictures.length > 0) {
        const pic = pictures[0];
        try {
          let format = pic.format || 'image/jpeg';
          if (!format.includes('/')) {
            format = `image/${format}`;
          }
          const ext = format.includes('png') ? '.png' : '.jpg';
          const hash = crypto.createHash('md5').update(filePath).digest('hex');
          const cacheImagePath = path.join(cacheDir, `${hash}${ext}`);
          
          if (!fs.existsSync(cacheImagePath)) {
            const buffer = Buffer.isBuffer(pic.data) ? pic.data : Buffer.from(pic.data as any);
            await fs.promises.writeFile(cacheImagePath, buffer);
          }
          coverArt = `media:///${cacheImagePath.replace(/\\/g, '/')}`;
        } catch (e) {
          console.error('Failed to convert cover art to file:', e);
        }
      } else {
        const dir = path.dirname(filePath);
        let localImgPath = folderImageCache.get(dir);
        if (!folderImageCache.has(dir)) {
          localImgPath = findFolderImage(filePath);
          folderImageCache.set(dir, localImgPath);
        }
        if (localImgPath) {
          coverArt = `media:///${localImgPath.replace(/\\/g, '/')}`;
        }
      }

      return {
        filePath,
        title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        genre: metadata.common.genre || [],
        duration: metadata.format.duration || 0,
        bitrate: metadata.format.bitrate || 0,
        coverArt,
      };
    } catch (err) {
      // Fallback to basic file info if parsing fails
      let coverArt: string | undefined = undefined;
      const dir = path.dirname(filePath);
      let localImgPath = folderImageCache.get(dir);
      if (!folderImageCache.has(dir)) {
        localImgPath = findFolderImage(filePath);
        folderImageCache.set(dir, localImgPath);
      }
      if (localImgPath) {
        coverArt = `media:///${localImgPath.replace(/\\/g, '/')}`;
      }
      
      return {
        filePath,
        title: path.basename(filePath, path.extname(filePath)),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        genre: [],
        duration: 0,
        bitrate: 0,
        coverArt,
      };
    }
  });

  const tracks = rawTracks.filter(Boolean) as TrackInfo[];

  // Detect duplicates by grouping by title + artist combination (case-insensitive and trimmed)
  const groups = new Map<string, number[]>(); // normalized key -> indices in tracks array
  
  tracks.forEach((track, index) => {
    const key = `${track.title.toLowerCase().trim()}|${track.artist.toLowerCase().trim()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(index);
  });

  // For duplicates, mark the lower-numbered ones with isDuplicate: true
  groups.forEach((indices) => {
    if (indices.length > 1) {
      // All except the last one (highest index) are lower-numbered duplicates
      for (let i = 0; i < indices.length - 1; i++) {
        tracks[indices[i]].isDuplicate = true;
      }
    }
  });

  return tracks;
}
