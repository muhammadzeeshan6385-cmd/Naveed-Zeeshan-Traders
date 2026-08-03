import React, { useState, useMemo } from 'react';
import { Search, Printer, Edit, Trash2, Eye, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, getProductSaleRate } from './utils/helpers';

// Firebase Imports
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const SearchBill = ({ sales = [], setSales, products = [], customers = [], userRole, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  // Success Popup State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Confirmation Delete Modal State
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  // Edit Form States
  const [editCustomer, setEditCustomer] = useState('');
  const [editPaymentType, setEditPaymentType] = useState('Credit');
  const [editItems, setEditItems] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Strict Admin Check Permission
  const activeUsername = String(currentUser?.username || currentUser?.id || '').trim().toLowerCase();
  const activeRole = String(userRole || currentUser?.role || '').trim().toLowerCase();
  const isAdmin = activeUsername === 'admin' || activeRole === 'admin';

  // Search Filter Logic
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter((s) => {
      const invNo = String(s.invoiceNo || s.id || '').toLowerCase();
      const cust = String(s.customer || '').toLowerCase();
      const date = String(s.date || '').toLowerCase();
      const creator = String(s.createdBy || s.username || s.user || '').toLowerCase();
      return invNo.includes(term) || cust.includes(term) || date.includes(term) || creator.includes(term);
    });
  }, [sales, searchTerm]);

  // Calculations for Edit Mode
  const editGross = useMemo(() => editItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate)), 0), [editItems]);
  const editDiscountAmount = useMemo(() => editItems.reduce((sum, item) => {
    const itemGross = Number(item.qty) * Number(item.rate);
    const itemDiscAmount = itemGross * ((Number(item.discount) || 0) / 100);
    return sum + itemDiscAmount;
  }, 0), [editItems]);
  const editNetTotal = editGross - editDiscountAmount;

  // --- PRINT FUNCTIONALITY ---
  const handlePrint = (invoiceData) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const loggedUser = (typeof currentUser === 'string' ? currentUser : currentUser?.username || currentUser?.name) || localStorage.getItem('username') || '';

    const createdByUserName = (invoiceData && invoiceData.createdBy && invoiceData.createdBy !== 'System')
      ? invoiceData.createdBy
      : (invoiceData?.username || invoiceData?.user || invoiceData?.salesman || loggedUser || 'System');

    const fmt = (num) => {
      const parsed = Number(num) || 0;
      return parsed.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { size: A5; margin: 4mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; width: 138mm; margin: 0 auto; padding: 5px; color: #000; }
            .bill-container { border: 2px solid #000; padding: 10px; min-height: 180mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
            .header-container { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
            .logo { width: 65px; height: auto; }
            .title-section { flex: 1; text-align: center; }
            .title-section h1 { font-size: 17px; margin: 0; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
            .title-section p { font-size: 11px; margin: 2px 0 0 0; font-weight: 700; }
            
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; font-size: 11.5px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
            .meta-grid div { overflow: hidden; text-overflow: ellipsis; }

            table.items-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
            table.items-table th { border: 1px solid #000; padding: 4px 2px; background: #e5e7eb; font-size: 11px; font-weight: bold; }
            table.items-table td { border: 1px solid #000; padding: 4px 3px; text-align: center; font-size: 11px; }
            table.items-table td.product-name { text-align: left; padding-left: 6px; font-weight: 600; }
            
            .totals-container { width: 100%; margin-top: 8px; display: flex; justify-content: flex-end; }
            .totals-table { border-collapse: collapse; width: 240px; }
            .totals-table td { padding: 3px 6px; font-size: 11.5px; font-weight: bold; border: 1px solid #000; }
            .label-col { text-align: right; background: #f9fafb; }
            .amount-col { text-align: right; }
            
            .footer-container { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 5px; }
            .signature-box { text-align: center; border-top: 1px solid #000; width: 160px; padding-top: 3px; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
         <div class="bill-container">
          <div>
            <div class="header-container">
              <img src="/logo-dark.png" class="logo" alt="Logo" />
              <div class="title-section">
                <h1>Naveed & Zeeshan Traders, Mailsi</h1>
                <p>PH: 0300-3999866, 0307-6385852</p>
              </div>
            </div>
            
            <div class="meta-grid">
              <div><strong>Bill No:</strong> ${invoiceData.invoiceNo || invoiceData.id}</div>
              <div><strong>Customer:</strong> ${invoiceData.customer}</div>
              <div><strong>Date:</strong> ${invoiceData.date}</div>
              <div><strong>Time:</strong> ${invoiceData.time || new Date().toLocaleTimeString()}</div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 25px;">Ser</th>
                  <th>Product Name</th>
                  <th style="width: 40px;">Piece</th>
                  <th style="width: 65px;">Rate</th>
                  <th style="width: 65px;">Disc (Rs.)</th>
                  <th style="width: 75px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(invoiceData.items || []).map((i, idx) => {
                  const itemGross = Number(i.qty) * Number(i.rate);
                  const calcDiscRs = itemGross * ((Number(i.discount) || 0) / 100);
                  return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td class="product-name">${i.name}</td>
                    <td>${i.qty}</td>
                    <td>${fmt(i.rate)}</td>
                    <td>${calcDiscRs > 0 ? fmt(calcDiscRs) : '—'}</td>
                    <td>${fmt(i.total)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>

            <div class="totals-container">
              <table class="totals-table">
                <tr><td class="label-col">Grand Total:</td><td class="amount-col">Rs. ${fmt(invoiceData.grossTotal || invoiceData.netTotal)}</td></tr>
                <tr><td class="label-col">Discount:</td><td class="amount-col">Rs. ${fmt(invoiceData.discount || 0)}</td></tr>
                <tr><td class="label-col">Prev Balance:</td><td class="amount-col">Rs. ${fmt(invoiceData.prevBalance || 0)}</td></tr>
                <tr><td class="label-col" style="background:#e5e7eb;">Payable Amount:</td><td class="amount-col" style="background:#e5e7eb;">Rs. ${fmt(Number(invoiceData.netTotal) + Number(invoiceData.prevBalance || 0))}</td></tr>
              </table>
            </div>
          </div>

          <div class="footer-container">
            <div style="font-size: 11px; font-weight: bold;">
              Created By: <span style="text-transform: capitalize;">${createdByUserName}</span>
            </div>
            <div class="signature-box">
              Customer Signature
            </div>
          </div>    
          <script>window.onload = () => { window.print(); window.close(); }</script>
         </div>
        </body>
      </html>
    `);
  };

  // Open Edit Modal (Admin Only)
  const handleStartEdit = (invoice) => {
    if (!isAdmin) {
      window.alert("Apko Bill Edit krne ki Permission nahi hai! Sirf Admin Edit kar sakta hai.");
      return;
    }
    setSelectedInvoice(invoice);
    setEditCustomer(invoice.customer || '');
    setEditPaymentType(invoice.paymentType || 'Credit');
    setEditItems(invoice.items ? JSON.parse(JSON.stringify(invoice.items)) : []);
    setIsEditing(true);
  };

  // Edit Handlers for Item Table
  const handleAddEditProduct = (productName) => {
    if (!productName) return;
    const product = products.find((p) => p.name === productName);
    if (!product) return;

    const rate = getProductSaleRate(product);
    const existing = editItems.find((i) => i.name === product.name);

    if (existing) {
      setEditItems(editItems.map((i) => {
        if (i.name === product.name) {
          const newQty = Number(i.qty) + 1;
          const disc = Number(i.discount) || 0;
          const gross = newQty * i.rate;
          return { ...i, qty: newQty, total: gross - (gross * (disc / 100)) };
        }
        return i;
      }));
    } else {
      setEditItems([
        ...editItems,
        {
          id: Date.now().toString(),
          productId: product.id,
          name: product.name,
          rate,
          purchaseRate: product.purchaseRate || 0,
          qty: 1,
          discount: 0,
          total: rate
        }
      ]);
    }
  };

  const updateEditItemRow = (id, newQty, newDiscount) => {
    setEditItems(editItems.map((item) => {
      if (item.id === id) {
        const qty = Number(newQty);
        const discount = Number(newDiscount);
        const gross = qty * item.rate;
        return {
          ...item,
          qty,
          discount,
          total: gross - (gross * (discount / 100))
        };
      }
      return item;
    }));
  };

  const removeEditItem = (id) => {
    setEditItems(editItems.filter((item) => item.id !== id));
  };

  // Save Updated Invoice
  const handleSaveUpdatedBill = async () => {
    if (!editCustomer || editItems.length === 0) {
      window.alert("Customer select karein aur kam se kam aik item add karein.");
      return;
    }

    setIsSavingEdit(true);

    const updatedInvoice = {
      ...selectedInvoice,
      customer: editCustomer,
      paymentType: editPaymentType,
      items: editItems,
      grossTotal: editGross,
      discount: editDiscountAmount,
      netTotal: editNetTotal,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.username || currentUser?.name || 'Admin'
    };

    try {
      await setDoc(doc(db, "sales", String(selectedInvoice.id)), updatedInvoice, { merge: true });
      setSales(sales.map(s => s.id === selectedInvoice.id ? updatedInvoice : s));

      setIsEditing(false);
      setSelectedInvoice(null);
      setSuccessMessage("The bill has been updated successfully");
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Update Error:", err);
      window.alert("Bill Update karne mein masla aya: " + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // --- DELETE CONFIRMATION HANDLERS ---
  const handleRequestDelete = (invoice) => {
    if (!isAdmin) {
      window.alert("Apko Bill Delete krne ki Permission nahi hai! Sirf Admin Delete kar sakta hai.");
      return;
    }
    // Open Confirmation Modal
    setInvoiceToDelete(invoice);
    setShowConfirmDelete(true);
  };

  const confirmAndExecuteDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      // 1. Delete from Firebase DB
      await deleteDoc(doc(db, "sales", String(invoiceToDelete.id)));

      // 2. Remove from Local State
      setSales(sales.filter((s) => s.id !== invoiceToDelete.id));

      // 3. Close confirmation modal & show success message
      setShowConfirmDelete(false);
      setSuccessMessage("The Bill has been deleted from your record");
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Delete Error:", err);
      window.alert("Bill Delete karne mein error aya: " + err.message);
    } finally {
      setInvoiceToDelete(null);
    }
  };

  return (
    <PageShell title="Search & Manage Sales Bills" className="py-2">
      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <Search className="text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by Invoice No, Customer Name or Date (YYYY-MM-DD)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </Card>

      <Card title={`All Sales Bills (${filteredSales.length})`}>
        <DataTable
          columns={[
            { key: 'invoiceNo', label: 'Bill No', render: (r) => r.invoiceNo || r.id },
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'paymentType', label: 'Payment', render: (r) => r.paymentType || 'Credit' },
            { key: 'netTotal', label: 'Net Total', render: (r) => formatRs(r.netTotal) },
            { 
              key: 'createdBy', 
              label: 'Created By', 
              render: (r) => r.createdBy || r.username || r.user || r.salesman || 'System' 
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex gap-1.5 items-center">
                  <button
                    onClick={() => { setSelectedInvoice(row); setIsViewing(true); }}
                    title="View Details"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handlePrint(row)}
                    title="Reprint Bill"
                    className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-emerald-600"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleStartEdit(row)}
                      title="Edit Bill (Admin Only)"
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleRequestDelete(row)}
                      title="Delete Bill (Admin Only)"
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            }
          ]}
          rows={[...filteredSales].reverse()}
        />
      </Card>

      {/* --- VIEW BILL MODAL --- */}
      {isViewing && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold">Bill Details - {selectedInvoice.invoiceNo || selectedInvoice.id}</h3>
              <button onClick={() => setIsViewing(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Customer:</strong> {selectedInvoice.customer}</div>
              <div><strong>Date:</strong> {selectedInvoice.date}</div>
              <div><strong>Created By:</strong> {selectedInvoice.createdBy || selectedInvoice.username || selectedInvoice.user || 'System'}</div>
              <div><strong>Payment Type:</strong> {selectedInvoice.paymentType || 'Credit'}</div>
              <div><strong>Prev Balance:</strong> {formatRs(selectedInvoice.prevBalance || 0)}</div>
              <div><strong>Net Amount:</strong> {formatRs(selectedInvoice.netTotal)}</div>
              <div><strong>Payable Amount:</strong> {formatRs(Number(selectedInvoice.netTotal) + Number(selectedInvoice.prevBalance || 0))}</div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left border">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="p-2 border">Product</th>
                    <th className="p-2 border">Qty</th>
                    <th className="p-2 border">Rate</th>
                    <th className="p-2 border">Disc (%)</th>
                    <th className="p-2 border">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || []).map((i, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 border">{i.name}</td>
                      <td className="p-2 border">{i.qty}</td>
                      <td className="p-2 border">{formatRs(i.rate)}</td>
                      <td className="p-2 border">{i.discount || 0}%</td>
                      <td className="p-2 border">{formatRs(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => handlePrint(selectedInvoice)} className="bg-emerald-600 text-white flex items-center gap-1"><Printer size={16} /> Print</Button>
              <Button onClick={() => setIsViewing(false)} className="bg-slate-500 text-white">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT BILL MODAL --- */}
      {isEditing && selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                Edit Bill #{selectedInvoice.invoiceNo || selectedInvoice.id}
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select label="Customer" value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)}>
                <option value="">Select Customer</option>
                <option value="Walk-in Customer">Walk-in Customer</option>
                {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
              <Select label="Payment Type" value={editPaymentType} onChange={(e) => setEditPaymentType(e.target.value)}>
                <option value="Credit">Credit</option>
                <option value="Cash">Cash</option>
              </Select>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
              <label className="text-xs font-semibold">Add New Item to Bill:</label>
              <Select onChange={(e) => { handleAddEditProduct(e.target.value); e.target.value = ''; }}>
                <option value="">-- Choose Item --</option>
                {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="p-2 border">Ser</th>
                    <th className="p-2 border">Product</th>
                    <th className="p-2 border" style={{ width: '80px' }}>Qty</th>
                    <th className="p-2 border">Rate</th>
                    <th className="p-2 border" style={{ width: '80px' }}>Disc %</th>
                    <th className="p-2 border">Total</th>
                    <th className="p-2 border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b">
                      <td className="p-2 border">{idx + 1}</td>
                      <td className="p-2 border font-medium">{item.name}</td>
                      <td className="p-2 border">
                        <Input type="number" value={item.qty} onChange={(e) => updateEditItemRow(item.id, e.target.value, item.discount)} />
                      </td>
                      <td className="p-2 border">{formatRs(item.rate)}</td>
                      <td className="p-2 border">
                        <Input type="number" value={item.discount || ''} placeholder="0" onChange={(e) => updateEditItemRow(item.id, item.qty, e.target.value)} />
                      </td>
                      <td className="p-2 border font-bold">{formatRs(item.total)}</td>
                      <td className="p-2 border">
                        <button onClick={() => removeEditItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm">
                <div>Gross: <strong>{formatRs(editGross)}</strong></div>
                <div>Discount: <strong>{formatRs(editDiscountAmount)}</strong></div>
                <div>Prev Balance: <strong>{formatRs(selectedInvoice.prevBalance || 0)}</strong></div>
                <div className="text-base text-emerald-600 font-bold">
                  Payable: {formatRs(editNetTotal + Number(selectedInvoice.prevBalance || 0))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsEditing(false)} className="bg-slate-500 text-white">Cancel</Button>
                <Button onClick={handleSaveUpdatedBill} disabled={isSavingEdit} className="bg-blue-600 text-white">
                  {isSavingEdit ? 'Saving Updates...' : 'Save & Update Bill'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {showConfirmDelete && invoiceToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle size={36} className="stroke-[2.5]" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Are you sure you want to delete this bill?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bill No: <span className="font-semibold text-slate-700 dark:text-slate-200">{invoiceToDelete.invoiceNo || invoiceToDelete.id}</span>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowConfirmDelete(false)}
                className="w-1/2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium py-2 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAndExecuteDelete}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-xl"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS POPUP MODAL --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={40} className="stroke-[2.5]" />
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {successMessage}
            </h3>

            <div className="pt-2">
              <Button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-xl"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default SearchBill;