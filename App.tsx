
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
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const ADMIN_ID = 7946967720;
const STORAGE_KEY = 'beef_contests_v1';

const App: React.FC = () => {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [step, setStep] = useState<ContestStep>(ContestStep.LIST);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  
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

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setContests(JSON.parse(saved));
    } else {
      // Default initial contest
      const initial = [{
        id: 'default',
        title: 'Первый розыгрыш Beef',
        description: 'Участвуй и выиграй ценные призы!',
        referralLink: 'https://beef-way-one.com/c22082169',
        createdAt: Date.now()
      }];
      setContests(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
  }, []);

  const isAdmin = useMemo(() => user?.id === ADMIN_ID, [user]);

  const saveContests = (newContests: Contest[]) => {
    setContests(newContests);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContests));
  };

  const createContest = () => {
    if (!newTitle || !newLink) return;
    const contest: Contest = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      description: newDesc,
      referralLink: newLink,
      createdAt: Date.now()
    };
    saveContests([contest, ...contests]);
    setNewTitle('');
    setNewDesc('');
    setView('user');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const deleteContest = (id: string) => {
    saveContests(contests.filter(c => c.id !== id));
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  const startParticipation = (contest: Contest) => {
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
    setIsFinalizing(true);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
    setTimeout(() => {
      setIsFinalizing(false);
      setStep(ContestStep.SUCCESS);
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    }, 1500);
  };

  const renderAdminPanel = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in overflow-y-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ShieldCheckIcon className="w-8 h-8 text-orange-500" />
          Админ-панель
        </h1>
        <button onClick={() => setView('user')} className="text-blue-500 font-bold">Выйти</button>
      </div>

      <div className="bg-[var(--tg-theme-secondary-bg-color)] p-5 rounded-3xl space-y-4 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <PlusIcon className="w-5 h-5" /> Новый розыгрыш
        </h2>
        <input 
          placeholder="Название розыгрыша" 
          value={newTitle} 
          onChange={e => setNewTitle(e.target.value)}
          className="w-full p-3 bg-white dark:bg-black rounded-xl border border-gray-200"
        />
        <textarea 
          placeholder="Описание" 
          value={newDesc} 
          onChange={e => setNewDesc(e.target.value)}
          className="w-full p-3 bg-white dark:bg-black rounded-xl border border-gray-200 h-20"
        />
        <input 
          placeholder="Реферальная ссылка" 
          value={newLink} 
          onChange={e => setNewLink(e.target.value)}
          className="w-full p-3 bg-white dark:bg-black rounded-xl border border-gray-200"
        />
        <button 
          onClick={createContest}
          disabled={!newTitle || !newLink}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-50"
        >
          Создать розыгрыш
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Список розыгрышей</h2>
        {contests.map(c => (
          <div key={c.id} className="p-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl flex justify-between items-center shadow-sm">
            <div>
              <p className="font-bold">{c.title}</p>
              <p className="text-xs text-[var(--tg-theme-hint-color)]">Создан: {new Date(c.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => deleteContest(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContestList = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in overflow-y-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <TrophyIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black">Розыгрыши</h1>
            <p className="text-xs text-[var(--tg-theme-hint-color)]">Активные события</p>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setView('admin')}
            className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full active:scale-90 transition-transform"
          >
            <ShieldCheckIcon className="w-6 h-6 text-blue-500" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {contests.length === 0 ? (
          <div className="text-center py-20 text-[var(--tg-theme-hint-color)]">
            <UserGroupIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>Нет активных розыгрышей</p>
          </div>
        ) : (
          contests.map(c => (
            <div 
              key={c.id} 
              onClick={() => startParticipation(c)}
              className="p-5 bg-[var(--tg-theme-secondary-bg-color)] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 -mr-8 -mt-8 rounded-full"></div>
              <h3 className="text-lg font-black mb-1">{c.title}</h3>
              <p className="text-sm text-[var(--tg-theme-hint-color)] mb-4 line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-black text-blue-500 flex items-center gap-1">
                  Участвовать <ArrowRightIcon className="w-3 h-3" />
                </span>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full border-2 border-[var(--tg-theme-secondary-bg-color)]"></div>
                  <div className="w-6 h-6 bg-blue-200 rounded-full border-2 border-[var(--tg-theme-secondary-bg-color)]"></div>
                  <div className="w-6 h-6 bg-blue-300 rounded-full border-2 border-[var(--tg-theme-secondary-bg-color)]"></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderReferralStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in">
      <button onClick={() => setStep(ContestStep.LIST)} className="mb-4 flex items-center gap-1 text-blue-500 font-bold">
        <ChevronLeftIcon className="w-5 h-5" /> Назад
      </button>
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-[2.5rem] flex items-center justify-center shadow-inner">
          <LinkIcon className="w-12 h-12 text-blue-500" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black">{selectedContest?.title}</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-lg px-6 leading-tight">
            Стань рефералом <span className="text-blue-500 font-bold">Beef</span> для участия.
          </p>
        </div>
        
        <a 
          href={selectedContest?.referralLink} 
          target="_blank"
          className="w-full p-5 bg-[var(--tg-theme-secondary-bg-color)] rounded-3xl flex items-center justify-between border-2 border-blue-500 shadow-xl shadow-blue-500/10 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
              <LinkIcon className="w-6 h-6" />
            </div>
            <span className="font-black text-blue-500">РЕГИСТРАЦИЯ BEEF</span>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-blue-500" />
        </a>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl text-sm animate-shake border border-red-100 dark:border-red-900/20">
            <ExclamationCircleIcon className="w-6 h-6 flex-shrink-0" />
            <p className="text-left leading-tight font-bold">{error}</p>
          </div>
        )}
      </div>

      <button
        disabled={isChecking}
        onClick={handleReferralCheck}
        className="w-full py-5 rounded-3xl font-black text-xl btn-primary flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
      >
        {isChecking ? (
          <>
            <ClockIcon className="w-6 h-6 animate-spin" />
            ПРОВЕРКА...
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
          <h1 className="text-3xl font-black">Реквизиты</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-lg leading-tight">
            Куда отправить твой выигрыш в случае удачи?
          </p>
        </div>

        <div className="flex bg-[var(--tg-theme-secondary-bg-color)] p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
          <button 
            onClick={() => { setPayoutType('card'); setPayoutValue(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${payoutType === 'card' ? 'bg-white dark:bg-black shadow-lg shadow-gray-200/50 dark:shadow-none' : 'opacity-40'}`}
          >
            КАРТА
          </button>
          <button 
            onClick={() => { setPayoutType('trc20'); setPayoutValue(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${payoutType === 'trc20' ? 'bg-white dark:bg-black shadow-lg shadow-gray-200/50 dark:shadow-none' : 'opacity-40'}`}
          >
            TRC20
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-blue-500">
              {payoutType === 'card' ? <CreditCardIcon className="w-7 h-7 text-gray-400" /> : <CurrencyDollarIcon className="w-7 h-7 text-green-500" />}
            </div>
            <input 
              type="text"
              placeholder={payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес кошелька TRC20"}
              value={payoutValue}
              onChange={(e) => setPayoutValue(e.target.value)}
              maxLength={payoutType === 'card' ? 19 : 42}
              className="w-full py-5 pl-14 pr-5 bg-[var(--tg-theme-secondary-bg-color)] rounded-3xl font-mono text-xl border-2 border-transparent focus:border-blue-500 transition-all outline-none"
            />
          </div>
          <div className="px-5">
            <p className="text-[10px] text-blue-500 uppercase tracking-[0.2em] font-black opacity-60">
              {payoutType === 'card' ? "Введите 16 цифр вашей карты" : "Введите корректный адрес сети Tron"}
            </p>
          </div>
        </div>
      </div>

      <button
        disabled={!validatePayout()}
        onClick={() => setStep(ContestStep.FINAL)}
        className="w-full py-5 rounded-3xl font-black text-xl btn-primary disabled:opacity-20 disabled:grayscale transition-all shadow-xl shadow-blue-500/20 active:scale-95"
      >
        ПРОДОЛЖИТЬ
      </button>
    </div>
  );

  const renderFinalStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in text-center">
      <div className="flex-1 flex flex-col justify-center space-y-8">
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 bg-blue-500/20 rounded-[2.5rem] blur-2xl animate-pulse"></div>
          <div className="relative w-full h-full bg-blue-100 dark:bg-blue-900/30 rounded-[2.5rem] flex items-center justify-center border-2 border-blue-500/20 shadow-inner">
            <CheckBadgeIcon className="w-16 h-16 text-blue-500" />
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight">ФИНАЛ!</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-lg leading-tight px-10">
            Все условия выполнены. Жми кнопку ниже для участия в <br/>
            <span className="text-[var(--tg-theme-text-color)] font-black italic">{selectedContest?.title}</span>
          </p>
        </div>
        <div className="p-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl mx-6 border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-[var(--tg-theme-hint-color)] uppercase tracking-widest font-black mb-1">Твои реквизиты:</p>
          <p className="font-mono text-sm break-all font-bold">{payoutValue}</p>
        </div>
      </div>

      <button
        disabled={isFinalizing}
        onClick={handleFinalParticipate}
        className="w-full py-6 rounded-[2rem] font-black text-2xl btn-primary shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3 active:scale-95 transition-all"
      >
        {isFinalizing ? <ClockIcon className="w-8 h-8 animate-spin" /> : 'УЧАСТВОВАТЬ'}
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in text-center justify-center space-y-10">
      <div className="relative">
        <div className="absolute inset-0 bg-green-400 blur-[4rem] opacity-30 rounded-full animate-pulse"></div>
        <div className="relative w-40 h-40 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full flex items-center justify-center mx-auto text-white shadow-3xl">
          <CheckBadgeIcon className="w-24 h-24 drop-shadow-lg" />
        </div>
      </div>
      <div className="space-y-4">
        <h1 className="text-4xl font-black tracking-tight">ТЫ В ДЕЛЕ!</h1>
        <p className="text-[var(--tg-theme-hint-color)] px-8 text-xl leading-snug">
          Твоя заявка успешно зарегистрирована. Желаем удачи в розыгрыше!
        </p>
      </div>
      <button 
        onClick={() => setStep(ContestStep.LIST)}
        className="mt-8 font-black text-blue-500 text-lg hover:opacity-70 transition-opacity flex items-center justify-center gap-2 mx-auto"
      >
        <ChevronLeftIcon className="w-6 h-6" /> Вернуться к списку
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-[var(--tg-theme-bg-color)] select-none overflow-hidden text-[var(--tg-theme-text-color)]">
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
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-shake { animation: shake 0.15s ease-in-out 0s 2; }
        
        .shadow-3xl {
          box-shadow: 0 20px 50px -10px rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
};

export default App;
