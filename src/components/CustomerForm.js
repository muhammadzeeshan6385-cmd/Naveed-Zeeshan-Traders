import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell } from './ui';
import { formatRs, generateId, getCreditSalesTotal } from '../utils/helpers';
import { Edit2, Trash2, CheckCircle2, X, Search, Layers, List } from 'lucide-react';

const CustomerForm = ({ customers, setCustomers, sales, payments, userRole }) => {
  // Case-Insensitive Admin Check Pattern
  const isAdmin = useMemo(() => {
    return typeof userRole === 'string' && userRole.trim().toLowerCase() === 'admin';
  }, [userRole]);

  // Main form states
  const [form, setForm] = useState({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });
  
  // Edit modal state aur uski field values
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });

  // Success Popup State
  const [showSuccess, setShowSuccess] = useState(false);

  // SEARCH & PAGINATION STATES
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Naya customer add karne ke liye (With strict write boundary guard)
  const addCustomer = () => {
    if (!isAdmin) {
      window.alert('Unauthorized: Access denied.');
      return;
    }

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

  // Edit popup kholne ke liye (With handler boundary guard)
  const startEdit = (customer) => {
    if (!isAdmin) {
      window.alert('Unauthorized: Operation not permitted.');
      return;
    }

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

  // Popup se data update karne ke liye (With strict mutation guard)
  const updateCustomer = () => {
    if (!isAdmin) {
      window.alert('Unauthorized: Execution halted.');
      return;
    }

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

    setIsEditOpen(false);
    setEditingId(null);
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  // Delete customer routine (With runtime protection)
  const deleteCustomer = (id) => {
    if (!isAdmin) {
      window.alert('Unauthorized: Deletion denied.');
      return;
    }

    if (window.confirm('Delete this customer?')) {
      setCustomers(customers.filter((customer) => customer.id !== id));
      if (editingId === id) {
        setIsEditOpen(false);
        setEditingId(null);
      }
    }
  };

  // Raw rows balance calculation
  const rows = useMemo(() => {
    return customers.map((customer) => {
      const creditSales = getCreditSalesTotal(sales, customer.name);
      const recovered = payments
        .filter((payment) => payment.customer === customer.name)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      return {
        ...customer,
        balance: creditSales - recovered,
      };
    });
  }, [customers, sales, payments]);

  // Search filtering logic
  const filteredRows = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    return rows.filter((row) => 
      (row.name && row.name.toLowerCase().includes(cleanSearch)) ||
      (row.shopName && row.shopName.toLowerCase().includes(cleanSearch)) ||
      (row.route && row.route.toLowerCase().includes(cleanSearch)) ||
      (row.mobile && row.mobile.includes(cleanSearch))
    );
  }, [rows, searchTerm]);

  // Pagination bounds management
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  
  const finalDisplayedRows = useMemo(() => {
    if (showAll) return filteredRows;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, showAll, currentPage]);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <PageShell title="Client Directory">
      {/* --- ADD CUSTOMER CARD (Strict structural UI check) --- */}
      {isAdmin && (
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
      )}

      {/* --- SEARCH AND VIEW MODE TOGGLE BAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-4 items-end">
        <div className="md:col-span-2 relative">
          <Input 
            label="Search Customer" 
            value={searchTerm} 
            onChange={handleSearchChange} 
            placeholder="Search by Name, Shop, Mobile, or Route..."
            className="pl-10"
          />
          <div className="absolute left-3 bottom-3 text-slate-500">
            <Search size={16} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">View Mode</label>
          <Button 
            onClick={() => {
              setShowAll(!showAll);
              setCurrentPage(1);
            }} 
            className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-lg transition border cursor-pointer ${
              showAll 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
            }`}
          >
            {showAll ? <List size={14} /> : <Layers size={14} />}
            {showAll ? 'Switch to Pages (10 items)' : 'Show All Pages'}
          </Button>
        </div>
      </div>

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
                  {isAdmin ? (
                    <>
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
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 italic px-1">View Only</span>
                  )}
                </div>
              ),
            },
          ]}
          rows={finalDisplayedRows}
        />

        {/* --- DYNAMIC PAGINATION BAR --- */}
        {!showAll && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400">
              Showing <b className="text-slate-200">{filteredRows.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</b> to <b className="text-slate-200">{Math.min(currentPage * itemsPerPage, filteredRows.length)}</b> of <b className="text-slate-200">{filteredRows.length}</b> Customers
            </span>
            
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                Previous
              </Button>

              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <Button
                size="sm"
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* --- EDIT CUSTOMER POPUP MODAL (Double layer backup check) --- */}
      {isAdmin && isEditOpen && (
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