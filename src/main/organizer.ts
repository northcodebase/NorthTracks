import path from 'path';
import fs from 'fs';
import os from 'os';
import { TrackInfo, getAudioFiles } from './scanner';
import { getSettings } from './settings';

export interface LogEntry {
  timestamp: string;
  source: string;
  destination: string;
  status: 'success' | 'failed';
  error?: string;
}

// Dynamically determine %AppData% path to be test-safe outside Electron environment
let appDataPath: string;
try {
  const { app } = require('electron');
  appDataPath = app.getPath('appData');
} catch (e) {
  appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
}

const logFilePath = path.join(appDataPath, 'NorthTracks', 'import-log.json');

let genreMapCache: Record<string, string> | null = null;

export function loadGenreMap(): Record<string, string> {
  if (genreMapCache) return genreMapCache;

  const defaultMap: Record<string, string> = {
    "Filme": "Bollywood",
    "Films": "Soundtrack",
    "Indische Musik": "Indian Music",
    "Indische Muziek": "Indian Music",
    "Indische Musik, Pop": "Indian Pop",
    "Asiatische Musik": "Asian Music",
    "Asian Music & Films": "Bollywood",
    "Asian Music & Pop": "K-Pop",
    "Asian Music & Rap": "Desi Hip-Hop",
    "Pop & Rock": "Pop Rock",
    "R&B, Soul & Funk": "R&B",
    "Pop, International Pop": "Pop",
    "Latin Music": "Latin",
    "Electro": "Electronic",
    "Dance": "Dance & EDM",
    "Music": "Unsorted"
  };

  const dir = path.join(appDataPath, 'NorthTracks');
  const filePath = path.join(dir, 'genre-map.json');

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultMap, null, 2), 'utf-8');
      genreMapCache = defaultMap;
      return defaultMap;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      genreMapCache = parsed as Record<string, string>;
      return genreMapCache;
    }
  } catch (err) {
    console.error('Failed to load genre map from disk, falling back to default:', err);
  }

  genreMapCache = defaultMap;
  return defaultMap;
}

export function clearGenreMapCache() {
  genreMapCache = null;
}

export function normalizeGenreName(genre: string): string {
  const map = loadGenreMap();
  const trimmed = genre.trim();
  const lowerTrimmed = trimmed.toLowerCase();

  for (const key of Object.keys(map)) {
    if (key.trim().toLowerCase() === lowerTrimmed) {
      return map[key];
    }
  }
  return trimmed;
}

// Helper to sanitize genre tag to form a valid Windows directory name
function sanitizeFolderName(name: string): string {
  // Remove Windows-restricted folder path characters: \ / : * ? " < > |
  const sanitized = name.replace(/[\\/:*?"<>|]/g, '').trim();
  return sanitized || 'Unsorted';
}

export async function organizeLibrary(
  tracks: TrackInfo[],
  onProgress?: (current: number, total: number) => void
): Promise<{ successCount: number; failedCount: number; duplicateCount: number; unsortedCount: number; logs: LogEntry[] }> {
  let successCount = 0;
  let failedCount = 0;
  let duplicateCount = 0;
  let unsortedCount = 0;
  const newLogs: LogEntry[] = [];
  
  // Fetch custom target path from settings
  const settings = await getSettings();
  const musicRoot = settings.destinationFolderPath || path.join(os.homedir(), 'Music');

  // Clear cache to ensure freshest map from disk
  clearGenreMapCache();

  const uniqueTracks = tracks.filter(t => !t.isDuplicate);
  const total = uniqueTracks.length;
  let processed = 0;

  // Fire initial progress event if total is 0 or greater
  if (onProgress) {
    onProgress(0, total);
  }

  for (const track of tracks) {
    // 1. Skip duplicates
    if (track.isDuplicate) {
      duplicateCount++;
      continue;
    }

    // 2. Identify and sanitize genre directory
    let genreName = 'Unsorted';
    let isUnsorted = true;
    if (track.genre && track.genre.length > 0) {
      const primaryGenre = track.genre[0].trim();
      if (primaryGenre) {
        const normalized = normalizeGenreName(primaryGenre);
        const sanitized = sanitizeFolderName(normalized);
        if (sanitized !== 'Unsorted') {
          genreName = sanitized;
          isUnsorted = false;
        }
      }
    }

    const targetDir = path.join(musicRoot, genreName);
    const targetPath = path.join(targetDir, path.basename(track.filePath));
    const timestamp = new Date().toISOString();

    try {
      // 3. Create genre folder if it does not exist
      fs.mkdirSync(targetDir, { recursive: true });

      // 4. Copy unique track (leaving source folder completely unmodified)
      fs.copyFileSync(track.filePath, targetPath);
      
      successCount++;
      if (isUnsorted) {
        unsortedCount++;
      }
      newLogs.push({
        timestamp,
        source: track.filePath,
        destination: targetPath,
        status: 'success'
      });
    } catch (err: any) {
      failedCount++;
      newLogs.push({
        timestamp,
        source: track.filePath,
        destination: targetPath,
        status: 'failed',
        error: err.message
      });
    }

    processed++;
    if (onProgress) {
      onProgress(processed, total);
    }
  }

  // 5. Append logs to %AppData%\NorthTracks\import-log.json
  if (newLogs.length > 0) {
    try {
      const logDir = path.dirname(logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      let existingLogs: LogEntry[] = [];
      if (fs.existsSync(logFilePath)) {
        try {
          const fileContent = fs.readFileSync(logFilePath, 'utf-8');
          existingLogs = JSON.parse(fileContent);
          if (!Array.isArray(existingLogs)) {
            existingLogs = [];
          }
        } catch (e) {
          existingLogs = [];
        }
      }

      const updatedLogs = [...existingLogs, ...newLogs];
      fs.writeFileSync(logFilePath, JSON.stringify(updatedLogs, null, 2), 'utf-8');
    } catch (logErr) {
      console.error('Failed to write organizer log file:', logErr);
    }
  }

  return {
    successCount,
    failedCount,
    duplicateCount,
    unsortedCount,
    logs: newLogs
  };
}

function cleanEmptyDirs(dir: string, rootDir: string, deletedDirs: Set<string>) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        cleanEmptyDirs(filePath, rootDir, deletedDirs);
      }
    }
    
    const remainingFiles = fs.readdirSync(dir);
    if (remainingFiles.length === 0 && path.resolve(dir) !== path.resolve(rootDir)) {
      fs.rmdirSync(dir);
      deletedDirs.add(dir);
    }
  } catch (e) {
    // Ignore read/delete permission errors or missing folders
  }
}

