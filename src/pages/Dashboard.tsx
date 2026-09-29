import React from 'react';
import AppLayout from '../components/Layout/AppLayout';

/**
 * The route at "/": the shell around every authenticated screen. Which screen
 * fills it is decided by the URL, not by state here.
 */
export const Dashboard: React.FC = () => {
  return <AppLayout />;
};
export default Dashboard;
