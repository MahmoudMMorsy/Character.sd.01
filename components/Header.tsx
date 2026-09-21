
import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';

interface HeaderProps {
  isLocalMode: boolean;
  onToggleMode: (isLocal: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ isLocalMode, onToggleMode }) => {
  const [user, setUser] = useState<User | null>(null);

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

  return (
    <header className="bg-[#0f172a] pt-[max(0.5rem,env(safe-area-inset-top))] px-4 pb-1">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            AI REMIX
            </h1>
            <span className="text-[10px] text-gray-500 font-medium tracking-widest -mt-1">STUDIO PRO</span>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline-block">{user.email}</span>
              <button 
                onClick={handleSignOut}
                className="text-xs bg-gray-800 text-gray-300 hover:text-white px-3 py-1.5 rounded-md border border-gray-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="text-xs bg-purple-600 text-white hover:bg-purple-700 px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              Sign In
            </button>
          )}

          <div 
              onClick={() => onToggleMode(!isLocalMode)}
              className="flex items-center gap-2 bg-gray-800/80 p-1 pl-3 pr-1 rounded-full border border-gray-700/50 cursor-pointer transition-all active:scale-95"
          >
              <span className={`text-[10px] font-bold uppercase tracking-wide ${isLocalMode ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {isLocalMode ? 'LOCAL' : 'CLOUD'}
              </span>
              <div className={`w-10 h-6 rounded-full p-1 flex items-center transition-colors ${isLocalMode ? 'bg-emerald-600' : 'bg-gray-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isLocalMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
