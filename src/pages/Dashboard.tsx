import React, { useState } from 'react';
import AppLayout from '../components/Layout/AppLayout';
import NewSalePage from '../components/NewSale/NewSalePage';
import CustomersPage from '../components/Customers/CustomersPage';
import ItemsPage from '../components/Items/ItemsPage';
import SalesHistoryPage from '../components/SalesHistory/SalesHistoryPage';
import DataManagement from '../components/DataManagement/DataManagement';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sale');

  const renderContent = () => {
    switch (activeTab) {
      case 'sale':
        return <NewSalePage />;
      case 'customers':
        return <CustomersPage />;
      case 'items':
        return <ItemsPage />;
      case 'history':
        return <SalesHistoryPage />;
      case 'data':
        return <DataManagement />;
      default:
        return <NewSalePage />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </AppLayout>
  );
};
export default Dashboard;
