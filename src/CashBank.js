import React, { useMemo, useState, useEffect } from 'react';
import { Card, DataTable, PageShell, StatCard } from './components/ui';
import { formatRs, todayISO } from './utils/helpers';
import { Printer, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';

// Firebase Database Imports
import { db } from './firebase'; 
import { collection, getDocs } from 'firebase/firestore'; 

const CashBank = ({ recoveriesData = [], expensesData = [], userRole = '' }) => {
  // State for fetched Firestore dynamic entries
  const [fetchedRecoveries, setFetchedRecoveries] = useState([]);
  const [fetchedExpenses, setFetchedExpenses] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Custom Toast Notification State
  const [toast, setToast] = useState(null);

  // --- FETCH RECOVERIES & EXPENSES DIRECTLY FROM FIREBASE ---
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        if (!db) return;

        const recList = [];

        // 1. Direct Collections Check
        const directCollections = ["recoveries", "recovery", "payment_recoveries", "payments"];
        for (const colName of directCollections) {
          try {
            const recSnapshot = await getDocs(collection(db, colName));
            recSnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (Array.isArray(data.history || data.entries || data.payments)) {
                const list = data.history || data.entries || data.payments;
                list.forEach((item, idx) => {
                  recList.push({
                    id: `${docSnap.id}_${idx}`,
                    ...item,
                    customerName: data.customerName || data.name || item.customerName || item.client
                  });
                });
              } else {
                recList.push({
                  id: docSnap.id,
                  ...data,
                });
              }
            });
          } catch (e) {
            // Ignore missing collections
          }
        }

        // 2. Scan 'customers' collection for nested recovery logs/sub-collections
        const customerCols = ["customers", "clients"];
        for (const cCol of customerCols) {
          try {
            const custSnapshot = await getDocs(collection(db, cCol));
            for (const custDoc of custSnapshot.docs) {
              const custData = custDoc.data();
              const custName = custData.name || custData.customerName || 'Customer';

              // Check nested arrays inside customer document
              if (Array.isArray(custData.recoveries || custData.payments || custData.history)) {
                const arr = custData.recoveries || custData.payments || custData.history;
                arr.forEach((item, idx) => {
                  recList.push({
                    id: `CUST_${custDoc.id}_${idx}`,
                    customerName: custName,
                    ...item,
                  });
                });
              }

              // Check nested sub-collection inside customer document
              try {
                const subRec = await getDocs(collection(db, cCol, custDoc.id, "recoveries"));
                subRec.forEach((sDoc) => {
                  recList.push({
                    id: sDoc.id,
                    customerName: custName,
                    ...sDoc.data(),
                  });
                });
              } catch (e) {}

              try {
                const subPay = await getDocs(collection(db, cCol, custDoc.id, "payments"));
                subPay.forEach((sDoc) => {
                  recList.push({
                    id: sDoc.id,
                    customerName: custName,
                    ...sDoc.data(),
                  });
                });
              } catch (e) {}
            }
          } catch (e) {
            // Ignore missing collections
          }
        }

        console.log("Fetched Recoveries Total:", recList.length, recList);
        setFetchedRecoveries(recList);

        // 3. Fetch Expenses
        try {
          const expSnapshot = await getDocs(collection(db, "expenses"));
          const expList = [];
          expSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            expList.push({
              id: docSnap.id,
              ...data,
            });
          });
          setFetchedExpenses(expList);
        } catch (e) {
          console.warn("Expenses fetch notice:", e);
        }
      } catch (error) {
        console.error("Error loading financial data:", error);
      }
    };

    fetchFinancialData();
  }, [recoveriesData, expensesData]);

  // COMBINE PROP DATA AND FIRESTORE DATA (AVOIDING DUPLICATES)
  const allRecoveries = useMemo(() => {
    const map = new Map();
    [...recoveriesData, ...fetchedRecoveries].forEach((item) => {
      if (item) {
        const key = String(item.id || item.docId || item.recoveryId || item.transactionId || Math.random());
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [recoveriesData, fetchedRecoveries]);

  const allExpenses = useMemo(() => {
    const map = new Map();
    [...expensesData, ...fetchedExpenses].forEach((item) => {
      if (item) {
        const key = String(item.id || item.docId || item.expenseId || item.transactionId || Math.random());
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [expensesData, fetchedExpenses]);

  // --- GENERATE COMBINED TRANSACTIONS (RECOVERY [+] AND EXPENSE [-]) ---
  const combinedTransactions = useMemo(() => {
    const records = [];

    // Map Recovery Entries -> PLUS (+)
    allRecoveries.forEach((rec) => {
      const rawVal = rec.amount ?? rec.payingAmount ?? rec.receivedAmount ?? rec.recAmount ?? rec.paidAmount ?? rec.cashReceived ?? rec.recoveryAmount ?? 0;
      const recAmount = Math.abs(Number(rawVal) || 0);

      const custName = rec.customerName || rec.customer || rec.client || rec.name || 'Customer';

      if (recAmount > 0) {
        records.push({
          id: String(rec.id || rec.docId || `REC-${Math.random()}`),
          transactionId: rec.transactionId || rec.recoveryId || `REC-${String(rec.id || '').slice(0, 6)}`,
          date: rec.date || todayISO(),
          account: rec.account || rec.paymentMethod || 'Cash',
          description: rec.description || `Recovery Received - ${custName}`,
          amount: recAmount, // PLUS
          type: 'receipt',
          source: 'Recovery',
        });
      }
    });

    // Map Expense Entries -> MINUS (-)
    allExpenses.forEach((exp) => {
      const rawVal = exp.amount ?? exp.expenseAmount ?? 0;
      const expAmount = Math.abs(Number(rawVal) || 0);

      if (expAmount > 0) {
        records.push({
          id: String(exp.id || exp.docId || `EXP-${Math.random()}`),
          transactionId: exp.transactionId || exp.expenseId || `EXP-${String(exp.id || '').slice(0, 6)}`,
          date: exp.date || todayISO(),
          account: exp.account || 'Cash',
          description: exp.description || `Expense - ${exp.category || exp.title || 'General'}`,
          amount: -expAmount, // MINUS / DEDUCT
          type: 'payment',
          source: 'Expense',
        });
      }
    });

    // Sort by Date (Most recent on top)
    return records.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [allRecoveries, allExpenses]);

  // --- TOTAL CALCULATIONS ---
  const totals = useMemo(() => {
    const cash = combinedTransactions
      .filter((t) => String(t.account).toLowerCase() === 'cash')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const bank = combinedTransactions
      .filter((t) => String(t.account).toLowerCase() === 'bank')
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

  // --- PRINT RECEIPT / VOUCHER ---
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

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard title="Cash in Hand" value={formatRs(totals.cash)} tone="emerald" />
          <StatCard title="Bank Balance" value={formatRs(totals.bank)} tone="blue" />
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

      </div>
    </PageShell>
  );
};

export default CashBank;