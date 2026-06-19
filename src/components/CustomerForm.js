import React, { useState } from 'react';

const CustomerForm = ({ customers, setCustomers }) => {
  // Yahan useState ko define karna zaroori hai taake error na aaye
  const [form, setForm] = useState({ name: '', shopName: '', mobile: '', address: '' });

  const addCustomer = () => {
    if (!form.name) return alert("Customer Name is required!");
    setCustomers([...customers, { ...form, id: Date.now() }]);
    setForm({ name: '', shopName: '', mobile: '', address: '' }); // Reset form
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Add Customer</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <input 
          className="border p-2 rounded" 
          placeholder="Name" 
          value={form.name} 
          onChange={(e) => setForm({...form, name: e.target.value})} 
        />
        <input 
          className="border p-2 rounded" 
          placeholder="Shop Name" 
          value={form.shopName} 
          onChange={(e) => setForm({...form, shopName: e.target.value})} 
        />
        <input 
          className="border p-2 rounded" 
          placeholder="Mobile" 
          value={form.mobile} 
          onChange={(e) => setForm({...form, mobile: e.target.value})} 
        />
        <input 
          className="border p-2 rounded" 
          placeholder="Address" 
          value={form.address} 
          onChange={(e) => setForm({...form, address: e.target.value})} 
        />
      </div>
      <button onClick={addCustomer} className="bg-blue-600 text-white px-6 py-2 rounded">Save Customer</button>
      
      {/* List of Customers */}
      <div className="mt-6">
        <h3 className="font-bold mb-2">Customer List</h3>
        {customers.map(c => (
            <div key={c.id} className="p-2 border-b">{c.name} - {c.shopName}</div>
        ))}
      </div>
    </div>
  );
};
export default CustomerForm;