export interface Settings {
  sourceFolderPath: string;
  destinationFolderPath: string;
  lastScanDate: string;
  genreOverrides: Record<string, string>;
  autoDetectDuplicates: boolean;
  watchSourceFolder: boolean;
  cachedLibrary?: any[];
  theme?: 'dark' | 'light';
  likedTracks?: string[];
  discordEnabled?: boolean;
  discordShowElapsed?: boolean;
  autoplayNextTrack?: boolean;
  rememberPlaybackPosition?: boolean;
  visualStyle?: 'solid' | 'acrylic' | 'glow';
  fontSize?: 'small' | 'medium' | 'large';
  smartShuffle?: boolean;
  playHistory?: Record<string, number>;
  dailyRecommendations?: { generatedDate: string; tracks: any[] };
  continueListening?: any[];
}

const DEFAULTS: Settings = {
  sourceFolderPath: 'D:\\Media\\Audio\\Music',
  destinationFolderPath: 'C:\\Users\\North\\Music',
  lastScanDate: '',
  genreOverrides: {},
  autoDetectDuplicates: true,
  watchSourceFolder: false,
  cachedLibrary: [],
  theme: 'dark',
  likedTracks: [],
  discordEnabled: false,
  discordShowElapsed: true,
  autoplayNextTrack: true,
  rememberPlaybackPosition: false,
  visualStyle: 'solid',
  fontSize: 'medium',
  smartShuffle: true,
  playHistory: {},
  dailyRecommendations: { generatedDate: '', tracks: [] },
  continueListening: [],
};

let storeInstance: any = null;

async function getStore() {
  if (storeInstance) return storeInstance;

  // Dynamic import electron-store for ESM compatibility in compiled CommonJS bundle
  const { default: Store } = await import('electron-store');
  
  storeInstance = new Store({
    defaults: DEFAULTS,
    name: 'settings', // Writes to %AppData%\NorthTracks\settings.json
  });

  return storeInstance;
}

export async function getSettings(): Promise<Settings> {
  try {
    const store = await getStore();
    return {
      sourceFolderPath: store.get('sourceFolderPath') as string,
      destinationFolderPath: store.get('destinationFolderPath') as string,
      lastScanDate: store.get('lastScanDate') as string,
      genreOverrides: store.get('genreOverrides') as Record<string, string>,
      autoDetectDuplicates: store.get('autoDetectDuplicates') as boolean,
      watchSourceFolder: store.get('watchSourceFolder') as boolean,
      cachedLibrary: store.get('cachedLibrary') as any[] || [],
      theme: (store.get('theme') as 'dark' | 'light') || 'dark',
      likedTracks: store.get('likedTracks') as string[] || [],
      discordEnabled: store.get('discordEnabled') !== undefined ? (store.get('discordEnabled') as boolean) : false,
      discordShowElapsed: store.get('discordShowElapsed') !== undefined ? (store.get('discordShowElapsed') as boolean) : true,
      autoplayNextTrack: store.get('autoplayNextTrack') !== undefined ? (store.get('autoplayNextTrack') as boolean) : true,
      rememberPlaybackPosition: store.get('rememberPlaybackPosition') !== undefined ? (store.get('rememberPlaybackPosition') as boolean) : false,
      visualStyle: (store.get('visualStyle') as 'solid' | 'acrylic' | 'glow') || 'solid',
      fontSize: (store.get('fontSize') as 'small' | 'medium' | 'large') || 'medium',
      smartShuffle: store.get('smartShuffle') !== undefined ? (store.get('smartShuffle') as boolean) : true,
      playHistory: store.get('playHistory') as Record<string, number> || {},
      dailyRecommendations: store.get('dailyRecommendations') as { generatedDate: string; tracks: any[] } || { generatedDate: '', tracks: [] },
      continueListening: store.get('continueListening') as any[] || [],
    };
  } catch (err) {
    console.error('Failed to load settings from store, falling back to defaults:', err);
    return { ...DEFAULTS };
  }
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  try {
    const store = await getStore();
    
    if (settings.sourceFolderPath !== undefined) {
      store.set('sourceFolderPath', settings.sourceFolderPath);
    }
    if (settings.destinationFolderPath !== undefined) {
      store.set('destinationFolderPath', settings.destinationFolderPath);
    }
    if (settings.lastScanDate !== undefined) {
      store.set('lastScanDate', settings.lastScanDate);
    }
    if (settings.genreOverrides !== undefined) {
      store.set('genreOverrides', settings.genreOverrides);
    }
    if (settings.autoDetectDuplicates !== undefined) {
      store.set('autoDetectDuplicates', settings.autoDetectDuplicates);
    }
    if (settings.watchSourceFolder !== undefined) {
      store.set('watchSourceFolder', settings.watchSourceFolder);
    }
    if (settings.cachedLibrary !== undefined) {
      store.set('cachedLibrary', settings.cachedLibrary);
    }
    if (settings.theme !== undefined) {
      store.set('theme', settings.theme);
    }
    if (settings.likedTracks !== undefined) {
      store.set('likedTracks', settings.likedTracks);
    }
    if (settings.discordEnabled !== undefined) {
      store.set('discordEnabled', settings.discordEnabled);
    }
    if (settings.discordShowElapsed !== undefined) {
      store.set('discordShowElapsed', settings.discordShowElapsed);
    }
    if (settings.autoplayNextTrack !== undefined) {
      store.set('autoplayNextTrack', settings.autoplayNextTrack);
    }
    if (settings.rememberPlaybackPosition !== undefined) {
      store.set('rememberPlaybackPosition', settings.rememberPlaybackPosition);
    }
    if (settings.visualStyle !== undefined) {
      store.set('visualStyle', settings.visualStyle);
    }
    if (settings.fontSize !== undefined) {
      store.set('fontSize', settings.fontSize);
    }
    if (settings.smartShuffle !== undefined) {
      store.set('smartShuffle', settings.smartShuffle);
    }
    if (settings.playHistory !== undefined) {
      store.set('playHistory', settings.playHistory);
    }
    if (settings.dailyRecommendations !== undefined) {
      store.set('dailyRecommendations', settings.dailyRecommendations);
    }
    if (settings.continueListening !== undefined) {
      store.set('continueListening', settings.continueListening);
    }
  } catch (err) {
    console.error('Failed to save settings to store:', err);
  }

  return getSettings();
}
