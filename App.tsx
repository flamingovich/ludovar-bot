
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
  UserCircleIcon
} from '@heroicons/react/24/outline';

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 

const DB_KEY = 'beef_contests_v2';
const ADMIN_ID = 7946967720;
const PARTICIPATION_KEY = 'beef_user_participations_v4';

const BOT_NAMES = [
  "Alexander", "Dmitry", "Sergey", "Elena", "Maria", "Ivan", "Oleg", "Anna", "Maxim", "Yulia",
  "Pavel", "Andrey", "Natalia", "Victoria", "Denis", "Artem", "Kirill", "Svetlana", "Igor", "Roman"
];

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

  // User flow states
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutType, setPayoutType] = useState<PayoutType>('card');
  const [payoutValue, setPayoutValue] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Admin flow states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrizeRub, setNewPrizeRub] = useState<string>('');
  const [newLink, setNewLink] = useState('https://beef-way-one.com/c22082169');
  const [adminSelectedContest, setAdminSelectedContest] = useState<Contest | null>(null);

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
      createdAt: Date.now()
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
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const isBotCard = Math.random() > 0.5;
    const winner: WinnerInfo = {
      name: randomName,
      payoutType: isBotCard ? 'card' : 'trc20',
      payoutValue: isBotCard 
        ? "4432 **** **** " + Math.floor(1000 + Math.random() * 9000)
        : "TR7NHqSjuxTsPop... " + Math.floor(100 + Math.random() * 900)
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

  const mockParticipants = useMemo(() => {
    return [
      ...(user ? [{ name: user.first_name, isBot: false }] : []),
      ...Array.from({ length: 15 }, () => ({
        name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
        isBot: true
      }))
    ].sort(() => Math.random() - 0.5);
  }, [user]);

  return (
    <div className="h-screen bg-[#f8f9fc] dark:bg-[#0c0d10] text-[#1a1c1e] dark:text-[#e2e2e6] overflow-hidden font-sans select-none flex flex-col">
      {/* Admin Connection Bar */}
      {isAdmin && dbStatus !== 'connected' && (
        <div className="bg-red-500 text-white text-[10px] py-1 text-center font-bold tracking-widest uppercase z-[100]">
          Database Offline
        </div>
      )}

      {view === 'admin' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-slide-up bg-white dark:bg-[#0c0d10]">
          <header className="flex items-center justify-between pb-4">
            <div>
              <h1 className="text-xl font-bold dark:text-white">Управление</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-green-500 shadow-sm' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold opacity-40 uppercase">{dbStatus === 'connected' ? 'Cloud Sync' : 'Offline'}</span>
              </div>
            </div>
            <button onClick={() => setView('user')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider">Назад</button>
          </header>

          {/* Create Form */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-tighter opacity-30 px-1">Новый розыгрыш</h2>
            <input 
              placeholder="Название (напр: Пятничный Beef)" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            />
            <textarea 
              placeholder="Короткое описание..." 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-20 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input 
                  type="number"
                  placeholder="Сумма ₽" 
                  value={newPrizeRub} 
                  onChange={e => setNewPrizeRub(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-blue-600"
                />
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 flex flex-col justify-center border border-transparent">
                <span className="text-[9px] uppercase font-bold opacity-30">Auto USD</span>
                <span className="font-black text-slate-400">${newPrizeRub ? Math.round(parseFloat(newPrizeRub) * usdRate) : 0}</span>
              </div>
            </div>
            <button 
              onClick={createContest}
              disabled={!newTitle || !newPrizeRub}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-20"
            >
              Создать в облаке
            </button>
          </div>

          {/* Contests List */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-tighter opacity-30 px-1">Список активных</h2>
            {contests.length === 0 && <p className="text-center py-10 opacity-20 text-sm">Ничего не найдено</p>}
            {contests.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold truncate">{c.title}</p>
                    <p className="text-[10px] font-black text-blue-600">{c.prizeRub.toLocaleString()} ₽ • {c.isCompleted ? 'ЗАВЕРШЕН' : 'АКТИВЕН'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAdminSelectedContest(c)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl"><UsersIcon className="w-5 h-5 text-slate-400"/></button>
                    <button onClick={() => deleteContest(c.id)} className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl"><TrashIcon className="w-5 h-5 text-red-500"/></button>
                  </div>
                </div>
                {!c.isCompleted && (
                  <button onClick={() => completeContest(c.id)} className="w-full py-2.5 bg-green-500/10 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                    Завершить и выбрать победителя
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Admin Modal (Participants/Winner) */}
          {adminSelectedContest && (
            <div className="fixed inset-0 z-[200] bg-black/80 flex items-end animate-fade-in backdrop-blur-sm">
              <div className="bg-white dark:bg-[#121418] w-full rounded-t-[3rem] p-8 space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black">{adminSelectedContest.title}</h2>
                    <p className="text-sm opacity-50">Управление розыгрышем</p>
                  </div>
                  <button onClick={() => setAdminSelectedContest(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronLeftIcon className="w-6 h-6 rotate-90"/></button>
                </div>

                {adminSelectedContest.isCompleted && adminSelectedContest.winner && (
                  <div className="bg-green-500/5 border-2 border-green-500/30 p-6 rounded-[2.5rem] text-center space-y-2">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em]">Победитель выбран</p>
                    <div className="text-3xl font-black text-green-500">{adminSelectedContest.winner.name}</div>
                    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-green-500/10 mt-4">
                      <p className="text-[10px] opacity-40 font-bold uppercase mb-1">Реквизиты для выплаты</p>
                      <p className="font-mono text-xs break-all">{adminSelectedContest.winner.payoutValue}</p>
                      <p className="text-[10px] font-black mt-1 text-green-600">{adminSelectedContest.winner.payoutType === 'card' ? 'BANK CARD' : 'USDT TRC20'}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-30 flex items-center gap-2 px-2">
                    <UsersIcon className="w-4 h-4"/> Участники ({mockParticipants.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {mockParticipants.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${p.isBot ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-blue-600 text-white'}`}>
                            {p.name.charAt(0)}
                          </div>
                          <span className={`text-sm font-bold ${!p.isBot ? 'text-blue-600' : ''}`}>{p.name} {!p.isBot && "(Вы)"}</span>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.isBot ? 'bg-slate-100 dark:bg-slate-800 opacity-30' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                          {p.isBot ? 'User' : 'Self'}
                        </div>
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
                    <p className="text-[9px] uppercase font-black text-blue-500 tracking-widest mt-1">Status: Online</p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => setView('admin')} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                    <ShieldCheckIcon className="w-6 h-6 text-blue-600"/>
                  </button>
                )}
              </header>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20 gap-3">
                  <div className="w-10 h-10 border-4 border-t-blue-600 border-slate-200 rounded-full animate-spin"/>
                  <p className="text-[10px] font-black uppercase tracking-widest">Loading Pool</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contests.length === 0 ? (
                    <div className="text-center py-20 px-8 space-y-4">
                      <SignalIcon className="w-12 h-12 mx-auto opacity-10 animate-pulse"/>
                      <p className="opacity-30 italic text-sm font-medium">Новых розыгрышей не обнаружено. Ожидайте уведомления.</p>
                    </div>
                  ) : (
                    contests.map(c => {
                      const joined = participatedIds.includes(c.id);
                      return (
                        <div key={c.id} onClick={() => { setSelectedContest(c); setStep(joined || c.isCompleted ? ContestStep.SUCCESS : ContestStep.REFERRAL); }} className={`group relative p-6 bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all duration-300 shadow-sm overflow-hidden ${joined ? 'ring-2 ring-green-500/20' : ''}`}>
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
                              <span className="text-[10px] font-bold opacity-30 tracking-tight">≈ ${c.prizeUsd}</span>
                            </div>
                            <p className="text-xs opacity-40 line-clamp-1 font-medium">{c.description || "Участвуй и побеждай в нашем новом конкурсе!"}</p>
                          </div>
                          
                          <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                             <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">{joined ? 'Уже участвую' : 'Открыть подробности'}</span>
                             <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-active:translate-x-1 transition-transform">
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
                <p className="text-base opacity-50 font-medium">Для участия обязателен аккаунт Beef по нашей ссылке</p>
              </div>
              <div className="w-full space-y-3 max-w-[280px]">
                <a href={selectedContest?.referralLink} target="_blank" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold text-base shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-[0.97] transition-all">
                  Зарегистрироваться
                </a>
                <button 
                  onClick={() => { 
                    setIsChecking(true); 
                    setTimeout(() => { 
                      setIsChecking(false); 
                      const nextAttempt = checkAttempts + 1;
                      setCheckAttempts(nextAttempt); 
                      if(nextAttempt >= 2) setStep(ContestStep.PAYOUT); 
                      else setError("Аккаунт пока не найден. Повтори попытку позже."); 
                    }, 2000); 
                  }} 
                  className="w-full py-4 border-2 border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest active:bg-slate-50 dark:active:bg-slate-900 transition-all flex items-center justify-center gap-2"
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
                  <h1 className="text-3xl font-black tracking-tight uppercase">Выплата</h1>
                  <p className="text-sm opacity-50">Куда отправить приз при выигрыше?</p>
                </div>
                
                <div className="bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-[1.8rem] flex border border-slate-200 dark:border-slate-800">
                  <button onClick={() => { setPayoutType('card'); setPayoutValue(''); }} className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${payoutType === 'card' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'opacity-30'}`}>Карта</button>
                  <button onClick={() => { setPayoutType('trc20'); setPayoutValue(''); }} className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${payoutType === 'trc20' ? 'bg-white dark:bg-slate-800 shadow-md text-green-600' : 'opacity-30'}`}>USDT TRC20</button>
                </div>

                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                    {payoutType === 'card' ? <CreditCardIcon className="w-8 h-8"/> : <CurrencyDollarIcon className="w-8 h-8"/>}
                  </div>
                  <input 
                    placeholder={payoutType === 'card' ? "0000 0000 0000 0000" : "TLQp..."}
                    value={payoutValue}
                    onChange={handlePayoutInput}
                    className="w-full py-6 pl-16 pr-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[1.8rem] text-xl font-mono focus:border-blue-600 outline-none transition-all shadow-sm"
                  />
                  {payoutType === 'card' && payoutValue.length > 0 && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
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
              <div className="w-24 h-24 bg-green-500/5 rounded-[2.5rem] flex items-center justify-center border-2 border-green-500/10 shadow-lg"><FlagIcon className="w-10 h-10 text-green-500"/></div>
              <div className="space-y-3">
                <h1 className="text-3xl font-black uppercase tracking-tight">Почти в игре</h1>
                <p className="text-sm opacity-50 max-w-[240px] mx-auto">Нажмите кнопку, чтобы официально зарегистрироваться</p>
              </div>
              <div className="w-full p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.2rem] shadow-inner">
                 <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">Метод выплаты</p>
                 <p className="font-mono text-base font-bold break-all opacity-80">{payoutValue}</p>
                 <p className="text-[10px] font-black text-blue-600 mt-2 uppercase">{payoutType === 'card' ? 'Bank Card' : 'TRON Network (TRC20)'}</p>
              </div>
              <button onClick={() => { setIsFinalizing(true); setTimeout(() => { if(selectedContest) { const n = [...participatedIds, selectedContest.id]; setParticipatedIds(n); localStorage.setItem(PARTICIPATION_KEY, JSON.stringify(n)); } setIsFinalizing(false); setStep(ContestStep.SUCCESS); }, 1500); }} disabled={isFinalizing} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-bold text-xl shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
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
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-2 mt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Победитель</p>
                      <p className="text-2xl font-black text-blue-600">{selectedContest.winner?.name}</p>
                      <p className="text-[9px] opacity-30 font-bold">Выплата успешно проведена</p>
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
                    <h1 className="text-4xl font-black tracking-tighter uppercase">Вы в игре!</h1>
                    <p className="text-sm opacity-50 px-8">Ваша заявка принята. Итоги будут опубликованы в канале.</p>
                  </div>
                </>
              )}
              <button onClick={() => setStep(ContestStep.LIST)} className="flex items-center gap-2 py-4 px-10 bg-slate-100 dark:bg-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-sm">
                <ChevronLeftIcon className="w-5 h-5"/> К списку
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.1s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default App;
