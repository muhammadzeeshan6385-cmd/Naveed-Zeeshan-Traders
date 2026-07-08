import React, { useState, useMemo } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs, todayISO, generateId } from './utils/helpers';
import { 
  RotateCcw, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  CornerUpLeft, 
  ShoppingBag, 
  Calendar 
} from 'lucide-react';

const ProductReturnManager = ({ sales = [], setSales, products = [], setProducts, customers = [], setCustomers, cashData = [], setCashData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnReason, setReturnReason] = useState('Market Stock Return / Replacement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Filter sales list for the sidebar matrix directory
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const invoiceNo = (sale.invoiceNo || sale.id || '').toLowerCase();
      const customer = (sale.customerName || sale.customer || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return invoiceNo.includes(search) || customer.includes(search);
    });
  }, [sales, searchTerm]);

  // Handle local quantity change validation tracker
  const handleQtyChange = (itemId, maxQty, val) => {
    const inputVal = val === '' ? '' : Number(val);
    if (inputVal !== '' && (inputVal < 0 || inputVal > maxQty)) return;
    
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: inputVal
    }));
  };

  // Main system execution core block
  const handleProcessReturn = async () => {
    if (!selectedSale) return;
    
    // Check if any item has been selected for return
    const itemsToReturn = selectedSale.items.filter(item => {
      const returnQty = returnQuantities[item.productId || item.id];
      return returnQty && Number(returnQty) > 0;
    });

    if (itemsToReturn.length === 0) {
      setMessage({ type: 'error', text: 'Please specify return quantity for at least one item.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      let totalRefundAmount = 0;
      const stockUpdates = {};

      itemsToReturn.forEach(item => {
        const rQty = Number(returnQuantities[item.productId || item.id]);
        totalRefundAmount += rQty * Number(item.rate);
        stockUpdates[item.productId || item.id] = rQty;
      });

      const currentTimestamp = todayISO();

      // Setup payload structure for DB pipeline transmission
      const updatePayload = {
        id: selectedSale.id,
        invoiceNo: selectedSale.invoiceNo,
        refundAmount: totalRefundAmount,
        returnReason: returnReason,
        date: currentTimestamp,
        paymentType: selectedSale.paymentType,
        customer: selectedSale.customer,
        items: selectedSale.items.map(item => {
          const rQty = Number(returnQuantities[item.productId || item.id] || 0);
          const newQty = Math.max(0, item.qty - rQty);
          return {
            ...item,
            qty: newQty,
            total: newQty * Number(item.rate)
          };
        }).filter(i => i.qty > 0)
      };

      // Backend Prisma Pipeline connection
      const response = await fetch('/api/sales/update-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      // 1. Update Master Inventory logs
      if (setProducts) {
        setProducts(prevProducts => 
          prevProducts.map(p => {
            const returnedVolume = stockUpdates[p.id] || 0;
            return returnedVolume > 0 ? { ...p, stock: (Number(p.stock) || 0) + returnedVolume } : p;
          })
        );
      }

      // 2. Adjust financial layers (Cash flow registry vs Customer Khata balances)
      if (selectedSale.paymentType === 'Cash') {
        if (setCashData) {
          setCashData(prevCash => [
            ...prevCash,
            {
              id: generateId(),
              date: currentTimestamp,
              account: 'Cash',
              amount: totalRefundAmount,
              description: `Product Return Outflow (Invoice Ref: ${selectedSale.invoiceNo})`,
              type: 'expense'
            }
          ]);
        }
      } else {
        if (setCustomers) {
          setCustomers(prevCustomers => 
            prevCustomers.map(c => {
              if (c.name === selectedSale.customer || c.id === selectedSale.customerId) {
                return { ...c, balance: (Number(c.balance) || 0) - totalRefundAmount };
              }
              return c;
            })
          );
        }
      }

      // 3. Mutate master sales tracking array block to instantly sync with Search Bill
      if (setSales) {
        setSales(prevSales => 
          prevSales.map(sale => {
            if (sale.id === selectedSale.id || sale.invoiceNo === selectedSale.invoiceNo) {
              const updatedItems = sale.items.map(item => {
                const rQty = Number(returnQuantities[item.productId || item.id] || 0);
                const newQty = Math.max(0, item.qty - rQty);
                return { ...item, qty: newQty, total: newQty * Number(item.rate) };
              }).filter(i => i.qty > 0);

              const newGross = updatedItems.reduce((sum, i) => sum + i.total, 0);
              const discPercent = sale.discountPercent || 0;
              const newDiscAmount = (newGross * discPercent) / 100;

              return {
                ...sale,
                items: updatedItems,
                grossTotal: newGross,
                discount: newDiscAmount,
                netTotal: newGross - newDiscAmount
              };
            }
            return sale;
          }).filter(sale => sale.items.length > 0)
        );
      }

      setMessage({ type: 'success', text: `Return processed successfully. Rs. ${formatRs(totalRefundAmount)} adjusted.` });
      setReturnQuantities({});
      setSelectedSale(null);

    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Server integration pathway exception error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell title="Product Return & Reverse Logistics" className="py-2">
      <div className="space-y-4">
        
        {/* Top Search bar interface input controller node */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Enter Invoice Bill No or Customer Name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-xs ${message.type === 'success' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800' : 'bg-red-950/50 text-red-400 border border-red-900'}`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Layout split view screen structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left panel layout tree element view */}
          <div className="lg:col-span-4 space-y-2 max-h-[550px] overflow-y-auto pr-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">Matching Bills Directory</h3>
            {filteredSales.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl">No active invoices matched.</div>
            ) : (
              filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => { setSelectedSale(sale); setReturnQuantities({}); setMessage(null); }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${selectedSale?.id === sale.id ? 'bg-blue-950/40 border-blue-600' : 'bg-slate-900/30 border-slate-800/80 hover:bg-slate-900/60'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-white">{sale.invoiceNo || `INV-${sale.id.slice(0,5)}`}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">{sale.paymentType}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">{sale.customer || 'Walk-in Customer'}</div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {sale.date}</span>
                    <span className="font-bold text-slate-300 text-xs">Rs. {formatRs(sale.netTotal)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right layout execution details workflow terminal panel */}
          <div className="lg:col-span-8">
            {selectedSale ? (
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-white">Invoice Reverse Panel</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Target Account: <span className="text-slate-300 font-medium">{selectedSale.customer || 'Walk-in'}</span></p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Reason for Return</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block">Bill Products</span>
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 font-medium">Item Name</th>
                          <th className="p-2.5 font-medium text-center">Invoiced Qty</th>
                          <th className="p-2.5 font-medium text-right">Unit Rate</th>
                          <th className="p-2.5 font-medium text-center w-28">Qty to Return</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 bg-slate-950/20">
                        {selectedSale.items.map((item) => {
                          const itemId = item.productId || item.id;
                          return (
                            <tr key={itemId} className="hover:bg-slate-900/20">
                              <td className="p-2.5 font-medium text-slate-200">{item.name}</td>
                              <td className="p-2.5 text-center text-slate-400">{item.qty} units</td>
                              <td className="p-2.5 text-right text-slate-400">Rs. {formatRs(item.rate)}</td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.qty}
                                  placeholder="0"
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center text-xs text-white focus:outline-none focus:border-blue-500"
                                  value={returnQuantities[itemId] ?? ''}
                                  onChange={(e) => handleQtyChange(itemId, item.qty, e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    onClick={handleProcessReturn}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Processing Reversals...' : 'Execute Stock Return & Sync'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[350px] flex flex-col items-center justify-center text-center bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl p-6">
                <RotateCcw className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
                <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider">Select an Invoice</h4>
                <p className="text-slate-500 text-[11px] mt-1 max-w-xs">Choose a bill from the directory panel to perform returns management adjustments.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </PageShell>
  );
};

export default ProductReturnManager;