import React, { useState, useMemo, useEffect } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, todayISO } from './utils/helpers';
import { Edit2, Printer, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

// Firebase Firestore Imports
import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

// Helper to generate Auto Transaction ID Code
const generateTransactionId = () => {
  const dateStr = todayISO().replace(/-/g, '');
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${dateStr}-${randomStr}`;
};

const Expenses = ({ expenses = [], setExpenses, cashData = [], setCashData, currentRole = '' }) => {
  const [form, setForm] = useState({
    transactionId: generateTransactionId(),
    category: '',
    amount: '',
    date: todayISO(),
    description: '',
    account: 'Cash',
  });

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  
  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState(null);

  // Custom Dark Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const isAdmin = useMemo(() => {
    return String(currentRole || '').trim().toLowerCase() === 'admin';
  }, [currentRole]);

  // --- FIREBASE LIVE FETCH ON MOUNT WITH AUTO CODE ALLOCATION FOR OLD ENTRIES ---
  useEffect(() => {
    const fetchExpensesFromFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "expenses"));
        const firebaseExpenses = [];
        let indexCounter = 1000;

        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          let allocatedTxnId = data.transactionId;

          // If old record does not have transactionId, allot code and sync back to Firebase
          if (!allocatedTxnId) {
            indexCounter += 1;
            allocatedTxnId = `TXN-OLD-${indexCounter}`;
            try {
              await updateDoc(doc(db, "expenses", docSnap.id), { transactionId: allocatedTxnId });
            } catch (err) {
              console.error("Auto Code Allocation Error:", err);
            }
          }

          firebaseExpenses.push({
            docId: docSnap.id,
            id: docSnap.id,
            ...data,
            transactionId: allocatedTxnId
          });
        }

        if (firebaseExpenses.length > 0) {
          setExpenses(firebaseExpenses);
        }
      } catch (error) {
        console.error("Firebase Expense Fetch Error:", error);
      }
    };

    fetchExpensesFromFirebase();
  }, [setExpenses]);

  const resetForm = () => {
    setForm({
      transactionId: generateTransactionId(),
      category: '',
      amount: '',
      date: todayISO(),
      description: '',
      account: 'Cash',
    });
    setEditingItem(null);
  };

  // Submit New Expense directly from form (Saved to Firebase)
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.category || !form.amount) {
      showToast('Category and amount are required.', 'warning');
      return;
    }

    const amount = Number(form.amount);
    const customId = generateId();
    const finalTxnId = form.transactionId || generateTransactionId();

    const newExpense = {
      id: customId,
      transactionId: finalTxnId,
      category: form.category,
      amount,
      date: form.date,
      description: form.description,
      account: form.account,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save to Firebase "expenses" collection
      const docRef = await addDoc(collection(db, "expenses"), newExpense);
      const entry = { docId: docRef.id, ...newExpense };

      // 2. Save Cash Register entry to Firebase "cashData"
      const cashEntry = {
        id: generateId(),
        transactionId: finalTxnId,
        date: form.date,
        account: form.account,
        amount: -amount,
        description: `Expense (${finalTxnId}): ${form.category}`,
        type: 'payment',
        expenseDocId: docRef.id
      };
      const cashDocRef = await addDoc(collection(db, "cashData"), cashEntry);
      const cashEntryWithDoc = { docId: cashDocRef.id, ...cashEntry };

      // 3. Local State Sync
      setExpenses([entry, ...expenses]);
      setCashData([cashEntryWithDoc, ...cashData]);

      showToast('New expense entry added successfully!', 'success');
      resetForm();
    } catch (err) {
      console.error("Firebase Add Error: ", err);
      showToast('Firebase Error: Expense save nahi ho saka.', 'error');
    }
  };

  // Handle Update Confirmation from Modal (Updated in Firebase)
  const handleConfirmUpdate = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only admin can modify or update expenses.', 'warning');
      return;
    }

    if (!form.category || !form.amount) {
      showToast('Category and amount are required.', 'warning');
      return;
    }

    const amount = Number(form.amount);
    const targetDocId = editingItem?.docId || editingItem?.id;

    try {
      const updatedData = {
        transactionId: form.transactionId,
        category: form.category,
        amount,
        date: form.date,
        description: form.description,
        account: form.account,
      };

      // 1. Update in Firebase Firestore
      if (targetDocId) {
        const expDocRef = doc(db, "expenses", String(targetDocId));
        await updateDoc(expDocRef, updatedData);
      }

      // 2. Update Local State
      setExpenses(
        expenses.map((exp) => {
          const expId = exp.docId || exp.id;
          return expId === targetDocId ? { ...exp, ...updatedData } : exp;
        })
      );

      showToast('Expense Entry has been updated', 'success');
      resetForm();
    } catch (err) {
      console.error("Firebase Update Error: ", err);
      showToast('Firebase Error: Update fail ho gya.', 'error');
    }
  };

  // Handle Delete Confirmation from Modal (Deleted from Firebase)
  const handleConfirmDelete = async () => {
    if (!isAdmin) {
      showToast('Only admin can delete expenses from record.', 'warning');
      return;
    }

    if (!deletingItem) return;

    const targetExpense = deletingItem;
    const targetDocId = targetExpense.docId || targetExpense.id;

    try {
      // 1. Delete Document from Firebase Firestore (With Query Fallback)
      if (targetDocId) {
        await deleteDoc(doc(db, "expenses", String(targetDocId)));
      }
      
      const q = query(collection(db, "expenses"), where("id", "==", String(targetExpense.id)));
      const querySnapshot = await getDocs(q);
      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(doc(db, "expenses", docSnap.id));
      }

      // 2. Delete linked Cash Entry in Firestore
      const cashQ = query(
        collection(db, "cashData"),
        where("expenseDocId", "==", targetDocId)
      );
      const cashSnapshot = await getDocs(cashQ);
      for (const cashSnap of cashSnapshot.docs) {
        await deleteDoc(doc(db, "cashData", cashSnap.id));
      }

      // 3. Filter out deleted expense locally
      setExpenses(
        expenses.filter((exp) => {
          const expId = exp.docId || exp.id;
          return expId !== targetDocId && exp.id !== targetExpense.id;
        })
      );

      // 4. Remove corresponding cash entry locally
      setCashData(
        cashData.filter(
          (c) => c.expenseDocId !== targetDocId && !(c.description.includes(targetExpense.category) && c.date === targetExpense.date)
        )
      );

      showToast('Expense Entry has been deleted from your record', 'success');
    } catch (err) {
      console.error("Firebase Delete Error: ", err);
      showToast('Firebase Error: Delete fail ho gya.', 'error');
    } finally {
      setDeletingItem(null);
    }
  };

  const handleEditClick = (row) => {
    if (!isAdmin) {
      showToast('Only admin login has access to edit expenses.', 'warning');
      return;
    }
    setEditingItem(row);
    setForm({
      transactionId: row.transactionId || generateTransactionId(),
      category: row.category,
      amount: row.amount,
      date: row.date,
      description: row.description || '',
      account: row.account || 'Cash',
    });
  };

  const handleDeleteClick = (row) => {
    if (!isAdmin) {
      showToast('Only admin login has access to delete expenses.', 'warning');
      return;
    }
    setDeletingItem(row);
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
            <div class="sub-title">Naveed & Zeeshan Traders Address A Rakha Colony, Mailsi</div>
            <div class="line"></div>
            <div class="row"><span>Txn ID:</span> <span>${row.transactionId || row.docId || row.id}</span></div>
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

  const columns = useMemo(() => {
    return [
      { key: 'transactionId', label: 'Txn ID', render: (row) => <span className="font-mono text-xs text-blue-400">{row.transactionId || '-'}</span> },
      { key: 'date', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount', render: (row) => `Rs. ${Number(row.amount).toLocaleString()}` },
      { key: 'account', label: 'Account' },
      { key: 'description', label: 'Description' },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-1.5 justify-start">
            {/* EDIT ICON BUTTON */}
            <button
              type="button"
              onClick={() => handleEditClick(row)}
              className={`p-1.5 bg-slate-950 border rounded-lg transition ${
                isAdmin
                  ? 'text-slate-400 hover:text-blue-400 border-slate-800 hover:border-blue-500/40 cursor-pointer'
                  : 'text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Edit Expense" : "Admin Login Required"}
            >
              <Edit2 size={14} />
            </button>

            {/* PRINT ICON BUTTON */}
            <button
              type="button"
              onClick={() => handlePrint(row)}
              className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-lg transition cursor-pointer"
              title="Print Expense Voucher"
            >
              <Printer size={14} />
            </button>

            {/* DELETE ICON BUTTON */}
            <button
              type="button"
              onClick={() => handleDeleteClick(row)}
              className={`p-1.5 bg-slate-950 border rounded-lg transition ${
                isAdmin
                  ? 'text-slate-400 hover:text-rose-400 border-slate-800 hover:border-rose-500/40 cursor-pointer'
                  : 'text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Delete Expense Record" : "Admin Login Required"}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ];
  }, [currentRole, isAdmin]);

  return (
    <PageShell title="Business Expenses">
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

        {/* EXPENSE CREATION FORM */}
        <Card title="Expense Entry">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input
              label="Transaction ID"
              value={form.transactionId}
              onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
              placeholder="TXN-001"
              readOnly
            />
            <Input
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Rent, Fuel, Salary..."
            />
            <Input
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Select
              label="Paid From"
              value={form.account}
              onChange={(e) => setForm({ ...form, account: e.target.value })}
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </Select>
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex items-end gap-2">
              <Button type="submit">Save Expense</Button>
            </div>
          </form>
        </Card>

        {/* RECENT EXPENSES TABLE */}
        <Card title="Recent Expenses">
          <DataTable columns={columns} rows={recentExpenses} />
        </Card>

        {/* EDIT EXPENSE POPUP MODAL */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 size={16} className="text-blue-400" />
                  Edit Expense Entry
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmUpdate} className="space-y-3">
                <Input
                  label="Transaction ID"
                  value={form.transactionId}
                  readOnly
                />
                <Input
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Rent, Fuel, Salary..."
                />
                <Input
                  label="Amount (Rs.)"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
                <Input
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <Select
                  label="Paid From"
                  value={form.account}
                  onChange={(e) => setForm({ ...form, account: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </Select>
                <Input
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION POPUP MODAL */}
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Delete Expense Record</h3>
                  <p className="text-xs text-slate-400">Admin Confirmation Required</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete the <strong className="text-white font-bold">{deletingItem.category} ({deletingItem.transactionId || deletingItem.id})</strong> record?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
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

export default Expenses;