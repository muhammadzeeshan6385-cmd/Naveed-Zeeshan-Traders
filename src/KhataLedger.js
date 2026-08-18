import React, { useMemo, useState, useEffect } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs } from './utils/helpers';

// Firebase Firestore setup
import { db } from './firebase'; 
import { doc, updateDoc, deleteDoc, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

import { 
  Eye, 
  Printer, 
  X, 
  Search, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Edit2,
  Trash2,
  Users,
  Truck,
  Wallet,
  CheckCircle2,
  CreditCard,
  Check
} from 'lucide-react';

const KhataLedger = ({ 
  customers = [], 
  sales = [], 
  payments = [], 
  returns = [], 
  vendors = [], 
  suppliers = [], 
  purchases = [], 
  vendorPayments = [], 
  vendorReturns = [],
  currentRole = 'admin',
  cashInHand = 0,
  onPaymentSuccess,
  appLogoUrl = '/logo.png'
}) => {
  // Direct Firebase Fetch States
  const [fetchedSuppliers, setFetchedSuppliers] = useState([]);
  const [fetchedPurchases, setFetchedPurchases] = useState([]);
  const [fetchedVendorPayments, setFetchedVendorPayments] = useState([]);

  useEffect(() => {
    const fetchDirectData = async () => {
      try {
        if ((!vendors || vendors.length === 0) && (!suppliers || suppliers.length === 0)) {
          const supSnap = await getDocs(collection(db, 'suppliers'));
          setFetchedSuppliers(supSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        if (!purchases || purchases.length === 0) {
          const purSnap = await getDocs(collection(db, 'purchases'));
          setFetchedPurchases(purSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        if (!vendorPayments || vendorPayments.length === 0) {
          const vpaySnap = await getDocs(collection(db, 'vendorPayments'));
          setFetchedVendorPayments(vpaySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (err) {
        console.error("Firebase fetch error:", err);
      }
    };

    fetchDirectData();
  }, [vendors, suppliers, purchases, vendorPayments]);

  const masterVendorsList = useMemo(() => {
    if (vendors && vendors.length > 0) return vendors;
    if (suppliers && suppliers.length > 0) return suppliers;
    return fetchedSuppliers || [];
  }, [vendors, suppliers, fetchedSuppliers]);

  const masterPurchasesList = useMemo(() => {
    return purchases && purchases.length > 0 ? purchases : (fetchedPurchases || []);
  }, [purchases, fetchedPurchases]);

  const masterVendorPaymentsList = useMemo(() => {
    return vendorPayments && vendorPayments.length > 0 ? vendorPayments : (fetchedVendorPayments || []);
  }, [vendorPayments, fetchedVendorPayments]);

  // Active Tab & Selection States
  const [activeTab, setActiveTab] = useState('customers');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Database Operations States
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [newPrevBalance, setNewPrevBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Vendor Payment States
  const [payingVendor, setPayingVendor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const isAdmin = useMemo(() => {
    return String(currentRole || '').trim().toLowerCase() === 'admin';
  }, [currentRole]);

  const getPurchaseAmount = (p) => {
    if (!p) return 0;
    const rawAmt = Number(p.grandTotal || p.netTotal || p.totalAmount || p.total || p.amount || p.billAmount || 0);
    return Math.round(rawAmt);
  };

  // Safe Vendor Exact Match Rule
  const isVendorMatch = (record, vendor) => {
    if (!record || !vendor) return false;
    
    const vId = vendor.id ? String(vendor.id).trim() : null;
    const rVendorId = String(record.vendorId || record.supplierId || record.vendor_id || record.supplier_id || '').trim();

    if (vId && rVendorId && vId === rVendorId) return true;

    const vendorName = typeof vendor === 'string' ? vendor : (vendor.name || vendor.supplierName || vendor.vendorName || '');
    if (!vendorName) return false;

    const vName = String(vendorName).trim().toLowerCase();
    const targetName = String(
      record.vendorName || record.vendor || record.supplierName || record.supplier || record.name || ''
    ).trim().toLowerCase();

    return vName === targetName;
  };

  // Safe Customer Exact Match Rule
  const isCustomerMatch = (record, customer) => {
    if (!record || !customer) return false;

    const cId = customer.id ? String(customer.id).trim() : null;
    const rCustomerId = String(record.customerId || record.clientId || record.customer_id || record.client_id || '').trim();

    if (cId && rCustomerId && cId === rCustomerId) return true;

    const customerName = typeof customer === 'string' ? customer : (customer.name || '');
    if (!customerName) return false;

    const cName = String(customerName).trim().toLowerCase();
    const targetName = String(
      record.customerName || record.customer || record.customer_name || record.clientName || record.client || record.name || ''
    ).trim().toLowerCase();

    return cName === targetName;
  };

  // Customer Calculation Analytics
  const ledgerMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let totalRecoveredThisMonth = 0;
    let activeDebtorsCount = 0;

    (customers || []).forEach((customer) => {
      const prevBal = Math.round(Number(customer.previousBalance || customer.openingBalance || customer.balance || 0));
      
      const customerSalesList = (sales || []).filter((s) => isCustomerMatch(s, customer));
      const totalSales = Math.round(
        customerSalesList.reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.totalAmount || 0), 0)
      );

      const totalPaid = Math.round(
        (payments || [])
          .filter((p) => isCustomerMatch(p, customer))
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      );
      const totalReturned = Math.round(
        (returns || [])
          .filter((r) => isCustomerMatch(r, customer))
          .reduce((sum, r) => sum + Number(r.refundAmount || r.netTotal || 0), 0)
      );
      
      const balance = prevBal + totalSales - totalPaid - totalReturned;

      if (balance > 0) {
        totalOutstanding += balance;
        activeDebtorsCount += 1;
      }
    });

    (payments || []).forEach((p) => {
      const pDate = new Date(p.date || p.createdAt);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
        totalRecoveredThisMonth += Math.round(Number(p.amount || 0));
      }
    });

    return { totalOutstanding, totalRecoveredThisMonth, activeDebtorsCount };
  }, [customers, sales, payments, returns]);

  const customerRows = useMemo(
    () =>
      (customers || [])
        .map((customer) => {
          const prevBal = Math.round(Number(customer.previousBalance || customer.openingBalance || customer.balance || 0));
          
          const customerSalesList = (sales || []).filter((s) => isCustomerMatch(s, customer));
          const totalSales = Math.round(
            customerSalesList.reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.totalAmount || 0), 0)
          );

          const totalPaid = Math.round(
            (payments || [])
              .filter((payment) => isCustomerMatch(payment, customer))
              .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
          );
          const totalReturned = Math.round(
            (returns || [])
              .filter((returnItem) => isCustomerMatch(returnItem, customer))
              .reduce((sum, returnItem) => sum + Number(returnItem.refundAmount || returnItem.netTotal || 0), 0)
          );
          
          const balance = prevBal + totalSales - totalPaid - totalReturned;

          return {
            id: customer.id,
            name: customer.name || 'Unnamed',
            shopName: customer.shopName || customer.companyName || '-',
            phone: customer.phone || customer.mobile || customer.contact || '-',
            area: customer.area || customer.city || 'Mailsi',
            previousBalance: prevBal,
            totalSales,
            totalPaid,
            totalReturned,
            balance,
            status: balance > 50000 ? 'High Risk' : balance > 0 ? 'Active' : 'Clear',
          };
        })
        .filter((row) => {
          const matchesSearch = 
            (row.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (row.shopName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (row.phone || '').includes(searchTerm);
            
          if (filterType === 'all') return matchesSearch;
          if (filterType === 'debtors') return matchesSearch && row.balance > 0;
          if (filterType === 'clear') return matchesSearch && row.balance <= 0;
          return matchesSearch;
        }),
    [customers, sales, payments, returns, searchTerm, filterType]
  );

  // Vendor Calculation Analytics
  const vendorMetrics = useMemo(() => {
    let totalPayable = 0;
    let totalPaidThisMonth = 0;
    let activeCreditorsCount = 0;

    masterVendorsList.forEach((vendor) => {
      const prevBal = Math.round(Number(vendor.previousBalance || vendor.openingBalance || vendor.balance || 0));
      
      const totalPurchases = masterPurchasesList
        .filter((p) => isVendorMatch(p, vendor))
        .reduce((sum, p) => sum + getPurchaseAmount(p), 0);
        
      const totalPaid = Math.round(
        masterVendorPaymentsList
          .filter((vp) => isVendorMatch(vp, vendor))
          .reduce((sum, vp) => sum + Number(vp.amount || 0), 0)
      );
        
      const totalReturned = Math.round(
        (vendorReturns || [])
          .filter((vr) => isVendorMatch(vr, vendor))
          .reduce((sum, vr) => sum + Number(vr.refundAmount || vr.total || 0), 0)
      );

      const balance = prevBal + totalPurchases - totalPaid - totalReturned;

      if (balance > 0) {
        totalPayable += balance;
        activeCreditorsCount += 1;
      }
    });

    masterVendorPaymentsList.forEach((vp) => {
      const vpDate = new Date(vp.date || vp.createdAt);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      if (vpDate.getMonth() === currentMonth && vpDate.getFullYear() === currentYear) {
        totalPaidThisMonth += Math.round(Number(vp.amount || 0));
      }
    });

    return { totalPayable, totalPaidThisMonth, activeCreditorsCount };
  }, [masterVendorsList, masterPurchasesList, masterVendorPaymentsList, vendorReturns]);

  const vendorRows = useMemo(
    () =>
      masterVendorsList
        .map((vendor) => {
          const vName = vendor.name || vendor.supplierName || vendor.vendorName || 'Unknown Vendor';
          const prevBal = Math.round(Number(vendor.previousBalance || vendor.openingBalance || vendor.balance || 0));
          
          const totalPurchases = masterPurchasesList
            .filter((p) => isVendorMatch(p, vendor))
            .reduce((sum, p) => sum + getPurchaseAmount(p), 0);
            
          const totalPaid = Math.round(
            masterVendorPaymentsList
              .filter((vp) => isVendorMatch(vp, vendor))
              .reduce((sum, vp) => sum + Number(vp.amount || 0), 0)
          );
            
          const totalReturned = Math.round(
            (vendorReturns || [])
              .filter((vr) => isVendorMatch(vr, vendor))
              .reduce((sum, vr) => sum + Number(vr.refundAmount || vr.total || 0), 0)
          );

          const balance = prevBal + totalPurchases - totalPaid - totalReturned;

          return {
            id: vendor.id,
            name: vName,
            companyName: vendor.companyName || vendor.company || vendor.brand || '-',
            phone: vendor.phone || vendor.contact || vendor.mobile || '-',
            city: vendor.city || vendor.address || 'Mailsi',
            previousBalance: prevBal,
            totalPurchases,
            totalPaid,
            totalReturned,
            balance,
          };
        })
        .filter((row) => {
          const matchesSearch = 
            (row.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (row.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (row.phone || '').includes(searchTerm);
            
          if (filterType === 'all') return matchesSearch;
          if (filterType === 'debtors') return matchesSearch && row.balance > 0;
          if (filterType === 'clear') return matchesSearch && row.balance <= 0;
          return matchesSearch;
        }),
    [masterVendorsList, masterPurchasesList, masterVendorPaymentsList, vendorReturns, searchTerm, filterType]
  );

  const handleSavePreviousBalance = async () => {
    if (!isAdmin) {
      showToast('Aapke paas opening balance change karne ki authority nahi hai!', 'warning');
      return;
    }
    if (!editingItem) return;
    setIsSaving(true);
    try {
      const collectionName = activeTab === 'customers' ? 'customers' : 'suppliers';
      const docRef = doc(db, collectionName, editingItem.id);
      
      await updateDoc(docRef, {
        previousBalance: Math.round(Number(newPrevBalance || 0))
      });
      
      showToast('Previous Balance update ho gaya!', 'success');
      setEditingItem(null);
    } catch (error) {
      console.error("Firebase Error: ", error);
      showToast('Database update failed!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!isAdmin) {
      showToast('Aapke paas is record ko delete karne ki authority nahi hai!', 'warning');
      return;
    }
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const collectionName = activeTab === 'customers' ? 'customers' : 'suppliers';
      const docRef = doc(db, collectionName, deletingItem.id);
      
      await deleteDoc(docRef);
      
      showToast('Record delete ho gaya!', 'success');
      setDeletingItem(null);
    } catch (error) {
      console.error("Firebase Delete Error: ", error);
      showToast('Delete karte waqt error aaya!', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitVendorPayment = async (e) => {
    e.preventDefault();
    const payAmt = Math.round(Number(paymentAmount));
    
    if (!payingVendor || payAmt <= 0) {
      showToast('Valid payment amount dakhil karein!', 'warning');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const paymentRef = await addDoc(collection(db, 'vendorPayments'), {
        vendor: payingVendor.name,
        vendorId: payingVendor.id,
        amount: payAmt,
        paymentMethod: paymentMethod,
        notes: paymentNotes || 'Supplier Paid from Ledger',
        date: todayStr,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'transactions'), {
        type: 'Expense / Vendor Payment',
        category: 'Vendor Payment',
        amount: payAmt,
        description: `Paid to Supplier: ${payingVendor.name} (${paymentNotes || 'Ledger Payment'})`,
        paymentMethod: paymentMethod,
        vendorName: payingVendor.name,
        paymentId: paymentRef.id,
        date: todayStr,
        createdAt: serverTimestamp()
      });

      showToast(`Rs. ${payAmt} Supplier (${payingVendor.name}) ko pay kar diye gaye!`, 'success');
      
      if (onPaymentSuccess) onPaymentSuccess();
      setPayingVendor(null);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (err) {
      console.error("Payment Error: ", err);
      showToast('Payment save nahi ho saki!', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    const historyArray = [];

    if (selectedCustomer.previousBalance > 0) {
      historyArray.push({
        date: '-',
        type: 'Opening Balance',
        reference: '-',
        description: 'Previous Ledger Opening Balance',
        debit: Math.round(selectedCustomer.previousBalance),
        credit: 0,
      });
    }

    const customerSales = (sales || [])
      .filter((sale) => isCustomerMatch(sale, selectedCustomer))
      .map((sale) => ({
        date: sale.date || (sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('en-CA') : '-'),
        type: 'Invoice',
        reference: sale.invoiceNo || sale.billNo || '-',
        description: 'Goods Supplied on Credit Khata',
        debit: Math.round(Number(sale.netTotal || sale.netAmount || sale.grandTotal || sale.totalAmount || 0)),
        credit: 0,
      }));

    const customerPayments = (payments || [])
      .filter((payment) => isCustomerMatch(payment, selectedCustomer))
      .map((payment) => ({
        date: payment.date || (payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-CA') : '-'),
        type: 'Recovery',
        reference: payment.receiptNo || payment.reference || '-',
        description: payment.paymentMethod ? `Cash Received via ${payment.paymentMethod}` : 'Cash Recovery Payment',
        debit: 0,
        credit: Math.round(Number(payment.amount || 0)),
      }));

    const customerReturns = (returns || [])
      .filter((returnItem) => isCustomerMatch(returnItem, selectedCustomer))
      .map((returnItem) => ({
        date: returnItem.date || (returnItem.createdAt ? new Date(returnItem.createdAt).toLocaleDateString('en-CA') : '-'),
        type: 'Return',
        reference: returnItem.returnNo || '-',
        description: 'Product Returned (Credit Adjustment)',
        debit: 0,
        credit: Math.round(Number(returnItem.refundAmount || returnItem.netTotal || 0)),
      }));

    return [...historyArray, ...customerSales, ...customerPayments, ...customerReturns].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [selectedCustomer, sales, payments, returns]);

  const vendorHistory = useMemo(() => {
    if (!selectedVendor) return [];
    const historyArray = [];

    if (selectedVendor.previousBalance > 0) {
      historyArray.push({
        date: '-',
        type: 'Opening Balance',
        reference: '-',
        description: 'Previous Ledger Opening Balance',
        debit: Math.round(selectedVendor.previousBalance),
        credit: 0,
      });
    }

    const filteredPurchases = masterPurchasesList.filter((p) => isVendorMatch(p, selectedVendor));

    const groupedPurchasesMap = {};
    filteredPurchases.forEach((p) => {
      const pDate = p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-CA') : 'Other');
      const amt = getPurchaseAmount(p);
      let itemCnt = 0;
      if (Array.isArray(p.items)) itemCnt = p.items.length;
      else if (p.totalItems) itemCnt = Number(p.totalItems);

      if (!groupedPurchasesMap[pDate]) {
        groupedPurchasesMap[pDate] = { date: pDate, totalAmount: 0, purchaseCount: 0, totalItems: 0 };
      }
      groupedPurchasesMap[pDate].totalAmount += amt;
      groupedPurchasesMap[pDate].purchaseCount += 1;
      groupedPurchasesMap[pDate].totalItems += itemCnt;
    });

    const groupedPurchasesList = Object.values(groupedPurchasesMap).map((grp) => ({
      date: grp.date,
      type: 'Stock Purchase',
      reference: '-',
      description: `Purchased Stock (${grp.purchaseCount} Bill(s), Total Items: ${grp.totalItems || '-'})`,
      debit: Math.round(grp.totalAmount),
      credit: 0,
    }));

    const vPayments = masterVendorPaymentsList
      .filter((vp) => isVendorMatch(vp, selectedVendor))
      .map((vp) => ({
        date: vp.date || (vp.createdAt ? new Date(vp.createdAt).toLocaleDateString('en-CA') : '-'),
        type: 'Vendor Payment',
        reference: vp.receiptNo || vp.reference || '-',
        description: vp.paymentMethod ? `Paid via ${vp.paymentMethod} (${vp.notes || ''})` : 'Cash Paid to Vendor',
        debit: 0,
        credit: Math.round(Number(vp.amount || 0)),
      }));

    const vReturns = (vendorReturns || [])
      .filter((vr) => isVendorMatch(vr, selectedVendor))
      .map((vr) => ({
        date: vr.date || (vr.createdAt ? new Date(vr.createdAt).toLocaleDateString('en-CA') : '-'),
        type: 'Purchase Return',
        reference: vr.returnNo || '-',
        description: 'Stock Returned to Supplier',
        debit: 0,
        credit: Math.round(Number(vr.refundAmount || vr.total || 0)),
      }));

    return [...historyArray, ...groupedPurchasesList, ...vPayments, ...vReturns].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [selectedVendor, masterPurchasesList, masterVendorPaymentsList, vendorReturns]);

  const handlePrintLedger = (item, type = 'customer') => {
    if (type === 'customer') setSelectedCustomer(item);
    else setSelectedVendor(item);

    setTimeout(() => {
      const windowUrl = 'about:blank';
      const uniqueName = new Date().getTime();
      const printWindow = window.open(windowUrl, uniqueName, 'left=50,top=50,width=850,height=900');

      const isCust = type === 'customer';
      let printHistory = [];

      if (isCust) {
        if (item.previousBalance > 0) {
          printHistory.push({ date: '-', type: 'Opening Balance', reference: '-', debit: Math.round(item.previousBalance), credit: 0 });
        }
        const salesList = (sales || []).filter((s) => isCustomerMatch(s, item))
          .map(s => ({ date: s.date || (s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-CA') : '-'), type: 'Invoice', reference: s.invoiceNo || '-', debit: Math.round(Number(s.netTotal || s.netAmount || s.grandTotal || 0)), credit: 0 }));
        const payList = (payments || []).filter((p) => isCustomerMatch(p, item))
          .map(p => ({ date: p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-CA') : '-'), type: 'Recovery', reference: p.receiptNo || '-', debit: 0, credit: Math.round(Number(p.amount || 0)) }));
        const retList = (returns || []).filter((r) => isCustomerMatch(r, item))
          .map(r => ({ date: r.date || (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-CA') : '-'), type: 'Return', reference: r.returnNo || '-', debit: 0, credit: Math.round(Number(r.refundAmount || 0)) }));
        
        printHistory = [...printHistory, ...salesList, ...payList, ...retList].sort((a,b) => new Date(a.date) - new Date(b.date));
      } else {
        if (item.previousBalance > 0) {
          printHistory.push({ date: '-', type: 'Opening Balance', reference: '-', debit: Math.round(item.previousBalance), credit: 0 });
        }
        
        const vPurchases = masterPurchasesList.filter((p) => isVendorMatch(p, item));
        const groupedPrintPurchases = {};
        vPurchases.forEach((p) => {
          const pDate = p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-CA') : 'Other');
          const amt = getPurchaseAmount(p);
          if (!groupedPrintPurchases[pDate]) {
            groupedPrintPurchases[pDate] = { date: pDate, debit: 0 };
          }
          groupedPrintPurchases[pDate].debit += amt;
        });

        const purList = Object.values(groupedPrintPurchases).map(gp => ({
          date: gp.date,
          type: 'Purchase Batch',
          reference: '-',
          debit: Math.round(gp.debit),
          credit: 0
        }));

        const vPayList = masterVendorPaymentsList.filter((vp) => isVendorMatch(vp, item))
          .map(vp => ({ date: vp.date || (vp.createdAt ? new Date(vp.createdAt).toLocaleDateString('en-CA') : '-'), type: 'Payment', reference: vp.receiptNo || '-', debit: 0, credit: Math.round(Number(vp.amount || 0)) }));
        const vRetList = (vendorReturns || []).filter((vr) => isVendorMatch(vr, item))
          .map(vr => ({ date: vr.date || (vr.createdAt ? new Date(vr.createdAt).toLocaleDateString('en-CA') : '-'), type: 'Purchase Return', reference: vr.returnNo || '-', debit: 0, credit: Math.round(Number(vr.refundAmount || 0)) }));
        
        printHistory = [...printHistory, ...purList, ...vPayList, ...vRetList].sort((a,b) => new Date(a.date) - new Date(b.date));
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${isCust ? 'Customer' : 'Vendor'} Khata Ledger - ${item.name}</title>
            <style>
              @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 10px; } }
              body { font-family: sans-serif; padding: 15px; color: #333; font-size: 11px; line-height: 1.2; }
              .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #111; padding-bottom: 8px; }
              .logo-container { margin-bottom: 5px; }
              .logo-img { max-height: 60px; width: auto; object-fit: contain; }
              .biz-name { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
              .biz-sub { margin: 3px 0 0 0; font-size: 11px; color: #333; font-weight: 500; }
              .info-grid { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; line-height: 1.4; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
              th, td { border: 1px solid #bbb; padding: 5px 8px; text-align: left; }
              tr { height: 20px; }
              th { background: #f4f4f4 !important; font-weight: bold; -webkit-print-color-adjust: exact; padding: 6px 8px; }
              .text-right { text-align: right; }
              .summary { margin-top: 15px; text-align: right; font-size: 12px; font-weight: bold; line-height: 1.5; }
              .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #444; border-top: 1px dashed #666; padding-top: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-container">
                <img src="${appLogoUrl}" alt="Logo" class="logo-img" onerror="this.style.display='none'" />
              </div>
              <h2 class="biz-name">Naveed & Zeeshan Traders</h2>
              <p class="biz-sub">Address: A Rakha Colony, Mailsi | ${isCust ? 'Customer Khata Statement' : 'Vendor Supplier Statement'}</p>
            </div>
            <div class="info-grid">
              <div>
                <strong>${isCust ? 'Customer Name:' : 'Vendor / Supplier Name:'}</strong> ${item.name}<br />
                <strong>${isCust ? 'Shop Name:' : 'Company Name:'}</strong> ${item.shopName || item.companyName || '-'}<br />
                <strong>Contact/Mobile No:</strong> ${item.phone}
              </div>
              <div class="text-right">
                <strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-GB')}<br />
                <strong>Location:</strong> ${item.area || item.city || 'Mailsi'}<br />
                <strong>Account Type:</strong> ${isCust ? 'Debtor (Customer)' : 'Creditor (Supplier)'}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Type</th>
                  <th>Ref Doc No.</th>
                  <th class="text-right">${isCust ? 'Debit (Maal Sale)' : 'Debit (Purchases Amount)'}</th>
                  <th class="text-right">${isCust ? 'Credit (Vasooli/Returns)' : 'Credit (Payments/Returns)'}</th>
                  <th class="text-right">Running Net Balance</th>
                </tr>
              </thead>
              <tbody>
                ${
                  printHistory.length === 0 
                  ? '<tr><td colspan="6" style="text-align:center; padding:8px;">No transaction records available.</td></tr>'
                  : (() => {
                      let cumulativeSum = 0;
                      return printHistory.map(h => {
                        cumulativeSum += (h.debit - h.credit);
                        return `
                          <tr>
                            <td>${h.date}</td>
                            <td>${h.type}</td>
                            <td style="font-weight:500;">${h.reference}</td>
                            <td class="text-right">${h.debit > 0 ? 'Rs. ' + Math.round(h.debit) : '-'}</td>
                            <td class="text-right">${h.credit > 0 ? 'Rs. ' + Math.round(h.credit) : '-'}</td>
                            <td class="text-right" style="font-weight:bold;">Rs. ${Math.round(cumulativeSum)}</td>
                          </tr>
                        `;
                      }).join('');
                    })()
                }
              </tbody>
            </table>
            <div class="summary">
              ${item.previousBalance > 0 ? `Opening Balance: Rs. ${Math.round(item.previousBalance)}<br />` : ''}
              ${isCust ? `Total Credit Sales: Rs. ${Math.round(item.totalSales)}<br />` : `Total Stock Purchased: Rs. ${Math.round(item.totalPurchases)}<br />`}
              Total Paid/Recovered: Rs. ${Math.round(item.totalPaid)}<br />
              <span style="font-size: 14px; color: #b45309; border-top: 2px double #222; padding-top: 2px; display: inline-block; margin-top: 2px;">
                Net Outstanding Arrears: Rs. ${Math.round(item.balance)}
              </span>
            </div>
            <div class="footer">
              Naveed & Zeeshan Traders Ledger Management — Signature: _______________________
            </div>
            <script>
              setTimeout(function() { window.print(); window.close(); }, 250);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }, 250);
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const exportToCSV = () => {
    const isCust = activeTab === 'customers';
    const activeRows = isCust ? customerRows : vendorRows;
    const headers = isCust 
      ? ['Customer Name', 'Shop Name', 'Previous Balance', 'Total Sales', 'Total Paid', 'Total Returned', 'Current Balance\n']
      : ['Vendor Name', 'Company Name', 'Previous Balance', 'Total Purchases', 'Total Paid', 'Total Returned', 'Current Balance\n'];
      
    const csvRows = activeRows.map(r => `"${r.name}","${r.shopName || r.companyName}",${Math.round(r.previousBalance)},${Math.round(r.totalSales || r.totalPurchases)},${Math.round(r.totalPaid)},${Math.round(r.totalReturned || 0)},${Math.round(r.balance)}\n`);
    const blob = new Blob([headers.join(','), ...csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${isCust ? 'Customer' : 'Vendor'}_Khata_Ledger.csv`);
    a.click();
  };

  return (
    <PageShell title="Khata & Ledger Management">
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-xl text-white font-medium flex items-center gap-2 transition-all duration-300 ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Tabs & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => { setActiveTab('customers'); setSelectedCustomer(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'customers'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Customer Khata
          </button>
          <button
            onClick={() => { setActiveTab('vendors'); setSelectedVendor(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'vendors'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            Vendor / Supplier Khata
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefreshData}
            className={`p-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {activeTab === 'customers' ? (
          <>
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-amber-600 tracking-wider">Total Outstanding Arrears</p>
                  <h3 className="text-2xl font-bold text-amber-900 mt-1">{formatRs(ledgerMetrics.totalOutstanding)}</h3>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">Recovered This Month</p>
                  <h3 className="text-2xl font-bold text-emerald-900 mt-1">{formatRs(ledgerMetrics.totalRecoveredThisMonth)}</h3>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-blue-600 tracking-wider">Active Debtors</p>
                  <h3 className="text-2xl font-bold text-blue-900 mt-1">{ledgerMetrics.activeDebtorsCount} Accounts</h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-red-200/60">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-red-600 tracking-wider">Total Supplier Payable</p>
                  <h3 className="text-2xl font-bold text-red-900 mt-1">{formatRs(vendorMetrics.totalPayable)}</h3>
                </div>
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/60">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">Paid to Vendors (Month)</p>
                  <h3 className="text-2xl font-bold text-indigo-900 mt-1">{formatRs(vendorMetrics.totalPaidThisMonth)}</h3>
                </div>
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-slate-50 to-zinc-50 border-slate-200/60">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-600 tracking-wider">Active Creditors</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{vendorMetrics.activeCreditorsCount} Vendors</h3>
                </div>
                <div className="p-2 bg-slate-200/60 rounded-lg text-slate-700">
                  <Truck className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Table Data */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'customers' ? 'Customers' : 'Vendors'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('debtors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterType === 'debtors' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {activeTab === 'customers' ? 'With Balance' : 'Payable Only'}
            </button>
            <button
              onClick={() => setFilterType('clear')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterType === 'clear' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Clear
            </button>
          </div>
        </div>

        <DataTable
          columns={
            activeTab === 'customers'
              ? [
                  { header: 'Customer', accessor: (r) => (
                    <div>
                      <div className="font-semibold text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-400">{r.shopName}</div>
                    </div>
                  )},
                  { header: 'Contact', accessor: (r) => (
                    <div className="text-xs text-slate-600">
                      <div>{r.phone}</div>
                      <div className="text-slate-400">{r.area}</div>
                    </div>
                  )},
                  { header: 'Prev. Balance', accessor: (r) => <span className="font-medium">{formatRs(r.previousBalance)}</span> },
                  { header: 'Sales', accessor: (r) => <span className="text-blue-600 font-medium">{formatRs(r.totalSales)}</span> },
                  { header: 'Recovered', accessor: (r) => <span className="text-emerald-600 font-medium">{formatRs(r.totalPaid)}</span> },
                  { header: 'Net Balance', accessor: (r) => (
                    <span className={`font-bold ${r.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatRs(r.balance)}
                    </span>
                  )},
                  { header: 'Actions', accessor: (r) => (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedCustomer(r)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600"
                        title="View Ledger Statement"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintLedger(r, 'customer')}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-600"
                        title="Print Statement"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => { setEditingItem(r); setNewPrevBalance(r.previousBalance); }}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-amber-600"
                            title="Edit Prev Balance"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingItem(r)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-rose-600"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                ]
              : [
                  { header: 'Vendor / Supplier', accessor: (r) => (
                    <div>
                      <div className="font-semibold text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-400">{r.companyName}</div>
                    </div>
                  )},
                  { header: 'Contact', accessor: (r) => (
                    <div className="text-xs text-slate-600">
                      <div>{r.phone}</div>
                      <div className="text-slate-400">{r.city}</div>
                    </div>
                  )},
                  { header: 'Prev. Balance', accessor: (r) => <span className="font-medium">{formatRs(r.previousBalance)}</span> },
                  { header: 'Purchases', accessor: (r) => <span className="text-blue-600 font-medium">{formatRs(r.totalPurchases)}</span> },
                  { header: 'Total Paid', accessor: (r) => <span className="text-emerald-600 font-medium">{formatRs(r.totalPaid)}</span> },
                  { header: 'Net Payable', accessor: (r) => (
                    <span className={`font-bold ${r.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatRs(r.balance)}
                    </span>
                  )},
                  { header: 'Actions', accessor: (r) => (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedVendor(r)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600"
                        title="View Vendor Ledger"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPayingVendor(r)}
                        className="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <Wallet className="w-3 h-3" /> Pay
                      </button>
                      <button
                        onClick={() => handlePrintLedger(r, 'vendor')}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-600"
                        title="Print Statement"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => { setEditingItem(r); setNewPrevBalance(r.previousBalance); }}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-amber-600"
                            title="Edit Prev Balance"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingItem(r)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-rose-600"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                ]
          }
          data={activeTab === 'customers' ? customerRows : vendorRows}
        />
      </Card>

      {/* Customer Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedCustomer.name}</h2>
                <p className="text-xs text-slate-500">Customer Statement / Khata History</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Ref</th>
                  <th className="p-2 text-right">Debit</th>
                  <th className="p-2 text-right">Credit</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let runBal = 0;
                  return customerHistory.map((h, idx) => {
                    runBal += (h.debit - h.credit);
                    return (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2 text-slate-600">{h.date}</td>
                        <td className="p-2 font-medium text-slate-800">{h.type}</td>
                        <td className="p-2 text-slate-500">{h.reference}</td>
                        <td className="p-2 text-right font-medium text-slate-800">{h.debit > 0 ? formatRs(h.debit) : '-'}</td>
                        <td className="p-2 text-right font-medium text-emerald-600">{h.credit > 0 ? formatRs(h.credit) : '-'}</td>
                        <td className="p-2 text-right font-bold text-slate-900">{formatRs(runBal)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedVendor.name}</h2>
                <p className="text-xs text-slate-500">Vendor Statement / Purchase History</p>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-right">Debit</th>
                  <th className="p-2 text-right">Credit</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let runBal = 0;
                  return vendorHistory.map((h, idx) => {
                    runBal += (h.debit - h.credit);
                    return (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2 text-slate-600">{h.date}</td>
                        <td className="p-2 font-medium text-slate-800">{h.type}</td>
                        <td className="p-2 text-slate-500">{h.description}</td>
                        <td className="p-2 text-right font-medium text-slate-800">{h.debit > 0 ? formatRs(h.debit) : '-'}</td>
                        <td className="p-2 text-right font-medium text-emerald-600">{h.credit > 0 ? formatRs(h.credit) : '-'}</td>
                        <td className="p-2 text-right font-bold text-slate-900">{formatRs(runBal)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay Vendor Modal */}
      {payingVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-800">Pay Supplier / Vendor</h3>
              <button onClick={() => setPayingVendor(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmitVendorPayment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Vendor Name</label>
                <input type="text" disabled value={payingVendor.name} className="w-full mt-1 p-2 bg-slate-100 border rounded-lg text-sm text-slate-700 font-medium" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Payment Amount (Rs)</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter Amount"
                  className="w-full mt-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Notes / Remarks</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional details"
                  className="w-full mt-1 p-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingVendor(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  {isProcessingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Previous Balance Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-2">Edit Opening Balance</h3>
            <p className="text-xs text-slate-500 mb-4">{editingItem.name}</p>

            <input
              type="number"
              value={newPrevBalance}
              onChange={(e) => setNewPrevBalance(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm mb-4"
              placeholder="Enter new previous balance"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingItem(null)} className="px-3 py-1.5 border rounded-lg text-xs font-medium">Cancel</button>
              <button
                onClick={handleSavePreviousBalance}
                disabled={isSaving}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium"
              >
                {isSaving ? 'Saving...' : 'Update Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 my-2">Kya aap waqai <b>{deletingItem.name}</b> ko delete karna chahte hain?</p>

            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setDeletingItem(null)} className="px-4 py-2 border rounded-lg text-xs font-medium">Cancel</button>
              <button
                onClick={handleDeleteRecord}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-medium"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default KhataLedger;