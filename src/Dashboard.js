import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  DollarSign, 
  BookOpen, 
  TrendingUp, 
  FileText, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown, 
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import SalesReturnManager from './components/SalesReturnManager';

export default function Dashboard({ products = [], customers = [], sales = [], expenses = [], recoveries = [], fetchAllData }) {
  // UI & Theme States
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('sales-report');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);

  // Financial Dashboard Core Logic Calculations
  const metrics = useMemo(() => {
    const totalSales = sales.reduce((sum, item) => sum + (item.netAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalRecoveries = recoveries.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    // Dynamic Cash In Hand Formula: Total Recovery + Cash Invoice - Total Exp = Cash in Hand
    const cashInvoicesSum = sales.filter(s => s.paymentType === 'Cash').reduce((sum, item) => sum + (item.netAmount || 0), 0);
    const cashInHand = totalRecoveries + cashInvoicesSum - totalExpenses;

    return {
      totalSales,
      totalExpenses,
      totalRecoveries,
      cashInHand
    };
  }, [sales, expenses, recoveries]);

  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'bg-[#0b1329] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* GLOBAL HEADER BAR */}
      <header className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="font-black text-sm tracking-widest text-emerald-500 uppercase">
            Naveed & Zeeshan Traders <span className="text-[10px] text-slate-400 font-normal">| Dashboard Console</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-xl border transition ${darkMode ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="flex items-center gap-2 border-l pl-4 border-slate-700 text-xs font-bold text-slate-400">
            <span>Role: Admin</span>
          </div>
          <button className="flex items-center gap-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-500/20 transition">
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      <div className="flex">
        
        {/* LEFT SIDEBAR NAVIGATION MENU */}
        <aside className={`w-64 min-h-[calc(100vh-73px)] p-4 flex flex-col gap-1 border-r ${darkMode ? 'bg-[#0f172a]/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          
          <button 
            onClick={() => setActiveTab('search-bill')}
            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'search-bill' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <Search size={15} /> Search Bill
          </button>

          <button 
            onClick={() => setActiveTab('payment-recovery')}
            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'payment-recovery' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <DollarSign size={15} /> Payment Recovery
          </button>

          <button 
            onClick={() => setActiveTab('account-ledger')}
            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'account-ledger' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <BookOpen size={15} /> Account Ledger
          </button>

          {/* NEW SALES RETURN SIDEBAR BUTTON */}
          <button 
            onClick={() => setActiveTab('sales-return')}
            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'sales-return' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <RotateCcw size={15} className={activeTab === 'sales-return' ? 'text-white' : 'text-rose-500'} /> 
            <span>Sales Return (maal wapsi)</span>
          </button>

          <button 
            onClick={() => setActiveTab('business-expenses')}
            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'business-expenses' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <TrendingUp size={15} /> Business Expenses
          </button>

          <button 
            onClick={() => setActiveTab('finance-hub')}
            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'finance-hub' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <TrendingUp size={15} /> Finance Hub
          </button>

          {/* COLLAPSIBLE ANALYTICS DROPDOWN SUB-MENU */}
          <div className="mt-1">
            <button 
              onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800/50 transition"
            >
              <div className="flex items-center gap-2.5">
                <FileText size={15} /> <span>Analytics Report</span>
              </div>
              {isAnalyticsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {isAnalyticsOpen && (
              <div className="pl-6 flex flex-col gap-1 mt-1 border-l border-slate-800 ml-6">
                <button 
                  onClick={() => setActiveTab('sales-report')}
                  className={`w-full text-left py-2 px-3 text-xs font-bold rounded-lg transition ${activeTab === 'sales-report' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Sales Report
                </button>
                <button 
                  onClick={() => setActiveTab('expense-report')}
                  className={`w-full text-left py-2 px-3 text-xs font-bold rounded-lg transition ${activeTab === 'expense-report' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Expense Report
                </button>
                <button 
                  onClick={() => setActiveTab('recovery-report')}
                  className={`w-full text-left py-2 px-3 text-xs font-bold rounded-lg transition ${activeTab === 'recovery-report' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Recovery Report
                </button>
                <button 
                  onClick={() => setActiveTab('purchase-report')}
                  className={`w-full text-left py-2 px-3 text-xs font-bold rounded-lg transition ${activeTab === 'purchase-report' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Purchase Report
                </button>
                <button 
                  onClick={() => setActiveTab('profit-loss-report')}
                  className={`w-full text-left py-2 px-3 text-xs font-bold rounded-lg transition ${activeTab === 'profit-loss-report' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Profit & Loss Report
                </button>
                <button 
                  onClick={() => setActiveTab('stock-inventory-report')}
                  className={`w-full text-left py-2 px-3 text-xs font-bold rounded-lg transition ${activeTab === 'stock-inventory-report' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Stock Inventory Report
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setActiveTab('system-settings')}
            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-xs font-bold transition mt-auto ${activeTab === 'system-settings' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <Settings size={15} /> System Settings
          </button>
        </aside>

        {/* RIGHT MAIN VIEW CONSOLE PANEL */}
        <main className="flex-1 p-6 overflow-y-auto">

          {/* DYNAMIC RENDER: SALES RETURN FEATURE CONTAINER */}
          {activeTab === 'sales-return' && (
            <SalesReturnManager 
              products={products} 
              customers={customers} 
              onReturnComplete={fetchAllData}
            />
          )}

          {/* DYNAMIC RENDER: SEARCH BILL TAB */}
          {activeTab === 'search-bill' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2">Search Invoice / Bill Logs</h2>
              <p className="text-xs text-slate-400">Pichle invoices ka record search aur thermal print karne ka component area.</p>
            </div>
          )}

          {/* DYNAMIC RENDER: PAYMENT RECOVERY TAB */}
          {activeTab === 'payment-recovery' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2">Payment Recovery Module</h2>
              <p className="text-xs text-slate-400">Customers se recovery ka cash enter kar ke accounts adjust karne ka panel.</p>
            </div>
          )}

          {/* DYNAMIC RENDER: ACCOUNT LEDGER TAB */}
          {activeTab === 'account-ledger' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2">Customer & Party Khata Ledgers</h2>
              <p className="text-xs text-slate-400">Naveed & Zeeshan Traders ke wholesale customers ke total balance sheets.</p>
            </div>
          )}

          {/* DYNAMIC RENDER: BUSINESS EXPENSES TAB */}
          {activeTab === 'business-expenses' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2">Daily Business Expenses Log</h2>
              <p className="text-xs text-slate-400">Dukan aur wholesale logistics ke kharche record karne ka component framework.</p>
            </div>
          )}

          {/* DYNAMIC RENDER: FINANCE HUB TAB */}
          {activeTab === 'finance-hub' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-4">Finance Hub Console</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">Cash In Hand</span>
                  <div className="text-xl font-black text-emerald-400">Rs. {metrics.cashInHand}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">Total Recovery Summary</span>
                  <div className="text-xl font-black text-slate-200">Rs. {metrics.totalRecoveries}</div>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC RENDER: ANALYTICS REPORTS (SALES DEFAULT PREVIEW) */}
          {activeTab === 'sales-report' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2">Live Sales Analysis Report</h2>
              <p className="text-xs text-slate-400 mb-4">Total Business volume: <span className="text-emerald-400 font-bold">Rs. {metrics.totalSales}</span></p>
              <div className="text-xs text-slate-500 italic p-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                Please select an analytics category from the left menu sidebar to review or extract records.
              </div>
            </div>
          )}

          {activeTab === 'expense-report' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2 text-slate-300">EXPENSE REPORT</h2>
              <p className="text-xs text-slate-500">Selected reporting node criteria will calculate and pull live records directly on the sheet.</p>
            </div>
          )}

          {activeTab === 'recovery-report' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2 text-slate-300">RECOVERY REPORT</h2>
              <p className="text-xs text-slate-500">Selected reporting node criteria will calculate and pull live records directly on the sheet.</p>
            </div>
          )}

          {activeTab === 'purchase-report' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2 text-slate-300">PURCHASE REPORT</h2>
              <p className="text-xs text-slate-500">Selected reporting node criteria will calculate and pull live records directly on the sheet.</p>
            </div>
          )}

          {activeTab === 'profit-loss-report' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2 text-slate-300">PROFIT & LOSS REPORT</h2>
              <p className="text-xs text-slate-500">Selected reporting node criteria will calculate and pull live records directly on the sheet.</p>
            </div>
          )}

          {activeTab === 'stock-inventory-report' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2 text-slate-300">STOCK INVENTORY REPORT</h2>
              <p className="text-xs text-slate-500">Selected reporting node criteria will calculate and pull live records directly on the sheet.</p>
            </div>
          )}

          {activeTab === 'system-settings' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <h2 className="text-sm font-black uppercase tracking-wider mb-2 text-slate-300">SYSTEM SETTINGS</h2>
              <p className="text-xs text-slate-500">Selected reporting node criteria will calculate and pull live records directly on the sheet.</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}