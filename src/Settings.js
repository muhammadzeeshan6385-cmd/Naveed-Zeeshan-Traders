import React, { useState } from 'react';

const Settings = () => {
  const [users, setUsers] = useState(JSON.parse(localStorage.getItem("users")) || [{ username: 'Admin', role: 'Admin', pass: '1234' }]);
  const [newUser, setNewUser] = useState({ username: '', role: 'Salesman', pass: '' });

  const addUser = () => {
    if(!newUser.username || !newUser.pass) return alert("All fields required!");
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setNewUser({ username: '', role: 'Salesman', pass: '' });
  };

  const changeUserPass = (username) => {
    const newPass = prompt(`Enter new password for ${username}:`);
    if (newPass) {
      const updated = users.map(u => u.username === username ? {...u, pass: newPass} : u);
      setUsers(updated);
      localStorage.setItem("users", JSON.stringify(updated));
      alert("Password updated!");
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-red-600">NEW SETTINGS PAGE</h2>
      
      {/* Create New User Section */}
      <div className="grid grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
        <input className="border p-2 rounded" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} />
        <input className="border p-2 rounded" type="password" placeholder="Password" value={newUser.pass} onChange={(e) => setNewUser({...newUser, pass: e.target.value})} />
        <select className="border p-2 rounded" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
          <option>Admin</option><option>Manager</option><option>Salesman</option>
        </select>
        <button onClick={addUser} className="bg-green-600 text-white rounded">Add User</button>
      </div>

      {/* Table */}
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-blue-900 text-white"><th className="p-3">Username</th><th className="p-3">Role</th><th className="p-3">Action</th></tr></thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={i} className="border-b">
              <td className="p-3 font-semibold">{u.username}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">
                <button onClick={() => changeUserPass(u.username)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Change Password</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default Settings;