import React from 'react';
import { Modal, Button, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import type { Sale } from '../../types';
import { formatMoney } from '../../utils/format';

const { Text } = Typography;

export interface SaleDetailsModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
  onPrint: (sale: Sale) => void;
}

/**
 * The read-only invoice view opened from the history row.
 *
 * The modal keeps its own markup so printed invoices are unaffected: this view is
 * what an operator checks before deciding to print, and printing still goes
 * through <PrintLayout>, not through this modal.
 */
export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ sale, open, onClose, onPrint }) => {
  return (
    <Modal
      title={
        <div className="flex justify-between items-center pr-6">
          <span className="font-bold text-lg">Invoice Details</span>
          <span className="font-mono text-red-500 font-bold">
            {(sale?.invoiceNo || '').replace(/^U\s+/, '')}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => {
            if (sale) {
              onPrint(sale);
              onClose();
            }
          }}
          className="bg-singer hover:bg-singer-dark"
        >
          Print Invoice
        </Button>,
      ]}
      width={700}
    >
      {sale && (
        <div className="space-y-6 mt-4">
          {/* Customer Details Block */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg text-sm">
            <div>
              <Text type="secondary" className="block text-xs">Customer Name</Text>
              <Text className="font-semibold text-slate-800">{sale.customerName}</Text>
            </div>
            <div>
              <Text type="secondary" className="block text-xs">Date of Transaction</Text>
              <Text className="font-semibold text-slate-800">{sale.date}</Text>
            </div>
            <div>
              <Text type="secondary" className="block text-xs">EPF Number</Text>
              <Text className="font-semibold text-slate-800">{sale.epfNumber}</Text>
            </div>
            <div>
              <Text type="secondary" className="block text-xs">Contact Number</Text>
              <Text className="font-semibold text-slate-800">{sale.contactNumber}</Text>
            </div>
            <div>
              <Text type="secondary" className="block text-xs">NIC Number</Text>
              <Text className="font-semibold text-slate-800">{sale.nic || '-'}</Text>
            </div>
            <div className="col-span-2">
              <Text type="secondary" className="block text-xs">Institution</Text>
              <Text className="font-semibold text-slate-800">{sale.institution}</Text>
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
                {sale.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="border border-slate-200 p-2 font-mono font-medium">{it.modelNumber}</td>
                    <td className="border border-slate-200 p-2">{it.itemName}</td>
                    <td className="border border-slate-200 p-2 text-right">{formatMoney(it.cashPrice)}</td>
                    <td className="border border-slate-200 p-2 text-right">{formatMoney(it.rental)}</td>
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
              <Text className="font-bold text-base text-slate-800">{formatMoney(sale.totalCashPrice)}</Text>
            </div>
            <div>
              <Text type="secondary" className="block text-xs">Total Monthly Rental</Text>
              <Text className="font-bold text-base text-singer">{formatMoney(sale.totalRentalMonthly)}</Text>
            </div>
            <div>
              <Text type="secondary" className="block text-xs">Term</Text>
              <Text className="font-bold text-base text-slate-800">{sale.overallTerm} M</Text>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
export default SaleDetailsModal;