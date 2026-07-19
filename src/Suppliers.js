import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { Eye, DollarSign, X, Printer, CheckCircle } from 'lucide-react';

const Suppliers = ({ 
  suppliers = [], 
  setSuppliers, 
  purchases = [], 
  payments = [], 
  onSavePayment,
  userRole
}) => {
  
  // --- ROLES & PERMISSIONS SECURITY LAYER ---
  const isAdmin = userRole && typeof userRole === 'string' && userRole.toLowerCase().trim() === 'admin';

  // --- STATES ---
  const [form, setForm] = useState({ 
    name: '', 
    company: '', 
    phone: '', 
    address: '', 
    openingBalance: '',
    isSelfProduction: false 
  });
  
  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    company: '',
    phone: '',
    address: '',
    openingBalance: '',
    isSelfProduction: false
  });

  // Success Tick Popup State
  const [showSuccessTick, setShowSuccessTick] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Payment Form State
  const [payForm, setPayForm] = useState({
    supplierName: '',
    amount: '',
    mode: 'Cash', 
    transferFrom: '',
    transferTo: '',
    receiptUrl: '', 
    description: ''
  });

  // Modal Popups ki state
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState(null);

  // --- SHOW TICK POPUP FUNCTION ---
  const triggerSuccessTick = (msg) => {
    setSuccessMessage(msg);
    setShowSuccessTick(true);
    setTimeout(() => {
      setShowSuccessTick(false);
    }, 2000); 
  };

  // --- SELF PRODUCTION TOGGLE HANDLER ---
  const handleSelfProductionToggle = (checked) => {
    if (!isAdmin) return; // Strict boundary check
    if (checked) {
      setForm({
        ...form,
        isSelfProduction: true,
        name: form.name || 'Naveed Zeeshan Production',
        company: 'Self-Production Unit',
        address: 'In-House'
      });
    } else {
      setForm({
        ...form,
        isSelfProduction: false,
        name: '',
        company: '',
        address: ''
      });
    }
  };

  // --- NAYA VENDOR ADD KARNA ---
  const addSupplier = () => {
    if (!isAdmin) {
      window.alert('Unauthorized action. Only administrators can perform this data operational task.');
      return;
    }
    if (!form.name.trim()) {
      window.alert('Supplier / Unit name is required.');
      return;
    }

    if (setSuppliers) {
      setSuppliers([
        ...suppliers,
        {
          id: Date.now().toString(),
          name: form.name.trim(),
          company: form.company.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          openingBalance: Number(form.openingBalance) || 0,
          isSelfProduction: form.isSelfProduction,
          createdAt: new Date().toISOString()
        },
      ]);
    }
    
    setForm({ name: '', company: '', phone: '', address: '', openingBalance: '', isSelfProduction: false });
    triggerSuccessTick('New supplier added successfully!');
  };

  // --- EXISTING VENDOR UPDATE KARNA (MODAL SE) ---
  const updateSupplierDetails = () => {
    if (!isAdmin) {
      window.alert('Unauthorized data modification attempt.');
      return;
    }
    if (!editForm.name.trim()) {
      window.alert('Supplier / Unit name is required.');
      return;
    }

    if (setSuppliers) {
      const updatedSuppliers = suppliers.map((s) => {
        if (s.id === editForm.id || s._id === editForm.id) {
          return {
            ...s,
            name: editForm.name.trim(),
            company: editForm.company.trim(),
            phone: editForm.phone.trim(),
            address: editForm.address.trim(),
            openingBalance: Number(editForm.openingBalance) || 0,
            isSelfProduction: editForm.isSelfProduction
          };
        }
        return s;
      });
      setSuppliers(updatedSuppliers);
    }

    setIsEditModalOpen(false); 
    triggerSuccessTick('Supplier changes & balance updated!');
  };

  // --- PAYMENT RECIEPT UPLOAD HANDLER ---
  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPayForm({ ...payForm, receiptUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- VENDOR PAYMENT SAVE KARNA ---
  const savePayment = async () => {
    if (!isAdmin) {
      window.alert('Unauthorized action. Payment operations are locked to admins.');
      return;
    }
    if (!payForm.supplierName) {
      window.alert('Please select a supplier / unit.');
      return;
    }
    if (!payForm.amount || Number(payForm.amount) <= 0) {
      window.alert('Please enter a valid payment amount.');
      return;
    }
    if (payForm.mode === 'Bank' && (!payForm.transferFrom.trim() || !payForm.transferTo.trim())) {
      window.alert('Please provide "Transfer From" and "Transfer To" details for Bank Transfer.');
      return;
    }

    const selectedVendorObj = suppliers.find(s => s.name === payForm.supplierName);
    const isSelfPay = selectedVendorObj?.isSelfProduction;

    const newPayment = {
      supplierName: payForm.supplierName,
      amount: Number(payForm.amount),
      mode: payForm.mode,
      transferFrom: payForm.mode === 'Bank' ? payForm.transferFrom.trim() : '-',
      transferTo: payForm.mode === 'Bank' ? payForm.transferTo.trim() : '-',
      receiptUrl: payForm.mode === 'Bank' ? payForm.receiptUrl : '',
      description: payForm.description.trim() || (isSelfPay 
        ? `Internal funds transfer to production unit (${payForm.mode})` 
        : `Payment paid to vendor (${payForm.mode})`),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    if (onSavePayment) {
      await onSavePayment(newPayment);
    }
    
    setPayForm({
      supplierName: '',
      amount: '',
      mode: 'Cash',
      transferFrom: '',
      transferTo: '',
      receiptUrl: '',
      description: ''
    });

    triggerSuccessTick('Payment saved successfully!');
  };

  // --- DYNAMIC CALCULATIONS USING DATA STRUCT ---
  const supplierRows = useMemo(() => {
    return suppliers.map((supplier) => {
      const targetName = String(supplier.name || '').trim().toLowerCase();

      const supPurchasesList = purchases.filter((p) => {
        const purchaseSupplier = p.Supplier || p.supplierName || p.supplier;
        return purchaseSupplier && String(purchaseSupplier).trim().toLowerCase() === targetName;
      });

      const purchaseTotal = supPurchasesList.reduce((sum, p) => {
        let totalVal = p.total;
        if (typeof totalVal === 'string') totalVal = totalVal.replace(/[^\d.]/g, ''); 
        return sum + Number(totalVal || 0);
      }, 0);

      const purchaseLedgerEntries = supPurchasesList.map(p => {
        let amt = p.total;
        if (typeof amt === 'string') amt = amt.replace(/[^\d.]/g, '');
        return {
          date: p.date || p.createdAt ? new Date(p.date || p.createdAt).toLocaleDateString() : '—',
          description: `Invoice: ${p.invoiceNo || 'N/A'} - ${p.product || 'Procurement'}`,
          mode: 'Credit (Bill)',
          debit: 0,
          credit: Number(amt || 0)
        };
      });
      
      const supPaymentsList = payments.filter((pay) => {
        const paySupplier = pay.supplierName || pay.Supplier || pay.supplier;
        return paySupplier && String(paySupplier).trim().toLowerCase() === targetName;
      });

      const paidTotal = supPaymentsList.reduce((sum, pay) => {
        let payAmt = pay.amount;
        if (typeof payAmt === 'string') payAmt = payAmt.replace(/[^\d.]/g, '');
        return sum + Number(payAmt || 0);
      }, 0);

      const paymentLedgerEntries = supPaymentsList.map(pay => {
        let payAmt = pay.amount;
        if (typeof payAmt === 'string') payAmt = payAmt.replace(/[^\d.]/g, '');
        return {
          date: pay.date || '—',
          description: pay.description || `Amount paid via ${pay.mode}`,
          mode: pay.mode || 'Cash',
          debit: Number(payAmt || 0),
          credit: 0,
          receiptUrl: pay.receiptUrl || ''
        };
      });

      const rawLedger = [...purchaseLedgerEntries, ...paymentLedgerEntries];
      let runningBalance = Number(supplier.openingBalance || 0);
      const sortedAndCalculatedLedger = rawLedger.map(tx => {
        runningBalance = runningBalance + tx.credit - tx.debit;
        return { ...tx, balance: runningBalance };
      });

      const remainingBalance = Number(supplier.openingBalance || 0) + purchaseTotal - paidTotal;

      return {
        ...supplier,
        purchaseTotal,
        paidTotal,
        remainingBalance,
        ledgerHistory: sortedAndCalculatedLedger
      };
    });
  }, [suppliers, purchases, payments]);

  // --- COMPACT PRINT ACTION ---
  const executePrintAction = (supplierData) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    let rowsHtml = `
      <tr style="line-height: 1.1;">
        <td style="padding: 2px 5px; border: 1px solid #94a3b8; text-align: center;">—</td>
        <td style="padding: 2px 5px; border: 1px solid #94a3b8; font-weight: bold;">Opening Bal</td>
        <td style="padding: 2px 5px; border: 1px solid #94a3b8;">Opening Account Balance (Setup Date)</td>
        <td style="padding: 2px 5px; border: 1px solid #94a3b8; text-align: right;">—</td>
        <td style="padding: 2px 5px; border: 1px solid #94a3b8; text-align: right;">${Number(supplierData.openingBalance || 0).toLocaleString()}</td>
        <td style="padding: 2px 5px; border: 1px solid #94a3b8; text-align: right; font-weight: bold;">${Number(supplierData.openingBalance || 0).toLocaleString()}</td>
      </tr>
    `;

    supplierData.ledgerHistory.forEach(row => {
      rowsHtml += `
        <tr style="line-height: 1.1;">
          <td style="padding: 2px 5px; border: 1px solid #94a3b8; white-space: nowrap; text-align: center; font-size: 10px;">${row.date}</td>
          <td style="padding: 2px 5px; border: 1px solid #94a3b8; font-weight: 500; font-size: 10px;">${row.mode}</td>
          <td style="padding: 2px 5px; border: 1px solid #94a3b8; font-size: 10px; max-width: 250px; break-words: break-all;">${row.description}</td>
          <td style="padding: 2px 5px; border: 1px solid #94a3b8; text-align: right; font-weight: bold; font-size: 10px;">${row.debit > 0 ? Number(row.debit).toLocaleString() : '—'}</td>
          <td style="padding: 2px 5px; border: 1px solid #94a3b8; text-align: right; font-weight: bold; font-size: 10px;">${row.credit > 0 ? Number(row.credit).toLocaleString() : '—'}</td>
          <td style="padding: 2px 5px; border: 1px solid #94a3b8; text-align: right; font-weight: bold; font-size: 10px;">${Number(row.balance).toLocaleString()}</td>
        </tr>
      `;
    });

    const fullHtml = `
      <html>
        <head>
          <title>Ledger - ${supplierData.name}</title>
          <style>
            @page { size: portrait; margin: 8mm 6mm; }
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; color: #000; background: #fff; font-size: 11px; }
            .header-zone { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 2px; }
            .header-zone h1 { margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .info-box { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
            .info-box td { padding: 2px 4px; border: 1px solid #94a3b8; }
            .info-title { font-weight: bold; background: #f1f5f9; width: 18%; }
            table.ledger-table { width: 100%; border-collapse: collapse; }
            table.ledger-table th { background: #f1f5f9; padding: 3px 5px; border: 1px solid #475569; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header-zone">
            <h1>NAVEED & ZEESHAN TRADERS</h1>
            <h3>SUPPLIER ACCOUNT STATEMENT</h3>
          </div>
          <table class="info-box">
            <tr>
              <td class="info-title">Supplier Name:</td>
              <td style="font-weight: bold;">${supplierData.name}</td>
              <td class="info-title">Net Balance:</td>
              <td style="font-weight: bold;">Rs. ${Number(supplierData.remainingBalance).toLocaleString()}</td>
            </tr>
          </table>
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Description</th><th>Debit (Paid)</th><th>Credit (Bill)</th><th>Balance</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); printWindow.close(); };
  };

  return (
    <PageShell title="Vendors & Account Ledger">
      
      {/* SECTION 1: ADD VENDOR & RECORD PAYMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card: Add Vendor Only */}
        {isAdmin ? (
          <Card title="Add Vendor" className="lg:col-span-1">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 mb-1">
                <input 
                  type="checkbox" 
                  id="isSelfProduction"
                  checked={form.isSelfProduction}
                  onChange={(e) => handleSelfProductionToggle(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 cursor-pointer"
                />
                <label htmlFor="isSelfProduction" className="text-xs font-bold text-emerald-400 cursor-pointer select-none">
                  Is Self-Production Unit?
                </label>
              </div>

              <Input 
                label={form.isSelfProduction ? "Production Unit Name" : "Supplier Name"} 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />
              <Input 
                label="Company / Firm" 
                value={form.company} 
                onChange={(e) => setForm({ ...form, company: e.target.value })} 
                disabled={form.isSelfProduction} 
              />
              <Input 
                label="Phone" 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              />
              <Input 
                label="Address" 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
                disabled={form.isSelfProduction} 
              />
              <Input 
                label={form.isSelfProduction ? "Initial Cost" : "Opening Balance"} 
                type="number" 
                value={form.openingBalance} 
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} 
                placeholder="0"
              />
            </div>
            
            <Button className="w-full mt-6" onClick={addSupplier}>
              {form.isSelfProduction ? 'Save Production Unit' : 'Save Supplier'}
            </Button>
          </Card>
        ) : (
          <Card title="Add Vendor" className="lg:col-span-1 opacity-60">
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[300px] text-slate-500 text-xs italic">
              Vendor creation is restricted to administrators only.
            </div>
          </Card>
        )}

        {/* Card: Record Vendor Payment */}
        {isAdmin ? (
          <Card title="Record Payment / Fund Transfer" className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                label="Select Vendor / Production Unit" 
                value={payForm.supplierName} 
                onChange={(e) => setPayForm({ ...payForm, supplierName: e.target.value })}
              >
                <option value="">-- Select Recipient --</option>
                {suppliers.map((s, idx) => (
                  <option key={s.id || idx} value={s.name}>
                    {s.name} {s.isSelfProduction ? '(Self-Production)' : `(${s.company || 'No Company'})`}
                  </option>
                ))}
              </Select>

              <Select 
                label="Payment Mode" 
                value={payForm.mode} 
                onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}
              >
                <option value="Cash">Cash Mode</option>
                <option value="Bank">Bank Transfer</option>
              </Select>

              <Input 
                label="Amount to Pay / Transfer (Rs.)" 
                type="number" 
                value={payForm.amount} 
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} 
                placeholder="0.00"
              />

              <Input 
                label="Description" 
                value={payForm.description} 
                onChange={(e) => setPayForm({ ...payForm, description: e.target.value })} 
              />

              {payForm.mode === 'Bank' && (
                <>
                  <Input 
                    label="Transfer From" 
                    value={payForm.transferFrom} 
                    onChange={(e) => setPayForm({ ...payForm, transferFrom: e.target.value })} 
                  />
                  <Input 
                    label="Transfer To" 
                    value={payForm.transferTo} 
                    onChange={(e) => setPayForm({ ...payForm, transferTo: e.target.value })} 
                  />
                  <div className="col-span-1 md:col-span-2">
                    <input type="file" accept="image/*" onChange={handleReceiptUpload} className="w-full text-xs text-slate-400 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800" />
                  </div>
                </>
              )}
            </div>
            <Button className="mt-6 w-full flex items-center justify-center gap-2" onClick={savePayment}>
              <DollarSign size={16} /> Save Payment Record
            </Button>
          </Card>
        ) : (
          <Card title="Record Payment / Fund Transfer" className="lg:col-span-2 opacity-60">
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[300px] text-slate-500 text-xs italic">
              Payment recording is restricted to administrators only.
            </div>
          </Card>
        )}
      </div>

      {/* SECTION 2: SUPPLIER DIRECTORY */}
      <div className="mt-6">
        <Card title="Supplier Accounts & Balances">
          <DataTable
            columns={[
              { 
                key: 'name', 
                label: 'Supplier / Unit Name',
                render: (row) => (
                  <div className="flex flex-col">
                    <span className="font-bold">{row.name}</span>
                    {row.isSelfProduction && <span className="text-[10px] text-emerald-400 font-extrabold uppercase mt-0.5">In-House Unit</span>}
                  </div>
                )
              },
              { key: 'company', label: 'Company / Type' },
              { key: 'openingBalance', label: 'Opening Bal', render: (row) => `Rs. ${Number(row.openingBalance || 0).toLocaleString()}` },
              { key: 'purchaseTotal', label: 'Purchase Vol', render: (row) => `Rs. ${Number(row.purchaseTotal).toLocaleString()}` },
              { key: 'paidTotal', label: 'Total Paid', render: (row) => `Rs. ${Number(row.paidTotal).toLocaleString()}` },
              { key: 'remainingBalance', label: 'Payable Balance', render: (row) => <span className={`font-black ${row.remainingBalance > 0 ? 'text-amber-500' : 'text-emerald-400'}`}>Rs. {Number(row.remainingBalance).toLocaleString()}</span> },
              {
                key: 'action',
                label: 'Actions',
                render: (row) => (
                  <div className="flex items-center gap-1.5">
                    {/* EDIT SUPPLIER BUTTON WITH STRICT ADMIN PERMISSION CHECK */}
                    {isAdmin && (
                      <button 
                        title="Edit Profile & Balance"
                        className="p-2 rounded-lg bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white transition duration-200 cursor-pointer border border-amber-500/20 flex items-center justify-center"
                        onClick={() => {
                          setEditForm({
                            id: row.id || row._id,
                            name: row.name,
                            company: row.company || '',
                            phone: row.phone || '',
                            address: row.address || '',
                            openingBalance: row.openingBalance || 0,
                            isSelfProduction: row.isSelfProduction || false
                          });
                          setIsEditModalOpen(true);
                        }}
                      >
                        ✏️
                      </button>
                    )}
                    <button title="View Ledger" className="p-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white transition cursor-pointer border border-emerald-500/20" onClick={() => setSelectedLedgerSupplier(row)}><Eye size={15} /></button>
                    <button title="Print Statement" className="p-2 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white transition cursor-pointer border border-blue-500/20" onClick={() => executePrintAction(row)}><Printer size={15} /></button>
                  </div>
                )
              }
            ]}
            rows={supplierRows}
          />
        </Card>
      </div>

      {/* --- EDIT SUPPLIER MODAL POPUP --- */}
      {isAdmin && isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl flex flex-col">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"><X size={18} /></button>
            <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider mb-4">✏️ Edit Supplier / Account Balance</h3>
            
            <div className="flex flex-col gap-4 text-slate-300">
              <Input label="Supplier / Unit Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <Input label="Company / Firm" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} disabled={editForm.isSelfProduction} />
              <Input label="Phone Contact" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <Input label="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} disabled={editForm.isSelfProduction} />
              <Input label="Modify Opening Balance (Rs.)" type="number" value={editForm.openingBalance} onChange={(e) => setEditForm({ ...editForm, openingBalance: e.target.value })} />
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition">Cancel</button>
              <Button onClick={updateSupplierDetails}>Ok / Update changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- ANIMATED SUCCESS TICK POPUP --- */}
      {showSuccessTick && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl flex flex-col items-center shadow-2xl max-w-xs w-full text-center scale-up-animation">
            <CheckCircle size={54} className="text-emerald-400 animate-bounce mb-3" />
            <h4 className="text-white font-bold text-sm">Success!</h4>
            <p className="text-slate-400 text-xs mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {/* --- MODAL: VIEW DETAILED LEDGER --- */}
      {selectedLedgerSupplier && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
            <button onClick={() => setSelectedLedgerSupplier(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"><X size={18} /></button>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider">Account Ledger: <span className="text-white">{selectedLedgerSupplier.name}</span></h3>
              <div className="mr-8"><button onClick={() => executePrintAction(selectedLedgerSupplier)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition"><Printer size={14} /> Print Ledger</button></div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 text-slate-300">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 text-[11px] uppercase font-bold">
                    <th className="py-2.5 px-3">Date</th><th className="py-2.5 px-3">Type</th><th className="py-2.5 px-3">Description</th><th className="py-2.5 px-3 text-right">Debit (Paid)</th><th className="py-2.5 px-3 text-right">Credit (Bill)</th><th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  <tr className="text-slate-400 bg-slate-950/10 font-bold">
                    <td className="py-3 px-3">—</td><td>Opening Bal</td><td>Opening Account Balance</td><td className="text-slate-500 text-right">—</td><td className="text-right">Rs. {Number(selectedLedgerSupplier.openingBalance || 0).toLocaleString()}</td><td className="text-right text-white font-black">Rs. {Number(selectedLedgerSupplier.openingBalance || 0).toLocaleString()}</td>
                  </tr>
                  {selectedLedgerSupplier.ledgerHistory && selectedLedgerSupplier.ledgerHistory.map((row, index) => (
                    <tr key={index} className="text-slate-300 hover:bg-slate-950/10">
                      <td className="py-3 px-3">{row.date}</td><td className="font-semibold text-slate-400">{row.mode}</td><td className="max-w-[200px] break-words text-[11px] text-slate-400">{row.description}</td><td className="text-right font-bold text-emerald-400">{row.debit > 0 ? `Rs. ${Number(row.debit).toLocaleString()}` : '—'}</td><td className="text-right font-bold text-slate-400">{row.credit > 0 ? `Rs. ${Number(row.credit).toLocaleString()}` : '—'}</td><td className="text-right font-black text-white">Rs. {Number(row.balance).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-5 border-t border-slate-800 mt-5"><Button onClick={() => setSelectedLedgerSupplier(null)}>Close Window</Button></div>
          </div>
        </div>
      )}

    </PageShell>
  );
};

export default Suppliers;