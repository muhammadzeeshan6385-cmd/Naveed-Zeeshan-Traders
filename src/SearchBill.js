import React, { useState } from 'react';
import { Search, Printer, Edit, Trash2, X, Save, Eye } from 'lucide-react';
import { db } from './firebase';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';

const SearchBill = ({ title = "Search Bills", sales = [], setSales, products = [], customers = [], userRole = "operator" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // Admin Role Check
  const isAdmin = String(userRole || '').trim().toLowerCase() === 'admin';

  // Search Filtering
  const filteredSales = sales.filter((bill) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    
    const invoiceNo = String(bill.invoiceNo || bill.billNo || bill.id || '').toLowerCase();
    const customer = String(bill.customer || bill.customerName || '').toLowerCase();
    const date = String(bill.date || '').toLowerCase();
    
    return invoiceNo.includes(term) || customer.includes(term) || date.includes(term);
  });

  // Delete Bill Handler
  const handleDeleteBill = async (billId) => {
    if (!isAdmin) {
      alert("Aapke paas bill delete karne ki ijazat nahi hai.");
      return;
    }

    if (window.confirm("Kyu aap waqai is bill ko delete karna chahte hain? Stock rollback nahi hoga.")) {
      try {
        await deleteDoc(doc(db, "sales", String(billId)));
        alert("Bill safalta se delete ho gaya.");
        if (selectedBill?.id === billId) setSelectedBill(null);
      } catch (error) {
        console.error("Delete bill error:", error);
        alert("Bill delete karne mein masla aaya.");
      }
    }
  };

  // Open Edit Modal
  const handleStartEdit = (bill) => {
    setEditFormData(JSON.parse(JSON.stringify(bill)));
    setIsEditing(true);
  };

  // Save Edit Bill
  const handleSaveEdit = async () => {
    if (!editFormData || !editFormData.id) return;

    try {
      // Recalculate Totals
      let newTotal = 0;
      if (editFormData.items && Array.isArray(editFormData.items)) {
        newTotal = editFormData.items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
      }
      
      const discount = Number(editFormData.discount || 0);
      const netTotal = Math.max(0, newTotal - discount);

      const updatedBill = {
        ...editFormData,
        total: newTotal,
        netTotal: netTotal,
        updatedAt: new Date().toISOString()
      };

      if (setSales) {
        await setSales(updatedBill);
      } else {
        await setDoc(doc(db, "sales", String(updatedBill.id)), updatedBill, { merge: true });
      }

      alert("Bill kamyabi se update ho gaya!");
      setIsEditing(false);
      setSelectedBill(updatedBill);
    } catch (error) {
      console.error("Update bill error:", error);
      alert("Bill update nahi ho saka.");
    }
  };

  // Print Bill
  const handlePrint = (bill) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${bill.invoiceNo || bill.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h2 { text-align: center; margin-bottom: 5px; }
            p { margin: 2px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border-bottom: 1px dashed #000; text-align: left; padding: 6px 2px; font-size: 13px; }
            th { border-top: 1px dashed #000; }
            .total-sec { margin-top: 15px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>INVOICE</h2>
          <p><strong>Bill No:</strong> ${bill.invoiceNo || bill.id}</p>
          <p><strong>Customer:</strong> ${bill.customer || 'Cash Customer'}</p>
          <p><strong>Date:</strong> ${bill.date || new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${(bill.items || []).map(i => `
                <tr>
                  <td>${i.name || i.productName}</td>
                  <td>${i.qty}</td>
                  <td>${i.rate}</td>
                  <td>${Number(i.qty) * Number(i.rate)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-sec">
            <p>Net Total: Rs. ${bill.netTotal || bill.total || 0}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Search, print, edit or delete sales invoices</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Invoice # or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
          />
        </div>
      </div>

      {/* Bill Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <th className="p-4">Invoice #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Total Items</th>
                <th className="p-4">Net Amount</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No bills found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-semibold text-emerald-600 dark:emerald-400">
                      #{bill.invoiceNo || bill.id}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 font-medium text-slate-800 dark:text-white">
                      {bill.customer || 'Walk-in Customer'}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {bill.items?.length || 0}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      Rs. {Number(bill.netTotal || bill.total || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Button */}
                        <button
                          onClick={() => setSelectedBill(bill)}
                          title="View Details"
                          className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Eye size={18} />
                        </button>

                        {/* Print Button */}
                        <button
                          onClick={() => handlePrint(bill)}
                          title="Print Bill"
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        >
                          <Printer size={18} />
                        </button>

                        {/* ADMIN ONLY ACTIONS */}
                        {isAdmin && (
                          <>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEdit(bill)}
                              title="Edit Bill"
                              className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition"
                            >
                              <Edit size={18} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              title="Delete Bill"
                              className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW BILL MODAL */}
      {selectedBill && !isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedBill(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              Invoice #{selectedBill.invoiceNo || selectedBill.id}
            </h3>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
              <p><strong>Customer:</strong> {selectedBill.customer || 'Walk-in Customer'}</p>
              <p><strong>Date:</strong> {selectedBill.date}</p>
            </div>
            
            <div className="border-t border-b border-slate-200 dark:border-slate-800 py-3 my-3">
              <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Items:</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(selectedBill.items || []).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name || item.productName} (x{item.qty})</span>
                    <span className="font-semibold">Rs. {Number(item.qty || 0) * Number(item.rate || 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white mt-4">
              <span>Total Amount:</span>
              <span className="text-emerald-600">Rs. {Number(selectedBill.netTotal || selectedBill.total || 0).toLocaleString()}</span>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handlePrint(selectedBill)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
              >
                <Printer size={18} /> Print Invoice
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleStartEdit(selectedBill)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium"
                >
                  <Edit size={18} /> Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT BILL MODAL */}
      {isEditing && editFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              Edit Invoice #{editFormData.invoiceNo || editFormData.id}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editFormData.customer || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, customer: e.target.value })}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Discount (Rs.)</label>
                <input
                  type="number"
                  value={editFormData.discount || 0}
                  onChange={(e) => setEditFormData({ ...editFormData, discount: e.target.value })}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <h4 className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-200">Items List:</h4>
            <div className="space-y-3 mb-4">
              {(editFormData.items || []).map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                  <span className="flex-1 text-sm font-medium dark:text-white truncate">{item.name || item.productName}</span>
                  <div className="w-24">
                    <label className="text-[10px] text-slate-400 block">Qty</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => {
                        const updatedItems = [...editFormData.items];
                        updatedItems[idx].qty = Number(e.target.value);
                        setEditFormData({ ...editFormData, items: updatedItems });
                      }}
                      className="w-full p-1 border rounded dark:bg-slate-700 dark:text-white text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-slate-400 block">Rate</label>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => {
                        const updatedItems = [...editFormData.items];
                        updatedItems[idx].rate = Number(e.target.value);
                        setEditFormData({ ...editFormData, items: updatedItems });
                      }}
                      className="w-full p-1 border rounded dark:bg-slate-700 dark:text-white text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
              >
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBill;