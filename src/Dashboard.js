import React, { useMemo } from 'react';

const Dashboard = ({ sales = [], expenses = [], payments = [], customers = [] }) => {
  
  const stats = useMemo(() => {
    const totalSale = sales.reduce((sum, s) => sum + (Number(s.qty || 0) * Number(s.price || 0)), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalRecovery = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    return {
      sale: totalSale.toLocaleString(),
      expense: totalExpense.toLocaleString(),
      profit: (totalSale - totalExpense).toLocaleString(),
      recovery: totalRecovery.toLocaleString(),
      balance: (totalSale - totalRecovery).toLocaleString()
    };
  }, [sales, expenses, payments]);

  return (
    <div className="w-full min-h-screen bg-gray-100 p-6 space-y-6">
      {/* 1. Statistics Cards - Full Width */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {[
          { title: 'Total Sales', val: stats.sale, color: 'bg-indigo-600' },
          { title: 'Total Expenses', val: stats.expense, color: 'bg-rose-600' },
          { title: 'Net Profit', val: stats.profit, color: 'bg-emerald-600' },
          { title: 'Total Recovery', val: stats.recovery, color: 'bg-blue-600' },
          { title: 'Outstanding', val: stats.balance, color: 'bg-amber-600' }
        ].map((item, i) => (
          <div key={i} className={`${item.color} text-white p-6 rounded-3xl shadow-2xl flex flex-col justify-between transform transition hover:scale-105`}>
            <span className="text-sm font-medium opacity-80">{item.title}</span>
            <span className="text-3xl font-black mt-2">Rs. {item.val}</span>
          </div>
        ))}
      </div>

      {/* 2. Main Analytics Section - Full Width */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Expenses List */}
        <div className="xl:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Recent Expenses</h3>
          <div className="space-y-3">
            {expenses.slice(-6).reverse().map((e, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="font-medium text-gray-600">{e.category}</span>
                <span className="text-rose-600 font-bold">-{Number(e.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sales Activity List */}
        <div className="xl:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Latest Sales Invoices</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 border-b">
                <th className="pb-3">Customer</th>
                <th className="pb-3">Product</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(-6).reverse().map((s, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-4 font-medium">{s.customer}</td>
                  <td className="py-4 text-gray-600">{s.product}</td>
                  <td className="py-4 text-right font-bold text-emerald-600">Rs. {(s.qty * s.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;