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

  // Submit Vendor Payment
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
    <PageShell title="Khata Ledger Management">
      {/* Toast Notification Container */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderLeft: toast.type === 'error' ? '4px solid #ef4444' : toast.type === 'warning' ? '4px solid #f59e0b' : '4px solid #10b981'
        }}>
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{toast.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="p-4 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`py-3 px-6 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'vendors'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            Vendor / Supplier Khata
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-3 px-6 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'customers'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Customer / Client Khata
          </button>
        </div>

        {/* Analytics Top Cards */}
        {activeTab === 'customers' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-amber-500 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">Total Arrears / Outstanding</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{formatRs(ledgerMetrics.totalOutstanding)}</div>
            </Card>
            <Card className="p-4 border-l-4 border-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">Recovered This Month</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatRs(ledgerMetrics.totalRecoveredThisMonth)}</div>
            </Card>
            <Card className="p-4 border-l-4 border-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">Active Debtors</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{ledgerMetrics.activeDebtorsCount}</div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-rose-500 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">Total Vendor Payable</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatRs(vendorMetrics.totalPayable)}</div>
            </Card>
            <Card className="p-4 border-l-4 border-blue-500 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">Paid to Suppliers This Month</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatRs(vendorMetrics.totalPaidThisMonth)}</div>
            </Card>
            <Card className="p-4 border-l-4 border-purple-500 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">Active Suppliers/Creditors</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{vendorMetrics.activeCreditorsCount}</div>
            </Card>
          </div>
        )}

        {/* Search & Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'customers' ? 'customer or shop...' : 'vendor or company...'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Accounts</option>
              <option value="debtors">Active Balances (&gt; 0)</option>
              <option value="clear">Cleared / Zero Balance</option>
            </select>

            <button
              onClick={handleRefreshData}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table Rendering */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">{activeTab === 'customers' ? 'Customer Name' : 'Vendor Name'}</th>
                  <th className="p-3">{activeTab === 'customers' ? 'Shop / Company' : 'Brand / Company'}</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3 text-right">Prev Balance</th>
                  <th className="p-3 text-right">{activeTab === 'customers' ? 'Total Sales' : 'Total Purchases'}</th>
                  <th className="p-3 text-right">Total Paid</th>
                  <th className="p-3 text-right">Current Balance</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(activeTab === 'customers' ? customerRows : vendorRows).length > 0 ? (
                  (activeTab === 'customers' ? customerRows : vendorRows).map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-3 text-gray-400 dark:text-gray-500 text-xs">{idx + 1}</td>
                      <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{row.name}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-300">{row.shopName || row.companyName}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-300">{row.phone}</td>
                      <td className="p-3 text-right font-medium text-gray-500 dark:text-gray-400">{formatRs(row.previousBalance)}</td>
                      <td className="p-3 text-right text-gray-700 dark:text-gray-200">{formatRs(row.totalSales || row.totalPurchases)}</td>
                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatRs(row.totalPaid)}</td>
                      <td className="p-3 text-right font-bold text-amber-700 dark:text-amber-400">{formatRs(row.balance)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => activeTab === 'customers' ? setSelectedCustomer(row) : setSelectedVendor(row)}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            title="View Statement"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {activeTab === 'vendors' && (
                            <button
                              onClick={() => setPayingVendor(row)}
                              className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                              title="Pay Supplier"
                            >
                              <Wallet className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handlePrintLedger(row, activeTab === 'customers' ? 'customer' : 'vendor')}
                            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Print Ledger"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingItem(row);
                                  setNewPrevBalance(row.previousBalance);
                                }}
                                className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
                                title="Edit Opening Balance"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeletingItem(row)}
                                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-gray-400 dark:text-gray-500">
                      No ledger accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* MODAL: CUSTOMER / VENDOR STATEMENT */}
      {(selectedCustomer || selectedVendor) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-t-lg">
              <div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                  {selectedCustomer ? `Customer Statement: ${selectedCustomer.name}` : `Vendor Statement: ${selectedVendor.name}`}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Complete Debit / Credit Ledger History</p>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedVendor(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Ref / Doc No.</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Debit</th>
                    <th className="p-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(selectedCustomer ? customerHistory : vendorHistory).map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-2 text-gray-500 dark:text-gray-400">{h.date}</td>
                      <td className="p-2 font-medium">{h.type}</td>
                      <td className="p-2 text-gray-600 dark:text-gray-300">{h.reference}</td>
                      <td className="p-2 text-gray-500 dark:text-gray-400">{h.description}</td>
                      <td className="p-2 text-right text-gray-700 dark:text-gray-200 font-medium">{h.debit > 0 ? formatRs(h.debit) : '-'}</td>
                      <td className="p-2 text-right text-emerald-600 dark:text-emerald-400 font-medium">{h.credit > 0 ? formatRs(h.credit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center rounded-b-lg">
              <div className="text-sm font-bold text-amber-800 dark:text-amber-400">
                Current Net Balance: {formatRs(selectedCustomer ? selectedCustomer.balance : selectedVendor.balance)}
              </div>
              <button
                onClick={() => handlePrintLedger(selectedCustomer || selectedVendor, selectedCustomer ? 'customer' : 'vendor')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
              >
                <Printer className="w-4 h-4" /> Print Full Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PREVIOUS BALANCE */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg w-full max-w-md p-6 shadow-xl space-y-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">Edit Opening / Previous Balance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Update starting balance for {editingItem.name}.</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Previous Balance (Rs.)</label>
              <input
                type="number"
                value={newPrevBalance}
                onChange={(e) => setNewPrevBalance(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreviousBalance}
                disabled={isSaving}
                className="px-4 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE RECORD CONFIRMATION */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg w-full max-w-md p-6 shadow-xl space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Are you sure you want to delete <strong>{deletingItem.name}</strong> from database? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                disabled={isDeleting}
                className="px-4 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VENDOR PAYMENT */}
      {payingVendor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmitVendorPayment} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg w-full max-w-md p-6 shadow-xl space-y-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">Pay Supplier: {payingVendor.name}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount to Pay (Rs.)</label>
              <input
                type="number"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes / Remarks</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Ledger Payment"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingVendor(null)}
                className="px-4 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="px-4 py-2 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                {isProcessingPayment ? 'Processing...' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageShell>
  );
};

export default KhataLedger;