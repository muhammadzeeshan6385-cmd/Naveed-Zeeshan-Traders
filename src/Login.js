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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-4">
      <Card className="w-full max-w-md border-emerald-500/20">
        
        {/* Logo Section - Mode ke hisaab se switch hoga */}
        <div className="flex justify-center mb-8 mt-6">
           {/* Light mode mein logo-dark.png dikhayega */}
           <img 
             src="/logo-dark.png" 
             alt="Logo" 
             className="w-[250px] h-auto dark:hidden" 
           />
           
           {/* Dark mode mein logo-light.png dikhayega */}
           <img 
             src="/logo-light.png" 
             alt="Logo" 
             className="w-[250px] h-auto hidden dark:block" 
           />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input 
            label="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Enter username" 
            autoComplete="username" 
          />
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter password" 
            autoComplete="current-password" 
          />
          
          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-500 font-medium">
              {error}
            </p>
          )}
          
          <Button type="submit" className="w-full mt-2">Sign In</Button>
          
          <p className="text-center text-xs text-slate-500 pt-2">Default: Admin / 1234</p>
        </form>
      </Card>
    </div>
  );
};

export default Login;