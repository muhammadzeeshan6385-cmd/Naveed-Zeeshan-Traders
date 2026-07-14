import React, { useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { STORAGE_KEYS, DEFAULT_SETTINGS, COMPANY_NAME } from './utils/constants';
import { saveToStorage } from './utils/storage';
import { encodePassword, exportBackup } from './utils/helpers';
import { useLocalStorage } from './hooks/useLocalStorage';

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
  const [users, setUsers] = useLocalStorage(STORAGE_KEYS.users, [{ username: 'Admin', role: 'Admin', pass: 'MTIzNA==' }]);
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [newUser, setNewUser] = useState({ username: '', role: 'Salesman', pass: '' });

  const addUser = () => {
    if (!newUser.username || !newUser.pass) {
      window.alert('Username and password are required.');
      return;
    }

    setUsers([
      ...users,
      {
        username: newUser.username.trim(),
        role: newUser.role,
        pass: encodePassword(newUser.pass),
      },
    ]);
    setNewUser({ username: '', role: 'Salesman', pass: '' });
  };

  const changeUserPass = (username) => {
    const newPass = window.prompt(`Enter new password for ${username}:`);
    if (!newPass) return;
    setUsers(users.map((user) => (user.username === username ? { ...user, pass: encodePassword(newPass) } : user)));
  };

  const handleBackup = () => {
    exportBackup({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      products,
      customers,
      suppliers,
      purchases,
      sales,
      payments,
      expenses,
      cashData,
      users,
      settings,
    });
  };

  const handleRestore = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
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
        if (data.users) setUsers(data.users);
        if (data.settings) setSettings(data.settings);

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
      <Card title="Company Profile">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Company Name" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
          <Input label="Phone" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          <Input label="Address" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          <Input label="Invoice Prefix" value={settings.invoicePrefix} onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })} />
        </div>
        <Button className="mt-4" onClick={() => saveToStorage(STORAGE_KEYS.settings, settings)}>
          Save Company Settings
        </Button>
      </Card>

      <Card title="User Management">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input label="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
          <Input label="Password" type="password" value={newUser.pass} onChange={(e) => setNewUser({ ...newUser, pass: e.target.value })} />
          <Select label="Role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
            <option>Admin</option>
            <option>Manager</option>
            <option>Accountant</option>
            <option>Salesman</option>
          </Select>
          <div className="flex items-end">
            <Button onClick={addUser}>Add User</Button>
          </div>
        </div>

        <div className="mt-6">
          <DataTable
            columns={[
              { key: 'username', label: 'Username' },
              { key: 'role', label: 'Role' },
              {
                key: 'action',
                label: 'Action',
                render: (row) => (
                  <Button variant="secondary" onClick={() => changeUserPass(row.username)}>
                    Change Password
                  </Button>
                ),
              },
            ]}
            rows={users.map((user, index) => ({ ...user, id: user.username || index }))}
          />
        </div>
      </Card>

      <Card title="Backup & Restore">
        <p className="mb-4 text-sm text-slate-400">
          Export all business data as JSON or restore from a previous backup. Recommended before major updates.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleBackup}>Download Backup</Button>
          <label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-600">
            Restore Backup
            <input type="file" accept="application/json" className="hidden" onChange={handleRestore} />
          </label>
        </div>
      </Card>

      <Card title="System Info">
        <p className="text-sm text-slate-400">Application: {settings.companyName || COMPANY_NAME}</p>
        <p className="text-sm text-slate-400">Version: 2.0.0</p>
        <p className="text-sm text-slate-400">Storage: Browser localStorage (Vercel-compatible client-side persistence)</p>
      </Card>
    </PageShell>
  );
};

export default Settings;
