import { useEffect, useState } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Item } from '../types';

export const useItems = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Scoped to /users/{uid}/items
    const itemsRef = collection(db, 'users', user.uid, 'items');
    const q = query(itemsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Item[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Item);
        });
        // Sort items alphabetically by modelNumber
        list.sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to items:', err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const addItem = async (item: Item) => {
    if (!user) throw new Error('User not authenticated');
    // modelNumber is the unique string (primary key)
    const docRef = doc(db, 'users', user.uid, 'items', item.modelNumber.toUpperCase());
    await setDoc(docRef, { ...item, modelNumber: item.modelNumber.toUpperCase() });
  };

  const deleteItem = async (modelNumber: string) => {
    if (!user) throw new Error('User not authenticated');
    const docRef = doc(db, 'users', user.uid, 'items', modelNumber.toUpperCase());
    await deleteDoc(docRef);
  };

  const bulkAddItems = async (itemList: Item[]) => {
    if (!user) throw new Error('User not authenticated');
    
    // Chunk into batches of 500 documents
    const chunkSize = 500;
    for (let i = 0; i < itemList.length; i += chunkSize) {
      const chunk = itemList.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      chunk.forEach((item) => {
        const docRef = doc(db, 'users', user.uid, 'items', item.modelNumber.toUpperCase());
        batch.set(docRef, { ...item, modelNumber: item.modelNumber.toUpperCase() });
      });
      
      await batch.commit();
    }
  };

  const clearAllItems = async () => {
    if (!user) throw new Error('User not authenticated');
    
    const itemsRef = collection(db, 'users', user.uid, 'items');
    const snapshot = await getDocs(itemsRef);
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

  return { items, loading, error, addItem, deleteItem, bulkAddItems, clearAllItems };
};
