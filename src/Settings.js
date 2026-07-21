import React, { useState, useEffect } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './utils/constants';
import { saveToStorage } from './utils/storage';
import { encodePassword, exportBackup } from './utils/helpers';
import { useLocalStorage } from './hooks/useLocalStorage';

// Firebase Database instances
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

const AVAILABLE_MODULES = [
  { id: 'Products', label: 'Products Inventory' },
  { id: 'Inventory', label: 'Inventory Logs' },
  { id: 'Customers', label: 'Client Directory' },
  { id: 'Suppliers', label: 'Vendors' },
  { id: 'Purchases', label: 'Procurement' },
  { id: 'Sales', label: 'Sales Terminal' },
  { id: 'SearchBill', label: 'Search Bill' },
  { id: 'ProductReturn', label: 'Product Return' },
  { id: 'Recovery', label: 'Payment Recovery' },
  { id: 'Khata', label: 'Account Ledger' },
  { id: 'Expenses', label: 'Business Expenses' },
  { id: 'Cash/Bank', label: 'Finance Hub' },
  { id: 'Reports', label: 'Analytics Report' },
  { id: 'Settings', label: 'System Settings' }
];

const Settings = ({
  products,
  customers,
  suppliers,
  purchases,
  sales,
  payments,
  expenses,
  cashData,
  setProducts,
  setCustomers,
  setSuppliers,
  setPurchases,
  setSales,
  setPayments,
  setExpenses,
  setCashData,
}) => {
  const ALL_MODULE_IDS = AVAILABLE_MODULES.map(m => m.id);

  // Active user recognition
  const [currentUser] = useState(() => {
    try {
      const sessionUser = JSON.parse(localStorage.getItem('nzt_currentUser')) || 
                          JSON.parse(localStorage.getItem('currentUser')) || {};
      return sessionUser;
    } catch {
      return {};
    }
  });

  // Strict Protection Check: Only Admin profile is allowed full control and editing privileges
  const currentUsername = String(currentUser.username || currentUser.id || '').trim().toLowerCase();
  const currentUserRole = String(currentUser.role || '').trim().toLowerCase();
  const isAdmin = currentUsername === 'admin' || currentUserRole === 'admin';

  // Users State live sync with Firestore
  const [users, setUsersState] = useState([]);
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  
  // Forms and Modals State
  const [newUser, setNewUser] = useState({ username: '', role: 'Salesman', pass: '', modules: ['Sales'] });
  const [selfPassword, setSelfPassword] = useState({ newPass: '', confirmPass: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [oldPasswordText, setOldPasswordText] = useState('');
  const [newPasswordText, setNewPasswordText] = useState('');
  
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);

  const [showTickPopup, setShowTickPopup] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Firebase Live Sync Effect for Users
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const dbUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (dbUsers.length === 0) {
        const defaultAdmin = {
          username: 'Admin',
          role: 'Admin',
          pass: 'MTIzNA==',
          modules: ALL_MODULE_IDS
        };
        setDoc(doc(db, "users", "Admin"), defaultAdmin);
        setUsersState([defaultAdmin]);
      } else {
        setUsersState(dbUsers);
      }
    });

    return () => unsubscribe();
  }, []);

  // Force full modules if adding an admin role
  useEffect(() => {
    if (newUser.role === 'Admin') {
      setNewUser(prev => ({ ...prev, modules: ALL_MODULE_IDS }));
    }
  }, [newUser.role]);

  const saveUserToFirebase = async (userObj) => {
    if (!isAdmin) return; // Strict block for non-admins trying to execute function hooks
    try {
      await setDoc(doc(db, "users", userObj.username), userObj, { merge: true });
    } catch (error) {
      console.error("Firebase User Save Error: ", error);
      window.alert("Cloud Database me user save nahi ho saka.");
    }
  };

  // Self Password Update Logic (Allowed for everyone)
  const handleSelfPasswordUpdate = async (e) => {
    e.preventDefault();
    if (!selfPassword.newPass || !selfPassword.confirmPass) {
      window.alert('Please Enter New Password.');
      return;
    }
    if (selfPassword.newPass !== selfPassword.confirmPass) {
      window.alert('The new password and confirmation password do not match.');
      return;
    }

    const activeUserKey = currentUser.username || currentUser.id || (isAdmin ? 'Admin' : null);
    if (!activeUserKey) {
      window.alert('Active login session user nahi mil saka.');
      return;
    }

    try {
      await setDoc(doc(db, "users", activeUserKey), {
        pass: encodePassword(selfPassword.newPass.trim())
      }, { merge: true });

      setSelfPassword({ newPass: '', confirmPass: '' });
      triggerSuccessToast('Password Updated!', 'Aapka password kamyabi se update ho gaya hai.');
    } catch (err) {
      window.alert('Password update karne me koi error aya hai.');
    }
  };

  const addUser = async () => {
    if (!isAdmin) return;
    if (!newUser.username || !newUser.pass) {
      window.alert('Username and password are required.');
      return;
    }

    if (users.some(u => u.username.toLowerCase() === newUser.username.trim().toLowerCase())) {
      window.alert('Yeh Username pehle se maujood hai.');
      return;
    }

    const assignedModules = newUser.role === 'Admin' ? ALL_MODULE_IDS : newUser.modules;
    const createdUser = {
      username: newUser.username.trim(),
      role: newUser.role,
      pass: encodePassword(newUser.pass),
      modules: assignedModules,
    };

    await saveUserToFirebase(createdUser);
    setNewUser({ username: '', role: 'Salesman', pass: '', modules: ['Sales'] });
    triggerSuccessToast('User Created!', 'Naya user aur uske modules database me save ho chuke hain.');
  };

  const handleModuleToggle = (moduleId) => {
    if (!isAdmin || newUser.role === 'Admin') return; 
    if (newUser.modules.includes(moduleId)) {
      setNewUser({ ...newUser, modules: newUser.modules.filter(id => id !== moduleId) });
    } else {
      setNewUser({ ...newUser, modules: [...newUser.modules, moduleId] });
    }
  };

  const openPasswordModal = (userObj) => {
    if (!isAdmin) return;
    let decodedPass = '';
    try { decodedPass = atob(userObj.pass); } catch (e) { decodedPass = '********'; }
    setSelectedUser(userObj);
    setOldPasswordText(decodedPass);
    setNewPasswordText('');
    setModalOpen(true);
  };

  const handlePasswordUpdate = async () => {
    if (!isAdmin) return;
    if (!newPasswordText.trim()) {
      window.alert('Please Enter New Passowrd.');
      return;
    }
    const updatedUser = { ...selectedUser, pass: encodePassword(newPasswordText.trim()) };
    await saveUserToFirebase(updatedUser);
    setModalOpen(false);
    triggerSuccessToast('Password Updated!', 'Password cloud database me tabdeel ho chuka hai.');
  };

  const openPermissionModal = (userObj) => {
    if (!isAdmin) return;
    setPermissionUser(userObj);
    setSelectedModules(userObj.role === 'Admin' ? ALL_MODULE_IDS : (userObj.modules || []));
    setPermissionModalOpen(true);
  };

  const handlePermissionUpdate = async () => {
    if (!isAdmin) return;
    const finalModules = permissionUser.role === 'Admin' ? ALL_MODULE_IDS : selectedModules;
    const updatedUser = { ...permissionUser, modules: finalModules };
    await saveUserToFirebase(updatedUser);
    setPermissionModalOpen(false);
    triggerSuccessToast('Permissions Saved!', 'User ke modules cloud database me update ho gaye hain.');
  };

  const togglePermissionModule = (moduleId) => {
    if (!isAdmin || permissionUser?.role === 'Admin') return; 
    if (selectedModules.includes(moduleId)) {
      setSelectedModules(selectedModules.filter(id => id !== moduleId));
    } else {
      setSelectedModules([...selectedModules, moduleId]);
    }
  };

  const triggerSuccessToast = (title, msg) => {
    setToastMessage({ title, msg });
    setShowTickPopup(true);
    setTimeout(() => setShowTickPopup(false), 3000);
  };

  const handleBackup = () => {
    if (!isAdmin) return;
    exportBackup({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      products, customers, suppliers, purchases, sales, payments, expenses, cashData, users, settings
    });
  };

  const handleRestore = (event) => {
    if (!isAdmin) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!window.confirm('Restore backup? This will overwrite current data.')) return;
        if (data.products) setProducts(data.products);
        if (data.customers) setCustomers(data.customers);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.purchases) setPurchases(data.purchases);
        if (data.sales) setSales(data.sales);
        if (data.payments) setPayments(data.payments);
        if (data.expenses) setExpenses(data.expenses);
        if (data.cashData) setCashData(data.cashData);
        if (data.settings) setSettings(data.settings);
        
        if (data.users && Array.isArray(data.users)) {
          for (const u of data.users) {
            if (u.username) await setDoc(doc(db, "users", u.username), u, { merge: true });
          }
        }
        window.alert('Backup restored successfully.');
      } catch {
        window.alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <PageShell title="System Settings">
      
      {/* 1. PASSWORD UPDATE INTERFACE - YEH PANEL SAB KO DIKHEGA */}
      <Card title="Account Password Security">
        <form onSubmit={handleSelfPasswordUpdate} className="space-y-4">
          <p className="text-xs text-slate-400"></p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input 
              label="New Password" 
              type="password" 
              value={selfPassword.newPass} 
              onChange={(e) => setSelfPassword({ ...selfPassword, newPass: e.target.value })} 
              placeholder="Enter New Password"
            />
            <Input 
              label="Confirm New Password" 
              type="password" 
              value={selfPassword.confirmPass} 
              onChange={(e) => setSelfPassword({ ...selfPassword, confirmPass: e.target.value })} 
              placeholder="Re Enter New Password"
            />
          </div>
          <div className="flex justify-end mt-2">
            <Button type="submit">Update My Password</Button>
          </div>
        </form>
      </Card>

      {/* 2. ADMIN SECURE PANELS - BAKI ACCOUNT LOGIN MEIN YEH PURA SECTION ZAHIR NAHI HOGA */}
      {isAdmin && (
        <>
          <Card title="Company Profile">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Company Name" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
              <Input label="Phone" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              <Input label="Address" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              <Input label="Invoice Prefix" value={settings.invoicePrefix} onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })} />
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => saveToStorage(STORAGE_KEYS.settings, settings)}>
                Save Company Settings
              </Button>
              <Button variant="secondary" onClick={handleBackup}>
                Export System Backup
              </Button>
              <label className="inline-flex items-center justify-center rounded-xl font-semibold text-sm px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700 transition">
                Import/Restore Backup
                <input type="file" className="hidden" onChange={handleRestore} accept=".json" />
              </label>
            </div>
          </Card>

          <Card title="User Management & Module Access">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 items-start">
              <Input label="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
              <Input label="Password" type="password" value={newUser.pass} onChange={(e) => setNewUser({ ...newUser, pass: e.target.value })} />
              <Select label="Role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option>Admin</option>
                <option>Manager</option>
                <option>Accountant</option>
                <option>Salesman</option>
              </Select>
              <div className="pt-6">
                <Button onClick={addUser} className="w-full">Add New User</Button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Select Allowed Modules for New User (Module Access):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {AVAILABLE_MODULES.map((mod) => (
                  <label 
                    key={mod.id} 
                    className={`flex items-center gap-2 text-sm p-2.5 rounded border transition-colors select-none ${
                      newUser.role === 'Admin' 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed border-slate-300 dark:border-slate-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newUser.role === 'Admin' ? true : newUser.modules.includes(mod.id)}
                      disabled={newUser.role === 'Admin'}
                      onChange={() => handleModuleToggle(mod.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 disabled:opacity-70"
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <DataTable
                columns={[
                  { key: 'username', label: 'Username' },
                  { key: 'role', label: 'Role' },
                  { 
                    key: 'modules', 
                    label: 'Allowed Modules',
                    render: (row) => (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block max-w-xs truncate">
                        {row.role === 'Admin' ? 'All Modules Enabled (Full Access)' : (
                          row.modules && row.modules.length > 0 
                            ? row.modules.map(m => AVAILABLE_MODULES.find(am => am.id === m)?.label).filter(Boolean).join(', ')
                            : 'No Modules Allowed'
                        )}
                      </span>
                    )
                  },
                  {
                    key: 'action',
                    label: 'Actions',
                    render: (row) => (
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => openPasswordModal(row)}>
                          Change Password
                        </Button>
                        <Button variant="secondary" onClick={() => openPermissionModal(row)}>
                          Permissions
                        </Button>
                      </div>
                    ),
                  },
                ]}
                rows={users.map((user, index) => ({ ...user, id: user.username || index }))}
              />
            </div>
          </Card>

          <Card title="System Info">
            <p className="text-sm text-slate-400">Developed By: Muhammad Zeeshan</p>
            <p className="text-sm text-slate-400">Version: 2.0.0</p>
            <p className="text-sm text-slate-400">Storage: Firebase Database (Vercel-compatible client-side persistence)</p>
          </Card>
        </>
      )}

      {/* --- MODALS CONTROLS --- */}
      {isAdmin && modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Change Password ({selectedUser?.username})</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <Input label="Current Password" value={oldPasswordText} disabled className="bg-slate-50 dark:bg-slate-800 cursor-not-allowed text-slate-400" />
              <Input label="New Password" type="text" value={newPasswordText} onChange={(e) => setNewPasswordText(e.target.value)} placeholder="Please Type New Password" />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handlePasswordUpdate}>Ok</Button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && permissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit Permissions ({permissionUser?.username})</h3>
              <button onClick={() => setPermissionModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg">✕</button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Is user ko allowed modules check mark krein:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
              {AVAILABLE_MODULES.map((mod) => (
                <label 
                  key={mod.id} 
                  className={`flex items-center gap-2 text-sm p-2.5 rounded border transition-colors select-none ${
                    permissionUser?.role === 'Admin'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed border-slate-300 dark:border-slate-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={permissionUser?.role === 'Admin' ? true : selectedModules.includes(mod.id)}
                    disabled={permissionUser?.role === 'Admin'}
                    onChange={() => togglePermissionModule(mod.id)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 disabled:opacity-70"
                  />
                  {mod.label}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setPermissionModalOpen(false)}>Cancel</Button>
              <Button onClick={handlePermissionUpdate}>Save Permissions</Button>
            </div>
          </div>
        </div>
      )}

      {showTickPopup && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl shadow-xl">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white font-bold">✓</div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{toastMessage.title}</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">{toastMessage.msg}</p>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default Settings;