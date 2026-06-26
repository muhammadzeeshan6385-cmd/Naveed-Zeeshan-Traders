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
            .header-container { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .logo { width: 70px; }
            .title-section { flex: 1; text-align: center; }
            .title-section h1 { font-size: 18px; margin: 0; text-transform: uppercase; }
            .title-section p { font-size: 12px; margin: 0; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { border: 1px solid #000; padding: 4px; background: #f3f4f6; font-size: 11px; }
            td { border: 1px solid #000; padding: 3px; text-align: center; font-size: 11px; }
            
            /* Product Name Left Align */
            td.product-name { text-align: left; padding-left: 10px; }
            
            .totals-container { width: 100%; margin-top: 10px; display: grid; grid-template-columns: repeat(7, 1fr); }
            .spacer { grid-column: span 5; }
            .label-col { text-align: right; padding: 4px; font-size: 12px; font-weight: bold; }
            .amount-col { text-align: center; padding: 4px; font-size: 12px; font-weight: bold; border: 1px solid #000; }
          </style>
        </head>
        <body>
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
            <thead>
              <tr>
                <th>Ser</th><th>Product Name</th><th>Ctn</th><th>Piece</th><th>Rate</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items.map((i, idx) => {
                let displayRate = '-';
                if (i.ctn > 0 && i.ctnRate) {
                  displayRate = formatRs(i.ctnRate);
                } else if (i.piece > 0 && i.pieceRate) {
                  displayRate = formatRs(i.pieceRate);
                } else if (i.rate) {
                  displayRate = formatRs(i.rate);
                }

                return `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="product-name">${i.name}</td>
                  <td>${i.ctn > 0 ? i.ctn : '-'}</td>
                  <td>${i.piece > 0 ? i.piece : '-'}</td>
                  <td>${displayRate}</td>
                  <td>${formatRs(i.total)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="spacer"></div>
            <div class="label-col">Grand Total:</div>
            <div class="amount-col">${formatRs(bill.grossTotal)}</div>
            <div class="spacer"></div>
            <div class="label-col">Discount:</div>
            <div class="amount-col">${formatRs(bill.discount)}</div>
            <div class="spacer"></div>
            <div class="label-col" style="border-top: 1px solid #000;">Payable Amount:</div>
            <div class="amount-col" style="border-top: 1px solid #000;">${formatRs(bill.netTotal)}</div>
          </div>

          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
  };

  return (
    <PageShell title="Search Previous Bills">
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