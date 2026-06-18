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
