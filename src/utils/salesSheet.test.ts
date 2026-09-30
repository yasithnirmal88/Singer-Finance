import { describe, expect, it } from 'vitest';
import type { Sale } from '../types';
import type { ExcelRow } from '../types';
import { SALE_SHEET_HEADERS, buildSalesExportRows, buildSalesTemplateRows, parseSalesRows } from './salesSheet';

const today = () => new Date().toISOString().slice(0, 10);

const twoItemSale: Sale = {
  id: '0001',
  invoiceNo: '0001',
  date: '2024-01-15',
  epfNumber: 'EPF-001',
  customerName: 'Sampath Perera',
  institution: 'National Hospital',
  contactNumber: '0711234567',
  nic: '199012345678',
  items: [
    { itemName: 'Singer Refrigerator 250L', modelNumber: 'SIS-REF-01', cashPrice: 85000, rental: 4200, term: 12 },
  ],
  totalCashPrice: 85000,
  totalRentalMonthly: 4200,
  overallTerm: 12,
  interestRate: 0.10146,
  createdBy: 'uid-1',
};

describe('SALE_SHEET_HEADERS', () => {
  it('matches the canonical export column names', () => {
    expect(SALE_SHEET_HEADERS).toEqual([
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
    ]);
  });
});

describe('buildSalesExportRows', () => {
  it('writes one row per item, repeating the invoice details', () => {
    const sale: Sale = {
      ...twoItemSale,
      items: [
        { itemName: 'Refrigerator', modelNumber: 'SIS-REF-01', cashPrice: 85000, rental: 4200, term: 12 },
        { itemName: 'Led TV', modelNumber: 'SIS-TV-32', cashPrice: 45000, rental: 2100, term: 12 },
      ],
      totalCashPrice: 130000,
      totalRentalMonthly: 6300,
    };
    const rows = buildSalesExportRows([sale]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      'EPF': 'EPF-001',
      'Name': 'Sampath Perera',
      'ID': '0001',
      'Date': '2024-01-15',
      'NIC': '199012345678',
      'mobile': '0711234567',
      'Institution': 'National Hospital',
      'Item': 'Refrigerator',
      'model number': 'SIS-REF-01',
      'cash price': 85000,
      'total': 130000,
      'rental': 4200,
      'term': 12,
    });
    expect(Object.keys(rows[0])).toEqual([...SALE_SHEET_HEADERS]);
  });

  it('strips the legacy "U " prefix from the invoice id on export', () => {
    const rows = buildSalesExportRows([{ ...twoItemSale, invoiceNo: 'U 0001' }]);
    expect(rows[0]['ID']).toBe('0001');
  });
});

describe('buildSalesTemplateRows', () => {
  it('parses back to a single invoice with two items', () => {
    const result = parseSalesRows(buildSalesTemplateRows());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.sales).toHaveLength(1);
    expect(result.preview.itemCount).toBe(2);
    const sale = result.preview.sales[0];
    expect(sale.invoiceNo).toBe('0001');
    expect(sale.customerName).toBe('Sampath Perera');
    expect(sale.date).toBe('2024-01-15');
    expect(sale.totalCashPrice).toBe(130000);
    expect(sale.totalRentalMonthly).toBe(6300);
    expect(sale.overallTerm).toBe(12);
  });
});

