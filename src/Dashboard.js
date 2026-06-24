// Dashboard.js mein ye hissa replace kar dein
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard title="Total Sales" value={formatRs(stats.totalSale)} tone="emerald" />
        <StatCard title="Today's Sales" value={formatRs(stats.todaySales)} tone="blue" />
        <StatCard title="Total Expenses" value={formatRs(stats.totalExpense)} tone="rose" />
        <StatCard title="Net Profit" value={formatRs(stats.profit)} tone="violet" />
        <StatCard title="Total Recovery" value={formatRs(stats.totalRecovery)} tone="blue" />
        <StatCard title="Outstanding" value={formatRs(stats.outstanding)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Card ka title aur text yahan se control hoga */}
        <Card title="Recent Expenses" className="xl:col-span-1 text-slate-900 dark:text-white">
          <div className="space-y-3">
            {recentExpenses.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No expenses recorded yet.</p>}
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-950/70 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{expense.category}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{expense.date}</p>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-300">{formatRs(expense.amount)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Latest Sales Invoices" className="xl:col-span-2 text-slate-900 dark:text-white">
          <DataTable
            columns={[
              { key: 'invoiceNo', label: 'Invoice' },
              { key: 'customer', label: 'Customer', render: (row) => getSaleCustomer(row) || 'Walk-in' },
              {
                key: 'total',
                label: 'Total',
                className: 'text-right',
                render: (row) => <span className="font-semibold text-emerald-600 dark:text-emerald-300">{formatRs(getSaleTotal(row))}</span>,
              },
            ]}
            rows={recentSales}
          />
        </Card>
      </div>