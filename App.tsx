
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
  ArrowPathIcon
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

    // ВАЖНО: Если конкурс завершен, ВСЕГДА показываем SUCCESS (список победителей)
    if (c.isCompleted) {
      setStep(ContestStep.SUCCESS);
      return;
    }

    // Если конкурс активен и юзер участвовал - показываем его билет
    if (profile.participatedContests[c.id]) {
      setUserTicket(profile.participatedContests[c.id]);
      setStep(ContestStep.TICKET_SHOW);
      return;
    }

    // В противном случае - на проверку реферала
    setStep(ContestStep.REFERRAL);
  };

  const handleRefCheck = () => {
    if (isRefChecking) return;
    setIsRefChecking(true);
    setRefError('');
    
    // 1-3 секунды
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
    
    const updatedContests = contests.map(c => {
      if (c.id === selectedContest.id) {
        return {
          ...c,
          participantCount: c.participantCount + 5,
          realParticipantCount: c.realParticipantCount + 1,
          lastTicketNumber: c.lastTicketNumber + 5
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
    if (timeLeft <= 0) return <span className="text-red-500 font-bold uppercase text-[10px]">Завершен</span>;
    const m = Math.floor(timeLeft / 60000);
    const s = Math.floor((timeLeft % 60000) / 1000);
    return <span className="text-gold font-mono text-[12px]">{m}:{s < 10 ? '0' : ''}{s}</span>;
  };

  return (
    <div className="h-screen bg-matte-black text-[#E2E2E6] overflow-hidden flex flex-col font-sans">
      
      {/* Top Header */}
      <div className="p-4 bg-soft-gray border-b border-border-gray z-30 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-[11px] font-black uppercase tracking-[0.1em] text-gold">РОЗЫГРЫШИ ОТ ЛУДОВАРА</h1>
            <div className="h-4 w-[1px] bg-border-gray mx-1"></div>
            
            <div className="relative inline-block">
              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value as Currency)}
                className="appearance-none bg-matte-black border border-gold/20 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white pr-8 outline-none active:border-gold transition-colors"
              >
                {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDownIcon className="w-3.5 h-3.5 text-gold absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className="p-2.5 bg-matte-black rounded-lg border border-gold/20">
              <ShieldCheckIcon className="w-5 h-5 text-gold"/>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-matte-black/40 p-4 rounded-xl border border-border-gray">
             <p className="text-[10px] font-bold uppercase opacity-30 tracking-[0.2em] mb-1">Всего разыграно</p>
             <p className="text-sm font-black text-white">{convert(stats.total)} {CURRENCIES[currency].symbol}</p>
          </div>
          <div className="bg-matte-black/40 p-4 rounded-xl border border-border-gray">
             <p className="text-[10px] font-bold uppercase opacity-30 tracking-[0.2em] mb-1">В этом месяце</p>
             <p className="text-sm font-black text-gold">{convert(stats.thisMonth)} {CURRENCIES[currency].symbol}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar relative">
        {view === 'admin' ? (
          <div className="space-y-6 pb-24">
             <div className="bg-soft-gray p-6 rounded-2xl border border-border-gray space-y-5">
                <h3 className="text-[12px] font-bold uppercase text-gold">Новый розыгрыш</h3>
                <div className="space-y-4">
                  <input placeholder="Название розыгрыша" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-matte-black p-4 rounded-xl border border-border-gray text-sm text-white outline-none focus:border-gold/50 transition-all"/>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Приз (RUB)" value={newPrize} onChange={e => setNewPrize(e.target.value)} className="bg-matte-black p-4 rounded-xl border border-border-gray text-sm text-white outline-none focus:border-gold/50 transition-all"/>
                    <input type="number" placeholder="Победителей" value={newWinners} onChange={e => setNewWinners(e.target.value)} className="bg-matte-black p-4 rounded-xl border border-border-gray text-sm text-white outline-none focus:border-gold/50 transition-all"/>
                  </div>
                  <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="w-full bg-matte-black p-4 rounded-xl border border-border-gray text-sm text-gold outline-none">
                    <option value="">Выберите пресет казино</option>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={handleCreateContest} className="w-full py-5 bg-gold text-matte-black font-black rounded-xl uppercase text-[11px] active:scale-95 transition-all">Опубликовать</button>
             </div>

             <div className="bg-soft-gray p-6 rounded-2xl border border-border-gray space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-[12px] font-bold uppercase text-gold">Управление пресетами</h3>
                  <button onClick={() => {
                    const name = prompt('Название казино:');
                    const link = prompt('Ссылка регистрации:');
                    if(name && link) savePresets([...presets, { id: Date.now().toString(), name, referralLink: link }]);
                  }} className="p-2.5 bg-gold/10 rounded-lg border border-gold/20"><PlusIcon className="w-5 h-5 text-gold"/></button>
                </div>
                <div className="space-y-3">
                  {presets.map(p => (
                    <div key={p.id} className="p-4 bg-matte-black rounded-xl border border-border-gray flex justify-between items-center group">
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-bold text-white uppercase truncate">{p.name}</p>
                        <p className="text-[9px] opacity-30 truncate w-40">{p.referralLink}</p>
                      </div>
                      <button onClick={() => savePresets(presets.filter(i => i.id !== p.id))} className="text-red-500 opacity-50 group-hover:opacity-100"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-5 pb-24">
            {contests.length === 0 && (
              <div className="flex flex-col items-center py-24 opacity-20">
                <GiftIcon className="w-16 h-16 mb-4"/>
                <p className="text-[12px] font-bold uppercase tracking-widest">Нет доступных розыгрышей</p>
              </div>
            )}
            {contests.map(c => {
              const isActive = !c.isCompleted && (c.expiresAt ? c.expiresAt > Date.now() : true);
              return (
                <div 
                  key={c.id} 
                  onClick={() => handleStartContest(c)}
                  className={`relative p-7 rounded-3xl border transition-all active:scale-[0.98] group overflow-hidden ${
                    isActive 
                    ? 'bg-soft-gray border-gold/40 shadow-[0_0_30px_rgba(197,160,89,0.1)] ring-1 ring-gold/10' 
                    : 'bg-soft-gray/50 border-border-gray opacity-70'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-[15px] font-black text-white uppercase tracking-tight leading-tight pr-10">{c.title}</h2>
                    {isActive ? (
                      <div className="px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center gap-2 shrink-0">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase text-green-500">LIVE</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 shrink-0">
                        <span className="text-[10px] font-black uppercase text-white/30">ЗАВЕРШЕН</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-5 border-t border-border-gray pt-6">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase opacity-20 tracking-widest">Банк</p>
                      <p className="text-[13px] font-black text-gold">{convert(c.prizeRub)} {CURRENCIES[currency].symbol}</p>
                    </div>
                    <div className="space-y-1.5 text-center">
                      <p className="text-[10px] font-black uppercase opacity-20 tracking-widest">Мест</p>
                      <p className="text-[13px] font-black text-white">{c.winnerCount}</p>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <p className="text-[10px] font-black uppercase opacity-20 tracking-widest">Билетов</p>
                      <p className="text-[13px] font-black text-white">{c.participantCount}</p>
                    </div>
                  </div>

                  {isActive && c.expiresAt && (
                    <div className="mt-5 flex items-center gap-2.5 text-[11px] font-bold text-white/40 uppercase">
                      <ClockIcon className="w-4 h-4 text-gold/60"/>
                      До завершения: <Countdown expiresAt={c.expiresAt}/>
                    </div>
                  )}

                  {isAdmin && !c.isCompleted && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); finishContestManually(c.id); }}
                      className="mt-6 w-full py-4 bg-matte-black/50 border border-gold/20 rounded-xl text-[10px] font-bold uppercase text-gold hover:bg-gold/10 transition-colors"
                    >Завершить вручную</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-matte-black/95 backdrop-blur-2xl border-t border-border-gray p-4 pb-12 flex justify-around z-50">
        <button onClick={() => { setActiveTab('contests'); setView('user'); }} className={`flex flex-col items-center gap-2.5 transition-all ${activeTab === 'contests' && view === 'user' ? 'text-gold' : 'opacity-20'}`}>
          <GiftIcon className="w-7 h-7"/>
          <span className="text-[11px] font-black uppercase tracking-widest">РОЗЫГРЫШИ</span>
        </button>
        <button onClick={() => { setActiveTab('profile'); setView('user'); }} className={`flex flex-col items-center gap-2.5 transition-all ${activeTab === 'profile' ? 'text-gold' : 'opacity-20'}`}>
          <UserCircleIcon className="w-7 h-7"/>
          <span className="text-[11px] font-black uppercase tracking-widest">ПРОФИЛЬ</span>
        </button>
      </nav>

      {/* Step Modals */}
      {step !== ContestStep.LIST && (
        <div className="fixed inset-0 z-[100] bg-matte-black flex flex-col p-8 animate-slide-up no-scrollbar overflow-y-auto">
           <button onClick={() => setStep(ContestStep.LIST)} className="absolute top-8 left-8 p-3.5 bg-soft-gray rounded-2xl border border-border-gray text-gold active:scale-90 transition-transform"><ChevronLeftIcon className="w-7 h-7"/></button>
           
           <div className="flex-1 flex flex-col justify-center items-center text-center space-y-12 py-10">
              
              {step === ContestStep.REFERRAL && (
                <div className="w-full max-w-[320px] space-y-10">
                  <div className="w-24 h-24 bg-gold/10 rounded-[48px] flex items-center justify-center border border-gold/20 mx-auto shadow-2xl">
                    <LinkIcon className="w-12 h-12 text-gold"/>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-tight">Проверка<br/>реферала</h2>
                    <p className="text-[12px] uppercase font-bold opacity-30 tracking-[0.2em] px-6">Подтвердите регистрацию на проекте {presets.find(p => p.id === selectedContest?.projectId)?.name}</p>
                  </div>
                  
                  {refError && (
                    <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl animate-shake">
                      <p className="text-[11px] font-bold text-red-500 uppercase leading-relaxed">{refError}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <button 
                      onClick={() => {
                        const project = presets.find(p => p.id === selectedContest?.projectId);
                        if (project) window.open(project.referralLink, '_blank');
                      }}
                      className="w-full py-5 bg-soft-gray text-gold border border-gold/20 font-black uppercase text-[12px] rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      <ArrowTopRightOnSquareIcon className="w-5 h-5"/>
                      Перейти на {presets.find(p => p.id === selectedContest?.projectId)?.name}
                    </button>

                    <button 
                      onClick={handleRefCheck}
                      disabled={isRefChecking}
                      className="w-full py-6 bg-gold text-matte-black font-black uppercase text-[13px] rounded-3xl shadow-[0_12px_40px_rgba(197,160,89,0.3)] active:translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                    >
                      {isRefChecking ? (
                        <>
                          <ArrowPathIcon className="w-6 h-6 animate-spin"/>
                          Идет проверка...
                        </>
                      ) : "Проверить регистрацию"}
                    </button>
                  </div>
                </div>
              )}

              {step === ContestStep.PAYOUT && (
                <div className="w-full max-w-[340px] space-y-10">
                  <h2 className="text-3xl font-black uppercase text-white tracking-tighter">Реквизиты приза</h2>
                  
                  <div className="flex gap-4">
                    <button onClick={() => setProfile({...profile, payoutType: 'card'})} className={`flex-1 py-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${profile.payoutType === 'card' ? 'bg-gold/10 border-gold text-gold' : 'bg-matte-black border-border-gray text-white/20'}`}>
                      <CreditCardIcon className="w-8 h-8"/>
                      <span className="text-[11px] font-black uppercase">Карта</span>
                    </button>
                    <button onClick={() => setProfile({...profile, payoutType: 'trc20'})} className={`flex-1 py-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${profile.payoutType === 'trc20' ? 'bg-gold/10 border-gold text-gold' : 'bg-matte-black border-border-gray text-white/20'}`}>
                      <BanknotesIcon className="w-8 h-8"/>
                      <span className="text-[11px] font-black uppercase">TRC-20</span>
                    </button>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="relative group">
                      <input 
                        placeholder={profile.payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес кошелька (TRC-20)"} 
                        value={profile.payoutValue} 
                        onChange={e => {
                          const val = profile.payoutType === 'card' ? formatCard(e.target.value) : e.target.value;
                          setProfile({...profile, payoutValue: val});
                        }}
                        className="w-full bg-soft-gray p-6 rounded-2xl border border-border-gray text-center font-mono text-gold text-sm outline-none focus:border-gold/50 shadow-inner"
                      />
                      {profile.payoutType === 'card' && getCardType(profile.payoutValue) && (
                        <div className="absolute top-1/2 -translate-y-1/2 right-5 pointer-events-none">
                           <span className="text-[10px] font-black uppercase text-gold/40 border border-gold/20 px-2 py-0.5 rounded-md">{getCardType(profile.payoutValue)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={handleFinalizeParticipation}
                    disabled={!profile.payoutValue}
                    className="w-full py-6 bg-gold text-matte-black font-black uppercase text-[14px] rounded-3xl shadow-[0_12px_40px_rgba(197,160,89,0.3)] disabled:opacity-20 active:translate-y-1 transition-all"
                  >Вступить в игру</button>
                </div>
              )}

              {step === ContestStep.TICKET_SHOW && (
                <div className="w-full max-w-[320px] space-y-14 animate-pop">
                   <div className="relative">
                      <div className="absolute inset-0 bg-gold/10 blur-[80px] rounded-full animate-pulse"></div>
                      <div className="relative bg-soft-gray border-[4px] border-gold p-14 rounded-[56px] shadow-[0_30px_70px_rgba(0,0,0,0.9)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>
                        <p className="text-[14px] font-black uppercase text-gold/60 tracking-[0.5em] mb-8">Ваш номер</p>
                        <h1 className="text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl">#{userTicket}</h1>
                        <div className="mt-10 flex justify-center gap-2 opacity-30">
                           {[...Array(7)].map((_, i) => <div key={i} className="w-2 h-2 bg-gold rounded-full"></div>)}
                        </div>
                      </div>
                   </div>
                   <div className="space-y-4">
                     <div className="flex items-center justify-center gap-2.5 text-green-500">
                       <CheckBadgeIcon className="w-6 h-6"/>
                       <p className="text-[13px] font-black uppercase">Участие принято</p>
                     </div>
                     <p className="text-[12px] font-bold text-gold uppercase tracking-[0.2em] animate-pulse">В случае выигрыша вам придёт уведомление!</p>
                   </div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-6 border-2 border-gold/30 rounded-3xl text-[12px] font-black uppercase text-gold active:bg-gold/5 transition-all">Вернуться на главную</button>
                </div>
              )}

              {step === ContestStep.SUCCESS && selectedContest?.isCompleted && (
                <div className="w-full max-w-[360px] space-y-10 animate-fade-in">
                   <div className="w-28 h-28 bg-gold/5 rounded-[50px] flex items-center justify-center border border-gold/20 mx-auto shadow-inner">
                    <TrophyIcon className="w-14 h-14 text-gold"/>
                   </div>
                   <div className="space-y-3">
                     <h2 className="text-3xl font-black uppercase text-white tracking-tight">Итоги розыгрыша</h2>
                     <p className="text-[12px] font-bold text-white/30 uppercase tracking-widest">{selectedContest.title}</p>
                   </div>
                   <div className="space-y-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                      {selectedContest.winners?.map((w, i) => {
                        const fakeCard = generateDeterministicFakeCard(w.ticketNumber);
                        return (
                          <div key={i} className="p-6 bg-soft-gray border border-border-gray rounded-[28px] flex justify-between items-center animate-slide-up group shadow-xl" style={{animationDelay: `${i * 0.15}s`}}>
                            <div className="text-left space-y-1">
                              <p className="text-[14px] font-black text-white uppercase group-active:text-gold transition-colors">Билет #{w.ticketNumber}</p>
                              <p className="text-[11px] font-bold text-gold/40 uppercase tracking-widest">Победитель</p>
                              {isAdmin && (
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(fakeCard.replace(/\s/g, ''));
                                    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
                                  }}
                                  className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase bg-gold/10 text-gold px-3 py-2 rounded-xl border border-gold/20 active:scale-95 transition-transform"
                                >
                                  <ClipboardDocumentIcon className="w-4 h-4"/>
                                  Копировать карту
                                </button>
                              )}
                            </div>
                            <div className="text-right">
                               <p className="text-lg font-black text-green-500">{convert(w.prizeWon)} {CURRENCIES[currency].symbol}</p>
                            </div>
                          </div>
                        );
                      })}
                      {(!selectedContest.winners || selectedContest.winners.length === 0) && (
                        <p className="text-center py-12 text-[13px] opacity-30 uppercase tracking-widest font-bold">Победители еще не определены</p>
                      )}
                   </div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-6 bg-gold text-matte-black font-black rounded-3xl uppercase text-[13px] shadow-2xl active:translate-y-1 transition-all">Закрыть результаты</button>
                </div>
              )}
           </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.7s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-pop { animation: pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.3); border-radius: 12px; }
      `}</style>
    </div>
  );
};

export default App;
