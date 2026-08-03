import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select, StatCard } from './components/ui';
import { formatRs, generateId, todayISO } from './utils/helpers';
import { Edit2, Printer, Trash2, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

// Firebase Database Imports (Supports Realtime DB & Firestore)
import { db } from './firebase'; // Ensure path matches your firebaseConfig location
import { ref, remove, update } from 'firebase/database'; // Realtime DB
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'; // Firestore

const CashBank = ({ cashData = [], setCashData, userRole = '' }) => {
  const [form, setForm] = useState({
    date: todayISO(),
    account: 'Cash',
    amount: '',
    description: '',
    type: 'receipt',
  });

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    date: todayISO(),
    account: 'Cash',
    amount: '',
    description: '',
    type: 'receipt',
  });

  // Delete Confirmation & Loading State
  const [deletingItem, setDeletingItem] = useState(null);
  const [loading, setLoading] = useState(false);

  // Custom Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const isAdmin = useMemo(() => {
    return String(userRole || '').trim().toLowerCase() === 'admin';
  }, [userRole]);

  const totals = useMemo(() => {
    const cash = cashData.filter((entry) => entry.account === 'Cash').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const bank = cashData.filter((entry) => entry.account === 'Bank').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return { cash, bank };
  }, [cashData]);

  // Firebase Direct Delete Helper Function
  const deleteFromFirebaseDB = async (itemId) => {
    if (!itemId || !db) return;
    try {
      // 1. Try Realtime DB Removal
      const dbRef = ref(db, `cashData/${itemId}`);
      await remove(dbRef);
    } catch (e1) {
      try {
        // 2. Fallback to Firestore Doc Removal
        const docRef = doc(db, 'cashData', String(itemId));
        await deleteDoc(docRef);
      } catch (e2) {
        console.warn("Firebase record remove bypassed or failed:", e2);
      }
    }
  };

  // Firebase Direct Update Helper Function
  const updateInFirebaseDB = async (itemId, updatedData) => {
    if (!itemId || !db) return;
    try {
      const dbRef = ref(db, `cashData/${itemId}`);
      await update(dbRef, updatedData);
    } catch (e1) {
      try {
        const docRef = doc(db, 'cashData', String(itemId));
        await updateDoc(docRef, updatedData);
      } catch (e2) {
        console.warn("Firebase record update bypassed or failed:", e2);
      }
    }
  };

  const addTransaction = () => {
    if (!form.amount || !form.description) {
      showToast('Amount and description are required.', 'warning');
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

    showToast('Transaction added successfully!', 'success');
    setForm({ date: todayISO(), account: 'Cash', amount: '', description: '', type: 'receipt' });
  };

  // Handle Edit Click
  const handleEditClick = (row) => {
    if (!isAdmin) {
      showToast('Only admin login has access to edit transactions.', 'warning');
      return;
    }
    setEditingItem(row);
    const isPayment = Number(row.amount) < 0;
    setEditForm({
      date: row.date || todayISO(),
      account: row.account || 'Cash',
      amount: Math.abs(Number(row.amount)),
      description: row.description || '',
      type: row.type || (isPayment ? 'payment' : 'receipt'),
    });
  };

  // Submit Update Transaction
  const handleConfirmUpdate = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only admin can modify transactions.', 'warning');
      return;
    }

    if (!editForm.amount || !editForm.description) {
      showToast('Amount and description are required.', 'warning');
      return;
    }

    const signedAmount = editForm.type === 'payment' ? -Math.abs(Number(editForm.amount)) : Math.abs(Number(editForm.amount));

    const updatedData = {
      date: editForm.date,
      account: editForm.account,
      amount: signedAmount,
      description: editForm.description,
      type: editForm.type,
    };

    setLoading(true);
    try {
      if (editingItem?.id) {
        await updateInFirebaseDB(editingItem.id, updatedData);
      }

      setCashData((prevCashData) =>
        prevCashData.map((item) => {
          const isTarget = item.id && editingItem.id 
            ? item.id === editingItem.id 
            : (item.date === editingItem.date && item.description === editingItem.description && Number(item.amount) === Number(editingItem.amount));

          return isTarget ? { ...item, ...updatedData } : item;
        })
      );

      showToast('Transaction Entry has been updated', 'success');
      setEditingItem(null);
    } catch (err) {
      showToast('Failed to update record in database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Click
  const handleDeleteClick = (row) => {
    if (!isAdmin) {
      showToast('Only admin login has access to delete transactions.', 'warning');
      return;
    }
    setDeletingItem(row);
  };

  // Confirm Delete Transaction linked with Firebase
  const handleConfirmDelete = async () => {
    if (!isAdmin) {
      showToast('Only admin can delete transaction record.', 'warning');
      return;
    }

    if (!deletingItem) return;

    setLoading(true);

    try {
      // Direct Firebase Database sync call
      if (deletingItem.id) {
        await deleteFromFirebaseDB(deletingItem.id);
      }

      // Update Parent / Local State Array
      setCashData((prevCashData) =>
        prevCashData.filter((item) => {
          if (item.id && deletingItem.id && item.id === deletingItem.id) {
            return false;
          }
          const isSameEntry =
            item.date === deletingItem.date &&
            item.description === deletingItem.description &&
            Number(item.amount) === Number(deletingItem.amount);

          return !isSameEntry;
        })
      );

      showToast('Transaction Entry has been deleted permanently', 'success');
    } catch (err) {
      showToast('Failed to delete transaction from Firebase.', 'error');
    } finally {
      setLoading(false);
      setDeletingItem(null);
    }
  };

  // Handle Print Receipt
  const handlePrint = (row) => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    const isReceipt = Number(row.amount) >= 0;

    printWindow.document.write(`
      <html>
        <head>
          <title>Transaction Receipt - Naveed & Zeeshan Traders</title>
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
            <div class="title">${isReceipt ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER'}</div>
            <div class="sub-title">Naveed & Zeeshan Traders Mailsi</div>
            <div class="line"></div>
            <div class="row"><span>Voucher ID:</span> <span>${row.id || '-'}</span></div>
            <div class="row"><span>Date:</span> <span>${row.date}</span></div>
            <div class="row"><span>Account:</span> <span>${row.account}</span></div>
            <div class="line"></div>
            <div class="row" style="font-weight:bold; font-size:14px;">
              <span>Amount:</span> <span>${formatRs(Math.abs(row.amount))}</span>
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

  const recentTransactions = [...cashData].slice(-20).reverse();

  const columns = useMemo(() => {
    return [
      { key: 'date', label: 'Date' },
      { key: 'account', label: 'Account' },
      { key: 'description', label: 'Description' },
      {
        key: 'amount',
        label: 'Amount',
        render: (row) => (
          <span className={Number(row.amount) >= 0 ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
            {formatRs(row.amount)}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-1.5 justify-start">
            {/* EDIT ICON */}
            <button
              type="button"
              onClick={() => handleEditClick(row)}
              className={`p-1.5 bg-slate-950 border rounded-lg transition ${
                isAdmin
                  ? 'text-slate-400 hover:text-blue-400 border-slate-800 hover:border-blue-500/40 cursor-pointer'
                  : 'text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Edit Transaction" : "Admin Access Required"}
            >
              <Edit2 size={14} />
            </button>

            {/* PRINT ICON */}
            <button
              type="button"
              onClick={() => handlePrint(row)}
              className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-lg transition cursor-pointer"
              title="Print Voucher"
            >
              <Printer size={14} />
            </button>

            {/* DELETE ICON */}
            <button
              type="button"
              onClick={() => handleDeleteClick(row)}
              className={`p-1.5 bg-slate-950 border rounded-lg transition ${
                isAdmin
                  ? 'text-slate-400 hover:text-rose-400 border-slate-800 hover:border-rose-500/40 cursor-pointer'
                  : 'text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Delete Transaction" : "Admin Access Required"}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ];
  }, [userRole, isAdmin]);

  return (
    <PageShell title="Finance Hub">
      <div className="space-y-6 relative">
        
        {/* CUSTOM TOAST NOTIFICATION */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 transition-all duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-400 shadow-emerald-900/20'
                : toast.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/40 text-amber-400 shadow-amber-900/20'
                : 'bg-slate-900/95 border-rose-500/40 text-rose-400 shadow-rose-900/20'
            }`}>
              {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
              {toast.type === 'warning' && <AlertCircle size={18} className="text-amber-400" />}
              {toast.type === 'error' && <AlertCircle size={18} className="text-rose-400" />}
              <span>{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard title="Cash in Hand" value={formatRs(totals.cash)} tone="emerald" />
          <StatCard title="Bank Balance" value={formatRs(totals.bank)} tone="blue" />
        </div>

        {/* Manual Transaction Card */}
        {isAdmin && (
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

        {/* Recent Transactions Table */}
        <Card title="Recent Transactions">
          <DataTable columns={columns} rows={recentTransactions} />
        </Card>

        {/* EDIT MODAL */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 size={16} className="text-blue-400" />
                  Edit Transaction Entry
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmUpdate} className="space-y-3">
                <Input label="Date" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                <Select label="Account" value={editForm.account} onChange={(e) => setEditForm({ ...editForm, account: e.target.value })}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </Select>
                <Select label="Type" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                  <option value="receipt">Receipt (+)</option>
                  <option value="payment">Payment (-)</option>
                </Select>
                <Input label="Amount" type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
                <Input label="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Delete Transaction Entry</h3>
                  <p className="text-xs text-slate-400">Admin Confirmation Required</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete this transaction permanently from Firebase Database?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Ok
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
};

export default CashBank;