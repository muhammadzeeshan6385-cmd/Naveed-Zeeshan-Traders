import React, { useState } from 'react';

const Products = ({ products, setProducts }) => {
  const [form, setForm] = useState({ name: '', category: '', pRate: '', sRate: '' });

  const addProduct = () => {
    if (!form.name || !form.sRate) return alert("Product Name and Rate are required!");
    setProducts([...products, { ...form, id: Date.now() }]);
    setForm({ name: '', category: '', pRate: '', sRate: '' });
  };

  const deleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">Add New Product</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <input className="border p-3 rounded" placeholder="Product Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
        <input className="border p-3 rounded" placeholder="Category" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} />
        <input className="border p-3 rounded" type="number" placeholder="Purchase Rate" value={form.pRate} onChange={(e) => setForm({...form, pRate: e.target.value})} />
        <input className="border p-3 rounded" type="number" placeholder="Sale Rate" value={form.sRate} onChange={(e) => setForm({...form, sRate: e.target.value})} />
      </div>
      <button onClick={addProduct} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold mb-8">Save Product</button>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Name</th>
            <th className="p-3">Category</th>
            <th className="p-3">Purchase Rate</th>
            <th className="p-3">Sale Rate</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-3">{p.name}</td>
              <td className="p-3">{p.category}</td>
              <td className="p-3">Rs. {p.pRate}</td>
              <td className="p-3 font-bold text-blue-800">Rs. {p.sRate}</td>
              <td className="p-3"><button onClick={() => deleteProduct(p.id)} className="text-red-600">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default Products;