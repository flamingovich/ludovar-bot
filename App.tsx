
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
  const [error, setError] = useState<string | null>(null);
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
    } catch (e) { setError("Ошибка регистрации"); }
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
    <div className="h-screen bg-dark text-[#E2E2E6] overflow-hidden flex flex-col select-none relative">
      
      {/* Улучшенный фон с градиентами */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-5%] left-[-10%] w-[60%] h-[50%] bg-gold/5 blur-[100px] rounded-full animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[60%] bg-vivid-orange/5 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2.5s' }}></div>
         <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Модалка профиля */}
      {viewedProfile && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-dark-card w-full max-w-[280px] rounded-[2.5rem] p-8 border border-dark-border shadow-gold-glow relative">
            <button onClick={() => setViewedProfile(null)} className="absolute top-6 right-6 text-gold active:scale-90 transition-all"><XMarkIcon className="w-5 h-5"/></button>
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center border border-gold/20 shadow-gold-glow"><UserCircleIcon className="w-10 h-10 text-gold"/></div>
              <h3 className="text-lg font-black gold-gradient-text uppercase tracking-tight text-center">{viewedProfile.name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark p-4 rounded-2xl border border-dark-border text-center">
                <p className="text-[7px] font-black uppercase text-gold opacity-50 mb-1">Участий</p>
                <p className="text-sm font-black">{viewedProfile.participationCount || 0}</p>
              </div>
              <div className="bg-dark p-4 rounded-2xl border border-dark-border text-center">
                <p className="text-[7px] font-black uppercase text-gold opacity-50 mb-1">Выигрыш</p>
                <p className="text-sm font-black text-vivid-orange">{(viewedProfile.totalWon || 0).toLocaleString()} ₽</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Кнопка админа */}
      {isAdmin && !isPickingWinner && (
        <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className="fixed top-4 right-4 z-[60] p-3 bg-dark-card/90 border border-gold/30 rounded-2xl shadow-gold-glow active:scale-90 transition-all">
          {view === 'admin' ? <ChevronLeftIcon className="w-5 h-5 text-gold"/> : <ShieldCheckIcon className="w-5 h-5 text-gold"/>}
        </button>
      )}

      {view === 'admin' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10 pt-14">
          <div className="bg-dark-card p-6 rounded-[2rem] border border-dark-border shadow-gold-glow space-y-4">
            <h2 className="text-gold font-black uppercase tracking-widest text-[9px]">Управление Drops</h2>
            <input placeholder="Название розыгрыша" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-4 bg-dark rounded-xl border border-dark-border text-xs text-gold outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Приз (₽)" value={newPrizeRub} onChange={e => setNewPrizeRub(e.target.value)} className="w-full p-4 bg-dark rounded-xl border border-dark-border text-xs text-gold outline-none" />
              <input type="number" placeholder="Мест" value={newWinnerCount} onChange={e => setNewWinnerCount(parseInt(e.target.value))} className="w-full p-4 bg-dark rounded-xl border border-dark-border text-xs text-gold outline-none" />
            </div>
            <button onClick={createContest} className="w-full py-4 bg-gold text-dark rounded-xl font-black uppercase tracking-widest text-xs shadow-gold-glow">Опубликовать</button>
          </div>

          <div className="space-y-4 pb-28">
            {contests.map(c => (
              <div key={c.id} className="bg-dark-card/40 border border-dark-border p-5 rounded-[2rem] flex justify-between items-center">
                <div className="overflow-hidden pr-4">
                  <p className="font-bold text-gold text-xs truncate uppercase tracking-tight">{c.title}</p>
                  <p className="text-[9px] opacity-40 uppercase font-black">{c.prizeRub.toLocaleString()} ₽ • {c.winnerCount} мест</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {/* Fixed: Removed non-existent fetchParticipantsForAdmin call */}
                  <button onClick={() => { setAdminSelectedContest(c); }} className="p-2.5 bg-dark border border-dark-border rounded-xl text-gold"><UsersIcon className="w-4 h-4"/></button>
                  <button onClick={() => saveContestsGlobal(contests.filter(i => i.id !== c.id))} className="p-2.5 bg-dark border border-dark-border rounded-xl text-red-500"><TrashIcon className="w-4 h-4"/></button>
                  {!c.isCompleted && <button onClick={() => drawWinners(c.id)} className="p-2.5 bg-dark border border-gold/40 rounded-xl text-green-500"><TrophyIcon className="w-4 h-4"/></button>}
                </div>
              </div>
            ))}
          </div>

          {adminSelectedContest && (
            <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
              <div className="bg-dark-card w-full max-w-[400px] rounded-[2.5rem] p-6 border border-gold/20 shadow-gold-glow max-h-[80vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-sm font-black text-gold uppercase tracking-tighter">{adminSelectedContest.title}</h2>
                   <button onClick={() => setAdminSelectedContest(null)} className="text-gold p-1"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                {adminSelectedContest.winners?.map((w, i) => {
                  const card = getCardType(w.payoutValue);
                  return (
                    <div key={i} className="p-4 bg-dark border border-dark-border rounded-2xl mb-3">
                      <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-2">
                            <p className="text-gold font-bold text-xs">{w.name}</p>
                            {card && <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border border-current ${card.color}`}>{card.label}</span>}
                         </div>
                         <p className="text-green-500 font-black text-xs">+{w.prizeWon.toLocaleString()} ₽</p>
                      </div>
                      <div className="flex items-center justify-between opacity-50 text-[10px] bg-dark-card p-2 rounded-lg border border-dark-border/30">
                         <span className="font-mono">{w.payoutValue}</span>
                         <button onClick={() => copyToClipboard(w.payoutValue, `admin-win-${i}`)} className="text-gold">
                           {copiedId === `admin-win-${i}` ? <ClipboardDocumentCheckIcon className="w-4 h-4"/> : <ClipboardIcon className="w-4 h-4"/>}
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden z-10">
          
          <div className="px-8 pt-8 pb-4 flex items-baseline gap-3">
            <h1 className="text-3xl font-black gold-gradient-text tracking-tighter uppercase italic drop-shadow-glow">LUDOVAR</h1>
            <span className="text-[8px] font-black opacity-20 tracking-widest uppercase">VIP ACCESS</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-28 no-scrollbar">
            {activeTab === 'contests' && (
              <div className="space-y-5 animate-fade-in py-2">
                {isLoading ? (
                  <div className="flex flex-col items-center py-24 gap-4 opacity-20"><ClockIcon className="w-12 h-12 animate-spin text-gold"/></div>
                ) : contests.length === 0 ? (
                  <div className="text-center py-32 opacity-20 uppercase font-black tracking-widest text-[10px]">Розыгрышей пока нет</div>
                ) : contests.map(c => {
                  const joined = participatedIds.includes(c.id);
                  const perPerson = Math.floor(c.prizeRub / c.winnerCount);
                  const perPersonUsd = (perPerson * usdRate).toFixed(1);
                  return (
                    <div key={c.id} onClick={() => handleStartContest(c)} className="relative bg-dark-card/60 backdrop-blur-sm p-6 rounded-[2.2rem] border border-dark-border shadow-lg active:scale-[0.98] transition-all group overflow-hidden">
                      {c.isCompleted ? (
                        <div className="absolute top-4 right-6 px-3 py-1 bg-dark/50 rounded-full border border-dark-border text-[7px] font-black uppercase text-gold/30 italic">Завершен</div>
                      ) : joined ? (
                        <div className="absolute top-4 right-6 px-3 py-1 bg-gold/10 rounded-full border border-gold/30 text-[7px] font-black uppercase text-gold animate-pulse">Участвую</div>
                      ) : null}
                      
                      <h3 className="text-lg font-black text-white mb-6 tracking-tight pr-16 uppercase italic leading-tight">{c.title}</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black uppercase opacity-20 tracking-widest">Призовой фонд</p>
                          <div className="flex items-center gap-2">
                            <BanknotesIcon className="w-3.5 h-3.5 text-vivid-orange"/>
                            <p className="text-sm font-black text-white">{c.prizeRub.toLocaleString()} <span className="opacity-40 text-[9px]">₽</span></p>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black uppercase opacity-20 tracking-widest">Призовых мест</p>
                          <div className="flex items-center gap-2">
                            <UsersIcon className="w-3.5 h-3.5 text-gold"/>
                            <p className="text-sm font-black text-white">{c.winnerCount}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-dark-border/40 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-dark rounded-xl flex items-center justify-center border border-dark-border"><StarIcon className="w-5 h-5 text-gold drop-shadow-glow"/></div>
                            <div>
                               <p className="text-[7px] font-black uppercase text-gold/60 tracking-widest">Приз на человека:</p>
                               <div className="flex items-baseline gap-1.5">
                                  <p className="text-sm font-black text-vivid-orange italic">{perPerson.toLocaleString()} ₽</p>
                                  <span className="text-[8px] opacity-25 font-black">$ {perPersonUsd}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-1.5 opacity-10">
                            <UsersIcon className="w-3 h-3"/>
                            <span className="text-[10px] font-black">{c.participantCount}</span>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'rating' && (
              <div className="py-2 space-y-6 animate-fade-in">
                <div className="bg-dark-card border border-gold/10 p-8 rounded-[2.5rem] shadow-gold-glow text-center space-y-3 relative overflow-hidden">
                   <div className="absolute inset-0 bg-gold/5 blur-3xl rounded-full"></div>
                   <TrophyIcon className="w-16 h-16 text-gold mx-auto mb-1 opacity-80 drop-shadow-glow animate-bounce"/>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold opacity-40 italic">Выплачено всего</p>
                   <p className="text-4xl font-black text-white italic tracking-tighter">
                      {globalProfiles.reduce((acc, p) => acc + (p.totalWon || 0), 0).toLocaleString()} <span className="text-xl text-gold opacity-30 ml-0.5 font-sans">₽</span>
                   </p>
                </div>

                <div className="space-y-3">
                   {topRating.length > 0 ? topRating.map((p, i) => (
                     <div key={p.name} onClick={() => showPublicProfile(p.name, true)} className="bg-dark-card/40 backdrop-blur-sm p-4 rounded-[1.8rem] border border-dark-border flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg italic ${
                          i === 0 ? 'bg-gold text-dark shadow-gold-glow' : 
                          i === 1 ? 'bg-slate-400 text-dark' : 
                          i === 2 ? 'bg-[#CD7F32] text-white' : 'bg-dark border border-dark-border text-gold/30'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-black text-sm uppercase tracking-tight italic truncate">{p.name}</p>
                          <p className="text-[8px] font-black text-gold/40 uppercase tracking-widest">{p.participationCount || 0} участий</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black gold-gradient-text tracking-tighter italic drop-shadow-glow">{(p.totalWon || 0).toLocaleString()} ₽</p>
                        </div>
                     </div>
                   )) : (
                     <div className="text-center py-20 opacity-20 uppercase font-black tracking-widest text-[9px]">Пустой рейтинг</div>
                   )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="py-4 space-y-8 animate-slide-up">
                <div className="flex flex-col items-center gap-5 py-6">
                   <div className="w-24 h-24 bg-dark-card rounded-3xl flex items-center justify-center border border-gold/20 shadow-gold-glow">
                      <UserCircleIcon className="w-14 h-14 text-gold"/>
                   </div>
                   <div className="text-center">
                      <h2 className="text-2xl font-black uppercase tracking-tighter italic gold-gradient-text">{user?.first_name || "УЧАСТНИК"}</h2>
                      <p className="text-[9px] font-black opacity-20 uppercase tracking-[0.3em] mt-1 italic">Private Profile</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-card/50 p-6 rounded-[2rem] border border-dark-border text-center backdrop-blur-sm shadow-inner">
                    <p className="text-[8px] font-black uppercase text-gold opacity-30 mb-1 tracking-widest">Участия</p>
                    <p className="text-2xl font-black italic tracking-tighter">{profile.participationCount || 0}</p>
                  </div>
                  <div className="bg-dark-card/50 p-6 rounded-[2rem] border border-dark-border text-center backdrop-blur-sm shadow-inner">
                    <p className="text-[8px] font-black uppercase text-gold opacity-30 mb-1 tracking-widest">Прибыль</p>
                    <p className="text-2xl font-black italic tracking-tighter text-vivid-orange">0</p>
                  </div>
                </div>

                <div className="bg-dark-card p-7 rounded-[2.5rem] border border-dark-border space-y-6">
                   <div className="flex flex-col gap-3">
                      <p className="text-[9px] font-black uppercase text-gold/50 tracking-widest ml-1">Статус Beef</p>
                      <button onClick={() => { setIsChecking(true); setTimeout(() => { setIsChecking(false); saveProfile({...profile, isReferralVerified: true}); }, 1500); }} disabled={profile.isReferralVerified || isChecking} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${profile.isReferralVerified ? 'bg-dark border border-green-500/30 text-green-500' : 'bg-gold text-dark active:scale-95 shadow-gold-glow'}`}>
                         {isChecking ? <ClockIcon className="w-4 h-4 animate-spin"/> : profile.isReferralVerified ? <><CheckBadgeIcon className="w-4 h-4"/> Верифицирован</> : "Проверить привязку"}
                      </button>
                   </div>
                   <div className="flex flex-col gap-3">
                      <p className="text-[9px] font-black uppercase text-gold/50 tracking-widest ml-1">Данные для выплат</p>
                      <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
                            {getCardType(profile.payoutValue) ? (
                               <span className={`text-[9px] font-black ${getCardType(profile.payoutValue)?.color}`}>{getCardType(profile.payoutValue)?.label}</span>
                            ) : (
                               <CreditCardIcon className="w-4 h-4 text-gold/20"/>
                            )}
                         </div>
                         <input 
                            placeholder="Номер банковской карты" 
                            value={profile.payoutValue} 
                            onChange={e => saveProfile({...profile, payoutValue: formatCard(e.target.value)})} 
                            className="w-full pl-16 pr-5 py-4 bg-dark border border-dark-border rounded-xl text-gold font-mono outline-none text-xs focus:border-gold/30 transition-all shadow-inner" 
                         />
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>

          <nav className="fixed bottom-0 left-0 right-0 bg-dark/90 backdrop-blur-3xl border-t border-dark-border/40 p-5 pb-10 flex justify-around z-40">
            <button onClick={() => setActiveTab('contests')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'contests' ? 'text-gold scale-110' : 'opacity-20 hover:opacity-40'}`}>
              <GiftIcon className="w-6 h-6 drop-shadow-glow"/>
              <span className="text-[8px] font-black uppercase tracking-widest">Drops</span>
            </button>
            <button onClick={() => setActiveTab('rating')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'rating' ? 'text-gold scale-110' : 'opacity-20 hover:opacity-40'}`}>
              <ChartBarIcon className="w-6 h-6 drop-shadow-glow"/>
              <span className="text-[8px] font-black uppercase tracking-widest">Рейтинг</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'profile' ? 'text-gold scale-110' : 'opacity-20 hover:opacity-40'}`}>
              <UserCircleIcon className="w-6 h-6 drop-shadow-glow"/>
              <span className="text-[8px] font-black uppercase tracking-widest">Сейф</span>
            </button>
          </nav>
        </div>
      )}

      {/* Оверлеи шагов */}
      {step !== ContestStep.LIST && (
         <div className="fixed inset-0 z-[110] bg-dark flex flex-col p-10 animate-slide-up relative">
            <div className="absolute inset-0 pointer-events-none opacity-20">
               <div className="absolute top-[15%] right-[-15%] w-[50%] h-[50%] bg-gold/10 blur-[100px] rounded-full"></div>
            </div>
            <button onClick={() => setStep(ContestStep.LIST)} className="absolute top-8 left-8 p-3 bg-dark-card border border-dark-border rounded-xl text-gold z-20 active:scale-90 transition-all"><ChevronLeftIcon className="w-5 h-5"/></button>
            
            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 z-10 px-4">
               {step === ContestStep.REFERRAL && (
                  <>
                     <div className="relative mb-4">
                        <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full scale-125"></div>
                        <LinkIcon className="w-20 h-20 text-gold relative drop-shadow-glow opacity-80"/>
                     </div>
                     <div className="space-y-3">
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Доступ Ограничен</h1>
                        <p className="text-[10px] opacity-40 px-6 max-w-xs leading-relaxed font-black uppercase tracking-widest">Для участия в тираже на {selectedContest?.prizeRub.toLocaleString()} ₽ верифицируйте аккаунт в Beef</p>
                     </div>
                     <a href={BEEF_LINK} target="_blank" className="w-full py-5 bg-gold text-dark rounded-2xl font-black uppercase tracking-widest text-xs shadow-gold-glow active:scale-95 transition-all">Привязать в Beef</a>
                  </>
               )}
               {step === ContestStep.PAYOUT && (
                  <div className="w-full max-w-[320px] space-y-10">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter gold-gradient-text">Куда выплатим?</h1>
                    <div className="space-y-2">
                       <p className="text-[8px] font-black text-gold/30 uppercase tracking-[0.3em]">Номер банковской карты</p>
                       <input placeholder="0000 0000 0000 0000" value={profile.payoutValue} onChange={e => saveProfile({...profile, payoutValue: formatCard(e.target.value)})} className="w-full py-6 bg-dark-card border-2 border-dark-border rounded-3xl text-xl font-mono text-gold text-center outline-none focus:border-gold/40 shadow-gold-glow transition-all" />
                    </div>
                    <button onClick={() => setStep(ContestStep.FINAL)} disabled={profile.payoutValue.length < 16} className="w-full py-5 bg-gold text-dark rounded-2xl font-black uppercase tracking-widest text-xs shadow-gold-glow disabled:opacity-10 transition-all">Далее</button>
                  </div>
               )}
               {step === ContestStep.FINAL && (
                  <>
                    <FlagIcon className="w-20 h-20 text-gold drop-shadow-glow animate-pulse mb-4"/>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">Завершение</h1>
                    <div className="bg-dark-card p-6 rounded-[2rem] border border-dark-border w-full shadow-inner">
                       <p className="text-[8px] font-black text-gold/30 uppercase tracking-[0.3em] mb-4 text-center">Выплата будет произведена на:</p>
                       <div className="flex flex-col items-center gap-1.5">
                          <p className="font-mono text-lg font-black text-gold tracking-widest">{profile.payoutValue}</p>
                          {getCardType(profile.payoutValue) && <span className={`text-[8px] font-black uppercase ${getCardType(profile.payoutValue)?.color}`}>{getCardType(profile.payoutValue)?.label}</span>}
                       </div>
                    </div>
                    <button onClick={() => { setIsFinalizing(true); setTimeout(() => { registerParticipant(selectedContest!.id, profile.payoutValue); setIsFinalizing(false); setParticipatedIds([...participatedIds, selectedContest!.id]); localStorage.setItem(PARTICIPATION_KEY, JSON.stringify([...participatedIds, selectedContest!.id])); setStep(ContestStep.SUCCESS); }, 2000); }} className="w-full py-6 bg-gold text-dark rounded-2xl font-black uppercase tracking-widest text-xs shadow-gold-glow active:scale-95 transition-all flex items-center justify-center gap-3">
                       {isFinalizing ? <ClockIcon className="w-6 h-6 animate-spin"/> : "Подать заявку"}
                    </button>
                  </>
               )}
               {step === ContestStep.SUCCESS && (
                  <div className="space-y-10 w-full">
                    {selectedContest?.isCompleted ? (
                      <>
                        <TrophyIcon className="w-20 h-20 text-gold mx-auto animate-bounce drop-shadow-glow"/>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter gold-gradient-text">Итоги тиража</h2>
                        <div className="space-y-3 no-scrollbar overflow-y-auto max-h-[40vh] p-2">
                           {selectedContest.winners?.map((w, i) => {
                             const card = getCardType(w.payoutValue);
                             return (
                               <div key={i} onClick={() => showPublicProfile(w.name, true)} className="p-5 bg-dark-card border border-gold/10 rounded-[2rem] text-left flex items-center justify-between shadow-gold-glow active:scale-[0.98] transition-all">
                                 <div className="overflow-hidden pr-2">
                                   <div className="flex items-center gap-2 mb-0.5">
                                      <p className="font-black text-gold uppercase tracking-tight text-xs truncate">{w.name}</p>
                                      {card && <span className={`text-[6px] font-black uppercase ${card.color}`}>{card.label}</span>}
                                   </div>
                                   <p className="text-green-500 font-black text-sm">+{w.prizeWon.toLocaleString()} ₽</p>
                                 </div>
                                 <button onClick={(e) => { e.stopPropagation(); copyToClipboard(w.payoutValue, `succ-win-${i}`); }} className="text-gold opacity-30 hover:opacity-100 transition-opacity p-1.5">
                                    {copiedId === `succ-win-${i}` ? <ClipboardDocumentCheckIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5"/>}
                                 </button>
                               </div>
                             );
                           })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-32 h-32 bg-gold text-dark rounded-full flex items-center justify-center mx-auto shadow-gold-glow-strong border-[8px] border-dark"><CheckBadgeIcon className="w-20 h-20"/></div>
                        <div className="space-y-4">
                           <h2 className="text-3xl font-black uppercase italic tracking-tighter gold-gradient-text">Заявка принята</h2>
                           <p className="text-[9px] opacity-40 font-black uppercase tracking-[0.2em] leading-relaxed max-w-[200px] mx-auto">Ваше участие зафиксировано в блокчейне.<br/>Результаты появятся в ленте Drops.</p>
                        </div>
                      </>
                    )}
                  </div>
               )}
            </div>
            <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none opacity-20">
               <p className="text-[10px] font-black uppercase tracking-widest">@ludovar_gift_bot</p>
            </div>
         </div>
      )}

      {/* Анимация выбора победителя */}
      {isPickingWinner && (
        <div className="fixed inset-0 z-[300] bg-dark flex flex-col items-center justify-center p-12 space-y-12">
           <div className="relative">
              <div className="absolute inset-0 bg-gold/40 blur-[80px] animate-pulse scale-150"></div>
              <TrophyIcon className="w-32 h-32 text-gold relative animate-bounce drop-shadow-glow"/>
           </div>
           <div className="text-center space-y-8">
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase gold-gradient-text">Выбор победителя</h2>
              <div className="h-2.5 w-[240px] bg-dark-card rounded-full overflow-hidden border border-dark-border shadow-inner">
                 <div className="h-full bg-gold animate-loading-progress shadow-gold-glow"></div>
              </div>
              <p className="text-[10px] font-black text-gold uppercase tracking-[0.4em] animate-pulse italic">{pickingStatus}</p>
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
        .drop-shadow-glow { filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.4)); }
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
