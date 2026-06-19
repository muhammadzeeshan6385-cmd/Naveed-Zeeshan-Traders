import React, { useState } from 'react';

const Suppliers = ({ suppliers, setSuppliers }) => {
  const [form, setForm] = useState({ name: '', company: '', phone: '', balance: 0 });

  const addSupplier = () => {
    setSuppliers([...suppliers, form]);
    setForm({ name: '', company: '', phone: '', balance: 0 });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-blue-800">Suppliers Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input className="border p-3 rounded" placeholder="Supplier Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
        <input className="border p-3 rounded" placeholder="Company/Firm Name" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} />
        <input className="border p-3 rounded" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
      </div>
      <button onClick={addSupplier} className="bg-blue-600 text-white px-6 py-2 rounded font-bold">Add Supplier</button>

      <table className="w-full mt-8 border-collapse">
        <thead className="bg-gray-100"><tr><th className="p-2">Name</th><th>Company</th><th>Phone</th></tr></thead>
        <tbody>
          {suppliers.map((s, i) => (
            <tr key={i} className="border-t"><td className="p-2">{s.name}</td><td>{s.company}</td><td>{s.phone}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default Suppliers;