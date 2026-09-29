import React, { useMemo, useState } from 'react';
import { Table, Button, Card, Space, Popconfirm, Modal, Typography, Input, Upload, Row, Col, message } from 'antd';
import type { UploadProps } from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  UploadOutlined,
  DownloadOutlined,
  InboxOutlined,
  ExclamationCircleFilled,
  PayCircleOutlined,
  RiseOutlined,
  FileTextOutlined,
  BarChartOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useSales } from '../../hooks/useSales';
import type { Sale, SaleItem } from '../../types';
import { TERM_RATES, round2 } from '../../constants';
import * as XLSX from 'xlsx';
import PrintLayout from '../Print/PrintLayout';
import EditSaleModal from './EditSaleModal';

const { Text } = Typography;

const SALE_SHEET_HEADERS = [
  'EPF',
  'Name',
  'ID',
  'Date',
  'NIC',
  'mobile',
  'Institution',
  'Item',
  'model number',
  'cash price',
  'total',
  'rental',
  'term',
] as const;

const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, '');

const formatAmount = (value: number) =>
  `Rs. ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const findColumn = (keys: string[], aliases: string[]) =>
  keys.find(key => aliases.includes(normalizeKey(key)));

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const normalizeInvoiceNo = (value: string) => {
  const trimmed = value.trim().replace(/^U\s+/i, '');
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(4, '0');
  return trimmed;
};

const excelSerialToDate = (serial: number) => {
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000).toISOString().slice(0, 10);
};

const toDateString = (value: unknown): string => {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && isFinite(value)) return excelSerialToDate(value);

  const raw = String(value).trim();
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (dmy) return `${dmy[3]}-${dmy[1].padStart(2, '0')}-${dmy[2].padStart(2, '0')}`;

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};

export const SalesHistoryPage: React.FC = () => {
  const { sales, loading, deleteSale, clearAllSales, bulkAddSales } = useSales();
  const [searchText, setSearchText] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importing, setImporting] = useState(false);
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

  const handleEdit = (sale: Sale) => {
    setEditSale(sale);
    setEditModalVisible(true);
  };

  const exportSalesToExcel = (fileNamePrefix = 'singer_sales_report', notify = true) => {
    if (sales.length === 0) {
      if (notify) message.warning('No sales records to export.');
      return false;
    }

    const exportRows: any[] = [];
    sales.forEach(s => {
      s.items.forEach(item => {
        exportRows.push({
          'EPF': s.epfNumber,
          'Name': s.customerName,
          'ID': s.invoiceNo.replace(/^U\s+/, ''),
          'Date': s.date,
          'NIC': s.nic || '',
          'mobile': s.contactNumber,
          'Institution': s.institution,
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

    XLSX.writeFile(workbook, `${fileNamePrefix}_${Date.now()}.xlsx`);
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

  const handleSalesUpload: NonNullable<UploadProps['beforeUpload']> = (file) => {
    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Could not read file data');

        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        if (jsonData.length === 0) {
          message.error('Uploaded Excel file is empty.');
          setImporting(false);
          return;
        }

        const keys = Array.from(jsonData.reduce((acc, row) => {
          Object.keys(row).forEach(key => acc.add(key));
          return acc;
        }, new Set<string>()));
        const invoiceKey = findColumn(keys, ['id', 'invoiceno', 'invoice', 'invoicenumber']);
        const epfKey = findColumn(keys, ['epf', 'epfnumber']);
        const nameKey = findColumn(keys, ['name', 'customername', 'fullname']);
        const itemKey = findColumn(keys, ['item', 'itemname', 'salespartdescription']);
        const modelKey = findColumn(keys, ['modelnumber', 'model', 'salespartno']);
        const priceKey = findColumn(keys, ['cashprice', 'price', 'discountedprice']);
        const rentalKey = keys.find(k => normalizeKey(k) === 'rental' || normalizeKey(k).includes('rental'));
        const dateKey = findColumn(keys, ['date', 'transactiondate', 'invoicedate']);
        const nicKey = findColumn(keys, ['nic', 'nicnumber', 'idnumber']);
        const mobileKey = findColumn(keys, ['mobile', 'contactnumber', 'contact', 'phone']);
        const instKey = findColumn(keys, ['institution', 'company']);
        const termKey = findColumn(keys, ['term']);

        if (!invoiceKey) {
          message.error('Invalid template. The Excel must contain an "ID" (invoice number) column.');
          setImporting(false);
          return;
        }
        if (!epfKey && !nameKey) {
          message.error('Invalid template. The Excel must contain at least an "EPF" or "Name" column.');
          setImporting(false);
          return;
        }
        if (!itemKey && !modelKey) {
          message.error('Invalid template. The Excel must contain at least an "Item" or "model number" column.');
          setImporting(false);
          return;
        }

        const grouped = new Map<string, Sale>();

        jsonData.forEach(row => {
          const invoiceNo = normalizeInvoiceNo(String(row[invoiceKey] ?? ''));
          if (!invoiceNo) return;

          const existing = grouped.get(invoiceNo);
          const saleItems: SaleItem[] = existing ? [...existing.items] : [];

          const itemName = itemKey ? String(row[itemKey] ?? '').trim() : '';
          const modelNumber = modelKey ? String(row[modelKey] ?? '').trim() : '';
          if (itemName || modelNumber) {
            saleItems.push({
              itemName,
              modelNumber,
              cashPrice: toNumber(priceKey ? row[priceKey] : row['cash price']),
              rental: toNumber(rentalKey ? row[rentalKey] : row['rental']),
              term: termKey ? toNumber(row[termKey]) : (existing?.overallTerm ?? 0),
            });
          }

          const overallTerm = termKey
            ? toNumber(row[termKey])
            : (saleItems.find(i => i.term)?.term ?? existing?.overallTerm ?? 0);

          grouped.set(invoiceNo, {
            id: invoiceNo,
            invoiceNo,
            date: toDateString(dateKey ? row[dateKey] : undefined),
            epfNumber: epfKey ? String(row[epfKey] ?? '').trim() : (existing?.epfNumber ?? ''),
            customerName: nameKey ? String(row[nameKey] ?? '').trim() : (existing?.customerName ?? ''),
            institution: instKey ? String(row[instKey] ?? '').trim() : (existing?.institution ?? ''),
            contactNumber: mobileKey ? String(row[mobileKey] ?? '').trim() : (existing?.contactNumber ?? ''),
            nic: nicKey ? String(row[nicKey] ?? '').trim() : (existing?.nic ?? ''),
            items: saleItems,
            totalCashPrice: round2(saleItems.reduce((sum, i) => sum + (i.cashPrice || 0), 0)),
            totalRentalMonthly: round2(saleItems.reduce((sum, i) => sum + (i.rental || 0), 0)),
            overallTerm,
            interestRate: TERM_RATES[overallTerm] ?? 0,
            createdBy: existing?.createdBy ?? '',
          });
        });

        const parsedSales = Array.from(grouped.values());

        if (parsedSales.length === 0) {
          message.error('No valid invoice rows were found in the uploaded file.');
          setImporting(false);
          return;
        }

        const existingNos = new Set(sales.map(s => s.invoiceNo));
        const duplicates = parsedSales.filter(s => existingNos.has(s.invoiceNo)).length;
        const itemCount = parsedSales.reduce((sum, s) => sum + s.items.length, 0);

        Modal.confirm({
          title: 'Restore Sales History from Excel',
          icon: <InboxOutlined className="text-emerald-600" />,
          width: 520,
          okText: 'Yes, Restore Data',
          cancelText: 'No',
          onOk: async () => {
            setImporting(true);
            try {
              await bulkAddSales(parsedSales);
              message.success(
                `Restored ${parsedSales.length} invoices (${itemCount} items)${duplicates > 0 ? `, ${duplicates} existing invoice(s) overwritten` : ''}.`
              );
            } catch (error) {
              console.error(error);
              message.error('Failed to restore the sales history data.');
              throw error;
            } finally {
              setImporting(false);
            }
          },
          onCancel: () => setImporting(false),
          content: (
            <div className="space-y-2 pt-1">
              <p>
                Found <span className="font-bold">{parsedSales.length}</span> invoices containing{' '}
                <span className="font-bold">{itemCount}</span> items in{' '}
                <span className="font-mono">{file.name}</span>.
              </p>
              {duplicates > 0 && (
                <p className="text-amber-600">
                  {duplicates} of these invoice numbers already exist and will be overwritten with the Excel data.
                </p>
              )}
              <p className="text-slate-500">
                Existing invoices that are not present in the file will be kept as they are.
              </p>
            </div>
          ),
        });
      } catch (error) {
        console.error(error);
        message.error('Failed to parse the sales history data file.');
        setImporting(false);
      }
    };

    reader.onerror = () => {
      message.error('Failed to read the selected file.');
      setImporting(false);
    };

    reader.readAsBinaryString(file);
    return false; // prevent default upload action
  };

  const downloadSalesTemplate = () => {
    const templateData = [
      {
        'EPF': 'EPF-001',
        'Name': 'Sampath Perera',
        'ID': '0001',
        'Date': '2024-01-15',
        'NIC': '199012345678',
        'mobile': '0711234567',
        'Institution': 'National Hospital',
        'Item': 'Singer Refrigerator 250L',
        'model number': 'SIS-REF-01',
        'cash price': 85000,
        'total': 85000,
        'rental': 4200,
        'term': 12,
      },
      {
        'EPF': 'EPF-001',
        'Name': 'Sampath Perera',
        'ID': '0001',
        'Date': '2024-01-15',
        'NIC': '199012345678',
        'mobile': '0711234567',
        'Institution': 'National Hospital',
        'Item': 'Singer LED TV 32"',
        'model number': 'SIS-TV-32',
        'cash price': 45000,
        'total': 85000,
        'rental': 2100,
        'term': 12,
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData, { header: [...SALE_SHEET_HEADERS] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Records');
    XLSX.writeFile(workbook, 'Sales_History_Import_Template.xlsx');
    message.success('Template downloaded.');
  };

  // Filter sales based on search text
  const filteredSales = sales.filter(s =>
    s.invoiceNo.toLowerCase().includes(searchText.toLowerCase()) ||
    s.epfNumber.toLowerCase().includes(searchText.toLowerCase()) ||
    s.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
    s.institution.toLowerCase().includes(searchText.toLowerCase())
  );

  // Totals across the whole sales history, not just the current search.
  const salesTotals = useMemo(() => {
    const totals = sales.reduce(
      (acc, sale) => {
        const itemsTotal = sale.items.reduce((sum, item) => sum + (Number(item.cashPrice) || 0), 0);
        acc.cashPrice += sale.items.length > 0 ? itemsTotal : (Number(sale.totalCashPrice) || 0);
        acc.rental += Number(sale.totalRentalMonthly) || 0;
        acc.itemCount += sale.items.length;
        return acc;
      },
      { cashPrice: 0, rental: 0, itemCount: 0 }
    );
    return {
      cashPrice: round2(totals.cashPrice),
      rental: round2(totals.rental),
      itemCount: totals.itemCount,
      invoiceCount: sales.length,
      customerCount: new Set(sales.map(s => s.epfNumber).filter(Boolean)).size,
    };
  }, [sales]);

  const columns = [
    {
      title: 'Invoice No',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      sorter: (a: Sale, b: Sale) => a.invoiceNo.localeCompare(b.invoiceNo),
      render: (text: string) => <span className="font-mono font-bold">{text.replace(/^U\s+/, '')}</span>
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
      title: 'NIC Number',
      dataIndex: 'nic',
      key: 'nic',
      render: (val: string) => val || '-',
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
            icon={<EditOutlined className="text-amber-500" />}
            onClick={() => handleEdit(record)}
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
        <Table
          dataSource={filteredSales}
          columns={columns}
          rowKey="invoiceNo"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="border border-slate-100 rounded-lg overflow-hidden"
        />
      </Card>

      {/* Sales history summary */}
      <div className="no-print space-y-3">
        <div className="flex items-center gap-2">
          <BarChartOutlined className="text-singer text-lg" />
          <span className="font-semibold text-slate-800">Sales Summary</span>
          <Text type="secondary" className="text-xs">
            Across all {salesTotals.invoiceCount} invoice{salesTotals.invoiceCount === 1 ? '' : 's'} in your history
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={11}>
            <div className="relative overflow-hidden rounded-xl h-full p-6 text-white shadow-md bg-gradient-to-br from-singer to-singer-dark">
              <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <span className="absolute -right-4 -bottom-12 h-28 w-28 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/85">Total Sales Value</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight break-words">
                    {formatAmount(salesTotals.cashPrice)}
                  </div>
                  <div className="mt-2 text-xs text-white/75">
                    Full cash value of every item billed across all invoices
                  </div>
                </div>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl">
                  <PayCircleOutlined />
                </span>
              </div>
            </div>
          </Col>

          <Col xs={24} lg={13}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div className="h-full rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-lg">
                      <RiseOutlined />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-500">Total Monthly Rental</div>
                      <div className="text-lg font-bold text-slate-800 break-words">
                        {formatAmount(salesTotals.rental)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Combined monthly rental from every invoice
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12}>
                <div className="h-full rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-lg">
                      <FileTextOutlined />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-500">Total Invoices</div>
                      <div className="text-lg font-bold text-slate-800">{salesTotals.invoiceCount}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <ShoppingOutlined /> {salesTotals.itemCount} item{salesTotals.itemCount === 1 ? '' : 's'} sold
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TeamOutlined /> {salesTotals.customerCount} customer{salesTotals.customerCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>

      {/* Restore Sales History from Excel */}
      <Card
        bordered={false}
        className="shadow-sm rounded-xl no-print"
        title={
          <Space>
            <InboxOutlined className="text-singer" />
            <span className="font-semibold text-lg">Restore Sales History from Excel</span>
          </Space>
        }
        extra={
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={downloadSalesTemplate}
            className="p-0 text-singer"
            disabled={importing}
          >
            Download Template
          </Button>
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <Text className="block text-slate-600">
              Upload an Excel sheet containing your invoice rows to get your sales history data back. Rows sharing the
              same <Text className="font-mono font-semibold">ID</Text> (invoice number) are grouped into a single
              invoice, exactly like the exported sales report format.
            </Text>
            <Text type="secondary" className="block text-xs mt-2">
              Required columns: <Text className="font-mono">ID</Text>, <Text className="font-mono">EPF</Text>,{' '}
              <Text className="font-mono">Name</Text>, <Text className="font-mono">Item</Text>. Optional:{' '}
              <Text className="font-mono">Date</Text>, <Text className="font-mono">NIC</Text>,{' '}
              <Text className="font-mono">mobile</Text>, <Text className="font-mono">Institution</Text>,{' '}
              <Text className="font-mono">model number</Text>, <Text className="font-mono">cash price</Text>,{' '}
              <Text className="font-mono">rental</Text>, <Text className="font-mono">term</Text>.
            </Text>
          </div>
          <Upload
            className="w-full lg:w-auto [&_.ant-upload]:!block [&_.ant-upload]:!w-full"
            beforeUpload={handleSalesUpload}
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            disabled={importing || clearing}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={importing}
              disabled={clearing}
              className="bg-singer hover:bg-singer-dark w-full lg:w-auto"
            >
              Upload Sales History Excel
            </Button>
          </Upload>
        </div>
      </Card>

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
      <Modal
        title={
          <div className="flex justify-between items-center pr-6">
            <span className="font-bold text-lg">Invoice Details</span>
            <span className="font-mono text-red-500 font-bold">{(selectedSale?.invoiceNo || '').replace(/^U\s+/, '')}</span>
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
              <div>
                <Text type="secondary" className="block text-xs">NIC Number</Text>
                <Text className="font-semibold text-slate-800">{selectedSale.nic || '-'}</Text>
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
