import React, { useState } from 'react';
import { Card, Upload, Button, Space, Typography, Row, Col, Popconfirm, message } from 'antd';
import { 
  UploadOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  DatabaseOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useCustomers } from '../../hooks/useCustomers';
import { useItems } from '../../hooks/useItems';
import type { Customer, Item } from '../../types';
import * as XLSX from 'xlsx';

const { Text, Paragraph } = Typography;

const uploadClassName = 'w-full [&_.ant-upload]:!block [&_.ant-upload]:!w-full';

const DatabaseCard: React.FC<{
  title: string;
  totalLabel: string;
  totalCount: number;
  uploadLabel: string;
  clearLabel: string;
  loading: boolean;
  onUpload: (file: File) => false | void;
  onClear: () => void;
  onDownloadTemplate: () => void;
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
        className="p-0 text-blue-600"
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
            className="bg-blue-600 hover:bg-blue-500"
          >
            {uploadLabel}
          </Button>
        </Upload>

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
  const handleCustomerUpload = async (file: File) => {
    setCustLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Could not read file data');
        
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
        
        if (jsonData.length === 0) {
          message.error('Uploaded Excel file is empty.');
          setCustLoading(false);
          return;
        }

        // Column mapping helper
        const mappedCustomers: Customer[] = [];
        for (const row of jsonData) {
          const epfKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '') === 'epfnumber' || k.toLowerCase() === 'epf');
          const nameKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '') === 'fullname' || k.toLowerCase().replace(/\s+/g, '') === 'customername' || k.toLowerCase() === 'name');
          const nicKey = Object.keys(row).find(k => k.toLowerCase() === 'nic');
          const instKey = Object.keys(row).find(k => k.toLowerCase() === 'institution');
          const contactKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '') === 'contactnumber' || k.toLowerCase() === 'mobile' || k.toLowerCase() === 'contact' || k.toLowerCase() === 'phone');
          
          if (!epfKey || !nameKey) {
            message.error('Invalid template. Customer Excel must contain at least "EPF Number" (or "EPF") and "Full Name" (or "Name") columns.');
            setCustLoading(false);
            return;
          }
          
          mappedCustomers.push({
            epfNumber: String(row[epfKey]).trim(),
            customerName: String(row[nameKey]).trim(),
            institution: instKey ? String(row[instKey]).trim() : '',
            contactNumber: contactKey ? String(row[contactKey]).trim() : '',
            nic: nicKey ? String(row[nicKey]).trim() : '',
          });
        }

        await bulkAddCustomers(mappedCustomers);
        message.success(`Successfully loaded ${mappedCustomers.length} customers into the database!`);
      } catch (error) {
        console.error(error);
        message.error('Failed to parse the customer data file.');
      } finally {
        setCustLoading(false);
      }
    };
    
    reader.readAsBinaryString(file);
    return false; // prevent default upload action
  };

  // Custom helper to parse and validate item files
  const handleItemUpload = async (file: File) => {
    setItemLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Could not read file data');
        
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
        
        if (jsonData.length === 0) {
          message.error('Uploaded Excel file is empty.');
          setItemLoading(false);
          return;
        }

        const mappedItems: Item[] = [];
        for (const row of jsonData) {
          const modelKey = Object.keys(row).find(k => 
            k.toLowerCase().replace(/\s+/g, '') === 'salespartno' || 
            k.toLowerCase().replace(/\s+/g, '') === 'modelnumber' || 
            k.toLowerCase() === 'model'
          );
          const nameKey = Object.keys(row).find(k => 
            k.toLowerCase().replace(/\s+/g, '') === 'salespartdescription' || 
            k.toLowerCase().replace(/\s+/g, '') === 'itemname' || 
            k.toLowerCase().replace(/\s+/g, '') === 'name' || 
            k.toLowerCase() === 'item'
          );
          const priceKey = Object.keys(row).find(k => 
            k.toLowerCase().replace(/\s+/g, '') === 'cashprice' || 
            k.toLowerCase().replace(/\s+/g, '') === 'price' || 
            k.toLowerCase().replace(/\s+/g, '') === 'discountedprice'
          );
          const rentalKey = Object.keys(row).find(k => 
            k.toLowerCase() === 'rental' || 
            k.toLowerCase().includes('rental')
          );
          
          if (!modelKey || !nameKey) {
            message.error('Invalid template. Item Excel must contain at least "SalesPartNo" (or "Model") and "Sales Part Description" (or "Item Name") columns.');
            setItemLoading(false);
            return;
          }
          
          mappedItems.push({
            modelNumber: String(row[modelKey]).trim().toUpperCase(),
            itemName: String(row[nameKey]).trim(),
            cashPrice: priceKey ? Number(String(row[priceKey]).replace(/,/g, '')) || 0 : 0,
            rental: rentalKey ? Number(String(row[rentalKey]).replace(/,/g, '')) || 0 : 0,
          });
        }

        await bulkAddItems(mappedItems);
        message.success(`Successfully loaded ${mappedItems.length} items into the database!`);
      } catch (error) {
        console.error(error);
        message.error('Failed to parse the items data file.');
      } finally {
        setItemLoading(false);
      }
    };
    
    reader.readAsBinaryString(file);
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

  // Download templates helper
  const downloadCustomerTemplate = () => {
    const templateData = [
      { 'EPF Number': 'EPF-001', 'Customer Name': 'Sampath Perera', 'Institution': 'National Hospital', 'Contact Number': '0711234567' },
      { 'EPF Number': 'EPF-002', 'Customer Name': 'Nimali Silva', 'Institution': 'Ministry of Education', 'Contact Number': '0777654321' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    XLSX.writeFile(workbook, 'Customer_Import_Template.xlsx');
  };

  const downloadItemTemplate = () => {
    const templateData = [
      { 'Model Number': 'SIS-REF-01', 'Item Name': 'Singer Refrigerator 250L', 'Cash Price': 85000, 'Rental': 4200 },
      { 'Model Number': 'SIS-TV-32', 'Item Name': 'Singer LED TV 32"', 'Cash Price': 45000, 'Rental': 2100 }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items');
    XLSX.writeFile(workbook, 'Items_Import_Template.xlsx');
  };

  return (
    <div className="space-y-6">
      <Card 
        bordered={false} 
        className="shadow-sm rounded-xl"
        title={
          <Space>
            <DatabaseOutlined className="text-blue-600" />
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
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};
export default DataManagement;
