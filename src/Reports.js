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

  // NO-RELOAD HIGH-PERFORMANCE PRINT PIPELINE:
  const handlePrint = () => {
    const reportElement = document.getElementById('printable-sheet');
    if (!reportElement) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    
    doc.write(`
      <html>
        <head>
          <title>System Statement</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #ffffff; color: #1e293b; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
            .brand-section { display: flex; align-items: center; gap: 16px; }
            .brand-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
            .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0; letter-spacing: -0.02em; }
            .brand-subtitle { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin: 2px 0 0 0; letter-spacing: 0.05em; }
            .meta-section { text-align: right; }
            .report-badge { font-size: 14px; font-weight: 900; background: #f1f5f9; color: #0f172a; text-transform: uppercase; padding: 4px 12px; border-radius: 6px; display: inline-block; margin: 0 0 8px 0; letter-spacing: 0.05em; }
            .meta-text { font-size: 11px; color: #475569; margin: 2px 0; font-weight: 600; }
            .meta-value { font-weight: 700; color: #0f172a; }
            .metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
            .metrics-grid-quad { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
            .metrics-grid-tri { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
            .card-box { background: #f8fafc !important; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 10px; }
            .card-box-emerald { background: #f0fdf4 !important; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 10px; }
            .card-box-rose { background: #fff5f5 !important; border: 1px solid #fecaca; padding: 12px 16px; border-radius: 10px; }
            .card-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
            .card-amount { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
            .text-emerald { color: #16a34a !important; }
            .text-rose { color: #dc2626 !important; }
            .text-cyan { color: #0891b2 !important; }
            table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 8px; }
            th { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; padding: 8px 10px; letter-spacing: 0.03em; }
            td { font-size: 11px; font-weight: 500; color: #334155; border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
            .font-bold-table { font-weight: 700; color: #0f172a; }
            .text-right { text-align: right; }
            .badge-method { background: #e2e8f0; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: #334155; text-transform: uppercase; }
            .footer-container { border-top: 1px dashed #cbd5e1; margin-top: 48px; padding-top: 16px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
            .signature-line { color: #475569; font-weight: 700; }
            .p-summary-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; background: #fafafa; margin-top: 16px; }
            .p-summary-row { display: flex; justify-content: space-between; font-size: 11px; color: #475569; padding: 4px 0; }
            .p-summary-divider { height: 1px; background: #e2e8f0; margin: 6px 0; }
            .p-summary-total { font-weight: 800; font-size: 12px; color: #0f172a; }
          </style>
        </head>
        <body>
          ${reportElement.innerHTML}
        </body>
      </html>
    `);

    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 350);
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
        <div className="no-print flex items-center gap-2 mb-4">
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
        <div id="printable-sheet" className="bg-white text-slate-900 p-8 sm:p-10 rounded-[1.5rem] border border-slate-200 shadow-xl max-w-4xl mx-auto printable-actual-content">
          
          {/* Header Block with Screen + Print Safe Alignments */}
          <div className="header-container flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div className="brand-section flex items-center gap-4">
              <img 
                src="/logo-dark.png" 
                alt="Logo" 
                className="brand-logo w-16 h-16 object-contain rounded-lg"
                style={{ width: '64px', height: '64px', minWidth: '64px' }}
                onError={(e) => { e.target.src = "/logo.png"; }}
              />
              <div>
                <h2 className="brand-title text-xl font-extrabold text-slate-900 uppercase tracking-tight leading-none m-0">
                  NAVEED & ZEESHAN TRADERS
                </h2>
                <p className="brand-subtitle text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 mb-0">
                  Fadda Bazar Mailsi
                </p>
              </div>
            </div>

            <div className="meta-section text-right">
              <div className="report-badge text-sm font-black bg-slate-100 text-slate-900 uppercase px-3 py-1 rounded-md inline-block mb-2 tracking-wider">
                {activeReport?.replace('_', ' ')} Report
              </div>
              <p className="meta-text text-xs text-slate-600 my-0.5 font-semibold">
                Duration: <span className="meta-value font-bold text-slate-950">{startDate}</span> to <span className="meta-value font-bold text-slate-950">{endDate}</span>
              </p>
              <p className="meta-text text-[9px] text-slate-400 my-0.5">
                GEN: {currentDateTime.date} | {currentDateTime.time}
              </p>
            </div>
          </div>

          {/* 1. SALES BLOCK */}
          {activeReport === 'sales' && (
            <div className="space-y-4">
              <div className="metrics-grid grid grid-cols-2 gap-4 mb-6">
                <div className="card-box bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gross Trade Volume</span>
                  <h3 className="card-amount text-xl font-extrabold text-emerald-600">{formatCurrency(totalSales)}</h3>
                </div>
                <div className="card-box bg-slate-50 border border-slate-200 p-4 rounded-xl text-right">
                  <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Sales Bills</span>
                  <h3 className="card-amount text-xl font-extrabold text-slate-900">{filteredSales.length} Invoices</h3>
                </div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Date</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Invoice No</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Customer Name</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Method</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {filteredSales.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-slate-400">No trading records logged in this specific date range.</td></tr>
                  ) : (
                    filteredSales.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-700">{s.date || fallbackTodayDate}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-900">{s.invoiceNo || `INV-${1000 + idx}`}</td>
                        <td className="py-2.5 px-2 text-slate-800">{s.customerName || s.customer || 'Counter Cash Client'}</td>
                        <td className="py-2.5 px-2"><span className="badge-method bg-slate-100 text-[9px] font-bold px-2 py-0.5 rounded text-slate-600 uppercase">{s.paymentMethod || 'Cash'}</span></td>
                        <td className="py-2.5 px-2 text-right font-bold text-slate-900">{formatCurrency(s.netTotal)}</td>
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
              <div className="card-box bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
                <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Operational Payout Outflow</span>
                <h3 className="card-amount text-xl font-extrabold text-rose-600">{formatCurrency(totalExpenses)}</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Date</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Expense Description</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2 text-right">Paid Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan="3" className="py-6 text-center text-slate-400">No operational expenses logged.</td></tr>
                  ) : (
                    filteredExpenses.map((e, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-700">{e.date}</td>
                        <td className="py-2.5 px-2 text-slate-800">{e.description || e.category}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-rose-600">-{formatCurrency(e.amount)}</td>
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
              <div className="card-box-emerald bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6">
                <span className="card-label text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Total Received Recovery (Jama)</span>
                <h3 className="card-amount text-xl font-extrabold text-emerald-600">{formatCurrency(totalRecoveries)}</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Date</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Account / Client Title</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Ref Token</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2 text-right">Recovered Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {filteredRecoveries.length === 0 ? (
                    <tr><td colSpan="4" className="py-6 text-center text-slate-400">No credit ledger recovery found.</td></tr>
                  ) : (
                    filteredRecoveries.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-700">{r.date}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-900">{r.customerName || r.customer || 'Client Account'}</td>
                        <td className="py-2.5 px-2 text-slate-600">{r.voucherNo || `REC-${5000 + idx}`}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-emerald-600">+{formatCurrency(r.amount)}</td>
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
              <div className="card-box bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
                <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Procurement Load Inbound</span>
                <h3 className="card-amount text-xl font-extrabold text-cyan-600">{formatCurrency(totalPurchases)}</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Date</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Supplier Vendor</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Product / Description</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Quantity</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2 text-right">Purchase Gross Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {filteredPurchases.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-slate-400">No vendor purchase transactions loaded.</td></tr>
                  ) : (
                    filteredPurchases.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-700">{p.date}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-900">{p.supplierName || p.supplier || 'Market Supplier'}</td>
                        <td className="py-2.5 px-2 text-slate-800">{p.product || p.itemName || 'Bulk Stock Inventory'}</td>
                        <td className="py-2.5 px-2 text-slate-700">{p.qty || p.quantity || 0}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-slate-900">
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
              <div className="metrics-grid-quad grid grid-cols-4 gap-3 mb-6">
                <div className="card-box bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Revenue</span>
                  <p className="card-amount text-sm font-bold text-slate-900">{formatCurrency(profitAndLoss.revenue)}</p>
                </div>
                <div className="card-box bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cost Price (COGS)</span>
                  <p className="card-amount text-sm font-bold text-slate-500">-{formatCurrency(profitAndLoss.cogs)}</p>
                </div>
                <div className="card-box bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Expenses</span>
                  <p className="card-amount text-sm font-bold text-rose-600">-{formatCurrency(totalExpenses)}</p>
                </div>
                <div className={`card-box p-3 rounded-xl ${profitAndLoss.net >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                  <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Net Pure Profit</span>
                  <p className={`card-amount text-sm font-black ${profitAndLoss.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(profitAndLoss.net)}</p>
                </div>
              </div>
              
              <div className="p-summary-box border border-slate-200 rounded-xl p-4 bg-slate-50 mt-4">
                <div className="p-summary-row flex justify-between text-xs text-slate-600 py-1"><span>Gross Trading Margin:</span><span className="font-bold text-slate-900">{formatCurrency(profitAndLoss.gross)}</span></div>
                <div className="p-summary-row flex justify-between text-xs text-slate-600 py-1"><span>Total Logged Deductions:</span><span className="font-bold text-rose-600">-{formatCurrency(totalExpenses)}</span></div>
                <div className="p-summary-divider h-[1px] bg-slate-200 my-2" />
                <div className="p-summary-row flex justify-between text-sm font-extrabold text-slate-900 pt-1"><span>Net Retained Margin:</span><span className={profitAndLoss.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(profitAndLoss.net)}</span></div>
              </div>
            </div>
          )}

          {/* 6. INVENTORY BLOCK */}
          {activeReport === 'inventory' && (
            <div className="space-y-4">
              <div className="metrics-grid-tri grid grid-cols-3 gap-3 mb-6">
                <div className="card-box bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="card-label text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Items</span>
                  <p className="card-amount text-sm font-bold text-slate-900">{activeInventory.length} SKUs</p>
                </div>
                <div className="card-box-emerald bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="card-label text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Available Stock</span>
                  <p className="card-amount text-sm font-bold text-emerald-600">{activeInventory.filter(i => Number(i.stock || i.quantity || i.qty || 0) > 0).length} Items</p>
                </div>
                <div className="card-box-rose bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <span className="card-label text-[9px] font-bold text-rose-700 uppercase tracking-wider block mb-1">Out Of Stock (Khatam)</span>
                  <p className="card-amount text-sm font-bold text-rose-600">{activeInventory.filter(i => Number(i.stock || i.quantity || i.qty || 0) <= 0).length} Items</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Product Name</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Cost Price</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Sale Price</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Available Volume</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {activeInventory.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-slate-400">Inventory data is empty.</td></tr>
                  ) : (
                    activeInventory.map((item, idx) => {
                      const qty = Number(item.stock || item.quantity || item.qty || 0);
                      const isOut = qty <= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 font-bold text-slate-900">
                            {item.name} <span className="text-[9px] text-slate-400 font-normal block">{item.code || item.id}</span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-700">{formatCurrency(item.purchasePrice || item.purchaseRate || item.costPrice)}</td>
                          <td className="py-2.5 px-2 text-slate-700">{formatCurrency(item.price || item.saleRate || item.rate)}</td>
                          <td className={`py-2.5 px-2 font-bold ${isOut ? 'text-rose-600' : 'text-slate-900'}`}>{qty} {item.unit || 'pcs'}</td>
                          <td className="py-2.5 px-2 text-right">
                            {isOut ? (
                              <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded uppercase">KHATAM</span>
                            ) : (
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded uppercase">AVAILABLE</span>
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
          <div className="footer-container border-t border-dashed border-slate-300 mt-12 pt-4 flex justify-between text-[10px] font-semibold text-slate-400 uppercase">
            <span>Naveed & Zeeshan Traders Enterprise ERP</span>
            <span className="signature-line font-bold text-slate-600">Signature: _______________________</span>
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

      {/* ADDITIONAL STYLING TO ENSURE CLEAN RENDER COPIES */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
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