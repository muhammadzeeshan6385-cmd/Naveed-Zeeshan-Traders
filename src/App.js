import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { LogOut, Sun, Moon, Search, RotateCcw, Menu, X } from 'lucide-react';
import Login from './Login';
import ProductReturnManager from './ProductReturnManager'; 
import Products from './Products';
import Purchase from './Purchase';
import Sales from './Sales';
import SalesReturnManager from './components/SalesReturnManager';
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

// Firebase imports aur database reference link
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

function App() {
  const [currentUser, setCurrentUser] = useLocalStorage(STORAGE_KEYS.currentUser, null);

  // --- Auto Logout & Hard Expiry Layer Start ---
  const logoutTimer = useRef();
  const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    removeFromStorage(STORAGE_KEYS.currentUser);
    
    // Clear custom login session keys safely
    localStorage.removeItem('login_session_expiry');
    localStorage.removeItem('user_session_active');
    
    window.location.reload();
  }, [setCurrentUser]);

  // 1. Hard absolute timestamp verification on app load/refresh
  useEffect(() => {
    if (!currentUser) return;
    
    const sessionExpiry = localStorage.getItem('login_session_expiry');
    if (sessionExpiry && Date.now() > Number(sessionExpiry)) {
      handleLogout();
    }
  }, [currentUser, handleLogout]);

  // 2. Inactivity tracking engine
  const resetTimer = useCallback(() => {
    clearTimeout(logoutTimer.current);
    
    // Secondary safety check during active intervals
    const sessionExpiry = localStorage.getItem('login_session_expiry');
    if (sessionExpiry && Date.now() > Number(sessionExpiry)) {
      handleLogout();
      return;
    }

    logoutTimer.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_LIMIT);
  }, [handleLogout, INACTIVITY_LIMIT]);

  useEffect(() => {
    if (!currentUser) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    
    return () => {
      clearTimeout(logoutTimer.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser, resetTimer]);
  // --- Auto Logout & Hard Expiry Layer End ---

  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [activeTab, setActiveTab] = useLocalStorage('nzt_activeTab', 'Dashboard');
  const [settings] = useLocalStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [selectedReport, setSelectedReport] = useState(null);

  // Responsive Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // States ko LocalStorage se normal React state mein convert kiya taake Firebase handle kare
  const [products, setProductsState] = useState([]);
  const [customers, setCustomersState] = useState([]);
  const [suppliers, setSuppliersState] = useState([]);
  const [purchases, setPurchasesState] = useState([]);
  const [sales, setSalesState] = useState([]);
  const [payments, setPaymentsState] = useState([]);
  const [expenses, setExpensesState] = useState([]);
  const [cashData, setCashDataState] = useState([]);

  // Firebase Real-time Synchronization Listener (onSnapshot)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribers = [
      onSnapshot(collection(db, "products"), (snapshot) => {
        setProductsState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }),
      onSnapshot(collection(db, "customers"), (snapshot) => {
        setCustomersState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }),
      onSnapshot(collection(db, "suppliers"), (snapshot) => {
        setSuppliersState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }),
      onSnapshot(collection(db, "purchases"), (snapshot) => {
        setPurchasesState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }),
      onSnapshot(collection(db, "sales"), (snapshot) => {
        setSalesState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }),
      onSnapshot(collection(db, "payments"), (snapshot) => {
        setPaymentsState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }),
      onSnapshot(collection(db, "expenses"), (snapshot) => {
        setExpensesState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }),
      onSnapshot(collection(db, "cashData"), (snapshot) => {
        setCashDataState(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      })
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [currentUser]);

  // Cloud Database mein real-time entry aur edit save karne ke wrappers
  const setProducts = async (updatedData) => {
    if (Array.isArray(updatedData)) {
      for (const item of updatedData) {
        if (item.id) await setDoc(doc(db, "products", String(item.id)), item, { merge: true });
      }
    } else if (updatedData && updatedData.id) {
      await setDoc(doc(db, "products", String(updatedData.id)), updatedData, { merge: true });
    }
  };

  const setCustomers = async (updatedData) => {
    if (Array.isArray(updatedData)) {
      for (const item of updatedData) {
        if (item.id) await setDoc(doc(db, "customers", String(item.id)), item, { merge: true });
      }
    } else if (updatedData && updatedData.id) {
      await setDoc(doc(db, "customers", String(updatedData.id)), updatedData, { merge: true });
    }
  };

  const setSuppliers = async (updatedData) => {
    if (Array.isArray(updatedData)) {
      for (const item of updatedData) {
        if (item.id) await setDoc(doc(db, "suppliers", String(item.id)), item, { merge: true });
      }
    }
  };

  const setPurchases = async (updatedData) => {
    if (Array.isArray(updatedData)) {
      for (const item of updatedData) {
        if (item.id) await setDoc(doc(db, "purchases", String(item.id)), item, { merge: true });
      }
    }
  };

  const setSales = async (updatedData) => {
    if (Array.isArray(updatedData)) {
      for (const item of updatedData) {
        if (item.id) await setDoc(doc(db, "sales", String(item.id)), item, { merge: true });
      }
    }
  };

  const setPayments = async (updatedData) => {
    if (Array.isArray(updatedData)) {
      for (const item of updatedData) {
        if (item.id) await setDoc(doc(db, "payments", String(item.id)), item, { merge: true });
      }
    }
  };

  const setExpenses = async (updatedData) => {
    if (Array.isArray(updatedData)) {
      for (const item of updatedData) {
        if (item.id) await setDoc(doc(db, "expenses", String(item.id)), item, { merge: true });
      }
    }
  };

  const setCashData = async (updatedData) => {
    if (Array.isArray(updatedData)) {
      for (const item of updatedData) {
        if (item.id) await setDoc(doc(db, "cashData", String(item.id)), item, { merge: true });
      }
    }
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    let totalSale = 0;
    let totalCost = 0;
    let todaySales = 0;
    let totalReturnAmount = 0; 

    sales.forEach(s => {
      const net = Number(s.netTotal || 0);
      totalSale += net;
      
      if (s.refundAmount || s.returnAmount) {
        totalReturnAmount += Number(s.refundAmount || s.returnAmount || 0);
      }
      
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
    
    let totalOutstandingFromLedger = 0;
    customers.forEach(cust => {
      const openingBal = Number(cust.openingBalance || 0);
      const customerSales = sales
        .filter(s => String(s.customer || '').trim().toLowerCase() === String(cust.name || '').trim().toLowerCase())
        .reduce((sum, s) => sum + Number(s.netTotal || 0), 0);
        
      const customerPayments = payments
        .filter(p => String(p.customer || '').trim().toLowerCase() === String(cust.name || '').trim().toLowerCase())
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
        
      totalOutstandingFromLedger += (openingBal + customerSales - customerPayments);
    });

    let netProfit = totalSale - totalCost - totalExpense;

    return { 
      totalSale, 
      todaySales, 
      totalExpense, 
      profit: netProfit, 
      totalRecovery, 
      outstanding: totalOutstandingFromLedger,
      productReturn: totalReturnAmount 
    };
  }, [JSON.stringify(sales), expenses, payments, products, customers]);

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

  // Mobile check ke liye automatic side bar closed ho jaye initial load par
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  if (!currentUser) return <Login onLogin={setCurrentUser} companyName={settings.companyName || "Naveed & Zeeshan Traders"} />;

  // User role variable block checks ko evaluate karne ke liye
  const userRole = currentUser?.role || 'operator';

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
      case 'Products': return <Products title="Stock Items" products={products} setProducts={setProducts} userRole={userRole} />;
      case 'Inventory': return <InventorySummary title="Inventory Logs" products={products} getStock={getStock} sales={sales} userRole={userRole} />;
      case 'Customers': return <CustomerForm title="Client Directory" customers={customers} setCustomers={setCustomers} sales={sales} payments={payments} userRole={userRole} />;
      
      case 'Suppliers': 
        return (
          <Suppliers 
            title="Vendors" 
            suppliers={suppliers} 
            setSuppliers={setSuppliers} 
            purchases={purchases} 
            payments={payments} 
            userRole={userRole}
            onSavePayment={async (newPayment) => {
              try {
                const newDocRef = doc(collection(db, "payments"));
                await setDoc(newDocRef, {
                  id: newDocRef.id,
                  ...newPayment
                });
              } catch (error) {
                console.error("Firebase Payment Save Error: ", error);
                window.alert("Database me payment save nahi ho saki.");
              }
            }}
          />
        );

      case 'Purchases': return <Purchase title="Procurement" purchases={purchases} setPurchases={setPurchases} suppliers={suppliers} products={products} userRole={userRole} />;
      case 'Sales': return <Sales title="Sales Terminal" sales={sales || []} setSales={setSales} products={products} customers={customers} cashData={cashData} setCashData={setCashData} getStock={getStock} userRole={userRole} />;
      case 'SearchBill': return <SearchBill title="Search Bills" sales={sales || []} userRole={userRole} />;
      case 'ProductReturn': 
        return (
          <ProductReturnManager 
            sales={sales || []} 
            userRole={userRole}
            onReturnSuccess={(updatedBill) => {
              const originalBill = sales.find(s => s.id === updatedBill.id || s.invoiceNo === updatedBill.invoiceNo);
              let calculatedRefund = 0;

              if (originalBill) {
                const oldTotal = Number(originalBill.netTotal || 0);
                const newTotal = Number(updatedBill.netTotal || 0);
                if (oldTotal > newTotal) {
                  calculatedRefund = oldTotal - newTotal;
                }
              }
              
              if (originalBill && originalBill.items && updatedBill.items) {
                const updatedQtyMap = {};
                updatedBill.items.forEach(item => {
                  const itemId = item.productId || item.id;
                  updatedQtyMap[itemId] = Number(item.qty || 0);
                });

                const refreshedProducts = products.map(p => {
                  const invoiceItem = originalBill.items.find(i => (i.productId === p.id || i.id === p.id || i.name === p.name));
                  if (invoiceItem) {
                    const originalQty = Number(invoiceItem.qty || 0);
                    const currentNewQty = updatedQtyMap[invoiceItem.productId || invoiceItem.id] ?? 0;
                    const returnedQuantity = originalQty - currentNewQty;

                    if (returnedQuantity > 0) {
                      return {
                        ...p,
                        stock: Number(p.stock || 0) + returnedQuantity
                      };
                    }
                  }
                  return p;
                });
                setProducts(refreshedProducts);
              }

              const refreshedSales = sales.map(s => {
                if (s.id === updatedBill.id || s.invoiceNo === updatedBill.invoiceNo) {
                  return { 
                    ...s, 
                    ...updatedBill, 
                    refundAmount: (Number(s.refundAmount || 0) + calculatedRefund) 
                  };
                }
                return s;
              });
              setSales([...refreshedSales]);
            }} 
          />
        );
      case 'Recovery': return <Recovery title="Payment Recovery" payments={payments} setPayments={setPayments} customers={customers} sales={sales} cashData={cashData} setCashData={setCashData} userRole={userRole} />;
      case 'Khata': return <KhataLedger title="Account Ledger" customers={customers} sales={sales} payments={payments} userRole={userRole} />;
      case 'Expenses': return <Expenses title="Business Expenses" expenses={expenses} setExpenses={setExpenses} cashData={cashData} setCashData={setCashData} currentRole="admin" />;
      case 'Cash/Bank': return <CashBank title="Finance Hub" cashData={cashData} setCashData={setCashData} userRole={userRole} />;
      case 'Reports': return <Reports selectedReport={selectedReport} sales={sales} expenses={expenses} payments={payments} cashData={cashData} purchases={purchases} products={products} customers={customers} userRole={userRole} />;
      case 'Settings': return <Settings title="System Settings" products={products} setProducts={setProducts} userRole={userRole} />;
      default: return <Dashboard stats={stats} sales={sales} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      <div className="flex min-h-screen relative">
        {/* Responsive Sidebar Layout classes update */}
        <aside className={`fixed md:sticky top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 p-5 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}>
          <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0">
                <Logo className="w-full h-full object-contain" />
              </div>
              <div className="overflow-hidden">
                <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {settings.companyName && settings.companyName !== "Naveed Zeeshan Traders" ? settings.companyName : "Naveed & Zeeshan Traders"}
                </h2>
              </div>
            </div>
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="md:hidden p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
            >
              <X size={20} />
            </button>
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
                        {['Sales', 'Expense', 'Recovery', 'Purchase', 'Profit & Loss', 'Stock Inventory'].map((rep) => (
                          <button
                            key={rep}
                            onClick={() => {
                              let reportKey = rep.toLowerCase();
                              if (reportKey.includes('profit')) reportKey = 'profit_loss';
                              if (reportKey.includes('stock') || reportKey.includes('inventory')) reportKey = 'inventory';
                              
                              setSelectedReport(reportKey);
                              setActiveTab('Reports');
                              if (window.innerWidth < 768) setIsSidebarOpen(false); // Mobile automatic close
                            }}
                            className="block w-full text-left px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
                          >
                            {rep.includes('Report') ? rep : `${rep} Report`}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false); // Mobile automatic close
                    }}
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
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('SearchBill');
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
                        activeTab === 'SearchBill'
                          ? 'bg-emerald-600 text-white shadow-lg'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Search size={18} /> Search Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('ProductReturn');
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
                        activeTab === 'ProductReturn'
                          ? 'bg-emerald-600 text-white shadow-lg'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <RotateCcw size={18} /> Product Return
                    </button>
                  </>
                )}
              </React.Fragment>
            ))}
          </nav>
        </aside>

        {/* Mobile Sidebar overlay */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
          />
        )}

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-950">
            <div className="flex items-center gap-3">
              {/* Toggle Menu Button Left Side Top */}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Menu size={20} />
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentUser?.username}</p>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
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
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{renderModule()}</main>
        </div>
      </div>
    </div>
  );
}

export default App;