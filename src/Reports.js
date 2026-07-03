import React, { useState, useEffect } from 'react';
import { PageShell } from './components/ui';

// 1. Date Range Modal Component (Theme Aware)
const DateRangeModal = ({ reportType, onClose, onGenerate }) => {
  const [dates, setDates] = useState({ from: '', to: '' });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl w-[450px] shadow-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="mb-6 text-center text-xl font-bold text-slate-900 dark:text-emerald-400">
          {reportType} Report
        </h3>
        
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">From Date:</label>
        <input type="date" onChange={(e) => setDates({...dates, from: e.target.value})} className="w-full p-3 mb-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white outline-none" />
        
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">To Date:</label>
        <input type="date" onChange={(e) => setDates({...dates, to: e.target.value})} className="w-full p-3 mb-6 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white outline-none" />
        
        <div className="flex gap-4">
          <button onClick={() => onGenerate(dates)} className="flex-1 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition">OK</button>
          <button onClick={onClose} className="flex-1 p-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-bold transition">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// 2. Main Reports Component
const Reports = ({ selectedReport, sales, expenses, payments, purchases, ...props }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    if (selectedReport) { setActiveReport(selectedReport); setModalOpen(true); }
  }, [selectedReport]);

  const handleGenerate = (dates) => {
    setDateRange(dates);
    let filtered = [];
    if (activeReport === 'Sales') filtered = sales.filter(s => s.date >= dates.from && s.date <= dates.to);
    else if (activeReport === 'Expense') filtered = expenses.filter(e => e.date >= dates.from && e.date <= dates.to);
    else if (activeReport === 'Recovery') filtered = payments.filter(p => p.date >= dates.from && p.date <= dates.to);
    else if (activeReport === 'Purchase') filtered = purchases.filter(p => p.date >= dates.from && p.date <= dates.to);
    
    setReportData(filtered);
    setModalOpen(false);
  };

  return (
    <PageShell title="Analytics Report">
      {reportData ? (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
          {/* Action Buttons Top */}
          <div className="flex gap-4 print:hidden mb-6">
            <button onClick={() => window.print()} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Print / Save PDF</button>
            <button onClick={() => setReportData(null)} className="bg-rose-600 text-white px-6 py-2 rounded-lg font-bold">Close View</button>
          </div>

          {/* Professional Header */}
          <div className="flex justify-between items-start border-b-4 border-slate-200 dark:border-slate-700 pb-6 mb-6">
            <div>
               <img src="/logo.png" alt="Logo" className="w-24 mb-4" onError={(e) => e.target.style.display = 'none'} />
               <h1 className="text-3xl font-black uppercase text-slate-900 dark:text-white">{activeReport} Report</h1>
               <p className="text-slate-500 dark:text-slate-400">Generated at: {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="text-right">
               <h3 className="font-bold text-xl text-slate-900 dark:text-white">Naveed Zeeshan Traders</h3>
               <div className="mt-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                 <p className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Report Period</p>
                 <p className="font-bold text-slate-900 dark:text-white">{dateRange.from} to {dateRange.to}</p>
               </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                <th className="p-4 rounded-tl-lg">Date</th>
                <th className="p-4">Reference/Details</th>
                <th className="p-4 rounded-tr-lg text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {reportData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="p-4 text-slate-700 dark:text-slate-300">{r.date}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{r.product || r.customer || r.category || "General"}</td>
                  <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{Number(r.netTotal || r.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {['Sales', 'Expense', 'Recovery', 'Purchase'].map((rep) => (
            <div key={rep} onClick={() => { setActiveReport(rep); setModalOpen(true); }} className="p-8 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800 hover:border-emerald-500 transition text-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{rep} Report</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Click to filter & view</p>
            </div>
          ))}
        </div>
      )}
      {modalOpen && <DateRangeModal reportType={activeReport} onClose={() => setModalOpen(false)} onGenerate={handleGenerate} />}
    </PageShell>
  );
};

export default Reports;