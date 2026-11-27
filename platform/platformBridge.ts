import type {
  PlatformInfo,
  PlatformSavePayload,
  PlatformScorePayload,
  PlatformType,
  PlatformUser,
} from './types';

/**
 * PlatformBridge: Unified adapter for Playgama Bridge, YouTube Playables,
 * Facebook Gaming, Google Playground, and Standalone Mobile/Desktop Web.
 */
class PlatformBridge {
  private platform: PlatformType = 'standalone';
  private isInitialized = false;
  private initPromise: Promise<PlatformInfo> | null = null;
  private hasSignalledReady = false;
  private isGameplayActive = false;
  private hostAudioMuted = false;
  private hostPaused = false;
  private pauseCallbacks: Array<() => void> = [];
  private resumeCallbacks: Array<() => void> = [];
  private audioCallbacks: Array<(isMuted: boolean) => void> = [];
  private playgamaSaveTimer: number | null = null;
  private pendingPlaygamaSave: PlatformSavePayload | null = null;
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
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInit();
    return this.initPromise;
  }

  private async performInit(): Promise<PlatformInfo> {
    // 1. Detect Playgama Bridge SDK v2
    if (typeof window !== 'undefined' && typeof window.bridge !== 'undefined') {
      const bridge = window.bridge;
      try {
        await (window.__playgamaInitPromise ?? bridge.initialize());
        this.platform = 'playgama';

        const playerPhotos = bridge.player?.photos;
        this.user = {
          id: bridge.player?.id || 'playgama_player',
          name: bridge.player?.name || 'Astral Traveler',
          avatarUrl:
            Array.isArray(playerPhotos) && playerPhotos.length > 0
              ? playerPhotos[0]
              : undefined,
          isGuest: !bridge.player?.isAuthorized,
        };

        const EVENT = bridge.EVENT_NAME;

        if (bridge.platform) {
          // Read platform language immediately (also satisfies QA tool GET_LANGUAGE check)
          void bridge.platform.language;

          this.hostAudioMuted = bridge.platform.isAudioEnabled === false;
          this.hostPaused = bridge.platform.isPaused === true;
          if (this.hostAudioMuted) {
            this.triggerAudioChange(true);
          }

          bridge.platform.on(EVENT.AUDIO_STATE_CHANGED, (isEnabled: unknown) => {
            this.hostAudioMuted = !Boolean(isEnabled);
            this.triggerAudioChange(this.hostAudioMuted);
          });
          bridge.platform.on(EVENT.PAUSE_STATE_CHANGED, (isPaused: unknown) => {
            this.hostPaused = Boolean(isPaused);
            if (this.hostPaused) {
              this.triggerPause();
            } else {
              this.triggerResume();
            }
          });
          bridge.platform.on(EVENT.VISIBILITY_STATE_CHANGED, (vis: unknown) => {
            if (vis === 'hidden') {
              this.hostPaused = true;
              this.triggerPause();
            } else {
              this.hostPaused = Boolean(bridge.platform?.isPaused);
              if (!this.hostPaused) {
                this.triggerResume();
              }
            }
          });
        }

        if (bridge.advertisement) {
          bridge.advertisement.on(
            EVENT.INTERSTITIAL_STATE_CHANGED,
            (state: unknown) => {
              if (state === bridge.INTERSTITIAL_STATE.OPENED) {
                this.hostPaused = true;
                this.triggerPause();
                this.triggerAudioChange(true);
              } else if (
                state === bridge.INTERSTITIAL_STATE.CLOSED ||
                state === bridge.INTERSTITIAL_STATE.FAILED
              ) {
                this.hostPaused = Boolean(bridge.platform?.isPaused);
                this.hostAudioMuted = bridge.platform?.isAudioEnabled === false;
                this.triggerAudioChange(this.hostAudioMuted);
                if (!this.hostPaused) {
                  this.triggerResume();
                }
              }
            },
          );

          bridge.advertisement.on(
            EVENT.REWARDED_STATE_CHANGED,
            (state: unknown) => {
              if (state === bridge.REWARDED_STATE.OPENED) {
                this.hostPaused = true;
                this.triggerPause();
                this.triggerAudioChange(true);
              } else if (
                state === bridge.REWARDED_STATE.CLOSED ||
                state === bridge.REWARDED_STATE.FAILED
              ) {
                this.hostPaused = Boolean(bridge.platform?.isPaused);
                this.hostAudioMuted = bridge.platform?.isAudioEnabled === false;
                this.triggerAudioChange(this.hostAudioMuted);
                if (!this.hostPaused) {
                  this.triggerResume();
                }
              }
            },
          );
        }

        this.isInitialized = true;
        console.log(
          `[PlatformBridge] Playgama Bridge initialized (${bridge.platform?.id || 'playgama'}).`,
        );
        return this.getInfo();
      } catch (err) {
        console.warn('[PlatformBridge] Playgama Bridge init failed, falling back:', err);
      }
    }

    // 2. Detect Facebook Instant Games
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
            script.onerror = () =>
              reject(new Error('Failed to load FBInstant SDK'));
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

    // 3. Detect YouTube Playables
    if (
      typeof window !== 'undefined' &&
      typeof window.YTPlayables !== 'undefined'
    ) {
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
        window.YTPlayables.onAudioMuteChange((muted) =>
          this.triggerAudioChange(muted),
        );
      }

      this.isInitialized = true;
      console.log('[PlatformBridge] YouTube Playables initialized.');
      return this.getInfo();
    }

    // 4. Detect Playground SDK
    if (
      typeof window !== 'undefined' &&
      typeof window.PlaygroundSDK !== 'undefined'
    ) {
      this.platform = 'playground';
      this.isInitialized = true;
      console.log('[PlatformBridge] Playground SDK detected.');
      return this.getInfo();
    }

    // 5. Standalone Fallback with standard browser visibilitychange listeners
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

  hasPlaygamaBridge(): boolean {
    return this.platform === 'playgama' && Boolean(window.bridge);
  }

  isHostMuted(): boolean {
    return this.hostAudioMuted;
  }

  isHostPaused(): boolean {
    return this.hostPaused;
  }

  isInterstitialAdSupported(): boolean {
    return (
      this.platform === 'playgama' &&
      Boolean(window.bridge?.advertisement?.isInterstitialSupported)
    );
  }

  isRewardedAdSupported(): boolean {
    return (
      this.platform === 'playgama' &&
      Boolean(window.bridge?.advertisement?.isRewardedSupported)
    );
  }

  /**
   * Reports loading progress to platform loader (0-100%).
   */
  reportProgress(percentage: number): void {
    const clamped = Math.max(0, Math.min(100, Math.floor(percentage)));
    if (this.platform === 'playgama' && window.bridge) {
      try {
        window.bridge.setGameLoadingProgress(clamped);
      } catch {
        // Ignore progress errors if platform doesn't support it
      }
    } else if (
      this.platform === 'facebook' &&
      window.FBInstant?.setLoadingProgress
    ) {
      window.FBInstant.setLoadingProgress(clamped);
    }
  }

  /**
   * Signals to the host platform that initial loading is complete
   * and the first playable frame is visible for interaction.
   */
  async reportGameReady(): Promise<void> {
    if (this.hasSignalledReady) return;
    this.hasSignalledReady = true;

    if (this.platform === 'playgama' && window.bridge?.platform) {
      try {
        await window.bridge.platform.sendMessage(
          window.bridge.PLATFORM_MESSAGE.GAME_READY,
        );
      } catch (err) {
        console.warn('[PlatformBridge] Playgama game_ready error:', err);
      }
      try {
        const ads = window.bridge.advertisement;
        if (ads?.isInterstitialSupported) {
          ads.preloadInterstitial?.('level_transition');
        }
        if (ads?.isRewardedSupported) {
          ads.preloadRewarded?.('hint_reward');
        }
      } catch {
        // Preloading is optional best-effort
      }
    } else if (
      this.platform === 'facebook' &&
      window.FBInstant?.startGameAsync
    ) {
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
   * Notifies Playgama-compatible platforms whether active gameplay is underway.
   */
  reportGameplayState(active: boolean): void {
    if (this.isGameplayActive === active) return;
    this.isGameplayActive = active;

    if (this.platform === 'playgama' && window.bridge?.platform) {
      const msg = active
        ? window.bridge.PLATFORM_MESSAGE.GAMEPLAY_STARTED
        : window.bridge.PLATFORM_MESSAGE.GAMEPLAY_STOPPED;
      window.bridge.platform.sendMessage(msg).catch(() => {});
    }
  }

  /**
   * Dispatches level progression events for Playgama analytics/platform hooks.
   */
  reportLevelEvent(
    event: 'level_started' | 'level_completed',
    level: number,
  ): void {
    if (this.platform === 'playgama' && window.bridge?.platform) {
      const msg =
        event === 'level_started'
          ? window.bridge.PLATFORM_MESSAGE.LEVEL_STARTED
          : window.bridge.PLATFORM_MESSAGE.LEVEL_COMPLETED;
      window.bridge.platform.sendMessage(msg, {level}).catch(() => {});
    }
  }

  /**
   * Triggers an interstitial ad at natural transition points (e.g., level complete, restart, menu exit).
   */
  async showInterstitial(placement = 'level_transition'): Promise<void> {
    if (this.platform !== 'playgama' || !window.bridge?.advertisement) {
      return;
    }

    const ads = window.bridge.advertisement;
    if (!ads.isInterstitialSupported) {
      return;
    }

    return new Promise<void>((resolve) => {
      const bridge = window.bridge!;
      const EVENT = bridge.EVENT_NAME;
      const STATE = bridge.INTERSTITIAL_STATE;
      let settled = false;
      let timerId: number | null = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (timerId !== null) window.clearTimeout(timerId);
        ads.off(EVENT.INTERSTITIAL_STATE_CHANGED, onState);
        resolve();
      };

      const onState = (state: unknown) => {
        if (state === STATE.CLOSED || state === STATE.FAILED) {
          finish();
        }
      };

      ads.on(EVENT.INTERSTITIAL_STATE_CHANGED, onState);
      timerId = window.setTimeout(finish, 15000);

      try {
        ads.showInterstitial(placement);
      } catch {
        finish();
      }
    });
  }

  /**
   * Triggers an opt-in rewarded ad and resolves true strictly if REWARDED fires.
   */
  async showRewarded(placement = 'hint_reward'): Promise<boolean> {
    if (this.platform !== 'playgama' || !window.bridge?.advertisement) {
      return true;
    }

    const ads = window.bridge.advertisement;
    if (!ads.isRewardedSupported) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const bridge = window.bridge!;
      const EVENT = bridge.EVENT_NAME;
      const STATE = bridge.REWARDED_STATE;
      let settled = false;
      let rewardEarned = false;
      let timerId: number | null = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (timerId !== null) window.clearTimeout(timerId);
        ads.off(EVENT.REWARDED_STATE_CHANGED, onState);
        resolve(rewardEarned);
      };

      const onState = (state: unknown) => {
        if (state === STATE.REWARDED) {
          rewardEarned = true;
        } else if (state === STATE.CLOSED || state === STATE.FAILED) {
          finish();
        }
      };

      ads.on(EVENT.REWARDED_STATE_CHANGED, onState);
      timerId = window.setTimeout(finish, 30000);

      try {
        ads.showRewarded(placement);
      } catch {
        finish();
      }
    });
  }

  /**
   * Dispatches completed level scores and stats to host leaderboards.
   */
  reportScore(payload: PlatformScorePayload): void {
    console.log('[PlatformBridge] Reporting score:', payload);
    if (this.platform === 'playgama' && window.bridge?.leaderboards) {
      const lb = window.bridge.leaderboards;
      if (lb.type !== 'not_available') {
        lb.setScore('main_leaderboard', payload.score).catch(() => {});
      }
    } else if (
      this.platform === 'facebook' &&
      window.FBInstant?.postSessionScore
    ) {
      window.FBInstant.postSessionScore(payload.score);
    } else if (
      this.platform === 'youtube' &&
      window.YTPlayables?.sendScore
    ) {
      window.YTPlayables.sendScore({value: payload.score});
    }
  }

  /**
   * Saves game data to platform cloud (debounced on Playgama unless immediate=true).
   */
  async savePlatformData(
    data: PlatformSavePayload,
    immediate = false,
  ): Promise<void> {
    if (this.platform === 'playgama' && window.bridge?.storage) {
      this.pendingPlaygamaSave = data;
      const flush = async () => {
        const payload = this.pendingPlaygamaSave;
        this.pendingPlaygamaSave = null;
        if (!payload || !window.bridge?.storage) return;
        const keys = Object.keys(payload);
        const values = keys.map((k) =>
          typeof payload[k] === 'string'
            ? payload[k]
            : JSON.stringify(payload[k]),
        );
        try {
          await window.bridge.storage.set(keys, values);
        } catch (err) {
          console.warn('[PlatformBridge] Playgama storage.set error:', err);
        }
      };

      if (this.playgamaSaveTimer !== null) {
        window.clearTimeout(this.playgamaSaveTimer);
        this.playgamaSaveTimer = null;
      }

      if (immediate) {
        await flush();
      } else {
        this.playgamaSaveTimer = window.setTimeout(() => {
          this.playgamaSaveTimer = null;
          flush();
        }, 500);
      }
      return;
    }

    if (
      this.platform === 'facebook' &&
      window.FBInstant?.player?.setDataAsync
    ) {
      try {
        await window.FBInstant.player.setDataAsync(data);
        return;
      } catch (err) {
        console.warn(
          '[PlatformBridge] FB cloud save failed, falling back to local:',
          err,
        );
      }
    } else if (this.platform === 'youtube' && window.YTPlayables?.saveData) {
      try {
        await window.YTPlayables.saveData(JSON.stringify(data));
        return;
      } catch (err) {
        console.warn(
          '[PlatformBridge] YT save failed, falling back to local:',
          err,
        );
      }
    }

    // Local fallback (only when not on Playgama managed runtime)
    if (typeof window !== 'undefined' && !window.bridge) {
      try {
        localStorage.setItem(
          'ASTRAL_TERRACES_PLATFORM_BACKUP',
          JSON.stringify(data),
        );
      } catch {
        // Ignore storage quota
      }
    }
  }

  /**
   * Loads game data from platform cloud storage with safe timeout.
   */
  async loadPlatformData(keys: string[]): Promise<PlatformSavePayload | null> {
    if (this.platform === 'playgama' && window.bridge?.storage) {
      try {
        const res = await Promise.race([
          window.bridge.storage.get(keys, false),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
        ]);
        if (Array.isArray(res)) {
          const out: PlatformSavePayload = {};
          keys.forEach((k, idx) => {
            if (res[idx] !== null && res[idx] !== undefined) {
              out[k] = res[idx];
            }
          });
          return Object.keys(out).length > 0 ? out : null;
        }
      } catch (err) {
        console.warn('[PlatformBridge] Playgama storage.get error:', err);
      }
      return null;
    }

    if (
      this.platform === 'facebook' &&
      window.FBInstant?.player?.getDataAsync
    ) {
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
    if (typeof window !== 'undefined' && !window.bridge) {
      try {
        const raw = localStorage.getItem('ASTRAL_TERRACES_PLATFORM_BACKUP');
        if (raw) return JSON.parse(raw);
      } catch {
        // Ignore
      }
    }
    return null;
  }

  onPause(callback: () => void): () => void {
    this.pauseCallbacks.push(callback);
    if (this.hostPaused) {
      queueMicrotask(() => {
        if (this.hostPaused) callback();
      });
    }
    return () => {
      this.pauseCallbacks = this.pauseCallbacks.filter((cb) => cb !== callback);
    };
  }

  onResume(callback: () => void): () => void {
    this.resumeCallbacks.push(callback);
    return () => {
      this.resumeCallbacks = this.resumeCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onAudioMuteChange(callback: (isMuted: boolean) => void): () => void {
    this.audioCallbacks.push(callback);
    if (this.hostAudioMuted) {
      queueMicrotask(() => {
        callback(this.hostAudioMuted);
      });
    }
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
        this.platform === 'playgama' && window.bridge?.platform?.language
          ? window.bridge.platform.language
          : typeof navigator !== 'undefined'
            ? navigator.language || 'en'
            : 'en',
    };
  }
}

export const platformBridge = new PlatformBridge();
