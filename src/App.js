import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { LogOut, Sun, Moon, User } from 'lucide-react'; // Imports updated
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
import { useLocalStorage } from './hooks/useLocalStorage';
import { STORAGE_KEYS, MENU_ITEMS, DEFAULT_SETTINGS, COMPANY_NAME } from './utils/constants';
import { calculateStock } from './utils/helpers';
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

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const getStock = useCallback((productName) => calculateStock(productName, purchases, sales), [purchases, sales]);
  const visibleMenu = useMemo(() => MENU_ITEMS.filter((item) => !currentUser?.role || item.roles.includes(currentUser.role)), [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    removeFromStorage(STORAGE_KEYS.currentUser);
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} companyName={settings.companyName || COMPANY_NAME} />;

  const renderModule = () => {
    switch (activeTab) {
      case 'Dashboard': return <Dashboard sales={sales} expenses={expenses} payments={payments} customers={customers} purchases={purchases} getStock={getStock} products={products} />;
      case 'Products': return <Products products={products} setProducts={setProducts} />;
      case 'Inventory': return <InventorySummary products={products} getStock={getStock} />;
      case 'Customers': return <CustomerForm customers={customers} setCustomers={setCustomers} sales={sales} payments={payments} />;
      case 'Suppliers': return <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} purchases={purchases} />;
      case 'Purchases': return <Purchase purchases={purchases} setPurchases={setPurchases} suppliers={suppliers} products={products} cashData={cashData} setCashData={setCashData} />;
      case 'Sales': return <Sales sales={sales} setSales={setSales} products={products} customers={customers} getStock={getStock} cashData={cashData} setCashData={setCashData} currentUser={currentUser} />;
      case 'Recovery': return <Recovery payments={payments} setPayments={setPayments} customers={customers} cashData={cashData} setCashData={setCashData} sales={sales} />;
      case 'Khata': return <KhataLedger customers={customers} sales={sales} payments={payments} />;
      case 'Expenses': return <Expenses expenses={expenses} setExpenses={setExpenses} cashData={cashData} setCashData={setCashData} />;
      case 'Cash/Bank': return <CashBank cashData={cashData} setCashData={setCashData} />;
      case 'Reports': return <Reports sales={sales} expenses={expenses} payments={payments} cashData={cashData} products={products} purchases={purchases} customers={customers} />;
      case 'Settings': return <Settings products={products} customers={customers} suppliers={suppliers} purchases={purchases} sales={sales} payments={payments} expenses={expenses} cashData={cashData} setProducts={setProducts} setCustomers={setCustomers} setSuppliers={setSuppliers} setPurchases={setPurchases} setSales={setSales} setPayments={setPayments} setExpenses={setExpenses} setCashData={setCashData} />;
      default: return <Dashboard sales={sales} expenses={expenses} payments={payments} customers={customers} purchases={purchases} getStock={getStock} products={products} />;
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
                <p className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Distributor ERP</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {visibleMenu.map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white dark:bg-slate-950">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentUser.username} | {currentUser.role}</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
              
              {/* Professional Logout Icon Combined */}
              <button onClick={handleLogout} className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-2 rounded-lg transition text-sm font-semibold">
                <div className="relative flex items-center">
                  <User size={18} />
                  <LogOut size={12} className="absolute -right-1 -bottom-1 bg-white dark:bg-slate-950 rounded-full" />
                </div>
                Logout
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 text-slate-900 dark:text-slate-100">{renderModule()}</main>
        </div>
      </div>
    </div>
  );
}

export default App;