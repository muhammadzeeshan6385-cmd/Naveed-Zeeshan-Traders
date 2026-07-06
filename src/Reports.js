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
  CheckCircle2,
  TrendingDown
} from 'lucide-react';

function Reports({ 
  sales = [], 
  expenses = [], 
  inventory = [], 
  suppliers = [], 
  payments = [], 
  purchases = [],
  products = [],
  selectedReport = null 
}) {
  
  const [activeReport, setActiveReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showReportView, setShowReportView] = useState(false);

  // Fallback date string to prevent 'today is not defined' compile error
  const fallbackTodayDate = new Date().toISOString().split('T')[0];

  // FIX: Explicitly listen to selectedReport coming directly from App.js sidebar
  useEffect(() => {
    if (selectedReport) {
      handleReportTrigger(selectedReport);
    }
  }, [selectedReport]);

  const handleReportTrigger = (type) => {
    let cleanType = type.toLowerCase();
    if (cleanType.includes('sales')) setActiveReport('sales');
    else if (cleanType.includes('expense')) setActiveReport('expense');
    else if (cleanType.includes('recovery') || cleanType.includes('payment')) setActiveReport('recovery');
    else if (cleanType.includes('purchase')) setActiveReport('purchase');
    else if (cleanType.includes('profit')) setActiveReport('profit_loss');
    else if (cleanType.includes('stock') || cleanType.includes('inventory')) setActiveReport('inventory');
    else return;

    setIsModalOpen(true);
    setShowReportView(false); 
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(val || 0).replace('PKR', 'Rs.');
  };

  const currentDateTime = useMemo(() => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  }, [showReportView, activeReport]);

  // --- LIVE DATA HYDRATION AND FILTER LOGIC ---
  const filteredSales = useMemo(() => {
    if (!startDate || !endDate) return sales;
    return sales.filter(s => s.date >= startDate && s.date <= endDate);
  }, [sales, startDate, endDate]);

  const totalSales = useMemo(() => filteredSales.reduce((sum, s) => sum + Number(s.netTotal || 0), 0), [filteredSales]);

  const filteredExpenses = useMemo(() => {
    if (!startDate || !endDate) return expenses;
    return expenses.filter(e => e.date >= startDate && e.date <= endDate);
  }, [expenses, startDate, endDate]);

  const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [filteredExpenses]);

  const filteredRecoveries = useMemo(() => {
    if (!startDate || !endDate) return payments;
    return payments.filter(r => r.date >= startDate && r.date <= endDate);
  }, [payments, startDate, endDate]);

  const totalRecoveries = useMemo(() => filteredRecoveries.reduce((sum, r) => sum + Number(r.amount || 0), 0), [filteredRecoveries]);

  const filteredPurchases = useMemo(() => {
    if (!startDate || !endDate) return purchases;
    return purchases.filter(p => p.date >= startDate && p.date <= endDate);
  }, [purchases, startDate, endDate]);

  const totalPurchases = useMemo(() => filteredPurchases.reduce((sum, p) => sum + Number(p.totalAmount || p.amount || p.qty * (p.rate || p.purchaseRate || 0)), 0), [filteredPurchases]);

  const activeInventory = useMemo(() => {
    if (products && products.length > 0) return products;
    return inventory;
  }, [products, inventory]);

  const profitAndLoss = useMemo(() => {
    let revenue = 0, cogs = 0;
    filteredSales.forEach(s => {
      (s.items || []).forEach(item => {
        const qty = Number(item.quantity || item.qty || 0);
        revenue += (Number(item.price || item.rate || item.saleRate || 0) * qty);
        
        const matchingProd = activeInventory.find(p => p.id === item.productId || p.name === item.name);
        const pRate = matchingProd ? Number(matchingProd.purchaseRate || 0) : Number(item.purchaseRate || 0);
        cogs += (pRate * qty);
      });
    });
    if (revenue === 0 && totalSales > 0) { revenue = totalSales; cogs = revenue * 0.75; }
    return { revenue, cogs, gross: revenue - cogs, net: (revenue - cogs) - totalExpenses };
  }, [filteredSales, totalExpenses, totalSales, activeInventory]);

  const handlePrint = () => { 
    window.print(); 
  };

  return (
    <div className="space-y-6 relative min-h-[70vh] p-1 sm:p-4 text-slate-800 report-main-wrapper">

      {/* --- DATE DURATION POPUP MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 no-print">
          <div className="bg-white text-slate-900 w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
              <X size={18} />
            </button>
            
            <div className="mb-5">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                Select Date Duration
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Enter duration to fetch data and look up history metrics.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">From Date</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl w-full">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none w-full" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">To Date</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-2xl w-full">
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none w-full" />
                </div>
              </div>

              <button 
                onClick={() => { setIsModalOpen(false); setShowReportView(true); }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-2xl shadow-lg transition duration-200 mt-2"
              >
                Generate Report View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ACTION HEAD BUTTONS --- */}
      {showReportView && (
        <div className="no-print flex items-center gap-2 mb-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 bg-white text-slate-900 font-black text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md border border-slate-200 hover:bg-slate-50 transition">
            <Printer size={14} className="text-emerald-600" /> Print Statement
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 bg-white text-slate-900 font-black text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md border border-slate-200 hover:bg-slate-50 transition">
            <Download size={14} className="text-blue-600" /> Download PDF
          </button>
          <button onClick={() => setShowReportView(false)} className="ml-auto flex items-center gap-1 bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl hover:bg-slate-300 transition">
            Reset View
          </button>
        </div>
      )}

      {/* --- FORMULATION WHITE PAPER FORM SHEET --- */}
      {showReportView ? (
        <div id="printable-sheet" className="bg-white text-slate-900 p-8 sm:p-12 rounded-[1.5rem] border border-slate-300 shadow-2xl max-w-5xl mx-auto printable-actual-content">
          
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-4 border-slate-900 pb-5 mb-6 gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-dark.png" 
                alt="Logo" 
                className="w-14 h-14 object-contain rounded-xl" 
                onError={(e) => { e.target.src = "/logo.png"; }}
              />
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                  NAVEED & ZEESHAN TRADERS, MAILSI
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Fadda Bazar Mailsi
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide bg-slate-100 px-3 py-1 rounded-md inline-block">
                {activeReport?.replace('_', ' ')} Report
              </h1>
              <p className="text-xs font-bold text-slate-600 mt-2">
                Duration: <span className="underline font-black">{startDate}</span> to <span className="underline font-black">{endDate}</span>
              </p>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                System Time: {currentDateTime.date} | {currentDateTime.time}
              </p>
            </div>
          </div>

          {/* 1. SALES BLOCK */}
          {activeReport === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gross Trade Volume</span>
                  <h3 className="text-xl font-black text-slate-900">{formatCurrency(totalSales)}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Sales Bills</span>
                  <h3 className="text-xl font-black text-slate-900">{filteredSales.length} Invoices</h3>
                </div>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2">Date</th>
                    <th>Invoice No</th>
                    <th>Customer Name</th>
                    <th>Method</th>
                    <th className="text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredSales.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-slate-400">No trading records logged in this specific date range.</td></tr>
                  ) : (
                    filteredSales.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2">{s.date || fallbackTodayDate}</td>
                        <td className="font-bold text-slate-900">{s.invoiceNo || `INV-${1000 + idx}`}</td>
                        <td>{s.customerName || s.customer || 'Counter Cash Client'}</td>
                        <td><span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-bold rounded">{s.paymentMethod || 'Cash'}</span></td>
                        <td className="text-right font-black text-slate-900">{formatCurrency(s.netTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. EXPENSE BLOCK */}
          {activeReport === 'expense' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Operational Payout Outflow</span>
                <h3 className="text-xl font-black text-rose-600">{formatCurrency(totalExpenses)}</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2">Date</th>
                    <th>Expense Description</th>
                    <th className="text-right">Paid Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan="3" className="py-6 text-center text-slate-400">No operational expenses logged.</td></tr>
                  ) : (
                    filteredExpenses.map((e, idx) => (
                      <tr key={idx}>
                        <td className="py-2">{e.date}</td>
                        <td>{e.description || e.category}</td>
                        <td className="text-right font-bold text-rose-600">-{formatCurrency(e.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. RECOVERY BLOCK */}
          {activeReport === 'recovery' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Received Recovery (Jama)</span>
                <h3 className="text-xl font-black text-emerald-600">{formatCurrency(totalRecoveries)}</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2">Date</th>
                    <th>Account / Client Title</th>
                    <th>Ref Token</th>
                    <th className="text-right">Recovered Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredRecoveries.length === 0 ? (
                    <tr><td colSpan="4" className="py-6 text-center text-slate-400">No credit ledger recovery found.</td></tr>
                  ) : (
                    filteredRecoveries.map((r, idx) => (
                      <tr key={idx}>
                        <td className="py-2">{r.date}</td>
                        <td className="font-bold text-slate-900">{r.customerName || r.customer || 'Client Account'}</td>
                        <td>{r.voucherNo || `REC-${5000 + idx}`}</td>
                        <td className="text-right font-black text-emerald-600">+{formatCurrency(r.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. PURCHASE BLOCK */}
          {activeReport === 'purchase' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Procurement Load Inbound</span>
                <h3 className="text-xl font-black text-cyan-600">{formatCurrency(totalPurchases)}</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2">Date</th>
                    <th>Supplier Vendor</th>
                    <th>Product / Description</th>
                    <th>Quantity</th>
                    <th className="text-right">Purchase Gross Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredPurchases.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-slate-400">No vendor purchase transactions loaded.</td></tr>
                  ) : (
                    filteredPurchases.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2">{p.date}</td>
                        <td className="font-bold text-slate-900">{p.supplierName || p.supplier || 'Market Supplier'}</td>
                        <td>{p.product || p.itemName || 'Bulk Stock Inventory'}</td>
                        <td>{p.qty || p.quantity || 0}</td>
                        <td className="text-right font-bold text-slate-900">
                          {formatCurrency(p.totalAmount || p.amount || Number(p.qty || 0) * Number(p.rate || p.purchaseRate || 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. PROFIT & LOSS BLOCK */}
          {activeReport === 'profit_loss' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Revenue</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{formatCurrency(profitAndLoss.revenue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Cost Price (COGS)</span>
                  <p className="text-sm font-black text-slate-600 mt-0.5">-{formatCurrency(profitAndLoss.cogs)}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Expenses</span>
                  <p className="text-sm font-black text-rose-600 mt-0.5">-{formatCurrency(totalExpenses)}</p>
                </div>
                <div className={`p-3 rounded-lg border ${profitAndLoss.net >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Net Pure Profit</span>
                  <p className={`text-base font-black ${profitAndLoss.net >= 0 ? 'text-emerald-600' : 'text-rose-600'} mt-0.5`}>{formatCurrency(profitAndLoss.net)}</p>
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs bg-slate-50/50">
                <div className="flex justify-between text-slate-600"><span>Gross Trading Margin:</span><span className="font-bold text-slate-900">{formatCurrency(profitAndLoss.gross)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Total Logged Deductions:</span><span className="font-bold text-rose-600">-{formatCurrency(totalExpenses)}</span></div>
                <div className="h-px bg-slate-300 my-1" />
                <div className="flex justify-between font-black text-xs text-slate-900"><span>Net Retained Margin:</span><span className={profitAndLoss.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(profitAndLoss.net)}</span></div>
              </div>
            </div>
          )}

          {/* 6. INVENTORY BLOCK */}
          {activeReport === 'inventory' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs font-bold">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[9px] text-slate-400 uppercase">Total Items</span>
                  <p className="text-sm font-black text-slate-900">{activeInventory.length} SKUs</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="text-[9px] text-emerald-600 uppercase">Available Stock</span>
                  <p className="text-sm font-black text-emerald-600">{activeInventory.filter(i => Number(i.stock || i.quantity || i.qty || 0) > 0).length} Items</p>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                  <span className="text-[9px] text-rose-600 uppercase">Out Of Stock (Khatam)</span>
                  <p className="text-sm font-black text-rose-600">{activeInventory.filter(i => Number(i.stock || i.quantity || i.qty || 0) <= 0).length} Items</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2">Product Name</th>
                    <th>Cost Price</th>
                    <th>Sale Price</th>
                    <th>Available Volume</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {activeInventory.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-slate-400">Inventory data is empty.</td></tr>
                  ) : (
                    activeInventory.map((item, idx) => {
                      const qty = Number(item.stock || item.quantity || item.qty || 0);
                      const isOut = qty <= 0;
                      return (
                        <tr key={idx} className={isOut ? 'bg-rose-50/70' : ''}>
                          <td className="py-2.5 font-bold text-slate-900">
                            {item.name} <span className="text-[9px] text-slate-400 font-normal block">{item.code || item.id}</span>
                          </td>
                          <td>{formatCurrency(item.purchasePrice || item.purchaseRate || item.costPrice)}</td>
                          <td>{formatCurrency(item.price || item.saleRate || item.rate)}</td>
                          <td className={`font-black ${isOut ? 'text-rose-600' : 'text-slate-900'}`}>{qty} {item.unit || 'pcs'}</td>
                          <td className="text-right">
                            {isOut ? (
                              <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">KHATAM</span>
                            ) : (
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">AVAILABLE</span>
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

          {/* Bottom Footer Section */}
          <div className="mt-12 pt-6 border-t border-slate-300 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Naveed & Zeeshan Traders Enterprise ERP</span>
            <span>Signature: _______________________</span>
          </div>

        </div>
      ) : (
        <div className="no-print flex flex-col items-center justify-center border-2 border-dashed border-slate-800/40 rounded-[1.5rem] p-24 text-center text-slate-500">
          <FileText size={48} className="stroke-1 mb-4 text-slate-600 animate-pulse" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Please select a category from the left Analytics Report side-menu to view records.
          </p>
        </div>
      )}

      {/* FIXED CSS OVERRIDES FOR BLANK PRINT PREVENTION */}
      <style jsx global>{`
        @media print {
          /* Reset nested layouts that overflow or get hidden in root layout */
          html, body, #root, __next, main, .report-main-wrapper {
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            position: static !important;
            transform: none !important;
          }

          /* Hide sidebar, buttons, and other unwanted system interfaces */
          .no-print, [class*="sidebar"], [class*="nav"], button {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }

          /* Bring sheet element directly to the front line */
          #printable-sheet, .printable-actual-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-w: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: #ffffff !important;
          }

          /* Colors validation for printable items */
          .bg-slate-50, .bg-slate-100 { background-color: #f8fafc !important; }
          .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .bg-rose-50 { background-color: #fff1f2 !important; }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

    </div>
  );
}

export default Reports;