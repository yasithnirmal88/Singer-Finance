import { useContext } from 'react';
import { ItemsContext } from '../contexts/data-contexts';
import type { ItemsContextValue } from '../contexts/data-contexts';

/**
 * Item data and actions for the signed-in operator, owned by <DataProvider>.
 * See {@link useSales}.
 */
export const useItems = (): ItemsContextValue => {
  const context = useContext(ItemsContext);
  if (context === undefined) {
    throw new Error('useItems must be used within a DataProvider');
  }
  return context;
};
