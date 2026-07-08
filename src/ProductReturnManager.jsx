import React, { useState, useMemo } from 'react';
import { Search, Undo2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, todayISO, generateId } from './utils/helpers';

const ProductReturn = ({ sales, setSales, products, setProducts, customers, setCustomers, cashData, setCashData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({}); // { productId: qty }
  const [returnReason, setReturnReason] = useState('Market Stock Return / Replacement');
  const [statusMessage, setStatusMessage] = useState(null);

  // Simple Clean Filter: Only query when user types something to avoid dense screens
  const matchingInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return []; // Input khali hone par directory khali rahegi
    
    return sales.filter(sale => 
      sale.invoiceNo.toLowerCase().includes(query) || 
      sale.customer.toLowerCase().includes(query)
    );
  }, [sales, searchQuery]);

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    const initialQtys = {};
    invoice.items.forEach(item => {
      initialQtys[item.productId] = 0;
    });
    setReturnQuantities(initialQtys);
    setStatusMessage(null);
  };

  const handleQtyChange = (productId, val, maxQty) => {
    const qty = Math.min(Math.max(0, Number(val)), maxQty);
    setReturnQuantities(prev => ({ ...prev, [productId]: qty }));
  };

  const handleExecuteReturn = () => {
    if (!selectedInvoice) return;

    const hasItemsToReturn = Object.values(returnQuantities).some(qty => qty > 0);
    if (!hasItemsToReturn) {
      window.alert('Please specify at least 1 item quantity to return.');
      return;
    }

    const currentDate = todayISO();
    let dynamicReturnTotal = 0;

    // 1. Revert Inventory Stock Parameters Safely
    setProducts(prevProducts => 
      prevProducts.map(prod => {
        const returnQty = returnQuantities[prod.id] || 0;
        if (returnQty > 0) {
          const invoiceItem = selectedInvoice.items.find(i => i.productId === prod.id);
          if (invoiceItem) {
            dynamicReturnTotal += returnQty * Number(invoiceItem.rate);
          }
          return { ...prod, stock: (Number(prod.stock) || 0) + returnQty };
        }
        return prod;
      })
    );

    // 2. Adjust Financial Flow Based on Account Payment Modality
    if (selectedInvoice.paymentType === 'Cash') {
      setCashData(prevCash => [
        ...prevCash,
        {
          id: generateId(),
          date: currentDate,
          account: 'Cash',
          amount: dynamicReturnTotal,
          description: `Product Return Restock - Invoice: ${selectedInvoice.invoiceNo} (${selectedInvoice.customer})`,
          type: 'expense'
        }
      ]);
    } else {
      setCustomers(prevCustomers =>
        prevCustomers.map(cust => {
          if (cust.name === selectedInvoice.customer) {
            return { ...cust, balance: (Number(cust.balance) || 0) - dynamicReturnTotal };
          }
          return cust;
        })
      );
    }

    // 3. Mutate Sale Records Entries Array
    setSales(prevSales =>
      prevSales.map(sale => {
        if (sale.id === selectedInvoice.id) {
          const updatedItems = sale.items.map(item => {
            const returnedQty = returnQuantities[item.productId] || 0;
            const newQty = Math.max(0, item.qty - returnedQty);
            return { ...item, qty: newQty, total: newQty * item.rate };
          });
          
          const newGross = updatedItems.reduce((sum, i) => sum + i.total, 0);
          const newDiscountAmount = (newGross * (sale.discountPercent || 0)) / 100;
          
          return {
            ...sale,
            items: updatedItems.filter(i => i.qty > 0),
            grossTotal: newGross,
            discount: newDiscountAmount,
            netTotal: newGross - newDiscountAmount
          };
        }
        return sale;
      }).filter(sale => sale.items.length > 0)
    );

    setStatusMessage({
      type: 'success',
      text: `Return processed! Rs. ${formatRs(dynamicReturnTotal)} adjusted for ${selectedInvoice.customer}.`
    });

    setSelectedInvoice(null);
    setReturnQuantities({});
    setSearchQuery('');
  };

  return (
    <PageShell title="Product Return & Reverse Logistics" className="py-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Section: Input Query & Search Feed */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Find Invoice">
            <div className="mb-2">
              <Input 
                label="Enter Invoice Bill No or Customer Name..." 
                placeholder="Type name or number to search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pt-2">
              {/* State when user has not typed anything */}
              {!searchQuery && (
                <div className="p-4 text-xs text-center text-slate-500 bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
                  Search panel active. Type billing parameters above to instantly fetch records.
                </div>
              )}

              {/* State when user typed something but no record matches */}
              {matchingInvoices.length === 0 && searchQuery && (
                <div className="p-3 text-sm text-gray-400 bg-slate-900/40 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> No record matched.
                </div>
              )}
              
              {/* Populated Search Results */}
              {matchingInvoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  onClick={() => handleSelectInvoice(invoice)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedInvoice?.id === invoice.id 
                      ? 'bg-emerald-950/40 border-emerald-500 text-white' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm">{invoice.invoiceNo}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      invoice.paymentType === 'Cash' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {invoice.paymentType} Account
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium truncate">{invoice.customer}</div>
                  <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
                    <span>{invoice.date}</span>
                    <span className="font-semibold text-slate-300">{formatRs(invoice.netTotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {statusMessage && (
            <div className="p-4 rounded-lg flex items-start gap-3 border bg-emerald-950/40 border-emerald-500/30 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{statusMessage.text}</div>
            </div>
          )}
        </div>

        {/* Right Section: Return Execution Console */}
        <div className="lg:col-span-2">
          {selectedInvoice ? (
            <Card title={`Invoice Reverse Panel (${selectedInvoice.invoiceNo})`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                <div className="text-sm space-y-1">
                  <div className="text-slate-400">Account Name: <span className="text-slate-200 font-semibold">{selectedInvoice.customer}</span></div>
                  <div className="text-slate-400">Payment Channel: <span className="text-slate-200 font-semibold">{selectedInvoice.paymentType}</span></div>
                </div>
                <div>
                  <Select 
                    label="Reason for Return" 
                    value={returnReason} 
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    <option value="Market Stock Return / Replacement">Market Stock Return / Replacement</option>
                    <option value="Defective / Damaged Piece">Defective / Damaged Piece</option>
                    <option value="Order Correction Adjustment">Order Correction Adjustment</option>
                  </Select>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Invoice Products Tray</div>
                <DataTable 
                  columns={[
                    { key: 'name', label: 'Item Name' },
                    { key: 'qty', label: 'Invoiced Qty', render: (row) => `${row.qty} units` },
                    { key: 'rate', label: 'Unit Rate', render: (row) => formatRs(row.rate) },
                    { 
                      key: 'action', 
                      label: 'Qty to Return', 
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            style={{ width: '80px', margin: 0 }} 
                            min="0"
                            max={row.qty}
                            value={returnQuantities[row.productId] || 0}
                            onChange={(e) => handleQtyChange(row.productId, e.target.value, row.qty)}
                          />
                          <span className="text-xs text-slate-500">max: {row.qty}</span>
                        </div>
                      ) 
                    }
                  ]} 
                  rows={selectedInvoice.items || []} 
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>Cancel</Button>
                <Button onClick={handleExecuteReturn} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
                  <Undo2 className="w-4 h-4" /> Process Reverse Restock
                </Button>
              </div>
            </Card>
          ) : (
            <div className="h-full min-h-[340px] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-900/20">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-slate-300 font-medium mb-1">No Invoice Targeted</h3>
              <p className="text-sm text-slate-500 max-w-sm">Search and select an active cash or credit transaction bill from the directory tray to initiate dynamic returns.</p>
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
};

export default ProductReturn;