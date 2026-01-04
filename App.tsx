
import React, { useState, useEffect, useMemo } from 'react';
import { TelegramUser, ContestStep, PayoutType, Contest, WinnerInfo, UserProfile } from './types';
import { BotParticipant } from './bots';
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
  StarIcon,
  FlagIcon,
  XMarkIcon,
  ChartBarIcon,
  BanknotesIcon,
  CreditCardIcon
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
  const clean = val.replace(/\s/g, '');
  if (clean.startsWith('4')) return { label: 'VISA', color: 'text-blue-400' };
  if (clean.startsWith('5')) return { label: 'MASTERCARD', color: 'text-orange-400' };
  if (clean.startsWith('2')) return { label: 'МИР', color: 'text-green-400' };
  if (clean.startsWith('3')) return { label: 'AMEX', color: 'text-cyan-400' };
  return null;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contests' | 'rating' | 'profile'>('contests');
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [step, setStep] = useState<ContestStep>(ContestStep.LIST);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [botsPool, setBotsPool] = useState<BotParticipant[]>([]);
  const [participatedIds, setParticipatedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ payoutValue: '', payoutType: 'card', isReferralVerified: false, participationCount: 0, totalWon: 0 });
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usdRate, setUsdRate] = useState<number>(0.0105);

  const [globalProfiles, setGlobalProfiles] = useState<any[]>([]);
  const [viewedProfile, setViewedProfile] = useState<any | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPrizeRub, setNewPrizeRub] = useState<string>('');
  const [newWinnerCount, setNewWinnerCount] = useState<number>(1);
  const [adminSelectedContest, setAdminSelectedContest] = useState<Contest | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isPickingWinner, setIsPickingWinner] = useState(false);
  const [pickingStatus, setPickingStatus] = useState('Анализ...');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); if (tg.initDataUnsafe?.user) setUser(tg.initDataUnsafe.user); }
    fetchContests();
    fetchBotsAndProfiles();
    fetchUsdRate();
    const pIds = localStorage.getItem(PARTICIPATION_KEY);
    if (pIds) setParticipatedIds(JSON.parse(pIds));
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  const fetchUsdRate = async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/RUB');
      const data = await res.json();
      if (data.rates && data.rates.USD) setUsdRate(data.rates.USD);
    } catch (e) { console.error("Rate error", e); }
  };

  const fetchContests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${DB_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const data = await res.json();
      if (data.result) setContests(JSON.parse(data.result));
    } catch (e) { console.error("Ошибка сети"); } finally { setIsLoading(false); }
  };

  const fetchBotsAndProfiles = async () => {
    try {
      const res = await fetch(`${KV_REST_API_URL}/get/${GLOBAL_PROFILES_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const data = await res.json();
      if (data.result) {
        const rawProfiles = JSON.parse(data.result);
        setGlobalProfiles(Array.isArray(rawProfiles) ? rawProfiles : []);
        setBotsPool(rawProfiles.map((p: any) => ({
          id: p.name,
          name: p.name,
          registeredAt: p.registeredAt || '01.01.2025',
          depositAmount: p.depositAmount || 0,
          payout: p.creditCard || getStableCard(p.name),
          isBot: true,
          participationCount: p.participationCount || 0,
          totalWon: p.totalWon || 0
        })));
      }
    } catch (e) { console.error(e); }
  };

  const topRating = useMemo(() => {
    return [...globalProfiles].sort((a, b) => (b.totalWon || 0) - (a.totalWon || 0)).slice(0, 10);
  }, [globalProfiles]);

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
    try { await fetch(`${KV_REST_API_URL}/set/${DB_KEY}`, { method: 'POST', headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, body: JSON.stringify(updated) }); } catch (e) { console.error(e); }
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
      description: 'Розыгрыш от команды Лудовара',
      referralLink: BEEF_LINK,
      prizeRub: prize,
      prizeUsd: Math.round(prize * usdRate),
      createdAt: Date.now(),
      participantCount: 0,
      winnerCount: newWinnerCount,
    };
    await saveContestsGlobal([newContest, ...contests]);
    setNewTitle(''); setNewPrizeRub(''); setNewWinnerCount(1);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
  };

  const drawWinners = async (contestId: string) => {
    const contest = contests.find(c => c.id === contestId)!;
    const res = await fetch(`${KV_REST_API_URL}/get/participants_${contestId}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
    const data = await res.json();
    const pool = data.result ? JSON.parse(data.result) : [];
    
    const bots = pool.filter((p: any) => p.isBot === true);
    if (bots.length === 0) { alert("Нет ботов для выбора!"); return; }

    const winners: WinnerInfo[] = [];
    const prizePerWinner = Math.floor(contest.prizeRub / contest.winnerCount);

    for(let i=0; i < contest.winnerCount; i++) {
      const lucky = bots[Math.floor(Math.random() * bots.length)];
      winners.push({ 
        name: lucky.name, 
        payoutValue: lucky.payout || getStableCard(lucky.name), 
        payoutType: 'card', 
        registeredAt: lucky.registeredAt, 
        depositAmount: lucky.depositAmount,
        prizeWon: prizePerWinner
      });
    }

    setIsPickingWinner(true);
    setPickingStatus('Сверка транзакций...');
    
    setTimeout(async () => {
      setPickingStatus('Генерация хэша...');
      setTimeout(async () => {
        const profilesRes = await fetch(`${KV_REST_API_URL}/get/${GLOBAL_PROFILES_KEY}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
        const pData = await profilesRes.json();
        const currentProfiles = JSON.parse(pData.result || "[]");

        const updatedProfiles = currentProfiles.map((p: any) => {
          const winSum = winners.filter(w => w.name === p.name).reduce((acc, curr) => acc + curr.prizeWon, 0);
          if (winSum > 0) return { ...p, totalWon: (p.totalWon || 0) + winSum };
          return p;
        });

        await saveGlobalProfilesUpdate(updatedProfiles);
        const updatedContests = contests.map(c => c.id === contestId ? { ...c, isCompleted: true, winners } : c);
        await saveContestsGlobal(updatedContests);
        
        setIsPickingWinner(false);
        setAdminSelectedContest(updatedContests.find(c => c.id === contestId)!);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('heavy');
        fetchBotsAndProfiles();
      }, 2000);
    }, 2000);
  };

  const registerParticipant = async (contestId: string, payout: string) => {
    const botCount = Math.floor(Math.random() * 4) + 2; 
    const randomBots = [...botsPool].sort(() => 0.5 - Math.random()).slice(0, botCount);

    try {
      const key = `participants_${contestId}`;
      const res = await fetch(`${KV_REST_API_URL}/get/${key}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
      const data = await res.json();
      const existing = data.result ? JSON.parse(data.result) : [];
      
      const me = { id: user?.id, name: user?.first_name || 'User', payout, isBot: false, registeredAt: 'Сегодня', depositAmount: 0 };
      const updated = [...existing, me, ...randomBots];
      
      await fetch(`${KV_REST_API_URL}/set/${key}`, { method: 'POST', headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, body: JSON.stringify(updated) });

      const currentProfiles = [...globalProfiles];
      const profilesUpdated = currentProfiles.map(p => randomBots.some(rb => rb.name === p.name) ? { ...p, participationCount: (p.participationCount || 0) + 1 } : p);
      await saveGlobalProfilesUpdate(profilesUpdated);

      const updatedContests = contests.map(c => c.id === contestId ? { ...c, participantCount: (c.participantCount || 0) + updated.length - existing.length } : c);
      await saveContestsGlobal(updatedContests);

      saveProfile({ ...profile, participationCount: (profile.participationCount || 0) + 1 });
      fetchContests(); fetchBotsAndProfiles();
    } catch (e) { console.error("Ошибка регистрации"); }
  };

  const showPublicProfile = (name: string, isBot: boolean) => {
    const found = globalProfiles.find(p => p.name === name);
    if (found) { setViewedProfile(found); window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light'); }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  const handleStartContest = (c: Contest) => {
    setSelectedContest(c);
    if (participatedIds.includes(c.id) || c.isCompleted) setStep(ContestStep.SUCCESS);
    else if (!profile.isReferralVerified) setStep(ContestStep.REFERRAL);
    else if (!profile.payoutValue) setStep(ContestStep.PAYOUT);
    else setStep(ContestStep.FINAL);
  };

  return (
    <div className="h-screen bg-matte-black text-[#E2E2E6] overflow-hidden flex flex-col select-none relative font-sans">
      
      {/* Тонкий профессиональный фон */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C5A059' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
         <div className="absolute top-[20%] left-[-10%] w-[50%] h-[40%] bg-gold/5 blur-[80px] rounded-full"></div>
         <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[40%] bg-gold/5 blur-[80px] rounded-full"></div>
      </div>

      {/* Кнопка админа */}
      {isAdmin && !isPickingWinner && (
        <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className="fixed top-5 right-5 z-[60] p-3 bg-soft-gray border border-gold/20 rounded-xl shadow-md active:scale-95 transition-all">
          {view === 'admin' ? <ChevronLeftIcon className="w-5 h-5 text-gold"/> : <ShieldCheckIcon className="w-5 h-5 text-gold"/>}
        </button>
      )}

      {view === 'admin' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10 pt-16">
          <div className="bg-soft-gray p-6 rounded-2xl border border-border-gray space-y-4">
            <h2 className="text-gold font-bold uppercase tracking-widest text-[10px]">Управление Drops</h2>
            <input placeholder="Название розыгрыша" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-3.5 bg-matte-black rounded-lg border border-border-gray text-sm text-gold outline-none focus:border-gold/30 transition-all" />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Банк (₽)" value={newPrizeRub} onChange={e => setNewPrizeRub(e.target.value)} className="w-full p-3.5 bg-matte-black rounded-lg border border-border-gray text-sm text-gold outline-none" />
              <input type="number" placeholder="Мест" value={newWinnerCount} onChange={e => setNewWinnerCount(parseInt(e.target.value))} className="w-full p-3.5 bg-matte-black rounded-lg border border-border-gray text-sm text-gold outline-none" />
            </div>
            <button onClick={createContest} className="w-full py-3.5 bg-gold text-matte-black rounded-lg font-bold uppercase tracking-widest text-xs active:bg-gold-light">Создать тираж</button>
          </div>

          <div className="space-y-3 pb-24">
            {contests.map(c => (
              <div key={c.id} className="bg-soft-gray/60 border border-border-gray p-4 rounded-xl flex justify-between items-center">
                <div className="overflow-hidden">
                  <p className="font-semibold text-white text-xs truncate uppercase tracking-tight">{c.title}</p>
                  <p className="text-[9px] opacity-40 uppercase font-medium">{c.prizeRub.toLocaleString()} ₽ • {c.winnerCount} мест</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => saveContestsGlobal(contests.filter(i => i.id !== c.id))} className="p-2 bg-matte-black border border-border-gray rounded-lg text-red-500/50"><TrashIcon className="w-4 h-4"/></button>
                  {!c.isCompleted && <button onClick={() => drawWinners(c.id)} className="p-2 bg-matte-black border border-gold/30 rounded-lg text-green-500"><TrophyIcon className="w-4 h-4"/></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden z-10">
          
          <div className="px-8 pt-8 pb-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tighter uppercase italic">LUDOVAR</h1>
              <span className="text-[8px] font-bold text-gold opacity-50 tracking-widest uppercase">Member Edition</span>
            </div>
            <div className="w-8 h-8 rounded-full border border-gold/20 flex items-center justify-center bg-soft-gray">
              <ShieldCheckIcon className="w-4 h-4 text-gold"/>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-24 no-scrollbar">
            {activeTab === 'contests' && (
              <div className="space-y-4 animate-fade-in py-2">
                {isLoading ? (
                  <div className="flex flex-col items-center py-20 opacity-20"><ClockIcon className="w-10 h-10 animate-spin text-gold"/></div>
                ) : contests.length === 0 ? (
                  <div className="text-center py-32 opacity-20 uppercase font-bold tracking-[0.2em] text-[10px]">Нет активных событий</div>
                ) : contests.map(c => {
                  const joined = participatedIds.includes(c.id);
                  const perPerson = Math.floor(c.prizeRub / c.winnerCount);
                  return (
                    <div key={c.id} onClick={() => handleStartContest(c)} className="relative bg-soft-gray border border-border-gray p-6 rounded-2xl shadow-lg active:scale-[0.99] transition-all group overflow-hidden">
                      {c.isCompleted ? (
                        <div className="absolute top-4 right-6 px-2.5 py-0.5 bg-deep-gray rounded border border-border-gray text-[7px] font-bold uppercase text-white/30">Завершен</div>
                      ) : joined ? (
                        <div className="absolute top-4 right-6 px-2.5 py-0.5 bg-gold/10 rounded border border-gold/30 text-[7px] font-bold uppercase text-gold">Участвую</div>
                      ) : null}
                      
                      <h3 className="text-base font-bold text-white mb-6 uppercase tracking-tight">{c.title}</h3>
                      
                      <div className="grid grid-cols-2 gap-4 border-t border-border-gray pt-5">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold uppercase text-white/30 tracking-widest">Банк</p>
                          <p className="text-lg font-bold text-gold">{c.prizeRub.toLocaleString()} <span className="text-[10px]">₽</span></p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold uppercase text-white/30 tracking-widest">Доля победителя</p>
                          <p className="text-lg font-bold text-white">{perPerson.toLocaleString()} <span className="text-[10px] opacity-40">₽</span></p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'rating' && (
              <div className="py-2 space-y-6 animate-fade-in">
                <div className="bg-soft-gray border border-border-gray p-8 rounded-2xl text-center shadow-md">
                   <TrophyIcon className="w-12 h-12 text-gold/60 mx-auto mb-2"/>
                   <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Всего распределено</p>
                   <p className="text-3xl font-bold text-white">
                      {globalProfiles.reduce((acc, p) => acc + (p.totalWon || 0), 0).toLocaleString()} <span className="text-gold text-lg ml-0.5">₽</span>
                   </p>
                </div>

                <div className="space-y-2">
                   {topRating.map((p, i) => (
                     <div key={p.name} onClick={() => showPublicProfile(p.name, true)} className="bg-soft-gray/40 border border-border-gray p-4 rounded-xl flex items-center gap-4 active:bg-soft-gray/60 transition-all">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          i === 0 ? 'bg-gold text-matte-black shadow-md' : 'bg-matte-black text-white/40 border border-border-gray'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-xs uppercase tracking-tight truncate text-white">{p.name}</p>
                          <p className="text-[7px] font-bold text-white/30 uppercase tracking-widest">{p.participationCount || 0} участий</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gold">{(p.totalWon || 0).toLocaleString()} ₽</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="py-4 space-y-6 animate-slide-up">
                <div className="flex items-center gap-5 p-6 bg-soft-gray rounded-2xl border border-border-gray">
                   <div className="w-14 h-14 bg-matte-black rounded-xl flex items-center justify-center border border-border-gray">
                      <UserCircleIcon className="w-8 h-8 text-gold"/>
                   </div>
                   <div>
                      <h2 className="text-lg font-bold uppercase text-white tracking-tight">{user?.first_name || "Клиент"}</h2>
                      <p className="text-[8px] font-bold text-gold/50 uppercase tracking-widest">Private Member</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-soft-gray p-5 rounded-2xl border border-border-gray text-center">
                    <p className="text-[8px] font-bold uppercase text-white/30 mb-1 tracking-widest">Участия</p>
                    <p className="text-xl font-bold text-white">{profile.participationCount || 0}</p>
                  </div>
                  <div className="bg-soft-gray p-5 rounded-2xl border border-border-gray text-center">
                    <p className="text-[8px] font-bold uppercase text-white/30 mb-1 tracking-widest">Доход</p>
                    <p className="text-xl font-bold text-gold">{profile.totalWon || 0}</p>
                  </div>
                </div>

                <div className="bg-soft-gray p-6 rounded-2xl border border-border-gray space-y-5">
                   <div className="space-y-2">
                      <p className="text-[8px] font-bold uppercase text-white/30 tracking-widest ml-1">Статус верификации</p>
                      <button onClick={() => { setIsChecking(true); setTimeout(() => { setIsChecking(false); saveProfile({...profile, isReferralVerified: true}); }, 1500); }} disabled={profile.isReferralVerified || isChecking} className={`w-full py-3.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${profile.isReferralVerified ? 'bg-matte-black border border-green-500/20 text-green-500' : 'bg-gold text-matte-black active:scale-95'}`}>
                         {isChecking ? <ClockIcon className="w-4 h-4 animate-spin"/> : profile.isReferralVerified ? "Счёт подтвержден" : "Подключить аккаунт"}
                      </button>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[8px] font-bold uppercase text-white/30 tracking-widest ml-1">Реквизиты</p>
                      <div className="relative">
                         <input 
                            placeholder="0000 0000 0000 0000" 
                            value={profile.payoutValue} 
                            onChange={e => saveProfile({...profile, payoutValue: formatCard(e.target.value)})} 
                            className="w-full px-4 py-3 bg-matte-black border border-border-gray rounded-lg text-gold font-mono outline-none text-xs focus:border-gold/30 transition-all shadow-inner" 
                         />
                         <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {getCardType(profile.payoutValue) && <span className={`text-[8px] font-bold uppercase ${getCardType(profile.payoutValue)?.color}`}>{getCardType(profile.payoutValue)?.label}</span>}
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>

          <nav className="fixed bottom-0 left-0 right-0 bg-matte-black/95 backdrop-blur-xl border-t border-border-gray p-4 pb-8 flex justify-around z-40">
            <button onClick={() => setActiveTab('contests')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'contests' ? 'text-gold' : 'opacity-30'}`}>
              <GiftIcon className="w-5 h-5"/>
              <span className="text-[8px] font-bold uppercase tracking-widest">Розыгрыши</span>
            </button>
            <button onClick={() => setActiveTab('rating')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'rating' ? 'text-gold' : 'opacity-30'}`}>
              <ChartBarIcon className="w-5 h-5"/>
              <span className="text-[8px] font-bold uppercase tracking-widest">Рейтинг</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-gold' : 'opacity-30'}`}>
              <UserCircleIcon className="w-5 h-5"/>
              <span className="text-[8px] font-bold uppercase tracking-widest">Кабинет</span>
            </button>
          </nav>
        </div>
      )}

      {/* Модальные окна с фиксом верстки */}
      {step !== ContestStep.LIST && (
         <div className="fixed inset-0 z-[110] bg-matte-black flex flex-col p-8 animate-slide-up">
            <button onClick={() => setStep(ContestStep.LIST)} className="absolute top-6 left-6 p-2.5 bg-soft-gray border border-border-gray rounded-xl text-gold active:scale-90 z-20"><ChevronLeftIcon className="w-5 h-5"/></button>
            
            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 z-10">
               {step === ContestStep.REFERRAL && (
                  <div className="flex flex-col items-center w-full max-w-[300px]">
                     <LinkIcon className="w-16 h-16 text-gold/40 mb-6 flex-shrink-0"/>
                     <h1 className="text-xl font-bold uppercase tracking-tight mb-2">Требуется доступ</h1>
                     <p className="text-[10px] opacity-40 uppercase tracking-widest leading-loose mb-10">Верифицируйте аккаунт в Beef для участия в тираже на {selectedContest?.prizeRub.toLocaleString()} ₽</p>
                     <a href={BEEF_LINK} target="_blank" className="w-full py-4 bg-gold text-matte-black rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Открыть Beef</a>
                  </div>
               )}
               {step === ContestStep.PAYOUT && (
                  <div className="w-full max-w-[300px] space-y-8">
                    <h1 className="text-xl font-bold uppercase tracking-tight">Реквизиты</h1>
                    <div className="space-y-2">
                       <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Карта для выплаты</p>
                       <input placeholder="0000 0000 0000 0000" value={profile.payoutValue} onChange={e => saveProfile({...profile, payoutValue: formatCard(e.target.value)})} className="w-full py-4 bg-soft-gray border border-border-gray rounded-xl text-lg font-mono text-gold text-center outline-none focus:border-gold/40 transition-all shadow-inner" />
                    </div>
                    <button onClick={() => setStep(ContestStep.FINAL)} disabled={profile.payoutValue.length < 16} className="w-full py-4 bg-gold text-matte-black rounded-xl font-bold uppercase tracking-widest text-[10px] disabled:opacity-20 transition-all">Продолжить</button>
                  </div>
               )}
               {step === ContestStep.FINAL && (
                  <div className="flex flex-col items-center w-full max-w-[300px]">
                    <FlagIcon className="w-16 h-16 text-gold mb-6 flex-shrink-0"/>
                    <h1 className="text-xl font-bold uppercase tracking-tight mb-6">Подтверждение</h1>
                    <div className="bg-soft-gray p-5 rounded-2xl border border-border-gray w-full mb-8">
                       <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-3">Карта зачисления:</p>
                       <p className="font-mono text-base font-bold text-gold">{profile.payoutValue}</p>
                    </div>
                    <button onClick={() => { setIsFinalizing(true); setTimeout(() => { registerParticipant(selectedContest!.id, profile.payoutValue); setIsFinalizing(false); setParticipatedIds([...participatedIds, selectedContest!.id]); localStorage.setItem(PARTICIPATION_KEY, JSON.stringify([...participatedIds, selectedContest!.id])); setStep(ContestStep.SUCCESS); }, 1500); }} className="w-full py-4 bg-gold text-matte-black rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all flex items-center justify-center gap-3">
                       {isFinalizing ? <ClockIcon className="w-5 h-5 animate-spin"/> : "Участвовать"}
                    </button>
                  </div>
               )}
               {step === ContestStep.SUCCESS && (
                  <div className="flex flex-col items-center w-full max-w-[300px]">
                    {selectedContest?.isCompleted ? (
                      <div className="w-full space-y-6">
                        <TrophyIcon className="w-14 h-14 text-gold mx-auto mb-2 flex-shrink-0"/>
                        <h2 className="text-xl font-bold uppercase tracking-tight">Итоги тиража</h2>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                           {selectedContest.winners?.map((w, i) => (
                             <div key={i} className="p-4 bg-soft-gray border border-border-gray rounded-xl flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-white uppercase text-[10px]">{w.name}</p>
                                 <p className="text-green-500 font-bold text-xs">+{w.prizeWon.toLocaleString()} ₽</p>
                               </div>
                               <button onClick={() => copyToClipboard(w.payoutValue, `w-${i}`)} className="text-gold/30">
                                  {copiedId === `w-${i}` ? <ClipboardDocumentCheckIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5"/>}
                               </button>
                             </div>
                           ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-gold/10 text-gold rounded-full flex items-center justify-center border border-gold/20 mb-8 flex-shrink-0"><CheckBadgeIcon className="w-12 h-12"/></div>
                        <h2 className="text-xl font-bold uppercase tracking-tight mb-3">Заявка принята</h2>
                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest leading-relaxed max-w-[220px]">Участие зафиксировано в системе.<br/>Ожидайте результатов в списке тиражей.</p>
                      </div>
                    )}
                  </div>
               )}
            </div>
            <div className="mt-auto py-6 text-center opacity-10 font-bold uppercase tracking-[0.3em] text-[8px]">ludovar security service</div>
         </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loading-progress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-loading-progress { animation: loading-progress 4s linear forwards; }
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
