import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, todayISO } from './utils/helpers';

// Firebase Firestore imports
import { db } from './firebase'; 
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const Purchase = ({ purchases, setPurchases, suppliers = [], products = [], setProducts, cashData, setCashData, userRole }) => {
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

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingPurchase, setEditingPurchase] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Modal & Notification States
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm', // 'confirm', 'alert', 'success'
    onConfirm: null,
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showAlert = (message, title = 'Notification', type = 'alert') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: null,
    });
  };

  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
    });
  };

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
      showAlert('Unauthorized access. Only admins can create purchase entries.', 'Access Denied', 'alert');
      return;
    }
    if (!form.supplier || !form.product || !form.qty || !form.price) {
      showAlert('Supplier, product, quantity, and price are required.', 'Missing Information', 'alert');
      return;
    }

    try {
      setIsSubmitting(true);
      const qty = Number(form.qty);
      const price = Number(form.price);
      const total = qty * price;
      const customId = generateId();

      const matchedProduct = products.find(
        p => p.name && p.name.trim().toLowerCase() === form.product.trim().toLowerCase()
      );
      
      const entry = {
        id: customId,
        date: form.date,
        supplier: form.supplier,
        product: form.product,
        qty,
        price,
        total,
        paymentType: form.paymentType,
        items: [
          {
            productId: matchedProduct?.id || '',
            productName: form.product,
            qty,
            price,
            rate: price,
            total,
          }
        ]
      };

      await setDoc(doc(db, 'purchases', customId), entry);

      if (matchedProduct && matchedProduct.id) {
        await updateDoc(doc(db, 'products', matchedProduct.id), {
          purchaseRate: price,
          costPrice: price, 
          cost: price
        });
      }

      setPurchases([entry, ...purchases]);

      if (setProducts) {
        setProducts(prevProducts => 
          prevProducts.map(p => 
            (p.name && p.name.trim().toLowerCase() === form.product.trim().toLowerCase()) 
              ? { ...p, purchaseRate: price, costPrice: price, cost: price } 
              : p
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
      showToast('Purchase saved successfully!', 'success');
    } catch (error) {
      console.error("Firebase write error:", error);
      showAlert("Database me save karte hue error aya: " + error.message, "Error", "alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePurchase = (row) => {
    if (!isAdmin) {
      showAlert('Unauthorized action. Only admins can delete records.', 'Access Denied', 'alert');
      return;
    }

    const targetId = row.id || row._id;
    if (!targetId) {
      showAlert("Purchase entry ID missing.", "Error", "alert");
      return;
    }

    showConfirm(
      'Delete Purchase Entry',
      `Are you sure you want to delete purchase for "${row.product}"? This action cannot be undone.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'purchases', targetId));
          setPurchases(purchases.filter(p => (p.id !== targetId && p._id !== targetId)));
          showToast('Purchase entry deleted successfully', 'success');
        } catch (error) {
          console.error("Firebase deletion error:", error);
          showAlert("Database se delete karte hue error aya: " + error.message, "Error", "alert");
        }
      }
    );
  };

  const updatePurchase = async () => {
    if (!isAdmin) {
      showAlert('Unauthorized data modification attempt.', 'Access Denied', 'alert');
      return;
    }

    const targetId = editingPurchase.id || editingPurchase._id;
    if (!targetId) {
      showAlert("Purchase entry ID missing for execution.", "Error", "alert");
      return;
    }

    try {
      setIsSubmitting(true);
      const qty = Number(editingPurchase.qty) || 0;
      const price = Number(editingPurchase.price) || 0;
      const total = qty * price;

      const matchedProduct = products.find(
        p => p.name && p.name.trim().toLowerCase() === String(editingPurchase.product).trim().toLowerCase()
      );

      const updatedPayload = {
        ...editingPurchase,
        qty,
        price,
        total,
        items: [
          {
            productId: matchedProduct?.id || '',
            productName: editingPurchase.product,
            qty,
            price,
            rate: price,
            total,
          }
        ]
      };

      await updateDoc(doc(db, 'purchases', targetId), updatedPayload);

      if (matchedProduct && matchedProduct.id) {
        await updateDoc(doc(db, 'products', matchedProduct.id), {
          purchaseRate: price,
          costPrice: price,
          cost: price
        });
      }

      setPurchases(purchases.map(p => (p.id === targetId || p._id === targetId) ? updatedPayload : p));
      setEditingPurchase(null);
      showToast('Purchase entry updated successfully', 'success');
    } catch (error) {
      console.error("Firebase update path error:", error);
      showAlert("Database record update error: " + error.message, "Error", "alert");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 transition-all animate-bounce">
          <CheckCircle className="text-emerald-500" size={20} />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

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
                  <button onClick={() => showAlert(`Supplier: ${row.supplier}\nProduct: ${row.product}\nQty: ${row.qty}\nTotal: Rs. ${row.total}`, 'Purchase Preview', 'alert')} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer" title="Preview"><Eye size={18} /></button>
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

      {/* Edit Purchase Modal */}
      {isAdmin && editingPurchase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-800 text-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Edit Purchase Entry</h2>
              <button onClick={() => setEditingPurchase(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Quantity" type="number" value={editingPurchase.qty} onChange={(e) => setEditingPurchase({...editingPurchase, qty: e.target.value})} />
              <Input label="Purchase Rate" type="number" value={editingPurchase.price} onChange={(e) => setEditingPurchase({...editingPurchase, price: e.target.value})} />
            </div>
            <Button className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500" onClick={updatePurchase} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Custom Confirmation / Alert Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-white transform transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${modalConfig.type === 'confirm' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                {modalConfig.type === 'confirm' ? <AlertTriangle size={24} /> : <Info size={24} />}
              </div>
              <h3 className="text-lg font-bold">{modalConfig.title}</h3>
            </div>
            
            <p className="text-slate-300 text-sm mb-6 leading-relaxed whitespace-pre-line">
              {modalConfig.message}
            </p>

            <div className="flex justify-end gap-3">
              {modalConfig.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      setModalConfig({ ...modalConfig, isOpen: false });
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/20"
                  >
                    Delete Entry
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default Purchase;