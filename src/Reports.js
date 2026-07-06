import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Calendar, 
  ShoppingBag, 
  ArrowDownRight, 
  UserCheck, 
  FileText, 
  TrendingUp, 
  Boxes,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

function Reports({ 
  sales = [], 
  expenses = [], 
  inventory = [], 
  suppliers = [], 
  recoveries = [],
  selectedReportType, // Props coming from sidebar selection (e.g., 'sales', 'expense', etc.)
  onResetReportType 
}) {
  
  const [activeReport, setActiveReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showReportView, setShowReportView] = useState(false);

  // Sync with Sidebar clicks
  useEffect(() => {
    if (selectedReportType) {
      setActiveReport(selectedReportType);
      setIsModalOpen(true);
      setShowReportView(false); // Reset previous view when new report clicked
    }
  }, [selectedReportType]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(val || 0).replace('PKR', 'Rs.');
  };

  // Live Timestamp Generation
  const currentDateTime = useMemo(() => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  }, [showReportView]);

  // --- REPORT FILTER ENGINES ---
  const filteredSales = useMemo(() => sales.filter(s => s.date >= startDate && s.date <= endDate), [sales, startDate, endDate]);
  const totalSales = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.netTotal || 0), 0), [filteredSales]);

  const filteredExpenses = useMemo(() => expenses.filter(e => e.date >= startDate && e.date <= endDate), [expenses, startDate, endDate]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [filteredExpenses]);

  const filteredRecoveries = useMemo(() => recoveries.filter(r => r.date >= startDate && r.date <= endDate), [recoveries, startDate, endDate]);
  const totalRecoveries = useMemo(() => filteredRecoveries.reduce((sum, r) => sum + Number(r.amount || 0), 0), [filteredRecoveries]);

  const filteredPurchases = useMemo(() => {
    return (suppliers || []).flatMap(s => s.purchases || []).filter(p => p.date >= startDate && p.date <= endDate);
  }, [suppliers, startDate, endDate]);
  const totalPurchases = useMemo(() => filteredPurchases.reduce((sum, p) => sum + Number(p.totalAmount || p.amount || 0), 0), [filteredPurchases]);

  const profitAndLoss = useMemo(() => {
    let revenue = 0, cogs = 0;
    filteredSales.forEach(s => {
      (s.items || []).forEach(item => {
        const qty = Number(item.quantity || 0);
        revenue += (Number(item.price || item.saleRate || 0) * qty);
        cogs += (Number(item.purchasePrice || item.purchaseRate || item.costPrice || 0) * qty);
      });
    });
    if (revenue === 0) { revenue = totalSales; cogs = revenue * 0.75; }
    return { revenue, cogs, gross: revenue - cogs, net: (revenue - cogs) - totalExpenses };
  }, [filteredSales, totalExpenses, totalSales]);

  const handlePrint = () => { window.print(); };
  const closeModal = () => {
    setIsModalOpen(false);
    if (onResetReportType) onResetReportType();
  };

  return (
    <div className="space-y-6 relative min-h-[70vh] animate-[fadeIn_0.3s_ease-out]">
      
      {/* --- DURATION CRITERIA POPUP MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
              <X size={18} />
            </button>
            
            <div className="mb-5">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">
                Configure Report Scope
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Select the date boundaries to pull historical logs.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Start Date</label>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-2xl w-full">
                  <Calendar size={16} className="text-slate-400" />
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none w-full" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">End Date</label>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-2xl w-full">
                  <Calendar size={16} className="text-slate-400" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none w-full" />
                </div>
              </div>

              <button 
                onClick={() => { setIsModalOpen(false); setShowReportView(true); }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-2xl shadow-lg shadow-emerald-700/10 transition duration-200 mt-2"
              >
                Generate Report Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STANDALONE ACTION TOP-LEFT DOCKBAR --- */}
      {showReportView && (
        <div className="no-print flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl w-max border border-slate-200/60 dark:border-slate-800/60">
          <button onClick={handlePrint} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-black text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            <Printer size={14} className="text-emerald-500" /> Print Statement
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-black text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            <Download size={14} className="text-blue-500" /> Download PDF
          </button>
        </div>
      )}

      {/* --- PREMIUM PRINTABLE WHITE PAPER BLANK SHEET --- */}
      {showReportView ? (
        <div id="printable-sheet" className="bg-white text-slate-900 p-8 sm:p-12 rounded-[2rem] border border-slate-200 shadow-xl max-w-5xl mx-auto print:border-none print:p-0 print:shadow-none print:max-w-full animate-[slideUp_0.4s_ease-out]">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-4 border-slate-900 pb-6 mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-base tracking-tighter">
                NZT
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  NAVEED ZEESHAN TRADERS
                </h2>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  Mughal Kiryana Store & Wholesale Milk Shop
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">
                {activeReport?.replace('_', ' ')} Statement
              </h1>
              <p className="text-xs font-bold text-slate-600 mt-1">
                Statement Term: <span className="text-slate-900 underline font-black">{startDate}</span> to <span className="text-slate-900 underline font-black">{endDate}</span>
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                System Downloaded: {currentDateTime.date} | {currentDateTime.time}
              </p>
            </div>
          </div>

          {/* Dynamic Content Switching Blocks */}
          {activeReport === 'sales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Trade Volume</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-0.5">{formatCurrency(totalSales)}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoices Issued</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-0.5">{filteredSales.length} bills</h3>
                </div>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3">Date</th>
                    <th>Invoice ID</th>
                    <th>Account Holder / Customer</th>
                    <th>Payment Route</th>
                    <th className="text-right">Settled Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredSales.length === 0 ? (
                    <tr><td colSpan="5" className="py-8 text-center text-slate-400">No logs captured during selected term.</td></tr>
                  ) : (
                    filteredSales.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3">{s.date}</td>
                        <td className="font-bold text-slate-900">{s.invoiceNo || `INV-${1000 + idx}`}</td>
                        <td>{s.customerName || (s.isCredit ? 'Ledger Account' : 'Counter Cash Client')}</td>
                        <td><span className="px-2 py-0.5 bg-slate-200 text-[10px] font-bold rounded">{s.paymentMethod || (s.isCredit ? 'Credit/Udhaar' : 'Cash')}</span></td>
                        <td className="text-right font-black text-slate-900">{formatCurrency(s.netTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'expense' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Debited Operational Expense</span>
                <h3 className="text-2xl font-black text-rose-600 mt-0.5">{formatCurrency(totalExpenses)}</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3">Date</th>
                    <th>Description / Category Ledger</th>
                    <th className="text-right">Paid Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan="3" className="py-8 text-center text-slate-400">No vouchers discovered.</td></tr>
                  ) : (
                    filteredExpenses.map((e, idx) => (
                      <tr key={idx}>
                        <td className="py-3">{e.date}</td>
                        <td>{e.description || e.category}</td>
                        <td className="text-right font-bold text-rose-600">-{formatCurrency(e.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'recovery' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding Recovery Collected (Jama)</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{formatCurrency(totalRecoveries)}</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3">Date</th>
                    <th>Account Title</th>
                    <th>Voucher Token</th>
                    <th className="text-right">Net Recovery Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredRecoveries.length === 0 ? (
                    <tr><td colSpan="4" className="py-8 text-center text-slate-400">No recent entries recorded.</td></tr>
                  ) : (
                    filteredRecoveries.map((r, idx) => (
                      <tr key={idx}>
                        <td className="py-3">{r.date}</td>
                        <td className="font-bold text-slate-900">{r.customerName}</td>
                        <td>{r.voucherNo || `REC-${5000 + idx}`}</td>
                        <td className="text-right font-black text-emerald-600">+{formatCurrency(r.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'purchase' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bulk Procurement Investments</span>
                <h3 className="text-2xl font-black text-cyan-600 mt-0.5">{formatCurrency(totalPurchases)}</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3">Date</th>
                    <th>Supplier Vendor</th>
                    <th>Stock Details</th>
                    <th className="text-right">Purchase Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredPurchases.length === 0 ? (
                    <tr><td colSpan="4" className="py-8 text-center text-slate-400">No recent wholesale loads detected.</td></tr>
                  ) : (
                    filteredPurchases.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-3">{p.date}</td>
                        <td className="font-bold text-slate-900">{p.supplierName || 'Market Wholesaler'}</td>
                        <td>{p.itemName || p.details || 'Inventory Inbound'}</td>
                        <td className="text-right font-black text-slate-900">{formatCurrency(p.totalAmount || p.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'profit_loss' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Terminal Revenue</span>
                  <p className="text-base font-black text-slate-900 mt-1">{formatCurrency(profitAndLoss.revenue)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cost Price (COGS)</span>
                  <p className="text-base font-black text-slate-600 mt-1">-{formatCurrency(profitAndLoss.cogs)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Operating Expenses</span>
                  <p className="text-base font-black text-rose-600 mt-1">-{formatCurrency(totalExpenses)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${profitAndLoss.net >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Net Pure Profit</span>
                  <p className={`text-lg font-black ${profitAndLoss.net >= 0 ? 'text-emerald-600' : 'text-rose-600'} mt-0.5`}>{formatCurrency(profitAndLoss.net)}</p>
                </div>
              </div>
              <div className="border border-slate-300 rounded-2xl p-5 space-y-3.5 text-xs">
                <div className="flex justify-between font-medium text-slate-600"><span>Gross Trading Margin (Sales Rate - Purchase Rate):</span><span className="font-bold text-slate-900">{formatCurrency(profitAndLoss.gross)}</span></div>
                <div className="flex justify-between font-medium text-slate-600"><span>Total Logged Business Expenses Outflow:</span><span className="font-bold text-rose-600">-{formatCurrency(totalExpenses)}</span></div>
                <div className="h-px bg-slate-300 my-1" />
                <div className="flex justify-between font-black text-sm text-slate-900"><span>Net Retained Operational Margin:</span><span className={profitAndLoss.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(profitAndLoss.net)}</span></div>
              </div>
            </div>
          )}

          {activeReport === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-xs font-bold">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase">Catalog Size</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{inventory.length} Items</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase">Active Stock Available</span>
                  <p className="text-base font-black text-emerald-600 mt-0.5">{inventory.filter(i => Number(i.stock || i.quantity) > 0).length} Items</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-600 uppercase">Out Of Stock (Khatam Maal)</span>
                  <p className="text-base font-black text-rose-600 mt-0.5">{inventory.filter(i => Number(i.stock || i.quantity) <= 0).length} Items</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3">Item Details</th>
                    <th>Cost / Purchase Rate</th>
                    <th>Terminal Sales Rate</th>
                    <th>Current Volume</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {inventory.length === 0 ? (
                    <tr><td colSpan="5" className="py-8 text-center text-slate-400">Database master ledger inventory empty.</td></tr>
                  ) : (
                    inventory.map((item, idx) => {
                      const qty = Number(item.stock || item.quantity || 0);
                      const isOut = qty <= 0;
                      return (
                        <tr key={idx} className={isOut ? 'bg-rose-50' : ''}>
                          <td className="py-3 font-bold text-slate-900">
                            {item.name} <span className="text-[10px] text-slate-400 font-normal block">{item.code || item.id}</span>
                          </td>
                          <td>{formatCurrency(item.purchasePrice || item.purchaseRate || item.costPrice)}</td>
                          <td>{formatCurrency(item.price || item.saleRate)}</td>
                          <td className={`font-black ${isOut ? 'text-rose-600' : 'text-slate-900'}`}>{qty} {item.unit || 'pcs'}</td>
                          <td className="text-right">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                                <AlertCircle size={10} /> Khatam (0)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                                <CheckCircle2 size={10} /> Active
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Statement Authorization Footer */}
          <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Powered by Naveed & Zeeshan ERP Enterprise</span>
            <span>Authorized Signature: _______________________</span>
          </div>

        </div>
      ) : (
        /* Empty placeholder state before generating statement */
        <div className="no-print flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-16 text-center text-slate-400 dark:text-slate-600">
          <FileText size={48} className="stroke-1 mb-3 text-slate-300 dark:text-slate-700 animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-wider">Please select a report category from the left menu sidebar to review or extract records.</p>
        </div>
      )}

      {/* Embedded Global Stylesheet for Print Mode Isolation */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          #printable-sheet {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: #000000 !important;
            max-w: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}

export default Reports;