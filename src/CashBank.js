import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select, StatCard } from './components/ui';
import { formatRs, generateId, todayISO } from './utils/helpers';

const CashBank = ({ cashData = [], setCashData, userRole }) => {
  const [form, setForm] = useState({
    date: todayISO(),
    account: 'Cash',
    amount: '',
    description: '',
    type: 'receipt',
  });

  const totals = useMemo(() => {
    const cash = cashData.filter((entry) => entry.account === 'Cash').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const bank = cashData.filter((entry) => entry.account === 'Bank').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return { cash, bank };
  }, [cashData]);

  const addTransaction = () => {
    if (!form.amount || !form.description) {
      window.alert('Amount and description are required.');
      return;
    }

    const signedAmount = form.type === 'payment' ? -Math.abs(Number(form.amount)) : Math.abs(Number(form.amount));

    setCashData([
      ...cashData,
      {
        id: generateId(),
        date: form.date,
        account: form.account,
        amount: signedAmount,
        description: form.description,
        type: form.type,
      },
    ]);

    setForm({ date: todayISO(), account: 'Cash', amount: '', description: '', type: 'receipt' });
  };

  const recentTransactions = [...cashData].slice(-20).reverse();

  return (
    <PageShell title="Finance Hub">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard title="Cash in Hand" value={formatRs(totals.cash)} tone="emerald" />
        <StatCard title="Bank Balance" value={formatRs(totals.bank)} tone="blue" />
      </div>

      {/* Manual Transaction Card and Button are only accessible/visible to the admin user */}
      {userRole === 'admin' && (
        <Card title="Manual Transaction">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select label="Account" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </Select>
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="receipt">Receipt (+)</option>
              <option value="payment">Payment (-)</option>
            </Select>
            <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={addTransaction}>
            Add Transaction
          </Button>
        </Card>
      )}

      <Card title="Recent Transactions">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'account', label: 'Account' },
            { key: 'description', label: 'Description' },
            {
              key: 'amount',
              label: 'Amount',
              render: (row) => (
                <span className={Number(row.amount) >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatRs(row.amount)}</span>
              ),
            },
          ]}
          rows={recentTransactions}
        />
      </Card>
    </PageShell>
  );
};

export default CashBank;