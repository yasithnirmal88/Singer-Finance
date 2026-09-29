import { useContext } from 'react';
import { SalesContext } from '../contexts/data-contexts';
import type { SalesContextValue } from '../contexts/data-contexts';

/**
 * Sales data and actions for the signed-in operator.
 *
 * The data is owned by <DataProvider>, which holds the single Firestore
 * subscription. This hook only reads the context, so mounting several screens
 * that need sales costs nothing extra.
 */
export const useSales = (): SalesContextValue => {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error('useSales must be used within a DataProvider');
  }
  return context;
};