export async function reorganizeFolders(
  destinationFolderPath: string
): Promise<{ filesMoved: number; foldersRenamed: number }> {
  // Clear map cache to get fresh map
  clearGenreMapCache();

  // Find all audio files recursively in destinationFolderPath
  const audioFiles = getAudioFiles(destinationFolderPath);
  
  // Dynamic import music-metadata
  const { parseFile } = await import('music-metadata');

  let filesMoved = 0;
  const uniqueSourceDirsMovedFrom = new Set<string>();

  for (const filePath of audioFiles) {
    try {
      const metadata = await parseFile(filePath);
      
      let genreName = 'Unsorted';
      if (metadata.common.genre && metadata.common.genre.length > 0) {
        const primaryGenre = metadata.common.genre[0].trim();
        if (primaryGenre) {
          const normalized = normalizeGenreName(primaryGenre);
          const sanitized = sanitizeFolderName(normalized);
          if (sanitized !== 'Unsorted') {
            genreName = sanitized;
          }
        }
      }

      const currentDir = path.dirname(filePath);
      const targetDir = path.join(destinationFolderPath, genreName);
      const targetPath = path.join(targetDir, path.basename(filePath));

      if (path.resolve(currentDir) !== path.resolve(targetDir)) {
        // Ensure destination folder exists
        fs.mkdirSync(targetDir, { recursive: true });

        // Move the file
        try {
          fs.renameSync(filePath, targetPath);
        } catch (renameErr) {
          // Fallback to copy & delete
          fs.copyFileSync(filePath, targetPath);
          fs.unlinkSync(filePath);
        }

        filesMoved++;
        uniqueSourceDirsMovedFrom.add(currentDir);
      }
    } catch (err) {
      // If parsing fails, fall back to moving it to "Unsorted"
      const currentDir = path.dirname(filePath);
      const targetDir = path.join(destinationFolderPath, 'Unsorted');
      const targetPath = path.join(targetDir, path.basename(filePath));

      if (path.resolve(currentDir) !== path.resolve(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        try {
          fs.renameSync(filePath, targetPath);
        } catch (renameErr) {
          fs.copyFileSync(filePath, targetPath);
          fs.unlinkSync(filePath);
        }
        filesMoved++;
        uniqueSourceDirsMovedFrom.add(currentDir);
      }
    }
  }

  // Cleanup empty directories recursively
  const deletedDirs = new Set<string>();
  if (fs.existsSync(destinationFolderPath)) {
    cleanEmptyDirs(destinationFolderPath, destinationFolderPath, deletedDirs);
  }

  // Count empty folders deleted that files were moved out of
  let foldersRenamed = 0;
  for (const deletedDir of deletedDirs) {
    if (uniqueSourceDirsMovedFrom.has(deletedDir)) {
      foldersRenamed++;
    }
  }

  return {
    filesMoved,
    foldersRenamed
  };
}
