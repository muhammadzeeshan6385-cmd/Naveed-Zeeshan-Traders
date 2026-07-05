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
      
      {/* 1. Main Outer Neon Circle Border */}
      <div className="absolute w-[95vw] h-[95vw] max-w-[480px] max-h-[480px] rounded-full border-2 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.2)] flex items-center justify-center">
        
        {/* 2. Thick Dashed Animated Ring (Exact Reel Look) */}
        <div className="absolute inset-4 rounded-full border-[10px] border-dashed border-emerald-400/40 animate-[spin_50s_linear_infinite] shadow-[0_0_15px_rgba(52,211,153,0.15)]" />
        
        {/* 3. Inner Dotted Accent Circle */}
        <div className="absolute inset-10 rounded-full border border-dotted border-cyan-400/20 animate-[spin_25s_linear_infinite_reverse]" />
        
        {/* Deep Central Blue Glow */}
        <div className="absolute w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none" />

        {/* Content Area (No Card Backing - Completely Transparent Integration) */}
        <div className="relative z-10 w-full max-w-[290px] flex flex-col items-center">
          
          {/* Logo Branding */}
          <div className="flex flex-col items-center justify-center mb-6">
            <img 
              src="/logo-dark.png" 
              alt="Logo" 
              className="w-[160px] h-auto dark:hidden" 
            />
            <img 
              src="/logo-light.png" 
              alt="Logo" 
              className="w-[160px] h-auto hidden dark:block filter drop-shadow-[0_2px_8px_rgba(34,211,238,0.3)]" 
            />
          </div>

          {/* Core Input Form */}
          <form onSubmit={handleLogin} className="w-full space-y-5">
            
            {/* Username Input with Floating Neon Border */}
            <div className="relative">
              <label className="absolute left-4 -top-2 bg-[#051124] px-1 text-[10px] font-bold text-emerald-400/80 tracking-wider">
                Username
              </label>
              <input 
                type="text"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter username" 
                autoComplete="username"
                required
                className="w-full bg-transparent border-2 border-emerald-500/50 text-white rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(52,211,153,0.4)] transition-all"
              />
            </div>

            {/* Password Input with Floating Neon Border */}
            <div className="relative">
              <label className="absolute left-4 -top-2 bg-[#051124] px-1 text-[10px] font-bold text-cyan-400/80 tracking-wider">
                Password
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password" 
                autoComplete="current-password"
                required
                className="w-full bg-transparent border-2 border-cyan-500/50 text-white rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
              />
            </div>
            
            {error && (
              <p className="text-[10px] text-rose-400 font-bold tracking-wide text-center bg-rose-950/40 py-1 rounded-md border border-rose-500/20 animate-pulse">
                {error}
              </p>
            )}
            
            {/* Full Neon Cyan Glossy Login Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-[0.2em] py-3 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.6)] hover:shadow-[0_0_35px_rgba(34,211,238,0.8)] transition-all duration-300 transform active:scale-95"
              >
                Login
              </button>
            </div>

            {/* System Info Link Text */}
            <p className="text-center text-[9px] text-slate-500 font-bold tracking-widest pt-1 uppercase">
              Node Node: Admin / 1234
            </p>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;