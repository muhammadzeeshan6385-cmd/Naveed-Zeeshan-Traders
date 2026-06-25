import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Printer } from 'lucide-react'; // Icons add kiye
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, generateId, getProductSaleRate, nextInvoiceNo, todayISO } from './utils/helpers';

const Sales = ({ sales, setSales, products, customers, getStock, cashData, setCashData, currentUser }) => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [paymentType, setPaymentType] = useState('Credit');
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => { setInvoiceNo(nextInvoiceNo(sales)); }, [sales]);

  const gross = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.rate, 0), [items]);
  const netTotal = Math.max(gross - Number(discount || 0), 0);

  const addProduct = (productName) => {
    if (!productName) return;
    const product = products.find((entry) => entry.name === productName);
    const stock = getStock(product.name);
    if (stock <= 0) return window.alert(`${product.name} out of stock.`);

    const existing = items.find((item) => item.name === product.name);
    if (existing) {
      if (existing.qty >= stock) return window.alert("Not enough stock.");
      setItems(items.map((i) => i.name === product.name ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.rate } : i));
    } else {
      const rate = getProductSaleRate(product);
      setItems([...items, { id: generateId(), productId: product.id, name: product.name, rate, qty: 1, total: rate }]);
    }
    setSelectedProduct('');
  };

  const saveInvoice = () => {
    if (!customer || items.length === 0) return window.alert('Please select customer and products.');
    
    const invoice = { id: generateId(), invoiceNo, date: todayISO(), customer, paymentType, items, grossTotal: gross, discount: Number(discount), netTotal, createdBy: currentUser?.username || 'System' };
    setSales([...sales, invoice]);
    
    if (paymentType === 'Cash') {
      setCashData([...cashData, { id: generateId(), date: todayISO(), account: 'Cash', amount: netTotal, description: `Sale ${invoiceNo}`, type: 'receipt' }]);
    }
    
    setItems([]); setCustomer(''); setDiscount(0);
    window.print(); // Direct print trigger
    window.alert(`Invoice ${invoiceNo} Saved & Ready to Print!`);
  };

  return (
    <PageShell title="New Sales Invoice" subtitle="Process customer orders and generate invoices">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Invoice Info">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Invoice No" value={invoiceNo} disabled />
              <Select label="Customer" value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </div>
          </Card>

          <Card title="Add Items">
            <Select value={selectedProduct} onChange={(e) => addProduct(e.target.value)}>
              <option value="">Search Product...</option>
              {products.map((p) => <option key={p.id} value={p.name}>{p.name} (Stock: {getStock(p.name)})</option>)}
            </Select>

            <DataTable className="mt-4" columns={[
              { key: 'name', label: 'Item' },
              { key: 'rate', label: 'Price' },
              { key: 'qty', label: 'Qty', render: (row, i) => <Input type="number" className="w-20" value={row.qty} onChange={(e) => setItems(items.map((item, idx) => idx === i ? {...item, qty: Number(e.target.value), total: Number(e.target.value) * item.rate} : item))} /> },
              { key: 'total', label: 'Total', render: (row) => formatRs(row.total) },
              { key: 'action', label: '', render: (_, i) => <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-rose-500"><Trash2 size={18} /></button> }
            ]} rows={items} />
          </Card>
        </div>

        <Card title="Summary" className="h-fit sticky top-6">
          <div className="space-y-4">
            <div className="flex justify-between font-medium"><span>Gross</span><span>{formatRs(gross)}</span></div>
            <Input label="Discount" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <div className="text-2xl font-bold text-emerald-500 border-t pt-4">Net: {formatRs(netTotal)}</div>
            <div className="flex gap-2">
              <Button onClick={saveInvoice} className="flex-1">Save & Print</Button>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
};
export default Sales;