import React, { useState } from 'react';
import { Card, Input, Button } from './components/ui';
import { STORAGE_KEYS, DEFAULT_USERS } from './utils/constants';
import { loadFromStorage } from './utils/storage';
import { verifyPassword } from './utils/helpers';

const Login = ({ onLogin, companyName }) => {
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-4">
      <Card className="w-full max-w-md border-emerald-500/20">
        
        {/* Yahan logo ka size 300px kiya gaya hai aur filter lagaya gaya hai taake text white ho jaye */}
        <div className="flex justify-center mb-6">
           <img 
             src="/logo.png" 
             alt="Logo" 
             style={{ 
               width: '300px', 
               height: 'auto',
               filter: 'brightness(0) invert(1)' 
             }} 
           />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" autoComplete="username" />
          <Input label="Password" type="password" value={password} onChange={(e) => setUsername(e.target.value)} placeholder="Enter password" autoComplete="current-password" />
          {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <Button type="submit" className="w-full">Sign In</Button>
          <p className="text-center text-xs text-slate-500">Default: Admin / 1234</p>
        </form>
      </Card>
    </div>
  );
};

export default Login;