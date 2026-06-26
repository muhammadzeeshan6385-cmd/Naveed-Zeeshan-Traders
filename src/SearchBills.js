const printBill = (bill) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; color: black; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { border: 1px solid #000; background: #f3f4f6; padding: 8px; text-align: center; }
            td { border: 1px solid #000; padding: 8px; text-align: center; }
            .totals { margin-top: 20px; text-align: right; }
            .totals p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo-dark.png" style="width: 80px; margin-bottom: 10px;" />
            <h1 style="margin: 0; font-size: 22px;">Naveed & Zeeshan Traders, Mailsi</h1>
            <p style="margin: 5px 0;">PH: 0300-3999866, 0307-6385852</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <p><strong>Bill No:</strong> ${bill.invoiceNo}</p>
            <p><strong>Date:</strong> ${bill.date}</p>
          </div>
          <p><strong>Customer Name:</strong> ${bill.customer}</p>

          <table>
            <thead>
              <tr><th>Ser</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${bill.items.map((i, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${i.name}</td>
                  <td>${i.qty}</td>
                  <td>${formatRs(i.rate)}</td>
                  <td>${formatRs(i.total)}</td>
                </tr>`).join('')}
            </tbody>
          </table>

          <div class="totals">
            <p><strong>Gross Total:</strong> ${formatRs(bill.grossTotal || 0)}</p>
            <p><strong>Discount:</strong> ${formatRs(bill.discount || 0)}</p>
            <h3 style="border-top: 1px solid #000; padding-top: 10px; margin-top: 10px;">
              Grand Total: ${formatRs(bill.netTotal)}
            </h3>
          </div>

          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
  };