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
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'warning', message: '' }

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
  const isVendorMatch = (record, vendorName) => {
    if (!record || !vendorName) return false;
    const v = String(vendorName).trim().toLowerCase();
    const target = String(
      record.vendorName || record.vendor || record.supplierName || record.supplier || record.name || ''
    ).trim().toLowerCase();
    return target === v || target.includes(v) || v.includes(target);
  };

  // Customer Matching helper (Fixes Client/Customer Data mismatch)
  const isCustomerMatch = (record, customerName) => {
    if (!record || !customerName) return false;
    const c = String(customerName).trim().toLowerCase();
    const target = String(
      record.customerName || record.customer || record.customer_name || record.clientName || record.client || record.name || ''
    ).trim().toLowerCase();
    return target === c || target.includes(c) || c.includes(target);
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
      
      const customerSalesList = sales.filter((s) => isCustomerMatch(s, customer.name));
      const totalSales = Math.round(
        customerSalesList.reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.totalAmount || 0), 0)
      );

      const totalPaid = Math.round(
        payments
          .filter((p) => isCustomerMatch(p, customer.name))
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      );
      const totalReturned = Math.round(
        returns
          .filter((r) => isCustomerMatch(r, customer.name))
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
          
          const customerSalesList = sales.filter((s) => isCustomerMatch(s, customer.name));
          const totalSales = Math.round(
            customerSalesList.reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.totalAmount || 0), 0)
          );

          const totalPaid = Math.round(
            payments
              .filter((payment) => isCustomerMatch(payment, customer.name))
              .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
          );
          const totalReturned = Math.round(
            returns
              .filter((returnItem) => isCustomerMatch(returnItem, customer.name))
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
      const vName = vendor.name || vendor.supplierName || vendor.vendorName || '';
      const prevBal = Math.round(Number(vendor.previousBalance || vendor.openingBalance || vendor.balance || 0));
      
      const totalPurchases = masterPurchasesList
        .filter((p) => isVendorMatch(p, vName))
        .reduce((sum, p) => sum + getPurchaseAmount(p), 0);
        
      const totalPaid = Math.round(
        masterVendorPaymentsList
          .filter((vp) => isVendorMatch(vp, vName))
          .reduce((sum, vp) => sum + Number(vp.amount || 0), 0)
      );
        
      const totalReturned = Math.round(
        vendorReturns
          .filter((vr) => isVendorMatch(vr, vName))
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
            .filter((p) => isVendorMatch(p, vName))
            .reduce((sum, p) => sum + getPurchaseAmount(p), 0);
            
          const totalPaid = Math.round(
            masterVendorPaymentsList
              .filter((vp) => isVendorMatch(vp, vName))
              .reduce((sum, vp) => sum + Number(vp.amount || 0), 0)
          );
            
          const totalReturned = Math.round(
            vendorReturns
              .filter((vr) => isVendorMatch(vr, vName))
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

  // Database Delete Record Handler (Admin Only)
  const handleDeleteRecord = async () => {
    if (!isAdmin) {
      showToast('Aapke paas is record ko remove/delete karne ki authority nahi hai!', 'warning');
      return;
    }
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const collectionName = activeTab === 'customers' ? 'customers' : 'suppliers';
      const docRef = doc(db, collectionName, deletingItem.id);
      
      await deleteDoc(docRef);
      
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
      .filter((sale) => isCustomerMatch(sale, selectedCustomer.name))
      .map((sale) => ({
        date: sale.date || new Date(sale.createdAt).toLocaleDateString('en-CA'),
        type: 'Invoice',
        reference: sale.invoiceNo || sale.billNo || '-',
        description: 'Goods Supplied on Credit Khata',
        debit: Math.round(Number(sale.netTotal || sale.netAmount || sale.grandTotal || sale.totalAmount || 0)),
        credit: 0,
      }));

    const customerPayments = payments
      .filter((payment) => isCustomerMatch(payment, selectedCustomer.name))
      .map((payment) => ({
        date: payment.date || new Date(payment.createdAt).toLocaleDateString('en-CA'),
        type: 'Recovery',
        reference: payment.receiptNo || payment.reference || '-',
        description: payment.paymentMethod ? `Cash Received via ${payment.paymentMethod}` : 'Cash Recovery Payment',
        debit: 0,
        credit: Math.round(Number(payment.amount || 0)),
      }));

    const customerReturns = returns
      .filter((returnItem) => isCustomerMatch(returnItem, selectedCustomer.name))
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

    // Filter purchases belonging to selected vendor
    const filteredPurchases = masterPurchasesList.filter((p) => isVendorMatch(p, selectedVendor.name));

    // Group purchases by Date
    const groupedPurchasesMap = {};
    filteredPurchases.forEach((p) => {
      const pDate = p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-CA') : 'Other');
      const amt = getPurchaseAmount(p); // Already rounded
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

    // Convert grouped purchases object to history array
    const groupedPurchasesList = Object.values(groupedPurchasesMap).map((grp) => ({
      date: grp.date,
      type: 'Stock Purchase',
      reference: '-',
      description: `Purchased Stock (${grp.purchaseCount} Bill(s), Total Items: ${grp.totalItems || '-'})`,
      debit: Math.round(grp.totalAmount),
      credit: 0,
    }));

    const vPayments = masterVendorPaymentsList
      .filter((vp) => isVendorMatch(vp, selectedVendor.name))
      .map((vp) => ({
        date: vp.date || (vp.createdAt ? new Date(vp.createdAt).toLocaleDateString('en-CA') : '-'),
        type: 'Vendor Payment',
        reference: vp.receiptNo || vp.reference || '-',
        description: vp.paymentMethod ? `Paid via ${vp.paymentMethod} (${vp.notes || ''})` : 'Cash Paid to Vendor',
        debit: 0,
        credit: Math.round(Number(vp.amount || 0)),
      }));

    const vReturns = vendorReturns
      .filter((vr) => isVendorMatch(vr, selectedVendor.name))
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
        const salesList = sales.filter((s) => isCustomerMatch(s, item.name))
          .map(s => ({ date: s.date || new Date(s.createdAt).toLocaleDateString('en-CA'), type: 'Invoice', reference: s.invoiceNo || '-', debit: Math.round(Number(s.netTotal || s.netAmount || s.grandTotal || 0)), credit: 0 }));
        const payList = payments.filter((p) => isCustomerMatch(p, item.name))
          .map(p => ({ date: p.date || new Date(p.createdAt).toLocaleDateString('en-CA'), type: 'Recovery', reference: p.receiptNo || '-', debit: 0, credit: Math.round(Number(p.amount || 0)) }));
        const retList = returns.filter((r) => isCustomerMatch(r, item.name))
          .map(r => ({ date: r.date || new Date(r.createdAt).toLocaleDateString('en-CA'), type: 'Return', reference: r.returnNo || '-', debit: 0, credit: Math.round(Number(r.refundAmount || 0)) }));
        
        printHistory = [...printHistory, ...salesList, ...payList, ...retList].sort((a,b) => new Date(a.date) - new Date(b.date));
      } else {
        if (item.previousBalance > 0) {
          printHistory.push({ date: '-', type: 'Opening Balance', reference: '-', debit: Math.round(item.previousBalance), credit: 0 });
        }
        
        // Group vendor purchases date-wise for clean printout
        const vPurchases = masterPurchasesList.filter((p) => isVendorMatch(p, item.name));
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

        const vPayList = masterVendorPaymentsList.filter((vp) => isVendorMatch(vp, item.name))
          .map(vp => ({ date: vp.date || new Date(vp.createdAt).toLocaleDateString('en-CA'), type: 'Payment', reference: vp.receiptNo || '-', debit: 0, credit: Math.round(Number(vp.amount || 0)) }));
        const vRetList = vendorReturns.filter((vr) => isVendorMatch(vr, item.name))
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
    a.setAttribute('download', `${isCust ? 'Customer' : 'Vendor'}_Khata_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  return (
    <PageShell title="Accounts Khata Ledger">
      <div className="space-y-6 pb-12 relative">
        
        {/* CUSTOM DARK THEME TOAST NOTIFICATION */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 transition-all duration-300 animate-slide-in">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold ${
              toast.type === 'success' 
                ? 'bg-slate-900/90 text-emerald-400 border-emerald-500/30' 
                : toast.type === 'warning'
                ? 'bg-slate-900/90 text-amber-400 border-amber-500/30'
                : 'bg-slate-900/90 text-rose-400 border-rose-500/30'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
              {toast.type === 'error' && <X className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* TOP TABS & GLOBAL ACTIONS */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-2 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setActiveTab('vendors'); setSelectedCustomer(null); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'vendors'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Vendors / Suppliers</span>
              <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-slate-950/50 text-indigo-300 border border-indigo-500/20">
                {masterVendorsList.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('customers'); setSelectedVendor(null); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'customers'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customer Debtors</span>
              <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-slate-950/50 text-indigo-300 border border-indigo-500/20">
                {customers.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleRefreshData}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/50 transition-all"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeTab === 'customers' ? (
            <>
              <Card className="bg-slate-900/40 border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Customer Arrears</p>
                    <h3 className="text-2xl font-black text-amber-400 mt-1">Rs. {formatRs(ledgerMetrics.totalOutstanding)}</h3>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
                    <Wallet className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monthly Recovery</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1">Rs. {formatRs(ledgerMetrics.totalRecoveredThisMonth)}</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Debtors</p>
                    <h3 className="text-2xl font-black text-indigo-400 mt-1">{ledgerMetrics.activeDebtorsCount} Accounts</h3>
                  </div>
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-slate-900/40 border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Vendor Payables</p>
                    <h3 className="text-2xl font-black text-rose-400 mt-1">Rs. {formatRs(vendorMetrics.totalPayable)}</h3>
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paid This Month</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1">Rs. {formatRs(vendorMetrics.totalPaidThisMonth)}</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Creditors</p>
                    <h3 className="text-2xl font-black text-indigo-400 mt-1">{vendorMetrics.activeCreditorsCount} Vendors</h3>
                  </div>
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                    <Truck className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* SEARCH AND FILTERS BAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab === 'customers' ? 'Customers' : 'Vendors'} by name, shop or phone...`}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterType === 'all'
                  ? 'bg-slate-800 border-indigo-500/50 text-indigo-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setFilterType('debtors')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterType === 'debtors'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending Balances
            </button>
            <button
              onClick={() => setFilterType('clear')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterType === 'clear'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Clear / Zero Balances
            </button>
          </div>
        </div>

        {/* MAIN DATA TABLE */}
        <Card className="bg-slate-900/40 border-slate-800 rounded-2xl overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">{activeTab === 'customers' ? 'Customer Name' : 'Vendor / Supplier'}</th>
                  <th className="py-3.5 px-4">{activeTab === 'customers' ? 'Shop Name' : 'Company Name'}</th>
                  <th className="py-3.5 px-4">Phone / City</th>
                  <th className="py-3.5 px-4 text-right">Prev Balance</th>
                  <th className="py-3.5 px-4 text-right">{activeTab === 'customers' ? 'Total Sales' : 'Total Purchases'}</th>
                  <th className="py-3.5 px-4 text-right">Total Paid</th>
                  <th className="py-3.5 px-4 text-right">Net Balance</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {(activeTab === 'customers' ? customerRows : vendorRows).length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500">
                      No {activeTab === 'customers' ? 'customer' : 'vendor'} records found.
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'customers' ? customerRows : vendorRows).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{row.name}</td>
                      <td className="py-3 px-4 text-slate-400">{row.shopName || row.companyName}</td>
                      <td className="py-3 px-4 text-slate-400">
                        <div>{row.phone}</div>
                        <div className="text-[10px] text-slate-500">{row.area || row.city}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-medium">Rs. {formatRs(row.previousBalance)}</td>
                      <td className="py-3 px-4 text-right text-indigo-400 font-medium">Rs. {formatRs(row.totalSales || row.totalPurchases)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-medium">Rs. {formatRs(row.totalPaid)}</td>
                      <td className="py-3 px-4 text-right font-black">
                        <span className={`px-2.5 py-1 rounded-lg text-xs ${
                          row.balance > 0 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          Rs. {formatRs(row.balance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Pay Vendor Button */}
                          {activeTab === 'vendors' && (
                            <button
                              onClick={() => {
                                setPayingVendor(row);
                                setPaymentAmount('');
                                setPaymentNotes('');
                              }}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all"
                              title="Pay Supplier"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View Statement Button */}
                          <button
                            onClick={() => {
                              if (activeTab === 'customers') setSelectedCustomer(row);
                              else setSelectedVendor(row);
                            }}
                            className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg transition-all"
                            title="View Statement"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Ledger Button */}
                          <button
                            onClick={() => handlePrintLedger(row, activeTab === 'customers' ? 'customer' : 'vendor')}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"
                            title="Print Ledger"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Prev Balance (Admin) */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingItem(row);
                                setNewPrevBalance(row.previousBalance);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all"
                              title="Edit Previous Balance"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Record (Admin) */}
                          {isAdmin && (
                            <button
                              onClick={() => setDeletingItem(row)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-all"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* MODAL: CUSTOMER STATEMENT DETAIL */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
              <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-400" />
                    <span>Customer Statement: {selectedCustomer.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedCustomer.shopName} | Phone: {selectedCustomer.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintLedger(selectedCustomer, 'customer')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Statement</span>
                  </button>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference No</th>
                      <th className="py-2.5 px-3 text-right">Debit (Sales)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(() => {
                      let runningBal = 0;
                      return customerHistory.map((item, idx) => {
                        runningBal += (item.debit - item.credit);
                        return (
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="py-2.5 px-3 text-slate-400">{item.date}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{item.type}</td>
                            <td className="py-2.5 px-3 text-slate-400">{item.reference}</td>
                            <td className="py-2.5 px-3 text-right text-rose-400">{item.debit > 0 ? `Rs. ${formatRs(item.debit)}` : '-'}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-400">{item.credit > 0 ? `Rs. ${formatRs(item.credit)}` : '-'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-400">Rs. {formatRs(runningBal)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: VENDOR STATEMENT DETAIL */}
        {selectedVendor && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
              <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-400" />
                    <span>Vendor Statement: {selectedVendor.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedVendor.companyName} | Phone: {selectedVendor.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintLedger(selectedVendor, 'vendor')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Statement</span>
                  </button>
                  <button
                    onClick={() => setSelectedVendor(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit (Purchases)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Payments)</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(() => {
                      let runningBal = 0;
                      return vendorHistory.map((item, idx) => {
                        runningBal += (item.debit - item.credit);
                        return (
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="py-2.5 px-3 text-slate-400">{item.date}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{item.type}</td>
                            <td className="py-2.5 px-3 text-slate-400">{item.description}</td>
                            <td className="py-2.5 px-3 text-right text-indigo-400">{item.debit > 0 ? `Rs. ${formatRs(item.debit)}` : '-'}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-400">{item.credit > 0 ? `Rs. ${formatRs(item.credit)}` : '-'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-400">Rs. {formatRs(runningBal)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PAY VENDOR */}
        {payingVendor && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Pay Supplier: {payingVendor.name}</span>
                </h3>
                <button
                  onClick={() => setPayingVendor(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitVendorPayment} className="p-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Current Balance Due
                  </label>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-lg font-black text-amber-400">
                    Rs. {formatRs(payingVendor.balance)}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Payment Amount (Rs.)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount to pay..."
                    required
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Easypaisa / JazzCash">Easypaisa / JazzCash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Notes / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g., Paid via Meezan Bank..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayingVendor(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT PREVIOUS BALANCE */}
        {editingItem && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-white">Edit Opening/Prev Balance</h3>
                <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-2">Adjust previous balance for <strong className="text-white">{editingItem.name}</strong>:</p>
                <input
                  type="number"
                  value={newPrevBalance}
                  onChange={(e) => setNewPrevBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Enter previous balance"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingItem(null)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">
                  Cancel
                </button>
                <button onClick={handleSavePreviousBalance} disabled={isSaving} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold">
                  {isSaving ? 'Saving...' : 'Save Balance'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DELETE RECORD */}
        {deletingItem && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-xs font-bold text-white">Delete Ledger Account</h3>
              </div>

              <p className="text-xs text-slate-300">
                Kya aap waqai <strong className="text-white">{deletingItem.name}</strong> ko delete karna chahte hain? Yeh action revert nahi ho sakta.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDeletingItem(null)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">
                  Cancel
                </button>
                <button onClick={handleDeleteRecord} disabled={isDeleting} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold">
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
};

export default KhataLedger;