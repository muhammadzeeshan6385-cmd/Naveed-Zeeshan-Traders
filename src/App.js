import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { LogOut, Sun, Moon, Search } from 'lucide-react';
import Login from './Login';
import StockItems from './StockItems';
import Procurement from './Procurement';
import SalesTerminal from './SalesTerminal';
import InventoryLogs from './InventoryLogs';
import AccountLedger from './AccountLedger';
import Vendors from './Vendors';
import BusinessExpenses from './BusinessExpenses';
import FinanceHub from './FinanceHub';
import PaymentRecovery from './PaymentRecovery';
import AnalyticsReports from './AnalyticsReports';
import CustomerInfo from './components/CustomerInfo';
import Overview from './Overview';
import Settings from './Settings';
import SearchBill from './SearchBill';
import { useLocalStorage } from './hooks/useLocalStorage';
import { STORAGE_KEYS, MENU_ITEMS, DEFAULT_SETTINGS, COMPANY_NAME } from './utils/constants';
import { removeFromStorage } from './utils/storage';
import { Logo } from './components/ui';

function App() {
  // --- Auto Logout Start ---
  const logoutTimer = useRef();
  const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    removeFromStorage(STORAGE_KEYS.currentUser);
    window.location.reload();
  }, []);

  const resetTimer = useCallback(() => {
    clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_LIMIT);
  }, [handleLogout]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => events.forEach(event => window.removeEventListener(event, resetTimer));
  }, [resetTimer]);
  // --- Auto Logout End ---

  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [currentUser, setCurrentUser] = useLocalStorage(STORAGE_KEYS.currentUser, null);
  const [activeTab, setActiveTab] = useLocalStorage('nzt_activeTab', 'Dashboard');
  const [settings] = useLocalStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [selectedReport, setSelectedReport] = useState(null);
  const [products, setProducts] = useLocalStorage(STORAGE_KEYS.products, []);
  const [customers, setCustomers] = useLocalStorage(STORAGE_KEYS.customers, []);
  const [suppliers, setSuppliers] = useLocalStorage(STORAGE_KEYS.suppliers, []);
  const [purchases, setPurchases] = useLocalStorage(STORAGE_KEYS.purchases, []);
  const [ProfitLoss, setProfiLoss] = useLocalStorage(STORAGE_KEYS.profitLoss, []);
  const [sales, setSales] = useLocalStorage(STORAGE_KEYS.sales, []);
  const [payments, setPayments] = useLocalStorage(STORAGE_KEYS.payments, []);
  const [expenses, setExpenses] = useLocalStorage(STORAGE_KEYS.expenses, []);
  const [cashData, setCashData] = useLocalStorage(STORAGE_KEYS.cashData, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    let totalSale = 0;
    let totalCost = 0;
    let todaySales = 0;

    sales.forEach(s => {
      const net = Number(s.netTotal || 0);
      totalSale += net;
      
      if (s.date && s.date.includes(today)) {
        todaySales += net;
      }

      if (s.items && Array.isArray(s.items)) {
        s.items.forEach(item => {
          const originalProduct = products.find(p => p.id === item.productId || p.name === item.name);
          const purchaseRate = originalProduct ? Number(originalProduct.purchaseRate || 0) : Number(item.purchaseRate || 0);
          const saleRate = Number(item.rate || 0);
          
          if (saleRate > 0 && purchaseRate > 0) {
            const costRatio = purchaseRate / saleRate;
            totalCost += (Number(item.total || 0) * costRatio);
          } else {
            totalCost += (purchaseRate * Number(item.qty || 0));
          }
        });
      }
    });

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalRecovery = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    let netProfit = totalSale - totalCost - totalExpense;

    return { 
      totalSale, 
      todaySales, 
      totalExpense, 
      profit: netProfit, 
      totalRecovery, 
      outstanding: totalSale - totalRecovery 
    };
  }, [sales, expenses, payments, products]);

  const getStock = useCallback((productName) => {
    const target = String(productName || '').trim().toLowerCase();
    const totalPurchased = purchases
      .filter(p => String(p.product || '').trim().toLowerCase() === target)
      .reduce((sum, p) => sum + Number(p.qty || 0), 0);
    const totalSold = sales
      .flatMap(s => s.items || [])
      .filter(i => String(i.name || i.productName || '').trim().toLowerCase() === target)
      .reduce((sum, i) => sum + Number(i.qty || 0), 0);
    return Math.max(0, totalPurchased - totalSold);
  }, [purchases, sales]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  if (!currentUser) return <Login onLogin={setCurrentUser} companyName={settings.companyName || COMPANY_NAME} />;

  const renderModule = () => {
    switch (activeTab) {
      case 'Dashboard': 
        return (
          <Dashboard 
            stats={stats} 
            recentExpenses={expenses.slice(-5)} 
            recentSales={sales.slice(-5)} 
            getSaleCustomer={(s) => s.customer} 
            getSaleTotal={(s) => s.netTotal} 
            sales={sales} 
          />
        );
      case 'Products': return <Products title="Stock Items" products={products} setProducts={setProducts} />;
      case 'Inventory': return <InventorySummary title="Inventory Logs" products={products} getStock={getStock} sales={sales} />;
      case 'Customers': return <CustomerForm title="Client Directory" customers={customers} setCustomers={setCustomers} sales={sales} payments={payments} />;
      case 'Suppliers': return <Suppliers title="Vendors" suppliers={suppliers} setSuppliers={setSuppliers} />;
      case 'Purchases': return <Purchase title="Procurement" purchases={purchases} setPurchases={setPurchases} suppliers={suppliers} products={products} />;
      case 'Sales': return <Sales title="Sales Terminal" sales={sales || []} setSales={setSales} products={products} customers={customers} cashData={cashData} setCashData={setCashData} getStock={getStock} />;
      case 'SearchBill': return <SearchBill title="Search Bills" sales={sales || []} />;
      case 'Recovery': return <Recovery title="Payment Recovery" payments={payments} setPayments={setPayments} customers={customers} sales={sales} cashData={cashData} setCashData={setCashData} />;
      case 'Khata': return <KhataLedger title="Account Ledger" customers={customers} sales={sales} payments={payments} />;
      case 'Expenses': return <Expenses title="Business Expenses" expenses={expenses} setExpenses={setExpenses} cashData={cashData} setCashData={setCashData} />;
      case 'Cash/Bank': return <CashBank title="Finance Hub" cashData={cashData} setCashData={setCashData} />;
      case 'Reports': return <Reports selectedReport={selectedReport} sales={sales} expenses={expenses} payments={payments} cashData={cashData} purchases={purchases} products={products} customers={customers} />;
      case 'Settings': return <Settings title="System Settings" products={products} setProducts={setProducts} />;
      default: return <Dashboard stats={stats} sales={sales} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 p-5">
          <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0"><Logo className="w-full h-full object-contain" /></div>
              <div className="overflow-hidden">
                <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">{settings.companyName || COMPANY_NAME}</h2>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {MENU_ITEMS.map((item) => (
              <React.Fragment key={item.id}>
                {item.id === 'Reports' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsReportsOpen(!isReportsOpen)}
                      className={`flex items-center justify-between gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
                        activeTab === 'Reports'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">{item.icon} {item.label}</div>
                      <span>{isReportsOpen ? '▲' : '▼'}</span>
                    </button>
                    {isReportsOpen && (
                      <div className="pl-4 space-y-1 mt-1 border-l-2 border-slate-200 dark:border-slate-800 ml-6">
                        {['Sales', 'Expense', 'Recovery', 'Purchase'].map((rep) => (
                          <button
                            key={rep}
                            onClick={() => {
                              setSelectedReport(rep);
                              setActiveTab('Reports');
                            }}
                            className="block w-full text-left px-4 py-2 text-sm font-semibold text-slate-300 hover:text-emerald-400 transition"
                          >
                            {rep} Report
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
                      activeTab === item.id
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )}
                {item.id === 'Sales' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('SearchBill')}
                    className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
                      activeTab === 'SearchBill'
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Search size={18} /> Search Bill
                  </button>
                )}
              </React.Fragment>
            ))}
          </nav>
        </aside>
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white dark:bg-slate-950">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentUser?.username}</p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={handleLogout} className="text-rose-600 text-sm flex items-center gap-2">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">{renderModule()}</main>
        </div>
      </div>
    </div>
  );
}

export default App;