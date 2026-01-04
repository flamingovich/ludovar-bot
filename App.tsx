
import React, { useState, useEffect, useMemo } from 'react';
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
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 

const DB_KEY = 'beef_contests_v4';
const ADMIN_ID = 7946967720;
const PARTICIPATION_KEY = 'beef_user_participations_v6';

const AUTHENTIC_NAMES = [
  "Иван", "vasyan45", "GREG77rus", "калываныч", "Slayer_99", "Elena_Sweet", "Dmitry VIP", "Alexey_K", "Marinka_01", "Sergant",
  "Олег_Б", "Антон Палыч", "Viktoria_Secret", "Denis_Rider", "Artem_Volk", "Kirill_Off", "Svetlana_M", "Igoryan", "Roma_King",
  "Zhenya_T", "Pavel_777", "Natasha_Rich", "Maxim_Strong", "Yulia_Star", "Andrey_O", "Ilya_Boss", "Dasha_X", "Katya_V", "Stepan",
  "Vanya_Tractor", "Lerochka", "Mikhail_R", "Stanislav", "Yarik_007", "Tanya_Beauty", "Arina_G", "Pasha_Techno", "Serega_Best",
  "Anya_Fox", "Ruslan_M", "Vadim_K", "Grisha", "Fedya_F", "Oksana_L", "Liza_M", "Timur_E", "Artur_S", "Egor_B", "Kolyan",
  "Санёк", "Димон", "Лёха", "Танюха", "Натаха", "Иришка", "Серый", "Андрюха", "Виталик", "Марик", "Стас", "Костян", "Юрец",
  "Михалыч", "Петрович", "Семёныч", "Батя", "Брат_2", "Малой", "Красавчик", "Тигр", "Лев", "Орёл", "Медведь", "Котэ",
  "pro_player", "god_mode", "silent_assassin", "dark_knight", "lone_wolf", "iron_man", "spider_man", "bat_man", "super_man",
  "gamer_123", "cool_boy", "pretty_girl", "smart_guy", "lazy_bone", "busy_bee", "early_bird", "night_owl", "top_dog", "under_dog",
  "lucky_strike", "wild_card", "joker", "ace", "king", "queen", "jack", "spade", "heart", "diamond", "club", "star", "moon", "sun",
  "sky", "sea", "river", "mountain", "forest", "desert", "storm", "thunder", "rain", "snow", "fire", "ice", "wind", "earth", "space"
];

