import React, { useState } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react'; // Icons import kiye

const Products = ({ products, setProducts }) => {
  const [form, setForm] = useState({ name: '', category: '', pRate: '', sRate: '', qty: '' });

  const addProduct = () => {
    if (!form.name || !form.sRate || !form.qty) return alert("All fields are required!");
    setProducts([...products, { ...form, id: Date.now() }]);
    setForm({ name: '', category: '', pRate: '', sRate: '', qty: '' });
  };

  const deleteProduct = (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handlePreview = (p) => {
    alert(`Product Details:\nName: ${p.name}\nQuantity: ${p.qty}\nPurchase: Rs. ${p.pRate}\nSale: Rs. ${p.sRate}`);
  };

  const handleEdit = (p) => {
    const newQty = prompt("Edit Quantity:", p.qty);
    const newSRate = prompt("Edit Sale Rate:", p.sRate);
    
    if (newQty || newSRate) {
      setProducts(products.map(item => 
        item.id === p.id ? { ...item, qty: newQty || item.qty, sRate: newSRate || item.sRate } : item
      ));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">Add New Product</h2>
      {/* Form with Quantity Field */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <input className="border p-3 rounded" placeholder="Product Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
        <input className="border p-3 rounded" placeholder="Category" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} />
        <input className="border p-3 rounded" type="number" placeholder="Quantity" value={form.qty} onChange={(e) => setForm({...form, qty: e.target.value})} />
        <input className="border p-3 rounded" type="number" placeholder="Purchase" value={form.pRate} onChange={(e) => setForm({...form, pRate: e.target.value})} />
        <input className="border p-3 rounded" type="number" placeholder="Sale" value={form.sRate} onChange={(e) => setForm({...form, sRate: e.target.value})} />
      </div>
      <button onClick={addProduct} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold mb-8">Save Product</button>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Name</th>
            <th className="p-3">Category</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Purchase</th>
            <th className="p-3">Sale</th>
            <th className="p-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-3">{p.name}</td>
              <td className="p-3">{p.category}</td>
              <td className="p-3 font-bold">{p.qty}</td>
              <td className="p-3">Rs. {p.pRate}</td>
              <td className="p-3 font-bold text-blue-800">Rs. {p.sRate}</td>
              <td className="p-3 flex justify-center gap-4">
                <button onClick={() => handlePreview(p)} className="text-blue-600"><Eye size={18} /></button>
                <button onClick={() => handleEdit(p)} className="text-yellow-600"><Pencil size={18} /></button>
                <button onClick={() => deleteProduct(p.id)} className="text-red-600"><Trash2 size={18} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default Products;