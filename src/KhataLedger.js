import React, { useMemo } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs, getCreditSalesTotal } from './utils/helpers';

const KhataLedger = ({ customers, sales, payments }) => {
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

  return (
    <PageShell title="Khata Ledger" subtitle="Track retailer credit, recoveries, and outstanding balances">
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
          ]}
          rows={rows}
        />
      </Card>
    </PageShell>
  );
};

export default KhataLedger;
