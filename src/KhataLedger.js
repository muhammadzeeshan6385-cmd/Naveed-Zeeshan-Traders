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
  FileText,
  Edit2,
  Trash2,
  Users,
  Truck,
  Wallet,
  CheckCircle2,
  CreditCard
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

  // Custom Alert State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const isAdmin = useMemo(() => {
    return String(currentRole || '').trim().toLowerCase() === 'admin';
  }, [currentRole]);

  // Purchase Amount Calculation
  const getPurchaseAmount = (p) => {
    const rawAmt = Number(p.grandTotal || p.netTotal || p.totalAmount || p.total || p.amount || p.billAmount || 0);
    return Math.round(rawAmt);
  };

  // Vendor Matcher
  const isVendorMatch = (record, vendorObj) => {
    if (!record || !vendorObj) return false;
    const vId = String(vendorObj.id || '').trim();
    const rVendorId = String(record.vendorId || record.supplierId || record.vendor_id || '').trim();
    if (vId && rVendorId && vId === rVendorId) return true;

    const vName = String(vendorObj.name || vendorObj.supplierName || vendorObj.vendorName || '').trim().toLowerCase();
    const target = String(record.vendorName || record.vendor || record.supplierName || record.supplier || record.name || '').trim().toLowerCase();
    
    return vName !== '' && target === vName;
  };

  // Customer Matcher
  const isCustomerMatch = (record, customerObj) => {
    if (!record || !customerObj) return false;
    const cId = String(customerObj.id || '').trim();
    const rCustId = String(record.customerId || record.client_id || record.clientId || record.customer_id || '').trim();
    if (cId && rCustId && cId === rCustId) return true;

    const custName = typeof customerObj === 'string' ? customerObj : (customerObj.name || '');
    const c = String(custName).trim().toLowerCase();
    const target = String(record.customerName || record.customer || record.customer_name || record.clientName || record.client || '').trim().toLowerCase();

    return c !== '' && target === c;
  };

  // Customer Metrics & Rows
  const ledgerMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let totalRecoveredThisMonth = 0;
    let activeDebtorsCount = 0;

    customers.forEach((customer) => {
      const prevBal = Math.round(Number(customer.previousBalance || customer.openingBalance || customer.balance || 0));
      const customerSalesList = sales.filter((s) => isCustomerMatch(s, customer));
      const totalSales = Math.round(customerSalesList.reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.totalAmount || 0), 0));
      const totalPaid = Math.round(payments.filter((p) => isCustomerMatch(p, customer)).reduce((sum, p) => sum + Number(p.amount || 0), 0));
      const totalReturned = Math.round(returns.filter((r) => isCustomerMatch(r, customer)).reduce((sum, r) => sum + Number(r.refundAmount || r.netTotal || 0), 0));
      
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

  const customerRows = useMemo(() =>
    customers
      .map((customer) => {
        const prevBal = Math.round(Number(customer.previousBalance || customer.openingBalance || customer.balance || 0));
        const customerSalesList = sales.filter((s) => isCustomerMatch(s, customer));
        const totalSales = Math.round(customerSalesList.reduce((sum, s) => sum + Number(s.netTotal || s.netAmount || s.grandTotal || s.totalAmount || 0), 0));
        const totalPaid = Math.round(payments.filter((payment) => isCustomerMatch(payment, customer)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
        const totalReturned = Math.round(returns.filter((returnItem) => isCustomerMatch(returnItem, customer)).reduce((sum, returnItem) => sum + Number(returnItem.refundAmount || returnItem.netTotal || 0), 0));
        
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

  // Vendor Metrics & Rows
  const vendorMetrics = useMemo(() => {
    let totalPayable = 0;
    let totalPaidThisMonth = 0;
    let activeCreditorsCount = 0;

    masterVendorsList.forEach((vendor) => {
      const prevBal = Math.round(Number(vendor.previousBalance || vendor.openingBalance || vendor.balance || 0));
      const totalPurchases = masterPurchasesList.filter((p) => isVendorMatch(p, vendor)).reduce((sum, p) => sum + getPurchaseAmount(p), 0);
      const totalPaid = Math.round(masterVendorPaymentsList.filter((vp) => isVendorMatch(vp, vendor)).reduce((sum, vp) => sum + Number(vp.amount || 0), 0));
      const totalReturned = Math.round(vendorReturns.filter((vr) => isVendorMatch(vr, vendor)).reduce((sum, vr) => sum + Number(vr.refundAmount || vr.total || 0), 0));

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

  const vendorRows = useMemo(() =>
    masterVendorsList
      .map((vendor) => {
        const vName = vendor.name || vendor.supplierName || vendor.vendorName || 'Unknown Vendor';
        const prevBal = Math.round(Number(vendor.previousBalance || vendor.openingBalance || vendor.balance || 0));
        const totalPurchases = masterPurchasesList.filter((p) => isVendorMatch(p, vendor)).reduce((sum, p) => sum + getPurchaseAmount(p), 0);
        const totalPaid = Math.round(masterVendorPaymentsList.filter((vp) => isVendorMatch(vp, vendor)).reduce((sum, vp) => sum + Number(vp.amount || 0), 0));
        const totalReturned = Math.round(vendorReturns.filter((vr) => isVendorMatch(vr, vendor)).reduce((sum, vr) => sum + Number(vr.refundAmount || vr.total || 0), 0));

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

  // Save Previous Balance Handler
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

  // Delete Record Handler
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
      showToast('Record delete karte waqt error aaya!', 'error');
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

  // Customer History
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

  // Vendor History
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

  // Print Ledger Handler
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

  // CSV Export
  const exportToCSV = () => {
    const isCust = activeTab === 'customers';
    const activeRows = isCust ? customerRows : vendorRows;
    const headers = isCust 
      ? ['Customer Name', 'Shop Name', 'Phone', 'Area', 'Previous Balance', 'Total Sales', 'Total Paid', 'Total Returned', 'Net Balance']
      : ['Vendor Name', 'Company Name', 'Phone', 'City', 'Previous Balance', 'Total Purchases', 'Total Paid', 'Total Returned', 'Net Balance'];

    const csvData = activeRows.map(row => {
      return isCust ? [
        `"${row.name}"`,
        `"${row.shopName}"`,
        `"${row.phone}"`,
        `"${row.area}"`,
        row.previousBalance,
        row.totalSales,
        row.totalPaid,
        row.totalReturned,
        row.balance
      ] : [
        `"${row.name}"`,
        `"${row.companyName}"`,
        `"${row.phone}"`,
        `"${row.city}"`,
        row.previousBalance,
        row.totalPurchases,
        row.totalPaid,
        row.totalReturned,
        row.balance
      ];
    });

    const csvContent = [headers.join(','), ...csvData.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${isCust ? 'Customer_Ledger' : 'Vendor_Ledger'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageShell title="Khata Ledger & Statements" subtitle="Naveed & Zeeshan Traders — Ledger Directory">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-white transition-all duration-300 ${
          toast.type === 'error' ? 'bg-red-900 border-red-700' :
          toast.type === 'warning' ? 'bg-amber-900 border-amber-700' :
          'bg-emerald-900 border-emerald-700'
        }`}>
          <AlertCircle className="w-5 h-5 text-white" />
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800 text-white p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {activeTab === 'customers' ? 'Total Customer Arrears' : 'Total Supplier Payables'}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-400">
                {formatRs(activeTab === 'customers' ? ledgerMetrics.totalOutstanding : vendorMetrics.totalPayable)}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {activeTab === 'customers' ? 'Recovered This Month' : 'Paid This Month'}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-sky-400">
                {formatRs(activeTab === 'customers' ? ledgerMetrics.totalRecoveredThisMonth : vendorMetrics.totalPaidThisMonth)}
              </h3>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <CreditCard className="w-6 h-6 text-sky-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {activeTab === 'customers' ? 'Active Debtors' : 'Active Creditors'}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-amber-400">
                {activeTab === 'customers' ? ledgerMetrics.activeDebtorsCount : vendorMetrics.activeCreditorsCount}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              {activeTab === 'customers' ? <Users className="w-6 h-6 text-amber-400" /> : <Truck className="w-6 h-6 text-amber-400" />}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Ledger Card */}
      <Card className="bg-slate-900 border-slate-800 rounded-2xl p-6 shadow-xl text-white">
        {/* Navigation Tabs and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('vendors')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'vendors' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              Vendors & Suppliers ({vendorRows.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'customers' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Customers ({customerRows.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshData}
              className={`p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'customers' ? 'customer name, shop, or phone...' : 'vendor name, company, or contact...'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
          >
            <option value="all">All Accounts</option>
            <option value="debtors">Pending Balance &gt; 0</option>
            <option value="clear">Cleared Balance (0 or less)</option>
          </select>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">{activeTab === 'customers' ? 'Shop / Company' : 'Company Name'}</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Prev. Balance</th>
                <th className="px-4 py-3 text-right">{activeTab === 'customers' ? 'Total Sales' : 'Purchases'}</th>
                <th className="px-4 py-3 text-right">Total Paid</th>
                <th className="px-4 py-3 text-right">Net Balance</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {(activeTab === 'customers' ? customerRows : vendorRows).length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No ledger records found matching your filters.
                  </td>
                </tr>
              ) : (
                (activeTab === 'customers' ? customerRows : vendorRows).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white">{row.name}</td>
                    <td className="px-4 py-3.5 text-slate-400">{row.shopName || row.companyName}</td>
                    <td className="px-4 py-3.5 text-slate-400">{row.phone}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">{formatRs(row.previousBalance)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                      {formatRs(activeTab === 'customers' ? row.totalSales : row.totalPurchases)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-400">{formatRs(row.totalPaid)}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-400">
                      {formatRs(row.balance)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            if (activeTab === 'customers') setSelectedCustomer(row);
                            else setSelectedVendor(row);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-all"
                          title="View Statement"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintLedger(row, activeTab === 'customers' ? 'customer' : 'vendor')}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition-all"
                          title="Print Ledger Statement"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {activeTab === 'vendors' && (
                          <button
                            onClick={() => {
                              setPayingVendor(row);
                              setPaymentAmount(row.balance > 0 ? String(row.balance) : '');
                            }}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
                            title="Pay Supplier"
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditingItem(row);
                                setNewPrevBalance(String(row.previousBalance));
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-all"
                              title="Edit Opening Balance"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingItem(row)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg transition-all"
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
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL: Customer / Vendor Statement View */}
      {(selectedCustomer || selectedVendor) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-white">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  {selectedCustomer ? selectedCustomer.name : selectedVendor.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCustomer ? 'Customer Khata Statement' : 'Vendor Ledger Statement'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintLedger(selectedCustomer || selectedVendor, selectedCustomer ? 'customer' : 'vendor')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Statement
                </button>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSelectedVendor(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <span className="font-semibold text-slate-200">
                    {(selectedCustomer || selectedVendor).phone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Location</span>
                  <span className="font-semibold text-slate-200">
                    {(selectedCustomer || selectedVendor).area || (selectedCustomer || selectedVendor).city || 'Mailsi'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Opening Balance</span>
                  <span className="font-semibold text-slate-200">
                    {formatRs((selectedCustomer || selectedVendor).previousBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Arrears</span>
                  <span className="font-bold text-amber-400 text-sm">
                    {formatRs((selectedCustomer || selectedVendor).balance)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Reference</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5 text-right">Debit</th>
                      <th className="px-3 py-2.5 text-right">Credit</th>
                      <th className="px-3 py-2.5 text-right">Net Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {(() => {
                      const history = selectedCustomer ? customerHistory : vendorHistory;
                      let runningTotal = 0;
                      if (history.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-500">
                              No history available for this account.
                            </td>
                          </tr>
                        );
                      }
                      return history.map((item, idx) => {
                        runningTotal += item.debit - item.credit;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="px-3 py-2 text-slate-400">{item.date}</td>
                            <td className="px-3 py-2 font-medium text-slate-200">{item.type}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{item.reference}</td>
                            <td className="px-3 py-2 text-slate-400">{item.description}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-300">
                              {item.debit > 0 ? formatRs(item.debit) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-400">
                              {item.credit > 0 ? formatRs(item.credit) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-amber-400">
                              {formatRs(runningTotal)}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Opening Balance */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white">
            <h3 className="text-lg font-bold mb-1">Edit Opening Balance</h3>
            <p className="text-xs text-slate-400 mb-4">{editingItem.name}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Previous / Opening Balance (Rs.)</label>
                <input
                  type="number"
                  value={newPrevBalance}
                  onChange={(e) => setNewPrevBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreviousBalance}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Balance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pay Supplier */}
      {payingVendor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmitVendorPayment} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white">
            <h3 className="text-lg font-bold mb-1">Supplier Payment</h3>
            <p className="text-xs text-slate-400 mb-4">Pay to: {payingVendor.name}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Payment Amount (Rs.)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment remarks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingVendor(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white">
            <h3 className="text-lg font-bold text-rose-500 mb-1">Confirm Delete</h3>
            <p className="text-sm text-slate-300 mb-4">
              Are you sure you want to delete <span className="font-bold text-white">{deletingItem.name}</span>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default KhataLedger;