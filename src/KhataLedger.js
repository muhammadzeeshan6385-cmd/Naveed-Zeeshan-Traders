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

  // 4. Trigger Inline DOM Printing - Fixes Logo Visibility Loss
  const handlePrintLedger = (customer) => {
    setSelectedCustomer(customer);
    setTimeout(() => {
      window.print();
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

        {/* --- INLINE HIGH-RESOLUTION HIDDEN PRINT SECTOR OVERLAY --- */}
        {selectedCustomer && (
          <div id="ledger-print-area" className="hidden-print-section">
            <div className="print-logo-wrap" style={{ textAlign: 'center', marginBottom: '12px' }}>
              <img src="/Logo-dark.png" style={{ maxHeight: '72px', width: 'auto', display: 'inline-block' }} alt="Naveed & Zeeshan Traders Logo" />
            </div>
            <div style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '2px solid #111', paddingBottom: '12px' }}>
              <h2 style={{ margin: '0', fontSize: '26px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Naveed & Zeeshan Traders</h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#333', fontWeight: '500' }}>Fadda Bazar Mailsi | Wholesale Food Products & General Distribution ERP</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '22px', fontSize: '14px', fontFamily: 'sans-serif', lineHeight: '1.5' }}>
              <div>
                <strong>Account Holder Statement:</strong> {selectedCustomer.name}<br />
                <strong>Shop / Retail Business:</strong> {selectedCustomer.shopName}<br />
                <strong>Contact/Mobile No:</strong> {selectedCustomer.phone}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Report Generated:</strong> {new Date().toLocaleDateString('en-GB')}<br />
                <strong>Market Zone Sector:</strong> {selectedCustomer.area}<br />
                <strong>Ledger Classification:</strong> Credit Distribution Account
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '13px', fontFamily: 'sans-serif' }}>
              <thead>
                <tr style={{ background: '#f4f4f4' }}>
                  <th style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'left' }}>Date</th>
                  <th style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'left' }}>Transaction Type</th>
                  <th style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'left' }}>Ref Doc No.</th>
                  <th style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'right' }}>Debit (Maal Sale)</th>
                  <th style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'right' }}>Credit (Vasooli Received)</th>
                  <th style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'right' }}>Running Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {customerHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '12px', border: '1px solid #bbb' }}>No dynamic transaction records available for print.</td>
                  </tr>
                ) : (
                  (() => {
                    let cumulativeSum = 0;
                    return customerHistory.map((item, idx) => {
                      cumulativeSum += (item.debit - item.credit);
                      return (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #bbb', padding: '10px' }}>{item.date}</td>
                          <td style={{ border: '1px solid #bbb', padding: '10px' }}>{item.type === 'Invoice' ? 'Credit Invoice' : 'Market Recovery'}</td>
                          <td style={{ border: '1px solid #bbb', padding: '10px', fontWeight: '500' }}>{item.reference}</td>
                          <td style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'right' }}>{item.debit > 0 ? 'Rs. ' + item.debit : '-'}</td>
                          <td style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'right' }}>{item.credit > 0 ? 'Rs. ' + item.credit : '-'}</td>
                          <td style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>Rs. {cumulativeSum}</td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>

            <div style={{ marginTop: '25px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif', lineHeight: '1.7' }}>
              Total Credit Khata Log: Rs. {selectedCustomer.totalSales}<br />
              Total Outstanding Recovery Log: Rs. {selectedCustomer.totalPaid}<br />
              <span style={{ fontSize: '17px', color: '#b45309', borderTop: '2px double #222', paddingTop: '4px', display: 'inline-block', marginTop: '4px' }}>
                Net Outstanding Arrears: Rs. {selectedCustomer.balance}
              </span>
            </div>

            <div style={{ marginTop: '75px', textAlign: 'center', fontSize: '12px', color: '#444', borderTop: '1px dashed #666', paddingTop: '12px', fontFamily: 'sans-serif' }}>
              Naveed & Zeeshan Traders Wholesale Management Network — Systems Executive Signature: _______________________
            </div>
          </div>
        )}

        {/* --- INLINE PRINT STYLE STACK CSS ENGINE --- */}
        <style jsx global>{`
          @media screen {
            .hidden-print-section { display: none !important; }
          }
          @media print {
            body * { visibility: hidden; background: transparent !important; color: #000 !important; }
            #ledger-print-area, #ledger-print-area * { visibility: visible; }
            #ledger-print-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
            .print-logo-wrap { display: block !important; text-align: center !important; }
            .print-logo-wrap img { display: inline-block !important; visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}</style>
      </div>
    </PageShell>
  );
};

export default KhataLedger;