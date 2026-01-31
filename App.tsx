
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
  BanknotesIcon
} from '@heroicons/react/24/outline';

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 

const DB_KEY = 'beef_contests_v7';
const PRESETS_KEY = 'beef_project_presets';
const ADMIN_ID = 7946967720;
const PROFILE_KEY = 'beef_user_profile_v7';

const CURRENCIES: Record<Currency, { symbol: string; label: string }> = {
  RUB: { symbol: '₽', label: 'RUB' },
  USD: { symbol: '$', label: 'USD' },
  EUR: { symbol: '€', label: 'EUR' },
  KZT: { symbol: '₸', label: 'KZT' }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contests' | 'profile'>('contests');
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [step, setStep] = useState<ContestStep>(ContestStep.LIST);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [presets, setPresets] = useState<ProjectPreset[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ payoutValue: '', payoutType: 'card', participationCount: 0, totalWon: 0, savedPayouts: [] });
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
    if (savedProfile) setProfile(JSON.parse(savedProfile));
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

      // Check for auto-expire
      const now = Date.now();
      const needsUpdate = fetchedContests.some(c => !c.isCompleted && c.expiresAt && c.expiresAt < now);
      if (needsUpdate) {
        fetchedContests.forEach(c => {
          if (!c.isCompleted && c.expiresAt && c.expiresAt < now) {
            autoFinish(c.id, fetchedContests);
          }
        });
      }

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
      // Real tickets are always (num % 5 === 1)
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
    if (c.isCompleted) {
      setStep(ContestStep.SUCCESS);
    } else {
      setStep(ContestStep.REFERRAL);
    }
  };

  const handleJoinStep1 = () => {
    const project = presets.find(p => p.id === selectedContest?.projectId);
    if (!project) return;

    if (refClickCount === 0) {
      window.open(project.referralLink, '_blank');
      setRefError('Ошибка. Проверьте реферал ли Вы, или повторите попытку через 5 секунд.');
      setRefClickCount(1);
      setTimeout(() => setRefError(''), 5000);
    } else {
      window.open(project.referralLink, '_blank');
      setStep(ContestStep.PAYOUT);
      setRefClickCount(0);
    }
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
      savedPayouts: newSaved.slice(-5) 
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
    if (timeLeft <= 0) return <span className="text-red-500 font-bold">ЗАВЕРШЕН</span>;
    const m = Math.floor(timeLeft / 60000);
    const s = Math.floor((timeLeft % 60000) / 1000);
    return <span>{m}:{s < 10 ? '0' : ''}{s}</span>;
  };

  return (
    <div className="h-screen bg-matte-black text-[#E2E2E6] overflow-hidden flex flex-col font-sans">
      
      {/* Top Header with Stats */}
      <div className="p-4 bg-soft-gray border-b border-border-gray z-30 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black uppercase tracking-tighter text-gold">LUDOVAR</h1>
            <div className="h-4 w-[1px] bg-border-gray"></div>
            <select 
              value={currency} 
              onChange={e => setCurrency(e.target.value as Currency)}
              className="bg-transparent text-[10px] font-bold text-white/50 outline-none"
            >
              {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {isAdmin && (
            <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className="p-2 bg-matte-black rounded-lg border border-gold/20">
              <ShieldCheckIcon className="w-4 h-4 text-gold"/>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-matte-black/40 p-3 rounded-xl border border-border-gray">
             <p className="text-[7px] font-bold uppercase opacity-30 tracking-[0.2em] mb-1">Всего разыграно</p>
             <p className="text-xs font-black text-white">{convert(stats.total)} {CURRENCIES[currency].symbol}</p>
          </div>
          <div className="bg-matte-black/40 p-3 rounded-xl border border-border-gray">
             <p className="text-[7px] font-bold uppercase opacity-30 tracking-[0.2em] mb-1">В этом месяце</p>
             <p className="text-xs font-black text-gold">{convert(stats.thisMonth)} {CURRENCIES[currency].symbol}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar relative">
        {view === 'admin' ? (
          <div className="space-y-6 pb-24">
             <div className="bg-soft-gray p-5 rounded-2xl border border-border-gray space-y-4">
                <h3 className="text-[10px] font-bold uppercase text-gold">Новый розыгрыш</h3>
                <div className="space-y-3">
                  <input placeholder="Название розыгрыша" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-matte-black p-4 rounded-xl border border-border-gray text-xs text-white outline-none focus:border-gold/50 transition-all"/>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Приз (RUB)" value={newPrize} onChange={e => setNewPrize(e.target.value)} className="bg-matte-black p-4 rounded-xl border border-border-gray text-xs text-white outline-none focus:border-gold/50 transition-all"/>
                    <input type="number" placeholder="Победителей" value={newWinners} onChange={e => setNewWinners(e.target.value)} className="bg-matte-black p-4 rounded-xl border border-border-gray text-xs text-white outline-none focus:border-gold/50 transition-all"/>
                  </div>
                  <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="w-full bg-matte-black p-4 rounded-xl border border-border-gray text-xs text-gold outline-none">
                    <option value="">Выберите пресет казино</option>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={newDuration} onChange={e => setNewDuration(e.target.value)} className="w-full bg-matte-black p-4 rounded-xl border border-border-gray text-xs text-white/50 outline-none">
                    <option value="300000">5 минут</option>
                    <option value="600000">10 минут</option>
                    <option value="1800000">30 минут</option>
                    <option value="3600000">1 час</option>
                    <option value="10800000">3 часа</option>
                    <option value="21600000">6 часов</option>
                    <option value="43200000">12 часов</option>
                    <option value="86400000">24 часа</option>
                    <option value="">Вручную</option>
                  </select>
                </div>
                <button onClick={handleCreateContest} className="w-full py-4 bg-gold text-matte-black font-black rounded-xl uppercase text-[10px] active:scale-95 transition-all">Опубликовать</button>
             </div>

             <div className="bg-soft-gray p-5 rounded-2xl border border-border-gray space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold uppercase text-gold">Управление пресетами</h3>
                  <button onClick={() => {
                    const name = prompt('Название казино:');
                    const link = prompt('Ссылка регистрации:');
                    if(name && link) savePresets([...presets, { id: Date.now().toString(), name, referralLink: link }]);
                  }} className="p-2 bg-gold/10 rounded-lg border border-gold/20"><PlusIcon className="w-4 h-4 text-gold"/></button>
                </div>
                <div className="space-y-2">
                  {presets.map(p => (
                    <div key={p.id} className="p-4 bg-matte-black rounded-xl border border-border-gray flex justify-between items-center group">
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-white uppercase truncate">{p.name}</p>
                        <p className="text-[8px] opacity-30 truncate w-40">{p.referralLink}</p>
                      </div>
                      <button onClick={() => savePresets(presets.filter(i => i.id !== p.id))} className="text-red-500 opacity-50 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                  ))}
                  {presets.length === 0 && <p className="text-center py-4 text-[9px] opacity-20 uppercase">Пресеты отсутствуют</p>}
                </div>
             </div>
          </div>
        ) : (
          <>
            {activeTab === 'contests' && (
              <div className="space-y-4 pb-24">
                {contests.length === 0 && (
                  <div className="flex flex-col items-center py-20 opacity-20">
                    <GiftIcon className="w-12 h-12 mb-2"/>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Нет доступных розыгрышей</p>
                  </div>
                )}
                {contests.map(c => {
                  const isActive = !c.isCompleted && (c.expiresAt ? c.expiresAt > Date.now() : true);
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => handleStartContest(c)}
                      className={`relative p-6 rounded-3xl border transition-all active:scale-[0.98] group overflow-hidden ${
                        isActive 
                        ? 'bg-soft-gray border-gold/40 shadow-[0_0_25px_rgba(197,160,89,0.08)] ring-1 ring-gold/10' 
                        : 'bg-soft-gray/50 border-border-gray opacity-60'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-gold/5 blur-3xl rounded-full"></div>
                      )}
                      
                      <div className="flex justify-between items-start mb-6">
                        <h2 className="text-base font-black text-white uppercase tracking-tight leading-tight pr-10">{c.title}</h2>
                        {isActive ? (
                          <div className="px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center gap-1.5 shrink-0">
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-[8px] font-black uppercase text-green-500">LIVE</span>
                          </div>
                        ) : (
                          <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 shrink-0">
                            <span className="text-[8px] font-black uppercase text-white/30">АРХИВ</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-border-gray pt-6">
                        <div className="space-y-1">
                          <p className="text-[7px] font-black uppercase opacity-20 tracking-widest">Банк</p>
                          <p className="text-sm font-black text-gold">{convert(c.prizeRub)} {CURRENCIES[currency].symbol}</p>
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-[7px] font-black uppercase opacity-20 tracking-widest">Мест</p>
                          <p className="text-sm font-black text-white">{c.winnerCount}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[7px] font-black uppercase opacity-20 tracking-widest">Билетов</p>
                          <p className="text-sm font-black text-white">{c.participantCount}</p>
                        </div>
                      </div>

                      {isActive && c.expiresAt && (
                        <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-white/40 uppercase">
                          <ClockIcon className="w-3.5 h-3.5 text-gold/60"/>
                          До завершения: <Countdown expiresAt={c.expiresAt}/>
                        </div>
                      )}

                      {isAdmin && !c.isCompleted && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); finishContestManually(c.id); }}
                          className="mt-6 w-full py-3 bg-matte-black/50 border border-gold/20 rounded-xl text-[8px] font-bold uppercase text-gold hover:bg-gold/10 transition-colors"
                        >Завершить вручную</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6 pb-24 animate-slide-up">
                <div className="flex items-center gap-5 p-7 bg-soft-gray rounded-3xl border border-border-gray shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-gold/5 blur-3xl rounded-full"></div>
                  {user?.photo_url ? (
                    <img src={user.photo_url} className="w-16 h-16 rounded-2xl border-2 border-gold/20 shadow-xl" alt=""/>
                  ) : (
                    <div className="w-16 h-16 bg-matte-black rounded-2xl border border-border-gray flex items-center justify-center shadow-inner">
                      <UserCircleIcon className="w-10 h-10 text-gold/20"/>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase">{user?.first_name || 'Инкогнито'}</h2>
                    <p className="text-[9px] font-black text-gold uppercase tracking-[0.3em] opacity-40">Privileged Member</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 bg-soft-gray rounded-3xl border border-border-gray text-center shadow-lg group">
                      <p className="text-[8px] font-black uppercase opacity-20 mb-2 tracking-widest">Участий</p>
                      <p className="text-2xl font-black text-white group-active:scale-110 transition-transform">{profile.participationCount}</p>
                   </div>
                   <div className="p-6 bg-soft-gray rounded-3xl border border-border-gray text-center shadow-lg group">
                      <p className="text-[8px] font-black uppercase opacity-20 mb-2 tracking-widest">Выиграно</p>
                      <p className="text-2xl font-black text-gold group-active:scale-110 transition-transform">{convert(profile.totalWon)} {CURRENCIES[currency].symbol}</p>
                   </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-matte-black/95 backdrop-blur-2xl border-t border-border-gray p-4 pb-10 flex justify-around z-50">
        <button onClick={() => { setActiveTab('contests'); setView('user'); }} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'contests' && view === 'user' ? 'text-gold' : 'opacity-20'}`}>
          <GiftIcon className="w-6 h-6"/>
          <span className="text-[9px] font-black uppercase tracking-widest">Drops</span>
        </button>
        <button onClick={() => { setActiveTab('profile'); setView('user'); }} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'profile' ? 'text-gold' : 'opacity-20'}`}>
          <UserCircleIcon className="w-6 h-6"/>
          <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
        </button>
      </nav>

      {/* Step Modals */}
      {step !== ContestStep.LIST && (
        <div className="fixed inset-0 z-[100] bg-matte-black flex flex-col p-8 animate-slide-up no-scrollbar overflow-y-auto">
           <button onClick={() => setStep(ContestStep.LIST)} className="absolute top-6 left-6 p-3 bg-soft-gray rounded-2xl border border-border-gray text-gold active:scale-90 transition-transform"><ChevronLeftIcon className="w-6 h-6"/></button>
           
           <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10 py-10">
              {step === ContestStep.REFERRAL && (
                <div className="w-full max-w-[300px] space-y-8">
                  <div className="w-20 h-20 bg-gold/10 rounded-[40px] flex items-center justify-center border border-gold/20 mx-auto shadow-2xl animate-pulse">
                    <LinkIcon className="w-10 h-10 text-gold"/>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">Проверка<br/>реферала</h2>
                    <p className="text-[10px] uppercase font-bold opacity-30 tracking-[0.2em] px-6">Для входа необходимо быть рефералом казино {presets.find(p => p.id === selectedContest?.projectId)?.name}</p>
                  </div>
                  
                  {refError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-shake">
                      <p className="text-[10px] font-bold text-red-500 uppercase leading-relaxed">{refError}</p>
                    </div>
                  )}

                  <button 
                    onClick={handleJoinStep1}
                    className="w-full py-5 bg-gold text-matte-black font-black uppercase text-[12px] rounded-3xl shadow-[0_10px_30px_rgba(197,160,89,0.3)] active:translate-y-1 transition-all"
                  >Проверить регистрацию</button>
                </div>
              )}

              {step === ContestStep.PAYOUT && (
                <div className="w-full max-w-[320px] space-y-8">
                  <h2 className="text-2xl font-black uppercase text-white tracking-tighter">Реквизиты приза</h2>
                  
                  <div className="flex gap-3">
                    <button onClick={() => setProfile({...profile, payoutType: 'card'})} className={`flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${profile.payoutType === 'card' ? 'bg-gold/10 border-gold text-gold' : 'bg-matte-black border-border-gray text-white/20'}`}>
                      <CreditCardIcon className="w-6 h-6"/>
                      <span className="text-[10px] font-black uppercase">Карта</span>
                    </button>
                    <button onClick={() => setProfile({...profile, payoutType: 'trc20'})} className={`flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${profile.payoutType === 'trc20' ? 'bg-gold/10 border-gold text-gold' : 'bg-matte-black border-border-gray text-white/20'}`}>
                      <BanknotesIcon className="w-6 h-6"/>
                      <span className="text-[10px] font-black uppercase">TRC-20</span>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <input 
                      placeholder={profile.payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес кошелька (TRC-20)"} 
                      value={profile.payoutValue} 
                      onChange={e => setProfile({...profile, payoutValue: e.target.value})}
                      className="w-full bg-soft-gray p-5 rounded-2xl border border-border-gray text-center font-mono text-gold outline-none focus:border-gold/50 shadow-inner"
                    />

                    {profile.savedPayouts.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[8px] font-black uppercase opacity-20 tracking-widest text-left ml-2">Быстрый выбор</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.savedPayouts.map((s, i) => (
                            <button key={i} onClick={() => setProfile({...profile, payoutValue: s.value, payoutType: s.type})} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-bold text-white/40 hover:text-gold transition-colors">{s.value.slice(0, 6)}...{s.value.slice(-4)}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleFinalizeParticipation}
                    disabled={!profile.payoutValue}
                    className="w-full py-5 bg-gold text-matte-black font-black uppercase text-[12px] rounded-3xl shadow-[0_10px_30px_rgba(197,160,89,0.3)] disabled:opacity-20 active:translate-y-1 transition-all"
                  >Вступить в игру</button>
                </div>
              )}

              {step === ContestStep.TICKET_SHOW && (
                <div className="w-full max-w-[300px] space-y-12 animate-pop">
                   <div className="relative">
                      <div className="absolute inset-0 bg-gold/10 blur-[80px] rounded-full animate-pulse"></div>
                      <div className="relative bg-soft-gray border-[3px] border-gold p-12 rounded-[50px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>
                        <p className="text-[12px] font-black uppercase text-gold/60 tracking-[0.5em] mb-6">Ваш номер</p>
                        <h1 className="text-7xl font-black text-white italic tracking-tighter drop-shadow-2xl">#{userTicket}</h1>
                        <div className="mt-8 flex justify-center gap-1.5 opacity-30">
                           {[...Array(7)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-gold rounded-full"></div>)}
                        </div>
                      </div>
                   </div>
                   <div className="space-y-3">
                     <div className="flex items-center justify-center gap-2 text-green-500">
                       <CheckBadgeIcon className="w-5 h-5"/>
                       <p className="text-sm font-black uppercase">Участие принято</p>
                     </div>
                     <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] leading-relaxed">Система сгенерировала фейк билеты<br/>для заполнения тиража</p>
                   </div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-5 border-2 border-gold/30 rounded-3xl text-[11px] font-black uppercase text-gold active:bg-gold/5 transition-all">Вернуться на главную</button>
                </div>
              )}

              {step === ContestStep.SUCCESS && selectedContest?.isCompleted && (
                <div className="w-full max-w-[340px] space-y-8 animate-fade-in">
                   <div className="w-24 h-24 bg-gold/5 rounded-[45px] flex items-center justify-center border border-gold/20 mx-auto shadow-inner">
                    <TrophyIcon className="w-12 h-12 text-gold"/>
                   </div>
                   <div className="space-y-2">
                     <h2 className="text-2xl font-black uppercase text-white tracking-tight">Итоги розыгрыша</h2>
                     <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{selectedContest.title}</p>
                   </div>
                   <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedContest.winners?.map((w, i) => (
                        <div key={i} className="p-5 bg-soft-gray border border-border-gray rounded-[24px] flex justify-between items-center animate-slide-up group" style={{animationDelay: `${i * 0.15}s`}}>
                          <div className="text-left">
                            <p className="text-[12px] font-black text-white uppercase group-active:text-gold transition-colors">Билет #{w.ticketNumber}</p>
                            <p className="text-[9px] font-bold text-gold/40 uppercase tracking-widest">Победитель</p>
                          </div>
                          <div className="text-right">
                             <p className="text-base font-black text-green-500">{convert(w.prizeWon)} {CURRENCIES[currency].symbol}</p>
                          </div>
                        </div>
                      ))}
                      {(!selectedContest.winners || selectedContest.winners.length === 0) && (
                        <p className="text-center py-10 text-[10px] opacity-20 uppercase tracking-widest">Победители еще не определены</p>
                      )}
                   </div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-5 bg-gold text-matte-black font-black rounded-3xl uppercase text-[12px] shadow-xl">Закрыть</button>
                </div>
              )}
           </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-pop { animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-shake { animation: shake 0.35s ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
