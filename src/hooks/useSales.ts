import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/useAuth';
import type { Sale, SaleWithId } from '../types';

/** Stable identity for the signed-out case, so consumers see a consistent empty array. */
const NO_SALES: Sale[] = [];

export const useSales = () => {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);
  const [salesState, setSalesState] = useState<Sale[]>(() => {
    const local = localStorage.getItem('sf_sales');
    return local ? (JSON.parse(local) as Sale[]) : [];
  });
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSales = useCallback((data: Sale[]) => {
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(() => {
      localStorage.setItem('sf_sales', JSON.stringify(data));
    }, 500);
  }, []);

  useEffect(() => {
    // With no user there is no collection to subscribe to. The empty result and
    // the settled loading flag are derived below rather than set here, which
    // would cascade an extra render.
    if (!user) return;

    const salesRef = collection(db, 'users', user.uid, 'sales');
    const q = query(salesRef, orderBy('invoiceNo', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Sale[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as SaleWithId);
        });
        persistSales(list);
        setSalesState(list);
        setLoadingState(false);
      },
      (err) => {
        console.error('Error listening to sales:', err);
        setError(err);
        setLoadingState(false);
      }
    );

    return unsubscribe;
  }, [user, persistSales]);

  const sales = isSignedIn ? salesState : NO_SALES;
  const loading = isSignedIn ? loadingState : false;

  const addSale = async (sale: Omit<Sale, 'createdBy'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const salesRef = collection(db, 'users', user.uid, 'sales');
    const docRef = doc(salesRef, sale.invoiceNo);
    
    const completeSale: Sale = {
      ...sale,
      createdBy: user.uid,
    };
    
    await setDoc(docRef, completeSale);

    setSalesState((prev) => {
      const updated = [completeSale, ...prev.filter(s => s.invoiceNo !== completeSale.invoiceNo)];
      updated.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo));
      persistSales(updated);
      return updated;
    });
  };

  const updateSale = async (sale: Omit<Sale, 'createdBy'>) => {
    if (!user) throw new Error('User not authenticated');

    const docRef = doc(db, 'users', user.uid, 'sales', sale.invoiceNo);

    const completeSale: Sale = {
      ...sale,
      createdBy: user.uid,
    };

    await setDoc(docRef, completeSale);

    setSalesState((prev) => {
      const existingId = prev.find(s => s.invoiceNo === completeSale.invoiceNo)?.id;
      const merged: Sale = { ...completeSale, id: existingId ?? completeSale.invoiceNo };
      const updated = [merged, ...prev.filter(s => s.invoiceNo !== merged.invoiceNo)];
      updated.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo));
      persistSales(updated);
      return updated;
    });
  };

  const bulkAddSales = async (saleList: Sale[]) => {
    if (!user) throw new Error('User not authenticated');

    const chunkSize = 500;
    for (let i = 0; i < saleList.length; i += chunkSize) {
      const chunk = saleList.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach((sale) => {
        batch.set(doc(db, 'users', user.uid, 'sales', sale.invoiceNo), { ...sale, createdBy: user.uid });
      });

      await batch.commit();
    }

    setSalesState((prev) => {
      const map = new Map(prev.map(s => [s.invoiceNo, s]));
      saleList.forEach(sale => {
        map.set(sale.invoiceNo, {
          ...sale,
          createdBy: user.uid,
          id: map.get(sale.invoiceNo)?.id ?? sale.invoiceNo,
        });
      });
      const updated = Array.from(map.values());
      updated.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo));
      persistSales(updated);
      return updated;
    });
  };

  const clearAllSales = async () => {
    if (!user) throw new Error('User not authenticated');

    const salesRef = collection(db, 'users', user.uid, 'sales');
    const snapshot = await getDocs(salesRef);
    const docs = snapshot.docs;

    const chunkSize = 500;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
    }

    setSalesState([]);
    localStorage.removeItem('sf_sales');
  };

  const deleteSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    const docRef = doc(db, 'users', user.uid, 'sales', id);
    await deleteDoc(docRef);

    setSalesState((prev) => {
      const updated = prev.filter((s) => s.invoiceNo !== id && s.id !== id);
      persistSales(updated);
      return updated;
    });
  };

  const generateNextInvoiceNo = () => {
    const prefix = '';

    const existing = sales.filter((s) => s.invoiceNo.startsWith(prefix));
    
    let nextNum = 1;
    if (existing.length > 0) {
      const numbers = existing.map((s) => {
        const parts = s.invoiceNo.split(' ');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        return isNaN(num) ? 0 : num;
      });
      nextNum = Math.max(...numbers) + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  };

  return { sales, loading, error, addSale, updateSale, bulkAddSales, clearAllSales, deleteSale, generateNextInvoiceNo };
};
