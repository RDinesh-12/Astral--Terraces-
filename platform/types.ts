import type {PlaygamaBridge} from '@playgama/bridge';

/**
 * Unified Platform Bridge Types for Astral Terraces
 * Covers Playgama Bridge, YouTube Playables, Facebook Instant Games, Google Playground, and Standalone Web.
 */

export type PlatformType =
  | 'playgama'
  | 'youtube'
  | 'facebook'
  | 'playground'
  | 'standalone';

export interface PlatformUser {
  id: string;
  name: string;
  avatarUrl?: string;
  isGuest?: boolean;
}

export interface PlatformInfo {
  platform: PlatformType;
  isSupported: boolean;
  user: PlatformUser;
  locale: string;
}

export interface PlatformScorePayload {
  level: number;
  score: number;
  stars: number;
  timeSeconds: number;
  moves: number;
}

export interface PlatformSavePayload {
  [key: string]: any;
}

// Global declaration augmentations for platform SDKs
declare global {
  interface Window {
    // Playgama Bridge SDK v2
    bridge?: PlaygamaBridge;
    __playgamaInitPromise?: Promise<void>;

    // YouTube Playables SDK interface
    YTPlayables?: {
      onFirstFrameReady?: () => void;
      gameReady?: () => void;
      sendScore?: (scoreData: {value: number}) => void;
      onAudioMuteChange?: (callback: (isMuted: boolean) => void) => void;
      onPause?: (callback: () => void) => void;
      onResume?: (callback: () => void) => void;
      saveData?: (data: string) => Promise<void>;
      loadData?: () => Promise<string | null>;
    };

    // Facebook Instant Games SDK
    FBInstant?: {
      initializeAsync: () => Promise<void>;
      setLoadingProgress: (percentage: number) => void;
      startGameAsync: () => Promise<void>;
      getLocale: () => string;
      player: {
        getID: () => string;
        getName: () => string;
        getPhoto: () => string;
        getDataAsync: (keys: string[]) => Promise<Record<string, any>>;
        setDataAsync: (data: Record<string, any>) => Promise<void>;
      };
      onPause: (callback: () => void) => void;
      postSessionScore: (score: number) => void;
      quit: () => void;
    };
  }
}
