import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, generateId, getProductSaleRate, nextInvoiceNo } from './utils/helpers';

// Firebase Firestore Imports
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const Sales = ({ sales, setSales, products, customers, getStock, cashData, setCashData, currentUser, payments }) => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [paymentType, setPaymentType] = useState('Credit');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setInvoiceNo(nextInvoiceNo(sales)); }, [sales]);

  // Safe Number Parsing Helper (Commas aur Strings ko handle karne ke liye)
  const cleanNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const parsed = Number(String(val).replace(/,/g, '').trim());
    return isNaN(parsed) ? 0 : parsed;
  };

  // --- CALCULATIONS BASED ON ITEM-WISE % DISCOUNT (ROUNDED TO NEAREST RUPEE) ---
  const gross = useMemo(() => Math.round(items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate)), 0)), [items]);
  
  const totalDiscountAmount = useMemo(() => Math.round(items.reduce((sum, item) => {
    const itemGross = Number(item.qty) * Number(item.rate);
    const itemDiscAmount = itemGross * ((Number(item.discount) || 0) / 100);
    return sum + itemDiscAmount;
  }, 0)), [items]);
  
  const netTotal = Math.round(gross - totalDiscountAmount);

  // --- DYNAMIC PREVIOUS BALANCE CALCULATION MATCHING KHATA LEDGER ---
  const activeCustomerName = useMemo(() => {
    return customer === 'Walk-in Customer' ? walkInName : customer;
  }, [customer, walkInName]);

  const livePrevBalance = useMemo(() => {
    if (!activeCustomerName || activeCustomerName === 'Walk-in Customer') return 0;

    const normActiveName = activeCustomerName.trim().toLowerCase();

    // 1. Find Customer Object
    const custObj = customers.find(
      (c) => c.name?.trim().toLowerCase() === normActiveName || String(c.id) === String(customer)
    );

    // 2. Extract Opening Balance safely across all possible field names
    const openingBal = custObj ? cleanNum(
      custObj.openingBalance ?? 
      custObj.openBalance ?? 
      custObj.opening_balance ?? 
      custObj.initialBalance ?? 
      custObj.prevBalance ?? 
      custObj.opening ?? 
      custObj.balance
    ) : 0;

    // 3. Calculate Total Sales (Debit) for this customer from Sales history
    const totalSales = (sales || [])
      .filter((s) => {
        const sCust = (s.customer || s.customerName || '').trim().toLowerCase();
        const matchName = sCust === normActiveName;
        const matchId = custObj?.id && String(s.customerId) === String(custObj.id);
        return matchName || matchId;
      })
      .reduce((sum, s) => sum + cleanNum(s.netTotal || s.total || s.amount), 0);

    // 4. Calculate Total Payments (Credit) received from Payments history
    const totalPaid = (payments || [])
      .filter((p) => {
        const pCust = (p.customer || p.customerName || '').trim().toLowerCase();
        const matchName = pCust === normActiveName;
        const matchId = custObj?.id && String(p.customerId) === String(custObj.id);
        return matchName || matchId;
      })
      .reduce((sum, p) => sum + cleanNum(p.amount), 0);

    // Total Previous Balance = Opening Balance + All Previous Sales - All Payments
    return Math.round(openingBal + totalSales - totalPaid);
  }, [sales, payments, customers, activeCustomerName, customer]);

  const grandTotalPayable = Math.round(netTotal + livePrevBalance);

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
            total: Math.round(itemGross - itemDiscAmount) 
          };
        }
        return i;
      }));
    } else {
      const rate = getProductSaleRate(product);
      setItems([...items, { id: generateId(), productId: product.id, name: product.name, rate, purchaseRate, qty: 1, ctnSize, discount: 0, total: Math.round(rate) }]);
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
          total: Math.round(itemGross - itemDiscAmount) 
        };
      }
      return item;
    }));
  };

  const removeItem = (id) => setItems(items.filter((item) => item.id !== id));

  // --- HANDLE PRINT WITH ROUNDED RUPEE FORMATTING ---
  const handlePrint = (invoiceData) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const loggedUser = (typeof currentUser === 'string' ? currentUser : currentUser?.username || currentUser?.name) || localStorage.getItem('username') || '';

    const createdByUserName = (invoiceData && invoiceData.createdBy && invoiceData.createdBy !== 'System')
      ? invoiceData.createdBy
      : (loggedUser || 'System');

    const fmt = (num) => {
      const parsed = Number(num) || 0;
      const rounded = Math.round(parsed);
      return rounded.toLocaleString('en-PK');
    };

    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { size: A5; margin: 4mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; width: 138mm; margin: 0 auto; padding: 5px; color: #000; }
            .bill-container { border: 2px solid #000; padding: 10px; min-height: 165mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
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
              <div><strong>Bill No:</strong> ${invoiceData.invoiceNo}</div>
              <div><strong>Customer:</strong> ${invoiceData.customer}</div>
              <div><strong>Date:</strong> ${invoiceData.date}</div>
              <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
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
                <tr><td class="label-col">Grand Total:</td><td class="amount-col">Rs. ${fmt(invoiceData.grossTotal)}</td></tr>
                <tr><td class="label-col">Discount:</td><td class="amount-col">Rs. ${fmt(invoiceData.discount)}</td></tr>
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

  // --- SAVE INVOICE FUNCTION ---
  const saveInvoice = async () => {
    if (!activeCustomerName || items.length === 0) { 
      window.alert('Please fill details and add items.'); 
      return; 
    }

    const currentDate = new Date().toISOString().split('T')[0];

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

    const loggedInUser = (typeof currentUser === 'string' ? currentUser : currentUser?.username || currentUser?.name || currentUser?.displayName) || localStorage.getItem('username') || 'System';

    const invoice = { 
      id: invoiceNo ? String(invoiceNo) : generateId(), 
      invoiceNo, 
      date: currentDate, 
      customer: activeCustomerName, 
      paymentType, 
      items, 
      grossTotal: gross, 
      discount: totalDiscountAmount,
      prevBalance: livePrevBalance, 
      netTotal, 
      createdBy: loggedInUser,
      createdAt: new Date().toISOString()
    };
    
    setIsSaving(true);

    try {
      const saleDocRef = doc(db, "sales", String(invoice.id));
      await setDoc(saleDocRef, invoice);

      setSales(prevSales => [...prevSales, invoice]);
      
      if (paymentType === 'Cash') {
        const cashObj = { 
          id: generateId(), 
          date: currentDate, 
          account: 'Cash', 
          amount: netTotal, 
          description: `Sale ${invoiceNo} - ${activeCustomerName}`, 
          type: 'receipt' 
        };
        setCashData(prevCash => [...prevCash, cashObj]);
        
        try {
          await setDoc(doc(db, "cashData", String(cashObj.id)), cashObj);
        } catch (err) {
          console.error("Cash ledger sync error:", err);
        }
      }

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
        <div className="xl:col-span-1 flex flex-col h-full">
          <Card title="Summary" className="h-full flex flex-col justify-between p-5">
    
            {/* Upper Content - Financial Totals */}
            <div className="space-y-3">
              <div className="text-lg font-semibold text-slate-300 flex justify-between items-center">
                <span>Gross:</span> 
                <span className="text-white">{formatRs(gross)}</span>
              </div>  
      
              <div className="text-lg font-semibold text-rose-400 flex justify-between items-center">
                <span>Total Disc:</span> 
                <span>{formatRs(totalDiscountAmount)}</span>
              </div>

              <div className="text-lg font-semibold text-amber-400 flex justify-between items-center">
                <span>Bill Net:</span> 
                <span>{formatRs(netTotal)}</span>
              </div>

              <div className="text-lg font-semibold text-blue-400 flex justify-between items-center border-t border-slate-800 pt-2">
                <span>Prev Balance:</span> 
                <span>{formatRs(livePrevBalance)}</span>
              </div>
      
              <hr className="border-slate-800 my-4" />
      
              <div className="text-2xl font-bold text-emerald-400 flex justify-between items-center py-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <span>Total Payable:</span> 
                <span>{formatRs(grandTotalPayable)}</span>
              </div>
            </div>

            {/* Bottom Content - Action Button */}
            <div className="mt-8 pt-4 border-t border-slate-800/50">
              <Button 
                onClick={saveInvoice} 
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 text-base font-bold transition-all shadow-lg shadow-emerald-950/40 rounded-xl"
              >
                {isSaving ? 'Saving to Cloud...' : 'Save & Print'}
              </Button>
            </div>

          </Card>
        </div>

      </div>
    </PageShell>
  );
};

export default Sales;