import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Sale } from '../types';

export const useSales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>(() => {
    const local = localStorage.getItem('sf_sales');
    return local ? JSON.parse(local) : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSales = useCallback((data: Sale[]) => {
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(() => {
      localStorage.setItem('sf_sales', JSON.stringify(data));
    }, 500);
  }, []);

  useEffect(() => {
    if (!user) {
      setSales([]);
      setLoading(false);
      return;
    }

    const salesRef = collection(db, 'users', user.uid, 'sales');
    const q = query(salesRef, orderBy('invoiceNo', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Sale[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Sale);
        });
        persistSales(list);
        setSales(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to sales:', err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, persistSales]);

  const addSale = async (sale: Omit<Sale, 'createdBy'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const salesRef = collection(db, 'users', user.uid, 'sales');
    const docRef = doc(salesRef, sale.invoiceNo);
    
    const completeSale: Sale = {
      ...sale,
      createdBy: user.uid,
    };
    
    await setDoc(docRef, completeSale);

    setSales((prev) => {
      const updated = [completeSale, ...prev.filter(s => s.invoiceNo !== completeSale.invoiceNo)];
      updated.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo));
      persistSales(updated);
      return updated;
    });
  };

  const deleteSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    const docRef = doc(db, 'users', user.uid, 'sales', id);
    await deleteDoc(docRef);

    setSales((prev) => {
      const updated = prev.filter((s) => s.invoiceNo !== id && s.id !== id);
      persistSales(updated);
      return updated;
    });
  };

  const generateNextInvoiceNo = () => {
    const prefix = 'U ';

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

  return { sales, loading, error, addSale, deleteSale, generateNextInvoiceNo };
};
