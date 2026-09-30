import React, { useState } from 'react';
import { Button, Card, Space, Typography, Upload, message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { InboxOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useSales } from '../../hooks/useSales';
import { downloadExcel, FileReadError, readExcelFile } from '../../utils/excel';
import { SALE_SHEET_HEADERS, buildSalesTemplateRows, parseSalesRows } from '../../utils/salesSheet';

const { Text } = Typography;

export interface SalesRestoreCardProps {
  /** Set from outside while a full-history delete is in progress. */
  clearing: boolean;
  /** Called so the page can keep the delete guard while an import is pending. */
  onImportingChange?: (importing: boolean) => void;
}

/**
 * Restore sales history from an uploaded Excel file.
 *
 * The card owns the whole import flow because it is one feature with no shared
 * state: it reads the workbook, groups the rows into invoices, confirms the
 * count with the operator, and hands the parsed sales to the data layer.
 */
export const SalesRestoreCard: React.FC<SalesRestoreCardProps> = ({ clearing, onImportingChange }) => {
  const { sales, bulkAddSales } = useSales();
  const [importing, setImporting] = useState(false);

  const changeImporting = (next: boolean) => {
    setImporting(next);
    onImportingChange?.(next);
  };

  const handleSalesUpload: NonNullable<UploadProps['beforeUpload']> = (file) => {
    changeImporting(true);

    const restoreFromFile = async () => {
      try {
        const jsonData = await readExcelFile(file, { cellDates: true });
        const parsed = parseSalesRows(jsonData);

        if (!parsed.ok) {
          message.error(parsed.error);
          changeImporting(false);
          return;
        }

        const { sales: parsedSales, itemCount } = parsed.preview;
        const existingNos = new Set(sales.map(s => s.invoiceNo));
        const duplicates = parsedSales.filter(s => existingNos.has(s.invoiceNo)).length;

        Modal.confirm({
          title: 'Restore Sales History from Excel',
          icon: <InboxOutlined className="text-emerald-600" />,
          width: 520,
          okText: 'Yes, Restore Data',
          cancelText: 'No',
          onOk: async () => {
            changeImporting(true);
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
              changeImporting(false);
            }
          },
          onCancel: () => changeImporting(false),
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
        message.error(
          error instanceof FileReadError
            ? 'Failed to read the selected file.'
            : 'Failed to parse the sales history data file.'
        );
        changeImporting(false);
      }
    };

    void restoreFromFile();
    return false; // prevent default upload action
  };

  const downloadSalesTemplate = () => {
    downloadExcel(buildSalesTemplateRows(), 'Sales_History_Import_Template.xlsx', {
      sheetName: 'Sales Records',
      header: [...SALE_SHEET_HEADERS],
    });
    message.success('Template downloaded.');
  };

  return (
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
  );
};
export default SalesRestoreCard;