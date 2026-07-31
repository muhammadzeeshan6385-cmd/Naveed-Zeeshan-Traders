import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Calendar, 
  ShoppingBag, 
  ArrowDownRight, 
  TrendingUp, 
  Boxes,
  TrendingDown,
  Wallet
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

  const fallbackTodayDate = new Date().toISOString().split('T')[0];

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

  // Helper Function for Purchase Amount Calculation
  const getPurchaseRowAmount = (p) => {
    if (p.totalAmount !== undefined && p.totalAmount !== null && Number(p.totalAmount) > 0) return Number(p.totalAmount);
    if (p.amount !== undefined && p.amount !== null && Number(p.amount) > 0) return Number(p.amount);
    if (p.netTotal !== undefined && p.netTotal !== null && Number(p.netTotal) > 0) return Number(p.netTotal);
    if (p.billAmount !== undefined && p.billAmount !== null && Number(p.billAmount) > 0) return Number(p.billAmount);

    const qty = Number(p.qty || p.quantity || p.totalQty || 0);
    const rate = Number(p.rate || p.purchaseRate || p.price || p.unitPrice || p.costPrice || 0);
    if (qty > 0 && rate > 0) return qty * rate;

    if (p.items && Array.isArray(p.items) && p.items.length > 0) {
      return p.items.reduce((sum, item) => {
        const iQty = Number(item.qty || item.quantity || 0);
        const iRate = Number(item.purchaseRate || item.rate || item.price || item.costPrice || 0);
        const iTotal = Number(item.total || item.totalAmount || (iQty * iRate) || 0);
        return sum + iTotal;
      }, 0);
    }

    return 0;
  };

  // Helper Function to Determine Sale Payment Method Dynamically
  const getSalePaymentMethod = (s) => {
    const rawMethod = (
      s.paymentMethod || 
      s.method || 
      s.paymentType || 
      s.saleType || 
      s.type || 
      s.status || 
      ''
    ).toString().trim();

    if (s.isCredit === true || s.isUdhar === true) return 'Credit';

    if (rawMethod) {
      const lower = rawMethod.toLowerCase();
      if (lower.includes('credit') || lower.includes('udhar') || lower.includes('ledger') || lower.includes('khata') || lower.includes('unpaid') || lower.includes('due')) {
        return 'Credit';
      }
      if (lower.includes('bank') || lower.includes('online') || lower.includes('card') || lower.includes('transfer')) {
        return 'Bank';
      }
      if (lower.includes('cash') || lower.includes('paid')) {
        return 'Cash';
      }
      return rawMethod;
    }

    return 'Cash';
  };

  // --- DATA CALCULATIONS ---
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

  const totalPurchases = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + getPurchaseRowAmount(p), 0);
  }, [filteredPurchases]);

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

  // PRINT PIPELINE
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
            table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 8px; }
            th { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; padding: 8px 10px; letter-spacing: 0.03em; }
            td { font-size: 11px; font-weight: 500; color: #334155; border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
            .text-right { text-align: right; }
            .badge-method { background: #e2e8f0; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: #334155; text-transform: uppercase; }
            .badge-credit { background: #ffe4e6; color: #e11d48; }
            .footer-container { border-top: 1px dashed #cbd5e1; margin-top: 48px; padding-top: 16px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
            .signature-line { color: #475569; font-weight: 700; }
            tfoot tr td { font-weight: 800; border-top: 2px solid #0f172a; background-color: #f8fafc; }
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

  const reportCards = [
    { id: 'sales', name: 'Sales Statement', desc: 'Customer sales invoices and revenue', icon: ShoppingBag, color: 'emerald' },
    { id: 'expense', name: 'Expense Outflow', desc: 'Operational costs and cash payouts', icon: TrendingDown, color: 'rose' },
    { id: 'recovery', name: 'Ledger Recovery', desc: 'Received payments & Jama accounts', icon: Wallet, color: 'indigo' },
    { id: 'purchase', name: 'Procurement Inbound', desc: 'Vendor purchases and supplier stock', icon: ArrowDownRight, color: 'cyan' },
    { id: 'profit_loss', name: 'Profit & Loss', desc: 'Net margin, COGS, and income statement', icon: TrendingUp, color: 'amber' },
    { id: 'inventory', name: 'Stock Audit', desc: 'Inventory quantities and stock alert', icon: Boxes, color: 'slate' }
  ];

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

      {/* --- DASHBOARD QUICK SELECTOR --- */}
      {!showReportView && (
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">Business Reports Center</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Select a category below to generate statement documents and print ledger sheets.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportCards.map(card => {
              const IconComp = card.icon;
              return (
                <div 
                  key={card.id} 
                  onClick={() => handleReportTrigger(card.id)}
                  className="bg-white border border-slate-200 hover:border-emerald-500 p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition flex items-start gap-4 group"
                >
                  <div className="p-3 bg-slate-50 group-hover:bg-emerald-50 rounded-xl text-slate-700 group-hover:text-emerald-600 transition">
                    <IconComp size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition">{card.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- ACTION HEAD BUTTONS --- */}
      {showReportView && (
        <div className="no-print flex items-center gap-2 mb-4 max-w-4xl mx-auto">
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
      {showReportView && (
        <div id="printable-sheet" className="bg-white text-slate-900 p-8 sm:p-10 rounded-[1.5rem] border border-slate-200 shadow-xl max-w-4xl mx-auto printable-actual-content">
          
          {/* Header Block */}
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
                  Naveed & Zeeshan Traders
                </h2>
                <p className="brand-subtitle text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 mb-0">
                  A Rakha Colony, Mailsi
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
                    filteredSales.map((s, idx) => {
                      const methodDisplay = getSalePaymentMethod(s);
                      const isCredit = methodDisplay.toLowerCase() === 'credit';

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 text-slate-700">{s.date || fallbackTodayDate}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-900">{s.invoiceNo || `INV-${1000 + idx}`}</td>
                          <td className="py-2.5 px-2 text-slate-800">{s.customerName || s.customer || 'Counter Cash Client'}</td>
                          <td className="py-2.5 px-2">
                            <span className={`badge-method text-[9px] font-bold px-2 py-0.5 rounded uppercase ${isCredit ? 'bg-rose-100 text-rose-700 badge-credit' : 'bg-slate-100 text-slate-600'}`}>
                              {methodDisplay}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900">{formatCurrency(s.netTotal)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredSales.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50">
                      <td colSpan="4" className="py-3 px-2 font-extrabold text-slate-900 uppercase text-right text-xs">
                        Total Sales ({filteredSales.length} Invoices):
                      </td>
                      <td className="py-3 px-2 text-right font-black text-emerald-600 text-sm">
                        {formatCurrency(totalSales)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 2. EXPENSE BLOCK */}
          {activeReport === 'expense' && (
            <div className="space-y-4">
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
                {filteredExpenses.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50">
                      <td colSpan="2" className="py-3 px-2 font-extrabold text-slate-900 uppercase text-right text-xs">
                        Total Expenses:
                      </td>
                      <td className="py-3 px-2 text-right font-black text-rose-600 text-sm">
                        -{formatCurrency(totalExpenses)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 3. RECOVERY BLOCK */}
          {activeReport === 'recovery' && (
            <div className="space-y-4">
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
                {filteredRecoveries.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50">
                      <td colSpan="3" className="py-3 px-2 font-extrabold text-slate-900 uppercase text-right text-xs">
                        Total Recovered Amount:
                      </td>
                      <td className="py-3 px-2 text-right font-black text-emerald-600 text-sm">
                        +{formatCurrency(totalRecoveries)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 4. PURCHASE BLOCK */}
          {activeReport === 'purchase' && (
            <div className="space-y-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Date</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Supplier Vendor</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Product / Description</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2">Quantity</th>
                    <th className="text-[10px] font-bold uppercase text-slate-600 py-2 px-2 text-right">Purchase Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {filteredPurchases.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-slate-400">No vendor purchase transactions loaded.</td></tr>
                  ) : (
                    filteredPurchases.map((p, idx) => {
                      const rowAmount = getPurchaseRowAmount(p);
                      const displayQty = p.qty || p.quantity || (p.items ? p.items.reduce((s, i) => s + Number(i.qty || i.quantity || 0), 0) : 0);
                      const displayItem = p.product || p.itemName || (p.items && p.items.length > 0 ? p.items.map(i => i.name || i.product).join(', ') : 'Bulk Stock Inventory');

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2 text-slate-700">{p.date || fallbackTodayDate}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-900">{p.supplierName || p.supplier || 'Market Supplier'}</td>
                          <td className="py-2.5 px-2 text-slate-800">{displayItem}</td>
                          <td className="py-2.5 px-2 text-slate-700">{displayQty}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                            {formatCurrency(rowAmount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredPurchases.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50">
                      <td colSpan="4" className="py-3 px-2 font-extrabold text-slate-900 uppercase text-right text-xs">
                        Total Purchase Amount:
                      </td>
                      <td className="py-3 px-2 text-right font-black text-cyan-700 text-sm">
                        {formatCurrency(totalPurchases)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 5. PROFIT & LOSS BLOCK */}
          {activeReport === 'profit_loss' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex justify-between text-xs text-slate-600 py-1.5">
                  <span>Total Gross Revenue (Sales):</span>
                  <span className="font-bold text-slate-900">{formatCurrency(profitAndLoss.revenue)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 py-1.5">
                  <span>Cost of Goods Sold (COGS):</span>
                  <span className="font-bold text-slate-500">-{formatCurrency(profitAndLoss.cogs)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 py-1.5">
                  <span>Operational Expenses:</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="h-[1px] bg-slate-300 my-2" />
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1">
                  <span>Net Retained Margin (Pure Profit):</span>
                  <span className={profitAndLoss.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatCurrency(profitAndLoss.net)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 6. INVENTORY BLOCK */}
          {activeReport === 'inventory' && (
            <div className="space-y-4">
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
                {activeInventory.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50">
                      <td colSpan="3" className="py-3 px-2 font-extrabold text-slate-900 uppercase text-right text-xs">
                        Total Items SKUs:
                      </td>
                      <td colSpan="2" className="py-3 px-2 font-black text-slate-900 text-sm">
                        {activeInventory.length} Items Total
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* --- FOOTER --- */}
          <div className="footer-container border-t border-dashed border-slate-300 mt-12 pt-4 flex justify-between items-end text-[10px] text-slate-400 uppercase font-semibold">
            <div>
              <p className="m-0">Computer Generated Document</p>
              <p className="m-0 text-slate-500 font-medium mt-0.5">Verified & Processed by System</p>
            </div>
            <div className="text-right">
              <div className="border-b border-slate-400 w-36 mb-1"></div>
              <p className="signature-line text-slate-700 font-bold m-0">Authorized Signature</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default Reports;