import { createContext } from 'react';
import type { Customer, Item, Sale } from '../types';

/**
 * Context objects for the shared data layer.
 *
 * Sales, customers and items live in three separate contexts rather than one,
 * so a screen reading only the item list is not re-rendered by every sales
 * snapshot. These objects are declared here, apart from the provider component
 * and the hooks, so this file exports no components and stays hot-reloadable.
 */

export interface SalesContextValue {
  sales: Sale[];
  loading: boolean;
  error: Error | null;
  addSale: (sale: Omit<Sale, 'createdBy'>) => Promise<void>;
  updateSale: (sale: Omit<Sale, 'createdBy'>) => Promise<void>;
  bulkAddSales: (saleList: Sale[]) => Promise<void>;
  clearAllSales: () => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  generateNextInvoiceNo: () => string;
}

export interface CustomersContextValue {
  customers: Customer[];
  loading: boolean;
  error: Error | null;
  addCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (epfNumber: string) => Promise<void>;
  bulkAddCustomers: (customerList: Customer[]) => Promise<void>;
  clearAllCustomers: () => Promise<void>;
  searchCustomers: (queryText: string) => Promise<Customer[]>;
}

export interface ItemsContextValue {
  items: Item[];
  loading: boolean;
  error: Error | null;
  addItem: (item: Item) => Promise<void>;
  deleteItem: (modelNumber: string) => Promise<void>;
  bulkAddItems: (itemList: Item[]) => Promise<void>;
  clearAllItems: () => Promise<void>;
}

/** Stable identity for the signed-out case, so consumers see a consistent empty array. */
export const NO_SALES: Sale[] = [];
export const NO_CUSTOMERS: Customer[] = [];
export const NO_ITEMS: Item[] = [];

export const SalesContext = createContext<SalesContextValue | undefined>(undefined);
export const CustomersContext = createContext<CustomersContextValue | undefined>(undefined);
export const ItemsContext = createContext<ItemsContextValue | undefined>(undefined);
