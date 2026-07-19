import React, { useState } from 'react';
import { Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Card, DataTable, Input, PageShell, Select } from './components/ui';
import { generateId, getProductPurchaseRate, getProductSaleRate } from './utils/helpers';

// Firebase Firestore imports
import { db } from './firebase'; 
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const Products = ({ products, setProducts, userRole }) => {
  // Case-insensitivity aur potential string formats ko handle karne ke liye check
  const isAdmin = userRole && typeof userRole === 'string' && userRole.toLowerCase().trim() === 'admin';

  const [form, setForm] = useState({ name: '', category: '', sku: '', pRate: '', sRate: '', minStock: '5', unit: 'Piece' });
  const [editingProduct, setEditingProduct] = useState(null); // Edit Popup state
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const resetForm = () => setForm({ name: '', category: '', sku: '', pRate: '', sRate: '', minStock: '5', unit: 'Piece' });

  const addProduct = async () => {
    if (!isAdmin) {
      window.alert('Unauthorized access. Only admins can add products.');
      return;
    }
    if (!form.name.trim() || !form.sRate) {
      window.alert('Product name and sale rate are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const customId = generateId();
      const productPayload = {
        id: customId,
        name: form.name.trim(),
        category: form.category.trim(),
        sku: form.sku.trim(),
        unit: form.unit,
        pRate: Number(form.pRate) || 0,
        sRate: Number(form.sRate) || 0,
        minStock: Number(form.minStock) || 5
      };

      await setDoc(doc(db, 'products', customId), productPayload);

      setProducts([...products, productPayload]);
      resetForm();
      setCurrentPage(1); 
      console.log("Product successfully added to Firebase Firestore.");
    } catch (error) {
      console.error("Firebase write error:", error);
      window.alert("Database me save karte hue error aya: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (row) => {
    if (!isAdmin) {
      window.alert('Unauthorized action. Only admins can delete products.');
      return;
    }
    if (window.confirm('Delete this product?')) {
      const targetId = row.id || row._id;

      if (!targetId) {
        window.alert("Product ID not found. Cannot delete from Firebase.");
        return;
      }

      try {
        const productDocRef = doc(db, 'products', targetId);
        await deleteDoc(productDocRef);

        setProducts(products.filter((p) => {
          const productId = p.id || p._id;
          return productId !== targetId;
        }));

        const totalPagesAfterDelete = Math.ceil((products.length - 1) / itemsPerPage);
        if (currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
          setCurrentPage(totalPagesAfterDelete);
        }

        console.log("Product successfully deleted from Firebase Firestore.");
      } catch (error) {
        console.error("Firebase deletion error:", error);
        window.alert("Database se delete karte hue error aya: " + error.message);
      }
    }
  };

  const updateProduct = async () => {
    if (!isAdmin) {
      window.alert('Unauthorized data modification attempt.');
      return;
    }

    const targetId = editingProduct.id || editingProduct._id;
    if (!targetId) {
      window.alert("Product ID missing for tracking execution.");
      return;
    }

    try {
      setIsSubmitting(true);
      const productDocRef = doc(db, 'products', targetId);
      
      const updatedPayload = {
        ...editingProduct,
        pRate: Number(editingProduct.pRate) || 0,
        sRate: Number(editingProduct.sRate) || 0
      };

      await updateDoc(productDocRef, updatedPayload);

      setProducts(products.map(p => (p.id === targetId || p._id === targetId) ? updatedPayload : p));
      setEditingProduct(null); 
      console.log("Product fields updated successfully inside Firestore.");
    } catch (error) {
      console.error("Firebase update path error:", error);
      window.alert("Database record update error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Filter products base
  const filteredProducts = products.filter((p) =>
    [p.name, p.category, p.sku].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  // 2. Pagination Math calculations
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;

  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); 
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); 
  };

  return (
    <PageShell title="Stock Items">
      {/* Form Add Box Layer */}
      {isAdmin && (
        <Card title="Add Product">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input label="SKU / Code" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option>Piece</option><option>Carton</option><option>Bag</option><option>Kg</option>
            </Select>
            <Input label="Purchase Rate" type="number" value={form.pRate} onChange={(e) => setForm({ ...form, pRate: e.target.value })} />
            <Input label="Sale Rate" type="number" value={form.sRate} onChange={(e) => setForm({ ...form, sRate: e.target.value })} />
            <Input label="Min Stock Alert" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={addProduct} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Product'}
          </Button>
        </Card>
      )}

      <Card title="Product List">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <Input 
            className="w-full sm:max-w-md" 
            placeholder="Search products..." 
            value={search} 
            onChange={handleSearchChange} 
          />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-700 text-slate-200"
            >
              <option value={10}>10 Products</option>
              <option value={25}>25 Products</option>
              <option value={50}>50 Products</option>
              <option value={100}>100 Products</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-semibold mb-2 pl-1">
          Showing {totalItems > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
        </div>

        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'sku', label: 'SKU' },
            { key: 'category', label: 'Category' },
            { key: 'unit', label: 'Unit' },
            { key: 'pRate', label: 'P.Rate', render: (row) => getProductPurchaseRate(row) },
            { key: 'sRate', label: 'S.Rate', render: (row) => getProductSaleRate(row) },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => alert('Previewing ' + row.name)} className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer" title="Preview"><Eye size={18} /></button>
                  
                  {/* Strict variable evaluation logic */}
                  {isAdmin && (
                    <>
                      <button onClick={() => setEditingProduct(row)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded cursor-pointer" title="Edit"><Pencil size={18} /></button>
                      <button onClick={() => deleteProduct(row)} className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded cursor-pointer" title="Delete"><Trash2 size={18} /></button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={paginatedProducts}
        />

        {/* --- DYNAMIC PAGINATION CONTROLS BAR --- */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-4 flex-wrap gap-3">
            <span className="text-xs text-slate-400 font-medium">
              Page {activePage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={activePage === 1}
                onClick={() => handlePageChange(activePage - 1)}
                className={`p-1.5 rounded-lg border border-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activePage === 1 
                  ? 'text-slate-600 border-slate-900 bg-slate-950/20 cursor-not-allowed' 
                  : 'text-slate-300 bg-slate-950 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      activePage === pageNum
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={activePage === totalPages}
                onClick={() => handlePageChange(activePage + 1)}
                className={`p-1.5 rounded-lg border border-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activePage === totalPages 
                  ? 'text-slate-600 border-slate-900 bg-slate-950/20 cursor-not-allowed' 
                  : 'text-slate-300 bg-slate-950 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Popup Modal Terminal Portal */}
      {isAdmin && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">Edit Product</h2>
              <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Name" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
              <Input label="SKU" value={editingProduct.sku} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} />
              <Input label="P.Rate" type="number" value={editingProduct.pRate} onChange={(e) => setEditingProduct({...editingProduct, pRate: e.target.value})} />
              <Input label="S.Rate" type="number" value={editingProduct.sRate} onChange={(e) => setEditingProduct({...editingProduct, sRate: e.target.value})} />
            </div>
            <Button className="w-full mt-6" onClick={updateProduct} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default Products;