
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export enum AppTab {
  GAME = 'game',
  BOOSTS = 'boosts',
  PROFILE = 'profile'
}

export interface GameState {
  clicks: number;
  level: number;
  clickPower: number;
  passiveIncome: number;
}
