import React, { useMemo, useState } from 'react';
import { Button, ConfigProvider, Modal, Input, message } from 'antd';
import {
  SearchOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  DatabaseOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useSales } from '../../hooks/useSales';
import { usePrintSale } from '../../hooks/usePrintSale';
import type { Sale } from '../../types';
import { downloadExcel } from '../../utils/excel';
import { formatCount, formatMoney } from '../../utils/format';
import { buildSalesExportRows } from '../../utils/salesSheet';
import PrintLayout from '../Print/PrintLayout';
import EditSaleModal from './EditSaleModal';
import { SalesSummary } from './SalesSummary';
import SalesHistoryTable from './SalesHistoryTable';
import SaleDetailsModal from './SaleDetailsModal';
import SalesRestoreCard from './SalesRestoreCard';
import './SalesHistory.css';

/** Accent used by this page's buttons, focus rings and highlights. Use '#d6073b' for the Singer red. */
const ACCENT = '#2563eb';

/** Same rule as SalesSummary, so the two panels can never disagree. */
const cashValueOf = (sale: Sale) => {
  if (!sale.items || sale.items.length === 0) return Number(sale.totalCashPrice) || 0;
  return sale.items.reduce((sum, item) => sum + (Number(item.cashPrice) || 0), 0);
};

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

  const totalCash = filteredSales.reduce((sum, sale) => sum + cashValueOf(sale), 0);
  const totalRental = filteredSales.reduce((sum, sale) => sum + (Number(sale.totalRentalMonthly) || 0), 0);
  const isFiltered = searchText.trim().length > 0;

  const stats = [
    {
      key: 'records',
      tone: 'blue',
      icon: <FileTextOutlined />,
      label: 'Total Records',
      value: formatCount(filteredSales.length),
      note: isFiltered ? `of ${formatCount(sales.length)} in total` : undefined,
    },
    { key: 'cash', tone: 'green', icon: <DatabaseOutlined />, label: 'Total Cash Sales', value: formatMoney(totalCash) },
    { key: 'rental', tone: 'purple', icon: <CalendarOutlined />, label: 'Total Monthly Rental', value: formatMoney(totalRental) },
  ];

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: ACCENT, borderRadius: 8 },
        components: {
          Table: {
            headerBg: '#f0f5fc',
            headerColor: '#334155',
            headerSplitColor: 'transparent',
            headerBorderRadius: 10,
            rowHoverBg: '#f5f8fe',
            borderColor: '#eef0f5',
            cellPaddingBlock: 14,
          },
        },
      }}
    >
      {/* Print component - Hidden on screen */}
      {printSaleData && <PrintLayout saleData={printSaleData} />}

      <div className="sh-root no-print">
        <header className="sh-head">
          <span className="sh-head-icon" aria-hidden="true">
            <FileTextOutlined />
          </span>
          <div className="sh-head-titles">
            <h1 className="sh-title">Sales History Logs</h1>
            <p className="sh-sub">View and manage all sales transactions and invoice records</p>
          </div>
          <div className="sh-tools">
            <Input
              size="large"
              placeholder="Search records..."
              prefix={<SearchOutlined className="sh-muted" />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="sh-search"
              allowClear
            />
            <Button
              size="large"
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              loading={clearing}
            >
              Export Excel
            </Button>
            <Button
              size="large"
              danger
              icon={<DeleteOutlined />}
              onClick={handleClearAllHistory}
              loading={clearing}
              disabled={sales.length === 0 || importing}
              className="sh-danger"
            >
              Delete All History
            </Button>
          </div>
        </header>

        <div className="sh-stats">
          {stats.map(stat => (
            <article key={stat.key} className="sh-stat">
              <span className={`sh-stat-icon sh-tone-${stat.tone}`} aria-hidden="true">
                {stat.icon}
              </span>
              <div className="sh-stat-text">
                <span className="sh-stat-label">{stat.label}</span>
                <span className="sh-stat-value">{stat.value}</span>
                {stat.note ? <span className="sh-stat-note">{stat.note}</span> : null}
              </div>
            </article>
          ))}
        </div>

        <section className="sh-table-card">
          <SalesHistoryTable
            sales={filteredSales}
            loading={loading}
            onView={handleViewDetails}
            onEdit={handleEdit}
            onPrint={printSale}
            onDelete={handleDelete}
          />
        </section>

        {/* Sales history summary. Reflects the current search when one is active. */}
        <SalesSummary
          sales={filteredSales}
          totalCount={sales.length}
          loading={loading}
          searchText={searchText}
        />

        {/* Restore Sales History from Excel */}
        <SalesRestoreCard clearing={clearing} onImportingChange={setImporting} />
      </div>

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
    </ConfigProvider>
  );
};
export default SalesHistoryPage;
