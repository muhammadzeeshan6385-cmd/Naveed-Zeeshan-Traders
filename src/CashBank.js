import React, { useMemo, useState, useEffect } from 'react';
import { Card, DataTable, PageShell, StatCard, Button, Input, Select } from './components/ui';
import { formatRs, generateId, todayISO } from './utils/helpers';
import { Printer, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, PlusCircle } from 'lucide-react';

// Firebase Database Imports
import { db } from './firebase'; 
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'; 

const CashBank = ({ recoveriesData = [], expensesData = [], userRole = '', currentUser }) => {
  // Admin Check
  const activeUsername = String(currentUser?.username || currentUser?.id || '').trim().toLowerCase();
  const activeRole = String(userRole || currentUser?.role || '').trim().toLowerCase();
  const isAdmin = activeUsername === 'admin' || activeRole === 'admin';

  // Dynamic Firestore Fetched States
  const [fetchedRecoveries, setFetchedRecoveries] = useState([]);
  const [fetchedExpenses, setFetchedExpenses] = useState([]);
  const [manualTransactions, setManualTransactions] = useState([]);

  // Manual Entry Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: todayISO(),
    type: 'add', // 'add' (+) or 'deduct' (-)
    account: 'Cash',
    amount: '',
    description: '',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Custom Toast Notification State
  const [toast, setToast] = useState(null);

  // --- FETCH ALL FINANCIAL DATA FROM FIRESTORE ---
  useEffect(() => {
    let isMounted = true;

    const fetchFinancialData = async () => {
      try {
        if (!db) return;

        // 1. Fetch Expenses
        try {
          const expSnapshot = await getDocs(collection(db, "expenses"));
          const expList = [];
          expSnapshot.forEach((docSnap) => {
            expList.push({
              id: docSnap.id,
              ...docSnap.data(),
            });
          });
          if (isMounted) setFetchedExpenses(expList);
        } catch (e) {
          console.warn("Expenses fetch notice:", e);
        }

        // 2. Fetch Payments / Recoveries
        const recList = [];
        try {
          const paySnapshot = await getDocs(collection(db, "payments"));
          paySnapshot.forEach((docSnap) => {
            recList.push({
              id: docSnap.id,
              ...docSnap.data(),
            });
          });
        } catch (e) {}

        try {
          const recSnapshot = await getDocs(collection(db, "recoveries"));
          recSnapshot.forEach((docSnap) => {
            recList.push({
              id: docSnap.id,
              ...docSnap.data(),
            });
          });
        } catch (e) {}

        if (isMounted) setFetchedRecoveries(recList);

        // 3. Fetch Manual Cash/Bank Entries
        try {
          const manualSnapshot = await getDocs(collection(db, "manual_transactions"));
          const manualList = [];
          manualSnapshot.forEach((docSnap) => {
            manualList.push({
              id: docSnap.id,
              ...docSnap.data(),
            });
          });
          if (isMounted) setManualTransactions(manualList);
        } catch (e) {
          console.warn("Manual transactions fetch notice:", e);
        }

      } catch (error) {
        console.error("Error loading financial data:", error);
      }
    };

    fetchFinancialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- ADD MANUAL TRANSACTION (FIRESTORE) ---
  const handleSaveManualTransaction = async () => {
    if (!manualForm.amount || Number(manualForm.amount) <= 0) {
      setToast({ type: 'warning', message: 'Please enter a valid amount.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const customId = generateId();
      const numAmt = Number(manualForm.amount);
      const finalAmount = manualForm.type === 'add' ? numAmt : -numAmt;

      const newEntry = {
        id: customId,
        transactionId: `MAN-${customId.slice(0, 8)}`,
        date: manualForm.date,
        account: manualForm.account,
        amount: finalAmount,
        description: manualForm.description || (manualForm.type === 'add' ? 'Manual Cash Added' : 'Manual Cash Deducted'),
        entryType: manualForm.type,
        createdAt: new Date().toISOString(),
      };

      // Save to Firebase Firestore
      await setDoc(doc(db, 'manual_transactions', customId), newEntry);

      // Update Local State
      setManualTransactions([newEntry, ...manualTransactions]);

      // Reset Form & Close Modal
      setManualForm({
        date: todayISO(),
        type: 'add',
        account: 'Cash',
        amount: '',
        description: '',
      });
      setShowManualModal(false);
      setToast({ type: 'success', message: 'Manual entry added successfully!' });

    } catch (error) {
      console.error("Error saving manual entry:", error);
      setToast({ type: 'error', message: 'Error saving entry: ' + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // COMBINE PROP DATA AND FIRESTORE DATA
  const allRecoveries = useMemo(() => {
    const map = new Map();
    const combined = [...(Array.isArray(recoveriesData) ? recoveriesData : []), ...fetchedRecoveries];
    
    combined.forEach((item) => {
      if (item && typeof item === 'object') {
        const key = String(item.id || item.docId || item.transactionId || item.recoveryId || Math.random());
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [recoveriesData, fetchedRecoveries]);

  const allExpenses = useMemo(() => {
    const map = new Map();
    const combined = [...(Array.isArray(expensesData) ? expensesData : []), ...fetchedExpenses];

    combined.forEach((item) => {
      if (item && typeof item === 'object') {
        const key = String(item.id || item.docId || item.transactionId || item.expenseId || Math.random());
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [expensesData, fetchedExpenses]);

  // --- GENERATE COMBINED TRANSACTIONS ---
  const combinedTransactions = useMemo(() => {
    const records = [];

    // 1. Recovery Entries -> PLUS (+)
    allRecoveries.forEach((rec) => {
      const rawVal = rec.amount ?? rec.credit ?? rec.received ?? rec.payingAmount ?? rec.receivedAmount ?? 0;
      const recAmount = Math.abs(Number(rawVal) || 0);
      const custName = rec.customer || rec.customerName || rec.client || rec.name || 'Customer';

      if (recAmount > 0) {
        records.push({
          id: String(rec.id || rec.docId || `REC-${Math.random()}`),
          transactionId: rec.transactionId || rec.recoveryId || `REC-${String(rec.id || '').slice(0, 8)}`,
          date: rec.date || todayISO(),
          account: rec.account || rec.paymentMethod || 'Cash',
          description: rec.note ? `Recovery - ${custName} (${rec.note})` : `Recovery - ${custName}`,
          amount: recAmount, // PLUS
          type: 'receipt',
          source: 'Recovery',
        });
      }
    });

    // 2. Expense Entries -> MINUS (-)
    allExpenses.forEach((exp) => {
      const rawVal = exp.amount ?? exp.expenseAmount ?? 0;
      const expAmount = Math.abs(Number(rawVal) || 0);

      if (expAmount > 0) {
        records.push({
          id: String(exp.id || exp.docId || `EXP-${Math.random()}`),
          transactionId: exp.transactionId || exp.expenseId || `EXP-${String(exp.id || '').slice(0, 8)}`,
          date: exp.date || todayISO(),
          account: exp.account || 'Cash',
          description: exp.description || `Expense - ${exp.category || exp.title || 'General'}`,
          amount: -expAmount, // MINUS
          type: 'payment',
          source: 'Expense',
        });
      }
    });

    // 3. Manual Entries (Add (+) / Deduct (-))
    manualTransactions.forEach((man) => {
      records.push({
        id: String(man.id),
        transactionId: man.transactionId || `MAN-${String(man.id).slice(0, 8)}`,
        date: man.date || todayISO(),
        account: man.account || 'Cash',
        description: man.description || 'Manual Entry',
        amount: Number(man.amount) || 0,
        type: Number(man.amount) >= 0 ? 'receipt' : 'payment',
        source: 'Manual',
      });
    });

    // Sort by Date (Most recent on top)
    return records.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [allRecoveries, allExpenses, manualTransactions]);

  // --- TOTAL CALCULATIONS ---
  const totals = useMemo(() => {
    const cash = combinedTransactions
      .filter((t) => String(t.account || '').toLowerCase() === 'cash')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const bank = combinedTransactions
      .filter((t) => String(t.account || '').toLowerCase() === 'bank')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return { cash, bank };
  }, [combinedTransactions]);

  // --- PAGINATION COMPUTATION ---
  const totalPages = Math.max(1, Math.ceil(combinedTransactions.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [combinedTransactions.length, totalPages, currentPage]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return combinedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [combinedTransactions, currentPage, itemsPerPage]);

  // --- PRINT RECEIPT ---
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
            <div class="sub-title">Naveed & Zeeshan Traders Address A Rakha Colony, Mailsi</div>
            <div class="line"></div>
            <div class="row"><span>Txn ID:</span> <span>${row.transactionId || '-'}</span></div>
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

  // --- TABLE COLUMNS ---
  const columns = useMemo(() => {
    return [
      {
        key: 'transactionId',
        label: 'Txn ID',
        render: (row) => (
          <span className="font-mono text-xs text-blue-400 font-semibold">
            {row.transactionId || '-'}
          </span>
        ),
      },
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
            <button
              type="button"
              onClick={() => handlePrint(row)}
              className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-lg transition cursor-pointer"
              title="Print Voucher"
            >
              <Printer size={14} />
            </button>
          </div>
        ),
      },
    ];
  }, []);

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

        {/* TOP CONTROLS & STATS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full sm:w-auto flex-1">
            <StatCard title="Cash in Hand" value={formatRs(totals.cash)} tone="emerald" />
            <StatCard title="Bank Balance" value={formatRs(totals.bank)} tone="blue" />
          </div>

          {/* ADD MANUAL ENTRY BUTTON */}
          <Button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
          >
            <PlusCircle size={18} />
            <span>Manual Entry</span>
          </Button>
        </div>

        {/* TRANSACTIONS TABLE */}
        <Card title="Cash & Bank Ledger">
          <DataTable columns={columns} rows={paginatedTransactions} />

          {/* PAGINATION CONTROLS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-semibold">{paginatedTransactions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="text-white font-semibold">{Math.min(currentPage * itemsPerPage, combinedTransactions.length)}</span> of <span className="text-white font-semibold">{combinedTransactions.length}</span> entries
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

        {/* --- MANUAL ENTRY MODAL PORTAL --- */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-white">Manual Cash / Bank Entry</h2>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Date"
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                />

                <Select
                  label="Action Type"
                  value={manualForm.type}
                  onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}
                >
                  <option value="add">Add Money (+)</option>
                  <option value="deduct">Deduct Money (-)</option>
                </Select>

                <Select
                  label="Account"
                  value={manualForm.account}
                  onChange={(e) => setManualForm({ ...manualForm, account: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </Select>

                <Input
                  label="Amount (Rs)"
                  type="number"
                  placeholder="e.g. 5000"
                  value={manualForm.amount}
                  onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                />

                <Input
                  label="Description / Reason"
                  type="text"
                  placeholder="e.g. Opening Balance / Adjustment"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveManualTransaction}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl"
                >
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
};

export default CashBank;