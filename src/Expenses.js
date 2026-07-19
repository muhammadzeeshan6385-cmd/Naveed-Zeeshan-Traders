import React, { useState, useMemo } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, todayISO } from './utils/helpers';

// currentRole prop add kiya hai (Aap isme page render karte waqt currentRole="admin" ya currentRole={user?.role} pass karein)
const Expenses = ({ expenses = [], setExpenses, cashData = [], setCashData, currentRole = '' }) => {
  const [form, setForm] = useState({
    category: '',
    amount: '',
    date: todayISO(),
    description: '',
    account: 'Cash',
  });

  // Edit state track karne ke liye
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setForm({
      category: '',
      amount: '',
      date: todayISO(),
      description: '',
      account: 'Cash',
    });
    setEditingId(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.category || !form.amount) {
      window.alert('Category and amount are required.');
      return;
    }

    const amount = Number(form.amount);
    const isAdmin = String(currentRole).toLowerCase() === 'admin';

    if (editingId) {
      // --- EDIT MODE SECURITY GUARD ---
      if (!isAdmin) {
        window.alert('Only admin can modify or update expenses.');
        return;
      }

      const oldExpense = expenses.find((e) => e.id === editingId);

      setExpenses(
        expenses.map((exp) =>
          exp.id === editingId
            ? { ...exp, category: form.category, amount, date: form.date, description: form.description, account: form.account }
            : exp
        )
      );

      // Cash register update balance reversal
      const updatedCashData = cashData.filter((c) => !(c.description === `Expense: ${oldExpense?.category}` && c.date === oldExpense?.date));
      
      setCashData([
        ...updatedCashData,
        {
          id: generateId(),
          date: form.date,
          account: form.account,
          amount: -amount,
          description: `Expense: ${form.category}`,
          type: 'payment',
        },
      ]);

    } else {
      // --- NEW ENTRY MODE ---
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
    }
    resetForm();
  };

  const handleEditClick = (row) => {
    setEditingId(row.id);
    setForm({
      category: row.category,
      amount: row.amount,
      date: row.date,
      description: row.description,
      account: row.account,
    });
  };

  const handlePrint = (row) => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Expense Voucher - Naveed & Zeeshan Traders</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; font-size: 12px; }
            .ticket { width: 100%; max-width: 280px; margin: 0 auto; }
            .title { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .sub-title { text-align: center; font-size: 10px; margin-bottom: 10px; color: #333; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 10px; border-top: 1px solid #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="title">EXPENSE VOUCHER</div>
            <div class="sub-title">Naveed & Zeeshan Traders Mailsi</div>
            <div class="line"></div>
            <div class="row"><span>Voucher ID:</span> <span>${row.id}</span></div>
            <div class="row"><span>Date:</span> <span>${row.date}</span></div>
            <div class="row"><span>Category:</span> <span>${row.category}</span></div>
            <div class="row"><span>Paid From:</span> <span>${row.account}</span></div>
            <div class="line"></div>
            <div class="row" style="font-weight:bold; font-size:14px;">
              <span>Net Amount:</span> <span>Rs. ${Number(row.amount).toLocaleString()}</span>
            </div>
            <div class="line"></div>
            <div class="row"><span>Description:</span> <span>${row.description || '-'}</span></div>
            <div class="line"></div>
            <div class="footer">Wholesale Management Network Systems</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const recentExpenses = useMemo(() => {
    return [...expenses].slice(-20).reverse();
  }, [expenses]);

  // UseMemo ke zariye columns strict array structure bnaya hai
  const columns = useMemo(() => {
    const isAdmin = String(currentRole).toLowerCase() === 'admin';
    
    const baseCols = [
      { key: 'date', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount', render: (row) => `Rs. ${Number(row.amount).toLocaleString()}` },
      { key: 'account', label: 'Account' },
      { key: 'description', label: 'Description' },
    ];

    // Agar admin login hai to Actions header empty list par b solid push hoga
    if (isAdmin) {
      baseCols.push({
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div className="flex gap-2 justify-start">
            <button 
              type="button"
              onClick={() => handleEditClick(row)}
              className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer"
            >
              Edit
            </button>
            <button 
              type="button"
              onClick={() => handlePrint(row)}
              className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Print
            </button>
          </div>
        ),
      });
    }

    return baseCols;
  }, [currentRole]);

  return (
    <PageShell title="Business Expenses">
      <Card title={editingId ? "Update Expense (Admin Mode)" : "Expense Entry"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Rent, Fuel, Salary..." />
          <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Paid From" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
          </Select>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex items-end gap-2">
            <Button type="submit">{editingId ? 'Update Expense' : 'Save Expense'}</Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Recent Expenses">
        <DataTable columns={columns} rows={recentExpenses} />
      </Card>
    </PageShell>
  );
};

export default Expenses;