import React, { useState, useRef } from 'react';

const Sales = ({ products, customers }) => {
  const [billData, setBillData] = useState({ 
    billNo: "INV-" + Date.now().toString().slice(-4),
    date: new Date().toLocaleString(),
    customer: "Walk-in Customer",
    type: "Cash",
    items: [],
    discount: 0
  });
  const [selectedProd, setSelectedProd] = useState(null);
  const [qty, setQty] = useState(1);

  const addItem = () => {
    if (!selectedProd) return alert("Select product");
    const newItem = { ...selectedProd, qty: parseInt(qty), total: parseFloat(selectedProd.sRate) * parseInt(qty) };
    setBillData({...billData, items: [...billData.items, newItem]});
  };

  const removeItem = (index) => {
    const newItems = billData.items.filter((_, i) => i !== index);
    setBillData({...billData, items: newItems});
  };

  const netTotal = billData.items.reduce((acc, item) => acc + item.total, 0) - billData.discount;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    printWindow.document.write(`<html><head><title>Print Bill</title></head><body>
      <div style="width:100%; padding:20px; font-family:Arial;">
        <h2>Mughal Kiryana Store & Milk Shop</h2>
        <p>Address: Fadda Bazar Mailsi</p>
        <hr>
        <p>Bill No: ${billData.billNo} | Date: ${billData.date}</p>
        <table style="width:100%"><tr><th>Product</th><th>Qty</th><th>Total</th></tr>
        ${billData.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.total}</td></tr>`).join('')}
        </table>
        <h3>Discount: Rs. ${billData.discount}</h3>
        <h2>Net Total: Rs. ${netTotal.toFixed(2)}</h2>
      </div></body></html>`);
    printWindow.print();
  };

  return (
    <div className="bg-white p-6 rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Sales Billing System</h2>
      
      {/* Header Inputs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <input className="border p-2" value={billData.billNo} disabled />
        <input className="border p-2" value={billData.date} disabled />
        <select className="border p-2" onChange={(e) => setBillData({...billData, customer: e.target.value})}>
           {customers?.map(c => <option key={c.id}>{c.name}</option>)}
        </select>
        <select className="border p-2" onChange={(e) => setBillData({...billData, type: e.target.value})}>
          <option>Cash</option><option>Khata</option>
        </select>
      </div>

      {/* Product Add */}
      <div className="flex gap-2 mb-4">
        <select className="border p-2 flex-grow" onChange={(e) => setSelectedProd(products.find(p => p.name === e.target.value))}>
          <option>Select Product</option>
          {products?.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
        <input type="number" className="border p-2 w-16" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button onClick={addItem} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>

      {/* Table */}
      <table className="w-full mb-4">
        <tr className="bg-gray-100"><th>Product</th><th>Rate</th><th>Qty</th><th>Total</th><th>Action</th></tr>
        {billData.items.map((item, index) => (
          <tr key={index} className="text-center border-b">
            <td>{item.name}</td><td>{item.sRate}</td><td>{item.qty}</td><td>{item.total}</td>
            <td><button onClick={() => removeItem(index)} className="text-red-500">Delete</button></td>
          </tr>
        ))}
      </table>

      {/* Footer */}
      <div className="text-right">
        <input type="number" placeholder="Discount" className="border p-2 w-24 mr-4" onChange={(e) => setBillData({...billData, discount: parseFloat(e.target.value) || 0})} />
        <h3 className="text-2xl font-bold">Net Total: Rs. {netTotal.toFixed(2)}</h3>
        <button onClick={handlePrint} className="bg-green-600 text-white px-6 py-2 mt-4 rounded">Save & Print</button>
      </div>
    </div>
  );
};
export default Sales;