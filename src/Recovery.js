import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, generateId, todayISO } from './utils/helpers';

// Firebase Firestore imports
import { db } from './firebase'; 
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const Recovery = ({ payments = [], setPayments, customers = [], cashData = [], setCashData, sales = [], returns = [], userRole, currentUser }) => {
  // Case-insensitivity handle karne ke liye secure admin check
  const activeUsername = String(currentUser?.username || currentUser?.id || '').trim().toLowerCase();
  const activeRole = String(userRole || currentUser?.role || '').trim().toLowerCase();
  const isAdmin = activeUsername === 'admin' || activeRole === 'admin';

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

  // Success Popup State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Confirmation Delete Modal State
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  // Safe Number Parsing Helper
  const cleanNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const parsed = Number(String(val).replace(/,/g, '').trim());
    return isNaN(parsed) ? 0 : parsed;
  };

  // --- DYNAMIC OUTSTANDING LEDGER BALANCE (Opening Balance + Sales - Payments - Returns) ---
  const outstanding = useMemo(() => {
    if (!form.customer) return 0;

    const normCustomerName = form.customer.trim().toLowerCase();

    // 1. Customer Details & Opening Balance Search
    const custObj = customers.find(
      (c) => c.name?.trim().toLowerCase() === normCustomerName || String(c.id) === String(form.customer)
    );

    const openingBal = custObj ? cleanNum(
      custObj.previousBalance ??
      custObj.openingBalance ?? 
      custObj.openBalance ?? 
      custObj.opening_balance ?? 
      custObj.initialBalance ?? 
      custObj.prevBalance ?? 
      custObj.opening ?? 
      custObj.balance
    ) : 0;

    // 2. Calculate Total Credit Sales for Customer
    const totalSales = (sales || [])
      .filter((s) => {
        const sCust = (s.customer || s.customerName || '').trim().toLowerCase();
        const matchName = sCust === normCustomerName;
        const matchId = custObj?.id && String(s.customerId) === String(custObj.id);
        const isCredit = 
          s.isCredit === true || 
          String(s.paymentMethod || s.paymentType).toLowerCase() === 'credit' || 
          String(s.status).toLowerCase() === 'credit' ||
          s.type === 'Credit';
        return (matchName || matchId) && (isCredit || !s.paymentType);
      })
      .reduce((sum, s) => sum + cleanNum(s.netTotal || s.total || s.amount || s.grandTotal || s.billNet), 0);

    // 3. Calculate Total Payments Received
    const totalPaid = (payments || [])
      .filter((p) => {
        const pCust = (p.customer || p.customerName || '').trim().toLowerCase();
        const matchName = pCust === normCustomerName;
        const matchId = custObj?.id && String(p.customerId) === String(custObj.id);
        return matchName || matchId;
      })
      .reduce((sum, p) => sum + cleanNum(p.amount), 0);

    // 4. Calculate Total Returns
    const totalReturned = (returns || [])
      .filter((r) => {
        const rCust = (r.customer || r.customerName || '').trim().toLowerCase();
        const matchName = rCust === normCustomerName;
        const matchId = custObj?.id && String(r.customerId) === String(custObj.id);
        return matchName || matchId;
      })
      .reduce((sum, r) => sum + cleanNum(r.refundAmount || r.netTotal || r.amount), 0);

    return Math.round(openingBal + totalSales - totalPaid - totalReturned);
  }, [form.customer, customers, sales, payments, returns]);

  const addRecovery = async () => {
    if (!isAdmin) {
      setSuccessMessage('Unauthorized access. Only admins can process payments.');
      setShowSuccessModal(true);
      return;
    }
    if (!form.customer || !form.amount) {
      setSuccessMessage('Customer and amount are required.');
      setShowSuccessModal(true);
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
      setSuccessMessage('Payment recovery saved successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Firebase write error:", error);
      setSuccessMessage("Database me save karte hue error aya: " + error.message);
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DELETE HANDLERS ---
  const handleRequestDelete = (row) => {
    if (!isAdmin) {
      setSuccessMessage('Unauthorized action. Only admins can delete records.');
      setShowSuccessModal(true);
      return;
    }
    setEntryToDelete(row);
    setShowConfirmDelete(true);
  };

  const confirmAndExecuteDelete = async () => {
    if (!entryToDelete) return;

    const targetId = entryToDelete.id || entryToDelete._id;
    if (!targetId) {
      setSuccessMessage("Recovery entry ID missing.");
      setShowSuccessModal(true);
      setShowConfirmDelete(false);
      return;
    }

    try {
      await deleteDoc(doc(db, 'payments', targetId));
      setPayments(payments.filter(p => p.id !== targetId && p._id !== targetId));
      
      setShowConfirmDelete(false);
      setSuccessMessage("The Payment Entry has been deleted from your record");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Firebase deletion error:", error);
      setShowConfirmDelete(false);
      setSuccessMessage("Database se delete karte hue error aya: " + error.message);
      setShowSuccessModal(true);
    } finally {
      setEntryToDelete(null);
    }
  };

  // --- UPDATE HANDLER ---
  const updateRecovery = async () => {
    if (!isAdmin) {
      setSuccessMessage('Unauthorized data modification attempt.');
      setShowSuccessModal(true);
      return;
    }

    const targetId = editingRecovery.id || editingRecovery._id;
    if (!targetId) {
      setSuccessMessage("Recovery entry ID missing for execution.");
      setShowSuccessModal(true);
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
      
      setSuccessMessage("Updated Amount");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Firebase update path error:", error);
      setSuccessMessage("Database record update error: " + error.message);
      setShowSuccessModal(true);
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
                  <button onClick={() => {
                    setSuccessMessage(`Viewing Recovery Details for: ${row.customer}`);
                    setShowSuccessModal(true);
                  }} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer" title="Preview"><Eye size={18} /></button>
                  
                  {/* Admin Protected Operations */}
                  {isAdmin && (
                    <>
                      <button onClick={() => setEditingRecovery(row)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded cursor-pointer" title="Edit"><Pencil size={18} /></button>
                      <button onClick={() => handleRequestDelete(row)} className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded cursor-pointer" title="Delete"><Trash2 size={18} /></button>
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

      {/* --- CONFIRM DELETE MODAL --- */}
      {showConfirmDelete && entryToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle size={36} className="stroke-[2.5]" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Are you sure you want to delete this recovery entry?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer: <span className="font-semibold text-slate-700 dark:text-slate-200">{entryToDelete.customer}</span>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowConfirmDelete(false)}
                className="w-1/2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium py-2 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAndExecuteDelete}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-xl"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS POPUP MODAL --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={40} className="stroke-[2.5]" />
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {successMessage}
            </h3>

            <div className="pt-2">
              <Button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-xl"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default Recovery;