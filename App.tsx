
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TelegramUser, ContestStep, PayoutType, Contest, WinnerInfo, UserProfile } from './types';
import { BotParticipant } from './bots';
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
  UsersIcon,
  GiftIcon,
  UserCircleIcon,
  WalletIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
  StarIcon,
  FlagIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const KV_REST_API_URL = 'https://golden-hound-18396.upstash.io'; 
const KV_REST_API_TOKEN = 'AUfcAAIncDJiMzQwNjMwYzUzOGM0NDI4YjQyNWQ3NjAzZDYwNDk2ZHAyMTgzOTY'; 

const DB_KEY = 'beef_contests_v6_final';
const ADMIN_ID = 7946967720;
const PROFILE_KEY = 'beef_user_profile_final';
const PARTICIPATION_KEY = 'beef_user_participations_final';
const GLOBAL_PROFILES_KEY = 'beef_global_profiles_v3'; 

const BEEF_LINK = 'https://v.beef.gg/LUDOVAR';

const formatCard = (val: string) => {
  const v = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/.{1,4}/g);
  return matches ? matches.join(' ') : v;
};

const getCardType = (val: string) => {
  const first = val.replace(/\s/g, '').charAt(0);
  if (first === '4') return { label: 'VISA', color: 'text-blue-600' };
  if (first === '5') return { label: 'MASTERCARD', color: 'text-orange-500' };
  if (first === '2') return { label: 'МИР', color: 'text-green-600' };
  if (first === '3') return { label: 'AMEX', color: 'text-cyan-600' };
  return null;
};

