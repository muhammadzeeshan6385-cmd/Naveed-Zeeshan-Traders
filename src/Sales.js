import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Printer, 
  Save, 
  Plus, 
  User, 
  FileText, 
  Calendar, 
  CreditCard 
} from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const Sales = ({ 
  customers = [], 
  stockItems = [], 
  sales = [], 
  payments = [], 
  returns = [],
  onInvoiceSaved 
}) => {
  // --- Form States ---
  const [invoiceNo, setInvoiceNo] = useState('INV-00001');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [paymentType, setPaymentType] = useState('Credit');
  
  // --- Search & Cart States ---
  const [skuSearch, setSkuSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate Invoice Number based on sales history
  useEffect(() => {
    if (sales && sales.length > 0) {
      const nextNum = sales.length + 1;
      setInvoiceNo(`INV-${String(nextNum).padStart(5, '0')}`);
    }
  }, [sales]);

  // Selected Customer Object
  const selectedCustomerObj = useMemo(() => {
    return customers.find(c => c.name === selectedCustomerName) || null;
  }, [customers, selectedCustomerName]);

  // =========================================================
  // PREVIOUS BALANCE CALCULATION (EXACT KHATA LEDGER LOGIC)
  // =========================================================
  const previousBalance = useMemo(() => {
    if (!selectedCustomerObj) return 0;

    const cName = selectedCustomerObj.name;

    // 1. Opening Balance
    const prevBal = Math.round(
      Number(selectedCustomerObj.previousBalance || selectedCustomerObj.openingBalance || selectedCustomerObj.balance || 0)
    );

    // 2. Total Previous Credit Sales
    const totalSales = Math.round(
      sales
        .filter((s) => {
          const nameMatch = (s.customerName || s.customer || s.customer_name) === cName;
          const isCredit = 
            s.isCredit === true || 
            String(s.paymentMethod || s.paymentType).toLowerCase() === 'credit' || 
            String(s.status).toLowerCase() === 'credit' ||
            s.type === 'Credit';
          return nameMatch && (isCredit || !s.paymentMethod);
        })
        .reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.billNet || 0), 0)
    );

    // 3. Total Payments / Recoveries Received
    const totalPaid = Math.round(
      payments
        .filter((p) => (p.customer || p.customerName) === cName)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    );

    // 4. Total Returns Adjustment
    const totalReturned = Math.round(
      returns
        .filter((r) => (r.customer || r.customerName) === cName)
        .reduce((sum, r) => sum + Number(r.refundAmount || r.netTotal || 0), 0)
    );

    // Net Ledger Balance
    const netCalculatedBalance = prevBal + totalSales - totalPaid - totalReturned;
    return Math.max(0, netCalculatedBalance);
  }, [selectedCustomerObj, sales, payments, returns]);

  // --- Add Item to Cart ---
  const handleAddItem = (itemToAdd) => {
    if (!itemToAdd) return;

    const existingIndex = cartItems.findIndex(i => i.id === itemToAdd.id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].piece += 1;
      updated[existingIndex].total = calculateRowTotal(updated[existingIndex]);
      setCartItems(updated);
    } else {
      const newItem = {
        id: itemToAdd.id || Date.now().toString(),
        product: itemToAdd.name || itemToAdd.title || 'Product',
        piece: 1,
        rate: Number(itemToAdd.salePrice || itemToAdd.price || itemToAdd.rate || 0),
        discPercent: 0,
        total: Number(itemToAdd.salePrice || itemToAdd.price || itemToAdd.rate || 0)
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const calculateRowTotal = (item) => {
    const gross = Number(item.piece || 0) * Number(item.rate || 0);
    const discVal = (gross * Number(item.discPercent || 0)) / 100;
    return Math.round(gross - discVal);
  };

  const handleCartChange = (index, field, value) => {
    const updated = [...cartItems];
    updated[index][field] = Number(value);
    updated[index].total = calculateRowTotal(updated[index]);
    setCartItems(updated);
  };

  const handleRemoveCartItem = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // --- Invoice Calculations ---
  const grossTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.piece || 0) * Number(item.rate || 0)), 0);
  }, [cartItems]);

  const totalDisc = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const itemGross = Number(item.piece || 0) * Number(item.rate || 0);
      return sum + ((itemGross * Number(item.discPercent || 0)) / 100);
    }, 0);
  }, [cartItems]);

  const billNet = useMemo(() => {
    return Math.round(grossTotal - totalDisc);
  }, [grossTotal, totalDisc]);

  const totalPayable = useMemo(() => {
    return paymentType === 'Credit' ? Math.round(billNet + previousBalance) : billNet;
  }, [billNet, previousBalance, paymentType]);

  // --- Save Invoice to Firebase ---
  const handleSaveAndPrint = async () => {
    if (cartItems.length === 0) {
      alert('Meharbani karke pehle bill me products add karein!');
      return;
    }

    if (!selectedCustomerName) {
      alert('Meharbani karke customer select karein!');
      return;
    }

    setIsSaving(true);
    try {
      const invoiceData = {
        invoiceNo,
        date: invoiceDate,
        customerName: selectedCustomerName,
        paymentType,
        items: cartItems,
        grossTotal: Math.round(grossTotal),
        totalDisc: Math.round(totalDisc),
        netTotal: billNet,
        previousBalance: previousBalance,
        totalPayable: totalPayable,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'sales'), invoiceData);

      if (onInvoiceSaved) onInvoiceSaved();

      // Reset Form
      setCartItems([]);
      setSelectedCustomerName('');
      alert('Invoice successfully save ho gayi hai!');
    } catch (err) {
      console.error("Save Invoice Error: ", err);
      alert("Invoice save karte waqt error aaya!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-[#090d16] text-slate-100 min-h-screen font-sans">
      <h1 className="text-2xl font-bold text-white mb-6">Sales Terminal</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Form & Item Addition */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Invoice Details Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-base font-semibold text-slate-200 mb-4">Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Invoice No</label>
                <input 
                  type="text" 
                  value={invoiceNo} 
                  readOnly 
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Date</label>
                <input 
                  type="date" 
                  value={invoiceDate} 
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Customer</label>
                <select 
                  value={selectedCustomerName} 
                  onChange={(e) => setSelectedCustomerName(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Payment Type</label>
                <select 
                  value={paymentType} 
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Credit">Credit</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>
          </div>

          {/* Add Items Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-base font-semibold text-slate-200 mb-4">Add Items</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Search by SKU / Name (Press Enter)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Type SKU or Name..."
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const matched = stockItems.find(i => 
                          (i.sku && i.sku.toLowerCase() === skuSearch.toLowerCase()) || 
                          (i.name && i.name.toLowerCase().includes(skuSearch.toLowerCase()))
                        );
                        if (matched) {
                          handleAddItem(matched);
                          setSkuSearch('');
                        }
                      }
                    }}
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 pl-9"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Find Item (Manual)</label>
                <select 
                  value={selectedItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedItemId(id);
                    const matched = stockItems.find(i => String(i.id) === String(id));
                    if (matched) {
                      handleAddItem(matched);
                      setSelectedItemId('');
                    }
                  }}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Item --</option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || item.title} (Rs. {item.salePrice || item.price || item.rate || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cart Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 border-collapse">
                <thead className="bg-[#1e293b] text-slate-400 text-xs uppercase font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Ser</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Piece</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-center">Disc (%)</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-slate-500 text-xs">
                        No items added to bill yet.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-white">{item.product}</td>
                        <td className="py-2.5 px-3 w-24">
                          <input 
                            type="number" 
                            min="1"
                            value={item.piece}
                            onChange={(e) => handleCartChange(idx, 'piece', e.target.value)}
                            className="w-full bg-[#090d16] border border-slate-700 rounded px-2 py-1 text-center text-sm font-semibold text-white focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-semibold">
                          Rs. {item.rate}
                        </td>
                        <td className="py-2.5 px-3 w-20">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={item.discPercent}
                            onChange={(e) => handleCartChange(idx, 'discPercent', e.target.value)}
                            className="w-full bg-[#090d16] border border-slate-700 rounded px-2 py-1 text-center text-sm font-semibold text-white focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          Rs. {item.total}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button 
                            onClick={() => handleRemoveCartItem(idx)}
                            className="text-rose-500 hover:text-rose-400 p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Summary Card */}
        <div className="lg:col-span-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg sticky top-6 space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-300">
                <span>Gross:</span>
                <span className="font-bold text-white text-base">Rs. {grossTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span>Total Disc:</span>
                <span className="font-bold text-rose-400 text-base">Rs. {Math.round(totalDisc).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span>Bill Net:</span>
                <span className="font-bold text-amber-400 text-base">Rs. {billNet.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-slate-300 pt-2 border-t border-slate-800/80">
                <span className="font-medium text-sky-400">Prev Balance:</span>
                <span className="font-bold text-sky-400 text-base">Rs. {previousBalance.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-lg">
                <span className="font-bold text-emerald-400">Total Payable:</span>
                <span className="font-extrabold text-emerald-400 text-2xl">Rs. {totalPayable.toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={handleSaveAndPrint}
              disabled={isSaving}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-base"
            >
              {isSaving ? 'Saving...' : 'Save & Print'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Sales;