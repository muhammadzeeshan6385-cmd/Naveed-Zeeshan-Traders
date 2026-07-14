import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, todayISO } from './utils/helpers';

const Purchase = ({ purchases, setPurchases, suppliers = [], products = [], setProducts, cashData, setCashData }) => {
  const [form, setForm] = useState({
    date: todayISO(),
    supplier: '',
    product: '',
    qty: '',
    price: '',
    paymentType: 'Credit',
    account: 'Cash',
  });

  const resetForm = () =>
    setForm({
      date: todayISO(),
      supplier: '',
      product: '',
      qty: '',
      price: '',
      paymentType: 'Credit',
      account: 'Cash',
    });

  const addPurchase = () => {
    if (!form.supplier || !form.product || !form.qty || !form.price) {
      window.alert('Supplier, product, quantity, and price are required.');
      return;
    }

    const qty = Number(form.qty);
    const price = Number(form.price);
    const total = qty * price;
    
    // 1. Purchase Record
    const entry = {
      id: generateId(),
      date: form.date,
      supplier: form.supplier,
      product: form.product,
      qty,
      price,
      total,
      paymentType: form.paymentType,
    };

    setPurchases([...purchases, entry]);

    // 2. Logic: Product ka purchaseRate update karein (Force Number format)
    if (setProducts) {
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.name === form.product ? { ...p, purchaseRate: Number(price) } : p
        )
      );
    }

    // 3. Cash Data (agar Cash purchase hai)
    if (form.paymentType === 'Cash') {
      setCashData([
        ...cashData,
        {
          id: generateId(),
          date: form.date,
          account: form.account,
          amount: -total,
          description: `Purchase: ${form.product} from ${form.supplier}`,
          type: 'payment',
        },
      ]);
    }

    resetForm();
    window.alert('Purchase saved and Product rate updated!');
  };

  const recentPurchases = useMemo(() => [...purchases].slice(-20).reverse(), [purchases]);

  return (
    <PageShell title="Procurement">
      <Card title="Purchase Entry">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
            ))}
          </Select>
          <Select label="Product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.name}>{product.name}</option>
            ))}
          </Select>
          <Input label="Quantity" type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <Input label="Purchase Rate" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Select label="Payment Type" value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
            <option value="Credit">Credit</option>
            <option value="Cash">Cash</option>
          </Select>
          {form.paymentType === 'Cash' && (
            <Select label="Paid From" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </Select>
          )}
        </div>
        <Button className="mt-4" onClick={addPurchase}>Save Purchase</Button>
      </Card>

      <Card title="Recent Purchases">
        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'product', label: 'Product' },
            { key: 'qty', label: 'Qty' },
            { key: 'price', label: 'Rate' },
            { key: 'total', label: 'Total', render: (row) => `Rs. ${Number(row.total).toLocaleString()}` },
            { key: 'paymentType', label: 'Payment' },
          ]}
          rows={recentPurchases}
        />
      </Card>
    </PageShell>
  );
};

export default Purchase;