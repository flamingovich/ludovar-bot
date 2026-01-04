
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export enum ContestStep {
  REFERRAL = 0,
  PAYOUT = 1,
  FINAL = 2,
  SUCCESS = 3
}

export type PayoutType = 'card' | 'trc20';

// Global type definition for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initDataUnsafe: {
          user?: TelegramUser;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        };
      };
    };
  }
}
