import React, { useState } from 'react';
import { Card, Upload, Button, Space, Typography, Row, Col, Popconfirm, message } from 'antd';
import type { UploadProps } from 'antd';
import { 
  UploadOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  DatabaseOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useCustomers } from '../../hooks/useCustomers';
import { useItems } from '../../hooks/useItems';
import {
  CUSTOMER_TEMPLATE_ROWS,
  ITEM_TEMPLATE_ROWS,
  downloadExcel,
  parseCustomerRows,
  parseItemRows,
  readExcelFile,
} from '../../utils/excel';

const { Text, Paragraph } = Typography;

const uploadClassName = 'w-full [&_.ant-upload]:!block [&_.ant-upload]:!w-full';

const DatabaseCard: React.FC<{
  title: string;
  totalLabel: string;
  totalCount: number;
  uploadLabel: string;
  clearLabel: string;
  loading: boolean;
  onUpload: NonNullable<UploadProps['beforeUpload']>;
  onClear: () => void;
  onDownloadTemplate: () => void;
  onDownload: () => void;
}> = ({
  title,
  totalLabel,
  totalCount,
  uploadLabel,
  clearLabel,
  loading,
  onUpload,
  onClear,
  onDownloadTemplate,
  onDownload,
}) => (
  <Card
    type="inner"
    title={title}
    className="border border-slate-100 rounded-lg shadow-inner w-full"
    extra={
      <Button
        type="link"
        icon={<DownloadOutlined />}
        onClick={onDownloadTemplate}
        className="p-0 text-singer"
      >
        Template
      </Button>
    }
  >
    <div className="flex flex-col gap-4">
      <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between min-h-[88px]">
        <div>
          <Text type="secondary" className="block text-xs mb-1">
            {totalLabel}
          </Text>
          <Text className="font-bold text-2xl text-slate-800 leading-none">{totalCount}</Text>
        </div>
        {totalCount > 0 && <CheckCircleOutlined className="text-emerald-500 text-2xl shrink-0" />}
      </div>

      <div className="flex flex-col w-full">
        <Upload
          className={uploadClassName}
          beforeUpload={onUpload}
          accept=".xlsx,.xls,.csv"
          showUploadList={false}
          disabled={loading}
        >
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={loading}
            block
            className="bg-singer hover:bg-singer-dark"
          >
            {uploadLabel}
          </Button>
        </Upload>

        <div className="mt-3 w-full">
          <Button
            icon={<DownloadOutlined />}
            block
            disabled={totalCount === 0 || loading}
            onClick={onDownload}
            className="border-emerald-600 text-emerald-600 hover:border-emerald-500 hover:text-emerald-500"
          >
            Download Database
          </Button>
        </div>

        <div className="mt-3 w-full">
          <Popconfirm
            title={`Clear ${title}`}
            description="This will permanently delete all records. Are you sure?"
            onConfirm={onClear}
            okText="Yes, Wipe Database"
            cancelText="No"
            okButtonProps={{ danger: true, loading }}
          >
            <div className="w-full">
              <Button
                danger
                icon={<DeleteOutlined />}
                block
                disabled={totalCount === 0 || loading}
              >
                {clearLabel}
              </Button>
            </div>
          </Popconfirm>
        </div>
      </div>
    </div>
  </Card>
);

