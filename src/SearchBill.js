import React, { useState, useMemo } from 'react';
import { Printer, Pencil, Trash2, X } from 'lucide-react';
import { Card, Input, DataTable, PageShell, Button, Select } from './components/ui';
import { formatRs } from './utils/helpers'; 

// Firebase Firestore imports
import { db } from './firebase'; 
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

const SearchBill = ({ sales, setSales, userRole }) => {
  // Case-insensitivity secure role checking validation
  const isAdmin = userRole && typeof userRole === 'string' && userRole.toLowerCase().trim() === 'admin';

  const [billSearch, setBillSearch] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Edit Popup Modal States
  const [editingBill, setEditingBill] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- SEARCH AND PAGINATION LOGIC ---
  const filteredBills = useMemo(() => {
    const reversed = [...sales].reverse();
    if (!billSearch.trim()) return reversed;
    
    const query = billSearch.toLowerCase();
    return reversed.filter(s => 
      (s.invoiceNo && s.invoiceNo.toLowerCase().includes(query)) || 
      (s.customer && s.customer.toLowerCase().includes(query))
    );
  }, [sales, billSearch]);

  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBills.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBills, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage) || 1;

  const deleteBill = async (row) => {
    if (!isAdmin) {
      window.alert('Unauthorized action. Only admins can delete bills.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete invoice #${row.invoiceNo}?`)) {
      const targetId = row.id || row._id;
      if (!targetId) {
        window.alert("Bill configuration ID missing.");
        return;
      }

      try {
        await deleteDoc(doc(db, 'sales', targetId));
        if (setSales) {
          setSales(sales.filter(s => s.id !== targetId && s._id !== targetId));
        }
        console.log("Invoice bill successfully removed from Firestore.");
      } catch (error) {
        console.error("Firebase deletion error:", error);
        window.alert("Database se invoice clear karte hue error aya: " + error.message);
      }
    }
  };

  const updateBill = async () => {
    if (!isAdmin) {
      window.alert('Unauthorized data modification attempt.');
      return;
    }

    const targetId = editingBill.id || editingBill._id;
    if (!targetId) {
      window.alert("Invoice document reference missing.");
      return;
    }

    try {
      setIsSubmitting(true);
      const netTotal = Number(editingBill.netTotal) || 0;
      const paidAmount = Number(editingBill.paidAmount) || 0;

      const updatedPayload = {
        ...editingBill,
        netTotal,
        paidAmount
      };

      await updateDoc(doc(db, 'sales', targetId), updatedPayload);

      if (setSales) {
        setSales(sales.map(s => (s.id === targetId || s._id === targetId) ? updatedPayload : s));
      }
      setEditingBill(null);
      console.log("Bill modified successfully inside Firebase.");
    } catch (error) {
      console.error("Firebase update path error:", error);
      window.alert("Database configuration update error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const printBill = (bill) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Dynamic remaining balance calculations
    const grossTotal = Number(bill.grossTotal || 0);
    const discount = Number(bill.discount || 0);
    const prevBalance = Number(bill.prevBalance || 0);
    const netTotal = Number(bill.netTotal || (grossTotal - discount));
    const totalPayable = netTotal + prevBalance;
    const paidAmount = Number(bill.paidAmount || bill.cashReceived || netTotal);
    const remainingBalance = totalPayable - paidAmount;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Bill #${bill.invoiceNo}</title>
          <style>
            @page { size: A5; margin: 5mm; }
            body { font-family: sans-serif; width: 138mm; margin: 0; padding: 0; color: black; }
            .bill-container { border: 2px solid #000; padding: 10px; min-height: 100mm; }
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
          <div class="bill-container">
            <div class="header-container">
              <img src="/logo-dark.png" class="logo" onerror="this.style.display='none'" />
              <div class="title-section">
                <h1>Naveed & Zeeshan Traders, Mailsi</h1>
                <p>PH: 0300-3999866, 0307-6385852</p>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; font-size: 12px;">
              <div><strong>Bill No:</strong> ${bill.invoiceNo}</div>
              <div><strong>Customer:</strong> ${bill.customer}</div>
              <div><strong>Date:</strong> ${bill.date}</div>
              <div><strong>Time:</strong> ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            </div>
            <table>
              <thead><tr><th>Ser</th><th>Product Name</th><th>Piece</th><th>Rate</th><th>Total</th></tr></thead>
              <tbody>
                ${(bill.items || []).map((i, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td class="product-name">${i.name}</td>
                    <td>${i.qty}</td>
                    <td>${formatRs(i.rate || 0)}</td>
                    <td>${formatRs(i.total)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
            <div class="totals-container">
              <table class="totals-table">
                <tr><td class="label-col">Grand Total:</td><td class="amount-col">${formatRs(grossTotal)}</td></tr>
                <tr><td class="label-col">Discount:</td><td class="amount-col">${formatRs(discount)}</td></tr>
                <tr><td class="label-col">Prev Balance:</td><td class="amount-col">${formatRs(prevBalance)}</td></tr>
                <tr><td class="label-col" style="border-top: 2px solid #000;">Payable Amount:</td><td class="amount-col" style="border-top: 2px solid #000;">${formatRs(totalPayable)}</td></tr>
                <tr><td class="label-col" style="color: #047857;">Cash Paid:</td><td class="amount-col" style="color: #047857;">${formatRs(paidAmount)}</td></tr>
                <tr><td class="label-col" style="border-top: 1px double #000; color: #b91c1c;">Remaining Bal:</td><td class="amount-col" style="border-top: 1px double #000; color: #b91c1c;">${formatRs(remainingBalance)}</td></tr>
              </table>
            </div>
            <div style="margin-top: 60px; display: flex; justify-content: flex-end;">
              <div style="text-align: center; border-top: 1px solid #000; width: 200px; padding-top: 5px; font-size: 12px; font-weight: bold;">
                Customer Signature
              </div>
            </div>    
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <PageShell title="Search Bills">
      <Card title="Find & Reprint Bills">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
          <div className="w-full max-w-md">
            <Input 
              placeholder="Search by Bill No or Customer Name..." 
              value={billSearch} 
              onChange={(e) => {
                setBillSearch(e.target.value);
                setCurrentPage(1); 
              }} 
            />
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto text-sm">
            <span className="text-slate-400">Show:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); 
              }}
              className="bg-[#0f172a] text-white border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer text-sm font-medium"
            >
              <option value={10}>10 Bills</option>
              <option value={25}>25 Bills</option>
              <option value={50}>50 Bills</option>
              <option value={100}>100 Bills</option>
            </select>
          </div>
        </div>

        <DataTable 
          columns={[
            { key: 'invoiceNo', label: 'Bill No' },
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'netTotal', label: 'Total', render: (row) => formatRs(row.netTotal) },
            { 
              key: 'action', 
              label: 'Action', 
              render: (row) => (
                <div className="flex items-center gap-2">
                  <Button onClick={() => printBill(row)} className="bg-blue-600 py-1 px-2.5 text-xs flex items-center gap-1">
                    <Printer size={14} /> Reprint
                  </Button>
                  
                  {/* Strict action logic boundary protection */}
                  {isAdmin && (
                    <>
                      <button onClick={() => setEditingBill(row)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded cursor-pointer border border-transparent" title="Edit"><Pencil size={16} /></button>
                      <button onClick={() => deleteBill(row)} className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded cursor-pointer border border-transparent" title="Delete"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              )
            }
          ]} 
          rows={paginatedBills} 
        />

        {/* Hamesha Nagar Aane Wala Pagination Control Bar */}
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-slate-400">
            Showing {filteredBills.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBills.length)} of {filteredBills.length} entries
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-3 py-1 text-xs"
            >
              Previous
            </Button>
            
            {[...Array(totalPages)].map((_, index) => {
              const pageNum = index + 1;
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-xs ${currentPage === pageNum ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-3 py-1 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Edit Bill Overlay Portal Modal Box */}
      {isAdmin && editingBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">Edit Bill Net Valuation</h2>
              <button onClick={() => setEditingBill(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Net Total (Rs.)" type="number" value={editingBill.netTotal} onChange={(e) => setEditingBill({...editingBill, netTotal: e.target.value})} />
              <Input label="Paid Amount (Rs.)" type="number" value={editingBill.paidAmount} onChange={(e) => setEditingBill({...editingBill, paidAmount: e.target.value})} />
            </div>
            <Button className="w-full mt-6" onClick={updateBill} disabled={isSubmitting}>
              {isSubmitting ? 'Updating Invoice...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default SearchBill;