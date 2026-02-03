
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
  ShieldExclamationIcon,
  XCircleIcon,
  ShieldCheckIcon as ShieldCheckSolid
} from '@heroicons/react/24/outline';

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 

const DB_KEY = 'beef_contests_v7_final';
const PRESETS_KEY = 'beef_project_presets_v7';
const AVATARS_KEY = 'beef_avatars_pool'; 
const USERS_KEY = 'beef_registered_users_v1';
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

const DURATION_OPTIONS = [
  { label: '5 мин', value: '300000' },
  { label: '10 мин', value: '600000' },
  { label: '30 мин', value: '1800000' },
  { label: '1 час', value: '3600000' },
  { label: '3 часа', value: '10800000' },
  { label: '6 часов', value: '21600000' },
  { label: '12 часов', value: '43200000' },
  { label: '24 часа', value: '86400000' },
  { label: '72 часа', value: '259200000' },
  { label: 'Вручную', value: 'null' }
];

const MALE_NAMES_RU = [
  "Алексей", "Дмитрий", "Иван", "Сергей", "Андрей", "Павел", "Максим", "Артем", "Денис", "Владимир",
  "Михаил", "Николай", "Александр", "Степан", "Роман", "Игорь", "Олег", "Виктор", "Кирилл", "Глеб",
  "Борис", "Леонид", "Юрий", "Константин", "Евгений", "Владислав", "Станислав", "Тимур",
  "Даниил", "Егор", "Никита", "Илья", "Матвей", "Макар", "Лев", "Марк", "Артемий", "Арсений"
];

const generateHumanLikeName = () => {
  const names = MALE_NAMES_RU;
  let fullName = names[Math.floor(Math.random() * names.length)];
  const suffixRoll = Math.random();
  if (suffixRoll > 0.8) fullName += (Math.floor(Math.random() * 90) + 10).toString();
  return fullName;
};

