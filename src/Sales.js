import React, { useState, useEffect } from 'react';

const Sales = ({ sales, setSales, products, customers }) => {
  const [invoiceNo, setInvoiceNo] = useState("INV-001");
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (sales.length > 0) {
      const last = sales[sales.length - 1].invoiceNo;
      const next = parseInt(last.replace('INV-', '')) + 1;
      setInvoiceNo(`INV-${next.toString().padStart(3, '0')}`);
    }
  }, [sales]);

  const addProduct = (pName) => {
    const p = products.find(prod => prod.name === pName);
    if(p) setItems([...items, { ...p, qty: 1 }]);
  };

  const gross = items.reduce((a, b) => a + (b.price * b.qty), 0);
  const netTotal = gross - discount;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-4 gap-6">
        {/* Left Side: Invoice Header & Product Table */}
        <div className="col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="font-bold mb-4">Invoice Details</h2>
            <div className="grid grid-cols-3 gap-4">
              <input disabled value={invoiceNo} className="border p-2 rounded" />
              <input disabled value={new Date().toLocaleString()} className="border p-2 rounded" />
              <select className="border p-2 rounded"><option>Select Customer</option>{customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <select onChange={(e) => addProduct(e.target.value)} className="w-full border p-3 rounded mb-4">
                <option>Search product by name, code or scan barcode...</option>
                {products.map(p => <option key={p.name} value={p.name}>{p.name} - Stock: {p.qty}</option>)}
            </select>
            <table className="w-full text-left">
              <thead><tr className="bg-gray-100"><th className="p-3">Product</th><th className="p-3">Rate</th><th className="p-3">Qty</th><th className="p-3">Total</th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{item.price}</td>
                    <td className="p-3"><input type="number" value={item.qty} onChange={(e) => setItems(items.map((it, idx) => idx === i ? {...it, qty: Number(e.target.value)} : it))} className="w-16 border p-1"/></td>
                    <td className="p-3">Rs. {item.qty * item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Professional Summary Card */}
        <div className="bg-white p-6 rounded-xl shadow border h-fit">
          <h2 className="font-bold border-b pb-2 mb-4">Invoice Summary</h2>
          <div className="flex justify-between mb-2"><span>Gross Total</span> <span>{gross}</span></div>
          <div className="flex justify-between mb-4"><span>Discount</span> <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-20 border p-1"/></div>
          <div className="text-2xl font-bold border-t pt-2 mb-6">Net Total: {netTotal}</div>
          <button onClick={() => { setSales([...sales, {invoiceNo, items, netTotal}]); setItems([]); }} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Save & Print (F10)</button>
        </div>
      </div>
    </div>
  );
};
export default Sales;