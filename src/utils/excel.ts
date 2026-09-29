import * as XLSX from 'xlsx';
import type { Customer, ExcelRow, Item } from '../types';

/**
 * Excel import and export.
 *
 * Templates are hand-maintained spreadsheets, so the column headers vary between
 * files. The mapping below accepts the aliases seen in the wild ("EPF" or "EPF
 * Number", "Name" or "Full Name", "Model" or "SalesPartNo") and tolerates
 * spaces and casing. Keeping the accepted names in one place means a new
 * template only has to be described once.
 */

/** Outcome of mapping worksheet rows onto a domain shape. */
export type ParseResult<T> = { ok: true; rows: T[] } | { ok: false; error: string };

/** Options for {@link readWorkbookRows}. */
interface ReadOptions {
  /** Keep date cells as Date objects instead of serial numbers. */
  cellDates?: boolean;
}

/** Lower-case a header and drop whitespace, so "Cash Price" matches "cashprice". */
const normaliseKey = (key: string): string => key.toLowerCase().replace(/\s+/g, '');

/** Find the first header in a row that satisfies the predicate. */
const findKey = (row: ExcelRow, matches: (normalised: string, lower: string) => boolean): string | undefined =>
  Object.keys(row).find(key => matches(normaliseKey(key), key.toLowerCase()));

/** Read a cell as trimmed text, tolerating numbers and missing values. */
const cellText = (row: ExcelRow, key: string | undefined): string =>
  key ? String(row[key]).trim() : '';

/** Read a cell as a number, dropping thousands separators. Unparseable cells are 0. */
const cellNumber = (row: ExcelRow, key: string | undefined): number =>
  key ? Number(String(row[key]).replace(/,/g, '')) || 0 : 0;

/** Map worksheet rows onto customers, or explain which columns are required. */
export const parseCustomerRows = (rows: ExcelRow[]): ParseResult<Customer> => {
  const mapped: Customer[] = [];

  for (const row of rows) {
    const epfKey = findKey(row, (n, lower) => n === 'epfnumber' || lower === 'epf');
    const nameKey = findKey(
      row,
      (n, lower) => n === 'fullname' || n === 'customername' || lower === 'name'
    );

    if (!epfKey || !nameKey) {
      return {
        ok: false,
        error:
          'Invalid template. Customer Excel must contain at least "EPF Number" (or "EPF") and "Full Name" (or "Name") columns.',
      };
    }

    const nicKey = findKey(row, (_n, lower) => lower === 'nic');
    const institutionKey = findKey(row, (_n, lower) => lower === 'institution');
    const contactKey = findKey(
      row,
      (n, lower) => n === 'contactnumber' || lower === 'mobile' || lower === 'contact' || lower === 'phone'
    );

    mapped.push({
      epfNumber: cellText(row, epfKey),
      customerName: cellText(row, nameKey),
      institution: cellText(row, institutionKey),
      contactNumber: cellText(row, contactKey),
      nic: cellText(row, nicKey),
    });
  }

  return { ok: true, rows: mapped };
};

/** Map worksheet rows onto items, or explain which columns are required. */
export const parseItemRows = (rows: ExcelRow[]): ParseResult<Item> => {
  const mapped: Item[] = [];

  for (const row of rows) {
    const modelKey = findKey(
      row,
      (n, lower) => n === 'salespartno' || n === 'modelnumber' || lower === 'model'
    );
    const nameKey = findKey(
      row,
      (n, lower) => n === 'salespartdescription' || n === 'itemname' || n === 'name' || lower === 'item'
    );

    if (!modelKey || !nameKey) {
      return {
        ok: false,
        error:
          'Invalid template. Item Excel must contain at least "SalesPartNo" (or "Model") and "Sales Part Description" (or "Item Name") columns.',
      };
    }

    const priceKey = findKey(row, n => n === 'cashprice' || n === 'price' || n === 'discountedprice');
    const rentalKey = findKey(row, (_n, lower) => lower === 'rental' || lower.includes('rental'));

    mapped.push({
      modelNumber: cellText(row, modelKey).toUpperCase(),
      itemName: cellText(row, nameKey),
      cashPrice: cellNumber(row, priceKey),
      rental: cellNumber(row, rentalKey),
    });
  }

  return { ok: true, rows: mapped };
};

