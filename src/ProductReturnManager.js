import React, { useState, useMemo } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs } from './utils/helpers';
import { 
  RotateCcw, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  CornerUpLeft, 
  ShoppingBag, 
  Calendar 
} from 'lucide-react';

const ProductReturnManager = ({ sales = [], onReturnSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnReason, setReturnReason] = useState('Market Stock Return / Replacement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const invoiceNo = (sale.invoiceNo || sale.id || '').toLowerCase();
      const customer = (sale.customerName || sale.customer || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return invoiceNo.includes(search) || customer.includes(search);
    });
  }, [sales, searchTerm]);

  const handleQtyChange = (itemId, maxQty, val) => {
    const inputVal = parseInt(val, 10);
    if (isNaN(inputVal) || inputVal < 0) {
      setReturnQuantities(prev => ({ ...prev, [itemId]: 0 }));
    } else if (inputVal > maxQty) {
      setReturnQuantities(prev => ({ ...prev, [itemId]: maxQty }));
    } else {
      setReturnQuantities(prev => ({ ...prev, [itemId]: inputVal }));
    }
  };

  const executeReturnSubmission = async (item, originalSale) => {
    const qtyToReturn = returnQuantities[item.id] || 0;
    if (qtyToReturn <= 0) {
      alert("Kindly select a quantity greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/returns/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: originalSale.id,
          productId: item.productId,
          quantity: qtyToReturn,
          reason: returnReason
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: `Return registered successfully! Impacted Bill, Stock Warehouse, and Credit Khata Ledger.` });
        setReturnQuantities(prev => ({ ...prev, [item.id]: 0 }));
        if (onReturnSuccess) onReturnSuccess();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to dispatch return parameters.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Server integration pathway exception error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell 
      title="Product Return & Reverse Logistics" 
      subtitle="Process customer item returns with automatic reversal across invoices, Khata ledgers, and inventory"
    >
      <div className="space-y-6 pb-24">
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl">
          <div className="relative w-full md:w-1/2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Search size={16} /></span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter Invoice Bill No or Customer Name..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-700 text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-bold border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">Matching Bills Directory</h3>
            {filteredSales.length === 0 ? (
              <div className="p-8 text-center border border-slate-900 bg-slate-950/20 text-slate-500 text-xs rounded-2xl italic">No billing records found.</div>
            ) : (
              filteredSales.map((sale) => (
                <div 
                  key={sale.id}
                  onClick={() => { setSelectedSale(sale); setMessage(null); }}
                  className={`p-4 border rounded-xl transition cursor-pointer flex flex-col justify-between gap-2 ${selectedSale?.id === sale.id ? 'bg-slate-900 border-slate-700' : 'bg-slate-950/60 border-slate-900 hover:border-slate-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-200">{sale.invoiceNo || `INV-${sale.id.slice(0, 8)}`}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sale.isCredit ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {sale.isCredit ? 'Khata Bill' : 'Cash Paid'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 truncate">{sale.customerName || 'Walk-in Customer'}</div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 border-t border-slate-900/60 pt-2 mt-1">
                    <div className="flex items-center gap-1"><Calendar size={12} /> {sale.date}</div>
                    <div className="font-bold text-slate-300">{formatRs(sale.netTotal)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedSale ? (
              <Card className="p-6 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-4 mb-4 gap-2">
                  <div>
                    <h2 className="text-sm font-black text-slate-200 uppercase tracking-wide">Invoice Reverse Panel</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Target Account: <span className="text-amber-400 font-bold">{selectedSale.customerName}</span></p>
                  </div>
                </div>

                <div className="mb-6 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reason for Return</label>
                  <input 
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-900 rounded-xl focus:outline-none focus:border-slate-800 text-slate-300"
                  />
                </div>

                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1"><ShoppingBag size={13} /> Bill Products</h3>
                <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold text-[10px] tracking-wider uppercase border-b border-slate-900">
                        <th className="p-3 pl-4">Item Name</th>
                        <th className="p-3 text-center">Invoiced Qty</th>
                        <th className="p-3 text-right">Unit Rate</th>
                        <th className="p-3 text-center w-36">Qty to Return</th>
                        <th className="p-3 text-right pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/80">
                      {selectedSale.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/20 transition">
                          <td className="p-3 pl-4 font-bold text-slate-300">
                            {item.productName || item.product?.name}
                            {item.isReturned && <span className="text-rose-400 ml-1.5 font-black text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded">(Return)</span>}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-400">{item.quantity} units</td>
                          <td className="p-3 text-right text-slate-400">{formatRs(item.price)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2 justify-center">
                              <input 
                                type="number" 
                                min="0"
                                max={item.quantity}
                                value={returnQuantities[item.id] || ''}
                                onChange={(e) => handleQtyChange(item.id, item.quantity, e.target.value)}
                                placeholder="0"
                                disabled={item.quantity === 0}
                                className="w-20 text-center py-1 font-bold bg-slate-950 border border-slate-800 rounded-lg text-rose-300 focus:outline-none focus:border-rose-500 disabled:opacity-40 text-xs"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right pr-4">
                            <button
                              type="button"
                              onClick={() => executeReturnSubmission(item, selectedSale)}
                              disabled={isSubmitting || (returnQuantities[item.id] || 0) <= 0 || item.quantity === 0}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white transition disabled:opacity-30 cursor-pointer"
                            >
                              <CornerUpLeft size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <div className="h-96 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 p-6 bg-slate-950/10">
                <RotateCcw size={32} className="text-slate-700 animate-pulse mb-3" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Select an Invoice</p>
                <p className="text-[11px] text-slate-500 text-center mt-1">Choose a bill from the directory panel to perform returns management adjustments.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ProductReturnManager;