import React, { useState } from 'react';
import { Button, Card, DataTable, Input, PageShell } from './components/ui';
import { formatRs } from './utils/helpers';
import { Edit, Trash2, Printer, Plus } from 'lucide-react';

// Firebase Imports
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const SearchBills = ({ sales = [], setSales, products = [], currentUser, handlePrint }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal Edit States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Flexible Admin Check
  const userStr = JSON.stringify(currentUser || {}).toLowerCase();
  const isAdmin = userStr.includes('admin') || !currentUser || currentUser?.role === 'admin';

  // Search Filter
  const filteredSales = (sales || []).filter((bill) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      (bill.invoiceNo && bill.invoiceNo.toLowerCase().includes(term)) ||
      (bill.customer && bill.customer.toLowerCase().includes(term))
    );
  });

  // Open Full Itemized Edit Modal
  const handleOpenEditModal = (bill) => {
    setEditingBill({ ...bill });
    setEditItems(bill.items ? JSON.parse(JSON.stringify(bill.items)) : []);
    setEditModalOpen(true);
  };

  // Item Row Level Changes (Qty / Rate / Discount)
  const handleItemChange = (itemId, field, value) => {
    setEditItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: Number(value) };
        const qty = Number(updatedItem.qty) || 0;
        const rate = Number(updatedItem.rate) || 0;
        const discPercent = Number(updatedItem.discount) || 0;
        
        const gross = qty * rate;
        const discRs = gross * (discPercent / 100);
        updatedItem.total = gross - discRs;

        return updatedItem;
      }
      return item;
    }));
  };

  // Remove Item from Bill Modal
  const handleRemoveItem = (itemId) => {
    setEditItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Add Item inside Edit Modal
  const handleAddItemToBill = (productName) => {
    if (!productName) return;
    const prod = products?.find(p => p.name === productName);
    if (!prod) return;

    const rate = Number(prod.saleRate || prod.price || 0);
    const newItem = {
      id: Date.now() + Math.random(),
      productId: prod.id,
      name: prod.name,
      qty: 1,
      rate: rate,
      discount: 0,
      total: rate
    };

    setEditItems(prev => [...prev, newItem]);
    setSelectedProductToAdd('');
  };

  // Safe Save Full Updated Bill to Firebase & Local State
  const handleSaveFullBill = async () => {
    if (editItems.length === 0) {
      window.alert("Bill me kam se kam 1 item honi chahiye!");
      return;
    }

    setIsSaving(true);

    // Recalculate Totals safely
    const newGross = editItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
    const newTotalDisc = editItems.reduce((sum, item) => {
      const gross = Number(item.qty || 0) * Number(item.rate || 0);
      return sum + (gross * ((Number(item.discount) || 0) / 100));
    }, 0);
    const newNetTotal = newGross - newTotalDisc;

    const updatedBillObj = {
      ...editingBill,
      items: editItems,
      grossTotal: newGross,
      discount: newTotalDisc,
      netTotal: newNetTotal,
      lastEditedAt: new Date().toISOString()
    };

    try {
      // 1. Safe Document Reference Key Mismatch Handler
      const docId = String(updatedBillObj.id || updatedBillObj.invoiceNo);
      
      // Direct Firebase Save
      await setDoc(doc(db, "sales", docId), updatedBillObj, { merge: true });

      // 2. Safe React State Update
      if (typeof setSales === 'function') {
        setSales(prevSales => (prevSales || []).map(s => String(s.id || s.invoiceNo) === docId ? updatedBillObj : s));
      }

      setEditModalOpen(false);
      window.alert("Bill kamyabi se update ho gaya hai!");
    } catch (err) {
      console.error("Bill Edit Error: ", err);
      window.alert("Bill database par update nahi ho saka: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Bill
  const handleDeleteBill = async (bill) => {
    if (!window.confirm(`Kya aap Bill No: ${bill.invoiceNo} delete karna chahte hain?`)) return;

    try {
      const docId = String(bill.id || bill.invoiceNo);
      await deleteDoc(doc(db, "sales", docId));
      if (typeof setSales === 'function') {
        setSales(prev => (prev || []).filter(s => String(s.id || s.invoiceNo) !== docId));
      }
      window.alert("Bill delete ho gaya hai.");
    } catch (err) {
      window.alert("Delete Error: " + err.message);
    }
  };

  // Modal Net Calculations live
  const modalGross = editItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const modalDisc = editItems.reduce((sum, item) => {
    const gross = Number(item.qty || 0) * Number(item.rate || 0);
    return sum + (gross * ((Number(item.discount) || 0) / 100));
  }, 0);
  const modalNetTotal = modalGross - modalDisc;

  return (
    <PageShell title="Search Bills">
      <Card title="Find & Reprint Bills">
        <div className="mb-4">
          <Input
            placeholder="Search by Bill No or Customer Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <DataTable
          columns={[
            { key: 'invoiceNo', label: 'Bill No' },
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'netTotal', label: 'Total', render: (row) => formatRs(row.netTotal) },
            {
              key: 'actions',
              label: 'Action',
              render: (row) => (
                <div className="flex gap-2 items-center">
                  <Button variant="secondary" onClick={() => handlePrint && handlePrint(row)}>
                    <Printer className="w-4 h-4 mr-1 inline" /> Reprint
                  </Button>

                  <button
                    onClick={() => handleOpenEditModal(row)}
                    title="Edit Full Bill Items"
                    className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-500 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteBill(row)}
                      title="Delete Bill"
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          rows={[...filteredSales].reverse()}
        />
      </Card>

      {/* --- FULL ITEMIZED BILL EDIT MODAL --- */}
      {editModalOpen && editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Edit Bill Items (Bill No: {editingBill.invoiceNo})
                </h3>
                <p className="text-xs text-slate-400">Customer: {editingBill.customer} | Date: {editingBill.date}</p>
              </div>
              <button 
                onClick={() => setEditModalOpen(false)} 
                className="text-slate-400 hover:text-white font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {/* Add New Item Row in Modal */}
            <div className="mb-4 flex gap-2">
              <select
                value={selectedProductToAdd}
                onChange={(e) => setSelectedProductToAdd(e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-800 dark:text-white"
              >
                <option value="">Select Item to Add in this Bill...</option>
                {products?.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <Button onClick={() => handleAddItemToBill(selectedProductToAdd)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1 inline" /> Add Item
              </Button>
            </div>

            {/* Item Table inside Modal */}
            <div className="flex-1 overflow-y-auto mb-4 border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Product</th>
                    <th className="p-3 w-28">Qty</th>
                    <th className="p-3 w-32">Rate (Rs)</th>
                    <th className="p-3 w-28">Disc (%)</th>
                    <th className="p-3">Total</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {editItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-medium text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{item.name}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.discount || 0}
                          onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-1 text-center font-bold text-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="p-3 font-bold text-emerald-400">{formatRs(item.total)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer / Calculation Summary */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-4 text-sm font-semibold">
                <span className="text-slate-400">Gross: {formatRs(modalGross)}</span>
                <span className="text-red-400">Disc: {formatRs(modalDisc)}</span>
                <span className="text-emerald-400 text-base font-bold">Net Total: {formatRs(modalNetTotal)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSaveFullBill} 
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </PageShell>
  );
};

export default SearchBills;