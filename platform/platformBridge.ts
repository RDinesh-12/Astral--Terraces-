import type {
  PlatformInfo,
  PlatformSavePayload,
  PlatformScorePayload,
  PlatformType,
  PlatformUser,
} from './types';

/**
 * PlatformBridge: Unified adapter for YouTube Playables, Facebook Gaming,
 * Google Playground, and Standalone Mobile/Desktop Web.
 */
class PlatformBridge {
  private platform: PlatformType = 'standalone';
  private isInitialized = false;
  private pauseCallbacks: Array<() => void> = [];
  private resumeCallbacks: Array<() => void> = [];
  private audioCallbacks: Array<(isMuted: boolean) => void> = [];
  private user: PlatformUser = {
    id: 'local_player',
    name: 'Astral Wanderer',
    isGuest: true,
  };

  /**
   * Detects active runtime host and initializes platform lifecycle.
   */
  async init(): Promise<PlatformInfo> {
    if (this.isInitialized) {
      return this.getInfo();
    }

    // 1. Detect Facebook Instant Games
    const isFacebook =
      typeof window !== 'undefined' &&
      (typeof window.FBInstant !== 'undefined' ||
        window.location.search.includes('fbinstant') ||
        window.location.hostname.includes('facebook') ||
        window.location.hostname.includes('fbcdn'));

    if (isFacebook) {
      if (typeof window.FBInstant === 'undefined') {
        try {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://connect.facebook.net/en_US/fbinstant.7.1.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load FBInstant SDK'));
            document.head.appendChild(script);
          });
        } catch (err) {
          console.warn('[PlatformBridge] FB script load failed:', err);
        }
      }

