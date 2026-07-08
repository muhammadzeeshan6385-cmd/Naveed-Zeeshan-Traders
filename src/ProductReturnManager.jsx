import React, { useState, useMemo } from 'react';
import { Search, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { formatRs, todayISO, generateId } from './utils/helpers';

const ProductReturn = ({ sales = [], setSales, products = [], setProducts, customers = [], setCustomers, cashData = [], setCashData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editableItems, setEditableItems] = useState([]); 
  const [statusMessage, setStatusMessage] = useState(null);

  // Bill search logic (Dono Cash aur Credit bills support karta hai)
  const matchingInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    
    return sales.filter(sale => 
      sale?.invoiceNo?.toLowerCase().includes(query) || 
      sale?.customer?.toLowerCase().includes(query)
    );
  }, [sales, searchQuery]);

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    // Baseline items set karna taake original aur new quantity ka difference nikal sakein
    setEditableItems((invoice.items || []).map(item => ({
      ...item,
      originalQty: item.qty
    })));
    setStatusMessage(null);
  };

  const handleQtyChange = (productId, newQty, originalMax) => {
    const qty = Math.min(Math.max(0, Number(newQty)), originalMax);
    setEditableItems(prevItems =>
      prevItems.map(item => 
        item.productId === productId 
          ? { ...item, qty: qty, total: qty * Number(item.rate) }
          : item
      )
    );
  };

  const handleSaveChanges = () => {
    if (!selectedInvoice) return;

    const currentDate = todayISO();
    let totalReductionAmount = 0;
    const stockAdjustments = {};

    // Dono quantities ka farq nikalna
    editableItems.forEach(editedItem => {
      const difference = editedItem.originalQty - editedItem.qty;
      if (difference > 0) {
        stockAdjustments[editedItem.productId] = difference;
        totalReductionAmount += difference * Number(editedItem.rate);
      }
    });

    if (totalReductionAmount === 0) {
      window.alert('No items were reduced. Change any quantity to update the bill.');
      return;
    }

    // 1. Stock Updates (Jitni items kam keen wo stock mein wapas jama ho jayengi)
    if (setProducts) {
      setProducts(prevProducts => 
        prevProducts.map(prod => {
          const returnQty = stockAdjustments[prod.id] || 0;
          return returnQty > 0 
            ? { ...prod, stock: (Number(prod.stock) || 0) + returnQty }
            : prod;
        })
      );
    }

    // 2. Financial Impacts (Cash in Hand aur Ledger Balances)
    if (selectedInvoice.paymentType === 'Cash') {
      if (setCashData) {
        setCashData(prevCash => [
          ...prevCash,
          {
            id: generateId(),
            date: currentDate,
            account: 'Cash',
            amount: totalReductionAmount,
            description: `Bill Edit Return - Invoice: ${selectedInvoice.invoiceNo} (${selectedInvoice.customer})`,
            type: 'expense' // Cash out configuration
          }
        ]);
      }
    } else {
      if (setCustomers) {
        setCustomers(prevCustomers =>
          prevCustomers.map(cust => {
            if (cust.name === selectedInvoice.customer) {
              return { ...cust, balance: (Number(cust.balance) || 0) - totalReductionAmount };
            }
            return cust;
          })
        );
      }
    }

    // 3. Master Sales Array Update (Bill update or delete matching logic)
    if (setSales) {
      setSales(prevSales =>
        prevSales.map(sale => {
          if (sale.id === selectedInvoice.id) {
            const finalFilteredItems = editableItems
              .map(({ originalQty, ...rest }) => rest)
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
        }).filter(sale => sale.items.length > 0)
      );
    }

    setStatusMessage({
      type: 'success',
      text: `Bill ${selectedInvoice.invoiceNo} successfully updated! Rs. ${formatRs(totalReductionAmount)} balance adjusted.`
    });

    // Form reset parameters
    setSelectedInvoice(null);
    setEditableItems([]);
    setSearchQuery('');
  };

  return (
    <PageShell title="Product Return & Invoice Modification Console" className="py-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Section: Search Directory */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Find Invoice">
            <div className="mb-2">
              <Input 
                label="Search Invoice No / Customer Name" 
                placeholder="Type Invoice No or Name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pt-2">
              {!searchQuery && (
                <div className="p-4 text-xs text-center text-slate-500 bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
                  Search system ready. Enter bill parameters above to search.
                </div>
              )}

              {matchingInvoices.length === 0 && searchQuery && (
                <div className="p-3 text-sm text-gray-400 bg-slate-900/40 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> No transaction found.
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

        {/* Right Section: Edit Console */}
        <div className="lg:col-span-2">
          {selectedInvoice ? (
            <Card title={`Active Invoice Editor Panel (${selectedInvoice.invoiceNo})`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-sm">
                <div className="space-y-1">
                  <div className="text-slate-400">Customer Name: <span className="text-slate-200 font-semibold">{selectedInvoice.customer}</span></div>
                  <div className="text-slate-400">Payment Type: <span className="text-slate-200 font-semibold">{selectedInvoice.paymentType}</span></div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-slate-400">Grand Total: <span className="text-amber-400 font-semibold">{formatRs(selectedInvoice.netTotal)}</span></div>
                  <div className="text-slate-400">Date: <span className="text-slate-200">{selectedInvoice.date}</span></div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Items Grid (Reduce Qty to Edit)</div>
                <DataTable 
                  columns={[
                    { key: 'name', label: 'Item Name' },
                    { key: 'originalQty', label: 'Invoiced Qty', render: (row) => `${row.originalQty} units` },
                    { key: 'rate', label: 'Unit Rate', render: (row) => formatRs(row.rate) },
                    { 
                      key: 'action', 
                      label: 'Modify Qty', 
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            style={{ width: '90px', margin: 0 }} 
                            min="0"
                            max={row.originalQty}
                            value={row.qty}
                            onChange={(e) => handleQtyChange(row.productId, e.target.value, row.originalQty)}
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
              <h3 className="text-slate-300 font-medium mb-1">No Invoice Targeted</h3>
              <p className="text-sm text-slate-500 max-w-sm">Enter a bill number on the left panel to fetch any cash or credit transaction invoice, alter items seamlessly, and recalculate financials.</p>
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
};

export default ProductReturn;