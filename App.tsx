
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
// Используем публичный анонимный ключ-значение для демонстрации "общих" данных.
// В реальном проекте на Vercel лучше использовать Vercel KV.
const DB_URL = 'https://kvdb.io/A9S7nJm6k5Lp3Q2w1E4rT7/beef_contests_global'; 
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

  const fetchContests = async () => {
    try {
      const res = await fetch(DB_URL);
      if (res.ok) {
        const data = await res.json();
        setContests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch contests", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveContestsGlobal = async (updated: Contest[]) => {
    try {
      await fetch(DB_URL, {
        method: 'POST',
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Failed to save contests globally", e);
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

    const participations = localStorage.getItem(PARTICIPATION_KEY);
    if (participations) {
      setParticipatedIds(JSON.parse(participations));
    }

    fetch('https://open.er-api.com/v6/latest/RUB')
      .then(res => res.json())
      .then(data => {
        if (data.rates?.USD) setUsdRate(data.rates.USD);
      });
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
    
    setNewTitle('');
    setNewDesc('');
    setNewPrizeRub('');
    setView('user');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const deleteContest = async (id: string) => {
    const updated = contests.filter(c => c.id !== id);
    setContests(updated);
    await saveContestsGlobal(updated);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  const startParticipation = (contest: Contest) => {
    setSelectedContest(contest);
    if (participatedIds.includes(contest.id)) {
      setStep(ContestStep.SUCCESS);
      return;
    }
    setStep(ContestStep.REFERRAL);
    setCheckAttempts(0);
    setError(null);
  };

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
    }, 3000); // 3 seconds cooldown
  };

  const validatePayout = () => {
    if (payoutType === 'card') return /^\d{16,19}$/.test(payoutValue.replace(/\s/g, ''));
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
          Админ-центр
        </h1>
        <button onClick={() => setView('user')} className="text-blue-500 font-bold p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">Выйти</button>
      </div>

      <div className="bg-[var(--tg-theme-secondary-bg-color)] p-6 rounded-[2rem] space-y-4 mb-8 border border-gray-200 dark:border-gray-800 shadow-lg">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <PlusIcon className="w-5 h-5 text-blue-500" /> Создать общий розыгрыш
        </h2>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black px-1 opacity-60">Заголовок</label>
            <input 
              placeholder="Название розыгрыша" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)}
              className="w-full p-4 bg-white dark:bg-gray-950 text-black dark:text-white rounded-2xl border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black px-1 opacity-60">Описание</label>
            <textarea 
              placeholder="Условия или подробности..." 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)}
              className="w-full p-4 bg-white dark:bg-gray-950 text-black dark:text-white rounded-2xl border border-gray-300 dark:border-gray-700 h-24 focus:border-blue-500 outline-none transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black px-1 opacity-60">Приз (RUB)</label>
              <input 
                type="number"
                placeholder="5000" 
                value={newPrizeRub} 
                onChange={e => setNewPrizeRub(e.target.value)}
                className="w-full p-4 bg-white dark:bg-gray-950 text-black dark:text-white rounded-2xl border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none transition-all font-black text-blue-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black px-1 opacity-30">Приз (USD)</label>
              <div className="w-full p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-transparent font-black text-gray-500">
                ${newPrizeRub ? Math.round(parseFloat(newPrizeRub) * usdRate) : 0}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black px-1 opacity-60">Ссылка Beef</label>
            <input 
              placeholder="https://beef-way-one.com/..." 
              value={newLink} 
              onChange={e => setNewLink(e.target.value)}
              className="w-full p-4 bg-white dark:bg-gray-950 text-black dark:text-white rounded-2xl border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none transition-all font-medium"
            />
          </div>
        </div>

        <button 
          onClick={createContest}
          disabled={!newTitle || !newLink || !newPrizeRub}
          className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg active:scale-95 transition-all disabled:opacity-20 shadow-xl shadow-blue-600/20"
        >
          ОПУБЛИКОВАТЬ ДЛЯ ВСЕХ
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold px-1">Управление</h2>
        {contests.map(c => (
          <div key={c.id} className="p-5 bg-[var(--tg-theme-secondary-bg-color)] rounded-3xl flex justify-between items-center border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex-1 mr-4">
              <p className="font-black text-lg leading-tight">{c.title}</p>
              <p className="text-xs font-bold text-blue-500">{c.prizeRub?.toLocaleString()} ₽ / ${c.prizeUsd}</p>
            </div>
            <button onClick={() => deleteContest(c.id)} className="p-3 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl active:scale-90 transition-all">
              <TrashIcon className="w-6 h-6" />
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
          <div className="w-14 h-14 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl shadow-blue-600/40">
            <TrophyIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black leading-none mb-1">Beef Contest</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-500">Live Events</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setView('admin')} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl active:scale-90 transition-transform">
            <ShieldCheckIcon className="w-7 h-7 text-blue-600" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center opacity-30">
          <ClockIcon className="w-10 h-10 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {contests.length === 0 ? (
            <div className="text-center py-20 opacity-20">
              <UserGroupIcon className="w-24 h-24 mx-auto mb-4" />
              <p className="font-black text-xl">Розыгрышей пока нет</p>
            </div>
          ) : (
            contests.map(c => {
              const hasJoined = participatedIds.includes(c.id);
              return (
                <div 
                  key={c.id} 
                  onClick={() => startParticipation(c)}
                  className={`p-6 bg-[var(--tg-theme-secondary-bg-color)] rounded-[2.5rem] border-2 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group ${hasJoined ? 'border-green-500/30' : 'border-transparent'}`}
                >
                  {hasJoined && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white px-5 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 z-10">
                      <CheckBadgeIcon className="w-4 h-4" /> ВЫ УЧАСТВУЕТЕ
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-black pr-12 leading-tight mb-3">{c.title}</h3>
                  
                  <div className="flex items-center gap-2 mb-4 bg-blue-600/10 w-fit px-4 py-1.5 rounded-full border border-blue-600/5">
                    <BanknotesIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-base font-black text-blue-600">
                      {c.prizeRub?.toLocaleString()} ₽ 
                      <span className="opacity-30 mx-2 font-normal">|</span>
                      ${c.prizeUsd}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--tg-theme-hint-color)] mb-6 line-clamp-2 font-medium leading-relaxed">
                    {c.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2 ${hasJoined ? 'text-green-500' : 'text-blue-600'}`}>
                      {hasJoined ? 'СТАТУС: ПОДТВЕРЖДЕНО' : 'УЧАСТВОВАТЬ СЕЙЧАС'} <ArrowRightIcon className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-9 h-9 bg-gray-200 dark:bg-gray-800 rounded-full border-4 border-[var(--tg-theme-secondary-bg-color)] flex items-center justify-center">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  const renderReferralStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in">
      <button onClick={() => setStep(ContestStep.LIST)} className="mb-6 flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
        <ChevronLeftIcon className="w-5 h-5" /> Назад к списку
      </button>
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-[4rem] rounded-full"></div>
          <div className="relative w-32 h-32 bg-white dark:bg-gray-900 rounded-[3rem] flex items-center justify-center shadow-2xl border border-blue-500/10">
            <LinkIcon className="w-16 h-16 text-blue-600" />
          </div>
        </div>
        <div className="space-y-4 px-4">
          <h1 className="text-3xl font-black leading-tight">{selectedContest?.title}</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-lg font-medium leading-relaxed opacity-80">
            Для участия в розыгрыше <span className="text-blue-600 font-black">{selectedContest?.prizeRub?.toLocaleString()} ₽</span> вы должны быть в команде Beef.
          </p>
        </div>
        
        <a 
          href={selectedContest?.referralLink} 
          target="_blank"
          className="w-full p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-blue-600/30 active:scale-[0.97] transition-all"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <LinkIcon className="w-8 h-8" />
            </div>
            <span className="font-black text-xl tracking-tight">РЕГИСТРАЦИЯ BEEF</span>
          </div>
          <ArrowRightIcon className="w-7 h-7 mr-2 opacity-50" />
        </a>

        {error && (
          <div className="flex items-center gap-3 p-5 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-3xl text-sm animate-shake border border-red-100 dark:border-red-900/20">
            <ExclamationCircleIcon className="w-7 h-7 flex-shrink-0" />
            <p className="text-left leading-tight font-black">{error}</p>
          </div>
        )}
      </div>

      <button
        disabled={isChecking}
        onClick={handleReferralCheck}
        className="w-full py-6 rounded-[2.5rem] font-black text-2xl btn-primary flex items-center justify-center gap-4 disabled:opacity-50 transition-all shadow-2xl shadow-blue-600/20 active:scale-95 mb-4"
      >
        {isChecking ? <ClockIcon className="w-8 h-8 animate-spin" /> : 'ПРОВЕРИТЬ РЕГИСТРАЦИЮ'}
      </button>
    </div>
  );

  const renderPayoutStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in">
      <div className="flex-1 space-y-10 pt-10">
        <div className="space-y-4">
          <h1 className="text-5xl font-black tracking-tighter">ВЫПЛАТА</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-xl leading-snug font-medium opacity-80">
            Укажите реквизиты. Если вы выиграете, мы отправим деньги сюда.
          </p>
        </div>

        <div className="flex bg-[var(--tg-theme-secondary-bg-color)] p-2.5 rounded-[2.2rem] border border-gray-100 dark:border-gray-800 shadow-inner">
          <button 
            onClick={() => { setPayoutType('card'); setPayoutValue(''); }}
            className={`flex-1 py-5 rounded-3xl text-sm font-black tracking-widest transition-all ${payoutType === 'card' ? 'bg-white dark:bg-gray-800 shadow-2xl text-blue-600' : 'opacity-30'}`}
          >
            КАРТА (RUB)
          </button>
          <button 
            onClick={() => { setPayoutType('trc20'); setPayoutValue(''); }}
            className={`flex-1 py-5 rounded-3xl text-sm font-black tracking-widest transition-all ${payoutType === 'trc20' ? 'bg-white dark:bg-gray-800 shadow-2xl text-green-600' : 'opacity-30'}`}
          >
            USDT (TRC20)
          </button>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute left-7 top-1/2 -translate-y-1/2 transition-all group-focus-within:text-blue-600">
              {payoutType === 'card' ? <CreditCardIcon className="w-8 h-8 text-gray-300" /> : <CurrencyDollarIcon className="w-8 h-8 text-green-500" />}
            </div>
            <input 
              type="text"
              placeholder={payoutType === 'card' ? "0000 0000 0000 0000" : "Адрес кошелька TRC20"}
              value={payoutValue}
              onChange={(e) => setPayoutValue(e.target.value)}
              className="w-full py-7 pl-20 pr-8 bg-[var(--tg-theme-secondary-bg-color)] rounded-[2.5rem] font-mono text-2xl border-2 border-transparent focus:border-blue-600 transition-all outline-none shadow-sm placeholder:opacity-20"
            />
          </div>
          <div className="px-8">
            <p className="text-[11px] text-blue-600 uppercase tracking-[0.25em] font-black opacity-60">
              {payoutType === 'card' ? "Введите полный номер карты" : "Сеть TRON (TRC20) обязательна"}
            </p>
          </div>
        </div>
      </div>

      <button
        disabled={!validatePayout()}
        onClick={() => setStep(ContestStep.FINAL)}
        className="w-full py-7 rounded-[2.5rem] font-black text-2xl btn-primary disabled:opacity-10 disabled:grayscale transition-all shadow-2xl shadow-blue-600/30 active:scale-95 mb-6"
      >
        ПОДТВЕРДИТЬ
      </button>
    </div>
  );

  const renderFinalStep = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in text-center">
      <div className="flex-1 flex flex-col justify-center space-y-12">
        <div className="relative w-40 h-40 mx-auto">
          <div className="absolute inset-0 bg-blue-600/30 rounded-[3.5rem] blur-[5rem] animate-pulse"></div>
          <div className="relative w-full h-full bg-white dark:bg-gray-900 rounded-[3.5rem] flex items-center justify-center border-2 border-blue-600/20 shadow-2xl">
            <CheckBadgeIcon className="w-24 h-24 text-blue-600" />
          </div>
        </div>
        <div className="space-y-5 px-6">
          <h1 className="text-5xl font-black tracking-tighter leading-none uppercase">ГОТОВО!</h1>
          <p className="text-[var(--tg-theme-hint-color)] text-xl leading-relaxed font-medium opacity-80">
            Остался один клик до участия в <br/> <span className="text-blue-600 font-black italic">{selectedContest?.title}</span>
          </p>
        </div>
        <div className="p-8 bg-[var(--tg-theme-secondary-bg-color)] rounded-[3rem] mx-4 border border-blue-600/10 shadow-inner">
          <p className="text-[11px] text-blue-600 uppercase tracking-widest font-black mb-3 opacity-40">РЕКВИЗИТЫ ДЛЯ ПРИЗА:</p>
          <p className="font-mono text-xl break-all font-black text-[var(--tg-theme-text-color)]">{payoutValue}</p>
        </div>
      </div>

      <button
        disabled={isFinalizing}
        onClick={handleFinalParticipate}
        className="w-full py-8 rounded-[3rem] font-black text-3xl btn-primary shadow-[0_30px_60px_-15px_rgba(36,129,204,0.6)] flex items-center justify-center gap-5 active:scale-95 transition-all mb-6"
      >
        {isFinalizing ? <ClockIcon className="w-10 h-10 animate-spin" /> : 'ВСТУПИТЬ'}
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col h-full p-6 animate-fade-in text-center justify-center space-y-12">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500/30 blur-[6rem] rounded-full animate-pulse"></div>
        <div className="relative w-48 h-48 bg-gradient-to-tr from-green-600 to-emerald-400 rounded-full flex items-center justify-center mx-auto text-white shadow-[0_30px_70px_-20px_rgba(16,185,129,0.6)]">
          <CheckBadgeIcon className="w-28 h-28 drop-shadow-2xl" />
        </div>
      </div>
      <div className="space-y-5">
        <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">УДАЧИ!</h1>
        <p className="text-[var(--tg-theme-hint-color)] px-12 text-2xl leading-relaxed font-medium">
          Вы уже участвуете в этом розыгрыше. Результаты скоро в канале!
        </p>
      </div>
      <button 
        onClick={() => setStep(ContestStep.LIST)}
        className="mt-16 font-black text-blue-600 text-xl hover:opacity-70 transition-all flex items-center justify-center gap-3 mx-auto active:scale-90"
      >
        <ChevronLeftIcon className="w-7 h-7" /> К ДРУГИМ РОЗЫГРЫШАМ
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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.97) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-fade-in { animation: fade-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-shake { animation: shake 0.1s ease-in-out 0s 3; }
        
        .btn-primary {
          background: linear-gradient(135deg, #2481cc 0%, #1a65a3 100%);
          border: none;
        }

        input::placeholder, textarea::placeholder {
          color: inherit;
          opacity: 0.15;
          font-weight: 700;
        }

        input, textarea {
          -webkit-appearance: none;
        }
      `}</style>
    </div>
  );
};

export default App;
