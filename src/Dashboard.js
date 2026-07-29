import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  ArrowUpRight, 
  UserCheck, 
  FileText, 
  Activity, 
  ArrowDownRight,
  Wallet,
  RotateCcw 
} from 'lucide-react';

function Dashboard({ stats = {}, recentExpenses = [], recentSales = [], getSaleCustomer, getSaleTotal, sales = [], returns = [], products = [] }) {
  
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(val || 0).replace('PKR', 'Rs.');
  };

  // Helper function to identify direct Cash Sales vs Ledger/Udhaar Sales
  const isCashSale = (s) => {
    const custName = String(s.customer || '').trim().toLowerCase();
    const payment = String(s.paymentType || s.paymentMethod || s.type || '').trim().toLowerCase();
    
    return payment === 'cash' || 
           custName === '' || 
           custName === 'counter sale' || 
           custName === 'cash customer' || 
           custName === 'cash' || 
           s.isCredit === false;
  };

  // 1. DYNAMIC NET PROFIT ENGINE
  // Directly rely on App.js pre-calculated stats profit if available to avoid mismatches
  const calculatedNetProfit = useMemo(() => {
    if (stats.profit !== undefined && stats.profit !== null && !isNaN(stats.profit)) {
      return Number(stats.profit);
    }

    let totalGrossMargin = 0;

    sales.forEach((sale) => {
      const items = sale.items || [];
      items.forEach((item) => {
        const qty = Number(item.qty || item.quantity || 0);
        const saleRate = Number(item.rate || item.price || item.saleRate || 0);
        
        // Lookup original product purchase rate if not directly on item
        const originalProduct = products.find(p => 
          (p.id && item.productId && String(p.id) === String(item.productId)) || 
          (p.name && item.name && String(p.name).trim().toLowerCase() === String(item.name).trim().toLowerCase())
        );

        const purchaseRate = Number(
          item.purchaseRate || 
          item.purchasePrice || 
          item.costPrice || 
          item.cost || 
          item.buyPrice || 
          originalProduct?.purchaseRate || 
          originalProduct?.costPrice || 
          originalProduct?.cost || 
          0
        );

        const itemGross = saleRate * qty;
        const discPercent = Number(item.discount || 0);
        const netItemSale = itemGross - (itemGross * (discPercent / 100));

        const itemCost = purchaseRate * qty;
        totalGrossMargin += (netItemSale - itemCost);
      });
    });

    sales.forEach((sale) => {
      const totalBillDiscount = Number(sale.discount || 0);
      if (totalBillDiscount > 0 && (!sale.items || sale.items.length === 0)) {
        totalGrossMargin -= totalBillDiscount;
      }
    });

    let returnedProfitImpact = 0;
    returns.forEach((returnItem) => {
      const items = returnItem.items || [];
      items.forEach((item) => {
        const qty = Number(item.qty || item.quantity || 0);
        const saleRate = Number(item.rate || item.price || item.saleRate || 0);
        const purchaseRate = Number(
          item.purchaseRate || item.purchasePrice || item.costPrice || item.cost || 0
        );
        
        returnedProfitImpact += ((saleRate - purchaseRate) * qty);
      });
    });

    const totalExpense = Number(stats.totalExpense || 0);

    return totalGrossMargin - totalExpense - returnedProfitImpact;
  }, [stats, sales, returns, products]);

  // 2. AGGREGATE RETURNS CALCULATION
  const totalReturnsVolume = useMemo(() => {
    if (stats.productReturn !== undefined && stats.productReturn !== null) {
      return Number(stats.productReturn);
    }

    let activeReturnsAmount = returns.reduce((sum, r) => {
      return sum + Number(r.refundAmount || r.netTotal || r.total || 0);
    }, 0);

    if (activeReturnsAmount === 0) {
      return Number(stats.totalReturn || stats.totalReturns || 0);
    }

    return activeReturnsAmount;
  }, [stats, returns]);

  // 3. CASH IN HAND ENGINE
  const cashInHand = useMemo(() => {
    if (stats.cashInHand !== undefined && stats.cashInHand !== null) {
      return Number(stats.cashInHand);
    }

    const totalRecovery = Number(stats.totalRecovery || 0);
    
    const totalCashInvoices = sales
      .reduce((sum, s) => {
        const net = Number(s.netTotal || s.total || 0);
        if (isCashSale(s)) {
          return sum + net;
        } else {
          const upfrontPaid = Number(s.paid || s.received || s.paidAmount || 0);
          return sum + Math.min(upfrontPaid, net);
        }
      }, 0);
      
    const totalExpense = Number(stats.totalExpense || 0);
    const totalCashRefunds = totalReturnsVolume;

    return Math.max(0, (totalRecovery + totalCashInvoices) - totalExpense - totalCashRefunds);
  }, [stats, sales, totalReturnsVolume]);

  // 4. OUTSTANDING UDHAAR BALANCE ENGINE
  const calculatedOutstandingUdhaar = useMemo(() => {
    if (stats.outstanding !== undefined && stats.outstanding !== null) {
      return Number(stats.outstanding);
    }

    const rawTotalSales = Number(stats.totalSale || 0) || sales.reduce((sum, s) => sum + Number(s.netTotal || 0), 0);
    const totalCashInvoices = sales
      .reduce((sum, s) => {
        const net = Number(s.netTotal || s.total || 0);
        if (isCashSale(s)) {
          return sum + net;
        } else {
          const upfrontPaid = Number(s.paid || s.received || s.paidAmount || 0);
          return sum + Math.min(upfrontPaid, net);
        }
      }, 0);
      
    const totalRecovery = Number(stats.totalRecovery || 0);

    const outstanding = rawTotalSales - totalCashInvoices - totalRecovery;
    
    return Math.max(0, outstanding);
  }, [stats, sales]);

  const isProfitNegative = calculatedNetProfit < 0;

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
      
      {/* Top System Sync Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Operational Overview
          </h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
            Real-time Financial & Stock Ledger Summary
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
          <Activity size={16} className="text-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Live System Sync</span>
        </div>
      </div>

      {/* --- Cards Grid Section --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Total Sales Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner"><ShoppingBag size={20} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(stats.totalSale)}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2">Accumulated terminal billing</p>
          </div>
        </div>

        {/* Today's Sales Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shadow-inner"><ArrowUpRight size={20} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(stats.todaySales)}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2">Current date counter records</p>
          </div>
        </div>

        {/* Cash In Hand Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-cyan-500/30 shadow-sm hover:shadow-md transition duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cash In Hand</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 shadow-inner"><Wallet size={20} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-cyan-400 tracking-tight">{formatCurrency(cashInHand)}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2">Recovery + Cash Bill - Expenses - Cash Refunds</p>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shadow-inner"><ArrowDownRight size={20} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(stats.totalExpense)}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2">All ledger payouts included</p>
          </div>
        </div>

        {/* Net Profit / Margin Card */}
        <div className={`relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border shadow-sm transition duration-300 group ${
          isProfitNegative ? 'border-rose-500/30 shadow-rose-950/5' : 'border-emerald-500/30 shadow-emerald-950/5'
        }`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none transition-all group-hover:scale-110 ${
            isProfitNegative ? 'bg-rose-500/5' : 'bg-emerald-500/5'
          }`} />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Net Profit / Margin</span>
            <div className={`p-2.5 rounded-xl shadow-inner ${
              isProfitNegative ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
            }`}><TrendingUp size={20} /></div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-black tracking-tight ${isProfitNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
              {formatCurrency(calculatedNetProfit)}
            </h3>
            <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-2 ${
              isProfitNegative ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {isProfitNegative ? 'Margin Deficit' : 'Net Margin Safe'}
            </span>
          </div>
        </div>

        {/* Total Recovery Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Recovery</span>
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500 shadow-inner"><UserCheck size={20} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(stats.totalRecovery)}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2">Jama collections counter</p>
          </div>
        </div>

        {/* Product Returns Volume Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Product Returns</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shadow-inner"><RotateCcw size={20} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(totalReturnsVolume)}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2">Maal wapsi trade value</p>
          </div>
        </div>

        {/* Outstanding Udhaar Balance Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition duration-300 group sm:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-115" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Outstanding Udhaar Balance</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shadow-inner"><DollarSign size={20} /></div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h3 className="text-3xl font-black text-amber-500 tracking-tight">{formatCurrency(calculatedOutstandingUdhaar)}</h3>
            <span className="text-[11px] text-amber-500/80 font-bold bg-amber-500/10 px-3 py-1 rounded-xl uppercase tracking-wider">
              Pending Market Dues
            </span>
          </div>
        </div>

      </div>

      {/* --- Bottom Row Table Data --- */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Recent Payouts Module */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500"><ArrowDownRight size={16} /></div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Recent Payouts</h3>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1 flex-1">
            {recentExpenses.length === 0 ? (
              <p className="text-xs font-semibold text-slate-500 text-center py-8">No recent expenses logged</p>
            ) : (
              recentExpenses.map((exp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-900 hover:border-rose-500/20 transition-all">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{exp.description || exp.category}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{exp.date}</span>
                  </div>
                  <span className="text-xs font-black text-rose-500 bg-rose-500/5 px-2.5 py-1 rounded-xl">
                    -{formatCurrency(exp.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Terminal Invoices Table */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><FileText size={16} /></div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Terminal Invoices</h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60">
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-3 pl-2">Invoice</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-3">Customer</th>
                  <th className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-3 text-right pr-2">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-xs font-semibold text-slate-500 text-center py-8">No recent bills found</td>
                  </tr>
                ) : (
                  recentSales.map((sale, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-950/40 transition">
                      <td className="text-xs font-bold text-slate-500 dark:text-slate-400 py-3 pl-2">{sale.invoiceNo || `INV-${1000 + idx}`}</td>
                      <td className="text-xs font-black text-slate-800 dark:text-slate-200 py-3">{getSaleCustomer ? getSaleCustomer(sale) : (sale.customer || 'Walk-in Customer')}</td>
                      <td className="text-xs font-black text-emerald-500 text-right py-3 pr-2">
                        <span className="bg-emerald-500/5 px-2.5 py-1 rounded-xl inline-flex items-center gap-1 group-hover:bg-emerald-500/10">
                          {formatCurrency(getSaleTotal ? getSaleTotal(sale) : (sale.netTotal || 0))}
                          <ArrowUpRight size={12} className="opacity-60" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

export default Dashboard;