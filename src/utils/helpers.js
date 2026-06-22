export const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const todayISO = () => new Date().toISOString().split('T')[0];

export const formatRs = (value) => {
  const amount = Number(value) || 0;
  return `Rs. ${amount.toLocaleString('en-PK')}`;
};

export const encodePassword = (password) => {
  try {
    return btoa(String(password));
  } catch {
    return String(password);
  }
};

export const verifyPassword = (input, stored) => {
  const encoded = encodePassword(input);
  return stored === encoded || stored === input;
};

export const getProductSaleRate = (product) => Number(product?.sRate ?? product?.price ?? 0);

export const getProductPurchaseRate = (product) => Number(product?.pRate ?? product?.price ?? 0);

export const getSaleTotal = (sale) => {
  if (!sale) return 0;
  if (sale.netTotal !== undefined) return Number(sale.netTotal) || 0;
  if (sale.total !== undefined) return Number(sale.total) || 0;
  if (sale.items?.length) {
    return sale.items.reduce((sum, item) => sum + Number(item.total ?? item.qty * item.rate ?? 0), 0);
  }
  return Number(sale.qty || 0) * Number(sale.price || 0);
};

export const getSaleCustomer = (sale) => sale?.customer || sale?.customerName || '';

export const getCreditSalesTotal = (sales, customerName) =>
  sales
    .filter((sale) => getSaleCustomer(sale) === customerName && (sale.paymentType || 'Credit') !== 'Cash')
    .reduce((sum, sale) => sum + getSaleTotal(sale), 0);

export const getTotalOutstanding = (sales = [], payments = []) => {
  const creditSales = sales
    .filter((sale) => (sale.paymentType || 'Credit') !== 'Cash')
    .reduce((sum, sale) => sum + getSaleTotal(sale), 0);
  const recovered = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return creditSales - recovered;
};

export const calculateStock = (productName, purchases = [], sales = []) => {
  const purchasedQty = purchases
    .filter((entry) => entry?.product === productName)
    .reduce((sum, entry) => sum + Number(entry.qty || 0), 0);

  const soldQty = sales.reduce((sum, sale) => {
    if (!sale?.items?.length) {
      if (sale.product === productName) return sum + Number(sale.qty || 0);
      return sum;
    }
    const line = sale.items.find((item) => item.name === productName);
    return sum + Number(line?.qty || 0);
  }, 0);

  return purchasedQty - soldQty;
};

export const nextInvoiceNo = (sales, prefix = 'INV') => {
  const numbers = sales
    .map((sale) => sale.invoiceNo)
    .filter(Boolean)
    .map((no) => {
      const match = String(no).match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    });

  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}-${String(next).padStart(5, '0')}`;
};

export const filterByDateRange = (records, from, to) => {
  if (!from && !to) return records;
  return records.filter((record) => {
    const date = record.date || record.createdAt?.split('T')[0];
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
};

export const exportBackup = (data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `nzt-backup-${todayISO()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
