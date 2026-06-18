import { useEffect, useState } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Sale } from '../types';

export const useSales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setSales([]);
      setLoading(false);
      return;
    }

    // Scoped to /users/{uid}/sales
    const salesRef = collection(db, 'users', user.uid, 'sales');
    const q = query(salesRef, orderBy('invoiceNo', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Sale[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Sale);
        });
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
  }, [user]);

  const addSale = async (sale: Omit<Sale, 'createdBy'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const salesRef = collection(db, 'users', user.uid, 'sales');
    const docRef = doc(salesRef, sale.invoiceNo); // invoiceNo as document ID
    
    const completeSale: Sale = {
      ...sale,
      createdBy: user.uid,
    };
    
    await setDoc(docRef, completeSale);
  };

  const deleteSale = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    const docRef = doc(db, 'users', user.uid, 'sales', id);
    await deleteDoc(docRef);
  };

  // Helper to generate the next invoice number based on local state (for real-time consistency)
  const generateNextInvoiceNo = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `SF-${year}${month}${day}-`;

    // Filter sales that match today's date prefix
    const todaySales = sales.filter((s) => s.invoiceNo.startsWith(prefix));
    
    let nextNum = 1;
    if (todaySales.length > 0) {
      const numbers = todaySales.map((s) => {
        const parts = s.invoiceNo.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        return isNaN(num) ? 0 : num;
      });
      nextNum = Math.max(...numbers) + 1;
    }

    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  };

  return { sales, loading, error, addSale, deleteSale, generateNextInvoiceNo };
};