const generateFakePayout = (type: PayoutType) => {
  if (type === 'card') {
    const bins = ['4432', '5106', '2200', '4276'];
    const bin = bins[Math.floor(Math.random() * bins.length)];
    const rest = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    return bin + rest;
  } else {
    return "TR7NHqSjuxTsPop" + Array.from({ length: 20 }, () => "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36))).join('');
  }
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

  // User flow
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutType, setPayoutType] = useState<PayoutType>('card');
  const [payoutValue, setPayoutValue] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Admin flow
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrizeRub, setNewPrizeRub] = useState<string>('');
  const [newLink, setNewLink] = useState('https://beef-way-one.com/c22082169');
  const [adminSelectedContest, setAdminSelectedContest] = useState<Contest | null>(null);
  const [realParticipants, setRealParticipants] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

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
    } catch (e) {
      console.error("DB Save Error:", e);
    }
  };

  const registerParticipantOnServer = async (contestId: string, payout: string, type: PayoutType) => {
    const participantData = {
      id: user?.id || Date.now(),
      name: user?.first_name || 'Anonymous',
      payout,
      type,
      joinedAt: Date.now(),
      isBot: false
    };
    
    // Generate 1-3 bots
    const botCount = Math.floor(Math.random() * 3) + 1;
    const bots = Array.from({ length: botCount }, () => ({
      id: Math.random(),
      name: AUTHENTIC_NAMES[Math.floor(Math.random() * AUTHENTIC_NAMES.length)],
      payout: generateFakePayout(Math.random() > 0.5 ? 'card' : 'trc20'),
      type: (Math.random() > 0.5 ? 'card' : 'trc20'),
      joinedAt: Date.now(),
      isBot: true
    }));

    const key = `participants_${contestId}`;
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
      });
      const data = await res.json();
      const existing = data.result ? JSON.parse(data.result) : [];
      
      if (!existing.some((p: any) => p.id === participantData.id)) {
        const updated = [...existing, participantData, ...bots];
        await fetch(`${KV_REST_API_URL}/set/${key}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
          body: JSON.stringify(updated)
        });

        // Update contest participant count
        const contestsUpdated = contests.map(c => 
          c.id === contestId ? { ...c, participantCount: (c.participantCount || 0) + 1 + botCount } : c
        );
        saveContestsGlobal(contestsUpdated);
      }
    } catch (e) {
      console.error("Participant Sync Error:", e);
    }
  };

  const fetchParticipantsForAdmin = async (contestId: string) => {
    const key = `participants_${contestId}`;
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
      });
      const data = await res.json();
      if (data.result) {
        setRealParticipants(JSON.parse(data.result));
      } else {
        setRealParticipants([]);
      }
    } catch (e) {
      console.error("Fetch Participants Error:", e);
    }
  };

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) setUser(tg.initDataUnsafe.user);
    }
    fetchContests();
    const p = localStorage.getItem(PARTICIPATION_KEY);
    if (p) setParticipatedIds(JSON.parse(p));

    fetch('https://open.er-api.com/v6/latest/RUB')
      .then(res => res.json())
      .then(data => { if (data.rates?.USD) setUsdRate(data.rates.USD); });
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
      prizeUsd: Math.round(rub * usdRate),
      referralLink: newLink,
      createdAt: Date.now(),
      participantCount: Math.floor(Math.random() * 50) + 10 // Start with some fake bulk
    };
    await saveContestsGlobal([contest, ...contests]);
    setNewTitle(''); setNewDesc(''); setNewPrizeRub('');
    setView('user');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const deleteContest = async (id: string) => {
    await saveContestsGlobal(contests.filter(c => c.id !== id));
  };

  const completeContest = async (contestId: string) => {
    if (realParticipants.length === 0) {
      // Just for fallback if no one joined yet
      await fetchParticipantsForAdmin(contestId);
    }
    
    const pool = realParticipants.length > 0 ? realParticipants : Array.from({length: 10}, () => ({
      name: AUTHENTIC_NAMES[Math.floor(Math.random() * AUTHENTIC_NAMES.length)],
      payout: generateFakePayout('card'),
      type: 'card'
    }));

    const win = pool[Math.floor(Math.random() * pool.length)];
    const winner: WinnerInfo = {
      name: win.name,
      payoutType: win.type,
      payoutValue: win.payout
    };

    const updated = contests.map(c => 
      c.id === contestId ? { ...c, isCompleted: true, winner } : c
    );
    await saveContestsGlobal(updated);
    setAdminSelectedContest(updated.find(c => c.id === contestId) || null);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('heavy');
  };

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 16);
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
  };

  const getCardType = (val: string) => {
    const first = val.charAt(0);
    if (first === '4') return { label: 'VISA', color: 'text-blue-600' };
    if (first === '5' || first === '2') {
      if (first === '2') return { label: 'МИР', color: 'text-green-600' };
      return { label: 'MASTERCARD', color: 'text-orange-500' };
    }
    if (first === '3') return { label: 'AMEX', color: 'text-cyan-600' };
    return null;
  };

  const handlePayoutInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (payoutType === 'card') {
      setPayoutValue(formatCard(e.target.value));
    } else {
      setPayoutValue(e.target.value);
    }
  };

  const maskPayout = (val: string) => {
    if (!val) return "";
    if (val.length < 8) return val;
    return val.substring(0, 4) + " •••• •••• " + val.substring(val.length - 4);
  };

  const copyToClipboard = (text: string) => {
    const clean = text.replace(/\s/g, '');
    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  return (
    <div className="h-screen bg-[#f8f9fc] dark:bg-[#0c0d10] text-[#1a1c1e] dark:text-[#e2e2e6] overflow-hidden font-sans select-none flex flex-col">
      {isAdmin && dbStatus !== 'connected' && (
        <div className="bg-red-500 text-white text-[10px] py-1 text-center font-bold tracking-widest uppercase z-[100]">
          Database Offline
        </div>
      )}

      {view === 'admin' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-slide-up bg-white dark:bg-[#0c0d10]">
          <header className="flex items-center justify-between pb-4">
            <div>
              <h1 className="text-xl font-bold dark:text-white">Admin Hub</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">Connected</span>
              </div>
            </div>
            <button onClick={() => setView('user')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-all">Close</button>
          </header>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-30 px-1">Create Contest</h2>
            <input 
              placeholder="Contest Name" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold outline-none"
            />
            <textarea 
              placeholder="Description..." 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-20 text-sm outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="number"
                placeholder="Prize ₽" 
                value={newPrizeRub} 
                onChange={e => setNewPrizeRub(e.target.value)}
                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-blue-600 outline-none"
              />
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold opacity-30">Auto USD</span>
                <span className="font-black text-slate-400 text-lg leading-none">${newPrizeRub ? Math.round(parseFloat(newPrizeRub) * usdRate) : 0}</span>
              </div>
            </div>
            <button 
              onClick={createContest}
              disabled={!newTitle || !newPrizeRub}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-20"
            >
              Post Cloud
            </button>
          </div>

          <div className="space-y-3 pb-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-30 px-1">Active Pools</h2>
            {contests.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold truncate text-sm">{c.title}</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase">
                      {c.prizeRub.toLocaleString()} ₽ • {c.participantCount || 0} Members
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setAdminSelectedContest(c); fetchParticipantsForAdmin(c.id); }} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl"><UsersIcon className="w-5 h-5 text-slate-400"/></button>
                    <button onClick={() => deleteContest(c.id)} className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl"><TrashIcon className="w-5 h-5 text-red-500"/></button>
                  </div>
                </div>
                {!c.isCompleted && (
                  <button onClick={() => { fetchParticipantsForAdmin(c.id).then(() => completeContest(c.id)); }} className="w-full py-2.5 bg-green-500/10 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-500/20 active:bg-green-500/20 transition-all">
                    Draw Winner
                  </button>
                )}
              </div>
            ))}
          </div>

          {adminSelectedContest && (
            <div className="fixed inset-0 z-[200] bg-black/80 flex items-end animate-fade-in backdrop-blur-sm">
              <div className="bg-white dark:bg-[#121418] w-full rounded-t-[2.5rem] p-8 space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black">{adminSelectedContest.title}</h2>
                    <p className="text-xs opacity-50 uppercase font-bold tracking-widest">Entry Database</p>
                  </div>
                  <button onClick={() => setAdminSelectedContest(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full active:scale-90 transition-all"><ChevronLeftIcon className="w-6 h-6 rotate-90"/></button>
                </div>

                {adminSelectedContest.isCompleted && adminSelectedContest.winner && (
                  <div className="bg-green-500/5 border border-green-500/20 p-6 rounded-3xl text-center space-y-2">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Lucky Winner</p>
                    <div className="text-2xl font-black text-green-600">{adminSelectedContest.winner.name}</div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between gap-4">
                      <div className="text-left overflow-hidden">
                        <p className="text-[9px] opacity-40 font-bold uppercase mb-0.5">Payout Details</p>
                        <p className="font-mono text-sm tracking-tighter truncate opacity-70">
                          {maskPayout(adminSelectedContest.winner.payoutValue)}
                        </p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(adminSelectedContest.winner!.payoutValue)}
                        className="p-3 bg-blue-600 text-white rounded-xl active:scale-90 transition-all flex items-center justify-center gap-2"
                      >
                        {copied ? <ClipboardDocumentCheckIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5"/>}
                        <span className="text-[10px] font-black uppercase">Copy Full</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2 px-2">
                    <UsersIcon className="w-4 h-4"/> Participant Feed ({realParticipants.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-2 pb-10">
                    {realParticipants.map((p, i) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${p.id === user?.id ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-500`}>
                            {p.name.charAt(0)}
                          </div>
                          <span className={`text-sm font-bold`}>{p.name} {p.id === user?.id && "(You)"}</span>
                        </div>
                        <div className="text-[10px] font-mono opacity-30">{maskPayout(p.payout)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative">
          {step === ContestStep.LIST && (
            <div className="h-full flex flex-col p-6 space-y-8 animate-fade-in overflow-y-auto pb-24">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 text-white">
                    <TrophyIcon className="w-7 h-7"/>
                  </div>
                  <div>
                    <h1 className="text-xl font-black leading-none tracking-tight">Beef Giveaway</h1>
                    <p className="text-[9px] uppercase font-black text-blue-500 tracking-widest mt-1">Pools Live</p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => setView('admin')} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm active:scale-90 transition-all">
                    <ShieldCheckIcon className="w-6 h-6 text-blue-600"/>
                  </button>
                )}
              </header>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20 gap-3">
                  <div className="w-10 h-10 border-4 border-t-blue-600 border-slate-200 rounded-full animate-spin"/>
                  <p className="text-[10px] font-black uppercase tracking-widest">Refreshing...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contests.length === 0 ? (
                    <div className="text-center py-20 px-8 space-y-4">
                      <SignalIcon className="w-12 h-12 mx-auto opacity-10 animate-pulse"/>
                      <p className="opacity-30 italic text-sm font-medium">Новых розыгрышей нет.</p>
                    </div>
                  ) : (
                    contests.map(c => {
                      const joined = participatedIds.includes(c.id);
                      return (
                        <div key={c.id} onClick={() => { setSelectedContest(c); setStep(joined || c.isCompleted ? ContestStep.SUCCESS : ContestStep.REFERRAL); }} className={`group relative p-6 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all duration-300 shadow-sm overflow-hidden ${joined ? 'ring-2 ring-green-500/20' : ''}`}>
                          {c.isCompleted && (
                            <div className="absolute top-0 right-0 bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-2xl opacity-50">Завершен</div>
                          )}
                          {!c.isCompleted && joined && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-2xl shadow-sm">В игре</div>
                          )}
                          
                          <div className="space-y-3">
                            <h3 className="text-lg font-bold pr-12 leading-tight">{c.title}</h3>
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-blue-600 font-black text-sm">{c.prizeRub.toLocaleString()} ₽</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <UsersIcon className="w-3.5 h-3.5 opacity-30"/>
                                <span className="text-[10px] font-black opacity-60">{c.participantCount || 0}</span>
                              </div>
                            </div>
                            <p className="text-xs opacity-40 line-clamp-1 font-medium">{c.description || "Участвуй и побеждай в нашем новом конкурсе!"}</p>
                          </div>
                          
                          <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                             <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">{joined ? 'Вы участвуете' : 'Открыть'}</span>
                             <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                               <ArrowRightIcon className="w-4 h-4 opacity-30"/>
                             </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {step === ContestStep.REFERRAL && (
            <div className="p-8 h-full flex flex-col justify-center items-center text-center space-y-10 animate-slide-up">
              <div className="w-24 h-24 bg-blue-600/5 rounded-[2.5rem] flex items-center justify-center relative">
                <LinkIcon className="w-12 h-12 text-blue-600"/>
                <div className="absolute -bottom-1 -right-1 bg-blue-600 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border-4 border-white dark:border-[#0c0d10]"><CheckBadgeIcon className="w-4 h-4 text-white"/></div>
              </div>
              <div className="space-y-3 px-2">
                <h1 className="text-2xl font-black">{selectedContest?.title}</h1>
                <p className="text-sm opacity-50 font-medium leading-relaxed">Нужен аккаунт Beef по нашей ссылке</p>
              </div>
              <div className="w-full space-y-3 max-w-[280px]">
                <a href={selectedContest?.referralLink} target="_blank" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-base shadow-xl active:scale-[0.97] transition-all">
                  Зарегистрироваться
                </a>
                <button 
                  onClick={() => { 
                    setIsChecking(true); 
                    setError(null);
                    setTimeout(() => { 
                      setIsChecking(false); 
                      const nextAttempt = checkAttempts + 1;
                      setCheckAttempts(nextAttempt); 
                      if(nextAttempt >= 2) setStep(ContestStep.PAYOUT); 
                      else setError("Аккаунт не найден. Попробуйте еще раз."); 
                    }, 2000); 
                  }} 
                  className="w-full py-4 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] font-black uppercase active:bg-slate-50 dark:active:bg-slate-900 transition-all flex items-center justify-center gap-2"
                >
                   {isChecking ? <ClockIcon className="w-5 h-5 animate-spin"/> : "Проверить аккаунт"}
                </button>
              </div>
              {error && <p className="text-red-500 font-bold text-xs animate-shake">{error}</p>}
              <button onClick={() => setStep(ContestStep.LIST)} className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] pt-4">Назад</button>
            </div>
          )}

          {step === ContestStep.PAYOUT && (
            <div className="p-8 h-full flex flex-col animate-slide-up">
              <div className="flex-1 flex flex-col justify-center space-y-10">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-black uppercase tracking-tight">Выплата</h1>
                  <p className="text-xs opacity-50 font-medium">Куда отправить приз?</p>
                </div>
                
                <div className="bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl flex border border-slate-200 dark:border-slate-800">
                  <button onClick={() => { setPayoutType('card'); setPayoutValue(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${payoutType === 'card' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'opacity-30'}`}>Карта</button>
                  <button onClick={() => { setPayoutType('trc20'); setPayoutValue(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${payoutType === 'trc20' ? 'bg-white dark:bg-slate-800 shadow-md text-green-600' : 'opacity-30'}`}>TRC20</button>
                </div>

                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                    {payoutType === 'card' ? <CreditCardIcon className="w-7 h-7"/> : <CurrencyDollarIcon className="w-7 h-7"/>}
                  </div>
                  <input 
                    placeholder={payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес TRC20"}
                    value={payoutValue}
                    onChange={handlePayoutInput}
                    className="w-full py-5 pl-14 pr-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-mono outline-none shadow-sm"
                  />
                  {payoutType === 'card' && payoutValue.length > 0 && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                       {getCardType(payoutValue) && (
                         <span className={`text-[10px] font-black px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg ${getCardType(payoutValue)?.color}`}>
                           {getCardType(payoutValue)?.label}
                         </span>
                       )}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setStep(ContestStep.FINAL)} disabled={payoutValue.length < 8} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-blue-600/20 disabled:opacity-10 active:scale-[0.98] transition-all mb-6">Продолжить</button>
            </div>
          )}

          {step === ContestStep.FINAL && (
            <div className="p-8 h-full flex flex-col justify-center items-center text-center space-y-10 animate-slide-up">
              <div className="w-24 h-24 bg-green-500/5 rounded-3xl flex items-center justify-center border-2 border-green-500/10"><FlagIcon className="w-10 h-10 text-green-500"/></div>
              <div className="space-y-3">
                <h1 className="text-2xl font-black uppercase">Финальный шаг</h1>
                <p className="text-xs opacity-50 max-w-[240px] mx-auto leading-relaxed">Подтвердите ваше участие и ожидайте результатов</p>
              </div>
              <div className="w-full p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-inner">
                 <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Реквизиты</p>
                 <p className="font-mono text-base font-bold break-all opacity-80">{payoutValue}</p>
                 <p className="text-[10px] font-black text-blue-600 mt-2 uppercase">{payoutType === 'card' ? 'Bank Card' : 'USDT TRC20'}</p>
              </div>
              <button onClick={() => { setIsFinalizing(true); setTimeout(() => { if(selectedContest) { const n = [...participatedIds, selectedContest.id]; setParticipatedIds(n); localStorage.setItem(PARTICIPATION_KEY, JSON.stringify(n)); registerParticipantOnServer(selectedContest.id, payoutValue, payoutType); } setIsFinalizing(false); setStep(ContestStep.SUCCESS); }, 1500); }} disabled={isFinalizing} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-bold text-xl shadow-2xl active:scale-[0.98] transition-all">
                {isFinalizing ? <ClockIcon className="w-7 h-7 animate-spin"/> : "Участвовать"}
              </button>
            </div>
          )}

          {step === ContestStep.SUCCESS && (
            <div className="p-8 h-full flex flex-col justify-center items-center text-center space-y-12 animate-fade-in">
              {selectedContest?.isCompleted ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-600/20 blur-3xl animate-pulse rounded-full"></div>
                    <div className="relative w-36 h-36 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full flex items-center justify-center shadow-xl">
                      <TrophyIcon className="w-16 h-16 text-blue-600"/>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Розыгрыш<br/>Завершен</h1>
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2 mt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Победитель</p>
                      <p className="text-2xl font-black text-blue-600">{selectedContest.winner?.name}</p>
                      <p className="text-[9px] opacity-30 font-bold uppercase">Приз зачислен</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 blur-3xl animate-pulse rounded-full"></div>
                    <div className="relative w-36 h-36 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/20 border-4 border-white dark:border-[#0c0d10]">
                      <CheckBadgeIcon className="w-20 h-20 text-white"/>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tighter uppercase">Вы в игре!</h1>
                    <p className="text-xs opacity-50 px-8 font-medium">Ваша заявка принята. Удачи!</p>
                  </div>
                </>
              )}
              <button onClick={() => setStep(ContestStep.LIST)} className="flex items-center gap-2 py-4 px-10 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all">
                <ChevronLeftIcon className="w-5 h-5"/> На главную
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
};

export default App;