export const DataManagement: React.FC = () => {
  const { bulkAddCustomers, clearAllCustomers, customers } = useCustomers();
  const { bulkAddItems, clearAllItems, items } = useItems();
  const [custLoading, setCustLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  
  // Custom helper to parse and validate customer files
  const handleCustomerUpload: NonNullable<UploadProps['beforeUpload']> = (file) => {
    setCustLoading(true);

    const importRows = async () => {
      try {
        const jsonData = await readExcelFile(file);

        if (jsonData.length === 0) {
          message.error('Uploaded Excel file is empty.');
          return;
        }

        const parsed = parseCustomerRows(jsonData);
        if (!parsed.ok) {
          message.error(parsed.error);
          return;
        }

        await bulkAddCustomers(parsed.rows);
        message.success(`Successfully loaded ${parsed.rows.length} customers into the database!`);
      } catch (error) {
        console.error(error);
        message.error('Failed to parse the customer data file.');
      } finally {
        setCustLoading(false);
      }
    };

    void importRows();
    return false; // prevent default upload action
  };

  // Custom helper to parse and validate item files
  const handleItemUpload: NonNullable<UploadProps['beforeUpload']> = (file) => {
    setItemLoading(true);

    const importRows = async () => {
      try {
        const jsonData = await readExcelFile(file);

        if (jsonData.length === 0) {
          message.error('Uploaded Excel file is empty.');
          return;
        }

        const parsed = parseItemRows(jsonData);
        if (!parsed.ok) {
          message.error(parsed.error);
          return;
        }

        await bulkAddItems(parsed.rows);
        message.success(`Successfully loaded ${parsed.rows.length} items into the database!`);
      } catch (error) {
        console.error(error);
        message.error('Failed to parse the items data file.');
      } finally {
        setItemLoading(false);
      }
    };

    void importRows();
    return false; // prevent default upload action
  };

  // Clear Database operations
  const handleClearCustomers = async () => {
    setCustLoading(true);
    try {
      await clearAllCustomers();
      message.success('All customer records removed successfully.');
    } catch (error) {
      console.error(error);
      message.error('Failed to clear customer database.');
    } finally {
      setCustLoading(false);
    }
  };

  const handleClearItems = async () => {
    setItemLoading(true);
    try {
      await clearAllItems();
      message.success('All item records removed successfully.');
    } catch (error) {
      console.error(error);
      message.error('Failed to clear item database.');
    } finally {
      setItemLoading(false);
    }
  };

  // Download database as Excel
  const handleDownloadCustomers = () => {
    if (customers.length === 0) {
      message.warning('No customer records to download.');
      return;
    }
    const rows = customers.map(c => ({
      'EPF Number': c.epfNumber,
      'Customer Name': c.customerName,
      'Institution': c.institution,
      'Contact Number': c.contactNumber,
      'NIC': c.nic || '',
    }));
    downloadExcel(rows, 'customer_database.xlsx', { sheetName: 'Customers' });
    message.success(`Exported ${customers.length} customer records.`);
  };

  const handleDownloadItems = () => {
    if (items.length === 0) {
      message.warning('No item records to download.');
      return;
    }
    const rows = items.map(item => ({
      'Model Number': item.modelNumber,
      'Item Name': item.itemName,
      'Cash Price': item.cashPrice,
      'Rental': item.rental,
    }));
    downloadExcel(rows, 'item_database.xlsx', { sheetName: 'Items' });
    message.success(`Exported ${items.length} item records.`);
  };

  // Download templates helper
  const downloadCustomerTemplate = () => {
    downloadExcel(CUSTOMER_TEMPLATE_ROWS, 'Customer_Import_Template.xlsx', { sheetName: 'Customers' });
  };

  const downloadItemTemplate = () => {
    downloadExcel(ITEM_TEMPLATE_ROWS, 'Items_Import_Template.xlsx', { sheetName: 'Items' });
  };

  return (
    <div className="space-y-6">
      <Card 
        bordered={false} 
        className="shadow-sm rounded-xl"
        title={
          <Space>
            <DatabaseOutlined className="text-singer" />
            <span className="font-semibold text-lg">Sales Data Batch Management</span>
          </Space>
        }
      >
        <Paragraph className="text-slate-500">
          Upload customer list and item databases directly from Excel to quickly initialize sales. 
          When finished, wipe databases to upload new files for new sales.
        </Paragraph>

        <Row gutter={[24, 24]} className="mt-6">
          <Col xs={24} md={12}>
            <DatabaseCard
              title="Customer Database"
              totalLabel="Total Customers Loaded"
              totalCount={customers.length}
              uploadLabel="Upload Customer Excel"
              clearLabel="Clear Customer Database"
              loading={custLoading}
              onUpload={handleCustomerUpload}
              onClear={handleClearCustomers}
              onDownloadTemplate={downloadCustomerTemplate}
              onDownload={handleDownloadCustomers}
            />
          </Col>

          <Col xs={24} md={12}>
            <DatabaseCard
              title="Items Inventory Database"
              totalLabel="Total Items Loaded"
              totalCount={items.length}
              uploadLabel="Upload Items Excel"
              clearLabel="Clear Items Database"
              loading={itemLoading}
              onUpload={handleItemUpload}
              onClear={handleClearItems}
              onDownloadTemplate={downloadItemTemplate}
              onDownload={handleDownloadItems}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};
export default DataManagement;
