export interface Customer {
  epfNumber: string; // unique key / primary key
  institution: string;
  customerName: string;
  contactNumber: string;
  nic?: string;
}

export interface Item {
  modelNumber: string; // unique key / primary key
  itemName: string;
  cashPrice: number;
  rental: number;
}

export interface SaleItem {
  itemName: string;
  modelNumber: string;
  cashPrice: number;
  rental: number;
  term: number;
}

export interface Sale {
  id?: string;
  invoiceNo: string;
  date: string;
  epfNumber: string;
  customerName: string;
  institution: string;
  contactNumber: string;
  nic?: string;
  items: SaleItem[];
  totalCashPrice: number;
  totalRentalMonthly: number;
  overallTerm: number;
  interestRate: number;
  createdBy: string; // User UID;
}

/** Shape persisted in Firestore: a Sale without the locally added `id`. */
export type SaleDocument = Omit<Sale, 'id'>;

/** Firestore document plus the id the SDK reads off the snapshot. */
export type SaleWithId = SaleDocument & { id: string };

/** Firebase Auth error codes this app branches on, plus the fallback. */
export type AuthErrorCode = 'auth/user-not-found' | 'auth/invalid-credential' | (string & {});

/** Narrowed shape of a caught Firebase error. */
export interface AppError extends Error {
  code?: AuthErrorCode;
}

/** Login form fields handled by the AntD form. */
export interface LoginFormValues {
  email: string;
  password: string;
}

/**
 * One row of a parsed worksheet. `XLSX.utils.sheet_to_json` produces heterogeneous
 * values depending on the column, so cells are widened at the boundary and the
 * callers convert with `String(...)`.
 */
export type ExcelRow = Record<string, string | number>;

/** A single row of the sales Excel export/import, keyed by header text. */
export type SalesExcelRow = ExcelRow;

