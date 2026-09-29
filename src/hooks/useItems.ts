import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/useAuth';
import type { Item } from '../types';

/** Stable identity for the signed-out case, so consumers see a consistent empty array. */
const NO_ITEMS: Item[] = [];

export const useItems = () => {
  const { user } = useAuth();
  const isSignedIn = Boolean(user);
  const [itemsState, setItemsState] = useState<Item[]>(() => {
    const local = localStorage.getItem('sf_items');
    return local ? (JSON.parse(local) as Item[]) : [];
  });
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistItems = useCallback((data: Item[]) => {
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(() => {
      localStorage.setItem('sf_items', JSON.stringify(data));
    }, 500);
  }, []);

  useEffect(() => {
    // With no user there is no collection to subscribe to. The empty result and
    // the settled loading flag are derived below rather than set here, which
    // would cascade an extra render.
    if (!user) return;

    const itemsRef = collection(db, 'users', user.uid, 'items');
    const q = query(itemsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Item[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Item);
        });
        list.sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
        persistItems(list);
        setItemsState(list);
        setLoadingState(false);
      },
      (err) => {
        console.error('Error listening to items:', err);
        setError(err);
        setLoadingState(false);
      }
    );

    return unsubscribe;
  }, [user, persistItems]);

  const items = isSignedIn ? itemsState : NO_ITEMS;
  const loading = isSignedIn ? loadingState : false;

  const addItem = async (item: Item) => {
    if (!user) throw new Error('User not authenticated');
    const normalizedItem = { ...item, modelNumber: item.modelNumber.toUpperCase() };
    const docRef = doc(db, 'users', user.uid, 'items', normalizedItem.modelNumber);
    await setDoc(docRef, normalizedItem);

    setItemsState((prev) => {
      const updated = [...prev.filter(it => it.modelNumber !== normalizedItem.modelNumber), normalizedItem];
      updated.sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
      persistItems(updated);
      return updated;
    });
  };

  const deleteItem = async (modelNumber: string) => {
    if (!user) throw new Error('User not authenticated');
    const upperModel = modelNumber.toUpperCase();
    const docRef = doc(db, 'users', user.uid, 'items', upperModel);
    await deleteDoc(docRef);

    setItemsState((prev) => {
      const updated = prev.filter((it) => it.modelNumber !== upperModel);
      persistItems(updated);
      return updated;
    });
  };

  const bulkAddItems = async (itemList: Item[]) => {
    if (!user) throw new Error('User not authenticated');
    
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

    setItemsState((prev) => {
      const map = new Map(prev.map(it => [it.modelNumber, it]));
      itemList.forEach(item => {
        const normalized = { ...item, modelNumber: item.modelNumber.toUpperCase() };
        map.set(normalized.modelNumber, normalized);
      });
      const updated = Array.from(map.values());
      updated.sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
      persistItems(updated);
      return updated;
    });
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

    setItemsState([]);
    localStorage.removeItem('sf_items');
  };

  return { items, loading, error, addItem, deleteItem, bulkAddItems, clearAllItems };
};
