export const COMPANY_NAME = 'Naveed Zeeshan Traders';
export const APP_VERSION = '2.0.0';
export const STORAGE_KEYS = {
  products: 'nzt_products',
  customers: 'nzt_customers',
  suppliers: 'nzt_suppliers',
  purchases: 'nzt_purchases',
  sales: 'nzt_sales',
  payments: 'nzt_payments',
  expenses: 'nzt_expenses',
  cashData: 'nzt_cashData',
  users: 'nzt_users',
  currentUser: 'nzt_currentUser',
  settings: 'nzt_settings',
};
export const DEFAULT_SETTINGS = {
  companyName: COMPANY_NAME,
  phone: '',
  address: '',
  invoicePrefix: 'INV',
};
export const DEFAULT_USERS = [
  { username: 'Admin', role: 'Admin', pass: 'MTIzNA==' },
];
export const MENU_ITEMS = [
  { id: 'Dashboard', label: 'Dashboard', roles: ['Admin', 'Manager', 'Accountant', 'Salesman'] },
  { id: 'Products', label: 'Products', roles: ['Admin', 'Manager'] },
  { id: 'Inventory', label: 'Inventory', roles: ['Admin', 'Manager', 'Accountant'] },
  { id: 'Customers', label: 'Customers', roles: ['Admin', 'Manager', 'Salesman'] },
  { id: 'Suppliers', label: 'Suppliers', roles: ['Admin', 'Manager'] },
  { id: 'Purchases', label: 'Purchases', roles: ['Admin', 'Manager', 'Accountant'] },
  { id: 'Sales', label: 'Sales', roles: ['Admin', 'Manager', 'Salesman'] },
  { id: 'Recovery', label: 'Recovery', roles: ['Admin', 'Manager', 'Accountant'] },
  { id: 'Khata', label: 'Khata', roles: ['Admin', 'Manager', 'Accountant'] },
  { id: 'Expenses', label: 'Expenses', roles: ['Admin', 'Manager', 'Accountant'] },
  { id: 'Cash/Bank', label: 'Cash / Bank', roles: ['Admin', 'Manager', 'Accountant'] },
  { id: 'Reports', label: 'Reports', roles: ['Admin', 'Manager', 'Accountant'] },
  { id: 'Settings', label: 'Settings', roles: ['Admin'] },
];