
import React, { useState, useEffect, useMemo } from 'react';
import { TelegramUser, ContestStep, PayoutType, Contest } from './types';
import { 
  CheckBadgeIcon, 
  CreditCardIcon, 
  CurrencyDollarIcon, 
  ExclamationCircleIcon,
  ArrowRightIcon,
  LinkIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  TrophyIcon,
  ChevronLeftIcon,
  ShieldCheckIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const ADMIN_ID = 7946967720;
const STORAGE_KEY = 'beef_contests_v2';
const PARTICIPATION_KEY = 'user_participations_v2';

const App: React.FC = () => {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [step, setStep] = useState<ContestStep>(ContestStep.LIST);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [participatedIds, setParticipatedIds] = useState<string[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [usdRate, setUsdRate] = useState<number>(0.011); // Default fallback

  // Participation Flow State
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutType, setPayoutType] = useState<PayoutType>('card');
  const [payoutValue, setPayoutValue] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Admin Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrizeRub, setNewPrizeRub] = useState<string>('');
  const [newLink, setNewLink] = useState('https://beef-way-one.com/c22082169');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
    }

    // Load Contests
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setContests(JSON.parse(saved));
    } else {
      const initial = [{
        id: 'default',
        title: 'Первый розыгрыш Beef',
        description: 'Участвуй и выиграй ценные призы!',
        prizeRub: 5000,
        prizeUsd: 55,
        referralLink: 'https://beef-way-one.com/c22082169',
        createdAt: Date.now()
      }];
      setContests(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }

    // Load Participations
    const participations = localStorage.getItem(PARTICIPATION_KEY);
    if (participations) {
      setParticipatedIds(JSON.parse(participations));
    }

    // Fetch USD Rate
    fetch('https://open.er-api.com/v6/latest/RUB')
      .then(res => res.json())
      .then(data => {
        if (data.rates && data.rates.USD) {
          setUsdRate(data.rates.USD);
        }
      })
      .catch(() => console.log('Using default rate'));
  }, []);

  const isAdmin = useMemo(() => user?.id === ADMIN_ID, [user]);

  const saveContests = (newContests: Contest[]) => {
    setContests(newContests);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContests));
    // NOTE: In a real app, you would send this to your API here.
  };

  const createContest = () => {
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
    saveContests([contest, ...contests]);
    setNewTitle('');
    setNewDesc('');
    setNewPrizeRub('');
    setView('user');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const deleteContest = (id: string) => {
    saveContests(contests.filter(c => c.id !== id));
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  const startParticipation = (contest: Contest) => {
    if (participatedIds.includes(contest.id)) {
      setSelectedContest(contest);
      setStep(ContestStep.SUCCESS);
      return;
    }
    setSelectedContest(contest);
    setStep(ContestStep.REFERRAL);
    setCheckAttempts(0);
    setError(null);
  };

  const handleReferralCheck = () => {
    setIsChecking(true);
    setError(null);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');

    // 3 seconds cooldown as requested
    setTimeout(() => {
      setIsChecking(false);
      if (checkAttempts < 2) {
        setCheckAttempts(prev => prev + 1);
        setError("Проверь, зарегистрировался ли ты на Beef, или повтори попытку");
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('heavy');
      } else {
        setStep(ContestStep.PAYOUT);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('soft');
      }
    }, 3000);
  };

  const validatePayout = () => {
    if (payoutType === 'card') {
      return /^\d{16}$/.test(payoutValue.replace(/\s/g, ''));
    }
    return /^T[a-zA-Z0-9]{33}$/.test(payoutValue.trim());
  };

  const handleFinalParticipate = () => {
    if (!selectedContest) return;
    setIsFinalizing(true);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
    
    setTimeout(() => {
      const newParticipations = [...participatedIds, selectedContest.id];
      setParticipatedIds(newParticipations);
      localStorage.setItem(PARTICIPATION_KEY, JSON.stringify(newParticipations));
      
      setIsFinalizing(false);
      setStep(ContestStep.SUCCESS);
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    }, 1500);
  };

  const renderAdminPanel = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in overflow-y-auto pb-24 bg-[var(--tg-theme-bg-color)]">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ShieldCheckIcon className="w-8 h-8 text-orange-500" />
          Админ-панель
        </h1>
        <button onClick={() => setView('user')} className="text-blue-500 font-bold p-2">Выйти</button>
      </div>

      <div className="bg-[var(--tg-theme-secondary-bg-color)] p-6 rounded-[2rem] space-y-4 mb-8 border border-gray-200 dark:border-gray-800 shadow-md">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <PlusIcon className="w-5 h-5 text-blue-500" /> Создать розыгрыш
        </h2>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black px-1 opacity-50">Название</label>
            <input 
              placeholder="Введите название..." 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)}
              className="w-full p-4 bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] rounded-2xl border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black px-1 opacity-50">Описание</label>
            <textarea 
              placeholder="О чем этот конкурс?" 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)}
              className="w-full p-4 bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] rounded-2xl border border-gray-300 dark:border-gray-700 h-24 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black px-1 opacity-50">Приз (RUB)</label>
              <input 
                type="number"
                placeholder="Напр. 1000" 
                value={newPrizeRub} 
                onChange={e => setNewPrizeRub(e.target.value)}
                className="w-full p-4 bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] rounded-2xl border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none transition-all font-bold"
              />
            </div>
            <div className="space-y-1 opacity-60">
              <label className="text-[10px] uppercase font-black px-1">Приз (USD)</label>
              <div className="w-full p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-transparent font-bold">
                ${newPrizeRub ? Math.round(parseFloat(newPrizeRub) * usdRate) : 0}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black px-1 opacity-50">Ссылка Beef</label>
            <input 
              placeholder="https://..." 
              value={newLink} 
              onChange={e => setNewLink(e.target.value)}
              className="w-full p-4 bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] rounded-2xl border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <button 
          onClick={createContest}
          disabled={!newTitle || !newLink || !newPrizeRub}
          className="w-full py-4 bg-blue-500 text-white rounded-[1.5rem] font-black text-lg active:scale-95 transition-transform disabled:opacity-30 shadow-lg shadow-blue-500/20"
        >
          ОПУБЛИКОВАТЬ
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold px-1">Список событий</h2>
        {contests.length === 0 ? (
          <p className="text-center opacity-40 py-4">Список пуст</p>
        ) : (
          contests.map(c => (
            <div key={c.id} className="p-5 bg-[var(--tg-theme-secondary-bg-color)] rounded-3xl flex justify-between items-center border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex-1 mr-4">
                <p className="font-black text-lg leading-tight">{c.title}</p>
                <p className="text-xs font-bold text-blue-500">{c.prizeRub?.toLocaleString()} ₽ (~${c.prizeUsd})</p>
              </div>
              <button onClick={() => deleteContest(c.id)} className="p-3 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl active:scale-90 transition-all">
                <TrashIcon className="w-6 h-6" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderContestList = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in overflow-y-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
            <TrophyIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black leading-none mb-1">Beef Contest</h1>
            <p className="text-[10px] uppercase tracking-widest font-black text-[var(--tg-theme-hint-color)]">Активные события</p>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setView('admin')}
            className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl active:scale-90 transition-transform"
          >
            <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
          </button>
        )}
      </div>

      <div className="space-y-5">
        {contests.length === 0 ? (
          <div className="text-center py-20 text-[var(--tg-theme-hint-color)]">
            <UserGroupIcon className="w-20 h-20 mx-auto mb-4 opacity-10" />
            <p className="font-bold text-lg">Пока ничего нет</p>
          </div>
        ) : (
          contests.map(c => {
            const hasJoined = participatedIds.includes(c.id);
            return (
              <div 
                key={c.id} 
                onClick={() => startParticipation(c)}
                className={`p-6 bg-[var(--tg-theme-secondary-bg-color)] rounded-[2rem] border-2 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group ${hasJoined ? 'border-green-500/30' : 'border-transparent'}`}
              >
                {hasJoined && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1 z-10">
                    <CheckBadgeIcon className="w-3 h-3" /> Участвую
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-black pr-12 leading-tight">{c.title}</h3>
                </div>
                
                <div className="flex items-center gap-2 mb-4 bg-blue-500/10 dark:bg-blue-500/5 w-fit px-3 py-1 rounded-full">
                  <BanknotesIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-black text-blue-500">
                    {c.prizeRub?.toLocaleString() || 0} ₽ 
                    <span className="opacity-50 mx-1 font-normal">/</span>
                    ${c.prizeUsd || 0}
                  </span>
                </div>

                <p className="text-sm text-[var(--tg-theme-hint-color)] mb-5 line-clamp-2 font-medium leading-snug">
                  {c.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className={`text-[10px] uppercase tracking-widest font-black flex items-center gap-1 ${hasJoined ? 'text-green-500' : 'text-blue-600'}`}>
                    {hasJoined ? 'Вы в игре' : 'Попробовать удачу'} <ArrowRightIcon className="w-3 h-3" />
                  </span>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-full border-2 border-[var(--tg-theme-secondary-bg-color)] flex items-center justify-center">
                        <UserGroupIcon className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderReferralStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in">
      <button onClick={() => setStep(ContestStep.LIST)} className="mb-6 flex items-center gap-1 text-blue-600 font-black text-sm uppercase tracking-wider">
        <ChevronLeftIcon className="w-5 h-5" /> Назад
      </button>
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
          <div className="relative w-28 h-28 bg-white dark:bg-gray-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-blue-500/10">
            <LinkIcon className="w-14 h-14 text-blue-600" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-black leading-tight px-4">{selectedContest?.title}</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-lg px-6 font-medium leading-relaxed">
            Для участия в розыгрыше <span className="text-blue-600 font-black">{selectedContest?.prizeRub?.toLocaleString()} ₽</span> необходимо быть рефералом.
          </p>
        </div>
        
        <a 
          href={selectedContest?.referralLink} 
          target="_blank"
          className="w-full p-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-[2rem] flex items-center justify-between shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <LinkIcon className="w-7 h-7" />
            </div>
            <span className="font-black text-lg tracking-tight uppercase">РЕГИСТРАЦИЯ BEEF</span>
          </div>
          <ArrowRightIcon className="w-6 h-6 mr-1" />
        </a>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl text-sm animate-shake border border-red-100 dark:border-red-900/20 shadow-sm">
            <ExclamationCircleIcon className="w-6 h-6 flex-shrink-0" />
            <p className="text-left leading-tight font-black">{error}</p>
          </div>
        )}
      </div>

      <button
        disabled={isChecking}
        onClick={handleReferralCheck}
        className="w-full py-5 rounded-[2rem] font-black text-xl btn-primary flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
      >
        {isChecking ? (
          <>
            <ClockIcon className="w-6 h-6 animate-spin" />
            ПРОВЕРЯЕМ...
          </>
        ) : (
          'ПРОВЕРИТЬ'
        )}
      </button>
    </div>
  );

  const renderPayoutStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in">
      <div className="flex-1 space-y-8 pt-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight">ВЫПЛАТА</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-lg leading-snug font-medium">
            Укажите реквизиты, на которые мы отправим приз в случае победы.
          </p>
        </div>

        <div className="flex bg-[var(--tg-theme-secondary-bg-color)] p-2 rounded-[1.8rem] border border-gray-100 dark:border-gray-800 shadow-inner">
          <button 
            onClick={() => { setPayoutType('card'); setPayoutValue(''); }}
            className={`flex-1 py-4 rounded-2xl text-sm font-black transition-all ${payoutType === 'card' ? 'bg-white dark:bg-gray-800 shadow-xl text-blue-600' : 'opacity-40'}`}
          >
            КАРТА
          </button>
          <button 
            onClick={() => { setPayoutType('trc20'); setPayoutValue(''); }}
            className={`flex-1 py-4 rounded-2xl text-sm font-black transition-all ${payoutType === 'trc20' ? 'bg-white dark:bg-gray-800 shadow-xl text-green-600' : 'opacity-40'}`}
          >
            USDT (TRC20)
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-blue-500">
              {payoutType === 'card' ? <CreditCardIcon className="w-7 h-7 text-gray-400" /> : <CurrencyDollarIcon className="w-7 h-7 text-green-500" />}
            </div>
            <input 
              type="text"
              placeholder={payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес TRC20 кошелька"}
              value={payoutValue}
              onChange={(e) => setPayoutValue(e.target.value)}
              maxLength={payoutType === 'card' ? 19 : 42}
              className="w-full py-6 pl-16 pr-6 bg-[var(--tg-theme-secondary-bg-color)] rounded-[2rem] font-mono text-xl border-2 border-transparent focus:border-blue-500 transition-all outline-none shadow-sm"
            />
          </div>
          <div className="px-6">
            <p className="text-[10px] text-blue-600 uppercase tracking-widest font-black opacity-80">
              {payoutType === 'card' ? "Введите 16 цифр вашей карты без пробелов" : "Убедитесь, что адрес в сети Tron"}
            </p>
          </div>
        </div>
      </div>

      <button
        disabled={!validatePayout()}
        onClick={() => setStep(ContestStep.FINAL)}
        className="w-full py-6 rounded-[2rem] font-black text-2xl btn-primary disabled:opacity-20 disabled:grayscale transition-all shadow-2xl shadow-blue-500/30 active:scale-95 mb-4"
      >
        ДАЛЕЕ
      </button>
    </div>
  );

  const renderFinalStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in text-center">
      <div className="flex-1 flex flex-col justify-center space-y-10">
        <div className="relative w-36 h-36 mx-auto">
          <div className="absolute inset-0 bg-blue-500/30 rounded-[3rem] blur-3xl animate-pulse"></div>
          <div className="relative w-full h-full bg-white dark:bg-gray-900 rounded-[3rem] flex items-center justify-center border-2 border-blue-500/20 shadow-2xl">
            <CheckBadgeIcon className="w-20 h-20 text-blue-600" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight leading-none uppercase">ПОЧТИ ВСЁ!</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-lg leading-tight px-10 font-medium">
            Жми на кнопку ниже, чтобы занять свое место в розыгрыше приза <span className="text-blue-600 font-black">{selectedContest?.prizeRub?.toLocaleString()} ₽</span>
          </p>
        </div>
        <div className="p-6 bg-[var(--tg-theme-secondary-bg-color)] rounded-[2rem] mx-4 border border-blue-500/10 shadow-inner">
          <p className="text-[10px] text-blue-600 uppercase tracking-widest font-black mb-2 opacity-60">Ваш счет для зачисления:</p>
          <p className="font-mono text-lg break-all font-black text-[var(--tg-theme-text-color)]">{payoutValue}</p>
        </div>
      </div>

      <button
        disabled={isFinalizing}
        onClick={handleFinalParticipate}
        className="w-full py-7 rounded-[2.5rem] font-black text-2xl btn-primary shadow-[0_20px_40px_-10px_rgba(36,129,204,0.5)] flex items-center justify-center gap-4 active:scale-95 transition-all mb-4"
      >
        {isFinalizing ? <ClockIcon className="w-8 h-8 animate-spin" /> : 'ВСТУПИТЬ В ИГРУ'}
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in text-center justify-center space-y-10">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500/20 blur-[5rem] rounded-full animate-pulse"></div>
        <div className="relative w-44 h-44 bg-gradient-to-tr from-green-600 to-emerald-400 rounded-full flex items-center justify-center mx-auto text-white shadow-[0_25px_60px_-15px_rgba(16,185,129,0.5)]">
          <CheckBadgeIcon className="w-24 h-24 drop-shadow-xl" />
        </div>
      </div>
      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">ВЫ В СПИСКЕ!</h1>
        <p className="text-[var(--tg-theme-hint-color)] px-10 text-xl leading-relaxed font-medium">
          Твоя заявка принята. Итоги будут подведены в нашем канале. Удачи!
        </p>
      </div>
      <button 
        onClick={() => setStep(ContestStep.LIST)}
        className="mt-12 font-black text-blue-600 text-lg hover:opacity-70 transition-all flex items-center justify-center gap-2 mx-auto active:scale-90"
      >
        <ChevronLeftIcon className="w-6 h-6" /> К списку розыгрышей
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-[var(--tg-theme-bg-color)] select-none overflow-hidden text-[var(--tg-theme-text-color)] font-sans">
      {view === 'admin' ? renderAdminPanel() : (
        <>
          {step === ContestStep.LIST && renderContestList()}
          {step === ContestStep.REFERRAL && renderReferralStep()}
          {step === ContestStep.PAYOUT && renderPayoutStep()}
          {step === ContestStep.FINAL && renderFinalStep()}
          {step === ContestStep.SUCCESS && renderSuccess()}
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .animate-shake { animation: shake 0.15s ease-in-out 0s 2; }
        
        .shadow-3xl {
          box-shadow: 0 25px 60px -15px rgba(16, 185, 129, 0.4);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--tg-theme-button-color, #2481cc) 0%, #1e6fb0 100%);
          border: none;
        }

        input::placeholder, textarea::placeholder {
          opacity: 0.3;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default App;
