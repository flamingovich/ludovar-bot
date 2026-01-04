
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  referralLink: string;
  createdAt: number;
}

export enum ContestStep {
  LIST = 'list',
  REFERRAL = 'referral',
  PAYOUT = 'payout',
  FINAL = 'final',
  SUCCESS = 'success'
}

export type PayoutType = 'card' | 'trc20';

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
