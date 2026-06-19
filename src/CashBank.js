import React, { useState } from 'react';

const CashBank = ({ cashData = [], setCashData }) => { // Default array diya
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], account: 'Cash', amount: '', description: '' });

  const addTransaction = () => {
    if (!form.amount) return;
    setCashData([...cashData, form]);
    setForm({ date: new Date().toISOString().split('T')[0], account: 'Cash', amount: '', description: '' });
  };

  // Safety check: Agar cashData undefined ho toh 0 result dega
  const totalCash = (cashData || []).filter(c => c.account === 'Cash').reduce((acc, c) => acc + Number(c.amount), 0);
  const totalBank = (cashData || []).filter(c => c.account === 'Bank').reduce((acc, c) => acc + Number(c.amount), 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-green-200">
      <h2 className="text-2xl font-bold mb-6 text-green-800">Cash & Bank Summary</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-green-100 p-6 rounded-xl text-center">
          <p className="text-green-700">Cash in Hand</p>
          <h3 className="text-3xl font-bold text-green-900">Rs. {totalCash}</h3>
        </div>
        <div className="bg-blue-100 p-6 rounded-xl text-center">
          <p className="text-blue-700">Bank Balance</p>
          <h3 className="text-3xl font-bold text-blue-900">Rs. {totalBank}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <select className="border p-3 rounded" value={form.account} onChange={(e) => setForm({...form, account: e.target.value})}>
          <option value="Cash">Cash</option>
          <option value="Bank">Bank</option>
        </select>
        <input type="number" className="border p-3 rounded" placeholder="Amount" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} />
        <input className="border p-3 rounded col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
      </div>
      <button onClick={addTransaction} className="bg-green-600 text-white px-6 py-2 rounded font-bold">Add Transaction</button>
    </div>
  );
};
export default CashBank;