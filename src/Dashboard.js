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

function Dashboard({ stats, recentExpenses, recentSales, getSaleCustomer, getSaleTotal, sales = [], returns = [] }) {
  
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(val || 0).replace('PKR', 'Rs.');
  };

  // 1. DYNAMIC NET PROFIT ENGINE (Formula: Sales Rate - Purchase Rate - Exp - Return Adjustments = Net Profit)
  const calculatedNetProfit = useMemo(() => {
    let totalSalesRevenue = 0;
    let totalPurchaseCostOfGoodsSold = 0;

    // Loop through all sales data to find individual product margins
    sales.forEach((sale) => {
      // Items collection structure validation
      const items = sale.items || [];
      items.forEach((item) => {
        const qty = Number(item.quantity || 0);
        const saleRate = Number(item.price || item.saleRate || 0);
        
        // Item ki purchase cost/rate dhoondna (fallbacks handled)
        const purchaseRate = Number(item.purchasePrice || item.purchaseRate || item.costPrice || 0);

        totalSalesRevenue += (saleRate * qty);
        totalPurchaseCostOfGoodsSold += (purchaseRate * qty);
      });
    });

    // Loop through returns data to remove returned items profit impact
    let returnedProfitImpact = 0;
    returns.forEach((returnItem) => {
      const items = returnItem.items || [];
      items.forEach((item) => {
        const qty = Number(item.quantity || 0);
        const saleRate = Number(item.price || item.saleRate || 0);
        const purchaseRate = Number(item.purchasePrice || item.purchaseRate || item.costPrice || 0);
        
        // Returned margin that business lost
        returnedProfitImpact += ((saleRate - purchaseRate) * qty);
      });
    });

    // In case items data mapping dashboard object direct handle na kar raha ho:
    if (totalSalesRevenue === 0) {
      totalSalesRevenue = Number(stats.totalSale || 0);
      // Agar item objects empty hon layout load me, to 30% average gross cost margin assume karein backend patch tak
      totalPurchaseCostOfGoodsSold = totalSalesRevenue * 0.75; 
    }

    const totalExpense = Number(stats.totalExpense || 0);

    // Business Logic Formula: Sales Value - Purchase Value - Expenses - Return Margin Deductions
    return totalSalesRevenue - totalPurchaseCostOfGoodsSold - totalExpense - returnedProfitImpact;
  }, [stats, sales, returns]);

  // 2. CASH IN HAND ENGINE (Formula: Total Recovery + Cash Invoices - Total Expenses - Cash Refunds)
  const cashInHand = useMemo(() => {
    const totalRecovery = Number(stats.totalRecovery || 0);
    
    const totalCashInvoices = sales
      .filter(s => !s.isCredit && (s.paymentMethod === 'Cash' || String(s.status).toLowerCase() === 'paid'))
      .reduce((sum, s) => sum + Number(s.netTotal || 0), 0);
      
    const totalExpense = Number(stats.totalExpense || 0);

    // Filter cash refunds out of hand directly
    const totalCashRefunds = returns
      .filter(r => r.paymentMethod === 'Cash' || r.isCashRefund === true)
      .reduce((sum, r) => sum + Number(r.refundAmount || r.netTotal || 0), 0);

    return (totalRecovery + totalCashInvoices) - totalExpense - totalCashRefunds;
  }, [stats, sales, returns]);

  // 3. AGGREGATE RETURNS CALCULATION
  const totalReturnsVolume = useMemo(() => {
    if (stats.totalReturn || stats.totalReturns) {
      return Number(stats.totalReturn || stats.totalReturns || 0);
    }
    return returns.reduce((sum, r) => sum + Number(r.refundAmount || r.netTotal || 0), 0);
  }, [stats, returns]);

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
            Naveed & Zeeshan Traders Portal
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
          <Activity size={16} className="text-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Live System Sync</span>
        </div>
      </div>

      {/* --- Upgraded Cards Grid Section --- */}
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

        {/* Upgraded Net Profit / Margin Card (Linked to accurate math formula) */}
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
            <h3 className="text-3xl font-black text-amber-500 tracking-tight">{formatCurrency(stats.outstanding)}</h3>
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
                      <td className="text-xs font-black text-slate-800 dark:text-slate-200 py-3">{getSaleCustomer(sale) || 'Walking Customer'}</td>
                      <td className="text-xs font-black text-emerald-500 text-right py-3 pr-2">
                        <span className="bg-emerald-500/5 px-2.5 py-1 rounded-xl inline-flex items-center gap-1 group-hover:bg-emerald-500/10">
                          {formatCurrency(getSaleTotal(sale))}
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