const getStableCard = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const p2 = Math.abs((hash % 9000) + 1000);
  const p3 = Math.abs(((hash >> 8) % 9000) + 1000);
  const p4 = Math.abs(((hash >> 16) % 9000) + 1000);
  return `4432 ${p2} ${p3} ${p4}`;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contests' | 'profile'>('contests');
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [step, setStep] = useState<ContestStep>(ContestStep.LIST);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [botsPool, setBotsPool] = useState<BotParticipant[]>([]);
  const [participatedIds, setParticipatedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ payoutValue: '', payoutType: 'card', isReferralVerified: false, participationCount: 0, totalWon: 0 });
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [globalProfiles, setGlobalProfiles] = useState<any[]>([]);
  const [viewedProfile, setViewedProfile] = useState<any | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPrizeRub, setNewPrizeRub] = useState<string>('');
  const [newWinnerCount, setNewWinnerCount] = useState<number>(1);
  const [adminSelectedContest, setAdminSelectedContest] = useState<Contest | null>(null);
  const [realParticipants, setRealParticipants] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [payoutInput, setPayoutInput] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const [isPickingWinner, setIsPickingWinner] = useState(false);
  const [pickingStatus, setPickingStatus] = useState('Анализируем активности...');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); if (tg.initDataUnsafe?.user) setUser(tg.initDataUnsafe.user); }
    fetchContests();
    fetchBotsAndProfiles();
    const pIds = localStorage.getItem(PARTICIPATION_KEY);
    if (pIds) setParticipatedIds(JSON.parse(pIds));
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  const fetchContests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${DB_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const data = await res.json();
      if (data.result) setContests(JSON.parse(data.result));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchBotsAndProfiles = async () => {
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${GLOBAL_PROFILES_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const data = await res.json();
      if (data.result) {
        const rawProfiles = JSON.parse(data.result);
        setGlobalProfiles(rawProfiles);
        
        // Мапим профили в пул ботов (фильтруем тех, у кого нет Telegram ID, т.е. ботов из списка)
        const mappedBots: BotParticipant[] = rawProfiles.map((p: any) => ({
          id: p.name,
          name: p.name,
          registeredAt: p.registeredAt || '01.01.2025',
          depositAmount: p.depositAmount || 0,
          payout: p.creditCard || getStableCard(p.name),
          isBot: true,
          participationCount: p.participationCount || 0,
          totalWon: p.totalWon || 0
        }));
        setBotsPool(mappedBots);
      }
    } catch (e) { console.error(e); }
  };

  const saveGlobalProfilesUpdate = async (updated: any[]) => {
    setGlobalProfiles(updated);
    try {
      await fetch(`${KV_REST_API_URL}/set/${GLOBAL_PROFILES_KEY}`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, 
        body: JSON.stringify(updated) 
      });
    } catch (e) { console.error(e); }
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

  const saveProfile = (updated: UserProfile) => {
    setProfile(updated);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  };

  const isAdmin = useMemo(() => user?.id === ADMIN_ID, [user]);

  const createContest = async () => {
    if (!newTitle || !newPrizeRub) return;
    const prize = parseInt(newPrizeRub);
    const newContest: Contest = {
      id: Date.now().toString(),
      title: newTitle,
      description: 'Присоединяйся к розыгрышу от Лудовара!',
      referralLink: BEEF_LINK,
      prizeRub: prize,
      prizeUsd: Math.round(prize * 0.011),
      createdAt: Date.now(),
      participantCount: 0,
      winnerCount: newWinnerCount,
    };
    const updated = [newContest, ...contests];
    await saveContestsGlobal(updated);
    setNewTitle('');
    setNewPrizeRub('');
    setNewWinnerCount(1);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const fetchParticipantsForAdmin = async (contestId: string) => {
    const key = `participants_${contestId}`;
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${key}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const data = await res.json();
      if (data.result) setRealParticipants(JSON.parse(data.result));
      else setRealParticipants([]);
    } catch (e) { console.error(e); }
  };

  const handleStartContest = (c: Contest) => {
    setSelectedContest(c);
    setError(null);
    setCheckAttempts(0);
    if (participatedIds.includes(c.id) || c.isCompleted) setStep(ContestStep.SUCCESS);
    else if (!profile.isReferralVerified) setStep(ContestStep.REFERRAL);
    else if (!profile.payoutValue) {
      setPayoutInput('');
      setStep(ContestStep.PAYOUT);
    }
    else setStep(ContestStep.FINAL);
  };

  const drawWinners = async (contestId: string) => {
    const contest = contests.find(c => c.id === contestId)!;
    const key = `participants_${contestId}`;
    const partRes = await fetch(`${KV_REST_API_URL}/get/${key}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
    const partData = await partRes.json();
    const pool = partData.result ? JSON.parse(partData.result) : [];
    
    const winners: WinnerInfo[] = [];
    const prizePerWinner = Math.floor(contest.prizeRub / contest.winnerCount);

    // Выбираем победителей из общего пула участников конкурса
    const tempPool = [...pool];
    for(let i=0; i < Math.min(contest.winnerCount, tempPool.length); i++) {
      const luckyIndex = Math.floor(Math.random() * tempPool.length);
      const lucky = tempPool[luckyIndex];
      
      winners.push({ 
        name: lucky.name, 
        payoutValue: lucky.payout || getStableCard(lucky.name), 
        payoutType: (lucky.type || lucky.payoutType || 'card') as PayoutType, 
        registeredAt: lucky.registeredAt, 
        depositAmount: lucky.depositAmount,
        prizeWon: prizePerWinner
      });
      tempPool.splice(luckyIndex, 1);
    }

    setPickingStatus('Анализируем активности...');
    setIsPickingWinner(true);

    const statusSteps = ['Проверка условий...', 'Случайный выбор...', 'Запись в блокчейн...', 'Готово!'];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < statusSteps.length) { setPickingStatus(statusSteps[stepIdx]); stepIdx++; }
    }, 1000);

    setTimeout(async () => {
      clearInterval(interval);
      
      // Обновляем массив глобальных профилей (totalWon для ботов)
      const profilesRes = await fetch(`${KV_REST_API_URL}/get/${GLOBAL_PROFILES_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const profilesData = await profilesRes.json();
      const currentProfiles = profilesData.result ? JSON.parse(profilesData.result) : [...globalProfiles];

      const updatedProfiles = currentProfiles.map((p: any) => {
        const win = winners.find(w => w.name === p.name);
        if (win) {
          return { ...p, totalWon: (p.totalWon || 0) + win.prizeWon };
        }
        return p;
      });

      await saveGlobalProfilesUpdate(updatedProfiles);

      const updatedContests = contests.map(c => c.id === contestId ? { ...c, isCompleted: true, winners } : c);
      await saveContestsGlobal(updatedContests);
      
      setIsPickingWinner(false);
      setAdminSelectedContest(updatedContests.find(c => c.id === contestId)!);
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred('heavy');
    }, 5000);
  };

  const registerParticipant = async (contestId: string, payout: string, type: PayoutType) => {
    // 1. Выбираем ботов (1-3) из актуального botsPool
    const botCount = Math.floor(Math.random() * 3) + 1; 
    let selectedBots: any[] = [];
    const tempPool = [...botsPool];

    for(let i=0; i < Math.min(botCount, tempPool.length); i++) {
      const idx = Math.floor(Math.random() * tempPool.length);
      const bot = tempPool[idx];
      selectedBots.push(bot);
      tempPool.splice(idx, 1);
    }

    try {
      // 2. Получаем участников конкурса
      const key = `participants_${contestId}`;
      const partRes = await fetch(`${KV_REST_API_URL}/get/${key}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const partData = await partRes.json();
      const existingParticipants = partData.result ? JSON.parse(partData.result) : [];
      
      // 3. Добавляем реального юзера
      const newEntry = { 
        id: user?.id, 
        name: user?.first_name || 'User', 
        payout, 
        type, 
        isBot: false, 
        registeredAt: new Date().toLocaleDateString('ru-RU'), 
        depositAmount: 0 
      };
      
      const updatedParticipants = [...existingParticipants, newEntry, ...selectedBots];
      
      // 4. Сохраняем участников в БД конкурса
      await fetch(`${KV_REST_API_URL}/set/${key}`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, 
        body: JSON.stringify(updatedParticipants) 
      });

      // 5. ОБНОВЛЯЕМ participationCount в GLOBAL_PROFILES_KEY для выбранных ботов
      const profilesRes = await fetch(`${KV_REST_API_URL}/get/${GLOBAL_PROFILES_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const profilesData = await profilesRes.json();
      const currentProfiles = profilesData.result ? JSON.parse(profilesData.result) : [...globalProfiles];

      const updatedProfiles = currentProfiles.map((p: any) => {
        if (selectedBots.some(sb => sb.name === p.name)) {
          return { ...p, participationCount: (p.participationCount || 0) + 1 };
        }
        return p;
      });

      await saveGlobalProfilesUpdate(updatedProfiles);

      // 6. Обновляем счетчик участников в списке конкурсов
      const contestsRes = await fetch(`${KV_REST_API_URL}/get/${DB_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const contestsData = await contestsRes.json();
      const currentContests: Contest[] = contestsData.result ? JSON.parse(contestsData.result) : contests;

      const totalAdded = 1 + selectedBots.length;
      const contestsUpdated = currentContests.map(c => 
        c.id === contestId ? { ...c, participantCount: (c.participantCount || 0) + totalAdded } : c
      );
      
      await saveContestsGlobal(contestsUpdated);
      
      // 7. Локальное обновление
      const newCount = (profile.participationCount || 0) + 1;
      saveProfile({ ...profile, participationCount: newCount });
      
      fetchContests(); // Обновить UI
      fetchBotsAndProfiles(); // Обновить локальный пул ботов со свежей статистикой
      
      console.log(`Зарегистрировано: +1 юзер и +${selectedBots.length} ботов. Статистика в v3 обновлена.`);
    } catch (err) {
      console.error("Ошибка регистрации:", err);
      setError("Ошибка связи с сервером.");
    }
  };

  const showPublicProfile = (name: string, isBot: boolean) => {
    // Ищем профиль в загруженном массиве глобальных профилей
    const stats = globalProfiles.find(p => p.name === name);
    if (stats) {
      setViewedProfile({ ...stats, isBot });
    } else {
      setViewedProfile({ name, participationCount: 1, totalWon: 0, isBot });
    }
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  return (
    <div className="h-screen bg-[#f8f9fc] dark:bg-[#0c0d10] text-[#1a1c1e] dark:text-[#e2e2e6] overflow-hidden flex flex-col font-sans select-none">
      
      {/* Публичный профиль (Modal) */}
      {viewedProfile && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white dark:bg-[#1a1c1e] w-full max-w-xs rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative animate-slide-up">
            <button onClick={() => setViewedProfile(null)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full active:scale-90"><XMarkIcon className="w-5 h-5"/></button>
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center text-blue-600"><UserCircleIcon className="w-12 h-12"/></div>
              <div className="text-center">
                <h3 className="text-xl font-black">{viewedProfile.name}</h3>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{viewedProfile.isBot ? "Участник" : "Пользователь"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[8px] font-black uppercase opacity-30 mb-1">Участий</p>
                <p className="text-xl font-black">{viewedProfile.participationCount || 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[8px] font-black uppercase opacity-30 mb-1">Выиграно</p>
                <p className="text-xl font-black text-green-600">{(viewedProfile.totalWon || 0).toLocaleString()} ₽</p>
              </div>
            </div>
            {viewedProfile.registeredAt && (
               <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold opacity-40 uppercase tracking-tight">
                  <span>Регистрация:</span>
                  <span>{viewedProfile.registeredAt}</span>
               </div>
            )}
          </div>
        </div>
      )}

      {/* View Switcher for Admin */}
      {isAdmin && !isPickingWinner && (
        <div className="fixed top-4 right-4 z-[60]">
          <button onClick={() => { setView(view === 'admin' ? 'user' : 'admin'); setError(null); }} className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl active:scale-90 transition-all">
            {view === 'admin' ? <ChevronLeftIcon className="w-6 h-6"/> : <ShieldCheckIcon className="w-6 h-6"/>}
          </button>
        </div>
      )}

      {view === 'admin' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-slide-up bg-white dark:bg-[#0c0d10]">
          <h1 className="text-xl font-bold">Админка</h1>
          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border space-y-4">
            <input placeholder="Название" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-4 rounded-2xl border bg-white dark:bg-slate-800" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Приз ₽" value={newPrizeRub} onChange={e => setNewPrizeRub(e.target.value)} className="w-full p-4 rounded-2xl border bg-white dark:bg-slate-800" />
              <input type="number" placeholder="Победителей" value={newWinnerCount} onChange={e => setNewWinnerCount(parseInt(e.target.value))} className="w-full p-4 rounded-2xl border bg-white dark:bg-slate-800" />
            </div>
            <button onClick={createContest} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Опубликовать</button>
          </div>

          <div className="space-y-3 pb-32">
            <h2 className="text-[10px] font-black uppercase opacity-40 px-2 tracking-widest">Список розыгрышей</h2>
            {contests.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-900 border p-4 rounded-3xl flex justify-between items-center shadow-sm">
                <div className="overflow-hidden pr-4">
                  <p className="font-bold text-sm truncate">{c.title}</p>
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-tight">{c.prizeRub.toLocaleString()} ₽ • {c.participantCount} чел.</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setAdminSelectedContest(c); fetchParticipantsForAdmin(c.id); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl active:scale-90 transition-all"><UsersIcon className="w-5 h-5"/></button>
                  <button onClick={async () => { const updated = contests.filter(item => item.id !== c.id); await saveContestsGlobal(updated); }} className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-500 active:scale-90 transition-all"><TrashIcon className="w-5 h-5"/></button>
                  {!c.isCompleted && <button onClick={() => drawWinners(c.id)} className="p-2.5 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 active:scale-90 transition-all"><TrophyIcon className="w-5 h-5"/></button>}
                </div>
              </div>
            ))}
          </div>

          {adminSelectedContest && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
              <div className="bg-white dark:bg-[#121418] w-full max-w-[500px] rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-slide-up flex flex-col shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 flex-shrink-0">
                  <div className="min-w-0 pr-4">
                    <h2 className="text-xl font-black truncate">{adminSelectedContest.title}</h2>
                    <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Управление результатами</p>
                  </div>
                  <button onClick={() => setAdminSelectedContest(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full active:scale-90 transition-all flex-shrink-0"><ChevronLeftIcon className="w-6 h-6 rotate-90"/></button>
                </div>
                
                <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                  {adminSelectedContest.winners && adminSelectedContest.winners.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-green-600 flex items-center gap-2"><TrophyIcon className="w-4 h-4"/> Победители</h3>
                      {adminSelectedContest.winners.map((w, i) => (
                        <div key={i} className="p-5 bg-green-500/5 dark:bg-green-500/10 border border-green-500/10 rounded-3xl space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-bold text-lg leading-none pt-1" onClick={() => showPublicProfile(w.name, true)}>{w.name}</p>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                               <span className="text-[8px] font-black bg-blue-500 text-white px-2 py-0.5 rounded uppercase">{w.depositAmount.toLocaleString()} ₽ DEP</span>
                               <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded uppercase">{w.registeredAt}</span>
                               <span className="text-[9px] font-black text-green-600 mt-1">+{w.prizeWon.toLocaleString()} ₽</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700 shadow-sm">
                             <p className="font-mono text-xs opacity-50 truncate mr-4">**** **** **** {w.payoutValue.slice(-4)}</p>
                             <button onClick={() => copyToClipboard(w.payoutValue, `adm-w-${i}`)} className="p-2.5 bg-blue-600 text-white rounded-xl active:scale-90 transition-all">
                               {copiedId === `adm-w-${i}` ? <ClipboardDocumentCheckIcon className="w-4 h-4"/> : <ClipboardIcon className="w-4 h-4"/>}
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase opacity-30 flex items-center gap-2 px-1"><UsersIcon className="w-4 h-4"/> Участники ({realParticipants.length})</h3>
                    <div className="grid grid-cols-1 gap-2 pb-6">
                      {realParticipants.length > 0 ? realParticipants.map((p, i) => (
                        <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center" onClick={() => showPublicProfile(p.name, p.isBot)}>
                           <span className="text-sm font-medium truncate pr-4">{p.name}</span>
                           <span className="text-[10px] font-mono opacity-30 flex-shrink-0">**** {p.payout ? p.payout.slice(-4) : '****'}</span>
                        </div>
                      )) : (
                        <p className="text-center text-[10px] font-bold opacity-20 py-10 uppercase tracking-widest">Список участников пуст</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPickingWinner && (
            <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 space-y-12">
               <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white/5 p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-bounce">
                     <TrophyIcon className="w-24 h-24 text-blue-500"/>
                  </div>
               </div>
               <div className="text-center space-y-4 max-w-[280px]">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter">ВЫБОР ПОБЕДИТЕЛЯ</h2>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-600 animate-loading-progress rounded-full shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
                  </div>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] animate-pulse">{pickingStatus}</p>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          <div className="p-6 pb-2">
            <h1 className="text-xl font-black tracking-tight text-[#1a1c1e] dark:text-white">Розыгрыши от Лудовара</h1>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-28">
            {activeTab === 'contests' ? (
              <div className="space-y-5 py-4 animate-fade-in">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                     <ClockIcon className="w-10 h-10 animate-spin text-blue-600 opacity-20"/>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Загрузка...</p>
                  </div>
                ) : contests.length === 0 ? (
                  <div className="text-center py-20 opacity-20"><GiftIcon className="w-12 h-12 mx-auto mb-2"/><p>Пока ничего нет</p></div>
                ) : (
                  contests.map(c => {
                    const joined = participatedIds.includes(c.id);
                    return (
                      <div key={c.id} onClick={() => handleStartContest(c)} className="relative bg-white dark:bg-slate-900/60 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all overflow-hidden group">
                        {c.isCompleted && <div className="absolute top-0 right-0 bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase px-4 py-2 rounded-bl-2xl opacity-50">Завершен</div>}
                        {joined && !c.isCompleted && <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black uppercase px-4 py-2 rounded-bl-2xl">В игре</div>}
                        <h3 className="text-lg font-bold mb-4 pr-12 leading-tight">{c.title}</h3>
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 font-black text-sm">{c.prizeRub.toLocaleString()} ₽</div>
                          <span className="text-[10px] font-bold opacity-30">≈ ${Math.round(c.prizeRub * 0.011)}</span>
                          <div className="ml-auto flex items-center gap-1.5 opacity-40">
                             <UsersIcon className="w-3.5 h-3.5"/>
                             <span className="text-[10px] font-black">{c.participantCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-8 py-6 animate-slide-up">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-600/20"><UserCircleIcon className="w-16 h-16"/></div>
                  <h2 className="text-xl font-black">{user?.first_name || "Твой Профиль"}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase opacity-30 mb-1">Участий</p>
                    <p className="text-2xl font-black">{profile.participationCount || 0}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase opacity-30 mb-1">Выиграно</p>
                    <p className="text-2xl font-black text-green-600">{(profile.totalWon || 0).toLocaleString()} ₽</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border space-y-5 shadow-sm">
                  <div className="flex flex-col gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl"><LinkIcon className="w-5 h-5 text-blue-600"/></div>
                        <div>
                          <p className="text-sm font-bold">Аккаунт Beef</p>
                          <p className="text-[10px] opacity-40 uppercase font-black tracking-tight">{profile.isReferralVerified ? "Верифицирован" : "Нужно подтвердить"}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { 
                          setError(null); 
                          if(!profile.isReferralVerified) {
                             setIsChecking(true);
                             setTimeout(() => {
                               setIsChecking(false);
                               saveProfile({...profile, isReferralVerified: true});
                               window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
                             }, 1000);
                          } 
                        }}
                        disabled={profile.isReferralVerified || isChecking}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${profile.isReferralVerified ? 'bg-green-500 text-white' : 'bg-blue-600 text-white shadow-lg active:scale-90 disabled:opacity-50'}`}
                      >
                        {isChecking ? <ClockIcon className="w-4 h-4 animate-spin"/> : profile.isReferralVerified ? "ОК" : "Проверить"}
                      </button>
                    </div>

                    {!profile.isReferralVerified && (
                      <a href={BEEF_LINK} target="_blank" className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-500/20 text-blue-600 active:scale-[0.98] transition-all">
                         <span className="text-xs font-black uppercase tracking-tight">Зарегистрироваться на Beef</span>
                         <ArrowTopRightOnSquareIcon className="w-4 h-4"/>
                      </a>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase opacity-30 tracking-widest px-2">Карта для выплат</p>
                    <div className="relative">
                      <input 
                        placeholder="Номер карты" 
                        value={profile.payoutValue || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const type = val.startsWith('T') ? 'trc20' : 'card';
                          saveProfile({ ...profile, payoutValue: type === 'card' ? formatCard(val) : val, payoutType: type });
                        }}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border text-sm font-mono outline-none shadow-inner"
                      />
                      {profile.payoutValue && profile.payoutType === 'card' && (
                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black ${getCardType(profile.payoutValue)?.color}`}>
                          {getCardType(profile.payoutValue)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Entry Overlay */}
          {step !== ContestStep.LIST && (
            <div className="fixed inset-0 z-[110] bg-white dark:bg-[#0c0d10] flex flex-col p-8 animate-slide-up overflow-y-auto">
              <button onClick={() => { setStep(ContestStep.LIST); setError(null); }} className="absolute top-8 left-8 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-90 transition-all">
                <ChevronLeftIcon className="w-6 h-6"/>
              </button>

              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10 py-12">
                {step === ContestStep.REFERRAL && (
                  <>
                    <div className="w-28 h-28 bg-blue-600/5 rounded-full flex items-center justify-center relative shadow-inner">
                      <LinkIcon className="w-14 h-14 text-blue-600"/>
                      <div className="absolute bottom-2 right-2 bg-blue-600 p-1.5 rounded-xl border-4 border-white dark:border-[#0c0d10] shadow-xl"><CheckBadgeIcon className="w-4 h-4 text-white"/></div>
                    </div>
                    <div className="space-y-4">
                      <h1 className="text-4xl font-black">{selectedContest?.prizeRub.toLocaleString()} ₽</h1>
                      <p className="text-sm opacity-50 px-6 font-medium leading-relaxed">Для участия подтвердите аккаунт Beef, зарегистрированный по нашей ссылке</p>
                    </div>
                    <div className="w-full max-w-[300px] flex flex-col gap-3">
                      <a href={selectedContest?.referralLink} target="_blank" className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-bold text-lg shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Регистрация</a>
                      <button 
                        onClick={() => {
                          setError(null);
                          setIsChecking(true); 
                          setTimeout(() => {
                            setIsChecking(false);
                            if(checkAttempts >= 1) { 
                              saveProfile({...profile, isReferralVerified: true}); 
                              handleStartContest(selectedContest!);
                              setError(null);
                            }
                            else { setCheckAttempts(1); setError("Аккаунт не найден. Проверьте регистрацию."); }
                          }, 1500);
                        }} 
                        className="w-full py-4 border-2 rounded-[1.8rem] text-[11px] font-black uppercase flex items-center justify-center gap-2 active:bg-slate-50 transition-all"
                      >
                        {isChecking ? <ClockIcon className="w-5 h-5 animate-spin"/> : "Проверить"}
                      </button>
                    </div>
                  </>
                )}

                {step === ContestStep.PAYOUT && (
                  <div className="w-full max-w-[400px] space-y-8">
                    <h1 className="text-3xl font-black uppercase tracking-tight">Выплата</h1>
                    <p className="text-sm opacity-50 px-6 font-medium leading-relaxed">Укажите номер карты для получения выигрыша в случае победы</p>
                    <div className="relative">
                      <input 
                        placeholder="0000 0000 0000 0000" 
                        value={payoutInput} 
                        onChange={(e) => { setError(null); setPayoutInput(formatCard(e.target.value)); }}
                        className="w-full py-6 px-8 bg-slate-50 dark:bg-slate-900 border-2 rounded-[1.8rem] text-xl font-mono focus:border-blue-600 outline-none transition-all shadow-inner" 
                      />
                      {payoutInput.length > 0 && <span className={`absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black ${getCardType(payoutInput)?.color}`}>{getCardType(payoutInput)?.label}</span>}
                    </div>
                    <button onClick={() => { setError(null); saveProfile({...profile, payoutValue: payoutInput, payoutType: 'card'}); handleStartContest(selectedContest!); }} disabled={payoutInput.length < 16} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-blue-600/20 disabled:opacity-20 active:scale-95 transition-all">Сохранить</button>
                  </div>
                )}

                {step === ContestStep.FINAL && (
                  <>
                    <div className="w-24 h-24 bg-green-500/5 rounded-3xl flex items-center justify-center border-2 border-green-500/10 shadow-lg"><FlagIcon className="w-10 h-10 text-green-500"/></div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">Почти готово!</h1>
                    <div className="w-full p-6 bg-slate-50 dark:bg-slate-900 border rounded-3xl shadow-sm">
                       <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Реквизиты для выплаты</p>
                       <p className="font-mono text-base font-bold break-all">{profile.payoutValue}</p>
                    </div>
                    <button 
                      onClick={() => { 
                        setError(null);
                        setIsFinalizing(true); 
                        setTimeout(() => { 
                          if(selectedContest) { 
                            const updatedJoined = [...participatedIds, selectedContest.id];
                            setParticipatedIds(updatedJoined); 
                            localStorage.setItem(PARTICIPATION_KEY, JSON.stringify(updatedJoined)); 
                            registerParticipant(selectedContest.id, profile.payoutValue, profile.payoutType); 
                          } 
                          setIsFinalizing(false); setStep(ContestStep.SUCCESS); 
                        }, 1500); 
                      }} 
                      className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-bold text-xl shadow-2xl shadow-blue-600/30 active:scale-95 transition-all"
                    >
                      {isFinalizing ? <ClockIcon className="w-7 h-7 animate-spin"/> : "Вступить в игру"}
                    </button>
                  </>
                )}

                {step === ContestStep.SUCCESS && (
                  <div className="space-y-8 w-full max-w-[500px]">
                    {selectedContest?.isCompleted ? (
                      <>
                        <div className="relative w-32 h-32 flex items-center justify-center mx-auto">
                           <div className="absolute inset-0 bg-blue-600/10 blur-[60px] animate-pulse rounded-full"></div>
                           <TrophyIcon className="w-20 h-20 text-blue-600 relative z-10"/>
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Итоги розыгрыша</h2>
                        <div className="space-y-3">
                           {selectedContest.winners?.map((w, i) => (
                             <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border text-left flex items-center justify-between shadow-sm cursor-pointer active:scale-[0.98] transition-all" onClick={() => showPublicProfile(w.name, true)}>
                               <div className="overflow-hidden mr-4">
                                 <p className="font-black text-blue-600 text-lg truncate leading-none mb-1">{w.name}</p>
                                 <p className="text-[9px] opacity-40 uppercase font-black tracking-tight leading-tight">Рега: {w.registeredAt} • Деп: {w.depositAmount.toLocaleString()} ₽</p>
                                 <p className="text-[10px] font-black text-green-600 mt-1">ВЫИГРЫШ: +{w.prizeWon.toLocaleString()} ₽</p>
                               </div>
                               <div className="flex-shrink-0">
                                  <StarIcon className="w-6 h-6 fill-yellow-500 text-yellow-500"/>
                               </div>
                             </div>
                           ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/20 border-8 border-white dark:border-[#0c0d10]"><CheckBadgeIcon className="w-20 h-20 text-white"/></div>
                        <h2 className="text-3xl font-black uppercase tracking-tight">Вы в игре!</h2>
                        <p className="text-sm opacity-50 px-8 font-medium leading-relaxed">Ваша заявка принята. Ожидайте результатов, которые будут опубликованы здесь и в нашем канале.</p>
                      </>
                    )}
                  </div>
                )}
                {error && <p className="text-red-500 font-bold text-xs animate-shake-once bg-red-500/10 px-6 py-3 rounded-2xl border border-red-500/20">{error}</p>}
              </div>
            </div>
          )}

          <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0c0d10]/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 p-4 pb-8 flex justify-around z-40">
            <button onClick={() => { setActiveTab('contests'); setStep(ContestStep.LIST); setError(null); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'contests' ? 'text-blue-600 scale-110' : 'opacity-30'}`}>
              <GiftIcon className="w-6 h-6"/>
              <span className="text-[9px] font-black uppercase tracking-widest">Конкурсы</span>
            </button>
            <button onClick={() => { setActiveTab('profile'); setStep(ContestStep.LIST); setError(null); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-110' : 'opacity-30'}`}>
              <UserCircleIcon className="w-6 h-6"/>
              <span className="text-[9px] font-black uppercase tracking-widest">Профиль</span>
            </button>
          </nav>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes loading-progress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-loading-progress { animation: loading-progress 5s linear forwards; }
      `}</style>
    </div>
  );
};

export default App;
