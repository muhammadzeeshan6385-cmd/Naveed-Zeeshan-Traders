import React, { useMemo, useState, useRef } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs, getCreditSalesTotal } from './utils/helpers';
import { 
  Eye, 
  Printer, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  UserCheck, 
  AlertCircle, 
  FileText 
} from 'lucide-react';

const KhataLedger = ({ customers = [], sales = [], payments = [] }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const printRef = useRef(null);

  // 1. Core Analytics State Calculations for Ledger Header Widgets
  const ledgerMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let totalRecoveredThisMonth = 0;
    let activeDebtorsCount = 0;

    customers.forEach((customer) => {
      const totalSales = getCreditSalesTotal(sales, customer.name);
      const totalPaid = payments
        .filter((p) => p.customer === customer.name)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = totalSales - totalPaid;

      if (balance > 0) {
        totalOutstanding += balance;
        activeDebtorsCount += 1;
      }
    });

    payments.forEach((p) => {
      const pDate = new Date(p.date || p.createdAt);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
        totalRecoveredThisMonth += Number(p.amount || 0);
      }
    });

    return { totalOutstanding, totalRecoveredThisMonth, activeDebtorsCount };
  }, [customers, sales, payments]);

  // 2. Base Ledger Rows Mapping with Full Structural Safety
  const rows = useMemo(
    () =>
      customers
        .map((customer) => {
          const totalSales = getCreditSalesTotal(sales, customer.name);
          const totalPaid = payments
            .filter((payment) => (payment.customer || payment.customerName) === customer.name)
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
          const balance = totalSales - totalPaid;

          return {
            id: customer.id,
            name: customer.name,
            shopName: customer.shopName || '-',
            phone: customer.phone || '-',
            area: customer.area || 'Mailsi Mandi',
            totalSales,
            totalPaid,
            balance,
            status: balance > 50000 ? 'High Risk' : balance > 0 ? 'Active' : 'Clear',
          };
        })
        .filter((row) => {
          const matchesSearch = 
            row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.phone.includes(searchTerm);
            
          if (filterType === 'all') return matchesSearch;
          if (filterType === 'debtors') return matchesSearch && row.balance > 0;
          if (filterType === 'highRisk') return matchesSearch && row.balance > 50000;
          if (filterType === 'clear') return matchesSearch && row.balance <= 0;
          return matchesSearch;
        }),
    [customers, sales, payments, searchTerm, filterType]
  );

  // 3. Customer Detailed Date-wise Transaction Ledger History Logic
  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];

    const customerSales = sales
      .filter((sale) => {
        const cName = sale.customerName || sale.customer || sale.customer_name;
        const isMatch = cName === selectedCustomer.name;
        const isCreditSale = 
          sale.isCredit === true || 
          String(sale.paymentMethod).toLowerCase() === 'credit' || 
          String(sale.status).toLowerCase() === 'credit' ||
          sale.type === 'Credit';
        return isMatch && (isCreditSale || !sale.paymentMethod);
      })
      .map((sale) => ({
        date: sale.date || new Date(sale.createdAt).toLocaleDateString('en-CA'),
        type: 'Invoice',
        reference: sale.invoiceNo || sale.billNo || `INV-${sale.id}`,
        description: 'Goods Supplied on Credit Khata',
        debit: Number(sale.netTotal || sale.netAmount || sale.grandTotal || 0),
        credit: 0,
      }));

    const customerPayments = payments
      .filter((payment) => (payment.customer || payment.customerName) === selectedCustomer.name)
      .map((payment) => ({
        date: payment.date || new Date(payment.createdAt).toLocaleDateString('en-CA'),
        type: 'Recovery',
        reference: payment.receiptNo || payment.reference || `REC-${payment.id}`,
        description: payment.paymentMethod ? `Cash Received via ${payment.paymentMethod}` : 'Cash Recovery Payment',
        debit: 0,
        credit: Number(payment.amount || 0),
      }));

    return [...customerSales, ...customerPayments].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [selectedCustomer, sales, payments]);

  // 4. Standard Popup Window Print Engine - Exactly matching your working reports
  const handlePrintLedger = (customer) => {
    setSelectedCustomer(customer);
    setTimeout(() => {
      const windowUrl = 'about:blank';
      const uniqueName = new Date().getTime();
      const printWindow = window.open(windowUrl, uniqueName, 'left=50,top=50,width=850,height=900');
      
      const printHistory = sales
        .filter((sale) => (sale.customerName || sale.customer) === customer.name)
        .map((sale) => ({
          date: sale.date || new Date(sale.createdAt).toLocaleDateString('en-CA'),
          type: 'Invoice',
          reference: sale.invoiceNo || sale.billNo || `INV-${sale.id}`,
          debit: Number(sale.netTotal || sale.netAmount || 0),
          credit: 0,
        })).concat(
          payments
            .filter((payment) => payment.customer === customer.name)
            .map((payment) => ({
              date: payment.date || new Date(payment.createdAt).toLocaleDateString('en-CA'),
              type: 'Recovery',
              reference: payment.receiptNo || `REC-${payment.id}`,
              debit: 0,
              credit: Number(payment.amount || 0),
            }))
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

      printWindow.document.write(`
        <html>
          <head>
            <title>Khata Ledger - ${customer.name}</title>
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              }
              body { font-family: sans-serif; padding: 20px; color: #333; }
              .logo-container { text-align: center; margin-bottom: 12px; width: 100%; display: block; }
              .logo-img { max-height: 72px; width: auto; display: inline-block; object-fit: contain; }
              .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #111; padding-bottom: 12px; }
              .biz-name { font-size: 26px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
              .biz-sub { margin: 5px 0 0 0; font-size: 13px; color: #333; font-weight: 500; }
              .info-grid { display: flex; justify-content: space-between; margin-bottom: 22px; font-size: 14px; lineHeight: 1.5; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
              th, td { border: 1px solid #bbb; padding: 10px; text-align: left; }
              th { background: #f4f4f4 !important; font-weight: bold; -webkit-print-color-adjust: exact; }
              .text-right { text-align: right; }
              .summary { margin-top: 25px; text-align: right; font-size: 14px; font-weight: bold; line-height: 1.7; }
              .footer { margin-top: 75px; text-align: center; font-size: 12px; color: #444; border-top: 1px dashed #666; padding-top: 12px; }
            </style>
          </head>
          <body>
            <div class="logo-container">
              <img id="print-logo-img" src="/Logo-dark.png" class="logo-img" alt="Logo" />
            </div>
            <div class="header">
              <h2 class="biz-name">Naveed & Zeeshan Traders</h2>
              <p class="biz-sub">Fadda Bazar Mailsi | Wholesale Food Products & General Distribution ERP</p>
            </div>
            <div class="info-grid">
              <div>
                <strong>Account Holder Statement:</strong> ${customer.name}<br />
                <strong>Shop / Retail Business:</strong> ${customer.shopName}<br />
                <strong>Contact/Mobile No:</strong> ${customer.phone}
              </div>
              <div class="text-right">
                <strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-GB')}<br />
                <strong>Market Zone Sector:</strong> ${customer.area}<br />
                <strong>Ledger Classification:</strong> Credit Distribution Account
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Type</th>
                  <th>Ref Doc No.</th>
                  <th class="text-right">Debit (Maal Sale)</th>
                  <th class="text-right">Credit (Vasooli Received)</th>
                  <th class="text-right">Running Net Balance</th>
                </tr>
              </thead>
              <tbody>
                ${
                  printHistory.length === 0 
                  ? '<tr><td colspan="6" style="text-align:center; padding:12px;">No dynamic transaction records available for print.</td></tr>'
                  : (() => {
                      let cumulativeSum = 0;
                      return printHistory.map(item => {
                        cumulativeSum += (item.debit - item.credit);
                        return `
                          <tr>
                            <td>${item.date}</td>
                            <td>${item.type === 'Invoice' ? 'Credit Invoice' : 'Market Recovery'}</td>
                            <td style="font-weight:500;">${item.reference}</td>
                            <td class="text-right">${item.debit > 0 ? 'Rs. ' + item.debit : '-'}</td>
                            <td class="text-right">${item.credit > 0 ? 'Rs. ' + item.credit : '-'}</td>
                            <td class="text-right" style="font-weight:bold;">Rs. ${cumulativeSum}</td>
                          </tr>
                        `;
                      }).join('');
                    })()
                }
              </tbody>
            </table>
            <div class="summary">
              Total Credit Khata Log: Rs. ${customer.totalSales}<br />
              Total Outstanding Recovery Log: Rs. ${customer.totalPaid}<br />
              <span style="font-size: 17px; color: #b45309; border-top: 2px double #222; paddingTop: 4px; display: inline-block; marginTop: 4px;">
                Net Outstanding Arrears: Rs. ${customer.balance}
              </span>
            </div>
            <div class="footer">
              Naveed & Zeeshan Traders Wholesale Management Network — Systems Executive Signature: _______________________
            </div>
            <script>
              const img = document.getElementById('print-logo-img');
              if (img && !img.complete) {
                img.onload = function() { window.print(); window.close(); };
                img.onerror = function() { window.print(); window.close(); };
              } else {
                setTimeout(function() { window.print(); window.close(); }, 250);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }, 250);
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const exportToCSV = () => {
    const headers = ['Customer Name', 'Shop Name', 'Total Sales', 'Total Paid', 'Current Balance\n'];
    const csvRows = rows.map(r => `"${r.name}","${r.shopName}",${r.totalSales},${r.totalPaid},${r.balance}\n`);
    const blob = new Blob([headers.join(','), ...csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Khata_Ledger_Report_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  return (
    <PageShell 
      title="Khata Ledger Management" 
      subtitle="Track retailer credit accounts, market recoveries, and outstanding risk parameters"
    >
      <div className="space-y-6 pb-12">
        {/* --- TOP ANALYTICS METRICS BAR --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Market Receivables</p>
              <h3 className="text-xl font-black text-rose-400 mt-1">{formatRs(ledgerMetrics.totalOutstanding)}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400"><AlertCircle size={20} /></div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recovery This Month</p>
              <h3 className="text-xl font-black text-emerald-400 mt-1">{formatRs(ledgerMetrics.totalRecoveredThisMonth)}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><UserCheck size={20} /></div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Debtors Retailers</p>
              <h3 className="text-xl font-black text-amber-400 mt-1">{ledgerMetrics.activeDebtorsCount} Accounts</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><FileText size={20} /></div>
          </div>
        </div>

        {/* --- SEARCH AND CONTROL PANEL FILTER SECTION --- */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Search size={16} /></span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vendor, bazaar shop or mobile..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-700 text-slate-200 placeholder-slate-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-slate-400 text-xs font-semibold">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg transition ${filterType === 'all' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'}`}>All</button>
              <button onClick={() => setFilterType('debtors')} className={`px-3 py-1.5 rounded-lg transition ${filterType === 'debtors' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'}`}>Debtors</button>
              <button onClick={() => setFilterType('highRisk')} className={`px-3 py-1.5 rounded-lg transition ${filterType === 'highRisk' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'}`}>High Risk</button>
              <button onClick={() => setFilterType('clear')} className={`px-3 py-1.5 rounded-lg transition ${filterType === 'clear' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'}`}>Clear</button>
            </div>
            <button onClick={exportToCSV} className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition" title="Export Ledger Data"><Download size={15} /></button>
            <button onClick={handleRefreshData} className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition" title="Reload Ledger Modules"><RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* --- MAIN KHATA LEDGER DATA TABLE CORE UI --- */}
        <Card>
          <DataTable
            columns={[
              { key: 'name', label: 'Customer Name', render: (row) => <span className="font-bold text-slate-200">{row.name}</span> },
              { key: 'shopName', label: 'Shop Identity' },
              { key: 'area', label: 'Market Location', render: (row) => <span className="text-xs text-slate-400">{row.area}</span> },
              { key: 'totalSales', label: 'Total Credit (Dr)', render: (row) => <span className="text-rose-300 font-medium">{formatRs(row.totalSales)}</span> },
              { key: 'totalPaid', label: 'Recovered (Cr)', render: (row) => <span className="text-emerald-300 font-medium">{formatRs(row.totalPaid)}</span> },
              {
                key: 'balance',
                label: 'Net Balance',
                render: (row) => (
                  <span className={`font-black ${row.balance > 50000 ? 'text-red-400' : row.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatRs(row.balance)}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: 'Statement Action',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCustomer(row)}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition cursor-pointer"
                      title="View Transaction History"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handlePrintLedger(row)}
                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white transition cursor-pointer"
                      title="Print Customer Ledger Sheet"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        </Card>

        {/* --- LIVE INTERACTIVE ON-SCREEN STATEMENT MODULE PANEL --- */}
        {selectedCustomer && (
          <Card className="border border-slate-800 bg-slate-950/40 p-6 rounded-3xl animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Detailed Credit Statement Ledger: <span className="text-amber-400 font-black">{selectedCustomer.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Bazaar Shop Reference: {selectedCustomer.shopName} | Phone: {selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3 pl-2">Date</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Reference Ref</th>
                    <th className="py-3">Narration Description</th>
                    <th className="py-3 text-right">Debit (Maal)</th>
                    <th className="py-3 text-right">Credit (Vasooli)</th>
                    <th className="py-3 text-right pr-2">Cumulative Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {customerHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-slate-500 italic font-medium">
                        No credit accounts or cash recovery records found for this dealer party.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      let runningSum = 0;
                      return customerHistory.map((item, idx) => {
                        runningSum += (item.debit - item.credit);
                        return (
                          <tr key={idx} className="hover:bg-slate-900/30 transition">
                            <td className="py-3 pl-2 text-slate-400">{item.date}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 font-bold ${item.type === 'Invoice' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {item.type === 'Invoice' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                {item.type === 'Invoice' ? 'Credit Invoice' : 'Recovery Received'}
                              </span>
                            </td>
                            <td className="py-3 font-semibold text-slate-300">{item.reference}</td>
                            <td className="py-3 text-slate-500 font-medium">{item.description}</td>
                            <td className="py-3 text-right text-rose-300 font-semibold">{item.debit > 0 ? formatRs(item.debit) : '-'}</td>
                            <td className="py-3 text-right text-emerald-300 font-semibold">{item.credit > 0 ? formatRs(item.credit) : '-'}</td>
                            <td className="py-3 text-right font-black text-amber-300 pr-2">{formatRs(runningSum)}</td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 border-t border-slate-900 mt-4 pt-4 text-xs font-bold text-slate-400">
              <div className="flex gap-4">
                <div>Aggregate Invoiced Dr: <span className="text-rose-300 font-bold">{formatRs(selectedCustomer.totalSales)}</span></div>
                <div>Aggregate Recovered Cr: <span className="text-emerald-300 font-bold">{formatRs(selectedCustomer.totalPaid)}</span></div>
              </div>
              <div className="text-xs bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                Net Outstanding Risk Balance: <span className="text-amber-400 font-black text-sm ml-1">{formatRs(selectedCustomer.balance)}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
};

export default KhataLedger;