/**
 * Shared utilities for Fuel, StaffExpenses, and Trip modules
 */

// ───── Sorting ─────
export const getSortedData = (data, sortField, sortDirection) => {
  if (!sortField) return data;
  return [...data].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Handle dates
    if (sortField.includes('date') || sortField === 'fuel_date' || sortField === 'expense_date' || sortField === 'trip_date') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    } else if (sortField === 'cost' || sortField === 'amount' || sortField === 'quantity') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else {
      aVal = (aVal || '').toString().toLowerCase();
      bVal = (bVal || '').toString().toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
};

// ───── Date Filtering ─────
export const dateFilterOptions = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

export const filterByDateRange = (data, filterValue, customStart, customEnd, dateField = 'fuel_date') => {
  if (filterValue === 'all') return data;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate, endDate;

  switch (filterValue) {
    case 'today':
      startDate = startOfDay;
      endDate = new Date(startOfDay.getTime() + 86400000);
      break;
    case 'week': {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start
      startDate = new Date(startOfDay.getTime() - diff * 86400000);
      endDate = new Date(startDate.getTime() + 7 * 86400000);
      break;
    }
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'custom':
      if (customStart) startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd + 'T23:59:59');
      break;
    default:
      return data;
  }

  return data.filter((item) => {
    const itemDate = new Date(item[dateField] || 0);
    if (startDate && endDate) return itemDate >= startDate && itemDate <= endDate;
    if (startDate) return itemDate >= startDate;
    if (endDate) return itemDate <= endDate;
    return true;
  });
};

// ───── Search ─────
export const searchData = (data, query, fields = []) => {
  if (!query || !query.trim()) return data;
  const lowerQuery = query.toLowerCase().trim();
  return data.filter((item) =>
    fields.some((field) => {
      const val = item[field];
      return val && val.toString().toLowerCase().includes(lowerQuery);
    })
  );
};

// ───── Pagination ─────
export const paginateData = (data, page, rowsPerPage) => {
  const start = (page - 1) * rowsPerPage;
  return data.slice(start, start + rowsPerPage);
};

export const getTotalPages = (total, rowsPerPage) => Math.max(1, Math.ceil(total / rowsPerPage));

// ───── CSV Export ─────
export const exportToCSV = (data, filename, columns) => {
  if (!data.length) return;

  const header = columns.map((c) => c.label).join(',');
  const rows = data.map((item) =>
    columns
      .map((c) => {
        let val = item[c.key];
        if (c.format) val = c.format(val);
        // Escape commas and quotes
        const str = (val || '').toString();
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// ───── Print ─────
export const printTable = (title) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || [])
          .map((rule) => rule.cssText)
          .join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>${styles}</style>
      <style>
        body { padding: 40px; font-family: 'Inter', sans-serif; }
        h1 { font-size: 24px; margin-bottom: 20px; color: #1f2937; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
        td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
        .no-print { display: none; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${document.getElementById('printable-table')?.outerHTML || ''}
      <script>window.print(); window.close();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// ───── Module info for breadcrumbs ─────
export const getLastUpdated = (data, dateField = 'fuel_date') => {
  if (!data.length) return 'N/A';
  const dates = data.map((d) => new Date(d[dateField] || 0).getTime()).filter((d) => d > 0);
  if (!dates.length) return 'N/A';
  const latest = new Date(Math.max(...dates));
  return latest.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
