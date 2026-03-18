import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Budget, Category, Expense } from '@/models/finance';

function escapeCsv(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function buildCsv(expenses: Expense[], categories: Category[], budgets: Budget[]): string {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const expenseRows = [
    ['Date', 'Category', 'Amount', 'Note'],
    ...expenses
      .slice()
      .sort((a, b) => b.date - a.date)
      .map((e) => [
        escapeCsv(formatDate(e.date)),
        escapeCsv(catMap[e.categoryId] ?? e.categoryId),
        escapeCsv(e.amount.toFixed(2)),
        escapeCsv(e.note ?? ''),
      ]),
  ]
    .map((row) => row.join(','))
    .join('\n');

  const budgetRows = [
    ['Month', 'Category', 'Limit'],
    ...budgets.map((b) => [
      escapeCsv(b.month),
      escapeCsv(catMap[b.categoryId] ?? b.categoryId),
      escapeCsv(b.monthlyLimit.toFixed(2)),
    ]),
  ]
    .map((row) => row.join(','))
    .join('\n');

  return `EXPENSES\n${expenseRows}\n\nBUDGETS\n${budgetRows}`;
}

function buildHtml(expenses: Expense[], categories: Category[], budgets: Budget[]): string {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const sorted = [...expenses].sort((a, b) => b.date - a.date);

  const expenseRows = sorted
    .map(
      (e) => `
    <tr>
      <td>${formatDate(e.date)}</td>
      <td>${catMap[e.categoryId] ?? e.categoryId}</td>
      <td style="text-align:right">$${e.amount.toFixed(2)}</td>
      <td>${e.note ?? ''}</td>
    </tr>`
    )
    .join('');

  const budgetRows = budgets
    .map(
      (b) => `
    <tr>
      <td>${b.month}</td>
      <td>${catMap[b.categoryId] ?? b.categoryId}</td>
      <td style="text-align:right">$${b.monthlyLimit.toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const total = sorted.reduce((s, e) => s + e.amount, 0);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, Helvetica, sans-serif; color: #1e293b; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 15px; color: #64748b; margin-top: 24px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  .total { font-weight: 700; color: #6366f1; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
<h1>Finance Report</h1>
<p style="color:#64748b;font-size:13px">Generated ${new Date().toLocaleDateString()}</p>

<h2>Expenses (${sorted.length} transactions)</h2>
<table>
  <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th></tr></thead>
  <tbody>${expenseRows}</tbody>
  <tfoot>
    <tr><td colspan="2" style="text-align:right;padding-right:10px;font-weight:600">Total</td>
    <td style="text-align:right" class="total">$${total.toFixed(2)}</td><td></td></tr>
  </tfoot>
</table>

<h2>Category Budgets</h2>
<table>
  <thead><tr><th>Month</th><th>Category</th><th>Monthly Limit</th></tr></thead>
  <tbody>${budgetRows}</tbody>
</table>

<p class="footer">Exported from slow-to-pro</p>
</body>
</html>`;
}

export async function exportFinancesAsCsv(
  expenses: Expense[],
  categories: Category[],
  budgets: Budget[]
): Promise<void> {
  const csv = buildCsv(expenses, categories, budgets);
  const fileName = `finances_${new Date().toISOString().slice(0, 10)}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, fileName);
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}

export async function exportFinancesAsPdf(
  expenses: Expense[],
  categories: Category[],
  budgets: Budget[]
): Promise<void> {
  const html = buildHtml(expenses, categories, budgets);
  const { uri } = await Print.printToFileAsync({ html });
  const dest = new File(Paths.cache, `finances_${new Date().toISOString().slice(0, 10)}.pdf`);
  new File(uri).move(dest);
  await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
