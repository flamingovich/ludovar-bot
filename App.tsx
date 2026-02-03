
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
  FaceFrownIcon
} from '@heroicons/react/24/outline';

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 

const DB_KEY = 'beef_contests_v7_final';
const PRESETS_KEY = 'beef_project_presets_v7';
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
  "Boris", "Anatoly", "Leonid", "Yuri", "Konstantin", "Evgeny", "Vladislav", "Stanislav", "Ruslan", "Timur"
];

const MALE_NAMES_RU = [
  "Алексей", "Дмитрий", "Иван", "Сергей", "Андрей", "Павел", "Максим", "Артем", "Денис", "Владимир",
  "Михаил", "Николай", "Александр", "Степан", "Роман", "Игорь", "Олег", "Виктор", "Кирилл", "Gleb",
  "Борис", "Anatoly", "Leonid", "Yuri", "Konstantin", "Evgeny", "Vladislav", "Stanislav", "Ruslan", "Timur"
];

const SURNAMES_EN = [
  "Ivanov", "Petrov", "Smirnov", "Kuznetsov", "Popov", "Vasiliev", "Sokolov", "Mikhailov", "Novikov", "Fedorov",
  "Morozov", "Volkov", "Alekseev", "Lebedev", "Semenov", "Egorov", "Pavlov", "Kozlov", "Stepanov", "Nikolaev"
];

const SURNAMES_RU = [
  "Иванов", "Петров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Михайлов", "Новиков", "Федоров",
  "Morozov", "Volkov", "Alekseev", "Lebedev", "Semenov", "Egorov", "Pavlov", "Kozlov", "Stepanov", "Nikolaev"
];

