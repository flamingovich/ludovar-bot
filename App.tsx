
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
  ExclamationTriangleIcon
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

  // Admin states
  const [newTitle, setNewTitle] = useState('');
  const [newPrize, setNewPrize] = useState('');
  const [newWinners, setNewWinners] = useState('1');
  const [newProjectId, setNewProjectId] = useState('');
  const [newDuration, setNewDuration] = useState<string>('300000');

  // Participation logic
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
    const updated = currentList.map(c => c.id === id ? { ...c, isCompleted: true, winners: fakeWinners } : c);
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
        winners.push({ name: `Билет #${lucky}`, ticketNumber: lucky, prizeWon: prizePer, isFake: true });
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
    if (!window.confirm('Вы уверены, что хотите удалить ВСЮ историю розыгрышей? Это действие необратимо.')) return;
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

  const getCardType = (cardNumber: string) => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'MasterCard';
    if (clean.startsWith('2')) return 'МИР';
    return null;
  };

  const generateDeterministicFakeCard = (seed: number) => {
    const prefixes = ['2200', '2201', '2202'];
    const prefix = prefixes[seed % prefixes.length];
    let rest = "";
    for(let i=0; i<12; i++) rest += ((seed * (i+7)) % 10).toString();
    return formatCard(prefix + rest);
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

    if (c.isCompleted) {
      setStep(ContestStep.SUCCESS);
      return;
    }

    if (profile.participatedContests[c.id]) {
      setUserTicket(profile.participatedContests[c.id]);
      setStep(ContestStep.TICKET_SHOW);
      return;
    }

    setStep(ContestStep.REFERRAL);
  };

  const handleRefCheck = () => {
    if (isRefChecking) return;
    setIsRefChecking(true);
    setRefError('');
    
    const delay = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
    
    setTimeout(() => {
      setIsRefChecking(false);
      if (refClickCount < 2) {
        setRefError('Ошибка. Проверьте реферал ли Вы, или повторите попытку через 5 секунд.');
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

    const fakeCount = Math.floor(Math.random() * (5 - 2 + 1)) + 2;
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
    const updated = contests.map(c => c.id === id ? { ...c, isCompleted: true, winners: fakeWinners } : c);
    saveContests(updated);
  };

  const Countdown = ({ expiresAt }: { expiresAt: number }) => {
    const [timeLeft, setTimeLeft] = useState(expiresAt - Date.now());
    useEffect(() => {
      const t = setInterval(() => setTimeLeft(expiresAt - Date.now()), 1000);
      return () => clearInterval(t);
    }, [expiresAt]);
    if (timeLeft <= 0) return <span className="text-red-500 font-bold uppercase text-[12px]">Завершен</span>;
    const m = Math.floor(timeLeft / 60000);
    const s = Math.floor((timeLeft % 60000) / 1000);
    return <span className="text-gold font-mono text-[16px] font-black">{m}:{s < 10 ? '0' : ''}{s}</span>;
  };

  return (
    <div className="h-screen bg-matte-black text-[#E2E2E6] overflow-hidden flex flex-col font-sans selection:bg-gold/30">
      
      {/* Top Header */}
      <div className="p-6 bg-soft-gray border-b border-border-gray z-30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent"></div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-[15px] font-black uppercase tracking-[0.1em] text-gold">РОЗЫГРЫШИ ОТ ЛУДОВАРА</h1>
            <div className="h-6 w-[1.5px] bg-border-gray mx-1"></div>
            
            <div className="relative inline-block">
              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value as Currency)}
                className="appearance-none bg-matte-black border border-gold/30 rounded-2xl px-5 py-2.5 text-[13px] font-black text-white pr-11 outline-none active:border-gold transition-all shadow-lg"
              >
                {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDownIcon className="w-5 h-5 text-gold absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className="p-3.5 bg-matte-black rounded-2xl border border-gold/30 active:scale-90 transition-all shadow-2xl hover:bg-gold/10">
              <ShieldCheckIcon className="w-7 h-7 text-gold"/>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="bg-matte-black/60 p-5 rounded-3xl border border-border-gray flex flex-col gap-2 relative group overflow-hidden">
             <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="flex items-center gap-2.5 opacity-40">
               <CurrencyDollarIcon className="w-5 h-5" />
               <p className="text-[12px] font-medium uppercase tracking-[0.2em]">Разыграно</p>
             </div>
             <p className="text-[19px] font-black text-white leading-tight">{convert(stats.total)} {CURRENCIES[currency].symbol}</p>
          </div>
          <div className="bg-matte-black/60 p-5 rounded-3xl border border-border-gray flex flex-col gap-2 relative group overflow-hidden">
             <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="flex items-center gap-2.5 opacity-40 text-gold">
               <SparklesIcon className="w-5 h-5" />
               <p className="text-[12px] font-medium uppercase tracking-[0.2em]">За месяц</p>
             </div>
             <p className="text-[19px] font-black text-gold leading-tight">{convert(stats.thisMonth)} {CURRENCIES[currency].symbol}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar relative">
        {view === 'admin' ? (
          <div className="space-y-7 pb-36">
             <div className="bg-soft-gray p-8 rounded-[40px] border border-border-gray space-y-7 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
                <div className="flex items-center gap-4">
                  <PlusIcon className="w-7 h-7 text-gold" />
                  <h3 className="text-[17px] font-black uppercase text-gold tracking-wide">Новый розыгрыш</h3>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase opacity-20 ml-2 tracking-widest">Основная информация</p>
                    <input placeholder="Название розыгрыша" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-matte-black p-6 rounded-3xl border border-border-gray text-[16px] text-white outline-none focus:border-gold transition-all shadow-inner"/>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase opacity-20 ml-2 tracking-widest">Приз (RUB)</p>
                      <input type="number" placeholder="5000" value={newPrize} onChange={e => setNewPrize(e.target.value)} className="w-full bg-matte-black p-6 rounded-3xl border border-border-gray text-[16px] text-white outline-none focus:border-gold transition-all shadow-inner"/>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase opacity-20 ml-2 tracking-widest">Победителей</p>
                      <input type="number" placeholder="1" value={newWinners} onChange={e => setNewWinners(e.target.value)} className="w-full bg-matte-black p-6 rounded-3xl border border-border-gray text-[16px] text-white outline-none focus:border-gold transition-all shadow-inner"/>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase opacity-20 ml-2 tracking-widest">Проект казино</p>
                    <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="w-full bg-matte-black p-6 rounded-3xl border border-border-gray text-[16px] text-gold font-black outline-none appearance-none">
                      <option value="">Выберите пресет</option>
                      {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleCreateContest} className="w-full py-6 bg-gold text-matte-black font-black rounded-3xl uppercase text-[15px] active:scale-95 transition-all shadow-[0_15px_40px_rgba(197,160,89,0.3)]">Опубликовать в ленту</button>
             </div>

             <div className="bg-soft-gray p-8 rounded-[40px] border border-border-gray space-y-7 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <FlagIcon className="w-7 h-7 text-gold" />
                    <h3 className="text-[17px] font-black uppercase text-gold tracking-wide">Пресеты</h3>
                  </div>
                  <button onClick={() => {
                    const name = prompt('Название казино:');
                    const link = prompt('Ссылка регистрации:');
                    if(name && link) savePresets([...presets, { id: Date.now().toString(), name, referralLink: link }]);
                  }} className="p-4 bg-gold/10 rounded-2xl border border-gold/30 active:scale-90 transition-all shadow-xl"><PlusIcon className="w-7 h-7 text-gold"/></button>
                </div>
                <div className="space-y-5">
                  {presets.map(p => (
                    <div key={p.id} className="p-6 bg-matte-black rounded-3xl border border-border-gray flex justify-between items-center group relative overflow-hidden shadow-inner">
                      <div className="absolute left-0 top-0 w-1.5 h-full bg-gold/20"></div>
                      <div className="overflow-hidden pl-2">
                        <p className="text-[16px] font-black text-white uppercase truncate mb-1">{p.name}</p>
                        <p className="text-[12px] font-light opacity-30 truncate w-56">{p.referralLink}</p>
                      </div>
                      <button onClick={() => savePresets(presets.filter(i => i.id !== p.id))} className="text-red-500/30 hover:text-red-500 p-3 transition-colors active:scale-90"><TrashIcon className="w-7 h-7"/></button>
                    </div>
                  ))}
                  {presets.length === 0 && (
                     <p className="text-center py-4 text-[13px] font-light opacity-20 uppercase tracking-[0.3em]">Список пуст</p>
                  )}
                </div>
             </div>

             <div className="bg-red-500/5 p-8 rounded-[40px] border border-red-500/20 space-y-6 relative overflow-hidden">
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-red-500/5 blur-3xl rounded-full"></div>
                <div className="flex items-center gap-4 text-red-500">
                   <ExclamationTriangleIcon className="w-7 h-7" />
                   <h3 className="text-[17px] font-black uppercase tracking-tight">Управление данными</h3>
                </div>
                <button onClick={handleClearAllContests} className="w-full py-6 border-2 border-red-500/20 text-red-500 font-black rounded-3xl uppercase text-[13px] active:bg-red-500/10 transition-all flex items-center justify-center gap-4 shadow-xl">
                  <TrashIcon className="w-6 h-6" />
                  Полная очистка истории
                </button>
             </div>
          </div>
        ) : (
          <div className="pb-36">
            {activeTab === 'contests' ? (
              <div className="space-y-7">
                {contests.length === 0 && (
                  <div className="flex flex-col items-center py-28 opacity-10">
                    <GiftIcon className="w-24 h-24 mb-6"/>
                    <p className="text-[18px] font-black uppercase tracking-[0.3em]">Наград нет</p>
                  </div>
                )}
                {contests.map(c => {
                  const isActive = !c.isCompleted && (c.expiresAt ? c.expiresAt > Date.now() : true);
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => handleStartContest(c)}
                      className={`relative p-9 rounded-[48px] border transition-all active:scale-[0.98] group overflow-hidden ${
                        isActive 
                        ? 'bg-soft-gray border-gold/40 shadow-[0_25px_60px_rgba(197,160,89,0.15)] ring-1 ring-gold/10 scale-100 hover:scale-[1.01]' 
                        : 'bg-soft-gray/40 border-border-gray opacity-80'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-8">
                        <h2 className="text-[20px] font-black text-white uppercase tracking-tight leading-tight pr-14 drop-shadow-lg">{c.title}</h2>
                        {isActive ? (
                          <div className="px-5 py-2.5 bg-green-500/15 rounded-2xl border border-green-500/30 flex items-center gap-3 shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.8)]"></div>
                            <span className="text-[12px] font-black uppercase text-green-500 tracking-wider">LIVE</span>
                          </div>
                        ) : (
                          <div className="px-5 py-2.5 bg-white/5 rounded-2xl border border-white/10 shrink-0 flex items-center gap-2.5">
                            <ClockIcon className="w-5 h-5 text-white/30" />
                            <span className="text-[12px] font-black uppercase text-white/30 tracking-wider">END</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-7 border-t border-border-gray pt-8">
                        <div className="space-y-2.5">
                          <p className="text-[13px] font-black uppercase opacity-20 tracking-widest font-light">Банк</p>
                          <div className="flex items-center gap-2.5">
                            <BanknotesIcon className="w-6 h-6 text-gold/70" />
                            <p className="text-[18px] font-black text-gold tracking-tight">{convert(c.prizeRub)} {CURRENCIES[currency].symbol}</p>
                          </div>
                        </div>
                        <div className="space-y-2.5 text-center">
                          <p className="text-[13px] font-black uppercase opacity-20 tracking-widest font-light">Мест</p>
                          <div className="flex items-center justify-center gap-2.5">
                            <TrophyIcon className="w-6 h-6 text-white/30" />
                            <p className="text-[18px] font-black text-white tracking-tight">{c.winnerCount}</p>
                          </div>
                        </div>
                        <div className="space-y-2.5 text-right">
                          <p className="text-[13px] font-black uppercase opacity-20 tracking-widest font-light">Билетов</p>
                          <div className="flex items-center justify-end gap-2.5">
                            <TicketIcon className="w-6 h-6 text-white/30" />
                            <p className="text-[18px] font-black text-white tracking-tight">{c.participantCount}</p>
                          </div>
                        </div>
                      </div>

                      {isActive && c.expiresAt && (
                        <div className="mt-8 flex items-center gap-4 text-[14px] font-medium text-white/50 uppercase tracking-wide">
                          <div className="p-2 bg-gold/10 rounded-2xl border border-gold/20 shadow-inner">
                            <ClockIcon className="w-5 h-5 text-gold"/>
                          </div>
                          <span>Финиш:</span> <Countdown expiresAt={c.expiresAt}/>
                        </div>
                      )}

                      {isAdmin && !c.isCompleted && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); finishContestManually(c.id); }}
                          className="mt-8 w-full py-5 bg-matte-black/70 border border-gold/30 rounded-[24px] text-[13px] font-black uppercase text-gold hover:bg-gold/20 transition-all active:scale-95 shadow-xl"
                        >Завершить вручную</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-8 animate-slide-up">
                <div className="flex items-center gap-7 p-9 bg-soft-gray rounded-[48px] border border-border-gray shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-gold/5 blur-[80px] rounded-full"></div>
                  {user?.photo_url ? (
                    <img src={user.photo_url} className="w-28 h-28 rounded-[40px] border-2 border-gold/30 shadow-2xl transform hover:rotate-3 transition-transform" alt=""/>
                  ) : (
                    <div className="w-28 h-28 bg-matte-black rounded-[40px] border border-border-gray flex items-center justify-center shadow-inner">
                      <UserCircleIcon className="w-16 h-16 text-gold/20"/>
                    </div>
                  )}
                  <div className="space-y-1">
                    <h2 className="text-[28px] font-black text-white tracking-tight uppercase leading-tight">{user?.first_name || 'Инкогнито'}</h2>
                    <p className="text-[13px] font-bold text-gold/40 uppercase tracking-[0.4em] mt-3">ID: {user?.id || '0000000'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="p-9 bg-soft-gray rounded-[44px] border border-border-gray text-center shadow-2xl relative overflow-hidden group active:scale-95 transition-all">
                      <p className="text-[13px] font-medium uppercase opacity-20 mb-4 tracking-[0.2em] font-light">Всего участий</p>
                      <p className="text-[38px] font-black text-white leading-none">{profile.participationCount}</p>
                      <TicketIcon className="w-14 h-14 absolute -right-5 -bottom-5 text-white/5 rotate-12" />
                   </div>
                   <div className="p-9 bg-soft-gray rounded-[44px] border border-border-gray text-center shadow-2xl relative overflow-hidden group active:scale-95 transition-all">
                      <p className="text-[13px] font-medium uppercase opacity-20 mb-4 tracking-[0.2em] font-light">Общий выигрыш</p>
                      <p className="text-[38px] font-black text-gold leading-none">{convert(profile.totalWon)} {CURRENCIES[currency].symbol}</p>
                      <TrophyIcon className="w-14 h-14 absolute -right-5 -bottom-5 text-gold/5 rotate-12" />
                   </div>
                </div>

                <div className="p-8 bg-soft-gray rounded-[44px] border border-border-gray shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)] relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-2xl rounded-full -mr-16 -mt-16"></div>
                   <div className="flex items-center gap-4 mb-6 border-b border-border-gray/50 pb-6">
                      <div className="p-3 bg-gold/15 rounded-2xl border border-gold/30">
                        <ShieldCheckIcon className="w-7 h-7 text-gold" />
                      </div>
                      <h3 className="text-[16px] font-black uppercase text-white tracking-wider">Приватность и защита</h3>
                   </div>
                   <p className="text-[15px] text-white/40 leading-relaxed font-normal">Ваш аккаунт и данные полностью защищены и никак не сохраняются на сервере, а только на стороне клиента.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-matte-black/98 backdrop-blur-3xl border-t border-border-gray p-6 pb-14 flex justify-around z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        <button onClick={() => { setActiveTab('contests'); setView('user'); }} className={`flex flex-col items-center gap-3.5 transition-all active:scale-75 ${activeTab === 'contests' && view === 'user' ? 'text-gold scale-110' : 'opacity-20'}`}>
          <GiftIcon className="w-9 h-9"/>
          <span className="text-[13px] font-black uppercase tracking-[0.2em]">DASHBOARD</span>
        </button>
        <button onClick={() => { setActiveTab('profile'); setView('user'); }} className={`flex flex-col items-center gap-3.5 transition-all active:scale-75 ${activeTab === 'profile' ? 'text-gold scale-110' : 'opacity-20'}`}>
          <UserCircleIcon className="w-9 h-9"/>
          <span className="text-[13px] font-black uppercase tracking-[0.2em]">ACCOUNT</span>
        </button>
      </nav>

      {/* Step Modals */}
      {step !== ContestStep.LIST && (
        <div className="fixed inset-0 z-[100] bg-matte-black flex flex-col p-12 animate-slide-up no-scrollbar overflow-y-auto">
           <button onClick={() => setStep(ContestStep.LIST)} className="absolute top-12 left-12 p-5 bg-soft-gray rounded-[28px] border border-border-gray text-gold active:scale-75 transition-all shadow-2xl hover:bg-gold/10"><ChevronLeftIcon className="w-9 h-9"/></button>
           
           <div className="flex-1 flex flex-col justify-center items-center text-center space-y-16 py-10">
              
              {step === ContestStep.REFERRAL && (
                <div className="w-full max-w-[360px] space-y-14">
                  <div className="w-32 h-32 bg-gold/10 rounded-[60px] flex items-center justify-center border border-gold/30 mx-auto shadow-[0_35px_70px_rgba(197,160,89,0.2)] relative animate-pulse">
                    <LinkIcon className="w-16 h-16 text-gold"/>
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold rounded-full flex items-center justify-center border-[4px] border-matte-black shadow-2xl">
                      <SparklesIcon className="w-6 h-6 text-matte-black" />
                    </div>
                  </div>
                  <div className="space-y-5">
                    <h2 className="text-5xl font-black uppercase tracking-tighter text-white leading-[0.85]">Проверка<br/>доступа</h2>
                    <p className="text-[17px] uppercase font-bold opacity-30 tracking-[0.25em] px-10 leading-relaxed font-light">Для участия подтвердите свою активность в проекте {presets.find(p => p.id === selectedContest?.projectId)?.name}</p>
                  </div>
                  
                  {refError && (
                    <div className="p-7 bg-red-500/10 border border-red-500/30 rounded-[32px] animate-shake shadow-2xl">
                      <p className="text-[16px] font-black text-red-500 uppercase leading-relaxed tracking-tight">{refError}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    <button 
                      onClick={() => {
                        const project = presets.find(p => p.id === selectedContest?.projectId);
                        if (project) window.open(project.referralLink, '_blank');
                      }}
                      className="w-full py-7 bg-soft-gray text-gold border border-gold/30 font-black uppercase text-[15px] rounded-[28px] flex items-center justify-center gap-5 active:scale-95 transition-all shadow-2xl hover:bg-gold/5"
                    >
                      <ArrowTopRightOnSquareIcon className="w-7 h-7"/>
                      Войти в {presets.find(p => p.id === selectedContest?.projectId)?.name}
                    </button>

                    <button 
                      onClick={handleRefCheck}
                      disabled={isRefChecking}
                      className="w-full py-8 bg-gold text-matte-black font-black uppercase text-[17px] rounded-[36px] shadow-[0_20px_60px_rgba(197,160,89,0.5)] active:translate-y-2 transition-all flex items-center justify-center gap-6 disabled:opacity-50"
                    >
                      {isRefChecking ? (
                        <>
                          <ArrowPathIcon className="w-9 h-9 animate-spin"/>
                          Анализ базы...
                        </>
                      ) : (
                        <>
                          <CheckBadgeIcon className="w-8 h-8" />
                          Верифицировать
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === ContestStep.PAYOUT && (
                <div className="w-full max-w-[380px] space-y-14">
                  <div className="space-y-5">
                    <h2 className="text-5xl font-black uppercase text-white tracking-tighter leading-[0.85]">Способ<br/>выплаты</h2>
                    <p className="text-[16px] font-bold text-white/20 uppercase tracking-[0.25em] font-light">Реквизиты для перечисления приза</p>
                  </div>
                  
                  <div className="flex gap-6">
                    <button onClick={() => setProfile({...profile, payoutType: 'card'})} className={`flex-1 py-10 rounded-[36px] border-2 transition-all flex flex-col items-center gap-5 shadow-2xl ${profile.payoutType === 'card' ? 'bg-gold/20 border-gold text-gold scale-105 shadow-gold/20' : 'bg-matte-black border-border-gray text-white/10 opacity-40'}`}>
                      <CreditCardIcon className="w-12 h-12"/>
                      <span className="text-[14px] font-black uppercase tracking-widest leading-none">VISA/МИР</span>
                    </button>
                    <button onClick={() => setProfile({...profile, payoutType: 'trc20'})} className={`flex-1 py-10 rounded-[36px] border-2 transition-all flex flex-col items-center gap-5 shadow-2xl ${profile.payoutType === 'trc20' ? 'bg-gold/20 border-gold text-gold scale-105 shadow-gold/20' : 'bg-matte-black border-border-gray text-white/10 opacity-40'}`}>
                      <BanknotesIcon className="w-12 h-12"/>
                      <span className="text-[14px] font-black uppercase tracking-widest leading-none">USDT TRC-20</span>
                    </button>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="relative group">
                      <input 
                        placeholder={profile.payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес кошелька (TRC-20)"} 
                        value={profile.payoutValue} 
                        onChange={e => {
                          const val = profile.payoutType === 'card' ? formatCard(e.target.value) : e.target.value;
                          setProfile({...profile, payoutValue: val});
                        }}
                        className="w-full bg-soft-gray p-8 rounded-[30px] border border-border-gray text-center font-mono text-gold text-[19px] font-black outline-none focus:border-gold transition-all shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)] placeholder:opacity-10"
                      />
                      {profile.payoutType === 'card' && getCardType(profile.payoutValue) && (
                        <div className="absolute top-1/2 -translate-y-1/2 right-7 pointer-events-none animate-fade-in">
                           <span className="text-[12px] font-black uppercase text-gold/70 border border-gold/40 px-4 py-1.5 rounded-xl bg-matte-black backdrop-blur-xl shadow-2xl">{getCardType(profile.payoutValue)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={handleFinalizeParticipation}
                    disabled={!profile.payoutValue}
                    className="w-full py-8 bg-gold text-matte-black font-black rounded-[40px] uppercase text-[18px] shadow-[0_25px_60px_rgba(197,160,89,0.5)] disabled:opacity-20 active:translate-y-2 transition-all flex items-center justify-center gap-5"
                  >
                    <GiftIcon className="w-8 h-8" />
                    Занять место в игре
                  </button>
                </div>
              )}

              {step === ContestStep.TICKET_SHOW && (
                <div className="w-full max-w-[360px] space-y-18 animate-pop">
                   <div className="relative group">
                      <div className="absolute inset-0 bg-gold/20 blur-[120px] rounded-full animate-pulse group-hover:blur-[150px] transition-all"></div>
                      <div className="relative bg-soft-gray border-[6px] border-gold p-20 rounded-[80px] shadow-[0_50px_120px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-transparent via-gold/60 to-transparent"></div>
                        <div className="flex flex-col items-center gap-4 mb-12">
                           <div className="p-4 bg-gold/15 rounded-3xl border border-gold/30 shadow-inner">
                              <TicketIcon className="w-14 h-14 text-gold" />
                           </div>
                           <p className="text-[18px] font-black uppercase text-gold/60 tracking-[0.7em] font-light">ВАШ НОМЕР</p>
                        </div>
                        <h1 className="text-[120px] font-black text-white italic tracking-tighter drop-shadow-[0_15px_40px_rgba(255,255,255,0.15)] leading-none">#{userTicket}</h1>
                        <div className="mt-14 flex justify-center gap-4 opacity-40">
                           {[...Array(7)].map((_, i) => <div key={i} className="w-3.5 h-3.5 bg-gold rounded-full shadow-[0_0_12px_rgba(197,160,89,0.8)]"></div>)}
                        </div>
                      </div>
                   </div>
                   <div className="space-y-8">
                     <div className="flex items-center justify-center gap-5 text-green-500">
                       <CheckBadgeIcon className="w-11 h-11 drop-shadow-lg"/>
                       <p className="text-[22px] font-black uppercase tracking-[0.1em]">МЕСТО ЗАНЯТО!</p>
                     </div>
                     <div className="bg-gold/5 border border-gold/10 py-5 px-10 rounded-[32px] backdrop-blur-md shadow-inner">
                        <p className="text-[14px] font-black text-gold uppercase tracking-[0.3em] animate-pulse">Ожидайте системного звонка</p>
                     </div>
                   </div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-8 border-2 border-gold/40 rounded-[40px] text-[17px] font-black uppercase text-gold active:bg-gold/15 transition-all shadow-2xl">Вернуться к списку</button>
                </div>
              )}

              {step === ContestStep.SUCCESS && selectedContest?.isCompleted && (
                <div className="w-full max-w-[440px] space-y-14 animate-fade-in">
                   <div className="w-36 h-36 bg-gold/15 rounded-[64px] flex items-center justify-center border border-gold/30 mx-auto shadow-[0_30px_70px_rgba(197,160,89,0.2)] relative">
                    <TrophyIcon className="w-20 h-20 text-gold drop-shadow-2xl"/>
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center border-[4px] border-matte-black shadow-2xl">
                      <CheckBadgeIcon className="w-7 h-7 text-white" />
                    </div>
                   </div>
                   <div className="space-y-5">
                     <h2 className="text-[48px] font-black uppercase text-white tracking-tighter leading-none drop-shadow-xl">Итоги</h2>
                     <p className="text-[15px] font-black text-white/40 uppercase tracking-[0.3em] leading-relaxed">{selectedContest.title}</p>
                   </div>
                   <div className="space-y-6 max-h-[480px] overflow-y-auto pr-5 custom-scrollbar">
                      {selectedContest.winners?.map((w, i) => {
                        const fakeCard = generateDeterministicFakeCard(w.ticketNumber);
                        return (
                          <div key={i} className="p-8 bg-soft-gray border border-border-gray rounded-[48px] flex justify-between items-center animate-slide-up group shadow-2xl relative overflow-hidden active:scale-95 transition-all" style={{animationDelay: `${i * 0.15}s`}}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-gold/50 shadow-[0_0_15px_rgba(197,160,89,0.5)]"></div>
                            <div className="text-left space-y-3">
                              <div className="flex items-center gap-4">
                                <TicketIcon className="w-6 h-6 text-gold/60" />
                                <p className="text-[19px] font-black text-white uppercase group-hover:text-gold transition-colors">Билет #{w.ticketNumber}</p>
                              </div>
                              <div className="flex items-center gap-3 opacity-60">
                                <UserGroupIcon className="w-5 h-5 text-gold" />
                                <p className="text-[14px] font-black text-gold uppercase tracking-[0.25em] font-light">Победитель</p>
                              </div>
                              {isAdmin && (
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(fakeCard.replace(/\s/g, ''));
                                    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
                                  }}
                                  className="mt-5 flex items-center gap-4 text-[13px] font-black uppercase bg-gold/20 text-gold px-6 py-4 rounded-2xl border border-gold/30 active:scale-90 transition-all shadow-xl hover:bg-gold/30"
                                >
                                  <ClipboardDocumentIcon className="w-6 h-6"/>
                                  Копировать реквизиты
                                </button>
                              )}
                            </div>
                            <div className="text-right flex flex-col items-end gap-3">
                               <p className="text-[26px] font-black text-green-500 tracking-tighter drop-shadow-md">{convert(w.prizeWon)} {CURRENCIES[currency].symbol}</p>
                               <div className="w-10 h-1.5 bg-green-500/30 rounded-full shadow-inner"></div>
                            </div>
                          </div>
                        );
                      })}
                      {(!selectedContest.winners || selectedContest.winners.length === 0) && (
                        <p className="text-center py-20 text-[18px] opacity-40 uppercase tracking-[0.3em] font-black animate-pulse">Идет расчет...</p>
                      )}
                   </div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-8 bg-gold text-matte-black font-black rounded-[40px] uppercase text-[17px] shadow-[0_25px_60px_rgba(197,160,89,0.5)] active:translate-y-2 transition-all flex items-center justify-center gap-5">
                     <ChevronLeftIcon className="w-7 h-7" />
                     Выход в лобби
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(80px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-12px); } 40% { transform: translateX(12px); } 60% { transform: translateX(-10px); } 80% { transform: translateX(10px); } }
        .animate-fade-in { animation: fade-in 0.7s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.9s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-pop { animation: pop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-shake { animation: shake 0.6s ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.4); border-radius: 20px; border: 2px solid rgba(0,0,0,0.2); }
        .selection:bg-gold/30 ::selection { background-color: rgba(197, 160, 89, 0.3); }
      `}</style>
    </div>
  );
};

export default App;
