import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  TrendingUp, 
  ArrowDownRight, 
  UserCheck, 
  ShoppingBag, 
  Boxes, 
  Calendar, 
  Download, 
  Printer,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

function Reports({ sales = [], expenses = [], inventory = [], suppliers = [], recoveries = [] }) {
  const [activeReport, setActiveReport] = useState('sales');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Premium currency formatting function
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
    const dateStr = now.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date: dateStr, time: timeStr };
  }, [activeReport, startDate, endDate]); // Updates whenever context shifts

  // --- REPORT FILTER ENGINES ---

  // 1. Sales Report Filter Logic
  const filteredSales = useMemo(() => {
    return sales.filter(s => s.date >= startDate && s.date <= endDate);
  }, [sales, startDate, endDate]);

  const totalSalesReportAmount = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + Number(s.netTotal || 0), 0);
  }, [filteredSales]);

  // 2. Expense Report Filter Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.date >= startDate && e.date <= endDate);
  }, [expenses, startDate, endDate]);

  const totalExpensesReportAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  // 3. Recovery Report Filter Logic
  const filteredRecoveries = useMemo(() => {
    return recoveries.filter(r => r.date >= startDate && r.date <= endDate);
  }, [recoveries, startDate, endDate]);

  const totalRecoveryReportAmount = useMemo(() => {
    return filteredRecoveries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [filteredRecoveries]);

  // 4. Purchase Report (Procurement) Filter Logic
  const filteredPurchases = useMemo(() => {
    // Assuming purchase/procurement records contain field 'date'
    return (suppliers || []).flatMap(s => s.purchases || [])
      .filter(p => p.date >= startDate && p.date <= endDate);
  }, [suppliers, startDate, endDate]);

  const totalPurchaseReportAmount = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + Number(p.totalAmount || p.amount || 0), 0);
  }, [filteredPurchases]);

  // 5. Profit & Loss Statement Matrix
  const profitAndLoss = useMemo(() => {
    let totalSalesRevenue = 0;
    let totalCostOfGoodsSold = 0;

    filteredSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const qty = Number(item.quantity || 0);
        const sRate = Number(item.price || item.saleRate || 0);
        const pRate = Number(item.purchasePrice || item.purchaseRate || item.costPrice || 0);

        totalSalesRevenue += (sRate * qty);
        totalCostOfGoodsSold += (pRate * qty);
      });
    });

    const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
    const netProfit = grossProfit - totalExpensesReportAmount;

    return { totalSalesRevenue, totalCostOfGoodsSold, grossProfit, netProfit };
  }, [filteredSales, totalExpensesReportAmount]);

  // Native Print Handler for professional receipt paper / PDF save
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      
      {/* Search Filter Control Bar */}
      <div className="no-print bg-white dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            />
          </div>
          <span className="text-xs font-bold text-slate-400">to</span>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            />
          </div>
        </div>

        <button 
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-md transition duration-200"
        >
          <Printer size={16} />
          Print / Export PDF
        </button>
      </div>

      {/* Navigation tabs for reports */}
      <div className="no-print flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'sales', label: 'Sales Report', icon: ShoppingBag },
          { id: 'expense', label: 'Expense Report', icon: ArrowDownRight },
          { id: 'recovery', label: 'Recovery Report', icon: UserCheck },
          { id: 'purchase', label: 'Purchase Report', icon: FileText },
          { id: 'profit_loss', label: 'Profit & Loss', icon: TrendingUp },
          { id: 'inventory', label: 'Stock Inventory', icon: Boxes },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition ${
                isActive 
                  ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --- PRINTABLE SHEET LAYOUT CONTAINER --- */}
      <div id="printable-sheet" className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-8 rounded-3xl shadow-sm print:shadow-none print:border-none print:p-0">
        
        {/* Professional Statement Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 dark:border-emerald-500 pb-6 mb-6">
          <div>
            {/* Custom Business Vector Logo Placeholder */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-emerald-500 flex items-center justify-center text-white font-black text-sm tracking-tighter">
                NZT
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  NAVEED ZEESHAN TRADERS
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mughal Kiryana Store & Milk Shop
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-xl font-black text-slate-900 dark:text-emerald-500 uppercase tracking-wide">
              {activeReport.replace('_', ' ')} Report
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Duration: <span className="text-slate-800 dark:text-slate-200">{startDate}</span> to <span className="text-slate-800 dark:text-slate-200">{endDate}</span>
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
              Generated: {currentDateTime.date} | {currentDateTime.time}
            </p>
          </div>
        </div>

        {/* --- DYNAMIC REPORT DATA RENDERING SWITCH --- */}
        
        {/* 1. SALES REPORT SHEET */}
        {activeReport === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Revenue Sales</span>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">{formatCurrency(totalSalesReportAmount)}</h3>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Orders Invoiced</span>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">{filteredSales.length} bills</h3>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5">Date</th>
                  <th>Invoice No</th>
                  <th>Customer Type</th>
                  <th>Payment Type</th>
                  <th className="text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-slate-700 dark:text-slate-300">
                {filteredSales.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-slate-400">No sales transactions logged for selected range.</td></tr>
                ) : (
                  filteredSales.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5">{s.date}</td>
                      <td className="font-bold">{s.invoiceNo || `INV-${1000 + idx}`}</td>
                      <td>{s.customerName || (s.isCredit ? 'Ledger Khata' : 'Walking Client')}</td>
                      <td><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-md">{s.paymentMethod || (s.isCredit ? 'Credit' : 'Cash')}</span></td>
                      <td className="text-right font-bold text-slate-900 dark:text-white">{formatCurrency(s.netTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. EXPENSE REPORT SHEET */}
        {activeReport === 'expense' && (
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Expenses Disbursed</span>
              <h3 className="text-xl font-black text-rose-500">{formatCurrency(totalExpensesReportAmount)}</h3>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5">Date</th>
                  <th>Category / Narration</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-slate-700 dark:text-slate-300">
                {filteredExpenses.length === 0 ? (
                  <tr><td colSpan="3" className="py-8 text-center text-slate-400">No payout vouchers recorded for this period.</td></tr>
                ) : (
                  filteredExpenses.map((e, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5">{e.date}</td>
                      <td>{e.description || e.category}</td>
                      <td className="text-right font-bold text-rose-500">-{formatCurrency(e.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. RECOVERY REPORT SHEET */}
        {activeReport === 'recovery' && (
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Credit Cash Recovered (Jama)</span>
              <h3 className="text-xl font-black text-emerald-500">{formatCurrency(totalRecoveryReportAmount)}</h3>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5">Date</th>
                  <th>Account / Customer Name</th>
                  <th>Reference Voucher</th>
                  <th className="text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-slate-700 dark:text-slate-300">
                {filteredRecoveries.length === 0 ? (
                  <tr><td colSpan="4" className="py-8 text-center text-slate-400">No recovery history discovered in specified duration.</td></tr>
                ) : (
                  filteredRecoveries.map((r, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5">{r.date}</td>
                      <td className="font-bold text-slate-800 dark:text-slate-200">{r.customerName}</td>
                      <td>{r.voucherNo || `REC-${5000 + idx}`}</td>
                      <td className="text-right font-black text-emerald-500">+{formatCurrency(r.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PURCHASE REPORT SHEET */}
        {activeReport === 'purchase' && (
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Procurement Investment</span>
              <h3 className="text-xl font-black text-cyan-500">{formatCurrency(totalPurchaseReportAmount)}</h3>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5">Date</th>
                  <th>Vendor / Supplier</th>
                  <th>Product Inventory Items</th>
                  <th className="text-right">Purchase Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-slate-700 dark:text-slate-300">
                {filteredPurchases.length === 0 ? (
                  <tr><td colSpan="4" className="py-8 text-center text-slate-400">No wholesale inventory load recorded.</td></tr>
                ) : (
                  filteredPurchases.map((p, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5">{p.date}</td>
                      <td className="font-bold">{p.supplierName || 'Market Vendor'}</td>
                      <td>{p.itemName || p.details || 'Bulk Stock Load'}</td>
                      <td className="text-right font-bold text-slate-900 dark:text-white">{formatCurrency(p.totalAmount || p.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. PROFIT & LOSS STATEMENT */}
        {activeReport === 'profit_loss' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Revenue (Sales)</span>
                <p className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(profitAndLoss.totalSalesRevenue)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cost of Goods (Purchases)</span>
                <p className="text-base font-black text-slate-700 dark:text-slate-400">-{formatCurrency(profitAndLoss.totalCostOfGoodsSold)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Operating Expenses</span>
                <p className="text-base font-black text-rose-500">-{formatCurrency(totalExpensesReportAmount)}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${profitAndLoss.netProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Calculated Net Profit</span>
                <p className={`text-lg font-black ${profitAndLoss.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(profitAndLoss.netProfit)}</p>
              </div>
            </div>

            {/* Visual Breakdown Strip Ledger */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex justify-between font-medium"><span className="text-slate-500">Gross Trading Margin (Sales - Cost Price):</span><span className="font-bold text-slate-900 dark:text-white">{formatCurrency(profitAndLoss.grossProfit)}</span></div>
              <div className="flex justify-between font-medium"><span className="text-slate-500">Deduction from Outbound Expenses:</span><span className="font-bold text-rose-500">-{formatCurrency(totalExpensesReportAmount)}</span></div>
              <div className="h-px bg-slate-200 dark:border-slate-800 my-1" />
              <div className="flex justify-between font-black text-sm"><span>Net Retained Margin Summary:</span><span className={profitAndLoss.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{formatCurrency(profitAndLoss.netProfit)}</span></div>
            </div>
          </div>
        )}

        {/* 6. STOCK INVENTORY REPORT (TOTAL STOCK WITH OUT OF STOCK INDICATORS) */}
        {activeReport === 'inventory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                <span className="text-[10px] text-slate-400 uppercase">Total Catalog Items</span>
                <p className="text-lg font-black text-slate-900 dark:text-white">{inventory.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-[10px] text-emerald-500 uppercase">Available Active Stock</span>
                <p className="text-lg font-black text-emerald-500">{inventory.filter(i => Number(i.stock || i.quantity) > 0).length} Items</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                <span className="text-[10px] text-rose-500 uppercase">Out Of Stock (Khatam Maal)</span>
                <p className="text-lg font-black text-rose-500">{inventory.filter(i => Number(i.stock || i.quantity) <= 0).length} Items</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5">Item Code / Name</th>
                  <th>Purchase Price</th>
                  <th>Retail Sale Price</th>
                  <th>Current Stock Qty</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-slate-700 dark:text-slate-300">
                {inventory.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-slate-400">No inventory products loaded in master database.</td></tr>
                ) : (
                  inventory.map((item, idx) => {
                    const currentQty = Number(item.stock || item.quantity || 0);
                    const isOut = currentQty <= 0;
                    return (
                      <tr key={idx} className={isOut ? 'bg-rose-500/5' : ''}>
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          {item.name} <span className="text-[10px] text-slate-400 font-normal block">{item.code || item.id}</span>
                        </td>
                        <td>{formatCurrency(item.purchasePrice || item.purchaseRate || item.costPrice)}</td>
                        <td>{formatCurrency(item.price || item.saleRate)}</td>
                        <td className={`font-black ${isOut ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                          {currentQty} {item.unit || 'pcs'}
                        </td>
                        <td className="text-right">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                              <AlertCircle size={10} /> Khatam (0)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <CheckCircle2 size={10} /> Available
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

      </div>

      {/* Embedded Global Stylesheet for Print Mode Isolation */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-sheet {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }
        }
      `}</style>

    </div>
  );
}

export default Reports;