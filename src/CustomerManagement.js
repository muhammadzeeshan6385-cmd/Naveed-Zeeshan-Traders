import React from 'react';

const CustomerManagement = () => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md mt-8 border border-gray-200">
      <h2 className="text-2xl font-bold text-blue-800 mb-4">Customer Management</h2>
      <table className="w-full text-left border-collapse">
        <tr className="bg-blue-800 text-white"><th className="p-3">Customer ID</th><th>Name</th><th>Mobile</th><th>Balance</th></tr>
        <tr className="border-b"><td className="p-3">C-001</td><td>Ali Traders</td><td>0300-1234567</td><td>Rs. 5,000</td></tr>
      </table>
    </div>
  );
};

export default CustomerManagement;