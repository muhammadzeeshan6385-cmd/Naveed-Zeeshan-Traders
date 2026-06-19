import React from 'react';

const ProductForm = ({ products, setProducts, form, setForm }) => {
  const addProduct = () => {
    if(!form.name) return;
    setProducts([...products, form]);
    setForm({ name: '', category: '', qty: '', pRate: '', sRate: '' });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">Add New Product</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <input className="border p-2 rounded" placeholder="Product Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
        <input className="border p-2 rounded" placeholder="Category" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} />
        <input className="border p-2 rounded" placeholder="Qty" value={form.qty} onChange={(e) => setForm({...form, qty: e.target.value})} />
        <input className="border p-2 rounded" placeholder="P.Rate" value={form.pRate} onChange={(e) => setForm({...form, pRate: e.target.value})} />
        <input className="border p-2 rounded" placeholder="S.Rate" value={form.sRate} onChange={(e) => setForm({...form, sRate: e.target.value})} />
      </div>
      <button onClick={addProduct} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold">Save Product</button>
      
      <table className="w-full mt-6 text-left border-collapse">
        <thead className="bg-gray-100"><tr><th className="p-2">Name</th><th>Cat</th><th>Qty</th><th>P.Rate</th><th>S.Rate</th></tr></thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-t"><td className="p-2">{p.name}</td><td>{p.category}</td><td>{p.qty}</td><td>{p.pRate}</td><td>{p.sRate}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default ProductForm;