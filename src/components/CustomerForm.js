import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell } from './ui';
import { formatRs, generateId, getCreditSalesTotal } from '../utils/helpers';

const CustomerForm = ({ customers, setCustomers, sales, payments }) => {
  const [form, setForm] = useState({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });

  const addCustomer = () => {
    if (!form.name.trim()) {
      window.alert('Customer name is required.');
      return;
    }

    setCustomers([
      ...customers,
      {
        id: generateId(),
        name: form.name.trim(),
        shopName: form.shopName.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        route: form.route.trim(),
        creditLimit: Number(form.creditLimit) || 0,
      },
    ]);
    setForm({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });
  };

  const deleteCustomer = (id) => {
    if (window.confirm('Delete this customer?')) {
      setCustomers(customers.filter((customer) => customer.id !== id));
    }
  };

  const rows = useMemo(
    () =>
      customers.map((customer) => {
        const creditSales = getCreditSalesTotal(sales, customer.name);
        const recovered = payments.filter((payment) => payment.customer === customer.name).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return {
          ...customer,
          balance: creditSales - recovered,
        };
      }),
    [customers, sales, payments]
  );

  return (
    <PageShell title="Customers" subtitle="Manage retailers, routes, credit limits, and outstanding balances">
      <Card title="Add Customer">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input label="Customer Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Shop Name" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="Route / Beat" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
          <Input label="Credit Limit" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
        </div>
        <Button className="mt-4" onClick={addCustomer}>
          Save Customer
        </Button>
      </Card>

      <Card title="Customer List">
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'shopName', label: 'Shop' },
            { key: 'mobile', label: 'Mobile' },
            { key: 'route', label: 'Route' },
            { key: 'balance', label: 'Balance', render: (row) => formatRs(row.balance) },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <Button variant="danger" onClick={() => deleteCustomer(row.id)}>
                  Delete
                </Button>
              ),
            },
          ]}
          rows={rows}
        />
      </Card>
    </PageShell>
  );
};

export default CustomerForm;
