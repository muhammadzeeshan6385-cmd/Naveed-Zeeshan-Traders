import React, { useState } from 'react';
import { Button, Card, Input } from './components/ui';
import { filterByDateRange, formatRs } from './utils/helpers';

const ReportGenerator = ({ type, onClose, sales, expenses, payments, purchases }) => {
  const [dates, setDates] = useState({ from: '', to: '' });
  const [data, setData] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = () => {
    let raw = [];
    if (type === 'sales') raw = filterByDateRange(sales, dates.from, dates.to);
    else if (type === 'expense') raw = filterByDateRange(expenses, dates.from, dates.to);
    else if (type === 'recovery') raw = filterByDateRange(payments, dates.from, dates.to);
    else if (type === 'purchase') raw = filterByDateRange(purchases, dates.from, dates.to);
    setData(raw);
    setShowResults(true);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl p-6 shadow-2xl bg-white dark:bg-slate-900">
        {!showResults ? (
          <>
            <h2 className="text-xl font-bold mb-4 capitalize">{type.replace('_', ' ')} Report</h2>
            <div className="flex gap-4 mb-6">
              <Input label="From Date" type="date" className="w-full" onChange={(e) => setDates({...dates, from: e.target.value})} />
              <Input label="To Date" type="date" className="w-full" onChange={(e) => setDates({...dates, to: e.target.value})} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleGenerate}>OK</Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold capitalize">{type} Results</h2>
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto mb-4 border p-2">
              <table className="w-full text-left">
                <thead><tr className="border-b"><th className="p-2">Date</th><th className="p-2">Amount</th></tr></thead>
                <tbody>
                  {data.map((item, i) => (
                    <tr key={i} className="border-b"><td className="p-2">{item.date}</td><td className="p-2">{formatRs(item.amount || item.netTotal || 0)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => window.print()}>Print</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
export default ReportGenerator;