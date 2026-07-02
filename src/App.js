import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { LogOut, Sun, Moon, User, Search } from 'lucide-react';
import Login from './Login';
import Products from './Products';
import Purchase from './Purchase';
import Sales from './Sales';
import InventorySummary from './InventorySummary';
import KhataLedger from './KhataLedger';
import Suppliers from './Suppliers';
import Expenses from './Expenses';
import CashBank from './CashBank';
import Recovery from './Recovery';
import Reports from './Reports';
import CustomerForm from './components/CustomerForm';
import Dashboard from './Dashboard';
import Settings from './Settings';
import SearchBill from './SearchBill';
import { useLocalStorage } from './hooks/useLocalStorage';
import { STORAGE_KEYS, MENU_ITEMS, DEFAULT_SETTINGS, COMPANY_NAME } from './utils/constants';
import { removeFromStorage } from './utils/storage';
import { Logo } from './components/ui';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [currentUser, setCurrentUser] = useLocalStorage(STORAGE_KEYS.currentUser, null);
  const [activeTab, setActiveTab] = useLocalStorage('nzt_activeTab', 'Dashboard');
  const [settings] = useLocalStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  
  const [products, setProducts] = useLocalStorage(STORAGE_KEYS.products, []);
  const [customers, setCustomers] = useLocalStorage(STORAGE_KEYS.customers, []);
  const [suppliers, setSuppliers] = useLocalStorage(STORAGE_KEYS.suppliers, []);
  const [purchases, setPurchases] = useLocalStorage(STORAGE_KEYS.purchases, []);
  const [sales, setSales] = useLocalStorage(STORAGE_KEYS.sales, []);
  const [payments, setPayments] = useLocalStorage(STORAGE_KEYS.payments, []);
  const [expenses, setExpenses] = useLocalStorage(STORAGE_KEYS.expenses, []);
  const [cashData, setCashData] = useLocalStorage(STORAGE_KEYS.cashData, []);

  const stats = useMemo(() => {
    const totalSale = sales.reduce((sum, s) => sum + Number(s.netTotal || 0), 0);
    const totalSalesProfit = sales.reduce((sum, s) => sum + Number(s.netProfit || 0), 0);
    const todaySales = sales
      .filter(s => new Date(s.date).toLocaleDateString() === new Date().toLocaleDateString())
      .reduce((sum, s) => sum + Number(s.netTotal || 0), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalRecovery = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const netProfit = totalSalesProfit - totalExpense;
    return { totalSale, todaySales, totalExpense, profit: netProfit, totalRecovery, outstanding: totalSale - totalRecovery };
  }, [sales, expenses, payments]);

  // UPDATED: Robust stock calculation with sanitization
  const getStock = useCallback((productName) => {
    const target = String(productName || '').trim().toLowerCase();
    
    // Debugging: check karein ke purchases mein kya data hai
    console.log("Looking for:", target);
    console.log("Purchases data:", purchases);

    const totalPurchased = purchases
      .filter(p => String(p.name || p.productName || '').trim().toLowerCase() === target)
      .reduce((sum, p) => sum + Number(p.qty || 0), 0);
      
    console.log("Total Purchased found:", totalPurchased);

    const totalSold = sales
      .flatMap(s => s.items || [])
      .filter(i => String(i.name || '').trim().toLowerCase() === target)
      .reduce((sum, i) => sum + Number(i.qty || 0), 0);
    
    console.log("Total Sold found:", totalSold);
      
    return Math.max(0, totalPurchased - totalSold);
  }, [purchases, sales]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleLogout = () => {
    setCurrentUser(null);
    removeFromStorage(STORAGE_KEYS.currentUser);
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} companyName={settings.companyName || COMPANY_NAME} />;

  const renderModule = () => {
    switch (activeTab) {
      case 'Dashboard': return <Dashboard stats={stats} recentExpenses={expenses.slice(-5).reverse()} recentSales={sales.slice(-5).reverse()} getSaleCustomer={(s) => s.customer} getSaleTotal={(s) => s.netTotal} />;
      case 'Products': return <Products products={products} setProducts={setProducts} />;
      case 'Inventory': return <InventorySummary products={products} getStock={getStock} sales={sales} />;
      case 'Customers': return <CustomerForm customers={customers} setCustomers={setCustomers} sales={sales} payments={payments} />;
      case 'Suppliers': return <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} purchases={purchases} />;
      case 'Purchases': return <Purchase purchases={purchases} setPurchases={setPurchases} suppliers={suppliers} products={products} setProducts={setProducts} cashData={cashData} setCashData={setCashData} />;
      case 'Sales': return <Sales sales={sales} setSales={setSales} products={products} customers={customers} getStock={getStock} cashData={cashData} setCashData={setCashData} currentUser={currentUser} />;
      case 'SearchBill': return <SearchBill sales={sales} />;
      case 'Recovery': return <Recovery payments={payments} setPayments={setPayments} customers={customers} cashData={cashData} setCashData={setCashData} sales={sales} />;
      case 'Khata': return <KhataLedger customers={customers} sales={sales} payments={payments} />;
      case 'Expenses': return <Expenses expenses={expenses} setExpenses={setExpenses} cashData={cashData} setCashData={setCashData} />;
      case 'Cash/Bank': return <CashBank cashData={cashData} setCashData={setCashData} />;
      case 'Reports': return <Reports sales={sales} expenses={expenses} payments={payments} cashData={cashData} products={products} purchases={purchases} customers={customers} />;
      case 'Settings': return <Settings products={products} customers={customers} suppliers={suppliers} purchases={purchases} sales={sales} payments={payments} expenses={expenses} cashData={cashData} setProducts={setProducts} setCustomers={setCustomers} setSuppliers={setSuppliers} setPurchases={setPurchases} setSales={setSales} setPayments={setPayments} setExpenses={setExpenses} setCashData={setCashData} />;
      default: return <Dashboard stats={stats} recentExpenses={expenses.slice(-5).reverse()} recentSales={sales.slice(-5).reverse()} getSaleCustomer={(s) => s.customer} getSaleTotal={(s) => s.netTotal} />;
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
                <button type="button" onClick={() => setActiveTab(item.id)} className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>{item.label}</button>
                {item.id === 'Sales' && (<button type="button" onClick={() => setActiveTab('SearchBill')} className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${activeTab === 'SearchBill' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><div className="flex items-center gap-2"><Search size={16}/> Search Bills</div></button>)}
              </React.Fragment>
            ))}
          </nav>
        </aside>
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white dark:bg-slate-950">
            {/* Username Element */}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentUser.username}</p>
            {/* Right Side: Toggle + Logout (Grouped) */}
            <div className="flex items-center gap-6">
             <button
               onClick={() => setIsDarkMode(!isDarkMode)}
               className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
             >
               {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {/* Logout Button */}
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