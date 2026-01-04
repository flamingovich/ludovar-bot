
export interface BotParticipant {
  id: string;
  name: string;
  payout: string; // Маппится на creditCard из БД
  registeredAt: string;
  depositAmount: number;
  isBot: true;
  participationCount?: number;
  totalWon?: number;
  creditCard?: string;
}
