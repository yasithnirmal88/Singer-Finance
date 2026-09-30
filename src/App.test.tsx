import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import AuthProvider from './contexts/AuthProvider';
import DataProvider from './contexts/DataProvider';
import { AppRoutes } from './App';

const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

describe('AppRoutes', () => {
  it('redirects a signed-in user away from the login screen', () => {
    renderAt('/login');
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  it('renders a deep link straight to the sales history', async () => {
    renderAt('/history');
    expect(await screen.findByText('Sales History Logs')).toBeInTheDocument();
  });

  it('renders the customers screen from its url', async () => {
    renderAt('/customers');
    expect(await screen.findByText('Saved Customers List')).toBeInTheDocument();
  });

  it('renders the items screen from its url', async () => {
    renderAt('/items');
    expect(await screen.findByText('Saved Items List')).toBeInTheDocument();
  });

  it('falls back to the dashboard for an unknown path', async () => {
    renderAt('/definitely-not-a-route');
    expect(await screen.findByText('New Sale Form')).toBeInTheDocument();
  });
});