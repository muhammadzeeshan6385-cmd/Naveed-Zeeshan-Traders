import { LayoutDashboard, Package, ClipboardList, Users, Truck, ShoppingCart, CreditCard, HandCoins, BookOpenText, Receipt, Landmark, BarChart3, Settings } from 'lucide-react';
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
  { id: 'Dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'Products', label: 'Stock Items', icon: <Package size={18} /> },
  { id: 'Inventory', label: 'Inventory Logs', icon: <ClipboardList size={18} /> },
  { id: 'Customers', label: 'Client Directory', icon: <Users size={18} /> },
  { id: 'Suppliers', label: 'Vendors', icon: <Truck size={18} /> },
  { id: 'Purchases', label: 'Procurement', icon: <ShoppingCart size={18} /> },
  { id: 'Sales', label: 'Sales Terminal', icon: <CreditCard size={18} /> },
  { id: 'Recovery', label: 'Payment Recovery', icon: <HandCoins size={18} /> },
  { id: 'Khata', label: 'Account Ledger', icon: <BookOpenText size={18} /> },
  { id: 'Expenses', label: 'Business Expenses', icon: <Receipt size={18} /> },
  { id: 'Cash/Bank', label: 'Finance Hub', icon: <Landmark size={18} /> },
  { id: 'Reports', label: 'Analytics Report', icon: <BarChart3 size={18} /> },
  { id: 'Settings', label: 'System Settings', icon: <Settings size={18} /> },
];