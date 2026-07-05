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
    <div className="relative flex min-h-screen items-center justify-center bg-[#070b12] overflow-hidden px-4 select-none">
      
      {/* Outer Wrapper jo Circle aur Card ko exact center me balance rakhta hai */}
      <div className="relative flex items-center justify-center w-full max-w-[550px] aspect-square">
        
        {/* --- Cyberpunk Reels Style Circular Dashes & Rings --- */}
        {/* Outer Tech Notch Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-500/20 animate-[spin_80s_linear_infinite]" />
        
        {/* Main Thick Dashed Glow Ring (Jo reel me logo k gird ghoom rhi hai) */}
        <div className="absolute inset-4 rounded-full border-[14px] border-dashed border-emerald-500/15 animate-[spin_40s_linear_infinite_reverse] shadow-[inset_0_0_30px_rgba(16,185,129,0.05),0_0_30px_rgba(16,185,129,0.05)]" />
        
        {/* Inner Dotted Indicator */}
        <div className="absolute inset-12 rounded-full border-[3px] border-dotted border-cyan-400/30 animate-[spin_20s_linear_infinite]" />
        
        {/* Central Ambient Radial Glow */}
        <div className="absolute w-[70%] h-[70%] bg-gradient-to-tr from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-[60px]" />

        {/* --- Main Login Card (Bilkul Circle ke center me adjusted) --- */}
        <div className="absolute w-[82%] aspect-square flex flex-col justify-center backdrop-blur-md bg-slate-950/75 rounded-full p-10 border border-slate-800/60 shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-all duration-500 hover:border-emerald-500/20">
          
          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center mb-6 mt-4">
            {/* Light mode logo */}
            <img 
              src="/logo-dark.png" 
              alt="Logo" 
              className="w-[170px] h-auto dark:hidden transition-transform duration-300 hover:scale-105" 
            />
            {/* Dark mode logo */}
            <img 
              src="/logo-light.png" 
              alt="Logo" 
              className="w-[170px] h-auto hidden dark:block transition-transform duration-300 hover:scale-105 filter drop-shadow-[0_4px_10px_rgba(16,185,129,0.1)]" 
            />
            
            <h2 className="text-cyan-400 font-bold text-[9px] tracking-[0.25em] uppercase mt-2 animate-pulse">
              Secure Terminal
            </h2>
          </div>

          {/* Form Content */}
          <form onSubmit={handleLogin} className="space-y-3 max-w-[260px] mx-auto w-full">
            <div className="relative">
              <Input 
                label="Username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter username" 
                autoComplete="username"
                className="w-full bg-slate-900/60 border-slate-800/80 text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-3 py-2 text-xs transition-all"
              />
            </div>

            <div className="relative">
              <Input 
                label="Password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password" 
                autoComplete="current-password"
                className="w-full bg-slate-900/60 border-slate-800/80 text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl px-3 py-2 text-xs transition-all"
              />
            </div>
            
            {error && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-[10px] text-rose-400 font-semibold text-center animate-pulse">
                {error}
              </div>
            )}
            
            <div className="pt-1">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs tracking-wider py-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all duration-300 transform active:scale-[0.97]"
              >
                Sign In Terminal
              </Button>
            </div>
            
            {/* Footer Text */}
            <p className="text-center text-[9px] text-slate-600 tracking-widest pt-1">
              DEFAULT: ADMIN / 1234
            </p>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;