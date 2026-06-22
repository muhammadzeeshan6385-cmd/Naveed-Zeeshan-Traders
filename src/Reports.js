import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button, Card, Input, PageShell } from './components/ui';
import { filterByDateRange, formatRs, getSaleCustomer, getSaleTotal } from './utils/helpers';

const Reports = ({ sales, expenses, payments, cashData, products, purchases, customers }) => {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const filteredSales = useMemo(() => filterByDateRange(sales, dateRange.from, dateRange.to), [sales, dateRange]);
  const filteredExpenses = useMemo(() => filterByDateRange(expenses, dateRange.from, dateRange.to), [expenses, dateRange]);
  const filteredPayments = useMemo(() => filterByDateRange(payments, dateRange.from, dateRange.to), [payments, dateRange]);
  const filteredCash = useMemo(() => filterByDateRange(cashData, dateRange.from, dateRange.to), [cashData, dateRange]);
  const filteredPurchases = useMemo(() => filterByDateRange(purchases, dateRange.from, dateRange.to), [purchases, dateRange]);

  const summary = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const totalRecovery = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const totalPurchases = filteredPurchases.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
    return { totalSales, totalExpenses, totalRecovery, totalPurchases };
  }, [filteredSales, filteredExpenses, filteredPayments, filteredPurchases]);

  const exportToExcel = (data, fileName) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const salesExportRows = filteredSales.map((sale) => ({
    Invoice: sale.invoiceNo,
    Date: sale.date,
    Customer: getSaleCustomer(sale),
    PaymentType: sale.paymentType,
    Total: getSaleTotal(sale),
  }));

  return (
    <PageShell title="Reports" subtitle="Export business intelligence for sales, purchases, recovery, and finance">
      <Card title="Date Filter">
        <div className="flex flex-wrap gap-4">
          <Input label="From" type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
          <Input label="To" type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm text-slate-400">Sales</p><p className="mt-2 text-2xl font-bold">{formatRs(summary.totalSales)}</p></Card>
        <Card><p className="text-sm text-slate-400">Purchases</p><p className="mt-2 text-2xl font-bold">{formatRs(summary.totalPurchases)}</p></Card>
        <Card><p className="text-sm text-slate-400">Recovery</p><p className="mt-2 text-2xl font-bold">{formatRs(summary.totalRecovery)}</p></Card>
        <Card><p className="text-sm text-slate-400">Expenses</p><p className="mt-2 text-2xl font-bold">{formatRs(summary.totalExpenses)}</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[
          { title: 'Sales Report', data: salesExportRows, fileName: 'Sales_Report' },
          { title: 'Expenses Report', data: filteredExpenses, fileName: 'Expenses_Report' },
          { title: 'Recovery Report', data: filteredPayments, fileName: 'Recovery_Report' },
          { title: 'Cash/Bank Report', data: filteredCash, fileName: 'CashBank_Report' },
          { title: 'Purchase Report', data: filteredPurchases, fileName: 'Purchase_Report' },
          { title: 'Customer Report', data: customers, fileName: 'Customer_Report' },
          { title: 'Product Report', data: products, fileName: 'Product_Report' },
        ].map((report) => (
          <Card key={report.title} title={report.title}>
            <p className="mb-4 text-sm text-slate-400">Records found: {report.data.length}</p>
            <Button onClick={() => exportToExcel(report.data, report.fileName)}>Export Excel</Button>
          </Card>
        ))}
      </div>
    </PageShell>
  );
};

export default Reports;
