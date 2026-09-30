import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthProvider from './AuthProvider';
import DataProvider from './DataProvider';
import { AuthContext } from './auth-context';
import { useSales } from '../hooks/useSales';
import { seed, getStored, failWrites, calls } from '../test/stubs/firestore';
import type { Sale } from '../types';

const sale = (invoiceNo: string, overrides: Partial<Sale> = {}): Sale => ({
  id: invoiceNo,
  invoiceNo,
  date: '2024-01-15',
  epfNumber: `EPF-${invoiceNo}`,
  customerName: `Customer ${invoiceNo}`,
  institution: 'General Hospital',
  contactNumber: '0711234567',
  nic: '199012345678',
  items: [
    { itemName: 'Refrigerator', modelNumber: 'SIS-REF-01', cashPrice: 85000, rental: 4200, term: 12 },
  ],
  totalCashPrice: 85000,
  totalRentalMonthly: 4200,
  overallTerm: 12,
  interestRate: 0.10146,
  createdBy: 'owner',
  ...overrides,
});

function Probe() {
  const sales = useSales();
  const auth = React.useContext(AuthContext)!;

  const run = (action: () => Promise<unknown>) => () => {
    action().catch(() => {
      /* a deliberately failing write is asserted via state/store, not thrown */
    });
  };

  const add = run(() =>
    sales.addSale({
      invoiceNo: '0009',
      date: '2024-01-15',
      epfNumber: 'EPF-009',
      customerName: 'Nine',
      institution: 'General Hospital',
      contactNumber: '0710000009',
      items: [{ itemName: 'Fan', modelNumber: 'SIS-FAN-9', cashPrice: 1000, rental: 100, term: 12 }],
      totalCashPrice: 1000,
      totalRentalMonthly: 100,
      overallTerm: 12,
      interestRate: 0.10146,
    })
  );

  const bulk = run(() =>
    sales.bulkAddSales([sale('0007', { customerName: 'Seven' }), sale('0008', { customerName: 'Eight' })])
  );

  const update = run(() =>
    sales.updateSale({
      invoiceNo: '0001',
      date: '2024-01-15',
      epfNumber: 'EPF-001',
      customerName: 'Renamed',
      institution: 'General Hospital',
      contactNumber: '0711234567',
      items: [{ itemName: 'Refrigerator', modelNumber: 'SIS-REF-01', cashPrice: 85000, rental: 4200, term: 12 }],
      totalCashPrice: 85000,
      totalRentalMonthly: 4200,
      overallTerm: 12,
      interestRate: 0.10146,
    })
  );

  return (
    <div>
      <output aria-label="count">{sales.sales.length}</output>
      <ul aria-label="invoices">
        {sales.sales.map(s => (
          <li key={s.invoiceNo} data-name={s.customerName}>
            {s.invoiceNo}
          </li>
        ))}
      </ul>
      <button onClick={add}>add</button>
      <button onClick={bulk}>bulk</button>
      <button onClick={update}>update</button>
      <button onClick={() => sales.deleteSale('0001')}>delete</button>
      <button onClick={() => sales.clearAllSales()}>clear</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

const renderApp = () =>
  render(
    <AuthProvider>
      <DataProvider>
        <Probe />
      </DataProvider>
    </AuthProvider>
  );

const storedSales = () => getStored()['users/test-uid/sales'] ?? {};

describe('DataProvider', () => {
  it('subscribes once per collection and loads the snapshot into state', async () => {
    seed('users/test-uid/sales', { '0001': sale('0001'), '0002': sale('0002') });
    renderApp();

    expect(await screen.findByText('0001')).toBeInTheDocument();
    expect(screen.getByText('0002')).toBeInTheDocument();
    expect(screen.getByLabelText('count').textContent).toBe('2');
    expect(calls.onSnapshot).toBe(3);
  });

  it('does not subscribe again when state changes', async () => {
    seed('users/test-uid/sales', { '0001': sale('0001') });
    renderApp();
    await screen.findByText('0001');

    fireEvent.click(screen.getByText('add'));
    await screen.findByText('0009');

    expect(calls.onSnapshot).toBe(3);
  });

  it('addSale writes the document with the operator id and surfaces it locally', async () => {
    renderApp();
    fireEvent.click(screen.getByText('add'));

    expect(await screen.findByText('0009')).toBeInTheDocument();
    await waitFor(() =>
      expect(storedSales()['0009']).toMatchObject({ invoiceNo: '0009', createdBy: 'test-uid' })
    );
    expect(screen.getByLabelText('count').textContent).toBe('1');
  });

  it('bulkAddSales commits one batch with several invoices', async () => {
    renderApp();
    fireEvent.click(screen.getByText('bulk'));

    expect(await screen.findByText('0007')).toBeInTheDocument();
    expect(screen.getByText('0008')).toBeInTheDocument();
    await waitFor(() => expect(calls.commit).toBeGreaterThanOrEqual(1));
    expect(Object.keys(storedSales()).sort()).toEqual(['0007', '0008']);
  });

  it('updateSale replaces the existing document and row', async () => {
    seed('users/test-uid/sales', { '0001': sale('0001') });
    renderApp();
    await screen.findByText('0001');

    fireEvent.click(screen.getByText('update'));

    await waitFor(() =>
      expect(screen.getByText('0001').closest('li')?.getAttribute('data-name')).toBe('Renamed')
    );
    expect(storedSales()['0001']).toMatchObject({ customerName: 'Renamed' });
    expect(Object.keys(storedSales())).toEqual(['0001']);
  });

  it('deleteSale removes the document and the row', async () => {
    seed('users/test-uid/sales', { '0001': sale('0001') });
    renderApp();
    await screen.findByText('0001');

    fireEvent.click(screen.getByText('delete'));

    await waitFor(() => expect(screen.queryByText('0001')).not.toBeInTheDocument());
    expect(storedSales()['0001']).toBeUndefined();
  });

  it('clearAllSales empties the collection and the cache', async () => {
    seed('users/test-uid/sales', { '0001': sale('0001'), '0002': sale('0002') });
    renderApp();
    await screen.findByText('0001');

    fireEvent.click(screen.getByText('clear'));

    await waitFor(() => expect(screen.getByLabelText('count').textContent).toBe('0'));
    expect(storedSales()).toEqual({});
    expect(localStorage.getItem('sf_sales')).toBeNull();
  });

  it('leaves the collection untouched when a batch write fails', async () => {
    seed('users/test-uid/sales', { '0001': sale('0001') });
    renderApp();
    await screen.findByText('0001');

    failWrites(1);
    fireEvent.click(screen.getByText('bulk'));

    await waitFor(() => expect(screen.getByLabelText('count').textContent).toBe('1'));
    expect(screen.queryByText('0007')).not.toBeInTheDocument();
    expect(Object.keys(storedSales())).toEqual(['0001']);
  });

  it('persists the sales cache on a debounce', async () => {
    renderApp();
    fireEvent.click(screen.getByText('add'));

    expect(await screen.findByText('0009')).toBeInTheDocument();
    await waitFor(
      () => {
        const cached = JSON.parse(localStorage.getItem('sf_sales') ?? '[]') as Sale[];
        expect(cached.some(s => s.invoiceNo === '0009')).toBe(true);
      },
      { timeout: 2000 }
    );
  });

  it('shows the empty collections for a signed-out user', async () => {
    seed('users/test-uid/sales', { '0001': sale('0001') });
    renderApp();
    await screen.findByText('0001');

    fireEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByLabelText('count').textContent).toBe('0'));
    expect(screen.queryByText('0001')).not.toBeInTheDocument();
  });
});