import React, { useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, todayISO } from './utils/helpers';

const Expenses = ({ expenses, setExpenses, cashData, setCashData }) => {
  const [form, setForm] = useState({
    category: '',
    amount: '',
    date: todayISO(),
    description: '',
    account: 'Cash',
  });

  const resetForm = () =>
    setForm({
      category: '',
      amount: '',
      date: todayISO(),
      description: '',
      account: 'Cash',
    });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.category || !form.amount) {
      window.alert('Category and amount are required.');
      return;
    }

    const amount = Number(form.amount);
    const entry = {
      id: generateId(),
      category: form.category,
      amount,
      date: form.date,
      description: form.description,
      account: form.account,
    };

    setExpenses([...expenses, entry]);
    setCashData([
      ...cashData,
      {
        id: generateId(),
        date: form.date,
        account: form.account,
        amount: -amount,
        description: `Expense: ${form.category}`,
        type: 'payment',
      },
    ]);
    resetForm();
  };

  const recentExpenses = [...expenses].slice(-20).reverse();

  return (
    <PageShell title="Expenses" subtitle="Track operating costs and sync them with cash and bank balances">
      <Card title="Expense Entry">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Rent, Fuel, Salary..." />
          <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Paid From" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
          </Select>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex items-end">
            <Button type="submit">Save Expense</Button>
          </div>
        </form>
      </Card>

      <Card title="Recent Expenses">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'category', label: 'Category' },
            { key: 'amount', label: 'Amount', render: (row) => `Rs. ${Number(row.amount).toLocaleString()}` },
            { key: 'account', label: 'Account' },
            { key: 'description', label: 'Description' },
          ]}
          rows={recentExpenses}
        />
      </Card>
    </PageShell>
  );
};

export default Expenses;