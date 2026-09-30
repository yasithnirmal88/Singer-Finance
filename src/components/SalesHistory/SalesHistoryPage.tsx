import React, { useMemo, useState } from 'react';
import { Button, Card, Space, Modal, Input, message } from 'antd';
import {
  SearchOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { useSales } from '../../hooks/useSales';
import { usePrintSale } from '../../hooks/usePrintSale';
import type { Sale } from '../../types';
import { downloadExcel } from '../../utils/excel';
import { buildSalesExportRows } from '../../utils/salesSheet';
import PrintLayout from '../Print/PrintLayout';
import EditSaleModal from './EditSaleModal';
import { SalesSummary } from './SalesSummary';
import SalesHistoryTable from './SalesHistoryTable';
import SaleDetailsModal from './SaleDetailsModal';
import SalesRestoreCard from './SalesRestoreCard';

export const SalesHistoryPage: React.FC = () => {
  const { sales, loading, deleteSale, clearAllSales } = useSales();
  const { printSaleData, printSale } = usePrintSale();
  const [searchText, setSearchText] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await deleteSale(id);
      message.success('Sale record deleted successfully.');
    } catch (error) {
      console.error(error);
      message.error('Failed to delete sale record.');
    }
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsModalVisible(true);
  };

  const handleEdit = (sale: Sale) => {
    setEditSale(sale);
    setEditModalVisible(true);
  };

  const exportSalesToExcel = (fileNamePrefix = 'singer_sales_report', notify = true) => {
    if (sales.length === 0) {
      if (notify) message.warning('No sales records to export.');
      return false;
    }

    downloadExcel(buildSalesExportRows(sales), `${fileNamePrefix}_${Date.now()}.xlsx`, {
      sheetName: 'Sales Records',
      autoFit: true,
    });
    if (notify) message.success('Excel export completed successfully!');
    return true;
  };

  const handleExportExcel = () => {
    exportSalesToExcel();
  };

  const handleClearAllHistory = () => {
    if (sales.length === 0) {
      message.warning('There are no sales history records to delete.');
      return;
    }

    Modal.confirm({
      title: 'Delete Complete Sales History',
      icon: <ExclamationCircleFilled className="text-red-500" />,
      width: 520,
      okText: 'Yes, Delete Everything',
      cancelText: 'No',
      okButtonProps: { danger: true },
      content: (
        <div className="space-y-2 pt-1">
          <p>
            You are about to <span className="font-bold text-red-600">permanently delete all {sales.length} sales
            history records</span>. This action cannot be undone.
          </p>
          <p className="text-slate-500">
            As a safety fallback, a full Excel backup of your sales history will be downloaded automatically before
            the deletion starts, so you can restore the data later.
          </p>
        </div>
      ),
      onOk: async () => {
        setClearing(true);
        try {
          const backedUp = exportSalesToExcel('singer_sales_backup', false);
          if (backedUp) {
            message.info('Excel backup downloaded. Deleting sales history...', 2);
          }
          await clearAllSales();
          message.success(backedUp
            ? 'All sales history records deleted. A backup was saved to your downloads.'
            : 'All sales history records deleted.');
        } catch (error) {
          console.error(error);
          message.error('Failed to delete sales history.');
          throw error;
        } finally {
          setClearing(false);
        }
      },
    });
  };

  // Filter sales based on search text
  const filteredSales = useMemo(
    () =>
      sales.filter(s =>
        s.invoiceNo.toLowerCase().includes(searchText.toLowerCase()) ||
        s.epfNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
        s.institution.toLowerCase().includes(searchText.toLowerCase())
      ),
    [sales, searchText]
  );

  return (
    <div className="space-y-6">
      {/* Print component - Hidden on screen */}
      {printSaleData && <PrintLayout saleData={printSaleData} />}

      <Card
        bordered={false}
        className="shadow-sm rounded-xl no-print"
        title="Sales History Logs"
        extra={
          <Space size="middle">
            <Input
              placeholder="Search records..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              loading={clearing}
              className="bg-emerald-600 hover:bg-emerald-500 border-none"
            >
              Export Excel
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleClearAllHistory}
              loading={clearing}
              disabled={sales.length === 0 || importing}
              className="hover:border-red-600 hover:text-red-600"
            >
              Delete All History
            </Button>
          </Space>
        }
      >
        <SalesHistoryTable
          sales={filteredSales}
          loading={loading}
          onView={handleViewDetails}
          onEdit={handleEdit}
          onPrint={printSale}
          onDelete={handleDelete}
        />
      </Card>

      {/* Sales history summary. Reflects the current search when one is active. */}
      <SalesSummary
        sales={filteredSales}
        totalCount={sales.length}
        loading={loading}
        searchText={searchText}
      />

      {/* Restore Sales History from Excel */}
      <SalesRestoreCard clearing={clearing} onImportingChange={setImporting} />

      {/* Edit Sale Modal */}
      {editModalVisible && editSale && (
        <EditSaleModal
          key={editSale.invoiceNo}
          open
          sale={editSale}
          onClose={() => {
            setEditModalVisible(false);
            setEditSale(null);
          }}
        />
      )}

      {/* Sale Details Modal */}
      <SaleDetailsModal
        sale={selectedSale}
        open={detailsModalVisible}
        onClose={() => setDetailsModalVisible(false)}
        onPrint={printSale}
      />
    </div>
  );
};
export default SalesHistoryPage;