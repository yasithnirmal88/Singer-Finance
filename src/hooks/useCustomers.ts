import { useContext } from 'react';
import { CustomersContext } from '../contexts/data-contexts';
import type { CustomersContextValue } from '../contexts/data-contexts';

/**
 * Customer data and actions for the signed-in operator, owned by
 * <DataProvider>. See {@link useSales}.
 */
export const useCustomers = (): CustomersContextValue => {
  const context = useContext(CustomersContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a DataProvider');
  }
  return context;
};
