import type { ExcelRow, Sale, SaleItem } from '../types';
import { getTermRate, round2 } from './pricing';

/**
 * The sales Excel sheet, in both directions.
 *
 * Exports are one row per item, repeating the invoice details, which is the
 * layout the restore step reads back. The two are kept together so a change to
 * one cannot quietly break the other: the header list below is what the export
 * writes, what the template offers, and what the import looks for.
 */

export const SALE_SHEET_HEADERS = [
  'EPF',
  'Name',
  'ID',
  'Date',
  'NIC',
  'mobile',
  'Institution',
  'Item',
  'model number',
  'cash price',
  'total',
  'rental',
  'term',
] as const;

/** What an import found, ready to be confirmed by the operator. */
export interface SalesImportPreview {
  sales: Sale[];
  itemCount: number;
}

/** Outcome of the sales import: the grouped preview, or why the file was rejected. */
export type SalesParseResult = { ok: true; preview: SalesImportPreview } | { ok: false; error: string };

const normaliseKey = (key: string) => key.toLowerCase().replace(/\s+/g, '');

const findColumn = (keys: string[], aliases: string[]) =>
  keys.find(key => aliases.includes(normaliseKey(key)));

/** Read a cell as a number, dropping currency marks and separators. Unparseable cells are 0. */
const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

/** Trim an invoice name, drop a legacy "U " prefix, and pad a bare number to four digits. */
const normaliseInvoiceNo = (value: string) => {
  const trimmed = value.trim().replace(/^U\s+/i, '');
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(4, '0');
  return trimmed;
};

const excelSerialToDate = (serial: number) => {
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000).toISOString().slice(0, 10);
};

/** Read a cell as a yyyy-mm-dd date, accepting a Date, an Excel serial, dd/mm/yyyy or anything Date can parse. */
const toDateString = (value: unknown): string => {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && isFinite(value)) return excelSerialToDate(value);

  const raw = String(value).trim();
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (dmy) return `${dmy[3]}-${dmy[1].padStart(2, '0')}-${dmy[2].padStart(2, '0')}`;

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};

/** One export row per item, with the invoice details repeated on each line. */
export const buildSalesExportRows = (sales: Sale[]): Record<string, string | number>[] => {
  const rows: Record<string, string | number>[] = [];

  for (const sale of sales) {
    for (const item of sale.items) {
      rows.push({
        'EPF': sale.epfNumber,
        'Name': sale.customerName,
        'ID': sale.invoiceNo.replace(/^U\s+/, ''),
        'Date': sale.date,
        'NIC': sale.nic || '',
        'mobile': sale.contactNumber,
        'Institution': sale.institution,
        'Item': item.itemName,
        'model number': item.modelNumber,
        'cash price': item.cashPrice,
        'total': sale.totalCashPrice,
        'rental': item.rental,
        'term': item.term || sale.overallTerm,
      });
    }
  }

  return rows;
};

/** Rows for the sales import template, showing one invoice with two items. */
export const buildSalesTemplateRows = (): Record<string, string | number>[] => [
  {
    'EPF': 'EPF-001',
    'Name': 'Sampath Perera',
    'ID': '0001',
    'Date': '2024-01-15',
    'NIC': '199012345678',
    'mobile': '0711234567',
    'Institution': 'National Hospital',
    'Item': 'Singer Refrigerator 250L',
    'model number': 'SIS-REF-01',
    'cash price': 85000,
    'total': 85000,
    'rental': 4200,
    'term': 12,
  },
  {
    'EPF': 'EPF-001',
    'Name': 'Sampath Perera',
    'ID': '0001',
    'Date': '2024-01-15',
    'NIC': '199012345678',
    'mobile': '0711234567',
    'Institution': 'National Hospital',
    'Item': 'Singer LED TV 32"',
    'model number': 'SIS-TV-32',
    'cash price': 45000,
    'total': 85000,
    'rental': 2100,
    'term': 12,
  },
];

/**
 * Group worksheet rows into sales, or explain which columns are missing.
 *
 * Rows sharing an invoice number become one invoice with several items, so a
 * file written by {@link buildSalesExportRows} restores to the invoices it came
 * from rather than to one invoice per line.
 */
