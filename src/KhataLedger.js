import React, { useMemo, useState, useRef } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs, getCreditSalesTotal } from './utils/helpers';
import { Eye, Printer, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const KhataLedger = ({ customers, sales, payments }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const printRef = useRef(null);

  const rows = useMemo(
    () =>
      customers.map((customer) => {
        const totalSales = getCreditSalesTotal(sales, customer.name);
        const totalPaid = payments
          .filter((payment) => payment.customer === customer.name)
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const balance = totalSales - totalPaid;

        return {
          id: customer.id,
          name: customer.name,
          shopName: customer.shopName || '-',
          totalSales,
          totalPaid,
          balance,
        };
      }),
    [customers, sales, payments]
  );

  // Customer ki date-wise complete transaction history prepare karne ka logic
  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];

    // 1. Credit Invoices Filter karna
    const customerSales = sales
      .filter((sale) => (sale.customerName || sale.customer) === selectedCustomer.name && sale.isCredit)
      .map((sale) => ({
        date: sale.date,
        type: 'Invoice',
        reference: sale.invoiceNo || `INV-${sale.id}`,
        debit: Number(sale.netTotal || sale.netAmount || 0),
        credit: 0,
      }));

    // 2. Recoveries / Payments Filter karna
    const customerPayments = payments
      .filter((payment) => payment.customer === selectedCustomer.name)
      .map((payment) => ({
        date: payment.date,
        type: 'Recovery',
        reference: payment.receiptNo || `REC-${payment.id}`,
        debit: 0,
        credit: Number(payment.amount || 0),
      }));

    // Dono ko iktha kar ke date ke mutabiq sort karna
    return [...customerSales, ...customerPayments].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [selectedCustomer, sales, payments]);

  // Ledger Print karne ka function
  const handlePrintLedger = (customer) => {
    // Pehle state set karein taake data load ho jaye phir print trigger ho
    setSelectedCustomer(customer);
    setTimeout(() => {
      const printContent = document.getElementById('ledger-print-area');
      const windowUrl = 'about:blank';
      const uniqueName = new Date().getTime();
      const printWindow = window.open(windowUrl, uniqueName, 'left=50,top=50,width=800,height=900');
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Khata Ledger - ${customer.name}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .biz-name { font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
              table { w-index: 100%; width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { bg-color: #f5f5f5; background: #f5f5f5; font-weight: bold; }
              .text-right { text-align: right; }
              .summary { margin-top: 20px; text-align: right; font-size: 14px; font-weight: bold; line-height: 1.6; }
              .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #777; border-top: 1px dashed #ccc; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="biz-name">Naveed & Zeeshan Traders</div>
              <div style="font-size: 12px; margin-top: 3px;">Fadda Bazar Mailsi | Wholesale ERP System</div>
            </div>
            <div class="info-grid">
              <div>
                <strong>Customer:</strong> ${customer.name}<br>
                <strong>Shop Name:</strong> ${customer.shopName}
              </div>
              <div class="text-right">
                <strong>Report Date:</strong> ${new Date().toLocaleDateString('en-GB')}<br>
                <strong>Status:</strong> Outstanding Account
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Ref No.</th>
                  <th class="text-right">Debit (Maal)</th>
                  <th class="text-right">Credit (Vasooli)</th>
                  <th class="text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                ${
                  customerHistory.length === 0 
                  ? '<tr><td colspan="6" style="text-align:center;">No transactions found</td></tr>'
                  : (() => {
                      let currentBal = 0;
                      return customerHistory.map(item => {
                        currentBal += (item.debit - item.credit);
                        return `
                          <tr>
                            <td>${item.date}</td>
                            <td>${item.type === 'Invoice' ? 'Credit Invoice' : 'Cash Recovery'}</td>
                            <td>${item.reference}</td>
                            <td class="text-right">${item.debit > 0 ? 'Rs. ' + item.debit : '-'}</td>
                            <td class="text-right">${item.credit > 0 ? 'Rs. ' + item.credit : '-'}</td>
                            <td class="text-right" style="font-weight:bold;">Rs. ${currentBal}</td>
                          </tr>
                        `;
                      }).join('');
                    })()
                }
              </tbody>
            </table>
            <div class="summary">
              Total Credit Sales: Rs. ${customer.totalSales}<br>
              Total Recovered: Rs. ${customer.totalPaid}<br>
              <span style="font-size: 16px; color: #b45309;">Remaining Balance: Rs. ${customer.balance}</span>
            </div>
            <div class="footer">
              Naveed & Zeeshan Traders Enterprise ERP - Signature: _______________________
            </div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }, 300);
  };

  return (
    <PageShell title="Khata Ledger" subtitle="Track retailer credit, recoveries, and outstanding balances">
      <div className="space-y-6">
        <Card>
          <DataTable
            columns={[
              { key: 'name', label: 'Customer' },
              { key: 'shopName', label: 'Shop' },
              { key: 'totalSales', label: 'Credit Sales', render: (row) => <span className="text-rose-300">{formatRs(row.totalSales)}</span> },
              { key: 'totalPaid', label: 'Recovered', render: (row) => <span className="text-emerald-300">{formatRs(row.totalPaid)}</span> },
              {
                key: 'balance',
                label: 'Balance',
                render: (row) => <span className={row.balance > 0 ? 'font-bold text-amber-300' : 'font-bold text-emerald-300'}>{formatRs(row.balance)}</span>,
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className="flex items-center gap-3">
                    {/* VIEW LEDGER BUTTON (EYE ICON) */}
                    <button
                      onClick={() => setSelectedCustomer(row)}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition group"
                      title="View Ledger Statement"
                    >
                      <Eye size={15} />
                    </button>
                    {/* PRINT LEDGER BUTTON (PRINTER ICON) */}
                    <button
                      onClick={() => handlePrintLedger(row)}
                      className="p-1.5 rounded-lg bg-slate-500/10 hover:bg-amber-600 text-slate-400 hover:text-white transition"
                      title="Print Customer Sheet"
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        </Card>

        {/* --- DYNAMIC LIVE LEDGER STATEMENT VIEW PANEL --- */}
        {selectedCustomer && (
          <Card className="border border-slate-800 bg-slate-950/40 p-6 rounded-3xl animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                  Statement Account History: <span className="text-amber-400">{selectedCustomer.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Shop: {selectedCustomer.shopName}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
              >
                <X size={15} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3 pl-2">Date</th>
                    <th className="py-3">Transaction Type</th>
                    <th className="py-3">Ref Invoice / Receipt</th>
                    <th className="py-3 text-right">Debit (Maal)</th>
                    <th className="py-3 text-right">Credit (Vasooli)</th>
                    <th className="py-3 text-right pr-2">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {customerHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-slate-500 font-medium italic">
                        No recent credit bills or payment history found for this party.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      let runningBal = 0;
                      return customerHistory.map((item, idx) => {
                        runningBal += (item.debit - item.credit);
                        return (
                          <tr key={idx} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 pl-2 font-medium text-slate-400">{item.date}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 font-bold ${item.type === 'Invoice' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {item.type === 'Invoice' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {item.type === 'Invoice' ? 'Credit Sale' : 'Cash Received'}
                              </span>
                            </td>
                            <td className="py-3 text-slate-400 font-semibold">{item.reference}</td>
                            <td className="py-3 text-right text-rose-300 font-medium">{item.debit > 0 ? formatRs(item.debit) : '-'}</td>
                            <td className="py-3 text-right text-emerald-300 font-medium">{item.credit > 0 ? formatRs(item.credit) : '-'}</td>
                            <td className="py-3 text-right font-black text-amber-300 pr-2">{formatRs(runningBal)}</td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Statement Footer Summary Summary */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 border-t border-slate-900 mt-4 pt-4 text-xs font-bold text-slate-400">
              <div className="flex gap-4">
                <div>Total Sales: <span className="text-rose-300 font-black">{formatRs(selectedCustomer.totalSales)}</span></div>
                <div>Total Recovered: <span className="text-emerald-300 font-black">{formatRs(selectedCustomer.totalPaid)}</span></div>
              </div>
              <div className="text-sm">
                Net Outstanding Payable: <span className="text-amber-400 font-black">{formatRs(selectedCustomer.balance)}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
};

export default KhataLedger;