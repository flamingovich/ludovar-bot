
import React, { useState, useEffect } from 'react';
import { TelegramUser, AppTab, GameState } from './types';
import { 
  RocketLaunchIcon, 
  UserCircleIcon,
  CurrencyDollarIcon,
  ArrowUpCircleIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        expand: () => void;
        ready: () => void;
        close: () => void;
        sendData: (data: string) => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        };
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
        };
        initDataUnsafe?: {
          user?: TelegramUser;
        };
      };
    };
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.GAME);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem('clicker_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          clicks: Number(parsed.clicks) || 0,
          level: Number(parsed.level) || 1,
          clickPower: Number(parsed.clickPower) || 1,
          passiveIncome: Number(parsed.passiveIncome) || 0
        };
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
    return {
      clicks: 0,
      level: 1,
      clickPower: 1,
      passiveIncome: 0
    };
  });

  const [floatingTexts, setFloatingTexts] = useState<{id: number, x: number, y: number, val: number}[]>([]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }

      const handleMainButton = () => {
        tg.sendData(JSON.stringify({ score: Math.floor(state.clicks), level: state.level }));
      };

      tg.MainButton.text = "SEND SCORE TO BOT";
      tg.MainButton.onClick(handleMainButton);
      tg.MainButton.show();
    }
  }, [state.clicks, state.level]);

  useEffect(() => {
    localStorage.setItem('clicker_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.passiveIncome > 0) {
      const interval = setInterval(() => {
        setState(prev => ({ ...prev, clicks: prev.clicks + prev.passiveIncome }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state.passiveIncome]);

  const handleMainClick = (e: React.MouseEvent | React.TouchEvent) => {
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setState(prev => ({ ...prev, clicks: prev.clicks + prev.clickPower }));
    
    const id = Date.now();
    setFloatingTexts(prev => [...prev, { id, x: clientX, y: clientY, val: state.clickPower }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 800);
  };

  const buyUpgrade = (type: 'click' | 'passive', cost: number) => {
    if (state.clicks >= cost) {
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred('heavy');
      setState(prev => ({
        ...prev,
        clicks: prev.clicks - cost,
        clickPower: type === 'click' ? prev.clickPower + 1 : prev.clickPower,
        passiveIncome: type === 'passive' ? prev.passiveIncome + 1 : prev.passiveIncome,
        level: prev.level + (Math.random() > 0.8 ? 1 : 0)
      }));
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--tg-theme-bg-color)] select-none">
      <header className="p-4 flex items-center justify-between border-b border-[var(--tg-theme-secondary-bg-color)]">
        <div className="flex items-center gap-2">
          {user?.photo_url ? (
            <img src={String(user.photo_url)} className="w-10 h-10 rounded-full border-2 border-blue-500" alt="User" />
          ) : (
            <UserCircleIcon className="w-10 h-10 text-blue-500" />
          )}
          <div>
            <p className="font-bold text-sm">{String(user?.first_name || 'Tester')}</p>
            <p className="text-[10px] text-[var(--tg-theme-hint-color)]">Level {Number(state.level)} Explorer</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--tg-theme-hint-color)]">App Status</p>
          <p className="text-[10px] font-mono opacity-50 text-green-500 font-bold">LIVE</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-b from-[var(--tg-theme-bg-color)] to-[var(--tg-theme-secondary-bg-color)]">
        
        {activeTab === AppTab.GAME && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CurrencyDollarIcon className="w-8 h-8 text-yellow-500 animate-pulse" />
                <h1 className="text-5xl font-black tracking-tighter">
                  {Math.floor(state.clicks).toLocaleString()}
                </h1>
              </div>
              <p className="text-[var(--tg-theme-hint-color)] text-sm font-medium">
                +{Number(state.passiveIncome)}/sec passive
              </p>
            </div>

            <div className="relative">
              <button 
                onMouseDown={handleMainClick}
                onTouchStart={handleMainClick}
                className="w-64 h-64 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full shadow-[0_0_50px_rgba(37,99,235,0.4)] active:scale-95 transition-transform flex items-center justify-center border-8 border-white/20"
              >
                <BoltIcon className="w-32 h-32 text-white drop-shadow-lg" />
              </button>
              
              {floatingTexts.map(t => (
                <span 
                  key={t.id} 
                  className="fixed pointer-events-none text-2xl font-bold text-blue-500 animate-bounce-up opacity-0"
                  style={{ left: t.x - 10, top: t.y - 40 }}
                >
                  +{Number(t.val)}
                </span>
              ))}
            </div>

            <div className="w-full max-w-xs bg-black/5 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${(state.clicks % 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {activeTab === AppTab.BOOSTS && (
          <div className="p-4 space-y-4 overflow-y-auto hide-scrollbar">
            <h2 className="text-xl font-bold px-2">Upgrades</h2>
            <div 
              onClick={() => buyUpgrade('click', (state.clickPower * 50))}
              className="bg-[var(--tg-theme-bg-color)] p-4 rounded-2xl flex items-center justify-between border border-black/5 active:bg-black/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <ArrowUpCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold">Multiclick</p>
                  <p className="text-xs text-[var(--tg-theme-hint-color)]">Level {Number(state.clickPower)}</p>
                </div>
              </div>
              <button className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                {Number(state.clickPower * 50)} 💰
              </button>
            </div>

            <div 
              onClick={() => buyUpgrade('passive', (state.passiveIncome + 1) * 100)}
              className="bg-[var(--tg-theme-bg-color)] p-4 rounded-2xl flex items-center justify-between border border-black/5 active:bg-black/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <RocketLaunchIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold">Auto-Miner</p>
                  <p className="text-xs text-[var(--tg-theme-hint-color)]">Level {Number(state.passiveIncome)}</p>
                </div>
              </div>
              <button className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                {Number((state.passiveIncome + 1) * 100)} 💰
              </button>
            </div>
          </div>
        )}

        {activeTab === AppTab.PROFILE && (
          <div className="p-6 space-y-6 text-center">
            <div className="inline-block p-4 bg-[var(--tg-theme-bg-color)] rounded-3xl shadow-sm border border-black/5">
              <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <UserCircleIcon className="w-16 h-16 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold">{String(user?.first_name || 'User')} {String(user?.last_name || '')}</h3>
              <p className="text-sm text-[var(--tg-theme-hint-color)]">@{String(user?.username || 'anonymous')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--tg-theme-bg-color)] p-4 rounded-2xl">
                <p className="text-[10px] uppercase text-[var(--tg-theme-hint-color)]">Total Score</p>
                <p className="text-xl font-black">{Math.floor(state.clicks)}</p>
              </div>
              <div className="bg-[var(--tg-theme-bg-color)] p-4 rounded-2xl">
                <p className="text-[10px] uppercase text-[var(--tg-theme-hint-color)]">User ID</p>
                <p className="text-sm font-mono">{String(user?.id || '00000000')}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="flex items-center justify-around py-3 bg-[var(--tg-theme-bg-color)] border-t border-[var(--tg-theme-secondary-bg-color)] pb-safe">
        <button 
          onClick={() => setActiveTab(AppTab.GAME)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.GAME ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <BoltIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">Tap</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.BOOSTS)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.BOOSTS ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <RocketLaunchIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">Boosts</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.PROFILE)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === AppTab.PROFILE ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <UserCircleIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">Stats</span>
        </button>
      </nav>

      <style>{`
        @keyframes bounce-up {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
        .animate-bounce-up {
          animation: bounce-up 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
