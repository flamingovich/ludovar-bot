
import React, { useState, useEffect, useMemo } from 'react';
import { TelegramUser, ContestStep, PayoutType, Contest } from './types';
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
  SignalIcon
} from '@heroicons/react/24/outline';

// ========================================================
// 🔐 БАЗА ДАННЫХ ПОДКЛЮЧЕНА (Upstash Redis)
// ========================================================
const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 
// ========================================================

const DB_KEY = 'beef_contests_v1';
const ADMIN_ID = 7946967720;
const PARTICIPATION_KEY = 'beef_user_participations_v3';

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

  // Admin form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrizeRub, setNewPrizeRub] = useState<string>('');
  const [newLink, setNewLink] = useState('https://beef-way-one.com/c22082169');

  const fetchContests = async () => {
    setIsLoading(true);
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      setDbStatus('none');
      const local = localStorage.getItem(DB_KEY);
      setContests(local ? JSON.parse(local) : []);
      setIsLoading(false);
      return;
    }

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
      console.error("DB Fetch Error:", e);
      setDbStatus('error');
      const local = localStorage.getItem(DB_KEY);
      setContests(local ? JSON.parse(local) : []);
    } finally {
      setIsLoading(false);
    }
  };

  const saveContestsGlobal = async (updated: Contest[]) => {
    localStorage.setItem(DB_KEY, JSON.stringify(updated));
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return;

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
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
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
    if (!newTitle || !newLink || !newPrizeRub) return;
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
    const updated = [contest, ...contests];
    setContests(updated);
    await saveContestsGlobal(updated);
    setNewTitle(''); setNewDesc(''); setNewPrizeRub('');
    setView('user');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const deleteContest = async (id: string) => {
    const updated = contests.filter(c => c.id !== id);
    setContests(updated);
    await saveContestsGlobal(updated);
  };

  return (
    <div className="h-screen bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] overflow-hidden font-sans select-none">
      {isAdmin && dbStatus !== 'connected' && (
        <div className="bg-red-600 text-white text-[10px] py-1 px-4 text-center font-black animate-pulse uppercase sticky top-0 z-50 shadow-lg">
          ⚠️ ОШИБКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ
        </div>
      )}

      {view === 'admin' ? (
        <div className="p-6 h-full overflow-y-auto pb-24 space-y-8 animate-fade-in bg-white dark:bg-black">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-black dark:text-white leading-none">Админ-панель</h1>
              <div className="flex items-center gap-1.5 mt-2">
                <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${dbStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {dbStatus === 'connected' ? 'База данных онлайн' : 'Нет связи с базой'}
                </span>
              </div>
            </div>
            <button onClick={() => setView('user')} className="text-blue-600 font-black p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest">Выход</button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-[2.5rem] space-y-4 border border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="space-y-1">
               <label className="text-[10px] font-black uppercase opacity-40 px-2">Заголовок</label>
               <input 
                placeholder="Зимний розыгрыш 10к" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)}
                className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 text-black dark:text-white font-bold text-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase opacity-40 px-2">Описание конкурса</label>
              <textarea 
                placeholder="Опиши условия коротко и ясно..." 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)}
                className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 h-24 text-black dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-40 px-2">Сумма RUB</label>
                <input 
                  type="number"
                  placeholder="5000" 
                  value={newPrizeRub} 
                  onChange={e => setNewPrizeRub(e.target.value)}
                  className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 text-blue-600 font-black text-xl"
                />
              </div>
              <div className="space-y-1 opacity-50">
                <label className="text-[10px] font-black uppercase px-2">Эквивалент USD</label>
                <div className="w-full p-4 bg-gray-100 dark:bg-gray-950 rounded-2xl font-black text-xl">
                  ${newPrizeRub ? Math.round(parseFloat(newPrizeRub) * usdRate) : 0}
                </div>
              </div>
            </div>
            <button 
              onClick={createContest}
              disabled={!newTitle || !newPrizeRub}
              className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-20"
            >
              ОПУБЛИКОВАТЬ КОНКУРС
            </button>
          </div>

          <div className="space-y-4 pb-10">
            <h2 className="font-black text-[10px] uppercase tracking-widest opacity-30 px-2">Текущие розыгрыши</h2>
            {contests.length === 0 && <div className="text-center py-10 opacity-20 italic">Пока ничего не создано</div>}
            {contests.map(c => (
              <div key={c.id} className="p-5 bg-gray-50 dark:bg-gray-900 rounded-[2rem] flex justify-between items-center border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="overflow-hidden mr-4">
                  <p className="font-black text-black dark:text-white truncate text-base">{c.title}</p>
                  <p className="text-xs text-blue-600 font-bold">{c.prizeRub.toLocaleString()} ₽</p>
                </div>
                <button onClick={() => deleteContest(c.id)} className="p-3 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-2xl active:scale-90 transition-all">
                  <TrashIcon className="w-6 h-6"/>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-full">
          {step === ContestStep.LIST && (
            <div className="p-6 space-y-8 animate-fade-in overflow-y-auto h-full pb-24">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl shadow-blue-600/20"><TrophyIcon className="w-7 h-7"/></div>
                  <div>
                    <h1 className="text-xl font-black leading-none">Beef Contest</h1>
                    <p className="text-[10px] uppercase font-black text-blue-500 tracking-wider mt-1">Твой путь к победе</p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => setView('admin')} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl relative">
                    <ShieldCheckIcon className="w-7 h-7 text-blue-600"/>
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-black ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-20 gap-4">
                  <ClockIcon className="w-12 h-12 animate-spin"/>
                  <p className="font-black text-[10px] uppercase tracking-[0.4em]">Обновляем данные...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {contests.length === 0 ? (
                    <div className="text-center py-20 px-10">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 opacity-30">
                        <SignalIcon className="w-10 h-10"/>
                      </div>
                      <p className="opacity-30 italic font-medium">Новых розыгрышей пока нет. Заходи позже!</p>
                    </div>
                  ) : (
                    contests.map(c => {
                      const joined = participatedIds.includes(c.id);
                      return (
                        <div key={c.id} onClick={() => { setSelectedContest(c); setStep(joined ? ContestStep.SUCCESS : ContestStep.REFERRAL); }} className={`p-7 bg-[var(--tg-theme-secondary-bg-color)] rounded-[2.8rem] relative overflow-hidden active:scale-[0.97] transition-all shadow-sm border-2 ${joined ? 'border-green-500/30' : 'border-transparent'}`}>
                          {joined && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase flex items-center gap-1 shadow-lg z-10">
                              <CheckBadgeIcon className="w-3.5 h-3.5"/> Участвую
                            </div>
                          )}
                          <h3 className="text-xl font-black mb-2 pr-10">{c.title}</h3>
                          <div className="flex items-center gap-2 mb-4">
                            <BanknotesIcon className="w-5 h-5 text-blue-600 opacity-50"/>
                            <span className="text-blue-600 font-black text-lg">{c.prizeRub?.toLocaleString()} ₽ <span className="text-xs opacity-30 font-bold ml-1">/ ${c.prizeUsd}</span></span>
                          </div>
                          <p className="text-xs opacity-50 line-clamp-2 mb-6 font-medium leading-relaxed">{c.description}</p>
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{joined ? 'Вы в списке' : 'Записаться'}</span>
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                              <ArrowRightIcon className="w-4 h-4 text-blue-500"/>
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
            <div className="p-6 h-full flex flex-col justify-center items-center text-center space-y-12 animate-fade-in">
              <div className="w-28 h-28 bg-blue-50 dark:bg-blue-900/10 rounded-[2.8rem] flex items-center justify-center shadow-inner relative">
                <LinkIcon className="w-14 h-14 text-blue-600"/>
              </div>
              <div className="space-y-4 px-4">
                <h1 className="text-3xl font-black tracking-tight">{selectedContest?.title}</h1>
                <p className="opacity-60 text-lg font-medium leading-relaxed">Для участия необходимо иметь активный аккаунт Beef, зарегистрированный по нашей ссылке.</p>
              </div>
              <div className="w-full space-y-4">
                <a href={selectedContest?.referralLink} target="_blank" className="w-full p-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all">
                  РЕГИСТРАЦИЯ <ArrowRightIcon className="w-6 h-6"/>
                </a>
                <button 
                  onClick={() => { 
                    setIsChecking(true); 
                    setTimeout(() => { 
                      setIsChecking(false); 
                      const nextAttempt = checkAttempts + 1;
                      setCheckAttempts(nextAttempt); 
                      if(nextAttempt >= 2) setStep(ContestStep.PAYOUT); 
                      else setError("Аккаунт пока не найден. Попробуй через минуту."); 
                    }, 2000); 
                  }} 
                  disabled={isChecking} 
                  className="w-full py-5 border-2 border-blue-600 text-blue-600 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:bg-blue-50 transition-all"
                >
                  {isChecking ? <ClockIcon className="w-6 h-6 animate-spin"/> : "УЖЕ ЕСТЬ АККАУНТ"}
                </button>
              </div>
              {error && <p className="text-red-500 font-bold animate-shake text-sm px-6 leading-tight">{error}</p>}
              <button onClick={() => setStep(ContestStep.LIST)} className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pt-4">К списку конкурсов</button>
            </div>
          )}

          {step === ContestStep.PAYOUT && (
            <div className="p-8 h-full flex flex-col animate-fade-in">
              <div className="flex-1 space-y-12 pt-10">
                <div className="space-y-4 text-center">
                  <h1 className="text-5xl font-black tracking-tighter uppercase">Выплата</h1>
                  <p className="opacity-50 text-xl font-medium">Укажите реквизиты для получения приза в случае победы</p>
                </div>
                <div className="flex bg-[var(--tg-theme-secondary-bg-color)] p-2 rounded-[2.2rem] border border-gray-100 dark:border-gray-800">
                  <button onClick={() => { setPayoutType('card'); setPayoutValue(''); }} className={`flex-1 py-4 rounded-[1.8rem] font-black text-xs transition-all ${payoutType === 'card' ? 'bg-white dark:bg-gray-800 shadow-xl text-blue-600' : 'opacity-40'}`}>БАНК. КАРТА</button>
                  <button onClick={() => { setPayoutType('trc20'); setPayoutValue(''); }} className={`flex-1 py-4 rounded-[1.8rem] font-black text-xs transition-all ${payoutType === 'trc20' ? 'bg-white dark:bg-gray-800 shadow-xl text-green-600' : 'opacity-40'}`}>USDT TRC20</button>
                </div>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20">
                    {payoutType === 'card' ? <CreditCardIcon className="w-8 h-8"/> : <CurrencyDollarIcon className="w-8 h-8"/>}
                  </div>
                  <input 
                    placeholder={payoutType === 'card' ? "Номер карты..." : "Адрес кошелька..."}
                    value={payoutValue}
                    onChange={e => setPayoutValue(e.target.value)}
                    className="w-full py-7 pl-16 pr-8 bg-[var(--tg-theme-secondary-bg-color)] rounded-[2.5rem] text-2xl font-mono focus:border-blue-600 border-2 border-transparent transition-all outline-none shadow-sm"
                  />
                </div>
              </div>
              <button onClick={() => setStep(ContestStep.FINAL)} disabled={payoutValue.length < 8} className="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl disabled:opacity-20 active:scale-95 transition-all mb-4">ПРОДОЛЖИТЬ</button>
            </div>
          )}

          {step === ContestStep.FINAL && (
            <div className="p-6 h-full flex flex-col justify-center items-center text-center space-y-12 animate-fade-in">
              <div className="w-32 h-32 bg-green-50 dark:bg-green-900/10 rounded-[3rem] flex items-center justify-center border-2 border-green-500/10 shadow-xl"><CheckBadgeIcon className="w-20 h-20 text-green-500"/></div>
              <div className="space-y-4 px-6">
                <h1 className="text-4xl font-black uppercase tracking-tight">Подтверждаем?</h1>
                <p className="opacity-50 text-xl font-medium">После нажатия кнопки вы будете официально зарегистрированы как участник.</p>
              </div>
              <div className="w-full p-6 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-inner">
                 <p className="text-[10px] font-black uppercase opacity-30 mb-2 tracking-widest">Твои реквизиты</p>
                 <p className="font-mono text-lg font-black break-all">{payoutValue}</p>
              </div>
              <button onClick={() => { setIsFinalizing(true); setTimeout(() => { if(selectedContest) { const n = [...participatedIds, selectedContest.id]; setParticipatedIds(n); localStorage.setItem(PARTICIPATION_KEY, JSON.stringify(n)); } setIsFinalizing(false); setStep(ContestStep.SUCCESS); }, 1500); }} disabled={isFinalizing} className="w-full py-8 bg-blue-600 text-white rounded-[2.8rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
                {isFinalizing ? <ClockIcon className="w-8 h-8 animate-spin"/> : "УЧАСТВОВАТЬ"}
              </button>
            </div>
          )}

          {step === ContestStep.SUCCESS && (
            <div className="p-6 h-full flex flex-col justify-center items-center text-center space-y-12 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-[5rem] rounded-full animate-pulse"></div>
                <div className="relative w-44 h-44 bg-gradient-to-tr from-green-600 to-emerald-400 rounded-full flex items-center justify-center text-white shadow-2xl border-4 border-white/20"><CheckBadgeIcon className="w-28 h-28"/></div>
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter">УСПЕШНО!</h1>
                <p className="opacity-60 text-xl px-10 font-medium">Вы зарегистрированы. Итоги будут в нашем Telegram канале. Удачи!</p>
              </div>
              <button onClick={() => setStep(ContestStep.LIST)} className="text-blue-600 font-black uppercase tracking-widest text-sm flex items-center gap-2 py-5 px-10 bg-blue-50 dark:bg-blue-900/10 rounded-2xl active:scale-90 transition-all">
                <ChevronLeftIcon className="w-6 h-6"/> К СПИСКУ
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .animate-fade-in { animation: fade-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-shake { animation: shake 0.1s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default App;