const generateValidRussianCard = () => {
  const prefixes = ['2200', '2202', '2204', '4000', '4111', '5100'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let card = prefix;
  while (card.length < 15) card += Math.floor(Math.random() * 10);
  let sum = 0;
  for (let i = 0; i < card.length; i++) {
    let digit = parseInt(card[card.length - 1 - i]);
    if (i % 2 === 0) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return card + checkDigit;
};

const BlurredWinnerName: React.FC<{ name: string }> = ({ name }) => {
  if (name.length <= 4) {
    const first = name.slice(0, 1);
    const last = name.slice(-1);
    const middle = name.slice(1, -1) || '••';
    return <span className="inline-flex items-center">{first}<span className="blur-[6px] select-none mx-0.5 opacity-60 scale-x-125">{middle}</span>{last}</span>;
  }
  const firstTwo = name.slice(0, 2);
  const lastTwo = name.slice(-2);
  const middle = name.slice(2, -2);
  return <span className="inline-flex items-center">{firstTwo}<span className="blur-[7px] select-none mx-0.5 opacity-60 tracking-tighter scale-x-110">{middle}</span>{lastTwo}</span>;
};

const generateRandomSeed = () => {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 64; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const isValidLuhn = (val: string) => {
  let sum = 0; let shouldDouble = false;
  const digits = val.replace(/\s+/g, '');
  if (digits.length < 13) return false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (shouldDouble) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit; shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

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
    participatedContests: {},
    verifiedProjects: []
  });
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [rates, setRates] = useState<Record<string, number>>({ RUB: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPrize, setNewPrize] = useState('');
  const [newWinners, setNewWinners] = useState('1');
  const [newProjectId, setNewProjectId] = useState('');
  const [newDuration, setNewDuration] = useState<string>('300000');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetLink, setNewPresetLink] = useState('');
  const [refClickCount, setRefClickCount] = useState(0);
  const [isRefChecking, setIsRefChecking] = useState(false);
  const [refError, setRefError] = useState('');
  const [userTicket, setUserTicket] = useState<number>(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
        registerUser(tg.initDataUnsafe.user.id);
      }
    }
    fetchData();
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) setProfile(prev => ({ ...prev, ...JSON.parse(savedProfile) }));
  }, []);

  const registerUser = async (userId: number) => {
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${USERS_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const data = await res.json();
      let users: number[] = data.result ? JSON.parse(data.result) : [];
      if (!users.includes(userId)) {
        users.push(userId);
        await fetch(`${KV_REST_API_URL}/set/${USERS_KEY}`, { method: 'POST', headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, body: JSON.stringify(users) });
      }
    } catch (e) { console.error("User registration failed", e); }
  };

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
      setPresets(pData.result ? JSON.parse(pData.result) : []);
      if (rData.rates) setRates(rData.rates);
      if (aData.result) setAvatars(JSON.parse(aData.result));

      const now = Date.now();
      let updatedContests = [...fetchedContests];
      let needsSave = false;

      updatedContests.forEach((c, idx) => {
        if (!c.isCompleted && c.expiresAt && c.expiresAt < now) {
          updatedContests[idx] = { ...c, isCompleted: true, winners: generateFakeWinners(c, JSON.parse(aData.result || '[]')), seed: generateRandomSeed() };
          needsSave = true;
        }
      });

      if (needsSave) saveContests(updatedContests); else setContests(updatedContests);
    } catch (e) { console.error("Fetch Data Error:", e); } finally { setIsLoading(false); }
  };

  const generateFakeWinners = (contest: Contest, pool: string[]): WinnerInfo[] => {
    const winners: WinnerInfo[] = [];
    const prizePer = Math.floor(contest.prizeRub / (contest.winnerCount || 1));
    const usedTickets = new Set<number>();
    while (winners.length < contest.winnerCount && contest.lastTicketNumber > 0) {
      const lucky = Math.floor(Math.random() * contest.lastTicketNumber) + 1;
      if (!usedTickets.has(lucky)) {
        usedTickets.add(lucky);
        winners.push({ name: generateHumanLikeName(), ticketNumber: lucky, prizeWon: prizePer, isFake: true, avatarUrl: pool[Math.floor(Math.random() * pool.length)] });
      }
      if (winners.length >= contest.winnerCount || usedTickets.size >= contest.lastTicketNumber) break;
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
    for (let i = 0; i < v.length; i += 4) parts.push(v.substring(i, i + 4));
    return parts.join(' ');
  };

  const handleCreateContest = async () => {
    if (!newTitle || !newPrize || !newProjectId) return;
    const now = Date.now();
    const duration = newDuration === 'null' ? null : parseInt(newDuration);
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
    
    // Отправка уведомлений через серверную функцию
    try {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          prize: `${newPrize}₽`,
          winners: newWinners
        })
      });
    } catch (e) { console.error("Notification broadcast failed", e); }

    setNewTitle(''); setNewPrize(''); setNewWinners('1');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const handleCreatePreset = async () => {
    if (!newPresetName || !newPresetLink) return;
    const newP: ProjectPreset = { id: Date.now().toString(), name: newPresetName, referralLink: newPresetLink };
    await savePresets([...presets, newP]);
    setNewPresetName(''); setNewPresetLink('');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const handleStartContest = (c: Contest) => {
    setSelectedContest(c);
    setRefClickCount(0);
    setRefError('');
    setIsRefChecking(false);
    if (c.isCompleted) { setStep(ContestStep.SUCCESS); return; }
    if (profile.participatedContests[c.id]) { setUserTicket(profile.participatedContests[c.id]); setStep(ContestStep.TICKET_SHOW); return; }
    if (profile.verifiedProjects?.includes(c.projectId) || profile.participationCount > 0) { setStep(ContestStep.PAYOUT); return; }
    setStep(ContestStep.REFERRAL);
  };

  const handleRefCheck = () => {
    if (isRefChecking) return;
    setIsRefChecking(true);
    setRefError('');
    setTimeout(() => {
      setIsRefChecking(false);
      const projectName = presets.find(p => p.id === selectedContest?.projectId)?.name || 'проект';
      if (refClickCount < 2) {
        setRefError(`Ошибка. Проверьте регистрацию на ${projectName}`);
        setRefClickCount(prev => prev + 1);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
      } else {
        if (selectedContest) {
          const newVerified = Array.from(new Set([...(profile.verifiedProjects || []), selectedContest.projectId]));
          const newProfile = { ...profile, verifiedProjects: newVerified };
          setProfile(newProfile);
          localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
        }
        setStep(ContestStep.PAYOUT);
        setRefClickCount(0);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
      }
    }, 1500);
  };

  const handleFinalizeParticipation = async () => {
    if (!selectedContest) return;
    const myTicket = selectedContest.lastTicketNumber + 1;
    setUserTicket(myTicket);
    const updatedContests = contests.map(c => c.id === selectedContest.id ? { ...c, participantCount: c.participantCount + 4, realParticipantCount: c.realParticipantCount + 1, lastTicketNumber: c.lastTicketNumber + 4 } : c);
    const newProfile = { ...profile, participationCount: profile.participationCount + 1, participatedContests: { ...profile.participatedContests, [selectedContest.id]: myTicket } };
    setProfile(newProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    await saveContests(updatedContests);
    setStep(ContestStep.TICKET_SHOW);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const Countdown = ({ expiresAt }: { expiresAt: number }) => {
    const [timeLeft, setTimeLeft] = useState(expiresAt - Date.now());
    useEffect(() => { const t = setInterval(() => setTimeLeft(expiresAt - Date.now()), 1000); return () => clearInterval(t); }, [expiresAt]);
    if (timeLeft <= 0) return null;
    const formatTimeLeft = (ms: number) => {
      const s = Math.floor(ms / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return h > 0 ? `${h}ч:${m}м` : `${m}м:${sec < 10 ? '0' : ''}${sec}с`;
    };
    return <div className="flex items-center gap-2 bg-matte-black/40 border border-gold/40 px-3 py-2 rounded-2xl backdrop-blur-md"><ClockIcon className="w-4 h-4 text-gold-light"/><span className="text-[16px] font-black text-gold-light font-mono">{formatTimeLeft(timeLeft)}</span></div>;
  };

  const contestLists = useMemo(() => {
    const now = Date.now();
    return { active: contests.filter(c => !c.isCompleted && (!c.expiresAt || c.expiresAt > now)), completed: contests.filter(c => c.isCompleted || (c.expiresAt && c.expiresAt <= now)) };
  }, [contests]);

  return (
    <div className="h-screen bg-matte-black text-[#E2E2E6] overflow-hidden flex flex-col relative">
      <div className="absolute top-[-5%] left-[-10%] w-[60%] h-[50%] bg-gold/5 blur-[100px] pointer-events-none"></div>
      <div className="px-4 py-5 bg-soft-gray/80 backdrop-blur-lg border-b border-border-gray z-30 shadow-xl shrink-0">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-black uppercase tracking-tight text-gradient-gold">BEEF • РОЗЫГРЫШИ</h1>
            <div className="relative"><select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="appearance-none bg-matte-black/60 border border-gold/20 rounded-xl px-3 py-1.5 text-[11px] font-black text-white pr-9 outline-none shadow-md">{Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDownIcon className="w-4 h-4 text-gold absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" /></div>
          </div>
          {isAdmin && <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className="p-2.5 bg-matte-black rounded-xl border border-gold/20 active:scale-90 shadow-lg"><ShieldCheckIcon className="w-5 h-5 text-gold"/></button>}
        </div>
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-matte-black/60 p-3 rounded-2xl border border-border-gray/50 flex flex-col gap-1 shadow-lg"><div className="flex items-center gap-2 opacity-30"><CurrencyDollarIcon className="w-4 h-4" /><p className="text-[10px] font-medium uppercase tracking-widest">Разыграно</p></div><p className="text-[15px] font-black text-white">{convert(stats.total)} {CURRENCIES[currency].symbol}</p></div>
          <div className="bg-matte-black/60 p-3 rounded-2xl border border-border-gray/50 flex flex-col gap-1 shadow-lg shadow-gold/5"><div className="flex items-center gap-2 opacity-30 text-gold"><SparklesIcon className="w-4 h-4" /><p className="text-[10px] font-medium uppercase tracking-widest text-gradient-gold">За месяц</p></div><p className="text-[15px] font-black text-gradient-gold">{convert(stats.thisMonth)} {CURRENCIES[currency].symbol}</p></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar z-10 pb-24">
        {view === 'admin' ? (
          <div className="space-y-5">
             <div className="bg-soft-gray/80 p-5 rounded-3xl border border-border-gray/50 space-y-5 shadow-xl">
                <div className="flex items-center gap-2"><PlusIcon className="w-5 h-5 text-gold" /><h3 className="text-[14px] font-black uppercase text-gradient-gold">Новый розыгрыш</h3></div>
                <div className="space-y-4"><input placeholder="Название розыгрыша" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-white outline-none focus:border-gold"/><div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Приз (RUB)" value={newPrize} onChange={e => setNewPrize(e.target.value)} className="bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-white outline-none"/><input type="number" placeholder="Победителей" value={newWinners} onChange={e => setNewWinners(e.target.value)} className="bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-white outline-none"/></div><div className="grid grid-cols-2 gap-4"><select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-gold font-bold"><option value="">Проект</option>{presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={newDuration} onChange={e => setNewDuration(e.target.value)} className="bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-gold font-bold">{DURATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div></div>
                <button onClick={handleCreateContest} className="w-full py-4 bg-gold text-matte-black font-black rounded-xl uppercase text-[12px] active:scale-95 shadow-gold/20">Опубликовать Анонс</button>
             </div>
             <div className="bg-soft-gray/80 p-5 rounded-3xl border border-gold/40 space-y-5 shadow-xl">
                <div className="flex items-center gap-2"><LinkIcon className="w-5 h-5 text-gold" /><h3 className="text-[14px] font-black uppercase text-gradient-gold">Проекты</h3></div>
                <div className="space-y-4"><input placeholder="Название" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} className="w-full bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-white outline-none"/><input placeholder="Ссылка" value={newPresetLink} onChange={e => setNewPresetLink(e.target.value)} className="w-full bg-matte-black/60 p-4 rounded-xl border border-border-gray text-[14px] text-white outline-none"/><button onClick={handleCreatePreset} className="w-full py-4 bg-gold text-matte-black font-black rounded-xl uppercase text-[11px]">Добавить</button></div>
                <div className="space-y-2 mt-4 max-h-40 overflow-y-auto">{presets.map(p => <div key={p.id} className="flex justify-between items-center bg-matte-black/40 p-3 rounded-xl border border-white/5"><span className="text-[12px] font-bold text-white">{p.name}</span><button onClick={() => savePresets(presets.filter(pr => pr.id !== p.id))} className="text-red-500/50"><TrashIcon className="w-4 h-4"/></button></div>)}</div>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'contests' ? (
              <div className="flex flex-col">
                <div className="space-y-4 mb-8">
                  {contestLists.active.length === 0 ? (
                    <div className="py-12 px-6 text-center bg-soft-gray/30 rounded-[32px] border border-white/5"><FaceFrownIcon className="w-10 h-10 text-white/10 mx-auto mb-4" /><p className="text-[13px] font-bold text-white/30 uppercase tracking-widest">Розыгрышей пока нет</p></div>
                  ) : (
                    contestLists.active.map(c => {
                      const userParticipation = profile.participatedContests[c.id];
                      return (
                        <div key={c.id} onClick={() => handleStartContest(c)} className={`relative p-5 rounded-3xl border backdrop-blur-sm transition-all active:scale-[0.98] ${userParticipation ? 'border-green-500/60 bg-soft-gray/70' : 'bg-soft-gray/70 border-gold/30'}`}>
                          {userParticipation && <div className="mb-3 flex items-center gap-2 text-green-500"><CheckBadgeIcon className="w-5 h-5" /><span className="text-[12px] font-black uppercase tracking-wider">Билет #{userParticipation}</span></div>}
                          <div className="flex justify-between items-start mb-6"><h2 className="text-[16px] font-black uppercase text-white leading-tight">{c.title}</h2><div className="px-3 py-1.5 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-[10px] font-black uppercase text-green-500">LIVE</span></div></div>
                          <div className="grid grid-cols-3 gap-4 border-t border-border-gray/50 pt-5"><div className="space-y-1"><p className="text-[10px] font-bold uppercase opacity-30 text-white">Фонд</p><p className="text-[17px] font-black text-gradient-gold">{convert(c.prizeRub)} {CURRENCIES[currency].symbol}</p></div><div className="space-y-1 text-center"><p className="text-[10px] font-bold uppercase opacity-20 text-white">Мест</p><p className="text-[14px] font-black text-white">{c.winnerCount}</p></div><div className="space-y-1 text-right"><p className="text-[10px] font-bold uppercase opacity-20 text-white">Билетов</p><p className="text-[14px] font-black text-white">{c.participantCount}</p></div></div>
                          {c.expiresAt && <div className="mt-5 flex items-center justify-between"><p className="text-[11px] font-black uppercase text-white/30">Осталось:</p><Countdown expiresAt={c.expiresAt}/></div>}
                        </div>
                      );
                    })
                  )}
                </div>
                {contestLists.completed.length > 0 && <div className="flex items-center gap-4 py-4 mb-4"><div className="h-[1px] flex-1 bg-border-gray/50"></div><span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">История</span><div className="h-[1px] flex-1 bg-border-gray/50"></div></div>}
                <div className="space-y-4">
                  {contestLists.completed.map(c => (
                    <div key={c.id} onClick={() => handleStartContest(c)} className="relative p-5 rounded-3xl border bg-soft-gray/40 border-border-gray/50 opacity-80 transition-all grayscale-[0.6]">
                      <div className="flex justify-between items-start mb-4"><h2 className="text-[16px] font-black uppercase text-white">{c.title}</h2><span className="text-[10px] font-black uppercase text-white/30">END</span></div>
                      <div className="flex justify-between items-end border-t border-border-gray/20 pt-4"><p className="text-[16px] font-black text-gradient-gold opacity-50">{convert(c.prizeRub)} {CURRENCIES[currency].symbol}</p><p className="text-[10px] font-bold text-white/20 uppercase">{c.participantCount} билетов</p></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-slide-up">
                <div className="flex items-center gap-5 p-6 bg-soft-gray/60 rounded-3xl border border-border-gray/50 relative overflow-hidden">
                  {user?.photo_url ? <img src={user.photo_url} className="w-16 h-16 rounded-2xl border-2 border-gold/20" alt=""/> : <div className="w-16 h-16 bg-matte-black/60 rounded-2xl border flex items-center justify-center"><UserCircleIcon className="w-10 h-10 text-gold/20"/></div>}
                  <div><h2 className="text-[18px] font-black text-white uppercase">{user?.first_name || 'Инкогнито'}</h2><p className="text-[11px] font-bold text-gradient-gold opacity-40 uppercase tracking-[0.2em] mt-1.5">ID: {user?.id || '000000'}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4"><div className="p-5 bg-soft-gray/60 rounded-3xl border border-border-gray/50 text-center"><p className="text-[11px] font-medium uppercase opacity-20 mb-2">Участий</p><p className="text-[24px] font-black text-white">{profile.participationCount}</p></div><div className="p-5 bg-soft-gray/60 rounded-3xl border border-border-gray/50 text-center"><p className="text-[11px] font-medium uppercase opacity-20 mb-2 text-gradient-gold">Выигрыш</p><p className="text-[24px] font-black text-gradient-gold">{convert(profile.totalWon)} {CURRENCIES[currency].symbol}</p></div></div>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-matte-black/95 backdrop-blur-2xl border-t border-border-gray/50 px-6 py-2 pb-5 flex justify-around z-[90]">
        <button onClick={() => { setActiveTab('contests'); setView('user'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'contests' && view === 'user' ? 'text-gradient-gold' : 'opacity-20'}`}><GiftIcon className="w-5 h-5"/><span className="text-[9px] font-black uppercase">РОЗЫГРЫШИ</span></button>
        <button onClick={() => { setActiveTab('profile'); setView('user'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-gradient-gold' : 'opacity-20'}`}><UserCircleIcon className="w-5 h-5"/><span className="text-[9px] font-black uppercase">ПРОФИЛЬ</span></button>
      </nav>

      {step !== ContestStep.LIST && (
        <div className="fixed inset-0 z-[100] bg-matte-black flex flex-col p-6 animate-slide-up no-scrollbar overflow-y-auto">
           <button onClick={() => setStep(ContestStep.LIST)} className="absolute top-6 left-6 p-2 bg-soft-gray/90 rounded-xl border text-gold z-[110]"><ChevronLeftIcon className="w-5 h-5"/></button>
           <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10 py-10 relative z-[105]">
              {step === ContestStep.REFERRAL && (
                <div className="w-full max-w-[320px] space-y-8 animate-pop">
                  <div className="w-20 h-20 bg-gold/10 rounded-[40px] flex items-center justify-center border border-gold/20 mx-auto shadow-gold/5"><LinkIcon className="w-10 h-10 text-gold"/></div>
                  <div className="space-y-3"><h2 className="text-3xl font-black uppercase text-white leading-none">Проверка</h2><p className="text-[14px] uppercase font-bold opacity-30 tracking-widest px-4 leading-relaxed">Подтвердите активность в проекте {presets.find(p => p.id === selectedContest?.projectId)?.name}</p></div>
                  {refError && <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-3xl animate-shake"><p className="text-[13px] font-black text-red-500 uppercase">{refError}</p></div>}
                  <div className="space-y-4"><button onClick={() => window.open(presets.find(p => p.id === selectedContest?.projectId)?.referralLink, '_blank')} className="w-full py-4 bg-soft-gray text-gradient-gold border border-gold/20 font-black uppercase text-[12px] rounded-2xl flex items-center justify-center gap-3 active:scale-95 shadow-gold/5"><ArrowTopRightOnSquareIcon className="w-5 h-5"/>Открыть проект</button><button onClick={handleRefCheck} disabled={isRefChecking} className="w-full py-5 bg-gold text-matte-black font-black uppercase text-[14px] rounded-3xl shadow-gold/20">{isRefChecking ? <ArrowPathIcon className="w-6 h-6 animate-spin"/> : "Проверить регистрацию"}</button></div>
                </div>
              )}
              {step === ContestStep.SUCCESS && selectedContest?.isCompleted && (
                <div className="w-full max-w-[400px] space-y-8 flex flex-col items-center">
                   <div className="w-16 h-16 bg-gold/10 rounded-3xl flex items-center justify-center border border-gold/20 mb-2 group shadow-gold/10"><TrophyIcon className="w-8 h-8 text-gold" /></div>
                   <div className="space-y-2"><h2 className="text-[28px] font-black text-white tracking-tighter leading-none uppercase">Итоги</h2><p className="text-[13px] font-black text-gradient-gold uppercase">{selectedContest.title}</p></div>
                   <div className="w-full space-y-3 max-h-[40vh] overflow-y-auto px-2">{selectedContest.winners?.map((w, i) => (
                        <div key={i} className="p-4 bg-soft-gray/50 border border-border-gray/50 rounded-[28px] flex justify-between items-center group shadow-black/20"><div className="text-left space-y-1 flex items-center gap-3"><div><div className="text-[15px] font-black text-white group-hover:text-gold transition-colors tracking-tight flex items-center"><BlurredWinnerName name={w.name} />{isAdmin && <button onClick={() => { navigator.clipboard.writeText(generateValidRussianCard()); window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light'); }} className="ml-3 p-1.5 bg-gold/10 rounded-lg text-gold"><ClipboardDocumentIcon className="w-4 h-4" /></button>}</div><p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Билет #{w.ticketNumber}</p></div></div><div className="text-right"><p className="text-[18px] font-black text-green-500 tracking-tighter">+{convert(w.prizeWon)} {CURRENCIES[currency].symbol}</p></div></div>
                      ))}</div>
                   <div className="w-full max-w-[340px] p-5 bg-matte-black/60 rounded-[32px] border border-gold/20 backdrop-blur-xl space-y-3 relative overflow-hidden group shadow-xl"><div className="flex items-center gap-2 text-gold/60 border-b border-gold/10 pb-3"><ShieldCheckSolid className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Provably Fair Verification</span></div><div className="space-y-1.5 text-left"><p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Generation Seed</p><div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 relative group/seed cursor-pointer active:scale-[0.98]" onClick={() => { if(selectedContest.seed) { navigator.clipboard.writeText(selectedContest.seed); window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light'); }}}><p className="text-[8px] font-mono text-white/40 break-all leading-tight pr-6">{selectedContest.seed || 'pending_generation_...'}</p><ClipboardDocumentIcon className="w-3 h-3 text-white/10 absolute right-3 top-1/2 -translate-y-1/2 group-hover/seed:text-gold" /></div><p className="text-[8px] text-white/10 font-bold uppercase">Результаты были выбраны с использованием криптографического сида.</p></div></div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-5 bg-gold text-matte-black font-black rounded-3xl text-[15px] uppercase shadow-gold/20">Назад</button>
                </div>
              )}
              {step === ContestStep.PAYOUT && (
                <div className="w-full max-w-[340px] space-y-10 animate-pop">
                  <div className="space-y-3"><h2 className="text-3xl font-black text-white tracking-tighter leading-none uppercase">Реквизиты</h2><p className="text-[13px] font-bold text-white/20 uppercase tracking-widest">Куда отправить награду?</p></div>
                  <div className="flex gap-4"><button onClick={() => setProfile({...profile, payoutType: 'card'})} className={`flex-1 py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${profile.payoutType === 'card' ? 'bg-gold/10 border-gold text-gradient-gold scale-105 shadow-gold/20' : 'bg-matte-black border-border-gray text-white/10 opacity-50'}`}><CreditCardIcon className="w-8 h-8"/><span className="text-[12px] font-black uppercase tracking-widest">Карта</span></button><button onClick={() => setProfile({...profile, payoutType: 'trc20'})} className={`flex-1 py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${profile.payoutType === 'trc20' ? 'bg-gold/10 border-gold text-gradient-gold scale-105 shadow-gold/20' : 'bg-matte-black border-border-gray text-white/10 opacity-50'}`}><BanknotesIcon className="w-8 h-8"/><span className="text-[12px] font-black uppercase tracking-widest">TRC-20</span></button></div>
                  {profile.payoutType === 'card' ? (
                    <div className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-[#1c1c1e] to-[#0d0d0d] rounded-[32px] border border-gold/40 p-8 text-left shadow-gold/5 overflow-hidden group"><div className="flex justify-between items-start mb-10"><div className="w-14 h-11 bg-gradient-to-tr from-gold/40 to-gold/20 rounded-lg border border-gold/30 flex items-center justify-center"><div className="w-10 h-7 bg-matte-black/40 rounded border border-gold/10"></div></div><div className="h-8 flex items-center gap-2">{getCardBrand(profile.payoutValue) === 'Visa' && <span className="text-[22px] font-black italic text-white/90 tracking-tighter">VISA</span>}{getCardBrand(profile.payoutValue) === 'Mastercard' && <div className="flex items-center -space-x-2"><div className="w-7 h-7 bg-red-500/80 rounded-full blur-[1px]"></div><div className="w-7 h-7 bg-yellow-500/80 rounded-full blur-[1px]"></div></div>}{getCardBrand(profile.payoutValue) === 'MIR' && <span className="text-[15px] font-black text-green-500 italic">МИР</span>}</div></div><div className="relative mt-2"><input placeholder="0000 0000 0000 0000" value={profile.payoutValue} onChange={e => setProfile({...profile, payoutValue: formatCard(e.target.value)})} className="w-full bg-white/5 px-4 py-4 rounded-2xl border border-white/5 focus:border-gold/40 transition-all font-mono text-[18px] text-white font-black tracking-wider outline-none"/></div><div className="mt-8 flex justify-between items-end opacity-30"><div className="space-y-1"><p className="text-[8px] uppercase font-black">Account Owner</p><p className="text-[10px] font-black uppercase tracking-widest">{user?.first_name || 'TELEGRAM USER'}</p></div><div className="space-y-1 text-right"><p className="text-[8px] uppercase font-black">Exp</p><p className="text-[11px] font-black">12 / 29</p></div></div></div>
                  ) : (<input placeholder="Адрес кошелька TRC-20" value={profile.payoutValue} onChange={e => setProfile({...profile, payoutValue: e.target.value})} className="w-full bg-soft-gray p-6 rounded-3xl border border-border-gray text-gradient-gold font-mono text-[14px] text-center outline-none"/>)}
                  <button onClick={handleFinalizeParticipation} disabled={profile.payoutType === 'card' ? !isValidLuhn(profile.payoutValue) : !profile.payoutValue} className="w-full py-5 bg-gold text-matte-black font-black rounded-3xl text-[16px] disabled:opacity-20 active:scale-95 uppercase tracking-widest shadow-gold/20">Занять место</button>
                </div>
              )}
              {step === ContestStep.TICKET_SHOW && (
                <div className="w-full max-w-[340px] space-y-12 animate-pop relative py-10">
                   <div className="bg-deep-gray text-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative border border-gold/30 shadow-gold/5"><div className="absolute top-[-15px] left-1/2 -translate-x-1/2 w-10 h-8 bg-matte-black rounded-full z-10 border border-gold/20 shadow-lg"></div><div className="p-8 pb-4 border-b-2 border-dashed border-gold/20 bg-soft-gray/30"><div className="flex justify-between items-center mb-6 relative z-10"><div className="flex items-center gap-2"><QrCodeIcon className="w-6 h-6 text-gold" /><span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/60">BEEF • TICKET</span></div><span className="text-[10px] font-black text-gold/40">#{selectedContest?.id.slice(-6)}</span></div><h3 className="text-[20px] font-black uppercase mb-1 text-white tracking-tight relative z-10">{selectedContest?.title}</h3><p className="text-[11px] text-white/30 font-bold uppercase tracking-widest relative z-10">Участие подтверждено</p></div><div className="p-10 flex flex-col items-center justify-center bg-matte-black/40 shadow-inner"><div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-matte-black rounded-full border-r border-gold/20 shadow-inner"></div><div className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-matte-black rounded-full border-l border-gold/20 shadow-inner"></div><span className="text-[12px] font-black text-gold/40 uppercase tracking-[0.6em] mb-6">ВАШ НОМЕР</span><h1 className="text-[90px] font-black italic text-white tracking-tighter leading-none select-none drop-shadow-[0_4px_12px_rgba(197,160,89,0.4)]">#{userTicket}</h1><div className="mt-10 flex items-center gap-3 px-6 py-2.5 bg-gold/5 rounded-full border border-gold/30 backdrop-blur-md shadow-gold/5"><CheckBadgeIcon className="w-5 h-5 text-gold-light" /><span className="text-[12px] font-black text-gold-light uppercase tracking-widest">АКТИВЕН</span></div></div><div className="h-8 bg-matte-black/80 flex items-center justify-center gap-1 px-8 opacity-40">{[...Array(30)].map((_, i) => <div key={i} className="bg-gold/10 h-full" style={{ width: Math.random() * 3 + 1 + 'px' }}></div>)}</div></div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-6 bg-matte-black/60 border-2 border-gold/30 rounded-3xl text-[14px] font-black uppercase text-gradient-gold active:bg-gold/20 shadow-gold/10">На главную</button>
                </div>
              )}
           </div>
        </div>
      )}

      <style>{`
        @keyframes shine { to { background-position: 200% center; } }
        .text-gradient-gold { background: linear-gradient(to right, #C5A059, #F3E5AB, #C5A059); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shine 3s linear infinite; }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.92); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-pop { animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .no-scrollbar::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  );
};

export default App;
