import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell, StatCard } from './components/ui';
import { Search, Layers, List } from 'lucide-react';

// userRole ka default fallback 'admin' rakh diya hai taake automatic detect ho jaye
const InventorySummary = ({ products = [], getStock, sales = [], userRole = 'admin' }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // --- SEARCH & VIEW STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false); // Ikatha view karne ki state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Strict Admin Boolean check for protection
  const isAdmin = useMemo(() => {
    return String(userRole).toLowerCase() === 'admin';
  }, [userRole]);

  // 1. Raw rows generate karna aur dynamic status nikalna
  const rows = useMemo(() => 
    products.map((product) => {
      const stock = typeof getStock === 'function' ? getStock(product.name) : 0;
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

  // 2. Search filter apply karna
  const filteredRows = useMemo(() => {
    return rows.filter((row) => 
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rows, searchTerm]);

  // 3. Pagination ya Show All logic
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  
  const finalDisplayedRows = useMemo(() => {
    if (showAll) {
      return filteredRows; // Agar ikatha dekhna ho to saare filtered rows show honge
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, showAll, currentPage]);

  // Handle Page Change Safely
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Search input change handler
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Nayi search par page 1 par wapas le jaye
  };

  // Ledger function: ID ke zariye sale record dhoondhna
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

  // Dynamic columns definition based on strict admin access
  const columns = useMemo(() => {
    const baseCols = [
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
    ];

    // Ledger view ka action button sirf authentic admin ko milega
    if (isAdmin) {
      baseCols.push({
        key: 'action',
        label: 'Action',
        render: (row) => (
          <Button size="sm" onClick={() => setSelectedProduct(row)}>
            View Ledger
          </Button>
        )
      });
    }

    return baseCols;
  }, [isAdmin]);

  return (
    <PageShell title="Inventory Logs">
      <StatCard title="Items Needing Attention" value={String(lowStockCount)} tone="amber" />

      {/* SEARCH AND VIEW CONTROL BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
        <div className="md:col-span-2 relative">
          <Input 
            label="Search Product / Category" 
            value={searchTerm} 
            onChange={handleSearchChange} 
            placeholder="Search by product name or category..."
            className="pl-10"
          />
          <div className="absolute left-3 bottom-3 text-slate-500">
            <Search size={16} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">View Mode</label>
          <Button 
            onClick={() => setShowAll(!showAll)} 
            className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-lg transition border cursor-pointer ${
              showAll 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
            }`}
          >
            {showAll ? <List size={14} /> : <Layers size={14} />}
            {showAll ? 'Switch to Pages (10 items)' : 'Show All Pages'}
          </Button>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={finalDisplayedRows}
        />

        {/* --- PAGINATION CONTROLS BAR --- */}
        {!showAll && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400">
              Showing <b className="text-slate-200">{((currentPage - 1) * itemsPerPage) + 1}</b> to <b className="text-slate-200">{Math.min(currentPage * itemsPerPage, filteredRows.length)}</b> of <b className="text-slate-200">{filteredRows.length}</b> Products
            </span>
            
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-300 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                Previous
              </Button>

              {/* Dynamic Page Number Buttons */}
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <Button
                size="sm"
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-300 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Ledger history block strictly checks isAdmin boolean and verification */}
      {isAdmin && selectedProduct && (
        <Card title={`Ledger History: ${selectedProduct.name}`} className="mt-6">
          <DataTable 
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'customer', label: 'Customer' },
              { key: 'qty', label: 'Qty Sold' },
              { key: 'total', label: 'Total Amount' }
            ]} 
            rows={getProductLedger(selectedProduct.id)} 
          />
        </Card>
      )}
    </PageShell>
  );
};

export default InventorySummary;