export const parseSalesRows = (rows: ExcelRow[]): SalesParseResult => {
  if (rows.length === 0) {
    return { ok: false, error: 'Uploaded Excel file is empty.' };
  }

  const keys = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach(key => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const invoiceKey = findColumn(keys, ['id', 'invoiceno', 'invoice', 'invoicenumber']);
  const epfKey = findColumn(keys, ['epf', 'epfnumber']);
  const nameKey = findColumn(keys, ['name', 'customername', 'fullname']);
  const itemKey = findColumn(keys, ['item', 'itemname', 'salespartdescription']);
  const modelKey = findColumn(keys, ['modelnumber', 'model', 'salespartno']);
  const priceKey = findColumn(keys, ['cashprice', 'price', 'discountedprice']);
  const rentalKey = keys.find(k => normaliseKey(k) === 'rental' || normaliseKey(k).includes('rental'));
  const dateKey = findColumn(keys, ['date', 'transactiondate', 'invoicedate']);
  const nicKey = findColumn(keys, ['nic', 'nicnumber', 'idnumber']);
  const mobileKey = findColumn(keys, ['mobile', 'contactnumber', 'contact', 'phone']);
  const instKey = findColumn(keys, ['institution', 'company']);
  const termKey = findColumn(keys, ['term']);

  if (!invoiceKey) {
    return { ok: false, error: 'Invalid template. The Excel must contain an "ID" (invoice number) column.' };
  }
  if (!epfKey && !nameKey) {
    return { ok: false, error: 'Invalid template. The Excel must contain at least an "EPF" or "Name" column.' };
  }
  if (!itemKey && !modelKey) {
    return { ok: false, error: 'Invalid template. The Excel must contain at least an "Item" or "model number" column.' };
  }

  const grouped = new Map<string, Sale>();

  for (const row of rows) {
    const invoiceNo = normaliseInvoiceNo(String(row[invoiceKey] ?? ''));
    if (!invoiceNo) continue;

    const existing = grouped.get(invoiceNo);
    const saleItems: SaleItem[] = existing ? [...existing.items] : [];

    const itemName = itemKey ? String(row[itemKey] ?? '').trim() : '';
    const modelNumber = modelKey ? String(row[modelKey] ?? '').trim() : '';
    if (itemName || modelNumber) {
      saleItems.push({
        itemName,
        modelNumber,
        cashPrice: toNumber(priceKey ? row[priceKey] : row['cash price']),
        rental: toNumber(rentalKey ? row[rentalKey] : row['rental']),
        term: termKey ? toNumber(row[termKey]) : (existing?.overallTerm ?? 0),
      });
    }

    const overallTerm = termKey
      ? toNumber(row[termKey])
      : (saleItems.find(i => i.term)?.term ?? existing?.overallTerm ?? 0);

    grouped.set(invoiceNo, {
      id: invoiceNo,
      invoiceNo,
      date: toDateString(dateKey ? row[dateKey] : undefined),
      epfNumber: epfKey ? String(row[epfKey] ?? '').trim() : (existing?.epfNumber ?? ''),
      customerName: nameKey ? String(row[nameKey] ?? '').trim() : (existing?.customerName ?? ''),
      institution: instKey ? String(row[instKey] ?? '').trim() : (existing?.institution ?? ''),
      contactNumber: mobileKey ? String(row[mobileKey] ?? '').trim() : (existing?.contactNumber ?? ''),
      nic: nicKey ? String(row[nicKey] ?? '').trim() : (existing?.nic ?? ''),
      items: saleItems,
      totalCashPrice: round2(saleItems.reduce((sum, i) => sum + (i.cashPrice || 0), 0)),
      totalRentalMonthly: round2(saleItems.reduce((sum, i) => sum + (i.rental || 0), 0)),
      overallTerm,
      interestRate: getTermRate(overallTerm),
      createdBy: existing?.createdBy ?? '',
    });
  }

  const sales = Array.from(grouped.values());

  if (sales.length === 0) {
    return { ok: false, error: 'No valid invoice rows were found in the uploaded file.' };
  }

  return {
    ok: true,
    preview: {
      sales,
      itemCount: sales.reduce((sum, s) => sum + s.items.length, 0),
    },
  };
};
