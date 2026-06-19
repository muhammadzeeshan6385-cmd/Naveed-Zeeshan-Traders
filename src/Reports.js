import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const Reports = ({ sales, expenses, payments, cashData, products }) => {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const exportToExcel = (data, fileName) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const filterByDate = (data) => {
    if (!dateRange.from || !dateRange.to) return data;
    return data.filter(item => item.date >= dateRange.from && item.date <= dateRange.to);
  };

  const ReportSection = ({ title, data, fileName }) => (
    <div className="bg-white p-4 rounded-xl shadow mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={() => exportToExcel(filterByDate(data), fileName)} className="bg-green-600 text-white px-4 py-2 rounded">Export Excel</button>
      </div>
      <p>Records found: {filterByDate(data).length}</p>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex gap-4 mb-8 bg-white p-4 rounded-xl">
        <input type="date" className="border p-2 rounded" onChange={(e) => setDateRange({...dateRange, from: e.target.value})} />
        <input type="date" className="border p-2 rounded" onChange={(e) => setDateRange({...dateRange, to: e.target.value})} />
      </div>
      
      <ReportSection title="Sales Report" data={sales} fileName="Sales_Report" />
      <ReportSection title="Expenses Report" data={expenses} fileName="Expenses_Report" />
      <ReportSection title="Recovery Report" data={payments} fileName="Recovery_Report" />
      <ReportSection title="Cash/Bank Report" data={cashData} fileName="CashBank_Report" />
    </div>
  );
};
export default Reports;