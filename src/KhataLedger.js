import React from 'react';

const KhataLedger = ({ customers, sales, payments }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-blue-800">Customer Khata Ledger</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Customer Name</th>
              <th className="p-3">Total Sales (Udhaar)</th>
              <th className="p-3">Total Recovered</th>
              <th className="p-3">Remaining Balance</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => {
              // Har customer ka data filter karna
              const totalSales = sales.filter(s => s.customer === c.name).reduce((acc, curr) => acc + Number(curr.total), 0);
              const totalPaid = payments.filter(p => p.customer === c.name).reduce((acc, curr) => acc + Number(curr.amount), 0);
              const balance = totalSales - totalPaid;

              return (
                <tr key={i} className="border-t">
                  <td className="p-3 font-bold text-blue-900">{c.name}</td>
                  <td className="p-3 text-red-600">Rs. {totalSales}</td>
                  <td className="p-3 text-green-600">Rs. {totalPaid}</td>
                  <td className={`p-3 font-bold ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    Rs. {balance}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default KhataLedger;