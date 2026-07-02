import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, PageShell, StatCard } from './components/ui';

const InventorySummary = ({ products, getStock, sales }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);

  const rows = useMemo(() => 
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

  // Ledger function: Ab ye ID ke zariye sahi data dhoondhe ga
  const getProductLedger = (productId) => {
    return (sales || []).flatMap(invoice => 
      (invoice.items || [])
        .filter(item => item.productId === productId)
        .map(item => ({
          date: invoice.date,
          customer: invoice.customer,
          qty: item.qty,
          total: item.total
        }))
    );
  };

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
                <span className={row.status === 'Healthy' ? 'text-emerald-300' : row.status === 'Low Stock' ? 'text-amber-300' : 'text-rose-300'}>
                  {row.status}
                </span>
              ),
            },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <Button size="sm" onClick={() => setSelectedProduct(row)}>
                  View Ledger
                </Button>
              )
            }
          ]}
          rows={rows}
        />
      </Card>

      {selectedProduct && (
        <Card title={`Ledger History: ${selectedProduct.name}`} className="mt-6">
          <DataTable 
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'customer', label: 'Customer' },
              { key: 'qty', label: 'Qty Sold' },
              { key: 'total', label: 'Total Amount' }
            ]} 
            // Ab yahan sirf ID pass ho rahi hai jo ke best practice hai
            rows={getProductLedger(selectedProduct.id)} 
          />
        </Card>
      )}
    </PageShell>
  );
};

export default InventorySummary;