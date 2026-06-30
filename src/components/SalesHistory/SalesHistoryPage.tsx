import React, { useState } from 'react';
import { Table, Button, Card, Space, Popconfirm, Modal, Typography, Input, message } from 'antd';
import { SearchOutlined, PrinterOutlined, FileExcelOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useSales } from '../../hooks/useSales';
import type { Sale } from '../../types';
import * as XLSX from 'xlsx';
import PrintLayout from '../Print/PrintLayout';

const { Text } = Typography;

export const SalesHistoryPage: React.FC = () => {
  const { sales, loading, deleteSale } = useSales();
  const [searchText, setSearchText] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [printSaleData, setPrintSaleData] = useState<{
    saleData: {
      invoiceNo: string;
      date: string;
      customerName: string;
      institution: string;
      epfNumber: string;
      contactNumber: string;
      items: Sale['items'];
      totalCashPrice: number;
      totalRental: number;
      term: number;
    };
  } | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteSale(id);
      message.success('Sale record deleted successfully.');
    } catch (error) {
      console.error(error);
      message.error('Failed to delete sale record.');
    }
  };

  const handlePrint = (sale: Sale) => {
    setPrintSaleData({
      saleData: {
        invoiceNo: sale.invoiceNo,
        date: sale.date,
        customerName: sale.customerName,
        institution: sale.institution,
        epfNumber: sale.epfNumber,
        contactNumber: sale.contactNumber,
        items: sale.items,
        totalCashPrice: sale.totalCashPrice,
        totalRental: sale.totalRentalMonthly,
        term: sale.overallTerm,
      },
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsModalVisible(true);
  };

  const handleExportExcel = () => {
    if (sales.length === 0) {
      message.warning('No sales records to export.');
      return;
    }

    const exportRows: any[] = [];
    sales.forEach(s => {
      s.items.forEach(item => {
        exportRows.push({
          'EPF': s.epfNumber,
          'Name': s.customerName,
          'ID': s.invoiceNo,
          'mobile': s.contactNumber,
          'Item': item.itemName,
          'model number': item.modelNumber,
          'cash price': item.cashPrice,
          'total': s.totalCashPrice,
          'rental': item.rental,
          'term': item.term || s.overallTerm
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Records');
    
    // Auto-fit column widths for better presentation
    const maxKeys = Object.keys(exportRows[0]);
    worksheet['!cols'] = maxKeys.map(key => ({
      wch: Math.max(key.length + 3, ...exportRows.map(row => String(row[key] ?? '').length + 2))
    }));

    XLSX.writeFile(workbook, `singer_sales_report_${Date.now()}.xlsx`);
    message.success('Excel export completed successfully!');
  };

  // Filter sales based on search text
  const filteredSales = sales.filter(s =>
    s.invoiceNo.toLowerCase().includes(searchText.toLowerCase()) ||
    s.epfNumber.toLowerCase().includes(searchText.toLowerCase()) ||
    s.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
    s.institution.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Invoice No',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      sorter: (a: Sale, b: Sale) => a.invoiceNo.localeCompare(b.invoiceNo),
      render: (text: string) => <span className="font-mono font-bold">{text}</span>
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: Sale, b: Sale) => a.date.localeCompare(b.date),
    },
    {
      title: 'Customer Name',
      dataIndex: 'customerName',
      key: 'customerName',
      sorter: (a: Sale, b: Sale) => a.customerName.localeCompare(b.customerName),
    },
    {
      title: 'EPF Number',
      dataIndex: 'epfNumber',
      key: 'epfNumber',
    },
    {
      title: 'Total Cash Price',
      dataIndex: 'totalCashPrice',
      key: 'totalCashPrice',
      render: (val: number) => `Rs. ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: Sale, b: Sale) => a.totalCashPrice - b.totalCashPrice,
    },
    {
      title: 'Total Rental',
      dataIndex: 'totalRentalMonthly',
      key: 'totalRentalMonthly',
      render: (val: number) => `Rs. ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: Sale, b: Sale) => a.totalRentalMonthly - b.totalRentalMonthly,
    },
    {
      title: 'Term',
      dataIndex: 'overallTerm',
      key: 'overallTerm',
      render: (val: number) => `${val} Months`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Sale) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined className="text-singer" />}
            onClick={() => handleViewDetails(record)}
          />
          <Button
            type="text"
            icon={<PrinterOutlined className="text-emerald-500" />}
            onClick={() => handlePrint(record)}
          />
          <Popconfirm
            title="Delete Record"
            description="Are you sure you want to delete this sale record?"
            onConfirm={() => handleDelete(record.invoiceNo)} // invoiceNo is our Firestore doc ID in useSales
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Print component - Hidden on screen */}
      {printSaleData && <PrintLayout saleData={printSaleData.saleData} />}

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
              className="bg-emerald-600 hover:bg-emerald-500 border-none"
            >
              Export Excel
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={filteredSales}
          columns={columns}
          rowKey="invoiceNo"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="border border-slate-100 rounded-lg overflow-hidden"
        />
      </Card>

      {/* Sale Details Modal */}
      <Modal
        title={
          <div className="flex justify-between items-center pr-6">
            <span className="font-bold text-lg">Invoice Details</span>
            <span className="font-mono text-red-500 font-bold">{selectedSale?.invoiceNo}</span>
          </div>
        }
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              if (selectedSale) {
                handlePrint(selectedSale);
                setDetailsModalVisible(false);
              }
            }}
            className="bg-singer hover:bg-singer-dark"
          >
            Print Invoice
          </Button>
        ]}
        width={700}
      >
        {selectedSale && (
          <div className="space-y-6 mt-4">
            {/* Customer Details Block */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg text-sm">
              <div>
                <Text type="secondary" className="block text-xs">Customer Name</Text>
                <Text className="font-semibold text-slate-800">{selectedSale.customerName}</Text>
              </div>
              <div>
                <Text type="secondary" className="block text-xs">Date of Transaction</Text>
                <Text className="font-semibold text-slate-800">{selectedSale.date}</Text>
              </div>
              <div>
                <Text type="secondary" className="block text-xs">EPF Number</Text>
                <Text className="font-semibold text-slate-800">{selectedSale.epfNumber}</Text>
              </div>
              <div>
                <Text type="secondary" className="block text-xs">Contact Number</Text>
                <Text className="font-semibold text-slate-800">{selectedSale.contactNumber}</Text>
              </div>
              <div className="col-span-2">
                <Text type="secondary" className="block text-xs">Institution</Text>
                <Text className="font-semibold text-slate-800">{selectedSale.institution}</Text>
              </div>
            </div>

            {/* Sale Items Table */}
            <div>
              <Text className="font-bold block mb-2 text-slate-700">Purchased Items</Text>
              <table className="w-full border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold">
                    <th className="border border-slate-200 p-2 text-left">Model</th>
                    <th className="border border-slate-200 p-2 text-left">Item Name</th>
                    <th className="border border-slate-200 p-2 text-right">Cash Price</th>
                    <th className="border border-slate-200 p-2 text-right">Rental</th>
                    <th className="border border-slate-200 p-2 text-center w-16">Term</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="border border-slate-200 p-2 font-mono font-medium">{it.modelNumber}</td>
                      <td className="border border-slate-200 p-2">{it.itemName}</td>
                      <td className="border border-slate-200 p-2 text-right">
                        Rs. {it.cashPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-200 p-2 text-right">
                        Rs. {it.rental.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-200 p-2 text-center">{it.term} M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Aggregate Values Block */}
            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-center">
              <div>
                <Text type="secondary" className="block text-xs">Total Cash Price</Text>
                <Text className="font-bold text-base text-slate-800">
                  Rs. {selectedSale.totalCashPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </div>
              <div>
                <Text type="secondary" className="block text-xs">Total Monthly Rental</Text>
                <Text className="font-bold text-base text-singer">
                  Rs. {selectedSale.totalRentalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </div>
              <div>
                <Text type="secondary" className="block text-xs">Term</Text>
                <Text className="font-bold text-base text-slate-800">
                  {selectedSale.overallTerm} M
                </Text>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default SalesHistoryPage;
