import { useEffect, useState } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Customer } from '../types';

export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    // Scoped to /users/{uid}/customers
    const customersRef = collection(db, 'users', user.uid, 'customers');
    const q = query(customersRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Customer[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Customer);
        });
        // Sort customers alphabetically by customerName
        list.sort((a, b) => a.customerName.localeCompare(b.customerName));
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
  }, [user]);

  const addCustomer = async (customer: Customer) => {
    if (!user) throw new Error('User not authenticated');
    // epfNumber is the unique string (primary key)
    const docRef = doc(db, 'users', user.uid, 'customers', customer.epfNumber);
    await setDoc(docRef, customer);
  };

  const deleteCustomer = async (epfNumber: string) => {
    if (!user) throw new Error('User not authenticated');
    const docRef = doc(db, 'users', user.uid, 'customers', epfNumber);
    await deleteDoc(docRef);
  };

  const bulkAddCustomers = async (customerList: Customer[]) => {
    if (!user) throw new Error('User not authenticated');
    
    // Chunk into batches of 500 documents
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
  };

  return { customers, loading, error, addCustomer, deleteCustomer, bulkAddCustomers, clearAllCustomers };
};
