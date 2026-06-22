import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch, getDocs, orderBy, startAt, endAt, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Customer } from '../types';

export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const local = localStorage.getItem('sf_customers');
    return local ? JSON.parse(local) : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistCustomers = useCallback((data: Customer[]) => {
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(() => {
      localStorage.setItem('sf_customers', JSON.stringify(data));
    }, 500);
  }, []);

  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const customersRef = collection(db, 'users', user.uid, 'customers');
    const q = query(customersRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Customer[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Customer);
        });
        list.sort((a, b) => a.customerName.localeCompare(b.customerName));
        persistCustomers(list);
        setCustomers(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to customers:', err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, persistCustomers]);

  const searchCustomers = useCallback(async (query_text: string): Promise<Customer[]> => {
    if (!user || !query_text || query_text.length < 2) return [];

    try {
      const customersRef = collection(db, 'users', user.uid, 'customers');

      const q1 = query(
        customersRef,
        orderBy('epfNumber'),
        startAt(query_text),
        endAt(query_text + '\uf8ff'),
        limit(20)
      );
      const snap1 = await getDocs(q1);
      const byEpf: Customer[] = [];
      snap1.forEach((d) => byEpf.push(d.data() as Customer));

      if (byEpf.length >= 20) return byEpf;

      const q2 = query(
        customersRef,
        orderBy('customerName'),
        startAt(query_text),
        endAt(query_text + '\uf8ff'),
        limit(20 - byEpf.length)
      );
      const snap2 = await getDocs(q2);
      const seen = new Set(byEpf.map((c) => c.epfNumber));
      snap2.forEach((d) => {
        const c = d.data() as Customer;
        if (!seen.has(c.epfNumber)) byEpf.push(c);
      });

      return byEpf.slice(0, 20);
    } catch (err) {
      console.error('Error searching customers:', err);
      return [];
    }
  }, [user]);

  const addCustomer = async (customer: Customer) => {
    if (!user) throw new Error('User not authenticated');
    const docRef = doc(db, 'users', user.uid, 'customers', customer.epfNumber);
    await setDoc(docRef, customer);

    setCustomers((prev) => {
      const updated = [...prev.filter(c => c.epfNumber !== customer.epfNumber), customer];
      updated.sort((a, b) => a.customerName.localeCompare(b.customerName));
      persistCustomers(updated);
      return updated;
    });
  };

  const deleteCustomer = async (epfNumber: string) => {
    if (!user) throw new Error('User not authenticated');
    const docRef = doc(db, 'users', user.uid, 'customers', epfNumber);
    await deleteDoc(docRef);

    setCustomers((prev) => {
      const updated = prev.filter((c) => c.epfNumber !== epfNumber);
      persistCustomers(updated);
      return updated;
    });
  };

  const bulkAddCustomers = async (customerList: Customer[]) => {
    if (!user) throw new Error('User not authenticated');
    
    const chunkSize = 500;
    for (let i = 0; i < customerList.length; i += chunkSize) {
      const chunk = customerList.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      chunk.forEach((cust) => {
        const docRef = doc(db, 'users', user.uid, 'customers', cust.epfNumber);
        batch.set(docRef, cust);
      });
      
      await batch.commit();
    }

    setCustomers((prev) => {
      const map = new Map(prev.map(c => [c.epfNumber, c]));
      customerList.forEach(c => map.set(c.epfNumber, c));
      const updated = Array.from(map.values());
      updated.sort((a, b) => a.customerName.localeCompare(b.customerName));
      persistCustomers(updated);
      return updated;
    });
  };

  const clearAllCustomers = async () => {
    if (!user) throw new Error('User not authenticated');
    
    const customersRef = collection(db, 'users', user.uid, 'customers');
    const snapshot = await getDocs(customersRef);
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

    setCustomers([]);
    localStorage.removeItem('sf_customers');
  };

  return { customers, loading, error, addCustomer, deleteCustomer, bulkAddCustomers, clearAllCustomers, searchCustomers };
};
