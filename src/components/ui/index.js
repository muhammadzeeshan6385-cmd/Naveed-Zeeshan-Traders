import React from 'react';

// Logo Component - Naveed & Zeeshan Traders Mailsi
export const Logo = ({ className = "w-[200px]" }) => {
  return (
    <>
      {/* Light mode mein logo-dark.png */}
      <img 
        src="/logo-dark.png" 
        alt="Naveed & Zeeshan Traders Mailsi" 
        className={`${className} h-auto dark:hidden`} 
      />
      {/* Dark mode mein logo-light.png */}
      <img 
        src="/logo-light.png" 
        alt="Naveed & Zeeshan Traders Mailsi" 
        className={`${className} h-auto hidden dark:block`} 
      />
    </>
  );
};

export const Card = ({ title, subtitle, children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur ${className}`}>
    {(title || subtitle) && (
      <div className="mb-5">
        {title && <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>}
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    secondary: 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300',
  };

  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, className = '', ...props }) => (
  <label className="block space-y-1.5">
    {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
    <input
      className={`w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
      {...props}
    />
  </label>
);

export const Select = ({ label, children, className = '', ...props }) => (
  <label className="block space-y-1.5">
    {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
    <select
      className={`w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
      {...props}
    >
      {children}
    </select>
  </label>
);

export const StatCard = ({ title, value, tone = 'emerald' }) => {
  const tones = {
    emerald: 'bg-emerald-50 dark:bg-slate-900 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300',
    rose: 'bg-rose-50 dark:bg-slate-900 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-300',
    blue: 'bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-300',
    amber: 'bg-amber-50 dark:bg-slate-900 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-300',
    violet: 'bg-violet-50 dark:bg-slate-900 border-violet-200 dark:border-violet-500/30 text-violet-900 dark:text-violet-300',
  };

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
};

export const DataTable = ({ columns, rows, emptyMessage = 'No records found.' }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
    <table className="min-w-full text-left text-sm">
      <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
        <tr>
          {columns.map((column) => (
            <th key={column.key} className={`px-4 py-3 font-semibold ${column.className || ''}`}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex} className="border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 ${column.className || ''}`}>
                  {column.render ? column.render(row, rowIndex) : row[column.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export const PageShell = ({ title, subtitle, children }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    {children}
  </div>
);