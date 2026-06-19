import React from 'react';

const InventorySummary = ({ products, getStock }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-yellow-200 mb-8">
      <h2 className="text-2xl font-bold text-yellow-800 mb-4">Stock Overview</h2>
      <table className="w-full text-left">
        <thead><tr className="bg-gray-100"><th>Product</th><th>Current Stock</th></tr></thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2 font-bold text-blue-600">{getStock(p.name)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default InventorySummary;