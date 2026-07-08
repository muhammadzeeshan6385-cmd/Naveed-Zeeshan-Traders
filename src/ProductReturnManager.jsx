import React, { useState } from 'react';
import { Search, Save, AlertCircle } from 'lucide-react';
import { Button, Card, Input, PageShell } from './components/ui';
import { formatRs, todayISO, generateId } from './utils/helpers';

const ProductReturn = ({ sales = [], setSales, products = [], setProducts, customers = [], setCustomers, cashData = [], setCashData }) => {
  const [searchBillNo, setSearchBillNo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [error, setError] = useState('');

  // 1. Sirf input kiye gaye bill number se search karega
  const handleSearch = () => {
    setError('');
    if (!searchBillNo.trim()) {
      setError('Please enter a bill number to search.');
      return;
    }
    
    // Exact match dhoondega (Cash aur Credit dono mein se)
    const invoice = sales.find(s => s?.invoiceNo?.toLowerCase() === searchBillNo.toLowerCase().trim());
    
    if (invoice) {
      setSelectedInvoice(invoice);
      // Items ko edit karne ke liye state mein set karega
      setEditableItems((invoice.items || []).map(item => ({ ...item, originalQty: item.qty })));
    } else {
      setSelectedInvoice(null);
      setError('Bill not found. Please check the bill number and try again.');
    }
  };

  // 2. Qty edit karne ka function (kam ya 0 karna)
  const handleQtyChange = (productId, newQty, originalQty) => {
    const qty = Math.min(Math.max(0, Number(newQty)), originalQty);
    setEditableItems(prev =>
      prev.map(item => 
        item.productId === productId 
          ? { ...item, qty: qty, total: qty * Number(item.rate) }
          : item
      )
    );
  };

  // 3. Save karne par sab jagah update karne ka logic
  const handleUpdateBill = () => {
    if (!selectedInvoice) return;

    let refundAmount = 0;
    const stockToReturn = {};

    // Check karega kitni items kam ki gayi hain
    editableItems.forEach(item => {
      const diff = item.originalQty - item.qty;
      if (diff > 0) {
        stockToReturn[item.productId] = diff;
        refundAmount += diff * Number(item.rate);
      }
    });

    if (refundAmount === 0) {
      alert('Aap ne koi item kam nahi ki. Bill update karne ke liye item ki quantity kam karein.');
      return;
    }

    const currentDate = todayISO();

    // A: Stock Update (Jitni items kam ki wo wapas add ho jayengi)
    if (setProducts) {
      setProducts(prev => prev.map(p => {
        const qtyToAdd = stockToReturn[p.id] || 0;
        return qtyToAdd > 0 ? { ...p, stock: (Number(p.stock) || 0) + qtyToAdd } : p;
      }));
    }

    // B: Cash ya Khata Balance Update
    if (selectedInvoice.paymentType === 'Cash') {
      // Cash bill tha to cash in hand se minus hoga (expense entry)
      if (setCashData) {
        setCashData(prev => [
          ...prev,
          {
            id: generateId(),
            date: currentDate,
            account: 'Cash',
            amount: refundAmount,
            description: `Bill Edit / Item Return (Bill No: ${selectedInvoice.invoiceNo})`,
            type: 'expense'
          }
        ]);
      }
    } else {
      // Credit bill tha to Khata balance minus hoga
      if (setCustomers) {
        setCustomers(prev => prev.map(c => {
          if (c.name === selectedInvoice.customer) {
            return { ...c, balance: (Number(c.balance) || 0) - refundAmount };
          }
          return c;
        }));
      }
    }

    // C: Bill Update (Items aur Total update honge, agar sab 0 kiya to bill clear ho jayega)
    if (setSales) {
      setSales(prev => prev.map(sale => {
        if (sale.id === selectedInvoice.id) {
          const finalItems = editableItems
            .map(({ originalQty, ...rest }) => rest)
            .filter(i => i.qty > 0);

          const newGross = finalItems.reduce((sum, i) => sum + i.total, 0);
          const discountPercent = sale.discountPercent || 0;
          const newDiscountAmount = (newGross * discountPercent) / 100;

          return {
            ...sale,
            items: finalItems,
            grossTotal: newGross,
            discount: newDiscountAmount,
            netTotal: newGross - newDiscountAmount
          };
        }
        return sale;
      }).filter(sale => sale.items.length > 0));
    }

    alert(`Bill ${selectedInvoice.invoiceNo} update ho gaya hai! Rs. ${formatRs(refundAmount)} sab jagah adjust ho gaye hain.`);
    
    // Pura form wapas reset kar dega
    setSelectedInvoice(null);
    setSearchBillNo('');
  };

  return (
    <PageShell title="Edit Bill / Product Return" className="py-2">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Simple Search Box */}
        <Card title="Search Bill to Edit">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input 
                label="Enter Bill Number (e.g. INV-00001)" 
                value={searchBillNo}
                onChange={(e) => setSearchBillNo(e.target.value)}
                placeholder="Type bill number here..."
              />
            </div>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 pb-2">
              <Search className="w-5 h-5 mr-2 inline" /> Open Bill
            </Button>
          </div>
          {error && <div className="text-red-500 text-sm mt-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</div>}
        </Card>

        {/* Edit Panel jo sirf search hone par show hoga */}
        {selectedInvoice && (
          <Card title={`Edit Items - ${selectedInvoice.invoiceNo}`}>
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-slate-800 mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Customer: <span className="text-white font-bold text-base">{selectedInvoice.customer}</span></div>
                <div className="text-sm text-slate-400">Payment: <span className="text-white font-bold">{selectedInvoice.paymentType}</span></div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400 mb-1">Date: <span className="text-white font-bold">{selectedInvoice.date}</span></div>
                <div className="text-sm text-slate-400">Current Total: <span className="text-amber-400 font-bold text-base">{formatRs(selectedInvoice.netTotal)}</span></div>
              </div>
            </div>

            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="p-3 rounded-tl-lg font-medium">Item Name</th>
                    <th className="p-3 font-medium">Unit Rate</th>
                    <th className="p-3 font-medium w-40">Qty (Edit Here)</th>
                    <th className="p-3 rounded-tr-lg font-medium text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {editableItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                      <td className="p-3 text-slate-200">{item.name}</td>
                      <td className="p-3 text-slate-400">{formatRs(item.rate)}</td>
                      <td className="p-3">
                        <Input 
                          type="number"
                          min="0"
                          max={item.originalQty}
                          value={item.qty}
                          onChange={(e) => handleQtyChange(item.productId, e.target.value, item.originalQty)}
                          style={{ margin: 0, padding: '6px 10px', height: 'auto', width: '100px' }}
                        />
                        <div className="text-[10px] text-slate-500 mt-1 pl-1">Max Invoiced: {item.originalQty}</div>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-200">{formatRs(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <Button onClick={handleUpdateBill} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 py-2 px-6">
                <Save className="w-5 h-5" /> Save Changes & Update System
              </Button>
            </div>
          </Card>
        )}

      </div>
    </PageShell>
  );
};

export default ProductReturn;