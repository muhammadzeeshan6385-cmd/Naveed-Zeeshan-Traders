import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, X } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, todayISO } from './utils/helpers';

// Firebase Firestore imports
import { db } from './firebase'; 
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const Purchase = ({ purchases, setPurchases, suppliers = [], products = [], setProducts, cashData, setCashData, userRole }) => {
  // Case-insensitivity aur format patterns ko handle karne ke liye security state
  const isAdmin = userRole && typeof userRole === 'string' && userRole.toLowerCase().trim() === 'admin';

  const [form, setForm] = useState({
    date: todayISO(),
    supplier: '',
    product: '',
    qty: '',
    price: '',
    paymentType: 'Credit',
    account: 'Cash',
  });

  // Search, Edit Popup aur Dynamic Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingPurchase, setEditingPurchase] = useState(null); // Edit Popup modal state
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const addPurchase = async () => {
    if (!isAdmin) {
      window.alert('Unauthorized access. Only admins can create purchase entries.');
      return;
    }
    if (!form.supplier || !form.product || !form.qty || !form.price) {
      window.alert('Supplier, product, quantity, and price are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const qty = Number(form.qty);
      const price = Number(form.price);
      const total = qty * price;
      const customId = generateId();
      
      const entry = {
        id: customId,
        date: form.date,
        supplier: form.supplier,
        product: form.product,
        qty,
        price,
        total,
        paymentType: form.paymentType,
      };

      // Firebase Firestore sync path
      await setDoc(doc(db, 'purchases', customId), entry);

      setPurchases([entry, ...purchases]);

      if (setProducts) {
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p.name === form.product ? { ...p, purchaseRate: Number(price) } : p
          )
        );
      }

      if (form.paymentType === 'Cash' && setCashData) {
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
      setCurrentPage(1); 
      window.alert('Purchase saved to database and Product rate updated!');
    } catch (error) {
      console.error("Firebase write error:", error);
      window.alert("Database me save karte hue error aya: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePurchase = async (row) => {
    if (!isAdmin) {
      window.alert('Unauthorized action. Only admins can delete records.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this purchase entry?')) {
      const targetId = row.id || row._id;
      if (!targetId) {
        window.alert("Purchase entry ID missing.");
        return;
      }

      try {
        await deleteDoc(doc(db, 'purchases', targetId));
        setPurchases(purchases.filter(p => (p.id !== targetId && p._id !== targetId)));
        console.log("Purchase successfully deleted from Firebase.");
      } catch (error) {
        console.error("Firebase deletion error:", error);
        window.alert("Database se delete karte hue error aya: " + error.message);
      }
    }
  };

  const updatePurchase = async () => {
    if (!isAdmin) {
      window.alert('Unauthorized data modification attempt.');
      return;
    }

    const targetId = editingPurchase.id || editingPurchase._id;
    if (!targetId) {
      window.alert("Purchase entry ID missing for execution.");
      return;
    }

    try {
      setIsSubmitting(true);
      const qty = Number(editingPurchase.qty) || 0;
      const price = Number(editingPurchase.price) || 0;
      const total = qty * price;

      const updatedPayload = {
        ...editingPurchase,
        qty,
        price,
        total
      };

      await updateDoc(doc(db, 'purchases', targetId), updatedPayload);

      setPurchases(purchases.map(p => (p.id === targetId || p._id === targetId) ? updatedPayload : p));
      setEditingPurchase(null);
      console.log("Purchase updated successfully inside Firestore.");
    } catch (error) {
      console.error("Firebase update path error:", error);
      window.alert("Database record update error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SEARCH AND PAGINATION LOGIC ---
  const filteredPurchases = useMemo(() => {
    const reversed = [...purchases];
    if (!searchQuery.trim()) return reversed;
    
    const query = searchQuery.toLowerCase();
    return reversed.filter(p => 
      (p.supplier && p.supplier.toLowerCase().includes(query)) ||
      (p.product && p.product.toLowerCase().includes(query))
    );
  }, [purchases, searchQuery]);

  const paginatedPurchases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPurchases, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  return (
    <PageShell title="Procurement">
      {/* Form Add Box Layer - Admin Access Controlled */}
      {isAdmin && (
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
          <Button className="mt-4" onClick={addPurchase} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Purchase'}
          </Button>
        </Card>
      )}

      <Card title="Recent Purchases" className="mt-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
          <div className="w-full max-w-md">
            <Input 
              placeholder="Search by Supplier or Product..." 
              value={searchQuery} 
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); 
              }} 
            />
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto text-sm">
            <span className="text-slate-400">Show:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#0f172a] text-white border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer text-sm font-medium"
            >
              <option value={10}>10 Purchases</option>
              <option value={25}>25 Purchases</option>
              <option value={50}>50 Purchases</option>
              <option value={100}>100 Purchases</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'product', label: 'Product' },
            { key: 'qty', label: 'Qty' },
            { key: 'price', label: 'Rate' },
            { key: 'total', label: 'Total', render: (row) => `Rs. ${Number(row.total).toLocaleString()}` },
            { key: 'paymentType', label: 'Payment' },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => alert('Viewing Invoice Details: ' + row.product)} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer" title="Preview"><Eye size={18} /></button>
                  
                  {/* Dynamic strict checking module layer */}
                  {isAdmin && (
                    <>
                      <button onClick={() => setEditingPurchase(row)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded cursor-pointer" title="Edit"><Pencil size={18} /></button>
                      <button onClick={() => deletePurchase(row)} className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded cursor-pointer" title="Delete"><Trash2 size={18} /></button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={paginatedPurchases}
        />

        {/* Pagination UI Control */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="text-sm text-slate-400">
              Showing {filteredPurchases.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPurchases.length)} of {filteredPurchases.length} entries
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1 text-xs"
              >
                Previous
              </Button>
              
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1;
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-xs ${currentPage === pageNum ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Purchase Popup Modal Portal - Double Shield Validation */}
      {isAdmin && editingPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">Edit Purchase Entry</h2>
              <button onClick={() => setEditingPurchase(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Quantity" type="number" value={editingPurchase.qty} onChange={(e) => setEditingPurchase({...editingPurchase, qty: e.target.value})} />
              <Input label="Purchase Rate" type="number" value={editingPurchase.price} onChange={(e) => setEditingPurchase({...editingPurchase, price: e.target.value})} />
            </div>
            <Button className="w-full mt-6" onClick={updatePurchase} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default Purchase;