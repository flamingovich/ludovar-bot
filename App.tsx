
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TelegramUser, ContestStep, PayoutType, Contest, WinnerInfo } from './types';
import { 
  CheckBadgeIcon, 
  CreditCardIcon, 
  CurrencyDollarIcon, 
  ArrowRightIcon,
  LinkIcon,
  ClockIcon,
  TrashIcon,
  TrophyIcon,
  ChevronLeftIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  SignalIcon,
  UsersIcon,
  FlagIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
  StarIcon,
  CalendarIcon,
  WalletIcon
} from '@heroicons/react/24/outline';

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 

const DB_KEY = 'beef_contests_v5';
const ADMIN_ID = 7946967720;
const PARTICIPATION_KEY = 'beef_user_participations_v7';

const EMOJIS = ["🔥", "⚡️", "💎", "🎯", "🚀", "👑", "🍀", "🕶", "🌪", "🧊"];
const BASE_NAMES = [
  "Иван", "vasyan45", "GREG77rus", "калываныч", "Slayer_99", "Elena_Sweet", "Dmitry VIP", "Alexey_K", "Marinka_01", "Sergant",
  "Олег_Б", "Антон Палыч", "Viktoria_Secret", "Denis_Rider", "Artem_Volk", "Kirill_Off", "Svetlana_M", "Igoryan", "Roma_King",
  "Zhenya_T", "Pavel_777", "Natasha_Rich", "Maxim_Strong", "Yulia_Star", "Andrey_O", "Ilya_Boss", "Dasha_X", "Katya_V", "Stepan",
  "Vanya_Tractor", "Lerochka", "Mikhail_R", "Stanislav", "Yarik_007", "Tanya_Beauty", "Arina_G", "Pasha_Techno", "Serega_Best",
  "Anya_Fox", "Ruslan_M", "Vadim_K", "Grisha", "Fedya_F", "Oksana_L", "Liza_M", "Timur_E", "Artur_S", "Egor_B", "Kolyan",
  "Санёк", "Димон", "Лёха", "Танюха", "Натаха", "Иришка", "Серый", "Андрюха", "Виталик", "Марик", "Стас", "Костян", "Юрец"
];

const enhanceName = (name: string) => {
  let final = name;
  if (Math.random() < 0.3) final += " " + EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const isPremium = Math.random() < 0.15;
  return { name: final, isPremium };
};

const generateProfileStats = () => {
  const start = new Date(2025, 8, 1).getTime(); // Sept 2025
  const end = Date.now();
  const date = new Date(start + Math.random() * (end - start));
  const hasDeposit = Math.random() < 0.6;
  const deposit = hasDeposit ? Math.floor(500 + Math.random() * 149500) : 0;
  return {
    registeredAt: date.toLocaleDateString('ru-RU'),
    depositAmount: deposit
  };
};

