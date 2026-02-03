
import React, { useState, useEffect, useMemo } from 'react';
import { TelegramUser, ContestStep, PayoutType, Contest, WinnerInfo, UserProfile, ProjectPreset, Currency } from './types';
import { 
  CheckBadgeIcon, 
  LinkIcon, 
  ClockIcon, 
  TrashIcon, 
  TrophyIcon, 
  ChevronLeftIcon, 
  ShieldCheckIcon, 
  UsersIcon, 
  GiftIcon, 
  UserCircleIcon, 
  FlagIcon, 
  PlusIcon,
  TicketIcon,
  CurrencyDollarIcon,
  ArrowRightStartOnRectangleIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  UserGroupIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  LockClosedIcon,
  KeyIcon,
  UserIcon,
  QrCodeIcon,
  FaceFrownIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 

const DB_KEY = 'beef_contests_v7_final';
const PRESETS_KEY = 'beef_project_presets_v7';
const AVATARS_KEY = 'beef_avatars_pool'; // Ключ для пула аватарок в Upstash
const ADMIN_ID = 7946967720;
const PROFILE_KEY = 'beef_user_profile_v7_final';

const CURRENCIES: Record<Currency, { symbol: string; label: string; rateMult?: number }> = {
  RUB: { symbol: '₽', label: 'RUB' },
  USD: { symbol: '$', label: 'USD' },
  EUR: { symbol: '€', label: 'EUR' },
  KZT: { symbol: '₸', label: 'KZT' },
  UAH: { symbol: '₴', label: 'UAH' },
  BYN: { symbol: 'Br', label: 'BYN' }
};

const MALE_NAMES_EN = [
  "Alexey", "Dmitry", "Ivan", "Sergey", "Andrey", "Pavel", "Maxim", "Artem", "Denis", "Vladimir",
  "Mikhail", "Nikolay", "Aleksandr", "Stepan", "Roman", "Igor", "Oleg", "Victor", "Kirill", "Gleb",
  "Boris", "Anatoly", "Leonid", "Yuri", "Konstantin", "Evgeny", "Vladislav", "Stanislav", "Ruslan", "Timur",
  "James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph", "Thomas", "Charles",
  "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua",
  "Kenneth", "Kevin", "Brian", "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Gary",
  "Ryan", "Nicholas", "Eric", "Stephen", "Jacob", "Larry", "Frank", "Scott", "Justin", "Brandon",
  "Raymond", "Gregory", "Samuel", "Benjamin", "Patrick", "Jack", "Alexander", "Dennis", "Jerry", "Tyler",
  "Aaron", "Adam", "Alan", "Albert", "Austin", "Billy", "Bobby", "Bradley", "Bruce", "Bryan", "Carl",
  "Christian", "Craig", "Curtis", "Douglas", "Dylan", "Ethan", "Eugene", "Gabriel", "Harold", "Henry",
  "Isaac", "Jeremy", "Jordan", "Keith", "Kyle", "Logan", "Louis", "Nathan", "Noah", "Oscar", "Philip"
];

const MALE_NAMES_RU = [
  "Алексей", "Дмитрий", "Иван", "Сергей", "Андрей", "Павел", "Максим", "Артем", "Денис", "Владимир",
  "Михаил", "Николай", "Александр", "Степан", "Роман", "Игорь", "Олег", "Виктор", "Кирилл", "Глеб",
  "Борис", "Анатолий", "Леонид", "Юрий", "Константин", "Евгений", "Владислав", "Станислав", "Руслан", "Тимур",
  "Даниил", "Егор", "Никита", "Илья", "Матвей", "Макар", "Лев", "Марк", "Артемий", "Арсений",
  "Ян", "Савелий", "Демид", "Лука", "Тихон", "Ярослав", "Фёдор", "Пётр", "Семён", "Богдан",
  "Григорий", "Захар", "Елисей", "Филипп", "Артур", "Вадим", "Ростислав", "Георгий", "Леон", "Мирон",
  "Платон", "Эрик", "Герман", "Всеволод", "Демьян", "Прохор", "Гордей", "Климент", "Назар", "Еремей",
  "Валентин", "Валерий", "Василий", "Вениамин", "Виталий", "Вячеслав", "Геннадий", "Герасим", "Давид",
  "Данислав", "Евдоким", "Емельян", "Ефим", "Игнатий", "Иннокентий", "Иосиф", "Кир", "Клим", "Корней",
  "Кузьма", "Лаврентий", "Лукьян", "Маврикий", "Максимильян", "Мефодий", "Модест", "Мстислав", "Никон"
];

const SURNAMES_EN = [
  "Ivanov", "Petrov", "Smirnov", "Kuznetsov", "Popov", "Vasiliev", "Sokolov", "Mikhailov", "Novikov", "Fedorov",
  "Morozov", "Volkov", "Alekseev", "Lebedev", "Semenov", "Egorov", "Pavlov", "Kozlov", "Stepanov", "Nikolaev",
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", " Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
  "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes"
];

const SURNAMES_RU = [
  "Иванов", "Петров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Михайлов", "Новиков", "Федоров",
  "Морозов", "Волков", "Алексеев", "Лебедев", "Семенов", "Егоров", "Павлов", "Kozlov", "Stepanov", "Nikolaev",
  "Тихонов", "Белов", "Морозов", "Крылов", "Макаров", "Зайцев", "Соловьев", "Борисов", "Романов", "Воробьев",
  "Фролов", "Медведев", "Семенов", "Жуков", "Куликов", "Беляев", "Тарасов", "Белоусов", "Орлов", "Киселев",
  "Миронов", "Марков", "Никитин", "Соболев", "Королев", "Коновалов", "Федотов", "Щербаков", "Воронин", "Титов",
  "Авдеев", "Агафонов", "Акимов", "Александров", "Алексеев", "Андреев", "Анисимов", "Антонов", "Артемьев",
  "Афанасьев", "Баранов", "Беляков", "Беспалов", "Бирюков", "Блохин", "Бобров", "Богданов", "Бондаренко"
];

const generateHumanLikeName = () => {
  const isRussian = Math.random() > 0.5;
  const names = isRussian ? MALE_NAMES_RU : MALE_NAMES_EN;
  const surnames = isRussian ? SURNAMES_RU : SURNAMES_EN;
  
  let fullName = names[Math.floor(Math.random() * names.length)];
  
  if (Math.random() > 0.4) {
    fullName += " " + surnames[Math.floor(Math.random() * surnames.length)];
  }

  const suffixRoll = Math.random();
  if (suffixRoll > 0.9) {
    fullName += (Math.floor(Math.random() * 9) + 1).toString();
  } else if (suffixRoll > 0.8) {
    fullName += (Math.floor(Math.random() * 90) + 10).toString();
  }

  const caseRoll = Math.random();
  if (caseRoll > 0.9) {
    return fullName.toUpperCase();
  } else if (caseRoll > 0.8) {
    return fullName.toLowerCase();
  } else {
    return fullName;
  }
};

const BlurredWinnerName: React.FC<{ name: string }> = ({ name }) => {
  if (name.length <= 4) {
    const first = name.slice(0, 1);
    const last = name.slice(-1);
    const middle = name.slice(1, -1) || '••';
    return (
      <span className="inline-flex items-center">
        {first}
        <span className="blur-[6px] select-none mx-0.5 opacity-60 scale-x-125">
          {middle}
        </span>
        {last}
      </span>
    );
  }

  const firstTwo = name.slice(0, 2);
  const lastTwo = name.slice(-2);
  const middle = name.slice(2, -2);

  return (
    <span className="inline-flex items-center">
      {firstTwo}
      <span className="blur-[7px] select-none mx-0.5 opacity-60 tracking-tighter scale-x-110">
        {middle}
      </span>
      {lastTwo}
    </span>
  );
};

const generateRandomSeed = () => {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Хелпер для алгоритма Луна
const isValidLuhn = (val: string) => {
  let sum = 0;
  let shouldDouble = false;
  const digits = val.replace(/\s+/g, '');
  if (digits.length < 13) return false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

// Хелпер для определения типа карты
const getCardBrand = (val: string) => {
  const v = val.replace(/\s+/g, '');
  if (/^4/.test(v)) return 'Visa';
  if (/^5[1-5]/.test(v)) return 'Mastercard';
  if (/^2/.test(v)) return 'MIR';
  return '';
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contests' | 'profile'>('contests');
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [step, setStep] = useState<ContestStep>(ContestStep.LIST);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [presets, setPresets] = useState<ProjectPreset[]>([]);
  const [avatars, setAvatars] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ 
    payoutValue: '', 
    payoutType: 'card', 
    participationCount: 0, 
    totalWon: 0, 
    savedPayouts: [],
    participatedContests: {}
  });
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [rates, setRates] = useState<Record<string, number>>({ RUB: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'verified'>('idle');

  const [newTitle, setNewTitle] = useState('');
  const [newPrize, setNewPrize] = useState('');
  const [newWinners, setNewWinners] = useState('1');
  const [newProjectId, setNewProjectId] = useState('');
  const [newDuration, setNewDuration] = useState<string>('300000');

  const [refClickCount, setRefClickCount] = useState(0);
  const [isRefChecking, setIsRefChecking] = useState(false);
  const [refError, setRefError] = useState('');
  const [userTicket, setUserTicket] = useState<number>(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) setUser(tg.initDataUnsafe.user);
    }
    fetchData();
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) setProfile(prev => ({ ...prev, ...JSON.parse(savedProfile) }));
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cRes, pRes, rRes, aRes] = await Promise.all([
        fetch(`${KV_REST_API_URL}/get/${DB_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } }),
        fetch(`${KV_REST_API_URL}/get/${PRESETS_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } }),
        fetch('https://api.exchangerate-api.com/v4/latest/RUB'),
        fetch(`${KV_REST_API_URL}/get/${AVATARS_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } })
      ]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      const rData = await rRes.json();
      const aData = await aRes.json();
      
      let fetchedContests: Contest[] = cData.result ? JSON.parse(cData.result) : [];
      setContests(fetchedContests);
      if (pData.result) setPresets(JSON.parse(pData.result));
      if (rData.rates) setRates(rData.rates);

      let loadedAvatars: string[] = [];
      if (aData.result) {
        try {
          loadedAvatars = JSON.parse(aData.result);
          setAvatars(loadedAvatars);
        } catch (e) {
          console.error("Failed to parse avatars from Upstash:", e);
        }
      }

      const now = Date.now();
      fetchedContests.forEach(c => {
        if (!c.isCompleted && c.expiresAt && c.expiresAt < now) {
          autoFinish(c.id, fetchedContests, loadedAvatars);
        }
      });

    } catch (e) { 
      console.error("Fetch Data Error:", e); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const autoFinish = async (id: string, currentList: Contest[], availableAvatars?: string[]) => {
    const contest = currentList.find(c => c.id === id);
    if (!contest || contest.isCompleted) return;
    const fakeWinners = generateFakeWinners(contest, availableAvatars);
    const updated = currentList.map(c => c.id === id ? { ...c, isCompleted: true, winners: fakeWinners, seed: generateRandomSeed() } : c);
    saveContests(updated);
  };

  const generateFakeWinners = (contest: Contest, availableAvatars?: string[]): WinnerInfo[] => {
    const winners: WinnerInfo[] = [];
    const prizePer = Math.floor(contest.prizeRub / (contest.winnerCount || 1));
    const usedTickets = new Set<number>();
    
    const avatarPool = (availableAvatars && availableAvatars.length > 0) ? availableAvatars : avatars;

    while (winners.length < contest.winnerCount && (contest.lastTicketNumber > 0)) {
      const lucky = Math.floor(Math.random() * (contest.lastTicketNumber)) + 1;
      if (!usedTickets.has(lucky)) {
        usedTickets.add(lucky);
        const avatarUrl = avatarPool.length > 0 ? avatarPool[Math.floor(Math.random() * avatarPool.length)] : undefined;
        winners.push({ 
          name: generateHumanLikeName(), 
          ticketNumber: lucky, 
          prizeWon: prizePer, 
          isFake: true,
          avatarUrl: avatarUrl
        });
      }
      if (winners.length >= contest.winnerCount || usedTickets.size >= contest.lastTicketNumber) break;
    }
    return winners;
  };

  const saveContests = async (list: Contest[]) => {
    setContests(list);
    await fetch(`${KV_REST_API_URL}/set/${DB_KEY}`, { method: 'POST', headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, body: JSON.stringify(list) });
  };

  const convert = (val: number) => {
    const rate = rates[currency] || 1;
    return (val * rate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const stats = useMemo(() => {
    const total = contests.reduce((acc, c) => acc + (c.isCompleted ? c.prizeRub : 0), 0);
    const now = new Date();
    const thisMonth = contests.reduce((acc, c) => {
      const d = new Date(c.createdAt);
      if (c.isCompleted && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return acc + c.prizeRub;
      return acc;
    }, 0);
    return { total, thisMonth };
  }, [contests]);

  const isAdmin = useMemo(() => user?.id === ADMIN_ID, [user]);

  const formatCard = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '').substring(0, 16);
    const parts = [];
    for (let i = 0, len = v.length; i < len; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const handleCreateContest = async () => {
    if (!newTitle || !newPrize || !newProjectId) return;
    const now = Date.now();
    const duration = newDuration ? parseInt(newDuration) : null;
    const newC: Contest = {
      id: now.toString(),
      title: newTitle,
      projectId: newProjectId,
      prizeRub: parseInt(newPrize),
      createdAt: now,
      expiresAt: duration ? now + duration : null,
      participantCount: 0,
      realParticipantCount: 0,
      winnerCount: parseInt(newWinners),
      lastTicketNumber: 0
    };
    await saveContests([newC, ...contests]);
    setNewTitle(''); setNewPrize(''); setNewWinners('1');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const handleStartContest = (c: Contest) => {
    setSelectedContest(c);
    setRefClickCount(0);
    setRefError('');
    setIsRefChecking(false);
    setVerifyStatus('idle');

    if (c.isCompleted) {
      setStep(ContestStep.SUCCESS);
      return;
    }

    if (profile.participatedContests[c.id]) {
      setUserTicket(profile.participatedContests[c.id]);
      setStep(ContestStep.TICKET_SHOW);
      return;
    }

    if (profile.participationCount > 0) {
      setStep(ContestStep.PAYOUT);
      return;
    }

    setStep(ContestStep.REFERRAL);
  };

  const handleRefCheck = () => {
    if (isRefChecking) return;
    setIsRefChecking(true);
    setRefError('');
    const delay = Math.floor(Math.random() * 2000) + 1000;
    setTimeout(() => {
      setIsRefChecking(false);
      const projectName = presets.find(p => p.id === selectedContest?.projectId)?.name || 'проект';
      if (refClickCount < 2) {
        setRefError(`Ошибка. Проверьте зарегистрированы ли вы на ${projectName} и попробуйте снова через 5 сек`);
        setRefClickCount(prev => prev + 1);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
      } else {
        setStep(ContestStep.PAYOUT);
        setRefClickCount(0);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
      }
    }, delay);
  };

  const handleFinalizeParticipation = async () => {
    if (!selectedContest) return;
    const myTicket = selectedContest.lastTicketNumber + 1;
    setUserTicket(myTicket);
    const fakeCount = Math.floor(Math.random() * 4) + 2;
    const totalAdd = 1 + fakeCount;
    const updatedContests = contests.map(c => {
      if (c.id === selectedContest.id) {
        return {
          ...c,
          participantCount: c.participantCount + totalAdd,
          realParticipantCount: c.realParticipantCount + 1,
          lastTicketNumber: c.lastTicketNumber + totalAdd
        };
      }
      return c;
    });
    const newSaved = [...profile.savedPayouts];
    if (profile.payoutValue && !newSaved.find(s => s.value === profile.payoutValue)) {
      newSaved.push({ type: profile.payoutType, value: profile.payoutValue });
    }
    const newProfile = { 
      ...profile, 
      participationCount: profile.participationCount + 1,
      savedPayouts: newSaved.slice(-5),
      participatedContests: { ...profile.participatedContests, [selectedContest.id]: myTicket }
    };
    setProfile(newProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    await saveContests(updatedContests);
    setStep(ContestStep.TICKET_SHOW);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const Countdown = ({ expiresAt }: { expiresAt: number }) => {
    const [timeLeft, setTimeLeft] = useState(expiresAt - Date.now());
    useEffect(() => {
      const t = setInterval(() => setTimeLeft(expiresAt - Date.now()), 1000);
      return () => clearInterval(t);
    }, [expiresAt]);
    if (timeLeft <= 0) return null;
    const m = Math.floor(timeLeft / 60000);
    const s = Math.floor((timeLeft % 60000) / 1000);
    return (
      <div className="flex items-center gap-2 bg-matte-black/40 border border-gold/40 px-3 py-2 rounded-2xl backdrop-blur-md shadow-[0_0_15px_rgba(197,160,89,0.15)] animate-pulse-subtle">
        <ClockIcon className="w-4 h-4 text-gold-light animate-spin-slow"/>
        <span className="text-[16px] font-black text-gold-light font-mono tracking-wider">
          {m}:{s < 10 ? '0' : ''}{s}
        </span>
      </div>
    );
  };

  const contestLists = useMemo(() => {
    const active = contests.filter(c => !c.isCompleted && (c.expiresAt ? c.expiresAt > Date.now() : true));
    const completed = contests.filter(c => !(!c.isCompleted && (c.expiresAt ? c.expiresAt > Date.now() : true)));
    return { active, completed };
  }, [contests]);

  return (
    <div className="h-screen bg-matte-black text-[#E2E2E6] overflow-hidden flex flex-col font-sans selection:bg-gold/30 relative">
      
      {/* Glow Gradients Everywhere */}
      <div className="absolute top-[-5%] left-[-10%] w-[60%] h-[50%] bg-gold/5 blur-[100px] rounded-full animate-glow-slow pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[40%] bg-gold/3 blur-[80px] rounded-full animate-glow-fast pointer-events-none z-0"></div>

      <div className="px-4 py-5 bg-soft-gray/80 backdrop-blur-lg border-b border-border-gray z-30 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-gold/5 blur-[50px] rounded-full pointer-events-none animate-glow-slow"></div>
        <div className="flex justify-between items-center mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-[13px] font-black uppercase tracking-tight text-gold">РОЗЫГРЫШИ ОТ ЛУДОВАРА</h1>
            <div className="relative inline-block">
              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value as Currency)}
                className="appearance-none bg-matte-black/60 border border-gold/20 rounded-xl px-3 py-1.5 text-[11px] font-black text-white pr-9 outline-none shadow-md backdrop-blur-md"
              >
                {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDownIcon className="w-4 h-4 text-gold absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className="p-2.5 bg-matte-black rounded-xl border border-gold/20 active:scale-90 transition-all shadow-lg">
              <ShieldCheckIcon className="w-5 h-5 text-gold"/>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-matte-black/60 backdrop-blur-sm p-3 rounded-2xl border border-border-gray/50 flex flex-col gap-1 relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-white/5 blur-xl rounded-full"></div>
             <div className="flex items-center gap-2 opacity-30">
               <CurrencyDollarIcon className="w-4 h-4" />
               <p className="text-[10px] font-medium uppercase tracking-widest">Разыграно</p>
             </div>
             <p className="text-[15px] font-black text-white">{convert(stats.total)} {CURRENCIES[currency].symbol}</p>
          </div>
          <div className="bg-matte-black/60 backdrop-blur-sm p-3 rounded-2xl border border-border-gray/50 flex flex-col gap-1 relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-gold/5 blur-xl rounded-full"></div>
             <div className="flex items-center gap-2 opacity-30 text-gold">
               <SparklesIcon className="w-4 h-4" />
               <p className="text-[10px] font-medium uppercase tracking-widest text-gold">За месяц</p>
             </div>
             <p className="text-[15px] font-black text-gold">{convert(stats.thisMonth)} {CURRENCIES[currency].symbol}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar relative z-10 pb-24">
        {view === 'admin' ? (
          <div className="space-y-5">
             <div className="bg-soft-gray/80 backdrop-blur-md p-5 rounded-3xl border border-border-gray/50 space-y-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-3xl"></div>
                <div className="flex items-center gap-2 relative z-10">
                  <PlusIcon className="w-5 h-5 text-gold" />
                  <h3 className="text-[14px] font-black uppercase text-gold tracking-wide">Новый розыгрыш</h3>
                </div>
                <div className="space-y-4 relative z-10">
                  <input placeholder="Название розыгрыша" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-white outline-none focus:border-gold transition-all"/>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Приз (RUB)" value={newPrize} onChange={e => setNewPrize(e.target.value)} className="bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-white outline-none focus:border-gold transition-all"/>
                    <input type="number" placeholder="Победителей" value={newWinners} onChange={e => setNewWinners(e.target.value)} className="bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-white outline-none focus:border-gold transition-all"/>
                  </div>
                  <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="w-full bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-gold font-bold outline-none">
                    <option value="">Выберите пресет</option>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={handleCreateContest} className="w-full py-4 bg-gold text-matte-black font-black rounded-xl uppercase text-[12px] active:scale-95 transition-all shadow-md relative z-10">Опубликовать</button>
             </div>

             <button onClick={async () => { if(window.confirm('Очистить историю?')) await saveContests([]); }} className="w-full py-4 border-2 border-red-500/20 text-red-500 font-black rounded-xl uppercase text-[11px] mt-4 relative z-10">Очистить историю</button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'contests' ? (
              <div className="flex flex-col">
                <div className="space-y-4 mb-8">
                  {contestLists.active.length === 0 ? (
                    <div className="py-12 px-6 text-center bg-soft-gray/30 rounded-[32px] border border-white/5 backdrop-blur-sm">
                       <FaceFrownIcon className="w-10 h-10 text-white/10 mx-auto mb-4" />
                       <p className="text-[13px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">В данный момент активных розыгрышей нет, но скоро они появятся :)</p>
                    </div>
                  ) : (
                    contestLists.active.map(c => {
                      const userParticipation = profile.participatedContests[c.id];
                      const isParticipating = !!userParticipation;
                      return (
                        <div 
                          key={c.id} 
                          onClick={() => handleStartContest(c)}
                          className={`relative p-5 rounded-3xl border backdrop-blur-sm transition-all active:scale-[0.98] group overflow-hidden ${
                            isParticipating ? 'border-green-500/60 bg-soft-gray/70 ring-2 ring-green-500/10' : 'bg-soft-gray/70 border-gold/30 shadow-lg'
                          }`}
                        >
                          {isParticipating && (
                            <div className="mb-3 flex items-center gap-2 text-green-500">
                              <CheckBadgeIcon className="w-5 h-5" />
                              <span className="text-[12px] font-black uppercase tracking-wider">Вы участвуете. Ваш Билет #{userParticipation}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-6 relative z-10">
                            <h2 className="text-[16px] font-black uppercase tracking-tight leading-tight pr-10 text-white">{c.title}</h2>
                            <div className="px-3 py-1.5 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-2 shrink-0 shadow-sm backdrop-blur-md">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase text-green-500 tracking-wider">LIVE</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 border-t border-border-gray/50 pt-5 relative z-10">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase opacity-30 tracking-widest text-white">Фонд</p>
                              <p className="text-[17px] font-black tracking-tight text-gold-light">{convert(c.prizeRub)} {CURRENCIES[currency].symbol}</p>
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-[10px] font-bold uppercase opacity-20 tracking-widest text-white">Мест</p>
                              <p className="text-[14px] font-black text-white">{c.winnerCount}</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] font-bold uppercase opacity-20 tracking-widest text-white">Билетов</p>
                              <p className="text-[14px] font-black text-white">{c.participantCount}</p>
                            </div>
                          </div>
                          {c.expiresAt && (
                            <div className="mt-5 relative z-10 flex items-center justify-between">
                               <p className="text-[11px] font-black uppercase text-white/30 tracking-widest">Завершение через:</p>
                               <Countdown expiresAt={c.expiresAt}/>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {contestLists.completed.length > 0 && <div className="flex items-center gap-4 py-4 mb-4"><div className="h-[1px] flex-1 bg-border-gray/50"></div><span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Завершенные</span><div className="h-[1px] flex-1 bg-border-gray/50"></div></div>}
                <div className="space-y-4">
                  {contestLists.completed.map(c => (
                    <div key={c.id} onClick={() => handleStartContest(c)} className="relative p-5 rounded-3xl border bg-soft-gray/40 border-border-gray/50 opacity-60 transition-all active:scale-[0.98] grayscale-[0.6]">
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-[16px] font-black uppercase text-white/40 leading-tight">{c.title}</h2>
                        <span className="text-[10px] font-black uppercase text-white/20">END</span>
                      </div>
                      <div className="flex justify-between items-end border-t border-border-gray/20 pt-4">
                        <p className="text-[16px] font-black text-gold/30">{convert(c.prizeRub)} {CURRENCIES[currency].symbol}</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{c.participantCount} билетов</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-slide-up">
                <div className="flex items-center gap-5 p-6 bg-soft-gray/60 backdrop-blur-md rounded-3xl border border-border-gray/50 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gold/5 blur-3xl rounded-full"></div>
                  {user?.photo_url ? (
                    <img src={user.photo_url} className="w-16 h-16 rounded-2xl border-2 border-gold/20 shadow-lg" alt=""/>
                  ) : (
                    <div className="w-16 h-16 bg-matte-black/60 rounded-2xl border border-border-gray/50 flex items-center justify-center">
                      <UserCircleIcon className="w-10 h-10 text-gold/20"/>
                    </div>
                  )}
                  <div>
                    <h2 className="text-[18px] font-black text-white tracking-tight uppercase leading-none">{user?.first_name || 'Инкогнито'}</h2>
                    <p className="text-[11px] font-bold text-gold/40 uppercase tracking-[0.2em] mt-1.5">ID: {user?.id || '000000'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-soft-gray/60 backdrop-blur-sm rounded-3xl border border-border-gray/50 text-center shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-white/[0.02] pointer-events-none"></div>
                      <p className="text-[11px] font-medium uppercase opacity-20 mb-2 tracking-widest">Участий</p>
                      <p className="text-[24px] font-black text-white leading-none">{profile.participationCount}</p>
                   </div>
                   <div className="p-5 bg-soft-gray/60 backdrop-blur-sm rounded-3xl border border-border-gray/50 text-center shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-gold/[0.02] pointer-events-none"></div>
                      <p className="text-[11px] font-medium uppercase opacity-20 mb-2 tracking-widest text-gold">Выигрыш</p>
                      <p className="text-[24px] font-black text-gold leading-none">{convert(profile.totalWon)} {CURRENCIES[currency].symbol}</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-matte-black/95 backdrop-blur-2xl border-t border-border-gray/50 px-6 py-2 pb-5 flex justify-around z-[90] shadow-2xl shrink-0">
        <button onClick={() => { setActiveTab('contests'); setView('user'); }} className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${activeTab === 'contests' && view === 'user' ? 'text-gold' : 'opacity-20'}`}>
          <GiftIcon className="w-5 h-5"/>
          <span className="text-[9px] font-black uppercase tracking-widest">РОЗЫГРЫШИ</span>
        </button>
        <button onClick={() => { setActiveTab('profile'); setView('user'); }} className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${activeTab === 'profile' ? 'text-gold' : 'opacity-20'}`}>
          <UserCircleIcon className="w-5 h-5"/>
          <span className="text-[9px] font-black uppercase tracking-widest">ПРОФИЛЬ</span>
        </button>
      </nav>

      {step !== ContestStep.LIST && (
        <div className="fixed inset-0 z-[100] bg-matte-black flex flex-col p-6 animate-slide-up no-scrollbar overflow-y-auto">
           {/* Step Gradients */}
           <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[50%] bg-gold/[0.07] blur-[120px] rounded-full pointer-events-none z-0"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[40%] bg-gold/[0.04] blur-[100px] rounded-full pointer-events-none z-0"></div>

           <button onClick={() => { setStep(ContestStep.LIST); setVerifyStatus('idle'); }} className="absolute top-6 left-6 p-2 bg-soft-gray/90 backdrop-blur-md rounded-xl border border-border-gray/50 text-gold active:scale-90 transition-all shadow-xl z-[110]">
             <ChevronLeftIcon className="w-5 h-5"/>
           </button>
           
           <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10 py-10 relative z-[105]">
              {step === ContestStep.REFERRAL && (
                <div className="w-full max-w-[320px] space-y-8 animate-pop">
                  <div className="w-20 h-20 bg-gold/10 rounded-[40px] flex items-center justify-center border border-gold/20 mx-auto shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gold/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <LinkIcon className="w-10 h-10 text-gold relative z-10"/>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">Проверка</h2>
                    <p className="text-[14px] uppercase font-bold opacity-30 tracking-widest px-4 font-light leading-relaxed">Для участия подтвердите активность в проекте {presets.find(p => p.id === selectedContest?.projectId)?.name}</p>
                  </div>
                  {refError && <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-3xl animate-shake"><p className="text-[13px] font-black text-red-500 uppercase leading-relaxed">{refError}</p></div>}
                  <div className="space-y-4">
                    <button onClick={() => window.open(presets.find(p => p.id === selectedContest?.projectId)?.referralLink, '_blank')} className="w-full py-4 bg-soft-gray text-gold border border-gold/20 font-black uppercase text-[12px] rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md backdrop-blur-md hover:bg-gold/5"><ArrowTopRightOnSquareIcon className="w-5 h-5"/>Открыть проект</button>
                    <button onClick={handleRefCheck} disabled={isRefChecking} className="w-full py-5 bg-gold text-matte-black font-black uppercase text-[14px] rounded-3xl shadow-lg active:translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-50">{isRefChecking ? <ArrowPathIcon className="w-6 h-6 animate-spin"/> : "Проверить регистрацию"}</button>
                  </div>
                </div>
              )}

              {step === ContestStep.SUCCESS && selectedContest?.isCompleted && (
                <div className="w-full max-w-[400px] space-y-8 animate-fade-in flex flex-col items-center">
                   <div className="w-16 h-16 bg-gold/10 rounded-3xl flex items-center justify-center border border-gold/20 shadow-xl mb-2 relative group overflow-hidden">
                     <div className="absolute inset-0 bg-gold/20 blur-lg animate-pulse opacity-50"></div>
                     <TrophyIcon className="w-8 h-8 text-gold relative z-10" />
                   </div>
                   <div className="space-y-2">
                     <h2 className="text-[28px] font-black text-white tracking-tighter leading-none uppercase">Итоги розыгрыша</h2>
                     <p className="text-[13px] font-black text-gold uppercase tracking-widest">{selectedContest.title}</p>
                   </div>
                   <div className="w-full space-y-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar px-2">
                      {selectedContest.winners?.map((w, i) => (
                        <div key={i} className="p-4 bg-soft-gray/50 backdrop-blur-md border border-border-gray/50 rounded-[28px] flex justify-between items-center animate-slide-up group shadow-lg relative overflow-hidden" style={{animationDelay: `${i * 0.1}s`}}>
                          <div className="absolute top-0 left-0 w-1 h-full bg-gold/50"></div>
                          <div className="text-left space-y-1 relative z-10 flex items-center gap-3">
                            <div className="shrink-0">{w.avatarUrl ? <img src={w.avatarUrl} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-gold/40 shadow-sm object-cover" alt=""/> : <div className="w-8 h-8 bg-matte-black/60 rounded-full flex items-center justify-center border border-gold/20"><UserIcon className="w-4 h-4 text-gold/40" /></div>}</div>
                            <div><div className="text-[15px] font-black text-white group-hover:text-gold transition-colors tracking-tight"><BlurredWinnerName name={w.name} /></div><p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Билет #{w.ticketNumber}</p></div>
                          </div>
                          <div className="text-right relative z-10"><p className="text-[18px] font-black text-green-500 tracking-tighter">{convert(w.prizeWon)} {CURRENCIES[currency].symbol}</p></div>
                        </div>
                      ))}
                   </div>
                   <button onClick={() => { setStep(ContestStep.LIST); setVerifyStatus('idle'); }} className="w-full py-5 bg-gold text-matte-black font-black rounded-3xl text-[15px] shadow-xl active:translate-y-1 transition-all uppercase tracking-widest">Назад</button>
                </div>
              )}

              {step === ContestStep.PAYOUT && (
                <div className="w-full max-w-[340px] space-y-10 animate-pop">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black text-white tracking-tighter leading-none uppercase">Реквизиты</h2>
                    <p className="text-[13px] font-bold text-white/20 uppercase tracking-widest font-light">Куда отправить награду?</p>
                  </div>
                  
                  <div className="flex gap-4">
                    <button onClick={() => setProfile({...profile, payoutType: 'card'})} className={`flex-1 py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 shadow-lg ${profile.payoutType === 'card' ? 'bg-gold/10 border-gold text-gold scale-105' : 'bg-matte-black border-border-gray text-white/10 opacity-50'}`}>
                      <CreditCardIcon className="w-8 h-8"/>
                      <span className="text-[12px] font-black uppercase tracking-widest">Карта</span>
                    </button>
                    <button onClick={() => setProfile({...profile, payoutType: 'trc20'})} className={`flex-1 py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 shadow-lg ${profile.payoutType === 'trc20' ? 'bg-gold/10 border-gold text-gold scale-105' : 'bg-matte-black border-border-gray text-white/10 opacity-50'}`}>
                      <BanknotesIcon className="w-8 h-8"/>
                      <span className="text-[12px] font-black uppercase tracking-widest">TRC-20</span>
                    </button>
                  </div>
                  
                  {profile.payoutType === 'card' ? (
                    <div className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-[#1c1c1e] to-[#0d0d0d] rounded-[32px] border border-gold/40 p-8 text-left shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group">
                      {/* Card Glow */}
                      <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-gold/5 blur-[60px] rounded-full group-hover:bg-gold/10 transition-all"></div>
                      
                      <div className="flex justify-between items-start mb-10">
                        <div className="w-14 h-11 bg-gradient-to-tr from-gold/40 to-gold/20 rounded-lg border border-gold/30 shadow-inner flex items-center justify-center">
                          <div className="w-10 h-7 bg-matte-black/40 rounded border border-gold/10"></div>
                        </div>
                        <div className="h-8 flex items-center gap-2">
                           {getCardBrand(profile.payoutValue) === 'Visa' && <span className="text-[22px] font-black italic text-white/90 tracking-tighter drop-shadow-md">VISA</span>}
                           {getCardBrand(profile.payoutValue) === 'Mastercard' && <div className="flex items-center -space-x-2"><div className="w-7 h-7 bg-red-500/80 rounded-full blur-[1px]"></div><div className="w-7 h-7 bg-yellow-500/80 rounded-full blur-[1px]"></div></div>}
                           {getCardBrand(profile.payoutValue) === 'MIR' && <span className="text-[15px] font-black text-green-500 italic drop-shadow-md">МИР</span>}
                        </div>
                      </div>
                      
                      <div className="relative group/input mt-2">
                         <div className="absolute inset-0 bg-white/5 rounded-2xl blur-sm opacity-0 group-focus-within/input:opacity-100 transition-all"></div>
                         <input 
                          placeholder="0000 0000 0000 0000" 
                          value={profile.payoutValue} 
                          onChange={e => setProfile({...profile, payoutValue: formatCard(e.target.value)})}
                          className="relative w-full bg-white/5 hover:bg-white/10 focus:bg-white/[0.08] px-4 py-4 rounded-2xl border border-white/5 focus:border-gold/40 transition-all font-mono text-[18px] text-white font-black tracking-wider outline-none placeholder:text-white/10"
                        />
                      </div>

                      <div className="mt-8 flex justify-between items-end opacity-30">
                         <div className="space-y-1">
                           <p className="text-[8px] uppercase font-black">Account Owner</p>
                           <p className="text-[10px] font-black uppercase tracking-widest">{user?.first_name || 'TELEGRAM USER'}</p>
                         </div>
                         <div className="space-y-1 text-right">
                           <p className="text-[8px] uppercase font-black">Exp</p>
                           <p className="text-[11px] font-black">12 / 29</p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-4">
                      <input 
                        placeholder="Адрес кошелька TRC-20" 
                        value={profile.payoutValue} 
                        onChange={e => setProfile({...profile, payoutValue: e.target.value})}
                        className="w-full bg-soft-gray p-6 rounded-3xl border border-border-gray text-gold font-mono text-[14px] text-center outline-none shadow-inner backdrop-blur-md focus:border-gold transition-all" 
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleFinalizeParticipation}
                    disabled={profile.payoutType === 'card' ? !isValidLuhn(profile.payoutValue) : !profile.payoutValue}
                    className="w-full py-5 bg-gold text-matte-black font-black rounded-3xl text-[16px] shadow-2xl disabled:opacity-20 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
                  >
                    Занять место
                  </button>
                  {profile.payoutType === 'card' && profile.payoutValue.replace(/\s/g, '').length >= 13 && !isValidLuhn(profile.payoutValue) && (
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1 animate-pulse"><ShieldExclamationIcon className="w-4 h-4"/> Ошибка алгоритма Луна</p>
                  )}
                </div>
              )}

              {step === ContestStep.TICKET_SHOW && (
                <div className="w-full max-w-[340px] space-y-12 animate-pop relative py-10">
                   <div className="bg-deep-gray text-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative border border-gold/30">
                      <div className="absolute top-[-15px] left-1/2 -translate-x-1/2 w-10 h-8 bg-matte-black rounded-full z-10 border border-gold/20 shadow-lg"></div>
                      
                      <div className="p-8 pb-4 border-b-2 border-dashed border-gold/20 relative bg-soft-gray/30">
                        <div className="absolute inset-0 bg-gold/[0.03] blur-2xl pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                          <div className="flex items-center gap-2">
                            <QrCodeIcon className="w-6 h-6 text-gold" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/60">BEEF • TICKET</span>
                          </div>
                          <span className="text-[10px] font-black text-gold/40">#{selectedContest?.id.slice(-6)}</span>
                        </div>
                        <h3 className="text-[20px] font-black uppercase mb-1 text-white tracking-tight relative z-10">{selectedContest?.title}</h3>
                        <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest relative z-10">Участие подтверждено</p>
                      </div>

                      <div className="p-10 flex flex-col items-center justify-center relative bg-matte-black/40">
                        <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-matte-black rounded-full border-r border-gold/20 shadow-inner"></div>
                        <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-matte-black rounded-full border-l border-gold/20 shadow-inner"></div>

                        <span className="text-[12px] font-black text-gold/40 uppercase tracking-[0.6em] mb-6">ВАШ НОМЕР</span>
                        <h1 className="text-[90px] font-black italic text-white tracking-tighter leading-none select-none drop-shadow-[0_4px_12px_rgba(197,160,89,0.4)]">#{userTicket}</h1>
                        
                        <div className="mt-10 flex items-center gap-3 px-6 py-2.5 bg-gold/5 rounded-full border border-gold/30 backdrop-blur-md shadow-lg">
                          <CheckBadgeIcon className="w-5 h-5 text-gold-light" />
                          <span className="text-[12px] font-black text-gold-light uppercase tracking-widest">АКТИВЕН</span>
                        </div>
                      </div>

                      <div className="h-8 bg-matte-black/80 flex items-center justify-center gap-1 px-8">
                         {[...Array(30)].map((_, i) => (
                           <div key={i} className="bg-gold/10 h-full" style={{ width: Math.random() * 3 + 1 + 'px' }}></div>
                         ))}
                      </div>
                   </div>

                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-6 bg-matte-black/60 border-2 border-gold/30 rounded-3xl text-[14px] font-black uppercase text-gold active:bg-gold/20 transition-all shadow-2xl backdrop-blur-md relative z-20">На главную</button>
                </div>
              )}
           </div>
        </div>
      )}

      <style>{`
        @keyframes glow-slow {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate(5%, 3%) scale(1.1); opacity: 0.6; }
        }
        @keyframes glow-fast {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(-4%, -6%) scale(1.05); opacity: 0.5; }
        }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        
        .animate-glow-slow { animation: glow-slow 18s ease-in-out infinite; }
        .animate-glow-fast { animation: glow-fast 12s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
        .animate-shake { animation: shake 0.3s ease-in-out 2; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.92); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-pop { animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.25); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default App;
