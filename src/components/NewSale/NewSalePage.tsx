import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Space, Row, Col, InputNumber, message } from 'antd';
import { SaveOutlined, ClearOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useCustomers } from '../../hooks/useCustomers';
import { useItems } from '../../hooks/useItems';
import { useSales } from '../../hooks/useSales';
import type { SaleItem } from '../../types';
import PrintLayout from '../Print/PrintLayout';

const TERM_RATES: Record<number, number> = {
  6: 0.18562,
  12: 0.10146,
  18: 0.07374,
  24: 0.06011,
};

export const NewSalePage: React.FC = () => {
  const { customers } = useCustomers();
  const { items } = useItems();
  const { addSale, generateNextInvoiceNo } = useSales();

  const [form] = Form.useForm();
  
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState('');
  const [epfNumber, setEpfNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [institution, setInstitution] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [nic, setNic] = useState('');

  interface RowState {
    modelNumber: string;
    itemName: string;
    cashPrice: number;
    rental: number;
    term: number;
  }

  const initialRows = (): RowState[] => 
    Array.from({ length: 5 }, () => ({
      modelNumber: '',
      itemName: '',
      cashPrice: 0,
      rental: 0,
      term: 0,
    }));

  const [rows, setRows] = useState<RowState[]>(initialRows());
  const [overallTerm, setOverallTerm] = useState<number | undefined>(undefined);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [printSaleData, setPrintSaleData] = useState<any>(null);

  useEffect(() => {
    setInvoiceNo(generateNextInvoiceNo());
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, [customers, generateNextInvoiceNo]);

  useEffect(() => {
    if (printSaleData) {
      const handleAfterPrint = () => setPrintSaleData(null);
      window.addEventListener('afterprint', handleAfterPrint);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
        });
      });
      return () => window.removeEventListener('afterprint', handleAfterPrint);
    }
  }, [printSaleData]);

  const handleCustomerSelect = (value: string) => {
    const cust = customers.find(c => c.epfNumber === value);
    if (cust) {
      setEpfNumber(cust.epfNumber);
      setCustomerName(cust.customerName);
      setInstitution(cust.institution);
      setContactNumber(cust.contactNumber);
      setNic(cust.nic || '');
      
      form.setFieldsValue({
        customerName: cust.customerName,
        institution: cust.institution,
        contactNumber: cust.contactNumber,
        nic: cust.nic || '',
      });
    }
  };

  const handleModelSelect = (rowIndex: number, value: string) => {
    const item = items.find(it => it.modelNumber === value);
    if (item) {
      const rate = overallTerm ? TERM_RATES[overallTerm] || 0 : 0;
      const updatedRows = [...rows];
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        modelNumber: item.modelNumber,
        itemName: item.itemName,
        cashPrice: item.cashPrice,
        rental: rate ? Math.round(item.cashPrice * rate * 100) / 100 : item.rental,
        term: overallTerm || 0,
      };
      setRows(updatedRows);
    }
  };

  const handleRowChange = (rowIndex: number, field: keyof RowState, value: any) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };
    setRows(updatedRows);
  };

  const handleOverallTermChange = (value: number) => {
    setOverallTerm(value);
    const rate = TERM_RATES[value] || 0;
    setInterestRate(rate);

    const updatedRows = rows.map(row => {
      if (row.modelNumber) {
        return { ...row, term: value, rental: Math.round(row.cashPrice * rate * 100) / 100 };
      }
      return row;
    });
    setRows(updatedRows);
  };

  const totalCashPrice = rows.reduce((sum, row) => sum + (row.cashPrice || 0), 0);
  const totalRentalMonthly = rows.reduce((sum, row) => sum + (row.rental || 0), 0);

  const handleClearForm = () => {
    form.resetFields();
    setEpfNumber('');
    setCustomerName('');
    setInstitution('');
    setContactNumber('');
    setNic('');
    setRows(initialRows());
    setOverallTerm(undefined);
    setInterestRate(0);
    setInvoiceNo(generateNextInvoiceNo());
    message.info('Form cleared.');
  };

  const buildPrintData = () => {
    const formValues = form.getFieldsValue();
    const activeRows = rows.filter(row => row.modelNumber && row.itemName);
    const saleItems: SaleItem[] = activeRows.map(row => ({
      itemName: row.itemName,
      modelNumber: row.modelNumber,
      cashPrice: row.cashPrice,
      rental: row.rental,
      term: row.term || overallTerm || 0,
    }));
    const percentageRate = parseFloat((interestRate * 100).toFixed(2));
    return {
      invoiceNo, date,
      epfNumber: epfNumber || formValues.epfNumber || '',
      customerName: customerName || formValues.customerName || '',
      institution: institution || formValues.institution || '',
      contactNumber: contactNumber || formValues.contactNumber || '',
      items: saleItems,
      totalCashPrice,
      totalRental: totalRentalMonthly,
      term: overallTerm || 0,
      interestRate: percentageRate,
    };
  };

  const handleSaveAndPrint = async () => {
    try {
      if (!epfNumber) {
        message.error('Please select or enter an EPF number.');
        return;
      }
      const activeRows = rows.filter(row => row.modelNumber && row.itemName);
      if (activeRows.length === 0) {
        message.error('Please add at least one item to the sale.');
        return;
      }
      if (!overallTerm) {
        message.error('Please select the term of the agreement.');
        return;
      }

      const saleItems: SaleItem[] = activeRows.map(row => ({
        itemName: row.itemName,
        modelNumber: row.modelNumber,
        cashPrice: row.cashPrice,
        rental: row.rental,
        term: row.term || overallTerm,
      }));

      await addSale({
        invoiceNo, date, epfNumber, customerName, institution,
        contactNumber, nic, items: saleItems,
        totalCashPrice, totalRentalMonthly, overallTerm, interestRate,
      });

      message.success(`Sale saved! Invoice: ${invoiceNo}`);
      setPrintSaleData(buildPrintData());
      handleClearForm();
    } catch (error) {
      console.error(error);
      message.error('Failed to save the sale record.');
    }
  };

  return (
    <div className="space-y-6">
      {printSaleData && <PrintLayout saleData={printSaleData} />}

      <Card 
        bordered={false} 
        className="shadow-sm rounded-xl no-print"
        title={
          <div className="flex justify-between items-center w-full">
            <Space>
              <ShoppingCartOutlined className="text-blue-600 text-lg" />
              <span className="font-semibold text-lg">New Sale Form</span>
            </Space>
            <span className="text-red-500 font-bold font-mono text-base bg-red-50 px-3 py-1 rounded">
              Invoice No: {invoiceNo}
            </span>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Form.Item label="Date" required>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </Form.Item>
            </Col>
            
            <Col xs={24} md={6}>
              <Form.Item label="EPF Number" required>
                <Select
                  showSearch
                  placeholder="Search EPF Number"
                  optionFilterProp="label"
                  onChange={handleCustomerSelect}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  value={epfNumber || undefined}
                  options={customers.map(c => ({
                    value: c.epfNumber,
                    label: `${c.epfNumber} - ${c.customerName}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="customerName" label="Customer Name">
                <Input 
                  value={customerName} 
                  onChange={e => {
                    setCustomerName(e.target.value);
                    form.setFieldsValue({ customerName: e.target.value });
                  }} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="institution" label="Institution">
                <Input 
                  value={institution} 
                  onChange={e => {
                    setInstitution(e.target.value);
                    form.setFieldsValue({ institution: e.target.value });
                  }} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="contactNumber" label="Contact Number">
                <Input 
                  value={contactNumber} 
                  onChange={e => {
                    setContactNumber(e.target.value);
                    form.setFieldsValue({ contactNumber: e.target.value });
                  }} 
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="nic" label="NIC Number (ID)">
                <Input 
                  value={nic} 
                  onChange={e => {
                    setNic(e.target.value);
                    form.setFieldsValue({ nic: e.target.value });
                  }} 
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="overflow-x-auto border border-slate-100 rounded-lg mt-6">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-64">Model Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Cash Price (Rs)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Monthly Rental (Rs)</th>
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
                        value={row.modelNumber || undefined}
                        onChange={(value) => handleModelSelect(index, value)}
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
                        onChange={(e) => handleRowChange(index, 'itemName', e.target.value)} 
                        placeholder="Item details"
                        disabled={!row.modelNumber}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <InputNumber
                        className="w-full"
                        value={row.cashPrice}
                        min={0}
                        onChange={(value) => handleRowChange(index, 'cashPrice', value || 0)}
                        disabled={!row.modelNumber}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <InputNumber
                        className="w-full"
                        value={row.rental}
                        min={0}
                        onChange={(value) => handleRowChange(index, 'rental', value || 0)}
                        disabled={!row.modelNumber}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Row gutter={[16, 16]} className="mt-6 pt-4 border-t border-slate-100 items-end">
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Term (Months)" required>
                <Select
                  placeholder="Select Term"
                  value={overallTerm}
                  onChange={handleOverallTermChange}
                  options={[
                    { value: 6, label: '6 Months' },
                    { value: 12, label: '12 Months' },
                    { value: 18, label: '18 Months' },
                    { value: 24, label: '24 Months' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Interest Rate (Nominal)">
                <Input 
                  value={interestRate ? `${(interestRate * 100).toFixed(3)} %` : ''} 
                  readOnly 
                  className="bg-slate-50 font-semibold"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Total Cash Price (Rs)">
                <Input 
                  value={`Rs. ${totalCashPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  readOnly 
                  className="bg-slate-50 font-bold text-slate-800"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Total Monthly Rental (Rs)">
                <Input 
                  value={`Rs. ${totalRentalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  readOnly 
                  className="bg-slate-50 font-bold text-blue-600"
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <Button 
              icon={<ClearOutlined />} 
              onClick={handleClearForm}
              size="large"
              className="hover:border-red-500 hover:text-red-500"
            >
              Clear Form
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSaveAndPrint}
              size="large"
              className="bg-blue-600 hover:bg-blue-500"
            >
              Save &amp; Print
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};
export default NewSalePage;
