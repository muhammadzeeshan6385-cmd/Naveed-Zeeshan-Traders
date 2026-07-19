import React, { useState } from 'react';
import { Eye, Pencil, Trash2, X } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, generateId, getCreditSalesTotal, todayISO } from './utils/helpers';

// Firebase Firestore imports
import { db } from './firebase'; 
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const Recovery = ({ payments, setPayments, customers, cashData, setCashData, sales, userRole }) => {
  // Case-insensitivity handle karne ke liye secure admin check
  const isAdmin = userRole && typeof userRole === 'string' && userRole.toLowerCase().trim() === 'admin';

  const [form, setForm] = useState({
    date: todayISO(),
    customer: '',
    amount: '',
    account: 'Cash',
    note: '',
  });

  // Edit Popup aur submission states
  const [editingRecovery, setEditingRecovery] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const outstanding = form.customer ? getCreditSalesTotal(sales, form.customer) - payments.filter((p) => p.customer === form.customer).reduce((sum, p) => sum + Number(p.amount || 0), 0) : 0;

  const addRecovery = async () => {
    if (!isAdmin) {
      window.alert('Unauthorized access. Only admins can process payments.');
      return;
    }
    if (!form.customer || !form.amount) {
      window.alert('Customer and amount are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const amount = Number(form.amount);
      const customId = generateId();

      const entry = {
        id: customId,
        date: form.date,
        customer: form.customer,
        amount,
        account: form.account,
        note: form.note,
      };

      // Firebase Firestore entry write path
      await setDoc(doc(db, 'payments', customId), entry);

      setPayments([entry, ...payments]);

      if (setCashData) {
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
      }

      setForm({ date: todayISO(), customer: '', amount: '', account: 'Cash', note: '' });
      window.alert('Payment recovery saved successfully!');
    } catch (error) {
      console.error("Firebase write error:", error);
      window.alert("Database me save karte hue error aya: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecovery = async (row) => {
    if (!isAdmin) {
      window.alert('Unauthorized action. Only admins can delete records.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this recovery entry?')) {
      const targetId = row.id || row._id;
      if (!targetId) {
        window.alert("Recovery entry ID missing.");
        return;
      }

      try {
        await deleteDoc(doc(db, 'payments', targetId));
        setPayments(payments.filter(p => p.id !== targetId && p._id !== targetId));
        console.log("Recovery successfully deleted from Firebase.");
      } catch (error) {
        console.error("Firebase deletion error:", error);
        window.alert("Database se delete karte hue error aya: " + error.message);
      }
    }
  };

  const updateRecovery = async () => {
    if (!isAdmin) {
      window.alert('Unauthorized data modification attempt.');
      return;
    }

    const targetId = editingRecovery.id || editingRecovery._id;
    if (!targetId) {
      window.alert("Recovery entry ID missing for execution.");
      return;
    }

    try {
      setIsSubmitting(true);
      const amount = Number(editingRecovery.amount) || 0;

      const updatedPayload = {
        ...editingRecovery,
        amount
      };

      await updateDoc(doc(db, 'payments', targetId), updatedPayload);

      setPayments(payments.map(p => (p.id === targetId || p._id === targetId) ? updatedPayload : p));
      setEditingRecovery(null);
      console.log("Recovery updated successfully inside Firestore.");
    } catch (error) {
      console.error("Firebase update path error:", error);
      window.alert("Database record update error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const recentPayments = [...payments].slice(-15).reverse();

  return (
    <PageShell title="Payment Recovery">
      {/* Form Entry Box Layer - Admin Shield */}
      {isAdmin && (
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
          <Button className="mt-4" onClick={addRecovery} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Process Payment'}
          </Button>
        </Card>
      )}

      <Card title="Recent Recoveries" className="mt-4">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'amount', label: 'Amount', render: (row) => formatRs(row.amount) },
            { key: 'account', label: 'Account' },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => alert('Viewing Recovery Details for: ' + row.customer)} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer" title="Preview"><Eye size={18} /></button>
                  
                  {/* Admin Protected Operations */}
                  {isAdmin && (
                    <>
                      <button onClick={() => setEditingRecovery(row)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded cursor-pointer" title="Edit"><Pencil size={18} /></button>
                      <button onClick={() => deleteRecovery(row)} className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded cursor-pointer" title="Delete"><Trash2 size={18} /></button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={recentPayments}
        />
      </Card>

      {/* Edit Recovery Modal Portal */}
      {isAdmin && editingRecovery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">Edit Recovery Entry</h2>
              <button onClick={() => setEditingRecovery(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Input label="Amount Received" type="number" value={editingRecovery.amount} onChange={(e) => setEditingRecovery({...editingRecovery, amount: e.target.value})} />
              <Input label="Note" value={editingRecovery.note || ''} onChange={(e) => setEditingRecovery({...editingRecovery, note: e.target.value})} />
            </div>
            <Button className="w-full mt-6" onClick={updateRecovery} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default Recovery;