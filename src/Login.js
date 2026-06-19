import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    const rawData = localStorage.getItem("users");
    console.log("Raw Data from LocalStorage:", rawData); // Ye console mein dikhayega
    
    const storedUsers = rawData ? JSON.parse(rawData) : [{ username: 'Admin', role: 'Admin', pass: '1234' }];
    console.log("Parsed Users:", storedUsers);

    const user = storedUsers.find(u => u.username === username && u.pass === password);

    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      onLogin(user);
    } else {
      alert("Invalid! Check Console (F12) to see what is saved in storage.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-blue-900">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <input className="w-full border p-3 mb-4 rounded" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" className="w-full border p-3 mb-6 rounded" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-3 rounded font-bold">Login</button>
      </div>
    </div>
  );
};
export default Login;