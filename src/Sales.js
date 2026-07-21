import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Printer } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, generateId, getProductSaleRate, nextInvoiceNo, getCreditSalesTotal } from './utils/helpers';

// Firebase Firestore Imports
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const Sales = ({ sales, setSales, products, customers, getStock, cashData, setCashData, currentUser, payments }) => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [paymentType, setPaymentType] = useState('Credit');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Strict Admin Check for Edit/Delete Permissions
  const activeUsername = String(currentUser?.username || currentUser?.id || '').trim().toLowerCase();
  const activeRole = String(currentUser?.role || '').trim().toLowerCase();
  const isAdmin = activeUsername === 'admin' || activeRole === 'admin';

  useEffect(() => { setInvoiceNo(nextInvoiceNo(sales)); }, [sales]);

  // --- CALCULATIONS BASED ON ITEM-WISE % DISCOUNT ---
  const gross = useMemo(() => items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate)), 0), [items]);
  
  const totalDiscountAmount = useMemo(() => items.reduce((sum, item) => {
    const itemGross = Number(item.qty) * Number(item.rate);
    const itemDiscAmount = itemGross * ((Number(item.discount) || 0) / 100);
    return sum + itemDiscAmount;
  }, 0), [items]);
  
  const netTotal = gross - totalDiscountAmount;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const input = e.target.value.trim();
      const product = products.find(p => p.sku === input || p.name.toLowerCase() === input.toLowerCase());
      if (product) {
        addProduct(product.name);
        setSearchQuery('');
      } else {
        window.alert('Product not found!');
      }
    }
  };

  const addProduct = (productName) => {
    if (!productName || productName === "") return;
    const product = products.find((entry) => entry.name === productName);
    if (!product) return;
    
    const ctnSize = Number(product.ctnSize) || 1;
    const purchaseRate = Number(product.purchaseRate) || 0;
    const existing = items.find((item) => item.name === product.name);
    
    if (existing) {
      setItems(items.map((i) => {
        if (i.name === product.name) {
          const newQty = i.qty + 1;
          const currentDiscountPercent = Number(i.discount) || 0;
          const itemGross = newQty * i.rate;
          const itemDiscAmount = itemGross * (currentDiscountPercent / 100);
          return { 
            ...i, 
            purchaseRate: i.purchaseRate || purchaseRate, 
            qty: newQty, 
            total: itemGross - itemDiscAmount 
          };
        }
        return i;
      }));
    } else {
      const rate = getProductSaleRate(product);
      setItems([...items, { id: generateId(), productId: product.id, name: product.name, rate, purchaseRate, qty: 1, ctnSize, discount: 0, total: rate }]);
    }
  };

  const updateItemRow = (id, newQty, newDiscountPercent) => {
    setItems(items.map((item) => {
      if (item.id === id) {
        const qty = Number(newQty);
        const discount = Number(newDiscountPercent);
        const itemGross = qty * item.rate;
        const itemDiscAmount = itemGross * (discount / 100);
        return { 
          ...item, 
          qty, 
          discount,
          total: itemGross - itemDiscAmount 
        };
      }
      return item;
    }));
  };

  const removeItem = (id) => setItems(items.filter((item) => item.id !== id));

  const handlePrint = (invoiceData) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { size: A5; margin: 5mm; }
            body { font-family: sans-serif; width: 138mm; margin: 0; padding: 0; color: black; }
            .bill-container { border: 2px solid #000; padding: 10px; min-height: 100mm; }
            .header-container { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .logo { width: 70px; }
            .title-section { flex: 1; text-align: center; }
            .title-section h1 { font-size: 18px; margin: 0; text-transform: uppercase; }
            .title-section p { font-size: 12px; margin: 0; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { border: 1px solid #000; padding: 4px; background: #f3f4f6; font-size: 11px; }
            td { border: 1px solid #000; padding: 3px; text-align: center; font-size: 11px; }
            td.product-name { text-align: left; padding-left: 10px; }
            .totals-container { width: 100%; margin-top: 5px; display: flex; justify-content: flex-end; }
            .totals-table { border-collapse: collapse; width: 250px; }
            .label-col { text-align: right; padding: 4px; font-size: 12px; font-weight: bold; border: 1px solid #000; }
            .amount-col { text-align: center; padding: 4px; font-size: 12px; font-weight: bold; border: 1px solid #000; }
          </style>
        </head>
        <body>
         <div class="bill-container">
          <div class="header-container">
            <img src="/logo-dark.png" class="logo" />
            <div class="title-section">
              <h1>Naveed & Zeeshan Traders, Mailsi</h1>
              <p>PH: 0300-3999866, 0307-6385852</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; font-size: 12px;">
            <div><strong>Bill No:</strong> ${invoiceData.invoiceNo}</div>
            <div><strong>Customer:</strong> ${invoiceData.customer}</div>
            <div><strong>Date:</strong> ${invoiceData.date}</div>
            <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
          </div>
          <table>
            <thead><tr><th>Ser</th><th>Product Name</th><th>Piece</th><th>Rate</th><th>Disc (Rs.)</th><th>Total</th></tr></thead>
            <tbody>
              ${(invoiceData.items || []).map((i, idx) => {
                const itemGross = Number(i.qty) * Number(i.rate);
                const calcDiscRs = itemGross * ((Number(i.discount) || 0) / 100);
                return `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="product-name">${i.name}</td>
                  <td>${i.qty}</td>
                  <td>${formatRs(i.rate || 0)}</td>
                  <td>${calcDiscRs > 0 ? formatRs(calcDiscRs) : '—'}</td>
                  <td>${formatRs(i.total)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
          <div class="totals-container">
            <table class="totals-table">
              <tr><td class="label-col">Grand Total:</td><td class="amount-col">${formatRs(invoiceData.grossTotal)}</td></tr>
              <tr><td class="label-col">Discount:</td><td class="amount-col">${formatRs(invoiceData.discount)}</td></tr>
              <tr><td class="label-col">Prev Balance:</td><td class="amount-col">${formatRs(invoiceData.prevBalance || 0)}</td></tr>
              <tr><td class="label-col" style="border-top: 2px solid #000;">Payable Amount:</td><td class="amount-col" style="border-top: 2px solid #000;">${formatRs(Number(invoiceData.netTotal) + Number(invoiceData.prevBalance || 0))}</td></tr>
            </table>
          </div>
          <div style="margin-top: 100px; display: flex; justify-content: flex-end;">
            <div style="text-align: center; border-top: 1px solid #000; width: 200px; padding-top: 5px; font-size: 12px; font-weight: bold;">
              Customer Signature
            </div>
          </div>    
          <script>window.onload = () => { window.print(); window.close(); }</script>
         </div>
        </body>
      </html>
    `);
  };

  // --- SAFE FIREBASE DIRECT SAVE INVOICE FUNCTION ---
  const saveInvoice = async () => {
    const finalCustomer = customer === 'Walk-in Customer' ? walkInName : customer;
    if (!finalCustomer || items.length === 0) { 
      window.alert('Please fill details and add items.'); 
      return; 
    }

    const currentDate = new Date().toISOString().split('T')[0];

    // Stock verification
    for (let item of items) {
      const product = products.find(p => p.id === item.productId || p.name === item.name);
      if (product) {
        const currentStock = getStock(product.name);
        if (item.qty > currentStock) {
          window.alert(`Insufficient stock for ${item.name}! Available: ${currentStock}`);
          return;
        }
      }
    }

    const totalSales = getCreditSalesTotal(sales, finalCustomer);
    const totalPaid = (payments || [])
      .filter((p) => p.customer === finalCustomer)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const prevBalance = totalSales - totalPaid;

    const invoice = { 
      id: invoiceNo ? String(invoiceNo) : generateId(), 
      invoiceNo, 
      date: currentDate, 
      customer: finalCustomer, 
      paymentType, 
      items, 
      grossTotal: gross, 
      discount: totalDiscountAmount,
      prevBalance: prevBalance, 
      netTotal, 
      createdBy: currentUser?.username || 'System',
      createdAt: new Date().toISOString()
    };
    
    setIsSaving(true);

    try {
      // 1. Direct Cloud Database Save (Firebase Firestore)
      const saleDocRef = doc(db, "sales", String(invoice.id));
      await setDoc(saleDocRef, invoice);

      // 2. Local State Sync
      setSales(prevSales => [...prevSales, invoice]);
      
      if (paymentType === 'Cash') {
        const cashObj = { 
          id: generateId(), 
          date: currentDate, 
          account: 'Cash', 
          amount: netTotal, 
          description: `Sale ${invoiceNo} - ${finalCustomer}`, 
          type: 'receipt' 
        };
        setCashData(prevCash => [...prevCash, cashObj]);
        
        // Save Cash Entry to Firestore
        try {
          await setDoc(doc(db, "cashData", String(cashObj.id)), cashObj);
        } catch (err) {
          console.error("Cash ledger sync error:", err);
        }
      }

      // 3. Print & Clear Form
      handlePrint(invoice);
      setItems([]); 
      setCustomer(''); 
      setWalkInName(''); 
      setPaymentType('Credit');

    } catch (error) {
      console.error("Firebase Invoice Save Error: ", error);
      window.alert(`ALERT: Bill Cloud Database me save NAHI ho saka!\nError: ${error.message}\n\nMeharbani kar ke Internet Connection check karein aur dobara try karein.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Invoice Function (Strict Admin Only)
  const handleDeleteInvoice = async (invoiceToDelete) => {
    if (!isAdmin) {
      window.alert("Apko Bill Delete krne ki Permission nahi hai!");
      return;
    }

    if (!window.confirm(`Kya aap Bill No: ${invoiceToDelete.invoiceNo} delete karna chahte hain?`)) {
      return;
    }

    try {
      // Delete from Firebase
      await deleteDoc(doc(db, "sales", String(invoiceToDelete.id)));
      
      // Update local state
      setSales(prev => prev.filter(s => s.id !== invoiceToDelete.id));
      window.alert("Bill success fully delete ho gaya hai.");
    } catch (err) {
      console.error("Delete Error:", err);
      window.alert("Bill delete karne me error aya hai: " + err.message);
    }
  };

  return (
    <PageShell title="Sales Terminal" className="py-2">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        
        {/* Left Form Section */}
        <div className="xl:col-span-3 space-y-4">
          <Card title="Invoice Details" className="py-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input label="Invoice No" value={invoiceNo} disabled />
              <Input label="Date" value={new Date().toLocaleDateString()} disabled />
              <Select label="Customer" value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">Select customer</option>
                <option value="Walk-in Customer">Walk-in Customer</option>
                {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
              {customer === 'Walk-in Customer' && (
                <Input label="Customer Name" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
              )}
              <Select label="Payment Type" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="Credit">Credit</option>
                <option value="Cash">Cash</option>
              </Select>
            </div>
          </Card>
          
          <Card title="Add Items" className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Search by SKU / Name (Press Enter)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} />
              <Select label="Find Item (Manual)" onChange={(e) => addProduct(e.target.value)}>
                <option value="">Select Item...</option>
                {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </Select>
            </div>
            <DataTable columns={[
              { key: 'ser', label: 'Ser', render: (_, index) => index + 1 },
              { key: 'name', label: 'Product' },
              { key: 'pcs_input', label: 'Piece', render: (row) => <Input type="number" style={{ width: '65px' }} value={row.qty} onChange={(e) => updateItemRow(row.id, e.target.value, row.discount)} /> },
              { key: 'rate', label: 'Rate', render: (row) => formatRs(row.rate) },
              { key: 'discount_input', label: 'Disc (%)', render: (row) => <Input type="number" style={{ width: '75px' }} value={row.discount || ''} placeholder="0" onChange={(e) => updateItemRow(row.id, row.qty, e.target.value)} /> },
              { key: 'total', label: 'Total', render: (row) => formatRs(row.total) },
              { key: 'action', render: (row) => <button onClick={() => removeItem(row.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"><Trash2 className="text-red-500 w-4 h-4" /></button> }
            ]} rows={items} />
          </Card>
        </div>
        
        {/* Right Summary Section */}
        <div className="xl:col-span-1">
          <Card title="Summary">
            <div className="text-base font-semibold text-slate-400">Gross: {formatRs(gross)}</div>
            <div className="text-base font-semibold text-red-400 mt-1">Total Disc: {formatRs(totalDiscountAmount)}</div>
            <hr className="border-slate-800 my-2" />
            <div className="text-xl font-bold py-1 text-emerald-400">Payable: {formatRs(netTotal)}</div>
            <Button 
              onClick={saveInvoice} 
              disabled={isSaving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 py-2 text-sm font-bold transition-all"
            >
              {isSaving ? 'Saving to Cloud...' : 'Save & Print'}
            </Button>
          </Card>
        </div>
      </div>

      {/* --- RECENT INVOICES LIST (WITH ADMIN-ONLY DELETE ACCESS) --- */}
      <div className="mt-6">
        <Card title="Recent Sales Bills">
          <DataTable 
            columns={[
              { key: 'invoiceNo', label: 'Invoice No' },
              { key: 'date', label: 'Date' },
              { key: 'customer', label: 'Customer' },
              { key: 'paymentType', label: 'Payment' },
              { key: 'netTotal', label: 'Net Amount', render: (row) => formatRs(row.netTotal) },
              { key: 'createdBy', label: 'Created By' },
              { 
                key: 'actions', 
                label: 'Actions', 
                render: (row) => (
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={() => handlePrint(row)} 
                      title="Reprint Bill" 
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    
                    {/* Strictly visible only for Admin Accounts */}
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteInvoice(row)} 
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
            rows={[...sales].reverse().slice(0, 15)} 
          />
        </Card>
      </div>

    </PageShell>
  );
};

export default Sales;