const generateFakePayout = (type: PayoutType) => {
  if (type === 'card') {
    const bins = ['4432', '5106', '2200', '4276'];
    const bin = bins[Math.floor(Math.random() * bins.length)];
    const rest = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    return bin + rest;
  }
  return "TR7NHqSjuxTsPop" + Array.from({ length: 20 }, () => "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36))).join('');
};

const App: React.FC = () => {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [step, setStep] = useState<ContestStep>(ContestStep.LIST);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [participatedIds, setParticipatedIds] = useState<string[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [usdRate, setUsdRate] = useState<number>(0.011); 
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'none'>('none');

  // User States
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutType, setPayoutType] = useState<PayoutType>('card');
  const [payoutValue, setPayoutValue] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Admin States
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrizeRub, setNewPrizeRub] = useState<string>('');
  const [newWinnerCount, setNewWinnerCount] = useState<number>(1);
  const [adminSelectedContest, setAdminSelectedContest] = useState<Contest | null>(null);
  const [realParticipants, setRealParticipants] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Roulette States
  const [isRolling, setIsRolling] = useState(false);
  const [rollWinners, setRollWinners] = useState<WinnerInfo[]>([]);
  const [rollNames, setRollNames] = useState<string[]>([]);

  const fetchContests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${DB_KEY}`, {
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
      });
      const data = await res.json();
      if (data.result) {
        setContests(JSON.parse(data.result));
      }
      setDbStatus('connected');
    } catch (e) {
      setDbStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveContestsGlobal = async (updated: Contest[]) => {
    setContests(updated);
    try {
      await fetch(`${KV_REST_API_URL}/set/${DB_KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
        body: JSON.stringify(updated)
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready(); tg.expand();
      if (tg.initDataUnsafe?.user) setUser(tg.initDataUnsafe.user);
    }
    fetchContests();
    const p = localStorage.getItem(PARTICIPATION_KEY);
    if (p) setParticipatedIds(JSON.parse(p));
  }, []);

  const isAdmin = useMemo(() => user?.id === ADMIN_ID, [user]);

  const createContest = async () => {
    if (!newTitle || !newPrizeRub) return;
    const rub = parseFloat(newPrizeRub);
    const contest: Contest = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      description: newDesc,
      prizeRub: rub,
      prizeUsd: Math.round(rub * 0.011),
      referralLink: 'https://beef-way-one.com/c22082169',
      createdAt: Date.now(),
      participantCount: 0,
      winnerCount: newWinnerCount || 1
    };
    await saveContestsGlobal([contest, ...contests]);
    setNewTitle(''); setNewDesc(''); setNewPrizeRub(''); setNewWinnerCount(1);
    setView('user');
  };

  const deleteContest = async (id: string) => {
    await saveContestsGlobal(contests.filter(c => c.id !== id));
  };

  const drawWinners = async (contestId: string) => {
    setIsRolling(true);
    // Generate names for roulette
    const rNames = Array.from({ length: 50 }, () => {
      const { name } = enhanceName(BASE_NAMES[Math.floor(Math.random() * BASE_NAMES.length)]);
      return name;
    });
    setRollNames(rNames);

    await fetchParticipantsForAdmin(contestId);
    
    setTimeout(async () => {
      const contest = contests.find(c => c.id === contestId)!;
      const count = contest.winnerCount || 1;
      
      const pool = realParticipants.length > 0 ? realParticipants : Array.from({length: 20}, () => ({
        name: enhanceName(BASE_NAMES[Math.floor(Math.random() * BASE_NAMES.length)]).name,
        payout: generateFakePayout('card'),
        type: 'card'
      }));

      const winners: WinnerInfo[] = [];
      for(let i=0; i<count; i++) {
        const win = pool[Math.floor(Math.random() * pool.length)];
        const stats = generateProfileStats();
        winners.push({
          name: win.name,
          payoutValue: win.payout,
          payoutType: win.type,
          ...stats
        });
      }

      const updated = contests.map(c => 
        c.id === contestId ? { ...c, isCompleted: true, winners } : c
      );
      await saveContestsGlobal(updated);
      setRollWinners(winners);
      setIsRolling(false);
      setAdminSelectedContest(updated.find(c => c.id === contestId)!);
    }, 4000);
  };

  const fetchParticipantsForAdmin = async (contestId: string) => {
    const key = `participants_${contestId}`;
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
      });
      const data = await res.json();
      if (data.result) setRealParticipants(JSON.parse(data.result));
      else setRealParticipants([]);
    } catch (e) { console.error(e); }
  };

  const registerParticipant = async (contestId: string, payout: string, type: PayoutType) => {
    const botCount = Math.floor(Math.random() * 3) + 1;
    const bots = Array.from({ length: botCount }, () => ({
      id: Math.random(),
      name: enhanceName(BASE_NAMES[Math.floor(Math.random() * BASE_NAMES.length)]).name,
      payout: generateFakePayout(Math.random() > 0.5 ? 'card' : 'trc20'),
      type: (Math.random() > 0.5 ? 'card' : 'trc20'),
      isBot: true
    }));

    const key = `participants_${contestId}`;
    const res = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    });
    const data = await res.json();
    const existing = data.result ? JSON.parse(data.result) : [];
    
    const updated = [...existing, { id: user?.id || Date.now(), name: user?.first_name || 'User', payout, type, isBot: false }, ...bots];
    await fetch(`${KV_REST_API_URL}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
      body: JSON.stringify(updated)
    });

    const contestsUpdated = contests.map(c => 
      c.id === contestId ? { ...c, participantCount: (c.participantCount || 0) + 1 + botCount } : c
    );
    saveContestsGlobal(contestsUpdated);
  };

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 16);
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
  };

  const handlePayoutInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (payoutType === 'card') setPayoutValue(formatCard(e.target.value));
    else setPayoutValue(e.target.value);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  return (
    <div className="h-screen bg-[#f8f9fc] dark:bg-[#0c0d10] text-[#1a1c1e] dark:text-[#e2e2e6] overflow-hidden font-sans select-none flex flex-col">
      {view === 'admin' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-slide-up bg-white dark:bg-[#0c0d10]">
          <header className="flex items-center justify-between pb-4">
            <h1 className="text-xl font-bold dark:text-white">Админка</h1>
            <button onClick={() => setView('user')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold active:scale-95 transition-all">На главную</button>
          </header>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
            <h2 className="text-[10px] font-black uppercase opacity-30 px-1">Создать конкурс</h2>
            <input placeholder="Название" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Приз ₽" value={newPrizeRub} onChange={e => setNewPrizeRub(e.target.value)} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-blue-600" />
              <div className="relative">
                <input type="number" placeholder="Победителей" value={newWinnerCount} onChange={e => setNewWinnerCount(parseInt(e.target.value))} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-center" />
                <span className="absolute -top-2 left-3 bg-slate-50 dark:bg-slate-900 px-1 text-[8px] font-black uppercase opacity-40">Победителей</span>
              </div>
            </div>
            <button onClick={createContest} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold active:scale-95 transition-all">Создать</button>
          </div>

          <div className="space-y-3 pb-20">
            <h2 className="text-[10px] font-black uppercase opacity-30 px-1">Розыгрыши</h2>
            {contests.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold truncate text-sm">{c.title}</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase">{c.prizeRub.toLocaleString()} ₽ • {c.participantCount || 0} участников</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setAdminSelectedContest(c); fetchParticipantsForAdmin(c.id); }} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl"><UsersIcon className="w-5 h-5"/></button>
                    <button onClick={() => deleteContest(c.id)} className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl"><TrashIcon className="w-5 h-5 text-red-500"/></button>
                  </div>
                </div>
                {!c.isCompleted && (
                  <button onClick={() => drawWinners(c.id)} className="w-full py-2.5 bg-green-500/10 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-500/20">Выбрать победителей</button>
                )}
                {c.isCompleted && (
                  <button onClick={() => { setAdminSelectedContest(c); fetchParticipantsForAdmin(c.id); }} className="w-full py-2.5 bg-blue-500/10 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20">Посмотреть победителей</button>
                )}
              </div>
            ))}
          </div>

          {/* Admin Modal */}
          {adminSelectedContest && (
            <div className="fixed inset-0 z-[200] bg-black/80 flex items-end animate-fade-in backdrop-blur-sm">
              <div className="bg-white dark:bg-[#121418] w-full rounded-t-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black">{adminSelectedContest.title}</h2>
                    <p className="text-[10px] uppercase font-bold opacity-40">Результаты</p>
                  </div>
                  <button onClick={() => setAdminSelectedContest(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronLeftIcon className="w-6 h-6 rotate-90"/></button>
                </div>

                {adminSelectedContest.winners && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-2"><TrophyIcon className="w-4 h-4"/> Победители</h3>
                    {adminSelectedContest.winners.map((w, i) => (
                      <div key={i} className="p-5 bg-green-500/5 border border-green-500/10 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-lg">{w.name}</span>
                          <span className="text-[9px] font-black bg-green-500 text-white px-2 py-0.5 rounded uppercase">Win</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[8px] opacity-40 font-bold uppercase mb-0.5">Рега</p>
                            <p className="text-[10px] font-bold">{w.registeredAt}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[8px] opacity-40 font-bold uppercase mb-0.5">Деп</p>
                            <p className="text-[10px] font-bold text-blue-600">{w.depositAmount?.toLocaleString()} ₽</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl">
                          <p className="font-mono text-xs opacity-50 truncate mr-2">{w.payoutValue}</p>
                          <button onClick={() => copyToClipboard(w.payoutValue, `w-${i}`)} className="p-2 bg-blue-600 text-white rounded-lg active:scale-90 transition-all">
                            {copiedId === `w-${i}` ? <ClipboardDocumentCheckIcon className="w-4 h-4"/> : <ClipboardIcon className="w-4 h-4"/>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30 px-2">Участники ({realParticipants.length})</h3>
                   <div className="space-y-2">
                     {realParticipants.map((p, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <span className="text-sm font-bold">{p.name}</span>
                          <span className="text-[9px] opacity-30 font-mono">{p.payout.slice(0, 8)}...</span>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* Roulette Overlay */}
          {isRolling && (
            <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-8 space-y-10">
              <div className="text-center space-y-2 animate-pulse">
                <h2 className="text-3xl font-black text-white tracking-tighter italic">BEEF ROULETTE</h2>
                <p className="text-xs font-black text-blue-500 tracking-[0.4em] uppercase">Selecting Winners...</p>
              </div>
              <div className="relative w-full max-w-[320px] overflow-hidden rounded-3xl border-2 border-white/10 h-24 bg-slate-900 flex items-center">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-blue-600 z-10 shadow-[0_0_20px_#2563eb]"></div>
                <div className="flex animate-roulette-scroll space-x-4 whitespace-nowrap pl-40">
                  {rollNames.map((name, i) => (
                    <div key={i} className="px-6 py-2 bg-slate-800 rounded-xl text-white font-bold border border-white/5">{name}</div>
                  ))}
                </div>
              </div>
              <div className="w-16 h-16 border-4 border-t-blue-600 border-white/10 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {step === ContestStep.LIST && (
            <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-fade-in pb-20">
              <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg text-white"><TrophyIcon className="w-7 h-7"/></div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight leading-none">Beef Contest</h1>
                    <p className="text-[9px] font-black text-blue-500 tracking-widest mt-1 uppercase">Live Pools</p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => setView('admin')} className="p-3 bg-white dark:bg-slate-900 border rounded-2xl active:scale-90 transition-all"><ShieldCheckIcon className="w-6 h-6 text-blue-600"/></button>
                )}
              </header>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center opacity-20 gap-3">
                    <div className="w-8 h-8 border-2 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-[9px] font-black uppercase">Loading...</p>
                  </div>
                ) : contests.length === 0 ? (
                  <div className="text-center py-20 opacity-20"><SignalIcon className="w-12 h-12 mx-auto mb-4 animate-pulse"/><p className="text-sm italic">Розыгрышей пока нет</p></div>
                ) : (
                  contests.map(c => {
                    const joined = participatedIds.includes(c.id);
                    return (
                      <div key={c.id} onClick={() => { setSelectedContest(c); setStep(joined || c.isCompleted ? ContestStep.SUCCESS : ContestStep.REFERRAL); }} className="relative bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all">
                        {c.isCompleted ? (
                          <div className="absolute top-0 right-0 bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-2xl opacity-50">Завершен</div>
                        ) : joined ? (
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-2xl">В игре</div>
                        ) : null}
                        <h3 className="text-lg font-bold mb-3 pr-10 leading-tight">{c.title}</h3>
                        <div className="flex gap-2">
                          <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 font-black text-sm">{c.prizeRub.toLocaleString()} ₽</div>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <UsersIcon className="w-3.5 h-3.5 opacity-30"/><span className="text-[10px] font-black opacity-60">{c.participantCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {step === ContestStep.REFERRAL && (
            <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-8 animate-slide-up">
              <div className="relative w-28 h-28 bg-blue-600/5 rounded-full flex items-center justify-center">
                <LinkIcon className="w-14 h-14 text-blue-600"/>
                <div className="absolute bottom-2 right-2 bg-blue-600 p-1.5 rounded-xl border-4 border-white dark:border-[#0c0d10] shadow-xl"><CheckBadgeIcon className="w-4 h-4 text-white"/></div>
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tighter leading-none">{selectedContest?.prizeRub.toLocaleString()}</h1>
                <p className="text-sm opacity-50 px-8 font-medium">Нужен активный аккаунт Beef, зарегистрированный по нашей ссылке</p>
              </div>
              <div className="w-full max-w-[300px] flex flex-col gap-3">
                <a href={selectedContest?.referralLink} target="_blank" className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-bold text-lg shadow-xl shadow-blue-600/20 active:scale-[0.96] transition-all">Зарегистрироваться</a>
                <button onClick={() => { setIsChecking(true); setError(null); setTimeout(() => { setIsChecking(false); if(checkAttempts >= 1) setStep(ContestStep.PAYOUT); else { setCheckAttempts(1); setError("Аккаунт не найден. Проверьте регистрацию."); } }, 2000); }} className="w-full py-4 border-2 border-slate-200 dark:border-slate-800 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest active:bg-slate-50 transition-all flex items-center justify-center gap-2">
                   {isChecking ? <ClockIcon className="w-5 h-5 animate-spin"/> : "Проверить аккаунт"}
                </button>
              </div>
              {error && <p className="text-red-500 font-bold text-xs animate-shake">{error}</p>}
              <button onClick={() => setStep(ContestStep.LIST)} className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] active:opacity-60 transition-opacity">Назад</button>
            </div>
          )}

          {step === ContestStep.PAYOUT && (
            <div className="flex-1 p-8 flex flex-col animate-slide-up">
              <div className="flex-1 flex flex-col justify-center space-y-10">
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-black uppercase tracking-tight">Выплата</h1>
                  <p className="text-xs opacity-50 font-medium leading-relaxed">Укажите данные для отправки приза<br/>в случае вашей победы</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl flex border border-slate-200 dark:border-slate-800">
                  <button onClick={() => { setPayoutType('card'); setPayoutValue(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${payoutType === 'card' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'opacity-30'}`}>Карта</button>
                  <button onClick={() => { setPayoutType('trc20'); setPayoutValue(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${payoutType === 'trc20' ? 'bg-white dark:bg-slate-800 shadow-md text-green-600' : 'opacity-30'}`}>TRC20</button>
                </div>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20"><CreditCardIcon className="w-6 h-6"/></div>
                  <input placeholder={payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес TRC20"} value={payoutValue} onChange={handlePayoutInput} className="w-full py-5 pl-14 pr-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-mono outline-none shadow-sm" />
                </div>
              </div>
              <button onClick={() => setStep(ContestStep.FINAL)} disabled={payoutValue.length < 8} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg active:scale-95 transition-all mb-6 disabled:opacity-20">Продолжить</button>
            </div>
          )}

          {step === ContestStep.FINAL && (
            <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-10 animate-slide-up">
              <div className="w-24 h-24 bg-green-500/5 rounded-3xl flex items-center justify-center border-2 border-green-500/10 shadow-lg"><FlagIcon className="w-10 h-10 text-green-500"/></div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Подтверждаем?</h1>
              <div className="w-full p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-inner">
                 <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Реквизиты</p>
                 <p className="font-mono text-base font-bold break-all opacity-80">{payoutValue}</p>
                 <p className="text-[10px] font-black text-blue-600 mt-2 uppercase">{payoutType === 'card' ? 'Bank Card' : 'USDT TRC20'}</p>
              </div>
              <button onClick={() => { setIsFinalizing(true); setTimeout(() => { if(selectedContest) { const n = [...participatedIds, selectedContest.id]; setParticipatedIds(n); localStorage.setItem(PARTICIPATION_KEY, JSON.stringify(n)); registerParticipant(selectedContest.id, payoutValue, payoutType); } setIsFinalizing(false); setStep(ContestStep.SUCCESS); }, 1500); }} disabled={isFinalizing} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-bold text-xl shadow-2xl active:scale-95 transition-all">
                {isFinalizing ? <ClockIcon className="w-7 h-7 animate-spin"/> : "Участвовать"}
              </button>
            </div>
          )}

          {step === ContestStep.SUCCESS && (
            <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-12 animate-fade-in">
              {selectedContest?.isCompleted ? (
                <>
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-600/10 blur-[60px] animate-pulse rounded-full"></div>
                    <TrophyIcon className="w-24 h-24 text-blue-600 relative z-10"/>
                  </div>
                  <div className="space-y-4 w-full">
                    <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Розыгрыш<br/>Завершен</h1>
                    <div className="space-y-2 mt-6">
                       <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Победители</p>
                       <div className="flex flex-col gap-2">
                         {selectedContest.winners?.map((w, idx) => (
                           <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <span className="font-black text-blue-600 text-lg">{w.name}</span>
                               {Math.random() < 0.2 && <StarIcon className="w-4 h-4 text-blue-400 fill-blue-400"/>}
                             </div>
                             <div className="text-right">
                               <div className="flex items-center gap-1 text-[8px] font-black opacity-30 uppercase"><WalletIcon className="w-2 h-2"/> {w.depositAmount?.toLocaleString()} ₽</div>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative w-40 h-40 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/20 border-8 border-white dark:border-[#0c0d10]">
                    <CheckBadgeIcon className="w-24 h-24 text-white"/>
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tighter uppercase">Вы в игре!</h1>
                    <p className="text-sm opacity-50 px-8 font-medium">Ваша заявка принята. Итоги будут опубликованы в канале.</p>
                  </div>
                </>
              )}
              <button onClick={() => setStep(ContestStep.LIST)} className="flex items-center gap-2 py-4 px-10 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[11px] font-black uppercase shadow-sm active:scale-95 transition-all">
                <ChevronLeftIcon className="w-5 h-5"/> К списку
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes roulette { from { transform: translateX(0); } to { transform: translateX(-3000px); } }
        .animate-roulette-scroll { animation: roulette 4s cubic-bezier(0.12, 0.8, 0.35, 1) forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.3s ease-in-out 3; }
      `}</style>
    </div>
  );
};

export default App;
