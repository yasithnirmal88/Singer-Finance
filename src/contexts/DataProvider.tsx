import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAt,
  endAt,
  writeBatch,
} from 'firebase/firestore';
import type { CollectionReference, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import {
  CustomersContext,
  ItemsContext,
  NO_CUSTOMERS,
  NO_ITEMS,
  NO_SALES,
  SalesContext,
} from './data-contexts';
import type {
  CustomersContextValue,
  ItemsContextValue,
  SalesContextValue,
} from './data-contexts';
import type { Customer, Item, Sale, SaleWithId } from '../types';

/**
 * The single owner of the app's Firestore data.
 *
 * Every screen used to open its own listeners, so mounting the dashboard with
 * five tabs produced three subscriptions per tab and each one paid for a
 * separate localStorage write. Here there is one subscription per collection
 * for the whole app, and the hooks in src/hooks read from these contexts.
 *
 * Firestore layout is unchanged: users/{uid}/sales/{invoiceNo},
 * users/{uid}/customers/{epfNumber} and users/{uid}/items/{modelNumber}. The
 * localStorage cache keys sf_sales, sf_customers and sf_items are written on
 * the same debounce as before, and only as a cache - Firestore remains the
 * source of truth.
 */

/** Firestore allows 500 writes per batch. */
const BATCH_LIMIT = 500;

/** Parse the localStorage cache, tolerating absent or corrupt data. */
const readCache = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch (error) {
    console.error(`Could not read the ${key} cache:`, error);
    return [];
  }
};

/**
 * Write the cache at most once every 500ms, and drop a pending write if the
 * component goes away first. Without the cleanup a write queued just before a
 * logout would land after it, leaving the previous operator's rows in the cache
 * for whoever signs in next.
 */
const useDebouncedCache = <T,>(key: string) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return useCallback(
    (data: T[]) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        localStorage.setItem(key, JSON.stringify(data));
      }, 500);
    },
    [key]
  );
};

/** A document to write: its id under the collection and its fields. */
interface DocumentToWrite {
  id: string;
  data: DocumentData;
}

/** Commit writes in batches of 500, the Firestore limit. */
const writeInChunks = async <T,>(
  ref: CollectionReference<DocumentData>,
  entries: T[],
  toDocument: (entry: T) => DocumentToWrite
): Promise<void> => {
  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const entry of entries.slice(i, i + BATCH_LIMIT)) {
      const { id, data } = toDocument(entry);
      batch.set(doc(ref, id), data);
    }
    await batch.commit();
  }
};

/** Delete every document in a collection, in batches. */
const deleteAllInChunks = async (ref: CollectionReference<DocumentData>): Promise<void> => {
  const snapshot = await getDocs(ref);
  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const docSnap of snapshot.docs.slice(i, i + BATCH_LIMIT)) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
};

