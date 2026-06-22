import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, generateId, getProductSaleRate, nextInvoiceNo, todayISO } from './utils/helpers';

const Sales = ({ sales, setSales, products, customers, getStock, cashData, setCashData, currentUser }) => {
  const [invoiceNo, setInvoiceNo] = useState('INV-00001');
  const [customer, setCustomer] = useState('');
  const [paymentType, setPaymentType] = useState('Credit');
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => {
    setInvoiceNo(nextInvoiceNo(sales));
  }, [sales]);

  const gross = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.rate, 0), [items]);
  const netTotal = Math.max(gross - Number(discount || 0), 0);

  const addProduct = (productName) => {
    if (!productName) return;
    const product = products.find((entry) => entry.name === productName);
    if (!product) return;

    const stock = getStock(product.name);
    if (stock <= 0) {
      window.alert(`${product.name} is out of stock.`);
      return;
    }

    const existing = items.find((item) => item.name === product.name);
    if (existing) {
      setItems(
        items.map((item) =>
          item.name === product.name
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.rate }
            : item
        )
      );
    } else {
      const rate = getProductSaleRate(product);
      setItems([...items, { id: generateId(), productId: product.id, name: product.name, rate, qty: 1, total: rate }]);
    }
    setSelectedProduct('');
  };

  const updateQty = (index, qty) => {
    const safeQty = Math.max(Number(qty) || 0, 0);
    const item = items[index];
    const stock = getStock(item.name) + item.qty;
    if (safeQty > stock) {
      window.alert(`Only ${stock} units available for ${item.name}.`);
      return;
    }
    setItems(items.map((entry, idx) => (idx === index ? { ...entry, qty: safeQty, total: safeQty * entry.rate } : entry)));
  };

  const removeItem = (index) => setItems(items.filter((_, idx) => idx !== index));

  const saveInvoice = () => {
    if (!customer) {
      window.alert('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      window.alert('Add at least one product.');
      return;
    }

    const invoice = {
      id: generateId(),
      invoiceNo,
      date: todayISO(),
      customer,
      paymentType,
      items,
      grossTotal: gross,
      discount: Number(discount || 0),
      netTotal,
      paidAmount: paymentType === 'Cash' ? netTotal : 0,
      balanceAmount: paymentType === 'Cash' ? 0 : netTotal,
      createdBy: currentUser?.username || 'System',
    };

    setSales([...sales, invoice]);

    if (paymentType === 'Cash') {
      setCashData([
        ...cashData,
        {
          id: generateId(),
          date: todayISO(),
          account: 'Cash',
          amount: netTotal,
          description: `Cash sale ${invoiceNo} - ${customer}`,
          type: 'receipt',
        },
      ]);
    }

    setItems([]);
    setCustomer('');
    setDiscount(0);
    setPaymentType('Credit');
    window.alert(`Invoice ${invoiceNo} saved successfully.`);
  };

  return (
    <PageShell title="Sales Invoice" subtitle="Create distributor invoices with stock validation and ledger sync">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="space-y-6 xl:col-span-3">
          <Card title="Invoice Details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input label="Invoice No" value={invoiceNo} disabled />
              <Input label="Date" value={new Date().toLocaleDateString()} disabled />
              <Select label="Customer" value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((entry) => (
                  <option key={entry.id} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </Select>
              <Select label="Payment Type" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="Credit">Credit</option>
                <option value="Cash">Cash</option>
              </Select>
            </div>
          </Card>

          <Card title="Products">
            <Select label="Add Product" value={selectedProduct} onChange={(e) => addProduct(e.target.value)}>
              <option value="">Search and select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.name}>
                  {product.name} · Stock: {getStock(product.name)}
                </option>
              ))}
            </Select>

            <div className="mt-4">
              <DataTable
                columns={[
                  { key: 'name', label: 'Product' },
                  { key: 'rate', label: 'Rate' },
                  {
                    key: 'qty',
                    label: 'Qty',
                    render: (row, index) => (
                      <Input type="number" value={row.qty} onChange={(e) => updateQty(index, e.target.value)} className="max-w-24" />
                    ),
                  },
                  { key: 'total', label: 'Total', render: (row) => formatRs(row.total) },
                  {
                    key: 'action',
                    label: 'Action',
                    render: (_, index) => (
                      <Button variant="danger" onClick={() => removeItem(index)}>
                        Remove
                      </Button>
                    ),
                  },
                ]}
                rows={items}
              />
            </div>
          </Card>
        </div>

        <Card title="Invoice Summary" className="h-fit">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Gross Total</span>
              <span>{formatRs(gross)}</span>
            </div>
            <Input label="Discount" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <div className="border-t border-slate-700 pt-3 text-lg font-bold text-emerald-300">Net Total: {formatRs(netTotal)}</div>
          </div>
          <Button className="mt-6 w-full" onClick={saveInvoice}>
            Save Invoice
          </Button>
        </Card>
      </div>
    </PageShell>
  );
};

export default Sales;
