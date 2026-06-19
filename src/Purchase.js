import React, { useState } from 'react';

const Purchase = () => {
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({ product: '', qty: '', price: '' });

  const addPurchase = () => {
    const total = form.qty * form.price;
    setInvoices([...invoices, { ...form, total }]);
    setForm({ product: '', qty: '', price: '' });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md mt-8 border border-green-200">
      <h2 className="text-2xl font-bold text-green-800 mb-4">Purchase Invoice</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <input className="border p-2 rounded" placeholder="Product Name" value={form.product} onChange={(e) => setForm({...form, product: e.target.value})} />
        <input className="border p-2 rounded" placeholder="Qty" type="number" value={form.qty} onChange={(e) => setForm({...form, qty: e.target.value})} />
        <input className="border p-2 rounded" placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} />
        <button onClick={addPurchase} className="bg-green-600 text-white p-2 rounded col-span-3">Add to Invoice</button>
      </div>

      <table className="w-full text-left mt-4 border-collapse">
        <tr className="bg-green-800 text-white"><th className="p-2">Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        {invoices.map((inv, i) => (
          <tr key={i} className="border-b">
            <td className="p-2">{inv.product}</td><td>{inv.qty}</td><td>{inv.price}</td><td>{inv.total}</td>
          </tr>
        ))}
      </table>
    </div>
  );
};
export default Purchase;