describe('parseSalesRows', () => {
  it('rejects an empty file', () => {
    expect(parseSalesRows([])).toEqual({ ok: false, error: 'Uploaded Excel file is empty.' });
  });

  it('rejects a file without an invoice column', () => {
    const result = parseSalesRows([{ Name: 'Sampath', 'model number': 'SIS-01' }]);
    expect(result).toEqual({
      ok: false,
      error: 'Invalid template. The Excel must contain an "ID" (invoice number) column.',
    });
  });

  it('rejects a file without an EPF or Name column', () => {
    const result = parseSalesRows([{ ID: '0001', 'model number': 'SIS-01' }]);
    expect(result).toEqual({
      ok: false,
      error: 'Invalid template. The Excel must contain at least an "EPF" or "Name" column.',
    });
  });

  it('rejects a file without an Item or model number column', () => {
    const result = parseSalesRows([{ ID: '0001', EPF: 'EPF-001' }]);
    expect(result).toEqual({
      ok: false,
      error: 'Invalid template. The Excel must contain at least an "Item" or "model number" column.',
    });
  });

  it('rejects rows with no valid invoice numbers', () => {
    const result = parseSalesRows([{ ID: '', EPF: 'EPF-001', 'model number': 'SIS-01' }]);
    expect(result).toEqual({ ok: false, error: 'No valid invoice rows were found in the uploaded file.' });
  });

  it('groups rows sharing an invoice number into one sale with several items', () => {
    const rows: ExcelRow[] = [
      {
        ID: '0001', EPF: 'EPF-001', Name: 'Sampath Perera', Date: '2024-01-15',
        Item: 'Refrigerator', 'model number': 'SIS-REF-01', 'cash price': '85,000', rental: 4200, term: 12,
      },
      {
        ID: '0001', EPF: 'EPF-001', Name: 'Sampath Perera', Date: '2024-01-15',
        Item: 'Led TV', 'model number': 'SIS-TV-32', 'cash price': 45000, rental: 2100, term: 12,
      },
    ];
    const result = parseSalesRows(rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.sales).toHaveLength(1);
    expect(result.preview.itemCount).toBe(2);
    const sale = result.preview.sales[0];
    expect(sale.items).toHaveLength(2);
    expect(sale.items[1]).toMatchObject({ itemName: 'Led TV', modelNumber: 'SIS-TV-32' });
    expect(sale.totalCashPrice).toBe(130000);
    expect(sale.totalRentalMonthly).toBe(6300);
  });

  it('pads a bare numeric invoice id to four digits', () => {
    const result = parseSalesRows([{ ID: '42', EPF: 'EPF-001', 'model number': 'SIS-01' }]);
    expect(result.ok && result.preview.sales[0].invoiceNo).toBe('0042');
  });

  it('strips the legacy "U " prefix and pads the remainder', () => {
    const result = parseSalesRows([{ ID: 'U 42', EPF: 'EPF-001', 'model number': 'SIS-01' }]);
    expect(result.ok && result.preview.sales[0].invoiceNo).toBe('0042');
  });

  it('parses cash prices with thousands separators', () => {
    const result = parseSalesRows([
      { ID: '0001', EPF: 'EPF-001', 'model number': 'SIS-01', 'cash price': '85,000.00', rental: '4,200' },
    ]);
    expect(result.ok && result.preview.sales[0].items[0].cashPrice).toBe(85000);
    expect(result.ok && result.preview.sales[0].items[0].rental).toBe(4200);
  });

  it('reads a Date cell as the yyyy-mm-dd slice', () => {
    const result = parseSalesRows([
      { ID: '0001', EPF: 'EPF-001', 'model number': 'SIS-01', Date: new Date('2024-01-15T10:30:00Z') as unknown as number },
    ]);
    expect(result.ok && result.preview.sales[0].date).toBe('2024-01-15');
  });

  it('reads an Excel serial date cell', () => {
    const result = parseSalesRows([
      { ID: '0001', EPF: 'EPF-001', 'model number': 'SIS-01', Date: 45306 },
    ]);
    expect(result.ok && result.preview.sales[0].date).toBe('2024-01-15');
  });

  it('reads a dd/mm/yyyy string date cell', () => {
    const result = parseSalesRows([
      { ID: '0001', EPF: 'EPF-001', 'model number': 'SIS-01', Date: '15/01/2024' },
    ]);
    expect(result.ok && result.preview.sales[0].date).toBe('2024-01-15');
  });

  it('falls back to today when an invoice row has no date', () => {
    const result = parseSalesRows([
      { ID: '0001', EPF: 'EPF-001', 'model number': 'SIS-01' },
      { ID: '0001', EPF: 'EPF-001', Item: 'Second' },
    ]);
    expect(result.ok && result.preview.sales[0].date).toBe(today());
  });

  it('imports cleanly from its own export (round trip)', () => {
    const secondSale: Sale = {
      ...twoItemSale,
      id: '0002',
      invoiceNo: '0002',
      date: '2024-02-10',
      items: [
        { itemName: 'A', modelNumber: 'SIS-A', cashPrice: 100, rental: 10, term: 12 },
        { itemName: 'B', modelNumber: 'SIS-B', cashPrice: 200, rental: 20, term: 12 },
      ],
      totalCashPrice: 300,
      totalRentalMonthly: 30,
      nic: '199012345678',
      institution: 'General Hospital',
      createdBy: 'someone',
    };
    const result = parseSalesRows(buildSalesExportRows([twoItemSale, secondSale]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.sales).toHaveLength(2);
    const [importedFirst, importedSecond] = result.preview.sales;
    expect(importedFirst).toMatchObject({
      invoiceNo: '0001',
      customerName: 'Sampath Perera',
      epfNumber: 'EPF-001',
      date: '2024-01-15',
      totalCashPrice: 85000,
      totalRentalMonthly: 4200,
      overallTerm: 12,
    });
    expect(importedFirst.items).toHaveLength(1);
    expect(importedSecond).toMatchObject({
      invoiceNo: '0002',
      customerName: 'Sampath Perera',
      institution: 'General Hospital',
      nic: '199012345678',
      date: '2024-02-10',
      totalCashPrice: 300,
      totalRentalMonthly: 30,
    });
    expect(importedSecond.items).toHaveLength(2);
    expect(importedSecond.items.every(item => item.term === 12)).toBe(true);
  });
});