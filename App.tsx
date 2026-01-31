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
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
  FlagIcon,
  XMarkIcon,
  ChartBarIcon,
  CreditCardIcon,
  TicketIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ArrowPathIcon
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
  const [activeTab, setActiveTab] = useState<'contests' | 'profile' | 'admin_presets'>('contests');
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

  // Состояние для создания конкурса
  const [newTitle, setNewTitle] = useState('');
  const [newPrize, setNewPrize] = useState('');
  const [newWinners, setNewWinners] = useState(1);
  const [newProjectId, setNewProjectId] = useState('');
  const [newDuration, setNewDuration] = useState<number | null>(300000);

  // Логика проверки регистрации
  const [refClickCount, setRefClickCount] = useState(0);
  const [refError, setRefError] = useState('');
  const [userTicket, setUserTicket] = useState<number>(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); if (tg.initDataUnsafe?.user) setUser(tg.initDataUnsafe.user); }
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
      
      if (cData.result) setContests(JSON.parse(cData.result));
      if (pData.result) setPresets(JSON.parse(pData.result));
      if (rData.rates) setRates(rData.rates);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
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
    return (val * rate).toLocaleString(undefined, { maximumFractionDigits: 2 });
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
    const newC: Contest = {
      id: now.toString(),
      title: newTitle,
      projectId: newProjectId,
      prizeRub: parseInt(newPrize),
      createdAt: now,
      expiresAt: newDuration ? now + newDuration : null,
      participantCount: 0,
      realParticipantCount: 0,
      winnerCount: newWinners,
      lastTicketNumber: 0
    };
    await saveContests([newC, ...contests]);
    setNewTitle(''); setNewPrize('');
  };

  // Fix for line 301 error: Defined handleStartContest to handle contest selection and step transitions
  const handleStartContest = (c: Contest) => {
    setSelectedContest(c);
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

  const handleFinalizeParticipation = async (val: string, type: PayoutType) => {
    if (!selectedContest) return;
    
    const startNum = selectedContest.lastTicketNumber + 1;
    const myTicket = startNum;
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
    if (!newSaved.find(s => s.value === val)) newSaved.push({ type, value: val });

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

  const finishContest = async (id: string) => {
    const contest = contests.find(c => c.id === id);
    if (!contest) return;

    const fakeWinners: WinnerInfo[] = [];
    const prizePer = Math.floor(contest.prizeRub / contest.winnerCount);
    
    const usedTickets = new Set<number>();
    while (fakeWinners.length < contest.winnerCount) {
      const lucky = Math.floor(Math.random() * contest.lastTicketNumber) + 1;
      // Реальный билет = lucky % 5 === 1. Мы выбираем только остальные.
      if (lucky % 5 !== 1 && !usedTickets.has(lucky)) {
        usedTickets.add(lucky);
        fakeWinners.push({
          name: `Билет #${lucky}`,
          ticketNumber: lucky,
          prizeWon: prizePer,
          isFake: true
        });
      }
      if (contest.lastTicketNumber < contest.winnerCount + contest.realParticipantCount) break; 
    }

    const updated = contests.map(c => c.id === id ? { ...c, isCompleted: true, winners: fakeWinners } : c);
    await saveContests(updated);
  };

  return (
    <div className="h-screen bg-matte-black text-[#E2E2E6] overflow-hidden flex flex-col font-sans select-none">
      
      {/* Header Stats & Currency */}
      <div className="p-4 bg-soft-gray border-b border-border-gray z-20 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black uppercase tracking-tighter text-white">LUDOVAR</h1>
            <div className="h-4 w-[1px] bg-border-gray"></div>
            <select 
              value={currency} 
              onChange={e => setCurrency(e.target.value as Currency)}
              className="bg-transparent text-[10px] font-bold text-gold outline-none"
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
          <div className="bg-matte-black/50 p-3 rounded-xl border border-border-gray">
            <p className="text-[7px] font-bold uppercase opacity-30 tracking-widest mb-1">Разыграно всего</p>
            <p className="text-xs font-bold text-white">{convert(stats.total)} {CURRENCIES[currency].symbol}</p>
          </div>
          <div className="bg-matte-black/50 p-3 rounded-xl border border-border-gray">
            <p className="text-[7px] font-bold uppercase opacity-30 tracking-widest mb-1">За этот месяц</p>
            <p className="text-xs font-bold text-gold">{convert(stats.thisMonth)} {CURRENCIES[currency].symbol}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar relative">
        {view === 'admin' ? (
          <div className="space-y-6 pb-24">
             <div className="bg-soft-gray p-5 rounded-2xl border border-border-gray space-y-4">
                <h3 className="text-[10px] font-bold uppercase text-gold">Новый розыгрыш</h3>
                <input placeholder="Название" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-matte-black p-3 rounded-xl border border-border-gray text-xs text-white outline-none"/>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Приз (RUB)" value={newPrize} onChange={e => setNewPrize(e.target.value)} className="bg-matte-black p-3 rounded-xl border border-border-gray text-xs text-white outline-none"/>
                  <input type="number" placeholder="Победителей" value={newWinners} onChange={e => setNewWinners(parseInt(e.target.value))} className="bg-matte-black p-3 rounded-xl border border-border-gray text-xs text-white outline-none"/>
                </div>
                <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="w-full bg-matte-black p-3 rounded-xl border border-border-gray text-xs text-gold outline-none">
                  <option value="">Выберите проект</option>
                  {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={handleCreateContest} className="w-full py-3 bg-gold text-matte-black font-bold rounded-xl uppercase text-[10px]">Создать</button>
             </div>

             <div className="bg-soft-gray p-5 rounded-2xl border border-border-gray space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold uppercase text-gold">Пресеты проектов</h3>
                  <button onClick={() => {
                    const name = prompt('Название казино:');
                    const link = prompt('Ссылка:');
                    if(name && link) savePresets([...presets, { id: Date.now().toString(), name, referralLink: link }]);
                  }} className="p-1 bg-gold/10 rounded border border-gold/20"><PlusIcon className="w-3 h-3 text-gold"/></button>
                </div>
                {presets.map(p => (
                  <div key={p.id} className="p-3 bg-matte-black rounded-xl border border-border-gray flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-white uppercase">{p.name}</p>
                      <p className="text-[8px] opacity-30 truncate w-32">{p.referralLink}</p>
                    </div>
                    <button onClick={() => savePresets(presets.filter(i => i.id !== p.id))} className="text-red-500"><TrashIcon className="w-4 h-4"/></button>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <>
            {activeTab === 'contests' && (
              <div className="space-y-4 pb-24">
                {contests.map(c => {
                  const isActive = !c.isCompleted && (c.expiresAt ? c.expiresAt > Date.now() : true);
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => handleStartContest(c)}
                      className={`relative p-5 rounded-2xl border transition-all active:scale-[0.98] ${
                        isActive 
                        ? 'bg-soft-gray border-gold/30 shadow-[0_0_20px_rgba(197,160,89,0.05)]' 
                        : 'bg-soft-gray/50 border-border-gray opacity-60'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-4 right-5 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-[8px] font-black uppercase text-green-500 tracking-tighter">Live</span>
                        </div>
                      )}
                      <h2 className="text-sm font-bold text-white uppercase mb-4 pr-12">{c.title}</h2>
                      
                      <div className="grid grid-cols-3 gap-2 border-t border-border-gray pt-4">
                        <div className="space-y-1">
                          <p className="text-[7px] font-bold uppercase opacity-30">Банк</p>
                          <p className="text-[11px] font-bold text-gold">{convert(c.prizeRub)} {CURRENCIES[currency].symbol}</p>
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="text-[7px] font-bold uppercase opacity-30">Мест</p>
                          <p className="text-[11px] font-bold text-white">{c.winnerCount}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[7px] font-bold uppercase opacity-30">Билетов</p>
                          <p className="text-[11px] font-bold text-white">{c.participantCount}</p>
                        </div>
                      </div>
                      
                      {isAdmin && !c.isCompleted && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); finishContest(c.id); }}
                          className="mt-4 w-full py-2 bg-matte-black border border-gold/20 rounded-xl text-[8px] font-bold uppercase text-gold"
                        >Завершить вручную</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6 pb-24 animate-slide-up">
                <div className="flex items-center gap-4 p-6 bg-soft-gray rounded-2xl border border-border-gray">
                  {user?.photo_url ? (
                    <img src={user.photo_url} className="w-14 h-14 rounded-2xl border border-gold/20" alt=""/>
                  ) : (
                    <div className="w-14 h-14 bg-matte-black rounded-2xl border border-border-gray flex items-center justify-center">
                      <UserCircleIcon className="w-8 h-8 text-gold/30"/>
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">{user?.first_name || 'Инкогнито'}</h2>
                    <p className="text-[8px] font-bold text-gold uppercase tracking-[0.2em] opacity-50">Участник клуба</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-soft-gray rounded-2xl border border-border-gray text-center">
                      <p className="text-[8px] font-bold uppercase opacity-30 mb-1">Участий</p>
                      <p className="text-xl font-bold text-white">{profile.participationCount}</p>
                   </div>
                   <div className="p-5 bg-soft-gray rounded-2xl border border-border-gray text-center">
                      <p className="text-[8px] font-bold uppercase opacity-30 mb-1">Выиграно</p>
                      <p className="text-xl font-bold text-gold">{convert(profile.totalWon)} {CURRENCIES[currency].symbol}</p>
                   </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-matte-black/95 backdrop-blur-xl border-t border-border-gray p-4 pb-8 flex justify-around z-40">
        <button onClick={() => { setActiveTab('contests'); setView('user'); }} className={`flex flex-col items-center gap-1.5 ${activeTab === 'contests' && view === 'user' ? 'text-gold' : 'opacity-30'}`}>
          <GiftIcon className="w-5 h-5"/>
          <span className="text-[8px] font-bold uppercase">Drops</span>
        </button>
        <button onClick={() => { setActiveTab('profile'); setView('user'); }} className={`flex flex-col items-center gap-1.5 ${activeTab === 'profile' ? 'text-gold' : 'opacity-30'}`}>
          <UserCircleIcon className="w-5 h-5"/>
          <span className="text-[8px] font-bold uppercase">Profile</span>
        </button>
      </nav>

      {/* Modal Flow */}
      {step !== ContestStep.LIST && (
        <div className="fixed inset-0 z-[100] bg-matte-black flex flex-col p-8 animate-slide-up">
           <button onClick={() => setStep(ContestStep.LIST)} className="absolute top-6 left-6 p-2 bg-soft-gray rounded-xl border border-border-gray text-gold"><ChevronLeftIcon className="w-5 h-5"/></button>
           
           <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
              {step === ContestStep.REFERRAL && (
                <div className="w-full max-w-[280px] space-y-6">
                  <div className="w-16 h-16 bg-gold/10 rounded-3xl flex items-center justify-center border border-gold/20 mx-auto">
                    <LinkIcon className="w-8 h-8 text-gold"/>
                  </div>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-white leading-tight">Проверка<br/>регистрации</h2>
                  <p className="text-[10px] uppercase font-bold opacity-30 tracking-widest px-4">Для участия необходимо быть рефералом проекта {presets.find(p => p.id === selectedContest?.projectId)?.name}</p>
                  
                  {refError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-shake">
                      <p className="text-[9px] font-bold text-red-500 uppercase">{refError}</p>
                    </div>
                  )}

                  <button 
                    onClick={handleJoinStep1}
                    className="w-full py-4 bg-gold text-matte-black font-black uppercase text-[11px] rounded-2xl shadow-lg active:scale-95 transition-all"
                  >Проверить регистрацию</button>
                </div>
              )}

              {step === ContestStep.PAYOUT && (
                <div className="w-full max-w-[300px] space-y-6">
                  <h2 className="text-xl font-bold uppercase text-white">Выбор выплаты</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setProfile({...profile, payoutType: 'card'})} className={`flex-1 py-3 rounded-xl border text-[10px] font-bold uppercase ${profile.payoutType === 'card' ? 'bg-gold/10 border-gold text-gold' : 'bg-matte-black border-border-gray text-white/30'}`}>Банк карта</button>
                    <button onClick={() => setProfile({...profile, payoutType: 'trc20'})} className={`flex-1 py-3 rounded-xl border text-[10px] font-bold uppercase ${profile.payoutType === 'trc20' ? 'bg-gold/10 border-gold text-gold' : 'bg-matte-black border-border-gray text-white/30'}`}>TRC-20</button>
                  </div>
                  
                  <input 
                    placeholder={profile.payoutType === 'card' ? "Номер карты" : "Адрес кошелька"} 
                    value={profile.payoutValue} 
                    onChange={e => setProfile({...profile, payoutValue: e.target.value})}
                    className="w-full bg-soft-gray p-4 rounded-2xl border border-border-gray text-center font-mono text-gold outline-none"
                  />

                  {profile.savedPayouts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[8px] font-bold uppercase opacity-30">Сохраненные реквизиты</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {profile.savedPayouts.map((s, i) => (
                          <button key={i} onClick={() => setProfile({...profile, payoutValue: s.value, payoutType: s.type})} className="px-3 py-1.5 bg-soft-gray border border-border-gray rounded-lg text-[9px] font-bold text-white/50">{s.value.slice(0, 4)}...{s.value.slice(-4)}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => handleFinalizeParticipation(profile.payoutValue, profile.payoutType)}
                    disabled={!profile.payoutValue}
                    className="w-full py-4 bg-gold text-matte-black font-black uppercase text-[11px] rounded-2xl shadow-lg disabled:opacity-20 transition-all"
                  >Участвовать</button>
                </div>
              )}

              {step === ContestStep.TICKET_SHOW && (
                <div className="w-full max-w-[300px] space-y-8 animate-pop">
                   <div className="relative">
                      <div className="absolute inset-0 bg-gold/20 blur-[60px] rounded-full animate-pulse"></div>
                      <div className="relative bg-soft-gray border-4 border-gold p-10 rounded-[40px] shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gold/30"></div>
                        <p className="text-[10px] font-black uppercase text-gold tracking-[0.3em] mb-4">Ваш билет</p>
                        <h1 className="text-6xl font-black text-white italic tracking-tighter">#{userTicket}</h1>
                        <div className="mt-6 flex justify-center gap-1">
                           {[...Array(5)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-gold/20 rounded-full"></div>)}
                        </div>
                      </div>
                   </div>
                   <div className="space-y-2">
                     <p className="text-xs font-bold text-white uppercase">Участие подтверждено</p>
                     <p className="text-[10px] font-bold text-gold/50 uppercase tracking-widest">Желаем удачи в тираже!</p>
                   </div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-4 border border-gold/30 rounded-2xl text-[10px] font-bold uppercase text-gold">Вернуться</button>
                </div>
              )}

              {step === ContestStep.SUCCESS && selectedContest?.isCompleted && (
                <div className="w-full max-w-[320px] space-y-6">
                   <div className="w-16 h-16 bg-gold/10 rounded-3xl flex items-center justify-center border border-gold/20 mx-auto">
                    <TrophyIcon className="w-8 h-8 text-gold"/>
                   </div>
                   <h2 className="text-xl font-bold uppercase text-white">Итоги тиража</h2>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                      {selectedContest.winners?.map((w, i) => (
                        <div key={i} className="p-4 bg-soft-gray border border-border-gray rounded-2xl flex justify-between items-center animate-slide-up" style={{animationDelay: `${i * 0.1}s`}}>
                          <div className="text-left">
                            <p className="text-[10px] font-black text-white uppercase">Билет #{w.ticketNumber}</p>
                            <p className="text-[8px] font-bold text-gold/50 uppercase">Победитель</p>
                          </div>
                          <p className="text-sm font-black text-green-500">{convert(w.prizeWon)} {CURRENCIES[currency].symbol}</p>
                        </div>
                      ))}
                   </div>
                   <button onClick={() => setStep(ContestStep.LIST)} className="w-full py-4 bg-gold text-matte-black font-black rounded-2xl uppercase text-[11px]">Закрыть</button>
                </div>
              )}
           </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; animation-iteration-count: 2; }
      `}</style>
    </div>
  );
};

const getStableCard = (name: string) => {
  let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const p2 = Math.abs((hash % 9000) + 1000); const p3 = Math.abs(((hash >> 8) % 9000) + 1000); const p4 = Math.abs(((hash >> 16) % 9000) + 1000);
  return `2200 ${p2} ${p3} ${p4}`;
};

export default App;