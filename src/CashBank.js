import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, todayISO } from './utils/helpers';
import { Edit2, Printer, Trash2, X, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

// Firebase Firestore Imports
import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

const CashBank = ({ cashData = [], setCashData, currentRole = '' }) => {
  const [form, setForm] = useState({
    date: todayISO(),
    account: 'Cash',
    amount: '',
    type: 'receipt', // 'receipt' or 'payment'
    description: '',
  });

  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit / Delete State
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Custom Toast Notification State
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

  // Fetch Cash Register entries on mount
  useEffect(() => {
    const fetchCashFromFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "cashData"));
        const firebaseCash = [];

        querySnapshot.forEach((docSnap) => {
          firebaseCash.push({
            docId: docSnap.id,
            id: docSnap.id,
            ...docSnap.data()
          });
        });

        if (firebaseCash.length > 0) {
          setCashData(firebaseCash);
        }
      } catch (error) {
        console.error("Firebase Cash Fetch Error:", error);
      }
    };

    fetchCashFromFirebase();
  }, [setCashData]);

  // --- SORT TRANSACTIONS BY DATE (RECENT FIRST) ---
  const sortedCashData = useMemo(() => {
    return [...cashData].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      if (dateB !== dateA) {
        return dateB - dateA; // Primary Sort: Most Recent Date First
      }
      // Secondary Sort: Created Time / Id fallback
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [cashData]);

  // --- PAGINATION CALCULATIONS ---
  const totalPages = Math.max(1, Math.ceil(sortedCashData.length / itemsPerPage));

  // Auto Reset to Page 1 if page overflows after filtering or deletion
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [sortedCashData.length, totalPages, currentPage]);

  const paginatedCashData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCashData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCashData, currentPage, itemsPerPage]);

  const resetForm = () => {
    setForm({
      date: todayISO(),
      account: 'Cash',
      amount: '',
      type: 'receipt',
      description: '',
    });
    setEditingItem(null);
  };

  const handleSubmit = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (isSubmittingRef.current) return;

    if (!form.amount || Number(form.amount) <= 0) {
      showToast('Please enter a valid amount.', 'warning');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const rawAmount = Number(form.amount);
    const finalAmount = form.type === 'payment' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    try {
      const newCashEntry = {
        id: generateId(),
        date: form.date,
        account: form.account,
        amount: finalAmount,
        type: form.type,
        description: form.description || (form.type === 'receipt' ? 'Cash Received' : 'Cash Paid'),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "cashData"), newCashEntry);
      const entryWithDoc = { docId: docRef.id, ...newCashEntry };

      setCashData((prev) => [entryWithDoc, ...prev]);
      showToast('Transaction saved successfully!', 'success');
      resetForm();
    } catch (err) {
      console.error("Firebase Cash Save Error:", err);
      showToast('Firebase Error: Could not save transaction.', 'error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleConfirmUpdate = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSubmittingRef.current) return;

    if (!isAdmin) {
      showToast('Only admin can modify transaction entries.', 'warning');
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      showToast('Please enter a valid amount.', 'warning');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const rawAmount = Number(form.amount);
    const finalAmount = form.type === 'payment' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
    const targetDocId = editingItem?.docId || editingItem?.id;

    try {
      const updatedData = {
        date: form.date,
        account: form.account,
        amount: finalAmount,
        type: form.type,
        description: form.description,
      };

      if (targetDocId) {
        await updateDoc(doc(db, "cashData", String(targetDocId)), updatedData);
      }

      setCashData((prev) =>
        prev.map((item) => {
          const itemId = item.docId || item.id;
          return itemId === targetDocId ? { ...item, ...updatedData } : item;
        })
      );

      showToast('Transaction updated successfully!', 'success');
      resetForm();
    } catch (err) {
      console.error("Firebase Cash Update Error:", err);
      showToast('Firebase Error: Update failed.', 'error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!isAdmin) {
      showToast('Only admin can delete transaction entries.', 'warning');
      return;
    }

    if (!deletingItem || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const targetDocId = deletingItem.docId || deletingItem.id;

    try {
      if (targetDocId) {
        await deleteDoc(doc(db, "cashData", String(targetDocId)));
      }

      setCashData((prev) =>
        prev.filter((item) => {
          const itemId = item.docId || item.id;
          return itemId !== targetDocId && item.id !== deletingItem.id;
        })
      );

      showToast('Transaction deleted successfully!', 'success');
    } catch (err) {
      console.error("Firebase Cash Delete Error:", err);
      showToast('Firebase Error: Delete failed.', 'error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setDeletingItem(null);
    }
  };

  const handleEditClick = (row) => {
    if (!isAdmin) {
      showToast('Only admin login has access to edit entries.', 'warning');
      return;
    }
    setEditingItem(row);
    setForm({
      date: row.date || todayISO(),
      account: row.account || 'Cash',
      amount: Math.abs(row.amount || 0),
      type: row.amount < 0 || row.type === 'payment' ? 'payment' : 'receipt',
      description: row.description || '',
    });
  };

  const handleDeleteClick = (row) => {
    if (!isAdmin) {
      showToast('Only admin login has access to delete entries.', 'warning');
      return;
    }
    setDeletingItem(row);
  };

  const columns = useMemo(() => {
    return [
      { key: 'date', label: 'Date' },
      { key: 'account', label: 'Account' },
      { key: 'description', label: 'Description' },
      {
        key: 'type',
        label: 'Type',
        render: (row) => {
          const isPayment = row.amount < 0 || row.type === 'payment';
          return (
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              isPayment ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {isPayment ? 'Payment' : 'Receipt'}
            </span>
          );
        }
      },
      {
        key: 'amount',
        label: 'Amount (Rs.)',
        render: (row) => {
          const isPayment = row.amount < 0 || row.type === 'payment';
          return (
            <span className={`font-semibold ${isPayment ? 'text-rose-400' : 'text-emerald-400'}`}>
              Rs. {Math.abs(row.amount).toLocaleString()}
            </span>
          );
        }
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-1.5 justify-start">
            <button
              type="button"
              onClick={() => handleEditClick(row)}
              className={`p-1.5 bg-slate-950 border rounded-lg transition ${
                isAdmin
                  ? 'text-slate-400 hover:text-blue-400 border-slate-800 hover:border-blue-500/40 cursor-pointer'
                  : 'text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Edit Transaction" : "Admin Login Required"}
            >
              <Edit2 size={14} />
            </button>

            <button
              type="button"
              onClick={() => handleDeleteClick(row)}
              className={`p-1.5 bg-slate-950 border rounded-lg transition ${
                isAdmin
                  ? 'text-slate-400 hover:text-rose-400 border-slate-800 hover:border-rose-500/40 cursor-pointer'
                  : 'text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Delete Transaction" : "Admin Login Required"}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ];
  }, [currentRole, isAdmin]);

  return (
    <PageShell title="Cash & Bank Management">
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

        {/* ENTRY FORM */}
        <Card title="New Cash / Bank Entry">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <Select
                label="Account"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </Select>
              <Select
                label="Transaction Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="receipt">Receipt (Cash In / +)</option>
                <option value="payment">Payment (Cash Out / -)</option>
              </Select>
              <Input
                label="Amount (Rs.)"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
              <Input
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Details..."
              />
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* TRANSACTIONS TABLE WITH DATE-WISE SORTING & PAGINATION */}
        <Card title="Cash & Bank Register">
          <DataTable columns={columns} rows={paginatedCashData} />

          {/* PAGE PAGINATION NAVIGATION BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-semibold">{paginatedCashData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="text-white font-semibold">{Math.min(currentPage * itemsPerPage, sortedCashData.length)}</span> of <span className="text-white font-semibold">{sortedCashData.length}</span> entries
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Card>

        {/* EDIT POPUP MODAL */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 size={16} className="text-blue-400" />
                  Edit Cash Entry
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <Input
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <Select
                  label="Account"
                  value={form.account}
                  onChange={(e) => setForm({ ...form, account: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </Select>
                <Select
                  label="Transaction Type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="receipt">Receipt (Cash In / +)</option>
                  <option value="payment">Payment (Cash Out / -)</option>
                </Select>
                <Input
                  label="Amount (Rs.)"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
                <Input
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUpdate}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isSubmitting ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
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
                  <h3 className="text-sm font-bold text-white">Delete Transaction</h3>
                  <p className="text-xs text-slate-400">Admin Confirmation Required</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete this entry (<strong className="text-white font-bold">{deletingItem.description || 'Entry'}</strong>)?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {isSubmitting ? 'Deleting...' : 'Ok'}
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