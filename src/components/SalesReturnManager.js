import React, { useState, useMemo } from 'react';
import { RotateCcw, Trash2, Plus, User, Package, Calendar, CheckCircle } from 'lucide-react';

function SalesReturnManager({ products = [], customers = [], onReturnComplete }) {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [counterCustomerName, setCounterCustomerName] = useState('');
  const [isCreditReturn, setIsCreditReturn] = useState(true); // True = Khata, False = Cash Counter
  
  // Return items list state
  const [returnItems, setReturnItems] = useState([]);
  
  // Temporary current item inputs
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQty, setCurrentQty] = useState('');
  const [currentRate, setCurrentRate] = useState('');

  const selectedCustomerInfo = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [selectedCustomerId, customers]);

  const selectedProductInfo = useMemo(() => {
    return products.find(p => p.id === currentProductId);
  }, [currentProductId, products]);

  // Autofill rate when product is selected
  const handleProductChange = (id) => {
    setCurrentProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setCurrentRate(prod.saleRate || prod.price || '');
    }
  };

  // Add Item to Return List
  const addItemToReturnList = () => {
    if (!currentProductId || !currentQty || !currentRate) {
      alert("Bhai, Product, Qty aur Rate mukammal enter karen.");
      return;
    }

    const duplicate = returnItems.find(item => item.productId === currentProductId);
    if (duplicate) {
      alert("Yeh product pehle hi list mein mojood hai.");
      return;
    }

    setReturnItems([
      ...returnItems,
      {
        productId: currentProductId,
        productName: selectedProductInfo?.name || 'Unknown Product',
        qty: Number(currentQty),
        rate: Number(currentRate),
        total: Number(currentQty) * Number(currentRate)
      }
    ]);

    // Reset inputs for next item
    setCurrentProductId('');
    setCurrentQty('');
    setCurrentRate('');
  };

  // Remove Item from List
  const removeItemFromList = (index) => {
    const updated = returnItems.filter((_, i) => i !== index);
    setReturnItems(updated);
  };

  // Grand Total of Return
  const grandTotal = useMemo(() => {
    return returnItems.reduce((sum, item) => sum + item.total, 0);
  }, [returnItems]);

  // Submit Data to Backend
  const handleSubmitReturn = async () => {
    if (returnItems.length === 0) {
      alert("Wapsi list khali hai! Kam az kam ek item add karen.");
      return;
    }

    if (isCreditReturn && !selectedCustomerId) {
      alert("Khata adjust karne ke liye Customer select karna laazmi hai.");
      return;
    }

    const finalCustomerName = isCreditReturn ? selectedCustomerInfo?.name : (counterCustomerName || "Counter Cash Client");

    const payload = {
      customerId: isCreditReturn ? selectedCustomerId : null,
      customerName: finalCustomerName,
      isCredit: isCreditReturn,
      date: returnDate,
      items: returnItems
    };

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(`Maal Wapsi ka record kamyabi se save ho gya hai! Stock barh gaya aur Khata update ho gaya hai.`);
        // Reset full state
        setReturnItems([]);
        setSelectedCustomerId('');
        setCounterCustomerName('');
        if (onReturnComplete) onReturnComplete();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("System backend transaction failed connecting API.");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-4xl mx-auto text-slate-100">
      
      {/* Head Title */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
        <div className="bg-rose-600/20 p-2.5 rounded-2xl text-rose-500">
          <RotateCcw size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-wide uppercase">Sales Return Entry (مال واپسی)</h2>
          <p className="text-xs text-slate-400">Bika hoa maal wapas system me enter kr k stock aur khata ledger adjust kren.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CONFIGURATION PANEL */}
        <div className="space-y-4 md:col-span-1 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
          
          {/* Return Date */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 flex items-center gap-1">
              <Calendar size={12} /> Return Date
            </label>
            <input 
              type="date" 
              value={returnDate} 
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Return Type Toggle */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => { setIsCreditReturn(true); setCounterCustomerName(''); }}
                className={`py-2 text-xs font-black uppercase rounded-xl border transition ${isCreditReturn ? 'bg-rose-600 text-white border-rose-500 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
              >
                Khata / Ledger
              </button>
              <button 
                type="button"
                onClick={() => { setIsCreditReturn(false); setSelectedCustomerId(''); }}
                className={`py-2 text-xs font-black uppercase rounded-xl border transition ${!isCreditReturn ? 'bg-amber-600 text-white border-amber-500 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
              >
                Cash Return
              </button>
            </div>
          </div>

          {/* Customer Selection Logic */}
          {isCreditReturn ? (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 flex items-center gap-1">
                <User size={12} /> Select Customer Khata
              </label>
              <select 
                value={selectedCustomerId} 
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Choose Account --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (Bal: Rs.{c.balance || 0})</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 flex items-center gap-1">
                <User size={12} /> Counter Customer Name
              </label>
              <input 
                type="text" 
                placeholder="Walk-in Client Name"
                value={counterCustomerName}
                onChange={(e) => setCounterCustomerName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Display Dynamic Adjustment Info */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            {isCreditReturn ? (
              <p>💡 Wapsi raqam <span className="text-rose-400 font-bold">Rs.{grandTotal}</span> customer ke khate se minus ho kar balance kam kr degi.</p>
            ) : (
              <p>💡 Yeh naqd (cash) wapsi hai, counter cash khate se raqam ada ki jayegi.</p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: ITEMS CONSOLE & GRID TABLE */}
        <div className="space-y-4 md:col-span-2">
          
          {/* TOP INNER BAR: ADD PRODUCTS FORM */}
          <div className="bg-slate-950/30 border border-slate-800 p-3 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1 flex items-center gap-1">
                <Package size={11} /> Item Name
              </label>
              <select 
                value={currentProductId} 
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Choose Item --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock || 0})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Return Qty</label>
              <input 
                type="number" 
                placeholder="0"
                value={currentQty} 
                onChange={(e) => setCurrentQty(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 text-center focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <button 
                type="button" 
                onClick={addItemToReturnList}
                className="w-full bg-slate-800 hover:bg-slate-700 text-rose-500 font-black text-xs uppercase tracking-wider py-2 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* ITEM DISPLAY DATA LIST */}
          <div className="bg-slate-950/10 border border-slate-800 rounded-2xl overflow-hidden min-h-[180px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="p-3 text-slate-400 uppercase font-bold tracking-wider text-[10px]">Product Description</th>
                  <th className="p-3 text-slate-400 uppercase font-bold tracking-wider text-[10px] text-center">Qty</th>
                  <th className="p-3 text-slate-400 uppercase font-bold tracking-wider text-[10px] text-right">Return Rate</th>
                  <th className="p-3 text-slate-400 uppercase font-bold tracking-wider text-[10px] text-right">Sub Total</th>
                  <th className="p-3 text-center text-slate-400 text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {returnItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">Koi maal wapsi item list me shamil nahi kia gya.</td>
                  </tr>
                ) : (
                  returnItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="p-3 font-bold text-slate-200">{item.productName}</td>
                      <td className="p-3 text-center text-emerald-400 font-bold">{item.qty}</td>
                      <td className="p-3 text-right text-slate-300">Rs.{item.rate}</td>
                      <td className="p-3 text-right font-black text-slate-100">Rs.{item.total}</td>
                      <td className="p-3 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeItemFromList(idx)}
                          className="text-slate-500 hover:text-rose-500 p-1 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* GRAND TOTAL BAR & FINAL SUBMIT */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Total Refund Value</span>
              <h3 className="text-xl font-black text-rose-500">Rs. {new Intl.NumberFormat('en-PK').format(grandTotal)}</h3>
            </div>
            
            <button 
              type="button"
              onClick={handleSubmitReturn}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle size={15} /> Post & Save Return
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

export default SalesReturnManager;