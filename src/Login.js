import React, { useState } from 'react';
import { Card, Input, Button } from './components/ui/index';
import { STORAGE_KEYS, DEFAULT_USERS } from './utils/constants';
import { loadFromStorage } from './utils/storage';
import { verifyPassword } from './utils/helpers';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (event) => {
    event.preventDefault();
    setError('');

    const storedUsers = loadFromStorage(STORAGE_KEYS.users, DEFAULT_USERS);
    const user = storedUsers.find((entry) => entry.username === username && verifyPassword(password, entry.pass));

    if (user) {
      onLogin({ username: user.username, role: user.role });
      return;
    }

    setError('Invalid username or password.');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#090d16] overflow-hidden px-4 select-none">
      
      {/* 3D Animated Cyberpunk Background Rings (Reel Style) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-75 md:scale-100">
        <div className="absolute w-[500px] h-[500px] rounded-full border-[12px] border-dashed border-emerald-500/10 animate-[spin_120s_linear_infinite]" />
        <div className="absolute w-[460px] h-[460px] rounded-full border-[6px] border-dotted border-cyan-500/20 animate-[spin_60s_linear_infinite_reverse]" />
        <div className="absolute w-[400px] h-[400px] rounded-full border-[16px] border-dashed border-slate-800/40 animate-[spin_40s_linear_infinite]" />
        
        {/* Central Ambient Glow */}
        <div className="absolute w-[300px] h-[300px] bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 rounded-full blur-[80px]" />
      </div>

      {/* Main Glassmorphic 3D Card CONTAINER */}
      <div className="relative w-full max-w-[420px] backdrop-blur-xl bg-slate-950/60 rounded-3xl p-8 border border-slate-800/80 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7),0_0_40px_rgba(16,185,129,0.05)] transition-all duration-500 hover:border-emerald-500/30">
        
        {/* Header Indicator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981]" />

        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-10 mt-2">
          {/* Light mode logo */}
          <img 
            src="/logo-dark.png" 
            alt="Logo" 
            className="w-[220px] h-auto dark:hidden transition-transform duration-300 hover:scale-105" 
          />
          {/* Dark mode logo */}
          <img 
            src="/logo-light.png" 
            alt="Logo" 
            className="w-[220px] h-auto hidden dark:block transition-transform duration-300 hover:scale-105 filter drop-shadow-[0_4px_12px_rgba(16,185,129,0.15)]" 
          />
          
          <h2 className="text-cyan-400 font-bold text-xs tracking-[0.3em] uppercase mt-4 animate-pulse">
            Secure Terminal
          </h2>
        </div>

        {/* Form Inputs with Floating 3D/Neon Style */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="group relative transition-all duration-300">
            <Input 
              label="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter username" 
              autoComplete="username"
              className="w-full bg-slate-900/50 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-3 text-sm transition-all shadow-inner"
            />
            <div className="absolute right-3 top-9 opacity-40 group-focus-within:opacity-100 text-cyan-400 transition-opacity">
              <span className="text-xs">⊙</span>
            </div>
          </div>

          <div className="group relative transition-all duration-300">
            <Input 
              label="Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter password" 
              autoComplete="current-password"
              className="w-full bg-slate-900/50 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-4 py-3 text-sm transition-all shadow-inner"
            />
            <div className="absolute right-3 top-9 opacity-40 group-focus-within:opacity-100 text-emerald-400 transition-opacity">
              <span className="text-xs">🔒</span>
            </div>
          </div>
          
          {/* Error Message Layout */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-2.5 text-xs text-rose-400 font-semibold tracking-wide animate-[shake_0.3s_ease-in-out]">
              ⚠️ {error}
            </div>
          )}
          
          {/* Cyberpunk Glow Button */}
          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm tracking-wider py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300 transform active:scale-[0.98]"
            >
              Sign In Terminal
            </Button>
          </div>
          
          {/* Footer Note */}
          <div className="flex items-center justify-between border-t border-slate-900 pt-4 mt-4 text-[11px] text-slate-600 font-medium">
            <span>SYSTEM NODE: V3.1</span>
            <span className="tracking-widest">DEFAULT: ADMIN / 1234</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;