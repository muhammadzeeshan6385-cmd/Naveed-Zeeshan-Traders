import React, { useState } from 'react';

const Sales = ({ products, customers, setSales }) => {
  const [billData, setBillData] = useState({
    billNo: "INV-" + Date.now().toString().slice(-4),
    date: new Date().toLocaleString(),
    customer: "Walk-in Customer",
    type: "Cash",
    items: []
  });

  const [selectedProd, setSelectedProd] = useState(null);
  const [qty, setQty] = useState(1);

  const addProductToBill = () => {
    if (!selectedProd) return alert("Select a product!");
    const newItem = {
      ...selectedProd,
      qty: parseInt(qty),
      total: parseFloat(selectedProd.sRate) * parseInt(qty)
    };
    setBillData({ ...billData, items: [...billData.items, newItem] });
  };

  const netTotal = billData.items.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Sales Billing System</h2>
      
      {/* Bill Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <input className="border p-2 rounded" value={billData.billNo} disabled />
        <input className="border p-2 rounded" value={billData.date} disabled />
        <select className="border p-2 rounded" onChange={(e) => setBillData({...billData, customer: e.target.value})}>
          <option>Walk-in Customer</option>
          {customers && customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select className="border p-2 rounded" onChange={(e) => setBillData({...billData, type: e.target.value})}>
          <option>Cash</option>
          <option>Khata</option>
        </select>
      </div>

      {/* Product Add Section */}
      <div className="flex gap-2 mb-6">
        <select className="border p-2 flex-grow" onChange={(e) => setSelectedProd(products.find(p => p.name === e.target.value))}>
          <option>Select Product</option>
          {products.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
        <input type="number" className="border p-2 w-20" placeholder="Qty" onChange={(e) => setQty(e.target.value)} />
        <button onClick={addProductToBill} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>

      {/* Bill Table */}
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Product</th>
            <th className="p-2 border">Rate</th>
            <th className="p-2 border">Qty</th>
            <th className="p-2 border">Total</th>
          </tr>
        </thead>
        <tbody>
          {billData.items.map((item, index) => (
            <tr key={index} className="border-t">
              <td className="p-2 border">{item.name}</td>
              <td className="p-2 border">Rs. {item.sRate}</td>
              <td className="p-2 border">{item.qty}</td>
              <td className="p-2 border">Rs. {item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right text-xl font-bold">
        Net Total: Rs. {netTotal.toFixed(2)}
      </div>
    </div>
  );
};
export default Sales;