
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface WinnerInfo {
  name: string;
  ticketNumber: number;
  prizeWon: number;
  isFake: boolean;
}

export interface UserProfile {
  payoutValue: string;
  payoutType: PayoutType;
  participationCount: number;
  totalWon: number;
  savedPayouts: Array<{ type: PayoutType; value: string }>;
  participatedContests: Record<string, number>; // contestId -> ticketNumber
}

export interface ProjectPreset {
  id: string;
  name: string;
  referralLink: string;
}

export interface Contest {
  id: string;
  title: string;
  projectId: string; // ID пресета проекта
  prizeRub: number;
  createdAt: number;
  expiresAt?: number | null;
  participantCount: number; // Общее кол-во билетов
  realParticipantCount: number; // Кол-во реальных людей
  isCompleted?: boolean;
  winners?: WinnerInfo[];
  winnerCount: number;
  lastTicketNumber: number;
  seed?: string;
}

export enum ContestStep {
  LIST = 'list',
  REFERRAL = 'referral',
  PAYOUT = 'payout',
  TICKET_SHOW = 'ticket_show',
  SUCCESS = 'success'
}

export type PayoutType = 'card' | 'trc20';
export type Currency = 'RUB' | 'USD' | 'EUR' | 'KZT' | 'UAH' | 'BYN';

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