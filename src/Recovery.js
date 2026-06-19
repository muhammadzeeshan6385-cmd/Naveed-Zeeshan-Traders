import React, { useState } from 'react';

const Recovery = ({ payments, setPayments, customers, cashData, setCashData }) => {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], customer: '', amount: '', account: 'Cash' });

  const addRecovery = () => {
    if (!form.customer || !form.amount) return;
    
    // 1. Khata/Payments mein add karein
    setPayments([...payments, form]);
    
    // 2. Cash/Bank mein add karein (Inventory/Finance link)
    setCashData([...cashData, { 
      date: form.date, 
      account: form.account, 
      amount: form.amount, 
      description: `Recovery from ${form.customer}` 
    }]);
    
    setForm({ date: new Date().toISOString().split('T')[0], customer: '', amount: '', account: 'Cash' });
    alert("Payment recorded in Khata, Daily Recovery, and Cash/Bank successfully!");
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-green-200">
      <h2 className="text-2xl font-bold mb-6 text-green-800">Payment Recovery (Auto-Sync)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <select className="border p-3 rounded" onChange={(e) => setForm({...form, customer: e.target.value})}>
          <option>Select Customer</option>
          {customers.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
        </select>
        <input type="number" className="border p-3 rounded" placeholder="Amount Received" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} />
        <select className="border p-3 rounded" onChange={(e) => setForm({...form, account: e.target.value})}>
          <option value="Cash">Cash in Hand</option>
          <option value="Bank">Bank Account</option>
        </select>
      </div>
      <button onClick={addRecovery} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold">Process Payment & Update All</button>
    </div>
  );
};
export default Recovery;