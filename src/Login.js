import React, { useState } from 'react';
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#051124] overflow-hidden px-4 select-none">
      
      {/* 1. Main Outer Neon Circle Border - Increased Size from 480px to 540px/580px */}
      <div className="relative w-[95vw] h-[95vw] sm:w-[85vw] sm:h-[85vw] max-w-[540px] max-h-[540px] lg:max-w-[580px] lg:max-h-[580px] rounded-full border-4 border-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.15)] flex items-center justify-center transition-all duration-300 bg-[#061630]/40 backdrop-blur-sm">
        
        {/* 2. Thick Dashed Animated Ring (Exact Reel Look) - Adjusted padding for larger view */}
        <div className="absolute inset-5 rounded-full border-[12px] border-dashed border-emerald-400/30 animate-[spin_60s_linear_infinite] shadow-[0_0_20px_rgba(52,211,153,0.1)]" />
        
        {/* 3. Inner Dotted Accent Circle */}
        <div className="absolute inset-12 rounded-full border-2 border-dotted border-cyan-400/20 animate-[spin_30s_linear_infinite_reverse]" />
        
        {/* Deep Central Blue Glow */}
        <div className="absolute w-[70%] h-[70%] bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Content Area (Completely Transparent Integration) - Expanded Max Width for fields */}
        <div className="relative z-10 w-full max-w-[330px] flex flex-col items-center px-4">
          
          {/* Logo Branding - Size Increased significantly from 160px to 220px */}
          <div className="flex flex-col items-center justify-center mb-8 transition-all duration-300">
            <img 
              src="/logo-dark.png" 
              alt="Logo" 
              className="w-[220px] sm:w-[240px] h-auto dark:hidden" 
            />
            <img 
              src="/logo-light.png" 
              alt="Logo" 
              className="w-[220px] sm:w-[240px] h-auto hidden dark:block filter drop-shadow-[0_4px_12px_rgba(34,211,238,0.4)]" 
            />
          </div>

          {/* Core Input Form */}
          <form onSubmit={handleLogin} className="w-full space-y-6">
            
            {/* Username Input with Floating Neon Border */}
            <div className="relative">
              <label className="absolute left-5 -top-2 bg-[#051124] px-2 text-[11px] font-black text-emerald-400 tracking-wider rounded">
                Username
              </label>
              <input 
                type="text"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter username" 
                autoComplete="username"
                required
                className="w-full bg-transparent border-2 border-emerald-500/40 text-white rounded-full px-6 py-3 text-xs font-semibold tracking-wide outline-none focus:border-emerald-400 focus:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all"
              />
            </div>

            {/* Password Input with Floating Neon Border */}
            <div className="relative">
              <label className="absolute left-5 -top-2 bg-[#051124] px-2 text-[11px] font-black text-cyan-400 tracking-wider rounded">
                Password
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password" 
                autoComplete="current-password"
                required
                className="w-full bg-transparent border-2 border-cyan-500/40 text-white rounded-full px-6 py-3 text-xs font-semibold tracking-wide outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
              />
            </div>
            
            {error && (
              <p className="text-[11px] text-rose-400 font-bold tracking-wide text-center bg-rose-950/40 py-1.5 rounded-md border border-rose-500/20 animate-pulse">
                {error}
              </p>
            )}
            
            {/* Full Neon Cyan Glossy Login Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-[0.2em] py-3.5 rounded-full shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:shadow-[0_0_40px_rgba(34,211,238,0.7)] transition-all duration-300 transform active:scale-95"
              >
                Login
              </button>
            </div>

            {/* System Info Link Text */}
            <p className="text-center text-[9px] text-slate-500 font-bold tracking-widest pt-1 uppercase">
            </p>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;