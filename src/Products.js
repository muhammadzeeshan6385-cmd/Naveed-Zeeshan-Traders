import React, { useState } from 'react';
import { Eye, Pencil, Trash2, X } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, getProductPurchaseRate, getProductSaleRate } from './utils/helpers';

const Products = ({ products, setProducts }) => {
  const [form, setForm] = useState({ name: '', category: '', sku: '', pRate: '', sRate: '', minStock: '5', unit: 'Piece' });
  const [editingProduct, setEditingProduct] = useState(null); // Edit Popup ki state
  const [search, setSearch] = useState('');

  const resetForm = () => setForm({ name: '', category: '', sku: '', pRate: '', sRate: '', minStock: '5', unit: 'Piece' });

  const addProduct = () => {
    if (!form.name.trim() || !form.sRate) {
      window.alert('Product name and sale rate are required.');
      return;
    }
    setProducts([...products, { ...form, id: generateId(), pRate: Number(form.pRate) || 0, sRate: Number(form.sRate), minStock: Number(form.minStock) || 5 }]);
    resetForm();
  };

  const deleteProduct = async (row) => {
    if (window.confirm('Delete this product?')) {
      const targetId = row.id || row._id || row.productId;

      try {
        // Agar aap API or backend use kar rhe hain to ye database se bhi delete karega
        if (targetId) {
          await fetch(`/api/products/${targetId}`, {
            method: 'DELETE',
          }).catch(err => console.log("API Delete URL not matched, fallback to frontend filter"));
        }

        // Frontend state se product delete karne ka mukammal logic
        setProducts(products.filter((p) => {
          const productId = p.id || p._id || p.productId;
          if (targetId && productId) {
            return productId !== targetId;
          }
          return p.name !== row.name || p.sku !== row.sku;
        }));
      } catch (error) {
        // Agar API fail bhi ho jaye tab bhi frontend se har haal me delete ho
        setProducts(products.filter((p) => {
          const productId = p.id || p._id || p.productId;
          if (targetId && productId) {
            return productId !== targetId;
          }
          return p.name !== row.name || p.sku !== row.sku;
        }));
      }
    }
  };

  const updateProduct = () => {
    setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
    setEditingProduct(null); // Popup band karne ke liye
  };

  const filteredProducts = products.filter((p) =>
    [p.name, p.category, p.sku].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell title="Products" subtitle="Manage distributor product catalog, rates, and reorder levels">
      <Card title="Add Product">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label="SKU / Code" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option>Piece</option><option>Carton</option><option>Bag</option><option>Kg</option>
          </Select>
          <Input label="Purchase Rate" type="number" value={form.pRate} onChange={(e) => setForm({ ...form, pRate: e.target.value })} />
          <Input label="Sale Rate" type="number" value={form.sRate} onChange={(e) => setForm({ ...form, sRate: e.target.value })} />
          <Input label="Min Stock Alert" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
        </div>
        <Button className="mt-4" onClick={addProduct}>Save Product</Button>
      </Card>

      <Card title="Product List">
        <Input className="mb-4 max-w-md" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'sku', label: 'SKU' },
            { key: 'category', label: 'Category' },
            { key: 'unit', label: 'Unit' },
            { key: 'pRate', label: 'P.Rate', render: (row) => getProductPurchaseRate(row) },
            { key: 'sRate', label: 'S.Rate', render: (row) => getProductSaleRate(row) },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => alert('Previewing ' + row.name)} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="Preview"><Eye size={18} /></button>
                  <button onClick={() => setEditingProduct(row)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded" title="Edit"><Pencil size={18} /></button>
                  <button onClick={() => deleteProduct(row)} className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded" title="Delete"><Trash2 size={18} /></button>
                </div>
              ),
            },
          ]}
          rows={filteredProducts}
        />
      </Card>

      {/* Edit Popup Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">Edit Product</h2>
              <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Name" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
              <Input label="SKU" value={editingProduct.sku} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} />
              <Input label="P.Rate" type="number" value={editingProduct.pRate} onChange={(e) => setEditingProduct({...editingProduct, pRate: e.target.value})} />
              <Input label="S.Rate" type="number" value={editingProduct.sRate} onChange={(e) => setEditingProduct({...editingProduct, sRate: e.target.value})} />
            </div>
            <Button className="w-full mt-6" onClick={updateProduct}>Save Changes</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default Products;