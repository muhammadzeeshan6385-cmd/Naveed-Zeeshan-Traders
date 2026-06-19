import React, { useState, useEffect } from 'react';

const Sales = ({ products, customers, setSales }) => {
  const [billData, setBillData] = useState({ 
    billNo: "INV-001", 
    date: new Date().toLocaleString(), 
    customer: "", 
    type: "Cash", // Cash ya Khata
    items: [] 
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);

  // Rate automatic show karne ke liye
  const handleProductSelect = (e) => {
    const prod = products.find(p => p.name === e.target.value);
    setSelectedProduct(prod);
  };

  const addItem = () => {
    if (!selectedProduct || qty <= 0) return alert("Select product and qty");
    const newItem = { 
      ...selectedProduct, 
      qty: parseInt(qty), 
      total: parseFloat(selectedProduct.sRate) * parseInt(qty) 
    };
    setBillData({...billData, items: [...billData.items, newItem]});
  };

  const netTotal = billData.items.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">Sales Billing</h2>
      
      {/* Header Info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <input className="border p-2 rounded" value={billData.billNo} disabled />
        <input className="border p-2 rounded" value={billData.date} disabled />
        <select className="border p-2 rounded" onChange={(e) => setBillData({...billData, type: e.target.value})}>
          <option>Cash</option>
          <option>Khata</option>
        </select>
      </div>

      {/* Product Selection */}
      <div className="flex gap-4 mb-6">
        <select className="border p-2 flex-grow" onChange={handleProductSelect}>
          <option>Select Product</option>
          {products.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
        <input type="number" className="border p-2 w-20" placeholder="Qty" onChange={(e) => setQty(e.target.value)} />
        <button onClick={addItem} className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
      </div>

      {/* Table */}
      <table className="w-full border-collapse mb-6">
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Product</th>
          <th className="p-2">Rate</th>
          <th className="p-2">Qty</th>
          <th className="p-2">Total</th>
        </tr>
        {billData.items.map((item, index) => (
          <tr key={index} className="border-t">
            <td className="p-2">{item.name}</td>
            <td className="p-2">Rs. {item.sRate}</td>
            <td className="p-2">{item.qty}</td>
            <td className="p-2">Rs. {item.total}</td>
          </tr>
        ))}
      </table>

      {/* Summary */}
      <div className="text-right text-xl font-bold">
        Net Total: Rs. {netTotal.toFixed(2)}
      </div>
    </div>
  );
};
export default Sales;