import React, { useMemo } from 'react';
import { Card, DataTable, PageShell, StatCard } from './components/ui';
import { formatRs, getSaleTotal, getSaleCustomer, getTotalOutstanding, todayISO } from './utils/helpers';

const Dashboard = ({ sales = [], expenses = [], payments = [], customers = [], products = [], getStock }) => {
  const stats = useMemo(() => {
    const totalSale = sales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
    const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const totalRecovery = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const todaySales = sales
      .filter((sale) => (sale.date || todayISO()) === todayISO())
      .reduce((sum, sale) => sum + getSaleTotal(sale), 0);
    const lowStockCount = products.filter((product) => getStock(product.name) <= Number(product.minStock || 5)).length;

    return {
      totalSale,
      totalExpense,
      totalRecovery,
      todaySales,
      outstanding: getTotalOutstanding(sales, payments),
      profit: totalSale - totalExpense,
      lowStockCount,
    };
  }, [sales, expenses, payments, products, getStock]);

  const recentSales = [...sales].slice(-8).reverse();
  const recentExpenses = [...expenses].slice(-6).reverse();

  return (
    <PageShell title="Dashboard" subtitle="Live business overview for your distribution operations">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard title="Total Sales" value={formatRs(stats.totalSale)} tone="emerald" />
        <StatCard title="Today's Sales" value={formatRs(stats.todaySales)} tone="blue" />
        <StatCard title="Total Expenses" value={formatRs(stats.totalExpense)} tone="rose" />
        <StatCard title="Net Profit" value={formatRs(stats.profit)} tone="violet" />
        <StatCard title="Total Recovery" value={formatRs(stats.totalRecovery)} tone="blue" />
        <StatCard title="Outstanding" value={formatRs(stats.outstanding)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Recent Expenses" className="xl:col-span-1">
          <div className="space-y-3">
            {recentExpenses.length === 0 && <p className="text-sm text-slate-500">No expenses recorded yet.</p>}
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-950/70 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{expense.category}</p>
                  <p className="text-xs text-slate-500">{expense.date}</p>
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
                render: (row) => <span className="font-semibold text-emerald-600 dark:text-emerald-300">{formatRs(getSaleTotal(row))}</span>,
              },
            ]}
            rows={recentSales}
          />
        </Card>
      </div>

      <Card title="Business Alerts">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: 'Active Customers', value: customers.length },
            { label: 'Products in Catalog', value: products.length },
            { label: 'Low Stock Items', value: stats.lowStockCount, color: 'text-amber-600 dark:text-amber-300' }
          ].map((item, idx) => (
            <div key={idx} className="rounded-xl bg-slate-100 dark:bg-slate-950/70 p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className={`mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 ${item.color || ''}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
};

export default Dashboard;