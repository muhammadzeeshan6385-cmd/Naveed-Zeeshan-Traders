import React, { useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, getProductPurchaseRate, getProductSaleRate } from './utils/helpers';

const Products = ({ products, setProducts }) => {
  const [form, setForm] = useState({ name: '', category: '', sku: '', pRate: '', sRate: '', minStock: '5', unit: 'Piece' });
  const [search, setSearch] = useState('');

  const resetForm = () => setForm({ name: '', category: '', sku: '', pRate: '', sRate: '', minStock: '5', unit: 'Piece' });

  const addProduct = () => {
    if (!form.name.trim() || !form.sRate) {
      window.alert('Product name and sale rate are required.');
      return;
    }

    setProducts([
      ...products,
      {
        id: generateId(),
        name: form.name.trim(),
        category: form.category.trim(),
        sku: form.sku.trim() || `SKU-${Date.now()}`,
        pRate: Number(form.pRate) || 0,
        sRate: Number(form.sRate),
        minStock: Number(form.minStock) || 5,
        unit: form.unit,
        active: true,
      },
    ]);
    resetForm();
  };

  const deleteProduct = (id) => {
    if (window.confirm('Delete this product?')) {
      setProducts(products.filter((product) => product.id !== id));
    }
  };

  const filteredProducts = products.filter((product) =>
    [product.name, product.category, product.sku].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell title="Products" subtitle="Manage distributor product catalog, rates, and reorder levels">
      <Card title="Add Product">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label="SKU / Code" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option>Piece</option>
            <option>Carton</option>
            <option>Bag</option>
            <option>Kg</option>
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
            { key: 'minStock', label: 'Min Stock' },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <Button variant="danger" onClick={() => deleteProduct(row.id)}>
                  Delete
                </Button>
              ),
            },
          ]}
          rows={filteredProducts}
        />
      </Card>
    </PageShell>
  );
};

export default Products;
