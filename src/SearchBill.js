import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { Card, Input, DataTable, PageShell, Button } from './components/ui';
import { formatRs } from './utils/helpers'; 

const SearchBill = ({ sales }) => {
  const [billSearch, setBillSearch] = useState('');

  const filteredBills = sales.filter(s => 
    s.invoiceNo.toLowerCase().includes(billSearch.toLowerCase()) || 
    s.customer.toLowerCase().includes(billSearch.toLowerCase())
  );

  const printBill = (bill) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
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
              <img src="/logo-dark.png" class="logo" />
              <div class="title-section">
                <h1>Naveed & Zeeshan Traders, Mailsi</h1>
                <p>PH: 0300-3999866, 0307-6385852</p>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; font-size: 12px;">
              <div><strong>Bill No:</strong> ${bill.invoiceNo}</div>
              <div><strong>Customer:</strong> ${bill.customer}</div>
              <div><strong>Date:</strong> ${bill.date}</div>
              <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
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
                <tr><td class="label-col">Grand Total:</td><td class="amount-col">${formatRs(bill.grossTotal)}</td></tr>
                <tr><td class="label-col">Discount:</td><td class="amount-col">${formatRs(bill.discount)}</td></tr>
                <tr><td class="label-col">Prev Balance:</td><td class="amount-col">${formatRs(bill.prevBalance || 0)}</td></tr>
                <tr><td class="label-col" style="border-top: 2px solid #000;">Payable Amount:</td><td class="amount-col" style="border-top: 2px solid #000;">${formatRs(Number(bill.netTotal) + Number(bill.prevBalance || 0))}</td></tr>
              </table>
            </div>
            <div style="margin-top: 100px; display: flex; justify-content: flex-end;">
              <div style="text-align: center; border-top: 1px solid #000; width: 200px; padding-top: 5px; font-size: 12px; font-weight: bold;">
                Customer Signature
              </div>
            </div>    
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </div>
        </body>
      </html>
    `);
  };

  return (
    <PageShell title="Search Bills">
      <Card title="Find & Reprint Bills">
        <Input placeholder="Search by Bill No or Customer Name..." value={billSearch} onChange={(e) => setBillSearch(e.target.value)} className="mb-4" />
        <DataTable columns={[
          { key: 'invoiceNo', label: 'Bill No' },
          { key: 'date', label: 'Date' },
          { key: 'customer', label: 'Customer' },
          { key: 'netTotal', label: 'Total', render: (row) => formatRs(row.netTotal) },
          { key: 'action', label: 'Action', render: (row) => <Button onClick={() => printBill(row)} className="bg-blue-600"><Printer size={16} /> Reprint</Button> }
        ]} rows={filteredBills} />
      </Card>
    </PageShell>
  );
};

export default SearchBill;