
export interface BotParticipant {
  name: string;
  payout: string;
  registeredAt: string;
  depositAmount: number;
  isBot: true;
}

export const BOTS_POOL: BotParticipant[] = [
  { name: "Иван777 🔥", payout: "4432 1029 3847 5521", registeredAt: "12.09.2024", depositAmount: 45000, isBot: true },
  { name: "Санек_top ⚡️", payout: "5536 9928 1123 4409", registeredAt: "05.10.2024", depositAmount: 12000, isBot: true },
  { name: "Димон_vip 💎", payout: "2202 8837 4456 1290", registeredAt: "18.11.2024", depositAmount: 89000, isBot: true },
  { name: "Лёха X", payout: "4432 0091 2234 8871", registeredAt: "22.01.2025", depositAmount: 3400, isBot: true },
  { name: "Виктория 🍀", payout: "5536 1122 3344 5566", registeredAt: "14.12.2024", depositAmount: 156000, isBot: true },
  { name: "Серёга_best", payout: "4432 7766 5544 3322", registeredAt: "01.02.2025", depositAmount: 7800, isBot: true },
  { name: "Андрюха 🎯", payout: "2202 4455 6677 8899", registeredAt: "10.01.2025", depositAmount: 23000, isBot: true },
  { name: "Маринка 👑", payout: "5536 8877 6655 4433", registeredAt: "15.11.2024", depositAmount: 67000, isBot: true },
  { name: "Тигр 🌪", payout: "4432 9900 1122 3344", registeredAt: "20.12.2024", depositAmount: 1200, isBot: true },
  { name: "Костян_king", payout: "2202 1122 3344 5566", registeredAt: "05.02.2025", depositAmount: 44500, isBot: true },
  { name: "Натаха 🎰", payout: "5536 4433 2211 0099", registeredAt: "12.01.2025", depositAmount: 8800, isBot: true },
  { name: "Жека_77", payout: "4432 5566 7788 9900", registeredAt: "25.01.2025", depositAmount: 31000, isBot: true },
  { name: "crazy_dog 🚀", payout: "2202 7788 9900 1122", registeredAt: "03.12.2024", depositAmount: 145000, isBot: true },
  { name: "vavan_off", payout: "4432 2211 0099 8877", registeredAt: "19.11.2024", depositAmount: 5600, isBot: true },
  { name: "Юльча 🍀", payout: "5536 9988 7766 5544", registeredAt: "08.02.2025", depositAmount: 9200, isBot: true },
  { name: "Михалыч 🧊", payout: "4432 3344 5566 7788", registeredAt: "14.10.2024", depositAmount: 123000, isBot: true },
  { name: "Стас_pro", payout: "2202 5544 3322 1100", registeredAt: "28.12.2024", depositAmount: 4200, isBot: true },
  { name: "Кристи ✨", payout: "5536 2233 4455 6677", registeredAt: "02.01.2025", depositAmount: 71000, isBot: true },
  { name: "Павлик 007", payout: "4432 1100 2299 3388", registeredAt: "17.01.2025", depositAmount: 1500, isBot: true },
  { name: "Медведь 💰", payout: "2202 9911 8822 7733", registeredAt: "11.11.2024", depositAmount: 205000, isBot: true }
];
