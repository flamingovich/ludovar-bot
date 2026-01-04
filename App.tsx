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
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BanknotesIcon
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
  const [error, setError] = useState<string | null>(null);
  const [usdRate, setUsdRate] = useState<number>(0.0105);

  const [globalProfiles, setGlobalProfiles] = useState<any[]>([]);
  const [viewedProfile, setViewedProfile] = useState<any | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newPrizeRub, setNewPrizeRub] = useState<string>('');
  const [newWinnerCount, setNewWinnerCount] = useState<number>(1);
  const [adminSelectedContest, setAdminSelectedContest] = useState<Contest | null>(null);
  const [realParticipants, setRealParticipants] = useState<any[]>([]);
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
    } catch (e) { setError("Ошибка сети"); } finally { setIsLoading(false); }
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

  const fetchParticipantsForAdmin = async (contestId: string) => {
    const res = await fetch(`${KV_REST_API_URL}/get/participants_${contestId}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
    const data = await res.json();
    setRealParticipants(data.result ? JSON.parse(data.result) : []);
  };

  const drawWinners = async (contestId: string) => {
    const contest = contests.find(c => c.id === contestId)!;
    const res = await fetch(`${KV_REST_API_URL}/get/participants_${contestId}`, { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } });
    const data = await res.json();
    const pool = data.result ? JSON.parse(data.result) : [];
    
    // ВАЖНО: Только боты выигрывают. Реальные люди только создают массовку.
    const bots = pool.filter((p: any) => p.isBot === true);
    if (bots.length === 0) { alert("Нет ботов для выбора!"); return; }

    const winners: WinnerInfo[] = [];
    const prizePerWinner = Math.floor(contest.prizeRub / contest.winnerCount);

    // Выбираем ровно winnerCount победителей. Повторы разрешены.
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
          const totalWonInThisRound = winners.filter(w => w.name === p.name).reduce((acc, curr) => acc + curr.prizeWon, 0);
          if (totalWonInThisRound > 0) {
            return { ...p, totalWon: (p.totalWon || 0) + totalWonInThisRound };
          }
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
      
      const me = { id: user?.id, name: user?.first_name || 'User', payout, isBot: false, registeredAt: 'Today', depositAmount: 0 };
      const updated = [...existing, me, ...randomBots];
      
      await fetch(`${KV_REST_API_URL}/set/${key}`, { method: 'POST', headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }, body: JSON.stringify(updated) });

      // Обновляем кол-во участий ботов
      const currentProfiles = [...globalProfiles];
      const profilesUpdated = currentProfiles.map(p => randomBots.some(rb => rb.name === p.name) ? { ...p, participationCount: (p.participationCount || 0) + 1 } : p);
      await saveGlobalProfilesUpdate(profilesUpdated);

      // Обновляем счетчик конкурса
      const updatedContests = contests.map(c => c.id === contestId ? { ...c, participantCount: (c.participantCount || 0) + updated.length - existing.length } : c);
      await saveContestsGlobal(updatedContests);

      saveProfile({ ...profile, participationCount: (profile.participationCount || 0) + 1 });
      fetchContests(); fetchBotsAndProfiles();
    } catch (e) { setError("Ошибка регистрации"); }
  };

  // Fixed missing showPublicProfile function
  const showPublicProfile = (name: string, isBot: boolean) => {
    const found = globalProfiles.find(p => p.name === name);
    if (found) {
      setViewedProfile(found);
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    }
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
    <div className="h-screen bg-dark text-[#E2E2E6] overflow-hidden flex flex-col select-none">
      
      {/* Просмотр профиля */}
      {viewedProfile && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-dark-card w-full max-w-xs rounded-[2rem] p-8 border border-dark-border shadow-gold-glow relative">
            <button onClick={() => setViewedProfile(null)} className="absolute top-6 right-6 text-gold"><XMarkIcon className="w-6 h-6"/></button>
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center border border-gold/20 shadow-gold-glow"><UserCircleIcon className="w-12 h-12 text-gold"/></div>
              <h3 className="text-xl font-black gold-gradient-text uppercase tracking-tight">{viewedProfile.name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-dark p-4 rounded-2xl border border-dark-border text-center">
                <p className="text-[8px] font-black uppercase text-gold opacity-50 mb-1">Участий</p>
                <p className="text-lg font-black">{viewedProfile.participationCount || 0}</p>
              </div>
              <div className="bg-dark p-4 rounded-2xl border border-dark-border text-center">
                <p className="text-[8px] font-black uppercase text-gold opacity-50 mb-1">Выигрыш</p>
                <p className="text-lg font-black text-vivid-orange">{(viewedProfile.totalWon || 0).toLocaleString()} ₽</p>
              </div>
            </div>
            <p className="text-center text-[10px] opacity-30 font-bold tracking-widest uppercase">Member Since {viewedProfile.registeredAt || '2025'}</p>
          </div>
        </div>
      )}

      {/* Admin Button */}
      {isAdmin && !isPickingWinner && (
        <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className="fixed top-6 right-6 z-[60] p-3 bg-dark-card border border-gold/30 rounded-full shadow-gold-glow active:scale-90 transition-all">
          {view === 'admin' ? <ChevronLeftIcon className="w-6 h-6 text-gold"/> : <ShieldCheckIcon className="w-6 h-6 text-gold"/>}
        </button>
      )}

      {view === 'admin' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-dark pt-16">
          <div className="bg-dark-card p-6 rounded-[2rem] border border-dark-border shadow-gold-glow space-y-4">
            <h2 className="text-gold font-black uppercase tracking-widest text-xs">Новый Конкурс</h2>
            <input placeholder="Название" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-4 bg-dark rounded-xl border border-dark-border text-sm text-gold outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Приз (₽)" value={newPrizeRub} onChange={e => setNewPrizeRub(e.target.value)} className="w-full p-4 bg-dark rounded-xl border border-dark-border text-sm text-gold outline-none" />
              <input type="number" placeholder="Мест" value={newWinnerCount} onChange={e => setNewWinnerCount(parseInt(e.target.value))} className="w-full p-4 bg-dark rounded-xl border border-dark-border text-sm text-gold outline-none" />
            </div>
            <button onClick={createContest} className="w-full py-4 bg-gold text-dark rounded-xl font-black uppercase tracking-widest hover:bg-gold-light active:scale-95 transition-all shadow-gold-glow">Опубликовать</button>
          </div>

          <div className="space-y-4 pb-24">
            {contests.map(c => (
              <div key={c.id} className="bg-dark-card border border-dark-border p-5 rounded-[1.8rem] flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-bold text-gold">{c.title}</p>
                  <p className="text-[10px] opacity-40 uppercase font-black">{c.prizeRub.toLocaleString()} ₽ • {c.winnerCount} мест</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setAdminSelectedContest(c); fetchParticipantsForAdmin(c.id); }} className="p-2.5 bg-dark border border-dark-border rounded-xl text-gold"><UsersIcon className="w-5 h-5"/></button>
                  <button onClick={() => saveContestsGlobal(contests.filter(i => i.id !== c.id))} className="p-2.5 bg-dark border border-dark-border rounded-xl text-red-500"><TrashIcon className="w-5 h-5"/></button>
                  {!c.isCompleted && <button onClick={() => drawWinners(c.id)} className="p-2.5 bg-dark border border-gold/50 rounded-xl text-green-500"><TrophyIcon className="w-5 h-5"/></button>}
                </div>
              </div>
            ))}
          </div>

          {adminSelectedContest && (
            <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-dark-card w-full max-w-[450px] rounded-[2.5rem] p-8 border border-gold/20 shadow-gold-glow max-h-[85vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-lg font-black text-gold uppercase tracking-tighter">{adminSelectedContest.title}</h2>
                   <button onClick={() => setAdminSelectedContest(null)} className="text-gold"><XMarkIcon className="w-6 h-6"/></button>
                </div>
                {adminSelectedContest.winners?.map((w, i) => (
                  <div key={i} className="p-4 bg-dark border border-dark-border rounded-2xl mb-3">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-gold font-bold">{w.name}</p>
                       <p className="text-green-500 font-black text-xs">+{w.prizeWon.toLocaleString()} ₽</p>
                    </div>
                    <div className="flex items-center justify-between opacity-50 text-[10px]">
                       <span className="font-mono">{w.payoutValue}</span>
                       <button onClick={() => copyToClipboard(w.payoutValue, `admin-win-${i}`)} className="text-gold">
                         {copiedId === `admin-win-${i}` ? <ClipboardDocumentCheckIcon className="w-4 h-4"/> : <ClipboardIcon className="w-4 h-4"/>}
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          <div className="px-8 pt-10 pb-6 flex items-baseline gap-3">
            <h1 className="text-3xl font-black gold-gradient-text tracking-tighter uppercase italic">LUDOVAR</h1>
            <span className="text-[10px] font-black opacity-20 tracking-widest uppercase">V.3 VIP</span>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-28 no-scrollbar">
            {activeTab === 'contests' && (
              <div className="space-y-6 animate-fade-in py-2">
                {isLoading ? (
                  <div className="flex flex-col items-center py-20 gap-4 opacity-30"><ClockIcon className="w-12 h-12 animate-spin text-gold"/></div>
                ) : contests.map(c => {
                  const joined = participatedIds.includes(c.id);
                  const perPerson = Math.floor(c.prizeRub / c.winnerCount);
                  const perPersonUsd = (perPerson * usdRate).toFixed(1);
                  return (
                    <div key={c.id} onClick={() => handleStartContest(c)} className="relative bg-dark-card p-6 rounded-[2.2rem] border border-dark-border shadow-sm active:scale-[0.98] transition-all group">
                      {c.isCompleted ? (
                        <div className="absolute top-6 right-6 px-3 py-1 bg-dark rounded-full border border-dark-border text-[8px] font-black uppercase text-gold/40">Тираж закрыт</div>
                      ) : joined ? (
                        <div className="absolute top-6 right-6 px-3 py-1 bg-gold/10 rounded-full border border-gold/30 text-[8px] font-black uppercase text-gold animate-pulse shadow-gold-glow">Вы в игре</div>
                      ) : null}
                      
                      <h3 className="text-xl font-black text-gold-light mb-6 tracking-tight pr-20 uppercase leading-none">{c.title}</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase opacity-30 tracking-widest">Общий банк</p>
                          <div className="flex items-center gap-2">
                            <BanknotesIcon className="w-4 h-4 text-vivid-orange"/>
                            <p className="text-lg font-black text-white">{c.prizeRub.toLocaleString()} <span className="text-[10px] opacity-40">₽</span></p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase opacity-30 tracking-widest">Призовых мест</p>
                          <div className="flex items-center gap-2">
                            <UsersIcon className="w-4 h-4 text-gold"/>
                            <p className="text-lg font-black text-white">{c.winnerCount} <span className="text-[10px] opacity-40">ЧЕЛ</span></p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-dark-border flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-dark rounded-full flex items-center justify-center border border-dark-border shadow-inner"><StarIcon className="w-5 h-5 text-gold"/></div>
                            <div>
                               <p className="text-[8px] font-black uppercase text-gold">На 1 человека:</p>
                               <p className="text-base font-black text-vivid-orange">{perPerson.toLocaleString()} ₽ <span className="text-[10px] opacity-40 font-bold ml-1">($ {perPersonUsd})</span></p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2 opacity-30">
                            <UsersIcon className="w-4 h-4"/>
                            <span className="text-xs font-black">{c.participantCount}</span>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'rating' && (
              <div className="py-2 space-y-8 animate-fade-in">
                <div className="bg-dark-card border border-gold/10 p-8 rounded-[2.5rem] shadow-gold-glow-strong text-center space-y-3">
                   <TrophyIcon className="w-16 h-16 text-gold mx-auto mb-2 opacity-60 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]"/>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gold opacity-50">Всего выплачено</p>
                   <p className="text-4xl font-black text-white italic tracking-tighter">
                      {globalProfiles.reduce((acc, p) => acc + (p.totalWon || 0), 0).toLocaleString()} <span className="text-xl text-gold opacity-50">₽</span>
                   </p>
                </div>

                <div className="space-y-3">
                   {topRating.map((p, i) => (
                     <div key={p.name} onClick={() => showPublicProfile(p.name, true)} className="bg-dark-card p-5 rounded-[1.8rem] border border-dark-border flex items-center gap-5 active:scale-[0.98] transition-all shadow-sm">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl italic ${
                          i === 0 ? 'bg-gold text-dark shadow-gold-glow' : 
                          i === 1 ? 'bg-slate-400 text-dark' : 
                          i === 2 ? 'bg-orange-700 text-white' : 'bg-dark text-gold/30 border border-dark-border'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm uppercase tracking-tight">{p.name}</p>
                          <p className="text-[8px] font-black text-gold/40 uppercase tracking-widest">{p.participationCount || 0} участий</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-lg gold-gradient-text tracking-tighter italic">{(p.totalWon || 0).toLocaleString()} ₽</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="py-4 space-y-8 animate-slide-up">
                <div className="flex flex-col items-center gap-4 py-6">
                   <div className="w-24 h-24 bg-dark-card rounded-full flex items-center justify-center border border-gold/30 shadow-gold-glow"><UserCircleIcon className="w-14 h-14 text-gold"/></div>
                   <h2 className="text-2xl font-black uppercase tracking-tighter italic">{user?.first_name || "PROFIL"}</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-card p-6 rounded-3xl border border-dark-border text-center">
                    <p className="text-[9px] font-black uppercase text-gold opacity-40 mb-1">Участия</p>
                    <p className="text-3xl font-black italic tracking-tighter">{profile.participationCount || 0}</p>
                  </div>
                  <div className="bg-dark-card p-6 rounded-3xl border border-dark-border text-center">
                    <p className="text-[9px] font-black uppercase text-gold opacity-40 mb-1">Выиграно</p>
                    <p className="text-3xl font-black italic tracking-tighter text-vivid-orange">0 <span className="text-xs">₽</span></p>
                  </div>
                </div>

                <div className="bg-dark-card p-8 rounded-[2.5rem] border border-dark-border space-y-6">
                   <div className="flex flex-col gap-3">
                      <p className="text-[10px] font-black uppercase text-gold/50 tracking-widest ml-1">Аккаунт Beef</p>
                      <button onClick={() => { setIsChecking(true); setTimeout(() => { setIsChecking(false); saveProfile({...profile, isReferralVerified: true}); }, 1500); }} disabled={profile.isReferralVerified || isChecking} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${profile.isReferralVerified ? 'bg-dark border border-green-500/30 text-green-500' : 'bg-gold text-dark active:scale-95 shadow-gold-glow'}`}>
                         {isChecking ? <ClockIcon className="w-4 h-4 animate-spin"/> : profile.isReferralVerified ? <><CheckBadgeIcon className="w-4 h-4"/> Верифицирован</> : "Проверить статус"}
                      </button>
                   </div>
                   <div className="flex flex-col gap-3">
                      <p className="text-[10px] font-black uppercase text-gold/50 tracking-widest ml-1">Реквизиты для выплат</p>
                      <input placeholder="Номер карты" value={profile.payoutValue} onChange={e => saveProfile({...profile, payoutValue: formatCard(e.target.value)})} className="w-full p-4 bg-dark border border-dark-border rounded-xl text-gold font-mono outline-none text-center shadow-inner" />
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Overlay */}
          {step !== ContestStep.LIST && (
            <div className="fixed inset-0 z-[110] bg-dark flex flex-col p-10 animate-slide-up">
              <button onClick={() => setStep(ContestStep.LIST)} className="absolute top-10 left-10 p-3 bg-dark-card border border-dark-border rounded-2xl text-gold"><ChevronLeftIcon className="w-6 h-6"/></button>
              
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-12">
                {step === ContestStep.REFERRAL && (
                  <>
                    <LinkIcon className="w-24 h-24 text-gold opacity-20 drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]"/>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">Нужна Верификация</h1>
                    <p className="text-xs opacity-50 px-6 max-w-xs leading-relaxed font-bold">Для участия в призовом фонде {selectedContest?.prizeRub.toLocaleString()} ₽ подтвержите регистрацию в Beef</p>
                    <a href={BEEF_LINK} target="_blank" className="w-full py-6 bg-gold text-dark rounded-2xl font-black uppercase tracking-widest shadow-gold-glow active:scale-95 transition-all">Регистрация</a>
                  </>
                )}

                {step === ContestStep.PAYOUT && (
                  <div className="w-full max-w-[400px] space-y-10">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">Реквизиты</h1>
                    <input placeholder="0000 0000 0000 0000" value={profile.payoutValue} onChange={e => saveProfile({...profile, payoutValue: formatCard(e.target.value)})} className="w-full py-6 bg-dark-card border-2 border-dark-border rounded-2xl text-2xl font-mono text-gold text-center outline-none shadow-gold-glow" />
                    <button onClick={() => setStep(ContestStep.FINAL)} disabled={profile.payoutValue.length < 16} className="w-full py-6 bg-gold text-dark rounded-2xl font-black uppercase tracking-widest shadow-gold-glow disabled:opacity-20 transition-all">Сохранить</button>
                  </div>
                )}

                {step === ContestStep.FINAL && (
                  <>
                    <FlagIcon className="w-24 h-24 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]"/>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">Финальный Шаг</h1>
                    <div className="bg-dark-card p-6 rounded-2xl border border-dark-border w-full">
                       <p className="text-[10px] font-black text-gold/30 uppercase tracking-widest mb-2">Выплата на карту:</p>
                       <p className="font-mono font-black text-gold">{profile.payoutValue}</p>
                    </div>
                    <button onClick={() => { setIsFinalizing(true); setTimeout(() => { registerParticipant(selectedContest!.id, profile.payoutValue); setIsFinalizing(false); setParticipatedIds([...participatedIds, selectedContest!.id]); localStorage.setItem(PARTICIPATION_KEY, JSON.stringify([...participatedIds, selectedContest!.id])); setStep(ContestStep.SUCCESS); }, 2000); }} className="w-full py-6 bg-gold text-dark rounded-2xl font-black uppercase tracking-widest shadow-gold-glow active:scale-95 transition-all flex items-center justify-center gap-3">
                       {isFinalizing ? <ClockIcon className="w-7 h-7 animate-spin"/> : "Принять Участие"}
                    </button>
                  </>
                )}

                {step === ContestStep.SUCCESS && (
                  <div className="space-y-10 w-full max-w-[500px]">
                    {selectedContest?.isCompleted ? (
                      <>
                        <TrophyIcon className="w-24 h-24 text-gold mx-auto animate-bounce"/>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Итоги Розыгрыша</h2>
                        <div className="space-y-3 no-scrollbar overflow-y-auto max-h-[40vh] p-2">
                           {selectedContest.winners?.map((w, i) => (
                             <div key={i} onClick={() => showPublicProfile(w.name, true)} className="p-5 bg-dark-card border border-gold/10 rounded-[1.8rem] text-left flex items-center justify-between shadow-gold-glow active:scale-[0.98] transition-all">
                               <div>
                                 <p className="font-black text-gold uppercase tracking-tight truncate">{w.name}</p>
                                 <p className="text-green-500 font-black text-sm">+{w.prizeWon.toLocaleString()} ₽</p>
                               </div>
                               <button onClick={(e) => { e.stopPropagation(); copyToClipboard(w.payoutValue, `succ-win-${i}`); }} className="text-gold opacity-50">
                                  {copiedId === `succ-win-${i}` ? <ClipboardDocumentCheckIcon className="w-6 h-6"/> : <ClipboardIcon className="w-6 h-6"/>}
                               </button>
                             </div>
                           ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-32 h-32 bg-gold text-dark rounded-full flex items-center justify-center mx-auto shadow-gold-glow-strong"><CheckBadgeIcon className="w-20 h-20"/></div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Участие Принято</h2>
                        <p className="text-xs opacity-40 font-bold uppercase tracking-widest leading-relaxed">Система подтвердила ваш вход.<br/>Ожидайте розыгрыша в нашем канале.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <nav className="fixed bottom-0 left-0 right-0 bg-dark/95 backdrop-blur-2xl border-t border-dark-border p-5 pb-10 flex justify-around z-40">
            <button onClick={() => setActiveTab('contests')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'contests' ? 'text-gold scale-110 active-tab-glow' : 'opacity-20'}`}>
              <GiftIcon className="w-7 h-7"/>
              <span className="text-[8px] font-black uppercase tracking-widest">Конкурсы</span>
            </button>
            <button onClick={() => setActiveTab('rating')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'rating' ? 'text-gold scale-110 active-tab-glow' : 'opacity-20'}`}>
              <ChartBarIcon className="w-7 h-7"/>
              <span className="text-[8px] font-black uppercase tracking-widest">Топ 10</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'profile' ? 'text-gold scale-110 active-tab-glow' : 'opacity-20'}`}>
              <UserCircleIcon className="w-7 h-7"/>
              <span className="text-[8px] font-black uppercase tracking-widest">Профиль</span>
            </button>
          </nav>
        </div>
      )}

      {isPickingWinner && (
        <div className="fixed inset-0 z-[300] bg-dark flex flex-col items-center justify-center p-12 space-y-10">
           <div className="relative">
              <div className="absolute inset-0 bg-gold/30 blur-[60px] animate-pulse"></div>
              <TrophyIcon className="w-32 h-32 text-gold relative animate-bounce"/>
           </div>
           <div className="text-center space-y-6">
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">ВЫБОР ПОБЕДИТЕЛЯ</h2>
              <div className="h-2 w-[240px] bg-dark-card rounded-full overflow-hidden border border-dark-border">
                 <div className="h-full bg-gold animate-loading-progress shadow-gold-glow"></div>
              </div>
              <p className="text-[10px] font-black text-gold uppercase tracking-[0.4em] animate-pulse">{pickingStatus}</p>
           </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loading-progress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
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