
import React, { useState, useEffect } from 'react';
import { TelegramUser, ContestStep, PayoutType } from './types';
import { 
  CheckBadgeIcon, 
  CreditCardIcon, 
  CurrencyDollarIcon, 
  ExclamationCircleIcon,
  ArrowRightIcon,
  LinkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [step, setStep] = useState<ContestStep>(ContestStep.REFERRAL);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [payoutType, setPayoutType] = useState<PayoutType>('card');
  const [payoutValue, setPayoutValue] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    // Correctly check and use the Telegram WebApp instance to avoid "Telegram does not exist" and narrowing issues
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
    }
  }, []);

  const handleReferralCheck = () => {
    setIsChecking(true);
    setError(null);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');

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
    }, 5000);
  };

  const validatePayout = () => {
    if (payoutType === 'card') {
      return /^\d{16}$/.test(payoutValue.replace(/\s/g, ''));
    }
    // Simple TRC20 validation: starts with T, length 34
    return /^T[a-zA-Z0-9]{33}$/.test(payoutValue.trim());
  };

  const handleFinalParticipate = () => {
    setIsFinalizing(true);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
    
    // Simulate API call
    setTimeout(() => {
      setIsFinalizing(false);
      setStep(ContestStep.SUCCESS);
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    }, 2000);
  };

  const renderReferralStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in">
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
        <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center">
          <LinkIcon className="w-10 h-10 text-blue-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Шаг 1: Регистрация</h1>
          <p className="text-[var(--tg-theme-hint-color)]">
            Для участия необходимо быть рефералом в системе Beef.
          </p>
        </div>
        
        <a 
          href="https://beef-way-one.com/c22082169" 
          target="_blank"
          className="w-full p-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-transform"
        >
          <span className="font-semibold text-blue-500">Зарегистрироваться на Beef</span>
          <ArrowRightIcon className="w-5 h-5 text-blue-500" />
        </a>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm animate-shake">
            <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
            <p className="text-left leading-tight font-medium">{error}</p>
          </div>
        )}
      </div>

      <button
        disabled={isChecking}
        onClick={handleReferralCheck}
        className="w-full py-4 rounded-2xl font-bold text-lg btn-primary flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
      >
        {isChecking ? (
          <>
            <ClockIcon className="w-5 h-5 animate-spin" />
            Проверка...
          </>
        ) : (
          'Проверить'
        )}
      </button>
    </div>
  );

  const renderPayoutStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in">
      <div className="flex-1 space-y-8 pt-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Шаг 2: Куда отправить выигрыш?</h1>
          <p className="text-[var(--tg-theme-hint-color)]">
            Введите реквизиты для получения приза в случае победы.
          </p>
        </div>

        <div className="flex bg-[var(--tg-theme-secondary-bg-color)] p-1 rounded-xl">
          <button 
            onClick={() => { setPayoutType('card'); setPayoutValue(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${payoutType === 'card' ? 'bg-white shadow-sm' : 'opacity-50'}`}
          >
            Банковская карта
          </button>
          <button 
            onClick={() => { setPayoutType('trc20'); setPayoutValue(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${payoutType === 'trc20' ? 'bg-white shadow-sm' : 'opacity-50'}`}
          >
            TRC20 (USDT)
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              {payoutType === 'card' ? <CreditCardIcon className="w-6 h-6 text-gray-400" /> : <CurrencyDollarIcon className="w-6 h-6 text-green-500" />}
            </div>
            <input 
              type="text"
              placeholder={payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес кошелька TRC20"}
              value={payoutValue}
              onChange={(e) => setPayoutValue(e.target.value)}
              maxLength={payoutType === 'card' ? 19 : 42}
              className="w-full py-4 pl-12 pr-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl font-mono text-lg"
            />
          </div>
          <p className="text-[10px] text-[var(--tg-theme-hint-color)] px-2 uppercase tracking-wider font-bold">
            {payoutType === 'card' ? "Введите 16 цифр карты" : "Введите адрес, начинающийся на T"}
          </p>
        </div>
      </div>

      <button
        disabled={!validatePayout()}
        onClick={() => setStep(ContestStep.FINAL)}
        className="w-full py-4 rounded-2xl font-bold text-lg btn-primary disabled:opacity-30 disabled:grayscale transition-all"
      >
        Продолжить
      </button>
    </div>
  );

  const renderFinalStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in text-center">
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckBadgeIcon className="w-14 h-14 text-green-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black">Почти готово!</h1>
          <p className="text-[var(--tg-theme-hint-color)]">
            Вы подтвердили реферала и указали реквизиты: <br/>
            <span className="text-[var(--tg-theme-text-color)] font-mono break-all">{payoutValue}</span>
          </p>
        </div>
      </div>

      <button
        disabled={isFinalizing}
        onClick={handleFinalParticipate}
        className="w-full py-4 rounded-2xl font-bold text-xl btn-primary shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
      >
        {isFinalizing ? <ClockIcon className="w-6 h-6 animate-spin" /> : 'УЧАСТВОВАТЬ'}
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in text-center justify-center space-y-8">
      <div className="relative">
        <div className="absolute inset-0 bg-green-400 blur-3xl opacity-20 rounded-full animate-pulse"></div>
        <div className="relative w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-2xl">
          <CheckBadgeIcon className="w-20 h-20" />
        </div>
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Вы в деле!</h1>
        <p className="text-[var(--tg-theme-hint-color)] px-4 text-lg">
          Ваша заявка принята. Ожидайте результатов конкурса в официальном канале.
        </p>
      </div>
      <button 
        onClick={() => window.Telegram?.WebApp?.close()}
        className="mt-8 font-bold text-blue-500 hover:opacity-70 transition-opacity"
      >
        Закрыть приложение
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-[var(--tg-theme-bg-color)] select-none overflow-hidden">
      {step === ContestStep.REFERRAL && renderReferralStep()}
      {step === ContestStep.PAYOUT && renderPayoutStep()}
      {step === ContestStep.FINAL && renderFinalStep()}
      {step === ContestStep.SUCCESS && renderSuccess()}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default App;
