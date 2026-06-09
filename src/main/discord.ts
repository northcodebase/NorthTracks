import { Client } from 'discord-rpc';
import { getSettings } from './settings';

const CLIENT_ID = '1121502978588532756';
let rpcClient: Client | null = null;
let isConnected = false;
let lastActivityData: { title: string; artist: string; isPlaying: boolean; startTime?: number } | null = null;

export async function initializeDiscordRpc() {
  const settings = await getSettings();
  const enabled = settings.discordEnabled || false;

  if (!enabled) {
    await shutdownDiscordRpc();
    return;
  }

  // If already connected, do nothing
  if (rpcClient && isConnected) {
    if (lastActivityData) {
      updateDiscordActivity(
        lastActivityData.isPlaying,
        lastActivityData.title,
        lastActivityData.artist,
        lastActivityData.startTime
      );
    }
    return;
  }

  // Shutdown existing if any
  await shutdownDiscordRpc();

  try {
    rpcClient = new Client({ transport: 'ipc' });

    rpcClient.on('ready', () => {
      isConnected = true;
      console.log('Discord RPC connected successfully.');
      if (lastActivityData) {
        updateDiscordActivity(
          lastActivityData.isPlaying,
          lastActivityData.title,
          lastActivityData.artist,
          lastActivityData.startTime
        );
      }
    });

    // Handle connection error gracefully without crashing
    await rpcClient.login({ clientId: CLIENT_ID }).catch((err) => {
      console.log('Discord RPC login failed (Discord is likely not running):', err.message);
      isConnected = false;
      rpcClient = null;
    });
  } catch (err: any) {
    console.log('Failed to initialize Discord RPC client:', err.message);
    isConnected = false;
    rpcClient = null;
  }
}

export async function shutdownDiscordRpc() {
  if (rpcClient) {
    try {
      await rpcClient.clearActivity();
      await rpcClient.destroy();
    } catch (e) {
      // ignore
    }
  }
  rpcClient = null;
  isConnected = false;
}

export async function updateDiscordActivity(
  isPlaying: boolean,
  title: string,
  artist: string,
  startTime?: number
) {
  // Save last activity data in case we connect/reconnect later
  if (!lastActivityData || lastActivityData.title !== title || lastActivityData.artist !== artist || lastActivityData.isPlaying !== isPlaying) {
    lastActivityData = { title, artist, isPlaying, startTime: startTime || Date.now() };
  }

  const settings = await getSettings();
  const enabled = settings.discordEnabled || false;
  if (!enabled) {
    await shutdownDiscordRpc();
    return;
  }

  // If client is not initialized, attempt connection now
  if (!rpcClient || !isConnected) {
    await initializeDiscordRpc();
    return;
  }

  try {
    const activity: any = {
      details: title.substring(0, 128),
      state: isPlaying ? ('by ' + artist).substring(0, 128) : 'Paused',
      largeImageKey: 'northtracks_logo',
      largeImageText: 'NorthTracks',
      smallImageKey: isPlaying ? 'playing' : 'paused'
    };

    if (isPlaying && settings.discordShowElapsed) {
      activity.startTimestamp = startTime || lastActivityData.startTime || Date.now();
    }

    await rpcClient.setActivity(activity);
  } catch (err: any) {
    console.error('Failed to set Discord activity:', err.message);
  }
}

export async function clearDiscordActivity() {
  lastActivityData = null;
  if (rpcClient && isConnected) {
    try {
      await rpcClient.clearActivity();
    } catch (err: any) {
      console.error('Failed to clear Discord activity:', err.message);
    }
  }
}

// Stub connection tester
export async function testDiscordRpcConnection(_clientId: string): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Stub connection success' };
}
