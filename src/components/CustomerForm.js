import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell } from './ui';
import { formatRs, generateId, getCreditSalesTotal } from '../utils/helpers';
import { Edit2, Trash2, CheckCircle2, X } from 'lucide-react'; // Zaruri icons import kiye hain

const CustomerForm = ({ customers, setCustomers, sales, payments }) => {
  // Main form sirf add karne ke liye khali rahega
  const [form, setForm] = useState({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });
  
  // Edit modal state aur uski field values
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });

  // Success (Tick Mark) Popup State
  const [showSuccess, setShowSuccess] = useState(false);

  // Naya customer add karne ke liye
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
    
    // Form Reset
    setForm({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });
  };

  // Edit popup kholne ke liye
  const startEdit = (customer) => {
    setEditingId(customer.id);
    setEditForm({
      name: customer.name,
      shopName: customer.shopName || '',
      mobile: customer.mobile || '',
      address: customer.address || '',
      route: customer.route || '',
      creditLimit: customer.creditLimit || '',
    });
    setIsEditOpen(true);
  };

  // Popup se data update karne ke liye
  const updateCustomer = () => {
    if (!editForm.name.trim()) {
      window.alert('Customer name is required.');
      return;
    }

    setCustomers(
      customers.map((customer) =>
        customer.id === editingId
          ? {
              ...customer,
              name: editForm.name.trim(),
              shopName: editForm.shopName.trim(),
              mobile: editForm.mobile.trim(),
              address: editForm.address.trim(),
              route: editForm.route.trim(),
              creditLimit: Number(editForm.creditLimit) || 0,
            }
          : customer
      )
    );

    setIsEditOpen(false); // Edit modal band karein
    setEditingId(null);
    
    // Success Modal (Tick) show karein aur 2 seconds baad band kar dein
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const deleteCustomer = (id) => {
    if (window.confirm('Delete this customer?')) {
      setCustomers(customers.filter((customer) => customer.id !== id));
      if (editingId === id) {
        setIsEditOpen(false);
        setEditingId(null);
      }
    }
  };

  const rows = useMemo(
    () =>
      customers.map((customer) => {
        const creditSales = getCreditSalesTotal(sales, customer.name);
        const recovered = payments
          .filter((payment) => payment.customer === customer.name)
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return {
          ...customer,
          balance: creditSales - recovered,
        };
      }),
    [customers, sales, payments]
  );

  return (
    <PageShell title="Client Directory">
      {/* --- ADD CUSTOMER CARD --- */}
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

      {/* --- CUSTOMER LIST CARD --- */}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(row)}
                    className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white transition cursor-pointer flex items-center justify-center"
                    title="Edit Customer"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteCustomer(row.id)}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition cursor-pointer flex items-center justify-center"
                    title="Delete Customer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
        />
      </Card>

      {/* --- EDIT CUSTOMER POPUP MODAL --- */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl mx-4">
            <button
              onClick={() => { setIsEditOpen(false); setEditingId(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <h3 className="text-sm font-black uppercase text-slate-200 tracking-wider mb-5 border-b border-slate-800 pb-3">
              Update Customer Information
            </h3>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Customer Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <Input label="Shop Name" value={editForm.shopName} onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })} />
              <Input label="Mobile" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
              <Input label="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              <Input label="Route / Beat" value={editForm.route} onChange={(e) => setEditForm({ ...editForm, route: e.target.value })} />
              <Input label="Credit Limit" type="number" value={editForm.creditLimit} onChange={(e) => setEditForm({ ...editForm, creditLimit: e.target.value })} />
            </div>
            
            <div className="flex gap-2 justify-end pt-5 border-t border-slate-800 mt-5">
              <Button
                variant="secondary"
                onClick={() => { setIsEditOpen(false); setEditingId(null); }}
              >
                Cancel
              </Button>
              <Button onClick={updateCustomer}>
                Update Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS TICK CONFIRMATION POPUP --- */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl max-w-xs mx-4 animate-[scaleUp_0.2s_ease-out]">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 mb-4">
              <CheckCircle2 size={40} className="animate-[bounce_1s_infinite]" />
            </div>
            <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-1">
              Customer Updated
            </h4>
            <p className="text-[11px] text-slate-400">
              Customer record has been successfully saved to database.
            </p>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default CustomerForm;