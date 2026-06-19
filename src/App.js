import React, { useState, useEffect } from 'react';
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

function App() {
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("currentUser")) || null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  
  const [products, setProducts] = useState(() => JSON.parse(localStorage.getItem("products")) || []);
  const [customers, setCustomers] = useState(() => JSON.parse(localStorage.getItem("customers")) || []);
  const [suppliers, setSuppliers] = useState(() => JSON.parse(localStorage.getItem("suppliers")) || []);
  const [purchases, setPurchases] = useState(() => JSON.parse(localStorage.getItem("purchases")) || []);
  const [sales, setSales] = useState(() => JSON.parse(localStorage.getItem("sales")) || []);
  const [payments, setPayments] = useState(() => JSON.parse(localStorage.getItem("payments")) || []);
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem("expenses")) || []);
  const [cashData, setCashData] = useState(() => JSON.parse(localStorage.getItem("cashData")) || []);

  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(products));
    localStorage.setItem("customers", JSON.stringify(customers));
    localStorage.setItem("suppliers", JSON.stringify(suppliers));
    localStorage.setItem("purchases", JSON.stringify(purchases));
    localStorage.setItem("sales", JSON.stringify(sales));
    localStorage.setItem("payments", JSON.stringify(payments));
    localStorage.setItem("expenses", JSON.stringify(expenses));
    localStorage.setItem("cashData", JSON.stringify(cashData));
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
  }, [products, customers, suppliers, purchases, sales, payments, expenses, cashData, currentUser]);

  // FIX: Corrected getStock function to avoid 's is not defined' error
  const getStock = (productName) => {
    const pQty = purchases
      .filter((p) => p && p.product === productName)
      .reduce((a, b) => a + Number(b.qty || 0), 0);
    
    const sQty = sales
      .filter((sale) => sale && sale.items && sale.items.find((item) => item.name === productName))
      .reduce((a, sale) => {
        const item = sale.items.find((i) => i.name === productName);
        return a + Number(item.qty || 0);
      }, 0);
      
    return pQty - sQty;
  };

  const refreshDashboard = () => setActiveTab('Dashboard');

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  const menuItems = ['Dashboard', 'Products', 'Inventory', 'Customers', 'Suppliers', 'Purchases', 'Sales', 'Recovery', 'Khata', 'Expenses', 'Cash/Bank', 'Reports', 'Settings'];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="w-64 bg-blue-900 text-white p-6 min-h-screen">
        <h2 className="text-xl font-bold mb-6">Mughal Kiryana ERP</h2>
        {menuItems.map((item) => (
          <button 
            key={item} 
            onClick={() => setActiveTab(item)} 
            className={`block w-full text-left p-3 mb-1 rounded-lg ${activeTab === item ? 'bg-blue-600' : 'hover:bg-blue-800'}`}
          >
            {item}
          </button>
        ))}
        <button onClick={() => {setCurrentUser(null); localStorage.removeItem("currentUser");}} className="mt-10 w-full bg-red-600 p-2 rounded">Logout</button>
      </div>

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">{activeTab}</h1>
        {activeTab === 'Dashboard' && <Dashboard sales={sales} expenses={expenses} payments={payments} customers={customers} />}
        {activeTab === 'Products' && <Products products={products} setProducts={setProducts} />}
        {activeTab === 'Inventory' && <InventorySummary products={products} getStock={getStock} />}
        {activeTab === 'Customers' && <CustomerForm customers={customers} setCustomers={setCustomers} />}
        {activeTab === 'Suppliers' && <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} />}
        {activeTab === 'Purchases' && <Purchase purchases={purchases} setPurchases={setPurchases} />}
        {activeTab === 'Sales' && <Sales sales={sales} setSales={setSales} products={products} customers={customers} />}
        {activeTab === 'Recovery' && <Recovery payments={payments} setPayments={setPayments} customers={customers} cashData={cashData} setCashData={setCashData} />}
        {activeTab === 'Khata' && <KhataLedger customers={customers} sales={sales} payments={payments} />}
        {activeTab === 'Expenses' && <Expenses expenses={expenses} setExpenses={setExpenses} refreshDashboard={refreshDashboard} />}
        {activeTab === 'Cash/Bank' && <CashBank cashData={cashData} setCashData={setCashData} />}
        {activeTab === 'Reports' && <Reports sales={sales} expenses={expenses} payments={payments} cashData={cashData} products={products} />}
        {activeTab === 'Settings' && <Settings />}
      </div>
    </div>
  );
}

export default App;