      if (typeof window.FBInstant !== 'undefined') {
        try {
          await window.FBInstant.initializeAsync();
          this.platform = 'facebook';
          const p = window.FBInstant.player;
          if (p) {
            this.user = {
              id: p.getID() || 'fb_player',
              name: p.getName() || 'Facebook Traveler',
              avatarUrl: p.getPhoto() || undefined,
              isGuest: false,
            };
          }
          window.FBInstant.onPause(() => this.triggerPause());
          this.isInitialized = true;
          console.log('[PlatformBridge] Facebook Instant Games initialized.');
          return this.getInfo();
        } catch (err) {
          console.warn('[PlatformBridge] FBInstant init failed, falling back:', err);
        }
      }
    }

    // 2. Detect YouTube Playables
    if (typeof window !== 'undefined' && typeof window.YTPlayables !== 'undefined') {
      this.platform = 'youtube';
      this.user = {
        id: 'yt_player',
        name: 'YouTube Explorer',
        isGuest: false,
      };

      if (window.YTPlayables.onPause) {
        window.YTPlayables.onPause(() => this.triggerPause());
      }
      if (window.YTPlayables.onResume) {
        window.YTPlayables.onResume(() => this.triggerResume());
      }
      if (window.YTPlayables.onAudioMuteChange) {
        window.YTPlayables.onAudioMuteChange((muted) => this.triggerAudioChange(muted));
      }

      this.isInitialized = true;
      console.log('[PlatformBridge] YouTube Playables initialized.');
      return this.getInfo();
    }

    // 3. Detect Playground SDK
    if (typeof window !== 'undefined' && typeof window.PlaygroundSDK !== 'undefined') {
      this.platform = 'playground';
      this.isInitialized = true;
      console.log('[PlatformBridge] Playground SDK detected.');
      return this.getInfo();
    }

    // 4. Standalone Fallback with standard browser visibilitychange listeners
    this.platform = 'standalone';
    this.isInitialized = true;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.triggerPause();
        } else {
          this.triggerResume();
        }
      });
      window.addEventListener('blur', () => this.triggerPause());
      window.addEventListener('focus', () => this.triggerResume());
    }

    console.log('[PlatformBridge] Standalone Web mode active.');
    return this.getInfo();
  }

  /**
   * Reports loading progress to platform loader (0-100%).
   */
  reportProgress(percentage: number): void {
    const clamped = Math.max(0, Math.min(100, Math.floor(percentage)));
    if (this.platform === 'facebook' && window.FBInstant?.setLoadingProgress) {
      window.FBInstant.setLoadingProgress(clamped);
    }
  }

  /**
   * Signals to the host platform that initial loading is complete
   * and the game is ready for interaction.
   */
  async reportGameReady(): Promise<void> {
    if (this.platform === 'facebook' && window.FBInstant?.startGameAsync) {
      try {
        await window.FBInstant.startGameAsync();
      } catch (err) {
        console.warn('[PlatformBridge] FB startGameAsync error:', err);
      }
    } else if (this.platform === 'youtube') {
      if (window.YTPlayables?.onFirstFrameReady) {
        window.YTPlayables.onFirstFrameReady();
      }
      if (window.YTPlayables?.gameReady) {
        window.YTPlayables.gameReady();
      }
    }
    console.log(`[PlatformBridge] Game ready signalled on ${this.platform}.`);
  }

  /**
   * Dispatches completed level scores and stats to host leaderboards.
   */
  reportScore(payload: PlatformScorePayload): void {
    console.log('[PlatformBridge] Reporting score:', payload);
    if (this.platform === 'facebook' && window.FBInstant?.postSessionScore) {
      window.FBInstant.postSessionScore(payload.score);
    } else if (this.platform === 'youtube' && window.YTPlayables?.sendScore) {
      window.YTPlayables.sendScore({value: payload.score});
    }
  }

  /**
   * Saves game data to platform cloud (falling back to localStorage).
   */
  async savePlatformData(data: PlatformSavePayload): Promise<void> {
    if (this.platform === 'facebook' && window.FBInstant?.player?.setDataAsync) {
      try {
        await window.FBInstant.player.setDataAsync(data);
        return;
      } catch (err) {
        console.warn('[PlatformBridge] FB cloud save failed, falling back to local:', err);
      }
    } else if (this.platform === 'youtube' && window.YTPlayables?.saveData) {
      try {
        await window.YTPlayables.saveData(JSON.stringify(data));
        return;
      } catch (err) {
        console.warn('[PlatformBridge] YT save failed, falling back to local:', err);
      }
    }

    // Local fallback
    try {
      localStorage.setItem('ASTRAL_TERRACES_PLATFORM_BACKUP', JSON.stringify(data));
    } catch {
      // Ignore storage quota
    }
  }

  /**
   * Loads game data from platform cloud storage.
   */
  async loadPlatformData(keys: string[]): Promise<PlatformSavePayload | null> {
    if (this.platform === 'facebook' && window.FBInstant?.player?.getDataAsync) {
      try {
        return await window.FBInstant.player.getDataAsync(keys);
      } catch (err) {
        console.warn('[PlatformBridge] FB cloud load error:', err);
      }
    } else if (this.platform === 'youtube' && window.YTPlayables?.loadData) {
      try {
        const raw = await window.YTPlayables.loadData();
        if (raw) return JSON.parse(raw);
      } catch (err) {
        console.warn('[PlatformBridge] YT load error:', err);
      }
    }

    // Local fallback
    try {
      const raw = localStorage.getItem('ASTRAL_TERRACES_PLATFORM_BACKUP');
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return null;
  }

  onPause(callback: () => void): () => void {
    this.pauseCallbacks.push(callback);
    return () => {
      this.pauseCallbacks = this.pauseCallbacks.filter((cb) => cb !== callback);
    };
  }

  onResume(callback: () => void): () => void {
    this.resumeCallbacks.push(callback);
    return () => {
      this.resumeCallbacks = this.resumeCallbacks.filter((cb) => cb !== callback);
    };
  }

  onAudioMuteChange(callback: (isMuted: boolean) => void): () => void {
    this.audioCallbacks.push(callback);
    return () => {
      this.audioCallbacks = this.audioCallbacks.filter((cb) => cb !== callback);
    };
  }

  private triggerPause(): void {
    this.pauseCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('[PlatformBridge] Error in onPause callback:', e);
      }
    });
  }

  private triggerResume(): void {
    this.resumeCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('[PlatformBridge] Error in onResume callback:', e);
      }
    });
  }

  private triggerAudioChange(isMuted: boolean): void {
    this.audioCallbacks.forEach((cb) => {
      try {
        cb(isMuted);
      } catch (e) {
        console.error('[PlatformBridge] Error in onAudio callback:', e);
      }
    });
  }

  getInfo(): PlatformInfo {
    return {
      platform: this.platform,
      isSupported: true,
      user: this.user,
      locale:
        typeof navigator !== 'undefined'
          ? navigator.language || 'en'
          : 'en',
    };
  }
}

export const platformBridge = new PlatformBridge();
