import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, generateId, getProductSaleRate, nextInvoiceNo, todayISO } from './utils/helpers';

const Sales = ({ sales, setSales, products, customers, getStock, cashData, setCashData, currentUser }) => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [paymentType, setPaymentType] = useState('Credit');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { setInvoiceNo(nextInvoiceNo(sales)); }, [sales]);

  const gross = useMemo(() => items.reduce((sum, item) => sum + (item.qty * item.rate), 0), [items]);
  const discountAmount = (gross * discountPercent) / 100;
  const netTotal = gross - discountAmount;

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
    const stock = getStock(product.name);
    const existing = items.find((item) => item.name === product.name);
    
    if (existing) {
      setItems(items.map((i) => i.name === product.name ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.rate } : i));
    } else {
      const rate = getProductSaleRate(product);
      setItems([...items, { id: generateId(), productId: product.id, name: product.name, rate, qty: 1, ctnSize, total: rate }]);
    }
  };

  const updateQty = (id, newQty) => {
    setItems(items.map((item) => {
      if (item.id === id) {
        const qty = Number(newQty);
        return { ...item, qty, total: qty * item.rate };
      }
      return item;
    }));
  };

  const removeItem = (id) => setItems(items.filter((item) => item.id !== id));

  const handlePrint = (invoiceData) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { size: A5; margin: 5mm; }
            body { font-family: sans-serif; width: 138mm; margin: 0; padding: 0; color: black; }
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
            <thead><tr><th>Ser</th><th>Product Name</th><th>Ctn</th><th>Piece</th><th>Rate</th><th>Total</th></tr></thead>
            <tbody>
              ${invoiceData.items.map((i, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="product-name">${i.name}</td>
                  <td>${Math.floor(i.qty / (i.ctnSize || 1))}</td>
                  <td>${i.qty % (i.ctnSize || 1)}</td>
                  <td>${formatRs(i.rate)}</td>
                  <td>${formatRs(i.total)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div class="totals-container">
            <table class="totals-table">
              <tr><td class="label-col">Grand Total:</td><td class="amount-col">${formatRs(invoiceData.grossTotal)}</td></tr>
              <tr><td class="label-col">Discount:</td><td class="amount-col">${formatRs(invoiceData.discount)}</td></tr>
              <tr><td class="label-col">Payable Amount:</td><td class="amount-col">${formatRs(invoiceData.netTotal)}</td></tr>
            </table>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
  };

  const saveInvoice = () => {
    if (!customer || items.length === 0) { window.alert('Please fill details.'); return; }
    const invoice = { id: generateId(), invoiceNo, date: todayISO(), customer, paymentType, items, grossTotal: gross, discount: discountAmount, netTotal, createdBy: currentUser?.username || 'System' };
    setSales([...sales, invoice]);
    if (paymentType === 'Cash') {
      setCashData([...cashData, { id: generateId(), date: todayISO(), account: 'Cash', amount: netTotal, description: `Sale ${invoiceNo} - ${customer}`, type: 'receipt' }]);
    }
    handlePrint(invoice);
    setItems([]); setCustomer(''); setDiscountPercent(0); setPaymentType('Credit');
  };

  return (
    <PageShell title="Sales Invoice" className="py-2">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 space-y-4">
          <Card title="Invoice Details" className="py-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input label="Invoice No" value={invoiceNo} disabled />
              <Input label="Date" value={new Date().toLocaleDateString()} disabled />
              <Select label="Customer" value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
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
              { key: 'name', label: 'Product' },
              { key: 'rate', label: 'Rate' },
              { key: 'ctn', label: 'Ctn', render: (row) => Math.floor(row.qty / (row.ctnSize || 1)) },
              { key: 'pcs', label: 'Piece', render: (row) => (row.qty % (row.ctnSize || 1)) },
              { key: 'qty_input', label: 'Qty', render: (row) => <Input type="number" style={{ width: '60px' }} value={row.qty} onChange={(e) => updateQty(row.id, e.target.value)} /> },
              { key: 'total', label: 'Total', render: (row) => formatRs(row.total) },
              { key: 'action', render: (row) => <button onClick={() => removeItem(row.id)}><Trash2 className="text-red-500" /></button> }
            ]} rows={items} />
          </Card>
        </div>
        
        <div className="xl:col-span-1">
          <Card title="Summary">
            <div className="text-lg">Gross: {formatRs(gross)}</div>
            <Input label="Discount (%)" type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
            <div className="text-xl font-bold py-2">Payable: {formatRs(netTotal)}</div>
            <Button onClick={saveInvoice} className="w-full bg-emerald-600">Save & Print</Button>
          </Card>
        </div>
      </div>
    </PageShell>
  );
};
export default Sales;