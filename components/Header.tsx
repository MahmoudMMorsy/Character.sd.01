import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Sparkles, Cpu, Cloud, LogOut, User as UserIcon, Palette } from 'lucide-react';

export type AppTheme = 'violet' | 'emerald' | 'cyberpunk' | 'velvet';

interface HeaderProps {
  isLocalMode: boolean;
  onToggleMode: (isLocal: boolean) => void;
  currentTheme: AppTheme;
  onChangeTheme: (theme: AppTheme) => void;
}

const Header: React.FC<HeaderProps> = ({ isLocalMode, onToggleMode, currentTheme, onChangeTheme }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const THEMES: { id: AppTheme; label: string; bg: string }[] = [
    { id: 'violet', label: 'بنفسجي فيوليت', bg: 'bg-violet-600' },
    { id: 'emerald', label: 'زمردي أوفلاين', bg: 'bg-emerald-600' },
    { id: 'cyberpunk', label: 'سايبر بنك الوردي', bg: 'bg-pink-600' },
    { id: 'velvet', label: 'مخملي ياقوتي', bg: 'bg-rose-600' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#090d16]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-cyan-400 p-0.5 shadow-lg shadow-violet-900/30 flex items-center justify-center">
            <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                Remix Studio
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  PRO
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">استوديو التصميم والذكاء الاصطناعي</p>
          </div>
        </div>

        {/* Controls, Theme Picker & Account */}
        <div className="flex items-center gap-2">

          {/* Theme Selector Button */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors android-touch"
              title="تغيير الثيم"
            >
              <Palette className="w-4 h-4 text-violet-400" />
            </button>

            {showThemePicker && (
              <div className="absolute left-0 mt-2 w-44 bg-[#131b2e] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 dir-rtl animate-fade-in">
                <p className="text-[10px] font-bold text-slate-400 px-2 py-1">اختر ثيم الواجهة:</p>
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onChangeTheme(theme.id);
                      setShowThemePicker(false);
                    }}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all android-touch ${
                      currentTheme === theme.id ? 'bg-white/10 text-white font-bold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${theme.bg}`}></span>
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Local vs Cloud Toggle Pill */}
          <button
            onClick={() => onToggleMode(!isLocalMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all android-touch ${
              isLocalMode
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
            }`}
          >
            {isLocalMode ? (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>TinyEngine™</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cloud AI</span>
              </>
            )}
          </button>

          {/* User Account Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <img
                src={user.photoURL || undefined}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full ring-2 ring-violet-500/40"
              />
              <button 
                onClick={handleSignOut}
                title="تسجيل الخروج"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors android-touch"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-md shadow-violet-900/40 hover:opacity-95 transition-all android-touch"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>دخول</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;