/** Thrown when the browser cannot read the file at all, as opposed to the file being unreadable as a workbook. */
export class FileReadError extends Error {
  constructor(message = 'Could not read file data') {
    super(message);
    this.name = 'FileReadError';
  }
}

/** Parse a workbook payload into the rows of its first worksheet. */
export const readWorkbookRows = (
  data: ArrayBuffer | string,
  options: ReadOptions = {}
): ExcelRow[] => {
  const workbook = XLSX.read(data, { type: 'binary', ...options });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
};

/**
 * Read an uploaded workbook as the rows of its first worksheet.
 *
 * Rejects with a {@link FileReadError} when the browser cannot read the file, so
 * callers can tell that apart from a workbook they could not parse and report
 * each in its own words.
 */
export const readExcelFile = (file: File, options: ReadOptions = {}): Promise<ExcelRow[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) throw new Error('Could not read file data');
        resolve(readWorkbookRows(data as ArrayBuffer | string, options));
      } catch (error) {
        reject(error instanceof Error ? error : new FileReadError());
      }
    };

    reader.onerror = () => reject(new FileReadError());
    reader.readAsBinaryString(file);
  });

/** Options for {@link downloadExcel}. */
interface DownloadOptions {
  /** Worksheet name. Defaults to 'Sheet1'. */
  sheetName?: string;
  /** Explicit header order, used when exporting a template with fixed columns. */
  header?: string[];
  /** Widen each column to fit its longest cell. */
  autoFit?: boolean;
}

/**
 * Build rows into a workbook, optionally widening columns to fit their content.
 *
 * Separate from {@link downloadExcel} so a workbook can be inspected or written
 * some other way without going through a browser download.
 */
export const buildWorkbook = (
  rows: Record<string, string | number>[],
  options: DownloadOptions = {}
): XLSX.WorkBook => {
  const { sheetName = 'Sheet1', header, autoFit = false } = options;

  const worksheet = XLSX.utils.json_to_sheet(rows, header ? { header } : undefined);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (autoFit && rows.length > 0) {
    const keys = Object.keys(rows[0]);
    worksheet['!cols'] = keys.map(key => ({
      wch: Math.max(key.length + 3, ...rows.map(row => String(row[key] ?? '').length + 2)),
    }));
  }

  return workbook;
};

/** Build rows into a workbook and hand it to the browser as a download. */
export const downloadExcel = (
  rows: Record<string, string | number>[],
  fileName: string,
  options: DownloadOptions = {}
): void => {
  XLSX.writeFile(buildWorkbook(rows, options), fileName);
};

/** Rows for the customer import template, as an example of the accepted headers. */
export const CUSTOMER_TEMPLATE_ROWS: Record<string, string | number>[] = [
  {
    'EPF Number': 'EPF-001',
    'Customer Name': 'Sampath Perera',
    Institution: 'National Hospital',
    'Contact Number': '0711234567',
  },
  {
    'EPF Number': 'EPF-002',
    'Customer Name': 'Nimali Silva',
    Institution: 'Ministry of Education',
    'Contact Number': '0777654321',
  },
];

/** Rows for the item import template, as an example of the accepted headers. */
export const ITEM_TEMPLATE_ROWS: Record<string, string | number>[] = [
  {
    'Model Number': 'SIS-REF-01',
    'Item Name': 'Singer Refrigerator 250L',
    'Cash Price': 85000,
    Rental: 4200,
  },
  {
    'Model Number': 'SIS-TV-32',
    'Item Name': 'Singer LED TV 32"',
    'Cash Price': 45000,
    Rental: 2100,
  },
];
