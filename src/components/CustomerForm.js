import React, { useState } from 'react';
import React, { useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, PageShell } from './ui';
import { formatRs, generateId, getCreditSalesTotal } from '../utils/helpers';
const CustomerForm = ({ customers, setCustomers }) => {
  // Yahan useState ko define karna zaroori hai taake error na aaye
  const [form, setForm] = useState({ name: '', shopName: '', mobile: '', address: '' });
const CustomerForm = ({ customers, setCustomers, sales, payments }) => {
  const [form, setForm] = useState({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });
  const addCustomer = () => {
    if (!form.name) return alert("Customer Name is required!");
    setCustomers([...customers, { ...form, id: Date.now() }]);
    setForm({ name: '', shopName: '', mobile: '', address: '' }); // Reset form
    if (!form.name.trim()) {
      window.alert('Customer name is required.');
      return;
    }
    setCustomers([
      ...customers,
      {
        id: generateId(),
        name: form.name.trim(),
        shopName: form.shopName.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        route: form.route.trim(),
        creditLimit: Number(form.creditLimit) || 0,
      },
    ]);
    setForm({ name: '', shopName: '', mobile: '', address: '', route: '', creditLimit: '' });
  };
  const deleteCustomer = (id) => {
    if (window.confirm('Delete this customer?')) {
      setCustomers(customers.filter((customer) => customer.id !== id));
    }
  };
  const rows = useMemo(
    () =>
      customers.map((customer) => {
        const creditSales = getCreditSalesTotal(sales, customer.name);
        const recovered = payments.filter((payment) => payment.customer === customer.name).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return {
          ...customer,