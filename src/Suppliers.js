import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell } from './components/ui';
import { generateId } from './utils/helpers';

const Suppliers = ({ suppliers, setSuppliers, purchases = [] }) => {
  const [form, setForm] = useState({ name: '', company: '', phone: '', address: '' });

  const addSupplier = () => {
    if (!form.name.trim()) {
      window.alert('Supplier name is required.');
      return;
    }

    setSuppliers([
      ...suppliers,
      {
        id: generateId(),
        name: form.name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      },
    ]);
    setForm({ name: '', company: '', phone: '', address: '' });
  };

  const supplierRows = useMemo(
    () =>
      suppliers.map((supplier) => {
        const purchaseTotal = purchases
          .filter((purchase) => purchase.supplier === supplier.name)
          .reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
        return { ...supplier, purchaseTotal };
      }),
    [suppliers, purchases]
  );

  return (
    <PageShell title="Suppliers" subtitle="Manage manufacturers, vendors, and purchase relationships">
      <Card title="Add Supplier">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Supplier Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Company / Firm" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <Button className="mt-4" onClick={addSupplier}>
          Save Supplier
        </Button>
      </Card>

      <Card title="Supplier Directory">
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'company', label: 'Company' },
            { key: 'phone', label: 'Phone' },
            { key: 'purchaseTotal', label: 'Purchase Volume', render: (row) => `Rs. ${Number(row.purchaseTotal).toLocaleString()}` },
          ]}
          rows={supplierRows}
        />
      </Card>
    </PageShell>
  );
};

export default Suppliers;
