import React, { useMemo } from 'react';
import { Card, DataTable, PageShell, StatCard } from './components/ui';

const InventorySummary = ({ products, getStock }) => {
  const rows = useMemo(
    () =>
      products.map((product) => {
        const stock = getStock(product.name);
        const minStock = Number(product.minStock || 5);
        return {
          id: product.id,
          name: product.name,
          category: product.category || '-',
          unit: product.unit || 'Piece',
          stock,
          minStock,
          status: stock <= 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'Healthy',
        };
      }),
    [products, getStock]
  );

  const lowStockCount = rows.filter((row) => row.status !== 'Healthy').length;

  return (
    <PageShell title="Inventory" subtitle="Real-time stock levels based on purchases and sales">
      <StatCard title="Items Needing Attention" value={String(lowStockCount)} tone="amber" />

      <Card>
        <DataTable
          columns={[
            { key: 'name', label: 'Product' },
            { key: 'category', label: 'Category' },
            { key: 'unit', label: 'Unit' },
            { key: 'stock', label: 'Current Stock' },
            { key: 'minStock', label: 'Min Level' },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (
                <span
                  className={
                    row.status === 'Healthy'
                      ? 'text-emerald-300'
                      : row.status === 'Low Stock'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                  }
                >
                  {row.status}
                </span>
              ),
            },
          ]}
          rows={rows}
        />
      </Card>
    </PageShell>
  );
};

export default InventorySummary;
