import React, { useMemo } from 'react';
import { Table, Button, Space, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, EditOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Sale } from '../../types';
import { formatMoney } from '../../utils/format';

export interface SalesHistoryTableProps {
  sales: Sale[];
  loading: boolean;
  onView: (sale: Sale) => void;
  onEdit: (sale: Sale) => void;
  onPrint: (sale: Sale) => void;
  onDelete: (invoiceNo: string) => void;
}

/**
 * The sales history table and its columns.
 *
 * Columns live here so the page does not rebuild the definition on every render.
 * `deleteSale` takes the invoice number, which is also the Firestore document id,
 * so the popconfirm hands it straight across.
 */
export const SalesHistoryTable: React.FC<SalesHistoryTableProps> = ({
  sales,
  loading,
  onView,
  onEdit,
  onPrint,
  onDelete,
}) => {
  const columns = useMemo<ColumnsType<Sale>>(
    () => [
      {
        title: 'Invoice No',
        dataIndex: 'invoiceNo',
        key: 'invoiceNo',
        sorter: (a, b) => a.invoiceNo.localeCompare(b.invoiceNo),
        render: (text: string) => (
          <span className="font-mono font-bold">{text.replace(/^U\s+/, '')}</span>
        ),
      },
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        sorter: (a, b) => a.date.localeCompare(b.date),
      },
      {
        title: 'Customer Name',
        dataIndex: 'customerName',
        key: 'customerName',
        sorter: (a, b) => a.customerName.localeCompare(b.customerName),
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
        render: (val: number) => formatMoney(val),
        sorter: (a, b) => a.totalCashPrice - b.totalCashPrice,
      },
      {
        title: 'Total Rental',
        dataIndex: 'totalRentalMonthly',
        key: 'totalRentalMonthly',
        render: (val: number) => formatMoney(val),
        sorter: (a, b) => a.totalRentalMonthly - b.totalRentalMonthly,
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
        render: (_, record) => (
          <Space size="middle">
            <Button type="text" icon={<EyeOutlined className="text-singer" />} onClick={() => onView(record)} />
            <Button type="text" icon={<EditOutlined className="text-amber-500" />} onClick={() => onEdit(record)} />
            <Button type="text" icon={<PrinterOutlined className="text-emerald-500" />} onClick={() => onPrint(record)} />
            <Popconfirm
              title="Delete Record"
              description="Are you sure you want to delete this sale record?"
              onConfirm={() => onDelete(record.invoiceNo)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [onDelete, onEdit, onPrint, onView]
  );

  return (
    <Table
      dataSource={sales}
      columns={columns}
      rowKey="invoiceNo"
      loading={loading}
      pagination={{ pageSize: 10 }}
      className="border border-slate-100 rounded-lg overflow-hidden"
    />
  );
};
export default SalesHistoryTable;