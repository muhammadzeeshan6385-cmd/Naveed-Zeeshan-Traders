import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs, getCreditSalesTotal } from './utils/helpers';

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
  UserCheck, 
  AlertCircle, 
  FileText,
  Edit2,
  Trash2,
  Users,
  Truck,
  Wallet,
  CheckCircle2,
  CreditCard,
  Check
} from 'lucide-react';

// --- UNIQUE TRANSACTION CODE GENERATOR HELPER ---
const generateTransactionCode = (prefix = 'TXN') => {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const randomHash = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${dateStr}-${randomHash}`;
};

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
  appLogoUrl = '/logo.png' // Pass custom logo URL or fallback path here
}) => {
  // --- DIRECT FIREBASE FETCH FALLBACK STATES ---
  const [fetchedSuppliers, setFetchedSuppliers] = useState([]);
  const [fetchedPurchases, setFetchedPurchases] = useState([]);
  const [fetchedVendorPayments, setFetchedVendorPayments] = useState([]);

  useEffect(() => {
    const fetchDirectData = async () => {
      try {
        if (vendors.length === 0 && suppliers.length === 0) {
          const supSnap = await getDocs(collection(db, 'suppliers'));
          const loadedSuppliers = supSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFetchedSuppliers(loadedSuppliers);
        }

        if (purchases.length === 0) {
          const purSnap = await getDocs(collection(db, 'purchases'));
          const loadedPurchases = purSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFetchedPurchases(loadedPurchases);
        }

        if (vendorPayments.length === 0) {
          const vpaySnap = await getDocs(collection(db, 'vendorPayments'));
          const loadedVPay = vpaySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFetchedVendorPayments(loadedVPay);
        }
      } catch (err) {
        console.error("Firebase Auto-fetch Ledger Error:", err);
      }
    };

    fetchDirectData();
  }, [vendors, suppliers, purchases, vendorPayments]);

  // Master Lists Setup
  const masterVendorsList = useMemo(() => {
    if (vendors.length > 0) return vendors;
    if (suppliers.length > 0) return suppliers;
    return fetchedSuppliers;
  }, [vendors, suppliers, fetchedSuppliers]);

  const masterPurchasesList = useMemo(() => {
    return purchases.length > 0 ? purchases : fetchedPurchases;
  }, [purchases, fetchedPurchases]);

  const masterVendorPaymentsList = useMemo(() => {
    return vendorPayments.length > 0 ? vendorPayments : fetchedVendorPayments;
  }, [vendorPayments, fetchedVendorPayments]);

  // Active Tab & Selection States
  const [activeTab, setActiveTab] = useState('vendors');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Database Update & Delete States
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

  // Custom Dark Toast / Alert State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const isAdmin = useMemo(() => {
    return String(currentRole || '').trim().toLowerCase() === 'admin';
  }, [currentRole]);

  // Helper function to extract purchase amount reliably with Math.round (.5 rule)
  const getPurchaseAmount = (p) => {
    const rawAmt = Number(p.grandTotal || p.netTotal || p.totalAmount || p.total || p.amount || p.billAmount || 0);
    return Math.round(rawAmt);
  };

  // Vendor Matching helper
  const isVendorMatch = (record, vendorObj) => {
    if (!record || !vendorObj) return false;
    
    // Check ID match first if available
    const vId = String(vendorObj.id || '').trim();
    const rVendorId = String(record.vendorId || record.supplierId || record.vendor_id || '').trim();
    if (vId && rVendorId && vId === rVendorId) return true;

    // Strict name match
    const vName = String(vendorObj.name || vendorObj.supplierName || vendorObj.vendorName || '').trim().toLowerCase();
    const target = String(
      record.vendorName || record.vendor || record.supplierName || record.supplier || record.name || ''
    ).trim().toLowerCase();
    
    return vName !== '' && target === vName;
  };

  // Customer Matching helper
  const isCustomerMatch = (record, customerObj) => {
    if (!record || !customerObj) return false;

    // Check by ID match first
    const cId = String(customerObj.id || '').trim();
    const rCustId = String(record.customerId || record.client_id || record.clientId || record.customer_id || '').trim();
    if (cId && rCustId && cId === rCustId) return true;

    // String Exact Name match
    const custName = typeof customerObj === 'string' ? customerObj : (customerObj.name || '');
    const c = String(custName).trim().toLowerCase();
    const target = String(
      record.customerName || record.customer || record.customer_name || record.clientName || record.client || ''
    ).trim().toLowerCase();

    return c !== '' && target === c;
  };

  // ==========================================
  // 1. CUSTOMER ANALYTICS & ROWS
  // ==========================================
  const ledgerMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let totalRecoveredThisMonth = 0;
    let activeDebtorsCount = 0;

    customers.forEach((customer) => {
      const prevBal = Math.round(Number(customer.previousBalance || customer.openingBalance || customer.balance || 0));
      
      const customerSalesList = sales.filter((s) => isCustomerMatch(s, customer));
      const totalSales = Math.round(
        customerSalesList.reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.totalAmount || 0), 0)
      );

      const totalPaid = Math.round(
        payments
          .filter((p) => isCustomerMatch(p, customer))
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      );
      const totalReturned = Math.round(
        returns
          .filter((r) => isCustomerMatch(r, customer))
          .reduce((sum, r) => sum + Number(r.refundAmount || r.netTotal || 0), 0)
      );
      
      const balance = prevBal + totalSales - totalPaid - totalReturned;

      if (balance > 0) {
        totalOutstanding += balance;
        activeDebtorsCount += 1;
      }
    });

    payments.forEach((p) => {
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
      customers
        .map((customer) => {
          const prevBal = Math.round(Number(customer.previousBalance || customer.openingBalance || customer.balance || 0));
          
          const customerSalesList = sales.filter((s) => isCustomerMatch(s, customer));
          const totalSales = Math.round(
            customerSalesList.reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.totalAmount || 0), 0)
          );

          const totalPaid = Math.round(
            payments
              .filter((payment) => isCustomerMatch(payment, customer))
              .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
          );
          const totalReturned = Math.round(
            returns
              .filter((returnItem) => isCustomerMatch(returnItem, customer))
              .reduce((sum, returnItem) => sum + Number(returnItem.refundAmount || returnItem.netTotal || 0), 0)
          );
          
          const balance = prevBal + totalSales - totalPaid - totalReturned;

          return {
            id: customer.id,
            name: customer.name,
            shopName: customer.shopName || customer.companyName || '-',
            phone: customer.phone || customer.mobile || customer.contact || '-',
            area: customer.area || customer.city || 'Mailsi',
            previousBalance: prevBal,
            totalSales,
            totalPaid,
            totalReturned,
            balance,
            status: balance > 50000 ? 'High Risk' : balance > 0 ? 'Active' : 'Clear',
            original: customer
          };
        })
        .filter((row) => {
          const matchesSearch = 
            row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.phone.includes(searchTerm);
            
          if (filterType === 'all') return matchesSearch;
          if (filterType === 'debtors') return matchesSearch && row.balance > 0;
          if (filterType === 'clear') return matchesSearch && row.balance <= 0;
          return matchesSearch;
        }),
    [customers, sales, payments, returns, searchTerm, filterType]
  );

  // ==========================================
  // 2. VENDOR / SUPPLIER ANALYTICS & ROWS
  // ==========================================
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
        vendorReturns
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
            vendorReturns
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
            original: vendor
          };
        })
        .filter((row) => {
          const matchesSearch = 
            row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.phone.includes(searchTerm);
            
          if (filterType === 'all') return matchesSearch;
          if (filterType === 'debtors') return matchesSearch && row.balance > 0;
          if (filterType === 'clear') return matchesSearch && row.balance <= 0;
          return matchesSearch;
        }),
    [masterVendorsList, masterPurchasesList, masterVendorPaymentsList, vendorReturns, searchTerm, filterType]
  );

  // Database Previous Balance Save
  const handleSavePreviousBalance = async () => {
    if (!isAdmin) {
      showToast('Aapke paas is record ko change karne ki authority nahi hai!', 'warning');
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
      
      showToast('Previous Balance successfully updated!', 'success');
      setEditingItem(null);
    } catch (error) {
      console.error("Firebase Error: ", error);
      showToast('Firebase database update failed!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Database Delete Record Handler
  const handleDeleteRecord = async () => {
    if (!isAdmin) {
      showToast('Aapke paas is record ko remove/delete karne ki authority nahi hai!', 'warning');
      return;
    }
    if (!deletingItem || !deletingItem.id) return;
    setIsDeleting(true);
    try {
      const primaryCollection = activeTab === 'customers' ? 'customers' : 'suppliers';
      
      try {
        await deleteDoc(doc(db, primaryCollection, deletingItem.id));
      } catch (e) {
        if (activeTab === 'vendors') {
          await deleteDoc(doc(db, 'vendors', deletingItem.id));
        } else {
          throw e;
        }
      }
      
      showToast(`${activeTab === 'customers' ? 'Customer' : 'Vendor'} record successfully deleted!`, 'success');
      setDeletingItem(null);
    } catch (error) {
      console.error("Firebase Delete Error: ", error);
      showToast('Record delete karte waqt error aaya! Internet check karein.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit Vendor Payment (WITH UNIQUE TRANSACTION CODES)
  const handleSubmitVendorPayment = async (e) => {
    e.preventDefault();
    const payAmt = Math.round(Number(paymentAmount));
    
    if (!payingVendor || payAmt <= 0) {
      showToast('Meharbani karke valid payment amount dakhil karein!', 'warning');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const txnCode = generateTransactionCode('TXN');
      const vpayCode = generateTransactionCode('VP');
      
      const paymentRef = await addDoc(collection(db, 'vendorPayments'), {
        transactionCode: vpayCode,
        vendor: payingVendor.name,
        vendorId: payingVendor.id,
        amount: payAmt,
        paymentMethod: paymentMethod,
        notes: paymentNotes || 'Supplier Paid from Ledger',
        date: todayStr,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'transactions'), {
        transactionCode: txnCode,
        type: 'Expense / Vendor Payment',
        category: 'Vendor Payment',
        amount: payAmt,
        description: `Paid to Supplier: ${payingVendor.name} (${paymentNotes || 'Ledger Payment'})`,
        paymentMethod: paymentMethod,
        vendorName: payingVendor.name,
        vendorId: payingVendor.id,
        paymentId: paymentRef.id,
        date: todayStr,
        createdAt: serverTimestamp()
      });

      showToast(`Rs. ${payAmt} Supplier (${payingVendor.name}) ko pay kar diye gaye hain!`, 'success');
      
      if (onPaymentSuccess) onPaymentSuccess();
      setPayingVendor(null);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (err) {
      console.error("Payment Submission Error: ", err);
      showToast('Payment save karte waqt error aaya!', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // --- CUSTOMER HISTORY STATEMENT ---
  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    const historyArray = [];

    if (selectedCustomer.previousBalance > 0) {
      historyArray.push({
        date: '-',
        type: 'Opening Balance',
        reference: '-',
        transactionCode: '-',
        description: 'Previous Ledger Opening Balance',
        debit: Math.round(selectedCustomer.previousBalance),
        credit: 0,
      });
    }

    const customerSales = sales
      .filter((sale) => isCustomerMatch(sale, selectedCustomer.original || selectedCustomer))
      .map((sale) => ({
        date: sale.date || new Date(sale.createdAt).toLocaleDateString('en-CA'),
        type: 'Invoice',
        reference: sale.invoiceNo || sale.billNo || '-',
        transactionCode: sale.transactionCode || sale.id || '-',
        description: 'Goods Supplied on Credit Khata',
        debit: Math.round(Number(sale.netTotal || sale.netAmount || sale.grandTotal || sale.totalAmount || 0)),
        credit: 0,
      }));

    const customerPayments = payments
      .filter((payment) => isCustomerMatch(payment, selectedCustomer.original || selectedCustomer))
      .map((payment) => ({
        date: payment.date || new Date(payment.createdAt).toLocaleDateString('en-CA'),
        type: 'Recovery',
        reference: payment.receiptNo || payment.reference || '-',
        transactionCode: payment.transactionCode || payment.id || '-',
        description: payment.paymentMethod ? `Cash Received via ${payment.paymentMethod}` : 'Cash Recovery Payment',
        debit: 0,
        credit: Math.round(Number(payment.amount || 0)),
      }));

    const customerReturns = returns
      .filter((returnItem) => isCustomerMatch(returnItem, selectedCustomer.original || selectedCustomer))
      .map((returnItem) => ({
        date: returnItem.date || new Date(returnItem.createdAt).toLocaleDateString('en-CA'),
        type: 'Return',
        reference: returnItem.returnNo || '-',
        transactionCode: returnItem.transactionCode || returnItem.id || '-',
        description: 'Product Returned (Credit Adjustment)',
        debit: 0,
        credit: Math.round(Number(returnItem.refundAmount || returnItem.netTotal || 0)),
      }));

    return [...historyArray, ...customerSales, ...customerPayments, ...customerReturns].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [selectedCustomer, sales, payments, returns]);

  // --- VENDOR HISTORY STATEMENT ---
  const vendorHistory = useMemo(() => {
    if (!selectedVendor) return [];
    const historyArray = [];

    if (selectedVendor.previousBalance > 0) {
      historyArray.push({
        date: '-',
        type: 'Opening Balance',
        reference: '-',
        transactionCode: '-',
        description: 'Previous Ledger Opening Balance',
        debit: Math.round(selectedVendor.previousBalance),
        credit: 0,
      });
    }

    const filteredPurchases = masterPurchasesList.filter((p) => isVendorMatch(p, selectedVendor.original || selectedVendor));

    const groupedPurchasesMap = {};
    filteredPurchases.forEach((p) => {
      const pDate = p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-CA') : 'Other');
      const amt = getPurchaseAmount(p);
      let itemCnt = 0;
      if (Array.isArray(p.items)) itemCnt = p.items.length;
      else if (p.totalItems) itemCnt = Number(p.totalItems);

      if (!groupedPurchasesMap[pDate]) {
        groupedPurchasesMap[pDate] = {
          date: pDate,
          totalAmount: 0,
          purchaseCount: 0,
          totalItems: 0,
          code: p.transactionCode || p.id || '-'
        };
      }
      groupedPurchasesMap[pDate].totalAmount += amt;
      groupedPurchasesMap[pDate].purchaseCount += 1;
      groupedPurchasesMap[pDate].totalItems += itemCnt;
    });

    const groupedPurchasesList = Object.values(groupedPurchasesMap).map((grp) => ({
      date: grp.date,
      type: 'Stock Purchase',
      reference: '-',
      transactionCode: grp.code,
      description: `Purchased Stock (${grp.purchaseCount} Bill(s), Total Items: ${grp.totalItems || '-'})`,
      debit: Math.round(grp.totalAmount),
      credit: 0,
    }));

    const vPayments = masterVendorPaymentsList
      .filter((vp) => isVendorMatch(vp, selectedVendor.original || selectedVendor))
      .map((vp) => ({
        date: vp.date || (vp.createdAt ? new Date(vp.createdAt).toLocaleDateString('en-CA') : '-'),
        type: 'Vendor Payment',
        reference: vp.receiptNo || vp.reference || '-',
        transactionCode: vp.transactionCode || vp.id || '-',
        description: vp.paymentMethod ? `Paid via ${vp.paymentMethod} (${vp.notes || ''})` : 'Cash Paid to Vendor',
        debit: 0,
        credit: Math.round(Number(vp.amount || 0)),
      }));

    const vReturns = vendorReturns
      .filter((vr) => isVendorMatch(vr, selectedVendor.original || selectedVendor))
      .map((vr) => ({
        date: vr.date || (vr.createdAt ? new Date(vr.createdAt).toLocaleDateString('en-CA') : '-'),
        type: 'Purchase Return',
        reference: vr.returnNo || '-',
        transactionCode: vr.transactionCode || vr.id || '-',
        description: 'Stock Returned to Supplier',
        debit: 0,
        credit: Math.round(Number(vr.refundAmount || vr.total || 0)),
      }));

    return [...historyArray, ...groupedPurchasesList, ...vPayments, ...vReturns].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [selectedVendor, masterPurchasesList, masterVendorPaymentsList, vendorReturns]);

  // --- PRINT LEDGER STATEMENT ---
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
        const salesList = sales.filter((s) => isCustomerMatch(s, item.original || item))
          .map(s => ({ date: s.date || new Date(s.createdAt).toLocaleDateString('en-CA'), type: 'Invoice', reference: s.invoiceNo || '-', debit: Math.round(Number(s.netTotal || s.netAmount || s.grandTotal || 0)), credit: 0 }));
        const payList = payments.filter((p) => isCustomerMatch(p, item.original || item))
          .map(p => ({ date: p.date || new Date(p.createdAt).toLocaleDateString('en-CA'), type: 'Recovery', reference: p.receiptNo || '-', debit: 0, credit: Math.round(Number(p.amount || 0)) }));
        const retList = returns.filter((r) => isCustomerMatch(r, item.original || item))
          .map(r => ({ date: r.date || new Date(r.createdAt).toLocaleDateString('en-CA'), type: 'Return', reference: r.returnNo || '-', debit: 0, credit: Math.round(Number(r.refundAmount || 0)) }));
        
        printHistory = [...printHistory, ...salesList, ...payList, ...retList].sort((a,b) => new Date(a.date) - new Date(b.date));
      } else {
        if (item.previousBalance > 0) {
          printHistory.push({ date: '-', type: 'Opening Balance', reference: '-', debit: Math.round(item.previousBalance), credit: 0 });
        }
        
        const vPurchases = masterPurchasesList.filter((p) => isVendorMatch(p, item.original || item));
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

        const vPayList = masterVendorPaymentsList.filter((vp) => isVendorMatch(vp, item.original || item))
          .map(vp => ({ date: vp.date || new Date(vp.createdAt).toLocaleDateString('en-CA'), type: 'Payment', reference: vp.receiptNo || '-', debit: 0, credit: Math.round(Number(vp.amount || 0)) }));
        const vRetList = vendorReturns.filter((vr) => isVendorMatch(vr, item.original || item))
          .map(vr => ({ date: vr.date || new Date(vr.createdAt).toLocaleDateString('en-CA'), type: 'Purchase Return', reference: vr.returnNo || '-', debit: 0, credit: Math.round(Number(vr.refundAmount || 0)) }));
        
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
      ? ['Customer Name', 'Shop Name', 'Previous Balance', 'Total Sales', 'Total Paid', 'Total Returned', 'Net Balance']
      : ['Vendor Name', 'Company Name', 'Previous Balance', 'Total Purchases', 'Total Paid', 'Total Returned', 'Net Balance'];

    const csvData = activeRows.map(row => [
      `"${row.name}"`,
      `"${row.shopName || row.companyName || ''}"`,
      row.previousBalance,
      isCust ? row.totalSales : row.totalPurchases,
      row.totalPaid,
      row.totalReturned,
      row.balance
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...csvData.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_ledger_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageShell title="Khata Ledger & Financial Accounts">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-xl text-white font-medium flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => { setActiveTab('vendors'); setSelectedVendor(null); setSelectedCustomer(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'vendors' 
                ? 'bg-amber-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            Vendor / Suppliers Ledger
          </button>
          <button
            onClick={() => { setActiveTab('customers'); setSelectedCustomer(null); setSelectedVendor(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'customers' 
                ? 'bg-amber-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Customer Khata Ledger
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleRefreshData}
            className={`p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh Ledger Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table & Master List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 bg-slate-900 border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'customers' ? 'Customers' : 'Suppliers'} by name or phone...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-2 text-xs rounded-lg font-medium border ${
                    filterType === 'all' ? 'bg-slate-800 border-amber-500 text-amber-400' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('debtors')}
                  className={`px-3 py-2 text-xs rounded-lg font-medium border ${
                    filterType === 'debtors' ? 'bg-slate-800 border-amber-500 text-amber-400' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Payable/Receivable Only
                </button>
              </div>
            </div>

            {/* Render List Rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Name & Info</th>
                    <th className="p-3 text-right">Prev Balance</th>
                    <th className="p-3 text-right">{activeTab === 'customers' ? 'Sales' : 'Purchases'}</th>
                    <th className="p-3 text-right">Paid/Recovered</th>
                    <th className="p-3 text-right">Net Balance</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(activeTab === 'customers' ? customerRows : vendorRows).map((row) => (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-slate-800/50 transition cursor-pointer ${
                        (selectedCustomer?.id === row.id || selectedVendor?.id === row.id) ? 'bg-slate-800/80 border-l-2 border-amber-500' : ''
                      }`}
                      onClick={() => {
                        if (activeTab === 'customers') setSelectedCustomer(row);
                        else setSelectedVendor(row);
                      }}
                    >
                      <td className="p-3">
                        <div className="font-semibold text-slate-100">{row.name}</div>
                        <div className="text-xs text-slate-500">{row.shopName || row.companyName} • {row.phone}</div>
                      </td>
                      <td className="p-3 text-right text-slate-400">{formatRs(row.previousBalance)}</td>
                      <td className="p-3 text-right text-slate-300">
                        {formatRs(activeTab === 'customers' ? row.totalSales : row.totalPurchases)}
                      </td>
                      <td className="p-3 text-right text-emerald-400">{formatRs(row.totalPaid)}</td>
                      <td className="p-3 text-right font-bold text-amber-400">{formatRs(row.balance)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handlePrintLedger(row, activeTab === 'customers' ? 'customer' : 'vendor')}
                            className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800"
                            title="Print Ledger"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {activeTab === 'vendors' && (
                            <button
                              onClick={() => setPayingVendor(row)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800"
                              title="Pay Vendor"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => { setEditingItem(row); setNewPrevBalance(row.previousBalance); }}
                              className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800"
                              title="Edit Opening Balance"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Selected Details / Statement Sidebar */}
        <div className="space-y-4">
          {(selectedCustomer || selectedVendor) ? (
            <Card className="p-4 bg-slate-900 border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                <div>
                  <h3 className="font-bold text-slate-100">{selectedCustomer?.name || selectedVendor?.name}</h3>
                  <p className="text-xs text-slate-400">Transaction History Statement</p>
                </div>
                <button
                  onClick={() => handlePrintLedger(
                    selectedCustomer || selectedVendor, 
                    selectedCustomer ? 'customer' : 'vendor'
                  )}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {(selectedCustomer ? customerHistory : vendorHistory).map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-200">{item.type}</div>
                      <div className="text-slate-500">{item.date} • Ref: {item.reference}</div>
                      {item.transactionCode && item.transactionCode !== '-' && (
                        <div className="text-[10px] text-amber-500/80 font-mono">Code: {item.transactionCode}</div>
                      )}
                    </div>
                    <div className="text-right">
                      {item.debit > 0 && <div className="text-amber-400 font-medium">+ {formatRs(item.debit)}</div>}
                      {item.credit > 0 && <div className="text-emerald-400 font-medium">- {formatRs(item.credit)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 bg-slate-900 border-slate-800 text-center text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Select a customer or supplier to view complete statement history.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Pay Vendor Modal */}
      {payingVendor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100">Pay Supplier: {payingVendor.name}</h3>
              <button onClick={() => setPayingVendor(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitVendorPayment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Payment Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-amber-500"
                  placeholder="e.g. 50000"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-amber-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Notes / Remarks</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-amber-500"
                  placeholder="Optional details"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition"
              >
                {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Previous Balance Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-100">Edit Opening Balance</h3>
            <div>
              <label className="text-xs text-slate-400">Previous Balance Amount</label>
              <input
                type="number"
                value={newPrevBalance}
                onChange={(e) => setNewPrevBalance(e.target.value)}
                className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:border-amber-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreviousBalance}
                disabled={isSaving}
                className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-sm"
              >
                {isSaving ? 'Saving...' : 'Save Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default KhataLedger;