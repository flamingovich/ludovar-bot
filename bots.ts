
export interface BotParticipant {
  name: string;
  payout: string;
  registeredAt: string;
  depositAmount: number;
  isBot: true;
}

const generateRealisticDeposit = () => Math.floor(Math.random() * 180000) + 1243;
const generateBotCard = () => `4432 ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`;

const MALE_NAMES = ["Иван", "Санек", "Димон", "Лёха", "Серёга", "Андрюха", "Виталик", "Марик", "Стас", "Костян", "Юрец", "Михалыч", "Петрович", "Батя", "Малой", "Тигр", "Лев", "Орёл", "Медведь", "Серый", "Зубенко", "Калываныч", "Гриша", "Федя", "Колян", "Жека", "Тёма", "Ромчик", "Павлик", "Тоха", "Миха", "vavan", "crazy_dog", "Shadow", "Racer", "Lucky", "Gambit", "Shark", "Wolf", "Bouncer", "Hammer"];
const FEMALE_NAMES = ["Маринка", "Елена", "Виктория", "Натаха", "Танюха", "Иришка", "Даша", "Катя", "Оксана", "Лиза", "Аня", "Светка", "Юльча", "Машка", "Кристи", "Vika_L", "Katya_Z", "Mila", "Sonya", "Bella", "Zhenya", "Lera", "Polina"];
const SUFFIXES = ["777", "rus", "_top", "_vip", "X", "007", "88", "99", "77", "_best", "_king", "pro", "Gamer", "_77", "off", "X_X", "2024", "2025", "Live", "Official"];
const EMOJIS = ["🔥", "⚡️", "💎", "🎯", "🚀", "👑", "🍀", "🕶", "🌪", "🧊", "💰", "🎰", "🎲", "✨"];

const createBot = (i: number): BotParticipant => {
  const isFemale = Math.random() < 0.2;
  const list = isFemale ? FEMALE_NAMES : MALE_NAMES;
  let name = list[Math.floor(Math.random() * list.length)];
  if (Math.random() < 0.5) name += SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  if (Math.random() < 0.3) name += " " + EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  
  const months = ["09", "10", "11", "12", "01", "02"];
  const years = ["2024", "2025"];
  const regDate = `${Math.floor(1 + Math.random() * 28).toString().padStart(2, '0')}.${months[Math.floor(Math.random() * 6)]}.${years[Math.random() > 0.4 ? 0 : 1]}`;

  return {
    name,
    payout: generateBotCard(),
    registeredAt: regDate,
    depositAmount: generateRealisticDeposit(),
    isBot: true
  };
};

export const BOTS_POOL: BotParticipant[] = Array.from({ length: 220 }, (_, i) => createBot(i));
