import React, { useState, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Table,
  Space,
  message,
  Card,
  Row,
  Col,
} from 'antd';
import { PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCustomers } from '../hooks/useCustomers';
import { useItems } from '../hooks/useItems';
import { useSales } from '../hooks/useSales';
import { PrintLayout } from '../components/Print/PrintLayout';
import './NewSalePage.css';

const TERM_RATES: Record<number, number> = {
  6: 0.084,
  12: 0.162,
  18: 0.234,
  24: 0.300,
};

interface SaleItem {
  modelNumber: string;
  itemName: string;
  cashPrice: number;
  rental: number;
  term: number;
}

interface PrintSaleData {
  invoiceNo: string;
  date: string;
  customerName: string;
  institution: string;
  epfNumber: string;
  contactNumber: string;
  items: SaleItem[];
  totalCashPrice: number;
  totalRental: number;
  term: number;
  interestRate: number;
}

export const NewSalePage: React.FC = () => {
  const [form] = Form.useForm();
  const { customers } = useCustomers();
  const { items } = useItems();
  const { addSale } = useSales();

  const [saleItems, setSaleItems] = useState<(SaleItem | {})[]>(
    Array(5).fill({})
  );
  const [selectedTerm, setSelectedTerm] = useState<number>(12);
  const [printSaleData, setPrintSaleData] = useState<PrintSaleData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInvoiceNo = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `SF-${year}${month}${day}-${random}`;
  }, []);

  const handleCustomerChange = (epfNumber: string) => {
    const customer = customers.find(c => c.epfNumber === epfNumber);
    if (customer) {
      form.setFieldsValue({
        customerName: customer.customerName,
        institution: customer.institution,
        contactNumber: customer.contactNumber,
      });
    }
  };

  const handleItemChange = (index: number, modelNumber: string) => {
    const item = items.find(i => i.modelNumber === modelNumber);
    if (item) {
      const updatedItems = [...saleItems];
      const rental = item.cashPrice * TERM_RATES[selectedTerm];
      updatedItems[index] = {
        modelNumber: item.modelNumber,
        itemName: item.itemName,
        cashPrice: item.cashPrice,
        rental: rental,
        term: selectedTerm,
      };
      setSaleItems(updatedItems);
    }
  };

  const removeItem = (index: number) => {
    const updatedItems = [...saleItems];
    updatedItems[index] = {};
    setSaleItems(updatedItems);
  };

  const calculateTotals = () => {
    const validItems = saleItems.filter((item: any) => item.modelNumber);
    const totalCashPrice = validItems.reduce((sum: number, item: any) => sum + item.cashPrice, 0);
    const totalRental = validItems.reduce((sum: number, item: any) => sum + item.rental, 0);
    return { totalCashPrice, totalRental };
  };

  const handlePrint = async () => {
    try {
      const values = await form.validateFields();

      const validItems = saleItems.filter((item: any) => item.modelNumber);

      if (validItems.length === 0) {
        message.error('Please add at least one item');
        return;
      }

      const { totalCashPrice, totalRental } = calculateTotals();

      const printData: PrintSaleData = {
        invoiceNo: generateInvoiceNo(),
        date: values.date || new Date().toISOString().split('T')[0],
        customerName: values.customerName || '',
        institution: values.institution || '',
        epfNumber: values.epfNumber || '',
        contactNumber: values.contactNumber || '',
        items: validItems as SaleItem[],
        totalCashPrice,
        totalRental,
        term: selectedTerm,
        interestRate: 0,
      };

      setPrintSaleData(printData);

      setTimeout(() => {
        window.print();
      }, 500);
    } catch (error) {
      message.error('Please fill in all required fields');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const validItems = saleItems.filter((item: any) => item.modelNumber) as SaleItem[];

      if (validItems.length === 0) {
        message.error('Please add at least one item');
        return;
      }

      const { totalCashPrice, totalRental } = calculateTotals();
      const invoiceNo = generateInvoiceNo();

      const saleData = {
        invoiceNo,
        date: values.date || new Date().toISOString().split('T')[0],
        epfNumber: values.epfNumber,
        customerName: values.customerName,
        institution: values.institution,
        contactNumber: values.contactNumber,
        items: validItems,
        totalCashPrice,
        totalRentalMonthly: totalRental,
        overallTerm: selectedTerm,
        interestRate: 0,
      };

      await addSale(saleData);
      message.success('Sale saved successfully');
      form.resetFields();
      setSaleItems(Array(5).fill({}));
    } catch (error) {
      message.error('Failed to save sale');
    } finally {
      setLoading(false);
    }
  };

  const { totalCashPrice, totalRental } = calculateTotals();

  const itemsColumns = [
    {
      title: '#',
      key: 'index',
      width: 40,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Item Model',
      key: 'model',
      width: 150,
      render: (_: any, __: any, index: number) => (
        <Select
          placeholder="Select item"
          onChange={(value) => handleItemChange(index, value)}
          value={(saleItems[index] as any)?.modelNumber || undefined}
          style={{ width: '100%' }}
        >
          {items.map(item => (
            <Select.Option key={item.modelNumber} value={item.modelNumber}>
              {item.modelNumber} - {item.itemName}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Item Name',
      key: 'name',
      render: (_: any, __: any, index: number) => (
        <span>{(saleItems[index] as any)?.itemName || '-'}</span>
      ),
    },
    {
      title: 'Cash Price',
      key: 'cashPrice',
      width: 120,
      render: (_: any, __: any, index: number) => (
        <span>{(saleItems[index] as any)?.cashPrice?.toLocaleString('en-LK') || '-'}</span>
      ),
    },
    {
      title: 'Rental',
      key: 'rental',
      width: 120,
      render: (_: any, __: any, index: number) => (
        <span>{(saleItems[index] as any)?.rental?.toFixed(2) || '-'}</span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, __: any, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(index)}
          disabled={!(saleItems[index] as any)?.modelNumber}
        />
      ),
    },
  ];

  return (
    <>
      {printSaleData && (
        <div className="no-print" style={{ display: 'none' }}>
          <PrintLayout saleData={printSaleData} />
        </div>
      )}

      <div className="new-sale-page">
        <Card title="Create New Sale" className="sale-card">
          <Form
            form={form}
            layout="vertical"
            autoComplete="off"
            requiredMark="optional"
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Customer (EPF)"
                  name="epfNumber"
                  rules={[{ required: true, message: 'Please select a customer' }]}
                >
                  <Select
                    showSearch
                    placeholder="Select customer by EPF"
                    onChange={handleCustomerChange}
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={customers.map(customer => ({
                      value: customer.epfNumber,
                      label: `${customer.epfNumber} - ${customer.customerName}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Date" name="date">
                  <Input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Customer Name" name="customerName">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Institution" name="institution">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Contact Number" name="contactNumber">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Term (Months)" name="term">
                  <Select
                    value={selectedTerm}
                    onChange={setSelectedTerm}
                  >
                    <Select.Option value={6}>6 Months</Select.Option>
                    <Select.Option value={12}>12 Months</Select.Option>
                    <Select.Option value={18}>18 Months</Select.Option>
                    <Select.Option value={24}>24 Months</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <h3>Items (Max 5)</h3>
            <Table
              columns={itemsColumns}
              dataSource={saleItems.map((_, index) => ({ key: index }))}
              pagination={false}
              size="small"
              className="items-table"
            />

            <Card size="small" className="totals-card" style={{ marginTop: '20px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <div className="total-item">
                    <label>Total Cash Price:</label>
                    <span className="total-value">
                      Rs {totalCashPrice.toLocaleString('en-LK')}
                    </span>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="total-item">
                    <label>Total Monthly Rental:</label>
                    <span className="total-value">
                      Rs {totalRental.toFixed(2)}
                    </span>
                  </div>
                </Col>
              </Row>
            </Card>

            <Form.Item style={{ marginTop: '30px', marginBottom: 0 }}>
              <Space size="large">
                <Button
                  type="primary"
                  icon={<PrinterOutlined />}
                  onClick={handlePrint}
                  size="large"
                >
                  Print Invoice
                </Button>
                <Button
                  type="default"
                  onClick={handleSave}
                  loading={loading}
                  size="large"
                >
                  Save Sale
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </>
  );
};

export default NewSalePage;
