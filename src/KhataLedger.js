import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card, DataTable, PageShell } from './components/ui';
import { formatRs, getCreditSalesTotal } from './utils/helpers';

// Firebase Firestore setup
import { db } from './firebase'; 
import { doc, updateDoc, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

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
  Users,
  Truck,
  Wallet
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
  
  // Database Update States
  const [editingItem, setEditingItem] = useState(null);
  const [newPrevBalance, setNewPrevBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Vendor Payment States
  const [payingVendor, setPayingVendor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  // ==========================================
  // 1. CUSTOMER ANALYTICS & ROWS
  // ==========================================
  const ledgerMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let totalRecoveredThisMonth = 0;
    let activeDebtorsCount = 0;

    customers.forEach((customer) => {
      const prevBal = Math.round(Number(customer.previousBalance || customer.openingBalance || 0));
      const totalSales = Math.round(getCreditSalesTotal(sales, customer.name));
      const totalPaid = Math.round(
        payments
          .filter((p) => p.customer === customer.name)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      );
      const totalReturned = Math.round(
        returns
          .filter((r) => (r.customer || r.customerName) === customer.name)
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
          const prevBal = Math.round(Number(customer.previousBalance || customer.openingBalance || 0));
          const totalSales = Math.round(getCreditSalesTotal(sales, customer.name));
          const totalPaid = Math.round(
            payments
              .filter((payment) => (payment.customer || payment.customerName) === customer.name)
              .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
          );
          const totalReturned = Math.round(
            returns
              .filter((returnItem) => (returnItem.customer || returnItem.customerName) === customer.name)
              .reduce((sum, returnItem) => sum + Number(returnItem.refundAmount || returnItem.netTotal || 0), 0)
          );
          
          const balance = prevBal + totalSales - totalPaid - totalReturned;

          return {
            id: customer.id,
            name: customer.name,
            shopName: customer.shopName || '-',
            phone: customer.phone || '-',
            area: customer.area || 'Mailsi',
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
      alert('Aapke paas is record ko change karne ki authority nahi hai!');
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
      
      alert(`Previous Balance successfully updated!`);
      setEditingItem(null);
    } catch (error) {
      console.error("Firebase Error: ", error);
      alert('Firebase database update failed!');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Vendor Payment
  const handleSubmitVendorPayment = async (e) => {
    e.preventDefault();
    const payAmt = Math.round(Number(paymentAmount));
    
    if (!payingVendor || payAmt <= 0) {
      alert('Meharbani karke valid payment amount dakhil karein!');
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

      alert(`Rs. ${payAmt} Supplier (${payingVendor.name}) ko pay kar diye gaye hain aur Cash in Hand se deduct ho chuke hain!`);
      
      if (onPaymentSuccess) onPaymentSuccess();
      setPayingVendor(null);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (err) {
      console.error("Payment Submission Error: ", err);
      alert('Payment save karte waqt error aaya. Internet & Firebase Rules check karein!');
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
      .filter((sale) => {
        const cName = sale.customerName || sale.customer || sale.customer_name;
        const isMatch = cName === selectedCustomer.name;
        const isCreditSale = 
          sale.isCredit === true || 
          String(sale.paymentMethod).toLowerCase() === 'credit' || 
          String(sale.status).toLowerCase() === 'credit' ||
          sale.type === 'Credit';
        return isMatch && (isCreditSale || !sale.paymentMethod);
      })
      .map((sale) => ({
        date: sale.date || new Date(sale.createdAt).toLocaleDateString('en-CA'),
        type: 'Invoice',
        reference: sale.invoiceNo || sale.billNo || '-',
        description: 'Goods Supplied on Credit Khata',
        debit: Math.round(Number(sale.netTotal || sale.netAmount || sale.grandTotal || 0)),
        credit: 0,
      }));

    const customerPayments = payments
      .filter((payment) => (payment.customer || payment.customerName) === selectedCustomer.name)
      .map((payment) => ({
        date: payment.date || new Date(payment.createdAt).toLocaleDateString('en-CA'),
        type: 'Recovery',
        reference: payment.receiptNo || payment.reference || '-',
        description: payment.paymentMethod ? `Cash Received via ${payment.paymentMethod}` : 'Cash Recovery Payment',
        debit: 0,
        credit: Math.round(Number(payment.amount || 0)),
      }));

    const customerReturns = returns
      .filter((returnItem) => (returnItem.customer || returnItem.customerName) === selectedCustomer.name)
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
        const salesList = sales.filter((s) => (s.customerName || s.customer) === item.name)
          .map(s => ({ date: s.date || new Date(s.createdAt).toLocaleDateString('en-CA'), type: 'Invoice', reference: s.invoiceNo || '-', debit: Math.round(Number(s.netTotal || 0)), credit: 0 }));
        const payList = payments.filter((p) => p.customer === item.name)
          .map(p => ({ date: p.date || new Date(p.createdAt).toLocaleDateString('en-CA'), type: 'Recovery', reference: p.receiptNo || '-', debit: 0, credit: Math.round(Number(p.amount || 0)) }));
        const retList = returns.filter((r) => (r.customer || r.customerName) === item.name)
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
      <div className="space-y-6 pb-12">
        
        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-800 gap-4 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('customers'); setSelectedVendor(null); }}
            className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'customers'
                ? 'border-amber-500 text-amber-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={16} />
            Customers Ledger (Debtors)
          </button>
          <button
            onClick={() => { setActiveTab('vendors'); setSelectedCustomer(null); }}
            className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'vendors'
                ? 'border-amber-500 text-amber-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck size={16} />
            Vendors Ledger (Suppliers)
          </button>
        </div>

        {/* METRICS CARDS */}
        {activeTab === 'customers' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Market Receivables</p>
                <h3 className="text-xl font-black text-rose-400 mt-1">{formatRs(Math.round(ledgerMetrics.totalOutstanding))}</h3>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400"><AlertCircle size={20} /></div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recovery This Month</p>
                <h3 className="text-xl font-black text-emerald-400 mt-1">{formatRs(Math.round(ledgerMetrics.totalRecoveredThisMonth))}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><UserCheck size={20} /></div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Debtors Retailers</p>
                <h3 className="text-xl font-black text-amber-400 mt-1">{ledgerMetrics.activeDebtorsCount} Accounts</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><FileText size={20} /></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Supplier Payables</p>
                <h3 className="text-xl font-black text-rose-400 mt-1">{formatRs(Math.round(vendorMetrics.totalPayable))}</h3>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400"><AlertCircle size={20} /></div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paid To Vendors This Month</p>
                <h3 className="text-xl font-black text-emerald-400 mt-1">{formatRs(Math.round(vendorMetrics.totalPaidThisMonth))}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><UserCheck size={20} /></div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Supplier Vendors</p>
                <h3 className="text-xl font-black text-amber-400 mt-1">{vendorMetrics.activeCreditorsCount} Accounts</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><Truck size={20} /></div>
            </div>
          </div>
        )}

        {/* SEARCH & FILTER TOOLBAR */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Search size={16} /></span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'customers' ? "Search customer, shop or mobile..." : "Search vendor, company or phone..."}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-700 text-slate-200 placeholder-slate-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-slate-400 text-xs font-semibold">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg transition ${filterType === 'all' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'}`}>All</button>
              <button onClick={() => setFilterType('debtors')} className={`px-3 py-1.5 rounded-lg transition ${filterType === 'debtors' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'}`}>With Balance</button>
              <button onClick={() => setFilterType('clear')} className={`px-3 py-1.5 rounded-lg transition ${filterType === 'clear' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'}`}>Clear</button>
            </div>
            <button onClick={exportToCSV} className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition"><Download size={15} /></button>
            <button onClick={handleRefreshData} className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition"><RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* DATA TABLES */}
        <Card>
          {activeTab === 'customers' ? (
            <DataTable
              columns={[
                { key: 'name', label: 'Customer Name', render: (row) => <span className="font-bold text-slate-200">{row.name}</span> },
                { key: 'shopName', label: 'Shop Identity' },
                { key: 'area', label: 'Market Location', render: (row) => <span className="text-xs text-slate-400">{row.area}</span> },
                { key: 'previousBalance', label: 'Prev Balance', render: (row) => <span className="text-blue-300 font-medium">{formatRs(Math.round(row.previousBalance))}</span> },
                { key: 'totalSales', label: 'Total Credit (Dr)', render: (row) => <span className="text-rose-300 font-medium">{formatRs(Math.round(row.totalSales))}</span> },
                { key: 'totalPaid', label: 'Recovered (Cr)', render: (row) => <span className="text-emerald-300 font-medium">{formatRs(Math.round(row.totalPaid))}</span> },
                {
                  key: 'balance',
                  label: 'Net Balance',
                  render: (row) => (
                    <span className={`font-black ${row.balance > 50000 ? 'text-red-400' : row.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatRs(Math.round(row.balance))}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <div className="flex items-center gap-1.5 justify-start">
                      <button
                        onClick={() => setSelectedCustomer(row)}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition cursor-pointer"
                        title="View Ledger"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handlePrintLedger(row, 'customer')}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white transition cursor-pointer"
                        title="Print Statement"
                      >
                        <Printer size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingItem(row);
                            setNewPrevBalance(row.previousBalance);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white transition cursor-pointer"
                          title="Edit Previous Balance"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              rows={customerRows}
            />
          ) : (
            <DataTable
              columns={[
                { key: 'name', label: 'Vendor / Supplier', render: (row) => <span className="font-bold text-slate-200">{row.name}</span> },
                { key: 'companyName', label: 'Company / Brand' },
                { key: 'city', label: 'City / Location', render: (row) => <span className="text-xs text-slate-400">{row.city}</span> },
                { key: 'previousBalance', label: 'Prev Balance', render: (row) => <span className="text-blue-300 font-medium">{formatRs(Math.round(row.previousBalance))}</span> },
                { key: 'totalPurchases', label: 'Purchases (Dr)', render: (row) => <span className="text-rose-300 font-medium">{formatRs(Math.round(row.totalPurchases))}</span> },
                { key: 'totalPaid', label: 'Paid Out (Cr)', render: (row) => <span className="text-emerald-300 font-medium">{formatRs(Math.round(row.totalPaid))}</span> },
                {
                  key: 'balance',
                  label: 'Payable Balance',
                  render: (row) => (
                    <span className={`font-black ${row.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatRs(Math.round(row.balance))}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <div className="flex items-center gap-1.5 justify-start">
                      <button
                        onClick={() => setPayingVendor(row)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white transition cursor-pointer"
                        title="Pay Cash to Supplier"
                      >
                        <Wallet size={14} />
                      </button>
                      <button
                        onClick={() => setSelectedVendor(row)}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition cursor-pointer"
                        title="View Vendor Ledger"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handlePrintLedger(row, 'vendor')}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white transition cursor-pointer"
                        title="Print Vendor Statement"
                      >
                        <Printer size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingItem(row);
                            setNewPrevBalance(row.previousBalance);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="Edit Vendor Balance"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              rows={vendorRows}
            />
          )}
        </Card>

        {/* PAY SUPPLIER MODAL */}
        {payingVendor && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
              <button
                onClick={() => setPayingVendor(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="text-emerald-400" size={18} />
                <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">
                  Make Payment To Supplier
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-5">
                Vendor: <strong className="text-amber-400 font-bold">{payingVendor.name}</strong> ({payingVendor.companyName})<br />
                Current Payable Arrears: <strong className="text-rose-400">{formatRs(Math.round(payingVendor.balance))}</strong>
              </p>
              
              <form onSubmit={handleSubmitVendorPayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    Payment Amount (Rs.)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter payment amount"
                    className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-600 font-bold"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-100 font-bold"
                  >
                    <option value="Cash">Cash (Deduct from Cash in Hand)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    Notes / Slip Ref (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Paid against invoice #492"
                    className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-700 text-slate-200"
                  />
                </div>
                
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setPayingVendor(null)}
                    className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition cursor-pointer"
                    disabled={isProcessingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? 'Processing...' : 'Confirm & Less Cash'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT PREVIOUS BALANCE POPUP */}
        {editingItem && isAdmin && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
              <button
                onClick={() => setEditingItem(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider mb-2">
                Update Previous / Opening Balance
              </h3>
              <p className="text-[11px] text-slate-400 mb-5">
                Target Account: <strong className="text-amber-400 font-bold">{editingItem.name}</strong> ({editingItem.shopName || editingItem.companyName})
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    Opening Balance Amount (Rs.)
                  </label>
                  <input
                    type="number"
                    value={newPrevBalance}
                    onChange={(e) => setNewPrevBalance(e.target.value)}
                    placeholder="Enter previous balance"
                    className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-700 text-slate-100 font-bold"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition cursor-pointer"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePreviousBalance}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving to Database...' : 'Save Balance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER STATEMENT BOARD */}
        {selectedCustomer && (
          <Card className="border border-slate-800 bg-slate-950/40 p-6 rounded-3xl animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Customer Statement: <span className="text-amber-400 font-black">{selectedCustomer.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Bazaar Shop: {selectedCustomer.shopName} | Phone: {selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3 pl-2">Date</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Ref Doc No</th>
                    <th className="py-3">Narration Description</th>
                    <th className="py-3 text-right">Debit (Maal)</th>
                    <th className="py-3 text-right">Credit (Vasooli/Return)</th>
                    <th className="py-3 text-right pr-2">Cumulative Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {customerHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-slate-500 italic font-medium">
                        No credit accounts or cash recovery records found.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      let runningSum = 0;
                      return customerHistory.map((item, idx) => {
                        runningSum += (item.debit - item.credit);
                        return (
                          <tr key={idx} className="hover:bg-slate-900/30 transition">
                            <td className="py-3 pl-2 text-slate-400">{item.date}</td>
                            <td className="py-3 font-bold text-rose-400">{item.type}</td>
                            <td className="py-3 font-semibold text-slate-300">{item.reference}</td>
                            <td className="py-3 text-slate-500 font-medium">{item.description}</td>
                            <td className="py-3 text-right text-rose-300 font-semibold">{item.debit > 0 ? formatRs(Math.round(item.debit)) : '-'}</td>
                            <td className="py-3 text-right text-emerald-300 font-semibold">{item.credit > 0 ? formatRs(Math.round(item.credit)) : '-'}</td>
                            <td className="py-3 text-right font-black text-amber-300 pr-2">{formatRs(Math.round(runningSum))}</td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* VENDOR STATEMENT BOARD */}
        {selectedVendor && (
          <Card className="border border-slate-800 bg-slate-950/40 p-6 rounded-3xl animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Vendor Supplier Statement: <span className="text-amber-400 font-black">{selectedVendor.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Company: {selectedVendor.companyName} | Phone: {selectedVendor.phone}</p>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3 pl-2">Date</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Ref Doc No</th>
                    <th className="py-3">Narration Description</th>
                    <th className="py-3 text-right">Debit (Purchases Total)</th>
                    <th className="py-3 text-right">Credit (Paid/Returns)</th>
                    <th className="py-3 text-right pr-2">Cumulative Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {vendorHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-slate-500 italic font-medium">
                        No purchase or payment records found for this vendor.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      let runningSum = 0;
                      return vendorHistory.map((item, idx) => {
                        runningSum += (item.debit - item.credit);
                        return (
                          <tr key={idx} className="hover:bg-slate-900/30 transition">
                            <td className="py-3 pl-2 text-slate-400 font-medium">{item.date}</td>
                            <td className="py-3 font-bold text-amber-400">{item.type}</td>
                            <td className="py-3 font-semibold text-slate-300">{item.reference}</td>
                            <td className="py-3 text-slate-400 font-medium">{item.description}</td>
                            <td className="py-3 text-right text-rose-300 font-bold">{item.debit > 0 ? formatRs(Math.round(item.debit)) : '-'}</td>
                            <td className="py-3 text-right text-emerald-300 font-semibold">{item.credit > 0 ? formatRs(Math.round(item.credit)) : '-'}</td>
                            <td className="py-3 text-right font-black text-amber-300 pr-2">{formatRs(Math.round(runningSum))}</td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </div>
    </PageShell>
  );
};

export default KhataLedger;