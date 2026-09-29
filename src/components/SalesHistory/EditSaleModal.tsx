import React, { useMemo, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Button, Space, Typography, Row, Col, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useItems } from '../../hooks/useItems';
import { useSales } from '../../hooks/useSales';
import { TERM_OPTIONS, TERM_RATES, round2 } from '../../constants';
import type { Sale, SaleItem } from '../../types';

const { Text } = Typography;

const emptyRow = (term = 0): SaleItem => ({
  itemName: '',
  modelNumber: '',
  cashPrice: 0,
  rental: 0,
  term,
});

const buildInitialRows = (sale: Sale): SaleItem[] =>
  sale.items && sale.items.length > 0 ? sale.items.map(it => ({ ...it })) : [emptyRow(sale.overallTerm)];

const buildInitialValues = (sale: Sale) => ({
  invoiceNo: sale.invoiceNo.replace(/^U\s+/, ''),
  date: sale.date,
  epfNumber: sale.epfNumber,
  customerName: sale.customerName,
  institution: sale.institution,
  contactNumber: sale.contactNumber,
  nic: sale.nic || '',
  overallTerm: sale.overallTerm || undefined,
});

export const EditSaleModal: React.FC<{
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
}> = ({ open, sale, onClose }) => {
  const [form] = Form.useForm();
  const { items } = useItems();
  const { updateSale } = useSales();

  const [rows, setRows] = useState<SaleItem[]>(() => buildInitialRows(sale as Sale));
  const [saving, setSaving] = useState(false);

  const overallTerm = Form.useWatch('overallTerm', form) ?? 0;
  const invoiceNoField = Form.useWatch('invoiceNo', form) ?? '';

  const totalCashPrice = useMemo(() => round2(rows.reduce((sum, r) => sum + (Number(r.cashPrice) || 0), 0)), [rows]);
  const totalRentalMonthly = useMemo(() => round2(rows.reduce((sum, r) => sum + (Number(r.rental) || 0), 0)), [rows]);

  const handleModelChange = (index: number, modelNumber: string) => {
    const item = items.find(it => it.modelNumber === modelNumber);
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!item) {
        next[index] = { ...row, modelNumber, itemName: '', cashPrice: 0, rental: 0 };
      } else {
        const rate = TERM_RATES[overallTerm] || 0;
        next[index] = {
          ...row,
          modelNumber: item.modelNumber,
          itemName: item.itemName,
          cashPrice: item.cashPrice,
          rental: rate ? round2(item.cashPrice * rate) : item.rental,
          term: row.term || overallTerm || 0,
        };
      }
      return next;
    });
  };

  const handleRowChange = (index: number, field: keyof SaleItem, value: unknown) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as SaleItem;
      return next;
    });
  };

  const handleTermChange = (value: number) => {
    form.setFieldsValue({ overallTerm: value });
    const rate = TERM_RATES[value] || 0;
    setRows((prev) =>
      prev.map(row =>
        row.modelNumber
          ? { ...row, term: value, rental: rate ? round2(row.cashPrice * rate) : row.rental }
          : { ...row, term: value }
      )
    );
  };

  const addRow = () => {
    setRows(prev => [...prev, emptyRow(Number(overallTerm) || 0)]);
  };

  const removeRow = (index: number) => {
    setRows(prev => (prev.length === 1 ? [emptyRow(Number(overallTerm) || 0)] : prev.filter((_, i) => i !== index)));
  };

  const handleSave = async () => {
    if (!sale) return;

    const values = form.getFieldsValue();
    const epfNumber = String(values.epfNumber || '').trim();
    const activeRows = rows.filter(r => r.modelNumber || r.itemName);

    if (!epfNumber) {
      message.error('EPF Number is required.');
      return;
    }
    if (activeRows.length === 0) {
      message.error('Please keep at least one item on this invoice.');
      return;
    }

    const term = Number(values.overallTerm) || activeRows.find(r => r.term)?.term || 0;

    setSaving(true);
    try {
      await updateSale({
        invoiceNo: sale.invoiceNo,
        date: values.date || sale.date,
        epfNumber,
        customerName: String(values.customerName || '').trim(),
        institution: String(values.institution || '').trim(),
        contactNumber: String(values.contactNumber || '').trim(),
        nic: String(values.nic || '').trim(),
        items: activeRows.map(r => ({
          itemName: String(r.itemName || '').trim(),
          modelNumber: String(r.modelNumber || '').trim(),
          cashPrice: Number(r.cashPrice) || 0,
          rental: Number(r.rental) || 0,
          term: r.term || term,
        })),
        totalCashPrice,
        totalRentalMonthly,
        overallTerm: term,
        interestRate: TERM_RATES[term] ?? sale.interestRate ?? 0,
      });

      message.success(`Invoice ${sale.invoiceNo.replace(/^U\s+/, '')} updated successfully.`);
      onClose();
    } catch (error) {
      console.error(error);
      message.error('Failed to update the sale record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3 pr-6">
          <span className="font-bold text-lg">Edit Invoice</span>
          <span className="font-mono text-red-500 font-bold">{(sale?.invoiceNo || '').replace(/^U\s+/, '')}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          className="bg-singer hover:bg-singer-dark"
        >
          Save Changes
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="mt-4"
        initialValues={sale ? buildInitialValues(sale) : undefined}
      >
        <Row gutter={[16, 8]}>
          <Col xs={24} md={4}>
            <Form.Item label="Invoice No">
              <Input value={invoiceNoField} readOnly className="bg-slate-50 font-mono" />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item label="Date" required>
              <Input type="date" placeholder="Select date" />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item label="EPF Number" required>
              <Input placeholder="EPF Number" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Customer Name">
              <Input placeholder="Customer Name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Institution">
              <Input placeholder="Institution" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Contact Number">
              <Input placeholder="Contact Number" />
            </Form.Item>
          </Col>
          <Col xs={24} md={5}>
            <Form.Item label="NIC Number (ID)">
              <Input placeholder="NIC Number" />
            </Form.Item>
          </Col>
          <Col xs={24} md={5}>
            <Form.Item label="Term (Months)">
              <Select
                placeholder="Select Term"
                allowClear
                onChange={handleTermChange}
                options={TERM_OPTIONS}
              />
            </Form.Item>
          </Col>
        </Row>

        <Text className="font-bold block mb-2 text-slate-700">Invoice Items</Text>
        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-56">Model Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Cash Price (Rs)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Monthly Rental (Rs)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Term</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Remove</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-center text-sm text-slate-500 font-medium">{index + 1}</td>
                  <td className="px-4 py-2">
                    <Select
                      showSearch
                      className="w-full"
                      placeholder="Select Model"
                      optionFilterProp="label"
                      allowClear
                      value={row.modelNumber || undefined}
                      onChange={value => handleModelChange(index, value ?? '')}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={items.map(it => ({
                        value: it.modelNumber,
                        label: `${it.modelNumber} - ${it.itemName}`,
                      }))}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={row.itemName}
                      placeholder="Item details"
                      onChange={e => handleRowChange(index, 'itemName', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <InputNumber
                      className="w-full"
                      value={row.cashPrice}
                      min={0}
                      onChange={value => handleRowChange(index, 'cashPrice', value ?? 0)}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => (value ? parseFloat(value.replace(/[$,\s]/g, '')) : 0)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <InputNumber
                      className="w-full"
                      value={row.rental}
                      min={0}
                      onChange={value => handleRowChange(index, 'rental', value ?? 0)}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => (value ? parseFloat(value.replace(/[$,\s]/g, '')) : 0)}
                    />
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-slate-600">
                    {row.term || overallTerm || 0} M
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeRow(index)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <Button icon={<PlusOutlined />} onClick={addRow} className="hover:border-singer hover:text-singer">
            Add Item
          </Button>
        </div>

        <Row gutter={[16, 16]} className="mt-4 pt-4 border-t border-slate-100">
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" className="text-xs">Total Cash Price</Text>
              <Text className="font-bold text-base text-slate-800">
                Rs. {totalCashPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" className="text-xs">Total Monthly Rental</Text>
              <Text className="font-bold text-base text-singer">
                Rs. {totalRentalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" className="text-xs">Items</Text>
              <Text className="font-bold text-base text-slate-800">{rows.filter(r => r.modelNumber || r.itemName).length}</Text>
            </Space>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EditSaleModal;
