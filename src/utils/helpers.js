
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