/** The next free invoice number, zero padded to four digits. */
const nextInvoiceNo = (sales: Sale[]): string => {
  const numbers = sales.map(sale => {
    const parts = sale.invoiceNo.split(' ');
    const parsed = parseInt(parts[parts.length - 1], 10);
    return isNaN(parsed) ? 0 : parsed;
  });
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return String(next).padStart(4, '0');
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);

  const [salesState, setSalesState] = useState<Sale[]>(() => readCache<Sale>('sf_sales'));
  const [salesLoadingState, setSalesLoadingState] = useState(true);
  const [salesError, setSalesError] = useState<Error | null>(null);

  const [customersState, setCustomersState] = useState<Customer[]>(() =>
    readCache<Customer>('sf_customers')
  );
  const [customersLoadingState, setCustomersLoadingState] = useState(true);
  const [customersError, setCustomersError] = useState<Error | null>(null);

  const [itemsState, setItemsState] = useState<Item[]>(() => readCache<Item>('sf_items'));
  const [itemsLoadingState, setItemsLoadingState] = useState(true);
  const [itemsError, setItemsError] = useState<Error | null>(null);

  const persistSales = useDebouncedCache<Sale>('sf_sales');
  const persistCustomers = useDebouncedCache<Customer>('sf_customers');
  const persistItems = useDebouncedCache<Item>('sf_items');

  /* ---------------------------------------------------------------- sales */
  useEffect(() => {
    // Nothing to subscribe to when signed out; the empty result and the settled
    // loading flag are derived below instead of being set from here.
    if (!user) return;

    const ref = collection(db, 'users', user.uid, 'sales');
    const unsubscribe = onSnapshot(
      query(ref, orderBy('invoiceNo', 'desc')),
      (snapshot) => {
        const list: Sale[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as SaleWithId);
        });
        persistSales(list);
        setSalesState(list);
        setSalesLoadingState(false);
      },
      (err) => {
        console.error('Error listening to sales:', err);
        setSalesError(err);
        setSalesLoadingState(false);
      }
    );

    return unsubscribe;
  }, [user, persistSales]);

  /* ------------------------------------------------------------ customers */
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, 'users', user.uid, 'customers');
    const unsubscribe = onSnapshot(
      query(ref),
      (snapshot) => {
        const list: Customer[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Customer);
        });
        list.sort((a, b) => a.customerName.localeCompare(b.customerName));
        persistCustomers(list);
        setCustomersState(list);
        setCustomersLoadingState(false);
      },
      (err) => {
        console.error('Error listening to customers:', err);
        setCustomersError(err);
        setCustomersLoadingState(false);
      }
    );

    return unsubscribe;
  }, [user, persistCustomers]);

  /* ---------------------------------------------------------------- items */
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, 'users', user.uid, 'items');
    const unsubscribe = onSnapshot(
      query(ref),
      (snapshot) => {
        const list: Item[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Item);
        });
        list.sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
        persistItems(list);
        setItemsState(list);
        setItemsLoadingState(false);
      },
      (err) => {
        console.error('Error listening to items:', err);
        setItemsError(err);
        setItemsLoadingState(false);
      }
    );

    return unsubscribe;
  }, [user, persistItems]);

  const requireUser = useCallback((): string => {
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }, [user]);

  /* --------------------------------------------------------- sales actions */
  const addSale = useCallback(
    async (sale: Omit<Sale, 'createdBy'>) => {
      const uid = requireUser();
      const completeSale: Sale = { ...sale, createdBy: uid };
      await setDoc(doc(db, 'users', uid, 'sales', sale.invoiceNo), completeSale);

      setSalesState((prev) => {
        const updated = [completeSale, ...prev.filter(s => s.invoiceNo !== completeSale.invoiceNo)];
        updated.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo));
        persistSales(updated);
        return updated;
      });
    },
    [requireUser, persistSales]
  );

  const updateSale = useCallback(
    async (sale: Omit<Sale, 'createdBy'>) => {
      const uid = requireUser();
      const completeSale: Sale = { ...sale, createdBy: uid };
      await setDoc(doc(db, 'users', uid, 'sales', sale.invoiceNo), completeSale);

      setSalesState((prev) => {
        const existingId = prev.find(s => s.invoiceNo === completeSale.invoiceNo)?.id;
        const merged: Sale = { ...completeSale, id: existingId ?? completeSale.invoiceNo };
        const updated = [merged, ...prev.filter(s => s.invoiceNo !== merged.invoiceNo)];
        updated.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo));
        persistSales(updated);
        return updated;
      });
    },
    [requireUser, persistSales]
  );

  const bulkAddSales = useCallback(
    async (saleList: Sale[]) => {
      const uid = requireUser();
      const ref = collection(db, 'users', uid, 'sales');
      await writeInChunks<Sale>(ref, saleList, sale => ({
        id: sale.invoiceNo,
        data: { ...sale, createdBy: uid },
      }));

      setSalesState((prev) => {
        const map = new Map(prev.map(s => [s.invoiceNo, s]));
        for (const sale of saleList) {
          map.set(sale.invoiceNo, {
            ...sale,
            createdBy: uid,
            id: map.get(sale.invoiceNo)?.id ?? sale.invoiceNo,
          });
        }
        const updated = Array.from(map.values());
        updated.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo));
        persistSales(updated);
        return updated;
      });
    },
    [requireUser, persistSales]
  );

  const clearAllSales = useCallback(async () => {
    const uid = requireUser();
    await deleteAllInChunks(collection(db, 'users', uid, 'sales'));
    setSalesState([]);
    localStorage.removeItem('sf_sales');
  }, [requireUser]);

  const deleteSale = useCallback(
    async (id: string) => {
      const uid = requireUser();
      await deleteDoc(doc(db, 'users', uid, 'sales', id));

      setSalesState((prev) => {
        const updated = prev.filter(s => s.invoiceNo !== id && s.id !== id);
        persistSales(updated);
        return updated;
      });
    },
    [requireUser, persistSales]
  );

  const generateNextInvoiceNo = useCallback(() => nextInvoiceNo(salesState), [salesState]);

  /* ----------------------------------------------------- customer actions */
  const addCustomer = useCallback(
    async (customer: Customer) => {
      const uid = requireUser();
      await setDoc(doc(db, 'users', uid, 'customers', customer.epfNumber), customer);

      setCustomersState((prev) => {
        const updated = [...prev.filter(c => c.epfNumber !== customer.epfNumber), customer];
        updated.sort((a, b) => a.customerName.localeCompare(b.customerName));
        persistCustomers(updated);
        return updated;
      });
    },
    [requireUser, persistCustomers]
  );

  const deleteCustomer = useCallback(
    async (epfNumber: string) => {
      const uid = requireUser();
      await deleteDoc(doc(db, 'users', uid, 'customers', epfNumber));

      setCustomersState((prev) => {
        const updated = prev.filter(c => c.epfNumber !== epfNumber);
        persistCustomers(updated);
        return updated;
      });
    },
    [requireUser, persistCustomers]
  );

  const bulkAddCustomers = useCallback(
    async (customerList: Customer[]) => {
      const uid = requireUser();
      const ref = collection(db, 'users', uid, 'customers');
      await writeInChunks<Customer>(ref, customerList, customer => ({
        id: customer.epfNumber,
        data: customer as DocumentData,
      }));

      setCustomersState((prev) => {
        const map = new Map(prev.map(c => [c.epfNumber, c]));
        for (const customer of customerList) map.set(customer.epfNumber, customer);
        const updated = Array.from(map.values());
        updated.sort((a, b) => a.customerName.localeCompare(b.customerName));
        persistCustomers(updated);
        return updated;
      });
    },
    [requireUser, persistCustomers]
  );

  const clearAllCustomers = useCallback(async () => {
    const uid = requireUser();
    await deleteAllInChunks(collection(db, 'users', uid, 'customers'));
    setCustomersState([]);
    localStorage.removeItem('sf_customers');
  }, [requireUser]);

  const searchCustomers = useCallback(
    async (queryText: string): Promise<Customer[]> => {
      if (!user || !queryText || queryText.length < 2) return [];

      try {
        const ref = collection(db, 'users', user.uid, 'customers');

        const byEpfQuery = query(
          ref,
          orderBy('epfNumber'),
          startAt(queryText),
          endAt(queryText + '\uf8ff'),
          limit(20)
        );
        const byEpfSnapshot = await getDocs(byEpfQuery);
        const byEpf: Customer[] = [];
        byEpfSnapshot.forEach((d) => byEpf.push(d.data() as Customer));

        if (byEpf.length >= 20) return byEpf;

        const byNameQuery = query(
          ref,
          orderBy('customerName'),
          startAt(queryText),
          endAt(queryText + '\uf8ff'),
          limit(20 - byEpf.length)
        );
        const byNameSnapshot = await getDocs(byNameQuery);
        const seen = new Set(byEpf.map(c => c.epfNumber));
        byNameSnapshot.forEach((d) => {
          const customer = d.data() as Customer;
          if (!seen.has(customer.epfNumber)) byEpf.push(customer);
        });

        return byEpf.slice(0, 20);
      } catch (err) {
        console.error('Error searching customers:', err);
        return [];
      }
    },
    [user]
  );

  /* ---------------------------------------------------------- item actions */
  const addItem = useCallback(
    async (item: Item) => {
      const uid = requireUser();
      const normalized = { ...item, modelNumber: item.modelNumber.toUpperCase() };
      await setDoc(doc(db, 'users', uid, 'items', normalized.modelNumber), normalized);

      setItemsState((prev) => {
        const updated = [...prev.filter(it => it.modelNumber !== normalized.modelNumber), normalized];
        updated.sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
        persistItems(updated);
        return updated;
      });
    },
    [requireUser, persistItems]
  );

  const deleteItem = useCallback(
    async (modelNumber: string) => {
      const uid = requireUser();
      const upperModel = modelNumber.toUpperCase();
      await deleteDoc(doc(db, 'users', uid, 'items', upperModel));

      setItemsState((prev) => {
        const updated = prev.filter(it => it.modelNumber !== upperModel);
        persistItems(updated);
        return updated;
      });
    },
    [requireUser, persistItems]
  );

  const bulkAddItems = useCallback(
    async (itemList: Item[]) => {
      const uid = requireUser();
      const ref = collection(db, 'users', uid, 'items');
      await writeInChunks<Item>(ref, itemList, item => {
        const modelNumber = item.modelNumber.toUpperCase();
        return { id: modelNumber, data: { ...item, modelNumber } };
      });

      setItemsState((prev) => {
        const map = new Map(prev.map(it => [it.modelNumber, it]));
        for (const item of itemList) {
          const normalized = { ...item, modelNumber: item.modelNumber.toUpperCase() };
          map.set(normalized.modelNumber, normalized);
        }
        const updated = Array.from(map.values());
        updated.sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
        persistItems(updated);
        return updated;
      });
    },
    [requireUser, persistItems]
  );

  const clearAllItems = useCallback(async () => {
    const uid = requireUser();
    await deleteAllInChunks(collection(db, 'users', uid, 'items'));
    setItemsState([]);
    localStorage.removeItem('sf_items');
  }, [requireUser]);

  const sales = useMemo<SalesContextValue>(
    () => ({
      sales: isSignedIn ? salesState : NO_SALES,
      loading: isSignedIn ? salesLoadingState : false,
      error: salesError,
      addSale,
      updateSale,
      bulkAddSales,
      clearAllSales,
      deleteSale,
      generateNextInvoiceNo,
    }),
    [
      isSignedIn, salesState, salesLoadingState, salesError,
      addSale, updateSale, bulkAddSales, clearAllSales, deleteSale, generateNextInvoiceNo,
    ]
  );

  const customers = useMemo<CustomersContextValue>(
    () => ({
      customers: isSignedIn ? customersState : NO_CUSTOMERS,
      loading: isSignedIn ? customersLoadingState : false,
      error: customersError,
      addCustomer,
      deleteCustomer,
      bulkAddCustomers,
      clearAllCustomers,
      searchCustomers,
    }),
    [
      isSignedIn, customersState, customersLoadingState, customersError,
      addCustomer, deleteCustomer, bulkAddCustomers, clearAllCustomers, searchCustomers,
    ]
  );

  const items = useMemo<ItemsContextValue>(
    () => ({
      items: isSignedIn ? itemsState : NO_ITEMS,
      loading: isSignedIn ? itemsLoadingState : false,
      error: itemsError,
      addItem,
      deleteItem,
      bulkAddItems,
      clearAllItems,
    }),
    [
      isSignedIn, itemsState, itemsLoadingState, itemsError,
      addItem, deleteItem, bulkAddItems, clearAllItems,
    ]
  );

  return (
    <SalesContext.Provider value={sales}>
      <CustomersContext.Provider value={customers}>
        <ItemsContext.Provider value={items}>{children}</ItemsContext.Provider>
      </CustomersContext.Provider>
    </SalesContext.Provider>
  );
};

export default DataProvider;
