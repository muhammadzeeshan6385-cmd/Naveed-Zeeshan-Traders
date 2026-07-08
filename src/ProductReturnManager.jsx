import React, { useState, useMemo } from 'react';
import { Search, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, todayISO, generateId } from './utils/helpers';

const ProductReturn = ({ sales, setSales, products, setProducts, customers, setCustomers, cashData, setCashData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editableItems, setEditableItems] = useState([]); // Array of updated items
  const [statusMessage, setStatusMessage] = useState(null);

  // Filter bills in Directory tray only when user inputs parameters
  const matchingInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    
    return sales.filter(sale => 
      sale.invoiceNo.toLowerCase().includes(query) || 
      sale.customer.toLowerCase().includes(query)
    );
  }, [sales, searchQuery]);

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    // Deep copy items so we can edit quantities safely without breaking master state early
    setEditableItems(invoice.items.map(item => ({
      ...item,
      originalQty: item.qty // Keep a baseline to find the exact difference
    })));
    setStatusMessage(null);
  };

  const handleQtyChange = (productId, newQty, originalMax) => {
    const qty = Math.min(Math.max(0, Number(newQty)), originalMax);
    setEditableItems(prevItems =>
      prevItems.map(item => 
        item.productId === productId 
          ? { ...item, qty: qty, total: qty * item.rate }
          : item
      )
    );
  };

  const handleSaveChanges = () => {
    if (!selectedInvoice) return;

    const currentDate = todayISO();
    let totalReductionAmount = 0;
    const stockAdjustments = {}; // Track inventory parts changes

    // Calculate variations between baseline and new quantity configurations
    editableItems.forEach(editedItem => {
      const difference = editedItem.originalQty - editedItem.qty;
      if (difference > 0) {
        stockAdjustments[editedItem.productId] = difference;
        totalReductionAmount += difference * Number(editedItem.rate);
      }
    });

    if (totalReductionAmount === 0) {
      window.alert('No quantities were reduced. Change item counts to update the invoice.');
      return;
    }

    // 1. Revert Inventory Stock (Wapas stock mein add karein jitni items kam ki hain)
    setProducts(prevProducts => 
      prevProducts.map(prod => {
        const returnQty = stockAdjustments[prod.id] || 0;
        return returnQty > 0 
          ? { ...prod, stock: (Number(prod.stock) || 0) + returnQty }
          : prod;
      })
    );

    // 2. Adjust Financial Accounts (Cash Back or Khata Balance Reversal)
    if (selectedInvoice.paymentType === 'Cash') {
      // Cash Invoice Logic: Total Recovery + Cash Invoice - Total Exp = Cash in Hand
      setCashData(prevCash => [
        ...prevCash,
        {
          id: generateId(),
          date: currentDate,
          account: 'Cash',
          amount: totalReductionAmount,
          description: `Bill Edit Refund - Invoice: ${selectedInvoice.invoiceNo} (${selectedInvoice.customer})`,
          type: 'expense' // Outward cash flow balance correction
        }
      ]);
    } else {
      // Credit Invoice Logic: Subtract from customer's outstanding dynamic balance ledger parameters
      setCustomers(prevCustomers =>
        prevCustomers.map(cust => {
          if (cust.name === selectedInvoice.customer) {
            return { ...cust, balance: (Number(cust.balance) || 0) - totalReductionAmount };
          }
          return cust;
        })
      );
    }

    // 3. Mutate Master Sales Record Matrix Entries
    setSales(prevSales =>
      prevSales.map(sale => {
        if (sale.id === selectedInvoice.id) {
          // Keep only items that have a final quantity greater than 0
          const finalFilteredItems = editableItems
            .map(({ originalQty, ...rest }) => rest) // Strip helper parameter cleanly
            .filter(item => item.qty > 0);

          const newGross = finalFilteredItems.reduce((sum, i) => sum + i.total, 0);
          const discountPercent = sale.discountPercent || 0;
          const newDiscountAmount = (newGross * discountPercent) / 100;

          return {
            ...sale,
            items: finalFilteredItems,
            grossTotal: newGross,
            discount: newDiscountAmount,
            netTotal: newGross - newDiscountAmount
          };
        }
        return sale;
      }).filter(sale => sale.items.length > 0) // Delete complete bill if all items are turned to 0
    );

    setStatusMessage({
      type: 'success',
      text: `Invoice ${selectedInvoice.invoiceNo} updated successfully! Rs. ${formatRs(totalReductionAmount)} adjusted across records.`
    });

    // Reset workflow properties
    setSelectedInvoice(null);
    setEditableItems([]);
    setSearchQuery('');
  };

  return (
    <PageShell title="Product Return & Invoice Modification Console" className="py-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Section: Search Directory Tray */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Find Invoice">
            <div className="mb-2">
              <Input 
                label="Enter Invoice Bill No or Customer Name..." 
                placeholder="Type 0001 or Customer name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pt-2">
              {!searchQuery && (
                <div className="p-4 text-xs text-center text-slate-500 bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
                  Search system ready. Input bill specifications above to initiate real-time editing.
                </div>
              )}

              {matchingInvoices.length === 0 && searchQuery && (
                <div className="p-3 text-sm text-gray-400 bg-slate-900/40 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> No record matched.
                </div>
              )}
              
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

        {/* Right Section: Interactive Invoice Editor */}
        <div className="lg:col-span-2">
          {selectedInvoice ? (
            <Card title={`Active Invoice Editor Panel (${selectedInvoice.invoiceNo})`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-sm">
                <div className="space-y-1">
                  <div className="text-slate-400">Customer Target: <span className="text-slate-200 font-semibold">{selectedInvoice.customer}</span></div>
                  <div className="text-slate-400">Account Strategy: <span className="text-slate-200 font-semibold">{selectedInvoice.paymentType} Mode</span></div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-slate-400">Original Total: <span className="text-amber-400 font-semibold">{formatRs(selectedInvoice.netTotal)}</span></div>
                  <div className="text-slate-400">Date Logged: <span className="text-slate-200">{selectedInvoice.date}</span></div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Modify Item Quantities Below</div>
                <DataTable 
                  columns={[
                    { key: 'name', label: 'Item Name' },
                    { key: 'originalQty', label: 'Invoiced Qty', render: (row) => `${row.originalQty} units` },
                    { key: 'rate', label: 'Unit Rate', render: (row) => formatRs(row.rate) },
                    { 
                      key: 'action', 
                      label: 'Adjusted Qty', 
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            style={{ width: '90px', margin: 0 }} 
                            min="0"
                            max={row.originalQty}
                            value={row.qty}
                            onChange={(e) => handleQtyChange(row.productId, e.target.value, row.originalMax || row.originalQty)}
                          />
                          <span className="text-xs text-slate-500">max: {row.originalQty}</span>
                        </div>
                      ) 
                    }
                  ]} 
                  rows={editableItems} 
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>Discard</Button>
                <Button onClick={handleSaveChanges} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Changes & Update Records
                </Button>
              </div>
            </Card>
          ) : (
            <div className="h-full min-h-[340px] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-900/20">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-slate-300 font-medium mb-1">No Target Selected</h3>
              <p className="text-sm text-slate-500 max-w-sm">Enter a bill number on the left panel to fetch any cash or credit transaction invoice, alter items seamlessly, and recalculate financials.</p>
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
};

export default ProductReturn;