import React, { useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, generateId, getCreditSalesTotal, todayISO } from './utils/helpers';

const Recovery = ({ payments, setPayments, customers, cashData, setCashData, sales }) => {
  const [form, setForm] = useState({
    date: todayISO(),
    customer: '',
    amount: '',
    account: 'Cash',
    note: '',
  });

  const outstanding = form.customer ? getCreditSalesTotal(sales, form.customer) - payments.filter((p) => p.customer === form.customer).reduce((sum, p) => sum + Number(p.amount || 0), 0) : 0;

  const addRecovery = () => {
    if (!form.customer || !form.amount) {
      window.alert('Customer and amount are required.');
      return;
    }

    const amount = Number(form.amount);
    const entry = {
      id: generateId(),
      date: form.date,
      customer: form.customer,
      amount,
      account: form.account,
      note: form.note,
    };

    setPayments([...payments, entry]);
    setCashData([
      ...cashData,
      {
        id: generateId(),
        date: form.date,
        account: form.account,
        amount,
        description: `Recovery from ${form.customer}`,
        type: 'receipt',
      },
    ]);

    setForm({ date: todayISO(), customer: '', amount: '', account: 'Cash', note: '' });
  };

  const recentPayments = [...payments].slice(-15).reverse();

  return (
    <PageShell title="Recovery" subtitle="Record customer payments and sync cash, bank, and khata automatically">
      <Card title="Payment Entry">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Customer" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.name}>
                {customer.name}
              </option>
            ))}
          </Select>
          <Input label="Amount Received" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="Received In" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
          </Select>
          <Input label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        {form.customer && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Outstanding balance for {form.customer}: {formatRs(outstanding)}
          </p>
        )}
        <Button className="mt-4" onClick={addRecovery}>
          Process Payment
        </Button>
      </Card>

      <Card title="Recent Recoveries">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'amount', label: 'Amount', render: (row) => formatRs(row.amount) },
            { key: 'account', label: 'Account' },
          ]}
          rows={recentPayments}
        />
      </Card>
    </PageShell>
  );
};

export default Recovery;