const generateHumanLikeName = () => {
  const isRussian = Math.random() > 0.5; // True 50/50 mix
  const names = isRussian ? MALE_NAMES_RU : MALE_NAMES_EN;
  const surnames = isRussian ? SURNAMES_RU : SURNAMES_EN;
  
  let fullName = names[Math.floor(Math.random() * names.length)];
  
  if (Math.random() > 0.6) {
    fullName += " " + surnames[Math.floor(Math.random() * surnames.length)];
  }

  const suffixRoll = Math.random();
  if (suffixRoll > 0.85) {
    fullName += (Math.floor(Math.random() * 9) + 1).toString();
  } else if (suffixRoll > 0.7) {
    fullName += (Math.floor(Math.random() * 90) + 10).toString();
  }

  const caseRoll = Math.random();
  if (caseRoll > 0.85) {
    return fullName.toUpperCase();
  } else if (caseRoll > 0.7) {
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contests' | 'profile'>('contests');
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [step, setStep] = useState<ContestStep>(ContestStep.LIST);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [presets, setPresets] = useState<ProjectPreset[]>([]);
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
      const [cRes, pRes, rRes] = await Promise.all([
        fetch(`${KV_REST_API_URL}/get/${DB_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } }),
        fetch(`${KV_REST_API_URL}/get/${PRESETS_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } }),
        fetch('https://api.exchangerate-api.com/v4/latest/RUB')
      ]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      const rData = await rRes.json();
      
      let fetchedContests: Contest[] = cData.result ? JSON.parse(cData.result) : [];
      setContests(fetchedContests);
      if (pData.result) setPresets(JSON.parse(pData.result));
      if (rData.rates) setRates(rData.rates);

      const now = Date.now();
      fetchedContests.forEach(c => {
        if (!c.isCompleted && c.expiresAt && c.expiresAt < now) autoFinish(c.id, fetchedContests);
      });

    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const autoFinish = async (id: string, currentList: Contest[]) => {
    const contest = currentList.find(c => c.id === id);
    if (!contest || contest.isCompleted) return;
    const fakeWinners = generateFakeWinners(contest);
    const updated = currentList.map(c => c.id === id ? { ...c, isCompleted: true, winners: fakeWinners, seed: generateRandomSeed() } : c);
    saveContests(updated);
  };

  const generateFakeWinners = (contest: Contest): WinnerInfo[] => {
    const winners: WinnerInfo[] = [];
    const prizePer = Math.floor(contest.prizeRub / contest.winnerCount);
    const usedTickets = new Set<number>();
    while (winners.length < contest.winnerCount && contest.lastTicketNumber > contest.winnerCount) {
      const lucky = Math.floor(Math.random() * contest.lastTicketNumber) + 1;
      if (lucky % 5 !== 1 && !usedTickets.has(lucky)) {
        usedTickets.add(lucky);
        winners.push({ name: generateHumanLikeName(), ticketNumber: lucky, prizeWon: prizePer, isFake: true });
      }
      if (winners.length >= contest.winnerCount) break;
    }
    return winners;
  };

  const saveContests = async (list: Contest[]) => {
    setContests(list);
    await fetch(`${KV_REST_API_URL}/set/${DB_KEY}`, { method: 'POST', headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, body: JSON.stringify(list) });
  };

  const savePresets = async (list: ProjectPreset[]) => {
    setPresets(list);
    await fetch(`${KV_REST_API_URL}/set/${PRESETS_KEY}`, { method: 'POST', headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, body: JSON.stringify(list) });
  };

  const handleClearAllContests = async () => {
    if (!window.confirm('Очистить всю историю?')) return;
    await saveContests([]);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('heavy');
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
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
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

  const finishContestManually = (id: string) => {
    const contest = contests.find(c => c.id === id);
    if (!contest) return;
    const fakeWinners = generateFakeWinners(contest);
    const updated = contests.map(c => {
      if (c.id === id) {
        return { ...c, isCompleted: true, winners: fakeWinners, seed: generateRandomSeed() };
      }
      return c;
    });
    saveContests(updated);
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
      <div className="flex items-center gap-2 bg-matte-black/40 border border-gold/40 px-3 py-2 rounded-2xl backdrop-blur-md shadow-[0_0_15px_rgba(197,160,89,0.15)] group animate-pulse-subtle">
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
      
      {/* Background Glows for Main Page */}
      <div className="absolute top-[-5%] left-[-10%] w-[60%] h-[50%] bg-gold/5 blur-[100px] rounded-full animate-glow-slow pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[40%] bg-gold/3 blur-[80px] rounded-full animate-glow-fast pointer-events-none z-0"></div>

      {/* Top Header */}
      <div className="px-4 py-5 bg-soft-gray/80 backdrop-blur-lg border-b border-border-gray z-30 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gold/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex justify-between items-center mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-[13px] font-black uppercase tracking-tight text-gold">РОЗЫГРЫШИ ОТ ЛУДОВАРА</h1>
            <div className="h-4 w-[1px] bg-border-gray mx-1"></div>
            
            <div className="relative inline-block">
              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value as Currency)}
                className="appearance-none bg-matte-black/60 border border-gold/20 rounded-xl px-3 py-1.5 text-[11px] font-black text-white pr-9 outline-none shadow-md backdrop-blur-sm"
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
               <p className="text-[10px] font-medium uppercase tracking-widest">За месяц</p>
             </div>
             <p className="text-[15px] font-black text-gold">{convert(stats.thisMonth)} {CURRENCIES[currency].symbol}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar relative z-10">
        {view === 'admin' ? (
          <div className="space-y-5 pb-24">
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

             <button onClick={handleClearAllContests} className="w-full py-4 border-2 border-red-500/20 text-red-500 font-black rounded-xl uppercase text-[11px] active:bg-red-500/10 transition-all mt-4 relative z-10">Очистить историю</button>
          </div>
        ) : (
          <div className="pb-24">
            {activeTab === 'contests' ? (
              <div className="flex flex-col">
                {/* Active Contests Section */}
                <div className="space-y-4 mb-8">
                  {contestLists.active.length === 0 ? (
                    <div className="flex flex-col items-center py-12 px-6 bg-soft-gray/30 rounded-3xl border border-border-gray/30 backdrop-blur-sm animate-fade-in">
                       <SparklesIcon className="w-10 h-10 text-gold/30 mb-4" />
                       <p className="text-[11px] font-bold text-center text-white/70 uppercase tracking-widest leading-relaxed">
                         на данный момент нет активных розыгрышей,<br/>но скоро они тут появятся :)
                       </p>
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
                          <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-gold/5 blur-3xl pointer-events-none group-hover:bg-gold/10 transition-all"></div>
                          
                          {isParticipating && (
                            <div className="mb-3 flex items-center gap-2 text-green-500">
                              <CheckBadgeIcon className="w-5 h-5" />
                              <span className="text-[12px] font-black uppercase tracking-wider">Вы участвуете. Ваш Билет #{userParticipation}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-start mb-6 relative z-10">
                            <h2 className="text-[16px] font-black uppercase tracking-tight leading-tight pr-10 text-white">{c.title}</h2>
                            <div className="px-3 py-1.5 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-2 shrink-0">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase text-green-500 tracking-wider">LIVE</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 border-t border-border-gray/50 pt-5 relative z-10">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase opacity-30 tracking-widest font-light text-white">Фонд</p>
                              <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                                <BanknotesIcon className="w-4 h-4 text-gold" />
                                <p className="text-[17px] font-black tracking-tight text-gold-light">
                                  {convert(c.prizeRub)} {CURRENCIES[currency].symbol}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-[10px] font-bold uppercase opacity-20 tracking-widest font-light text-white">Мест</p>
                              <div className="flex items-center justify-center gap-1.5">
                                <TrophyIcon className="w-4 h-4 text-white/40" />
                                <p className="text-[14px] font-black text-white">{c.winnerCount}</p>
                              </div>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] font-bold uppercase opacity-20 tracking-widest font-light text-white">Билетов</p>
                              <div className="flex items-center justify-end gap-1.5">
                                <TicketIcon className="w-4 h-4 text-white/40" />
                                <p className="text-[14px] font-black text-white">{c.participantCount}</p>
                              </div>
                            </div>
                          </div>

                          {c.expiresAt && (
                            <div className="mt-5 relative z-10 flex flex-col gap-2">
                               <div className="flex items-center justify-between">
                                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Осталось времени:</p>
                                  <Countdown expiresAt={c.expiresAt}/>
                               </div>
                            </div>
                          )}

                          {isAdmin && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); finishContestManually(c.id); }}
                              className="mt-5 w-full py-4 bg-matte-black/60 border border-gold/40 rounded-2xl text-[12px] font-black uppercase text-gold active:bg-gold/20 transition-all shadow-lg"
                            >Завершить досрочно</button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Separator / Completed Header */}
                {contestLists.completed.length > 0 && (
                  <div className="flex items-center gap-4 py-4 mb-4">
                    <div className="h-[1px] flex-1 bg-border-gray/50"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Завершенные</span>
                    <div className="h-[1px] flex-1 bg-border-gray/50"></div>
                  </div>
                )}

                {/* Completed Contests Section */}
                <div className="space-y-4">
                  {contestLists.completed.map(c => {
                    const userParticipation = profile.participatedContests[c.id];
                    const isParticipating = !!userParticipation;
                    const isWinner = c.winners?.some(w => w.ticketNumber === userParticipation);

                    return (
                      <div 
                        key={c.id} 
                        onClick={() => handleStartContest(c)}
                        className={`relative p-5 rounded-3xl border backdrop-blur-sm transition-all active:scale-[0.98] group overflow-hidden ${
                          isParticipating && !isWinner ? 'border-red-900/40 bg-soft-gray/30 grayscale-[0.3]' : 'bg-soft-gray/40 border-border-gray/50 opacity-60 grayscale-[0.6]'
                        }`}
                      >
                        {isParticipating && !isWinner && (
                          <div className="mb-3 flex items-center gap-2 text-red-700">
                            <FaceFrownIcon className="w-5 h-5" />
                            <span className="text-[12px] font-black uppercase tracking-wider">Вы не выиграли :(</span>
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <h2 className="text-[16px] font-black uppercase tracking-tight leading-tight pr-10 text-white/40">{c.title}</h2>
                          <div className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 shrink-0 flex items-center gap-1.5 opacity-30">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase">END</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 border-t border-border-gray/50 pt-5 relative z-10">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase opacity-30 tracking-widest font-light text-white/40">Фонд</p>
                            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                              <BanknotesIcon className="w-4 h-4 text-gold/30" />
                              <p className="text-[17px] font-black tracking-tight text-gold-light/30">
                                {convert(c.prizeRub)} {CURRENCIES[currency].symbol}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1 text-center">
                            <p className="text-[10px] font-bold uppercase opacity-20 tracking-widest font-light text-white/40">Мест</p>
                            <div className="flex items-center justify-center gap-1.5">
                              <TrophyIcon className="w-4 h-4 text-white/10" />
                              <p className="text-[14px] font-black text-white/30">{c.winnerCount}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-[10px] font-bold uppercase opacity-20 tracking-widest font-light text-white/40">Билетов</p>
                            <div className="flex items-center justify-end gap-1.5">
                              <TicketIcon className="w-4 h-4 text-white/10" />
                              <p className="text-[14px] font-black text-white/30">{c.participantCount}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-slide-up">
                <div className="flex items-center gap-5 p-6 bg-soft-gray/60 backdrop-blur-md rounded-3xl border border-border-gray/50 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gold/5 blur-3xl rounded-full"></div>
                  {user?.photo_url ? (
                    <img src={user.photo_url} className="w-16 h-16 rounded-2xl border-2 border-gold/20 shadow-lg" alt=""/>
                  ) : (
                    <div className="w-16 h-16 bg-matte-black/60 rounded-2xl border border-border-gray/50 flex items-center justify-center shadow-inner">
                      <UserCircleIcon className="w-10 h-10 text-gold/20"/>
                    </div>
                  )}
                  <div>
                    <h2 className="text-[18px] font-black text-white tracking-tight uppercase leading-tight">{user?.first_name || 'Инкогнито'}</h2>
                    <p className="text-[11px] font-bold text-gold/40 uppercase tracking-[0.2em] mt-1.5">ID: {user?.id || '000000'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-soft-gray/60 backdrop-blur-sm rounded-3xl border border-border-gray/50 text-center shadow-lg relative overflow-hidden group">
                      <p className="text-[11px] font-medium uppercase opacity-20 mb-2 tracking-widest font-light">Участий</p>
                      <p className="text-[24px] font-black text-white leading-none">{profile.participationCount}</p>
                   </div>
                   <div className="p-5 bg-soft-gray/60 backdrop-blur-sm rounded-3xl border border-border-gray/50 text-center shadow-lg relative overflow-hidden group">
                      <p className="text-[11px] font-medium uppercase opacity-20 mb-2 tracking-widest font-light">Выигрыш</p>
                      <p className="text-[24px] font-black text-gold leading-none">{convert(profile.totalWon)} {CURRENCIES[currency].symbol}</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
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

      {/* Step Modals */}
      {step !== ContestStep.LIST && (
        <div className="fixed inset-0 z-[100] bg-matte-black flex flex-col p-6 animate-slide-up no-scrollbar overflow-y-auto">
           <div className="absolute inset-0 bg-matte-black z-0"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/[0.04] blur-[150px] rounded-full pointer-events-none z-1"></div>

           <button onClick={() => { setStep(ContestStep.LIST); setVerifyStatus('idle'); }} className="absolute top-6 left-6 p-2 bg-soft-gray/90 backdrop-blur-md rounded-xl border border-border-gray/50 text-gold active:scale-90 transition-all shadow-xl z-[110]">
             <ChevronLeftIcon className="w-5 h-5"/>
           </button>
           
           <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10 py-10 relative z-[105]">
              
              {step === ContestStep.REFERRAL && (
                <div className="w-full max-w-[320px] space-y-8">
                  <div className="w-20 h-20 bg-gold/10 rounded-[40px] flex items-center justify-center border border-gold/20 mx-auto shadow-lg relative">
                    <LinkIcon className="w-10 h-10 text-gold"/>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">Проверка</h2>
                    <p className="text-[14px] uppercase font-bold opacity-30 tracking-widest px-4 font-light">Для участия подтвердите активность в проекте {presets.find(p => p.id === selectedContest?.projectId)?.name}</p>
                  </div>
                  
                  {refError && (
                    <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-3xl">
                      <p className="text-[13px] font-black text-red-500 uppercase leading-relaxed">{refError}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <button 
                      onClick={() => {
                        const project = presets.find(p => p.id === selectedContest?.projectId);
                        if (project) window.open(project.referralLink, '_blank');
                      }}
                      className="w-full py-4 bg-soft-gray text-gold border border-gold/20 font-black uppercase text-[12px] rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md"
                    >
                      <ArrowTopRightOnSquareIcon className="w-5 h-5"/>
                      Открыть {presets.find(p => p.id === selectedContest?.projectId)?.name}
                    </button>

                    <button 
                      onClick={handleRefCheck}
                      disabled={isRefChecking}
                      className="w-full py-5 bg-gold text-matte-black font-black uppercase text-[14px] rounded-3xl shadow-lg active:translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                    >
                      {isRefChecking ? <ArrowPathIcon className="w-6 h-6 animate-spin"/> : "Проверить регистрацию"}
                    </button>
                  </div>
                </div>
              )}

              {step === ContestStep.SUCCESS && selectedContest?.isCompleted && (
                <div className="w-full max-w-[400px] space-y-8 animate-fade-in flex flex-col items-center">
                   <div className="w-16 h-16 bg-gold/10 rounded-3xl flex items-center justify-center border border-gold/20 shadow-xl mb-2">
                     <TrophyIcon className="w-8 h-8 text-gold" />
                   </div>
                   <div className="space-y-2">
                     <h2 className="text-[28px] font-black text-white tracking-tighter leading-none">Итоги розыгрыша</h2>
                     <p className="text-[13px] font-black text-gold uppercase tracking-widest">{selectedContest.title}</p>
                   </div>

                   <div className="w-full px-2">
                     {selectedContest && profile.participatedContests[selectedContest.id] ? (
                       <div className="bg-gold/10 border border-gold/20 py-4 px-6 rounded-3xl flex items-center justify-center gap-3 shadow-inner">
                         <TicketIcon className="w-5 h-5 text-gold" />
                         <span className="text-[15px] font-black text-gold uppercase tracking-wider">Ваш билет: #{profile.participatedContests[selectedContest.id]}</span>
                       </div>
                     ) : (
                       <div className="bg-white/5 border border-white/10 py-4 px-6 rounded-3xl flex items-center justify-center gap-3">
                         <span className="text-[13px] font-bold text-white/30 uppercase tracking-widest">Вы не участвовали в этом розыгрыше</span>
                       </div>
                     )}
                   </div>

                   <div className="w-full space-y-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar px-2">
                      {selectedContest.winners?.map((w, i) => (
                        <div key={i} className="p-4 bg-soft-gray/50 backdrop-blur-md border border-border-gray/50 rounded-[28px] flex justify-between items-center animate-slide-up group shadow-lg relative overflow-hidden" style={{animationDelay: `${i * 0.1}s`}}>
                          <div className="absolute top-0 left-0 w-1 h-full bg-gold/50"></div>
                          <div className="text-left space-y-1 relative z-10">
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-gold/60" />
                              <div className="text-[15px] font-black text-white group-hover:text-gold transition-colors">
                                <BlurredWinnerName name={w.name} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-30">
                              <p className="text-[10px] font-bold uppercase tracking-widest">Билет #{w.ticketNumber}</p>
                            </div>
                          </div>
                          <div className="text-right relative z-10">
                             <p className="text-[18px] font-black text-green-500 tracking-tighter">{convert(w.prizeWon)} {CURRENCIES[currency].symbol}</p>
                          </div>
                        </div>
                      ))}
                   </div>
                   
                   <button onClick={() => { setStep(ContestStep.LIST); setVerifyStatus('idle'); }} className="w-full py-5 bg-gold text-matte-black font-black rounded-3xl text-[15px] shadow-xl active:translate-y-1 transition-all uppercase tracking-widest">Вернуться назад</button>
                </div>
              )}

              {step === ContestStep.PAYOUT && (
                <div className="w-full max-w-[340px] space-y-10">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black text-white tracking-tighter leading-none">Способ выплаты</h2>
                    <p className="text-[13px] font-bold text-white/20 uppercase tracking-widest font-light">Куда перечислить награду?</p>
                  </div>
                  
                  <div className="flex gap-4">
                    <button onClick={() => setProfile({...profile, payoutType: 'card'})} className={`flex-1 py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 shadow-lg ${profile.payoutType === 'card' ? 'bg-gold/10 border-gold text-gold scale-105' : 'bg-matte-black border-border-gray text-white/10 opacity-50'}`}>
                      <CreditCardIcon className="w-8 h-8"/>
                      <span className="text-[12px] font-black leading-none">Карта</span>
                    </button>
                    <button onClick={() => setProfile({...profile, payoutType: 'trc20'})} className={`flex-1 py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 shadow-lg ${profile.payoutType === 'trc20' ? 'bg-gold/10 border-gold text-gold scale-105' : 'bg-matte-black border-border-gray text-white/10 opacity-50'}`}>
                      <BanknotesIcon className="w-8 h-8"/>
                      <span className="text-[12px] font-black leading-none">TRC-20</span>
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <input 
                      placeholder={profile.payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес кошелька (TRC-20)"} 
                      value={profile.payoutValue} 
                      onChange={e => {
                        const val = profile.payoutType === 'card' ? formatCard(e.target.value) : e.target.value;
                        setProfile({...profile, payoutValue: val});
                      }}
                      className="w-full bg-soft-gray p-5 rounded-2xl border border-border-gray text-center font-mono text-gold text-[16px] font-black outline-none shadow-inner"
                    />
                  </div>

                  <button 
                    onClick={handleFinalizeParticipation}
                    disabled={!profile.payoutValue}
                    className="w-full py-5 bg-gold text-matte-black font-black rounded-3xl text-[15px] shadow-lg disabled:opacity-20 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    Занять место
                  </button>
                </div>
              )}

              {step === ContestStep.TICKET_SHOW && (
                <div className="w-full max-w-[340px] space-y-12 animate-pop relative py-10">
                   {/* Integrated Ticket - Dark Palette Adaptation */}
                   <div className="bg-deep-gray text-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative border border-gold/30">
                      <div className="absolute top-[-15px] left-1/2 -translate-x-1/2 w-10 h-8 bg-matte-black rounded-full z-10 border border-gold/20"></div>
                      
                      <div className="p-8 pb-4 border-b-2 border-dashed border-gold/20 relative bg-soft-gray/30">
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-2">
                            <QrCodeIcon className="w-6 h-6 text-gold" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/60">BEEF • TICKET</span>
                          </div>
                          <span className="text-[10px] font-black text-gold/40">#{selectedContest?.id.slice(-6)}</span>
                        </div>
                        <h3 className="text-[20px] font-black uppercase mb-1 text-white tracking-tight">{selectedContest?.title}</h3>
                        <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest">Участие подтверждено</p>
                      </div>

                      <div className="p-10 flex flex-col items-center justify-center relative bg-matte-black/40">
                        <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-matte-black rounded-full border-r border-gold/20"></div>
                        <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-matte-black rounded-full border-l border-gold/20"></div>

                        <span className="text-[12px] font-black text-gold/40 uppercase tracking-[0.6em] mb-6">ВАШ НОМЕР</span>
                        <h1 className="text-[90px] font-black italic text-white tracking-tighter leading-none select-none drop-shadow-[0_4px_12px_rgba(197,160,89,0.4)]">#{userTicket}</h1>
                        
                        <div className="mt-10 flex items-center gap-3 px-6 py-2.5 bg-gold/5 rounded-full border border-gold/30">
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
        
        .animate-glow-slow { animation: glow-slow 18s ease-in-out infinite; }
        .animate-glow-fast { animation: glow-fast 12s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
        
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
