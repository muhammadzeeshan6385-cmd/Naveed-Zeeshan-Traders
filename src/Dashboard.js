import React, { useMemo } from 'react';
import { Card, StatCard, DataTable } from './components/ui/index';
import { formatRs } from './utils/helpers'; // Assuming helpers are imported correctly

const Dashboard = ({ stats, recentExpenses, recentSales, getSaleCustomer, getSaleTotal, sales }) => {
  
  // Today's Sales ko ensure karne ke liye yahan recalculate kar rahe hain
  const todaysSalesValue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return (sales || []).reduce((sum, s) => {
      // Date comparison: agar sale ki date aaj ki date se match karti hai
      if (s.date && s.date.includes(today)) {
        return sum + Number(s.netTotal || 0);
      }
      return sum;
    }, 0);
  }, [sales]);

  return (
    <>
      {/* 1. StatCards Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 mb-6">
        <StatCard title="Total Sales" value={formatRs(stats?.totalSale || 0)} tone="emerald" />
        {/* Yahan hum calculated todaysSalesValue use kar rahe hain */}
        <StatCard title="Today's Sales" value={formatRs(todaysSalesValue)} tone="blue" />
        <StatCard title="Total Expenses" value={formatRs(stats?.totalExpense || 0)} tone="rose" />
        <StatCard title="Net Profit" value={formatRs(stats?.profit || 0)} tone="violet" />
        <StatCard title="Total Recovery" value={formatRs(stats?.totalRecovery || 0)} tone="blue" />
        <StatCard title="Outstanding" value={formatRs(stats?.outstanding || 0)} tone="amber" />
      </div>

      {/* 2. Expenses and Invoices Section */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Recent Expenses" className="xl:col-span-1">
          <div className="space-y-3">
            {recentExpenses?.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No expenses recorded yet.</p>
            )}
            {recentExpenses?.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-950/70 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{expense.category}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{expense.date}</p>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-300">{formatRs(expense.amount)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Latest Sales Invoices" className="xl:col-span-2">
          <DataTable
            columns={[
              { key: 'invoiceNo', label: 'Invoice' },
              { key: 'customer', label: 'Customer', render: (row) => getSaleCustomer(row) || 'Walk-in' },
              {
                key: 'total',
                label: 'Total',
                className: 'text-right',
                render: (row) => (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                    {formatRs(getSaleTotal(row))}
                  </span>
                ),
              },
            ]}
            rows={recentSales || []}
          />
        </Card>
      </div>
    </>
  );
};

export default Dashboard;