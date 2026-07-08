import React, { useState, useMemo } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs, todayISO, generateId } from './utils/helpers';
import { Search, Save, AlertTriangle, CheckCircle } from 'lucide-react';

const ProductReturnManager = ({ sales = [], setSales, products = [], setProducts, customers = [], setCustomers, cashData = [], setCashData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [message, setMessage] = useState(null);

  // 1. Bill Number se accurate calculation search filtering query
  const handleSearchBill = () => {
    setMessage(null);
    if (!searchTerm.trim()) {
      setMessage({ type: 'error', text: 'Enter a valid invoice number.' });
      return;
    }

    const targetInvoice = sales.find(
      (s) => s?.invoiceNo?.toLowerCase() === searchTerm.trim().toLowerCase()
    );

    if (targetInvoice) {
      setSelectedSale(targetInvoice);
      setEditableItems(
        (targetInvoice.items || []).map((item) => ({
          ...item,
          originalQty: item.qty,
        }))
      );
    } else {
      setSelectedSale(null);
      setMessage({ type: 'error', text: 'Invoice target not found in records.' });
    }
  };

  // 2. Real-time items counting handler matrix logic
  const handleItemQtyUpdate = (productId, dynamicValue, maxLimit) => {
    const updatedCount = Math.min(Math.max(0, Number(dynamicValue)), maxLimit);
    setEditableItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: updatedCount, total: updatedCount * Number(item.rate) }
          : item
      )
    );
  };

  // 3. Complete structural pipeline logic sync updates across all systems
  const commitInvoiceChanges = () => {
    if (!selectedSale) return;

    let totalRefundValue = 0;
    const inventoryPayload = {};

    editableItems.forEach((entry) => {
      const calculationDiff = entry.originalQty - entry.qty;
      if (calculationDiff > 0) {
        inventoryPayload[entry.productId] = calculationDiff;
        totalRefundValue += calculationDiff * Number(entry.rate);
      }
    });

    if (totalRefundValue === 0) {
      alert('Aap ne koi item kam nahi ki. Bill update karne ke liye item ki quantity kam karein.');
      return;
    }

    const logTimestamp = todayISO();

    // A: Realtime Reverse Inventory Adjustment Matrix Updates
    if (setProducts) {
      setProducts((currentInventory) =>
        currentInventory.map((product) => {
          const recoveryCount = inventoryPayload[product.id] || 0;
          return recoveryCount > 0
            ? { ...product, stock: (Number(product.stock) || 0) + recoveryCount }
            : product;
        })
      );
    }

    // B: Dynamic Financial Settlement Protocols (Cash in Hand vs Customer Balance Ledger)
    if (selectedSale.paymentType === 'Cash') {
      if (setCashData) {
        setCashData((currentCashRegistry) => [
          ...currentCashRegistry,
          {
            id: generateId(),
            date: logTimestamp,
            account: 'Cash',
            amount: totalRefundValue,
            description: `Invoice Correction Outflow (Bill Ref: ${selectedSale.invoiceNo})`,
            type: 'expense',
          },
        ]);
      }
    } else {
      if (setCustomers) {
        setCustomers((currentClientsData) =>
          currentClientsData.map((client) => {
            if (client.name === selectedSale.customer) {
              return { ...client, balance: (Number(client.balance) || 0) - totalRefundValue };
            }
            return client;
          })
        );
      }
    }

    // C: In-Place Mutation Schema over master sales table metrics
    if (setSales) {
      setSales((currentSalesLedger) =>
        currentSalesLedger
          .map((bill) => {
            if (bill.id === selectedSale.id) {
              const adjustedProductsList = editableItems
                .map(({ originalQty, ...cleanObject }) => cleanObject)
                .filter((item) => item.qty > 0);

              const rawGrossTotal = adjustedProductsList.reduce((sum, item) => sum + item.total, 0);
              const baselineDiscountPercent = bill.discountPercent || 0;
              const reevaluatedDiscount = (rawGrossTotal * baselineDiscountPercent) / 100;

              return {
                ...bill,
                items: adjustedProductsList,
                grossTotal: rawGrossTotal,
                discount: reevaluatedDiscount,
                netTotal: rawGrossTotal - reevaluatedDiscount,
              };
            }
            return bill;
          })
          .filter((bill) => bill.items.length > 0)
      );
    }

    alert(`Bill ${selectedSale.invoiceNo} successfully updated! System synced across variables.`);
    setSelectedSale(null);
    setSearchTerm('');
    setEditableItems([]);
  };

  return (
    <PageShell title="Invoice Edit & System Correction Panel" className="py-2">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Core Control Engine: Document Finder Box */}
        <Card title="Search Bill Parameters">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Enter Bill Number</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. INV-00002"
              />
            </div>
            <button
              onClick={handleSearchBill}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg flex items-center h-[38px] transition-colors"
            >
              <Search className="w-4 h-4 mr-1" /> Open Bill
            </button>
          </div>
          {message?.type === 'error' && (
            <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {message.text}
            </div>
          )}
        </Card>

        {/* Dynamic Display Render: Live Data Terminal Form */}
        {selectedSale && (
          <Card title={`Active Modification Terminal - ${selectedSale.invoiceNo}`}>
            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs mb-4">
              <div>
                <p className="text-slate-400">Customer Account: <span className="text-white font-bold">{selectedSale.customer}</span></p>
                <p className="text-slate-400 mt-1">Payment Method: <span className="text-emerald-400 font-semibold">{selectedSale.paymentType}</span></p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Date Issued: <span className="text-white">{selectedSale.date}</span></p>
                <p className="text-slate-400 mt-1">Total Bill Value: <span className="text-amber-400 font-bold">{formatRs(selectedSale.netTotal)}</span></p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg mb-4">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="p-2.5 font-semibold">Item Description</th>
                    <th className="p-2.5 font-semibold">Unit Price</th>
                    <th className="p-2.5 font-semibold w-36">Modify Quantity</th>
                    <th className="p-2.5 font-semibold text-right">Adjusted Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {editableItems.map((productRow, index) => (
                    <tr key={index} className="hover:bg-slate-900/80 transition-colors">
                      <td className="p-2.5 text-slate-200">{productRow.name}</td>
                      <td className="p-2.5 text-slate-400">{formatRs(productRow.rate)}</td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={productRow.originalQty}
                            value={productRow.qty}
                            onChange={(e) => handleItemQtyUpdate(productRow.productId, e.target.value, productRow.originalQty)}
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white text-xs focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-[10px] text-slate-500">Max: {productRow.originalQty}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-medium text-slate-200">{formatRs(productRow.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={commitInvoiceChanges}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </Card>
        )}

      </div>
    </PageShell>
  );
};

export default ProductReturnManager;