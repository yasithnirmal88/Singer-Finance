import React, { useState, useEffect } from 'react';
import { ConfigProvider, Form, Input, Select, Button, InputNumber, message } from 'antd';
import {
  SaveOutlined,
  ClearOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  UserOutlined,
  BankOutlined,
  PhoneOutlined,
  IdcardOutlined,
  PlusOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  ContainerOutlined,
  CalendarOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { useCustomers } from '../../hooks/useCustomers';
import { useItems } from '../../hooks/useItems';
import { useSales } from '../../hooks/useSales';
import type { Customer, SaleItem } from '../../types';
import { TERM_OPTIONS } from '../../constants';
import { getTermRate, round2 } from '../../utils/pricing';
import { formatMoney } from '../../utils/format';
import PrintLayout from '../Print/PrintLayout';
import type { PrintSaleData } from '../Print/PrintLayout';
import './NewSalePage.css';

/** Accent used by this page's buttons, focus rings and highlights. Use '#d6073b' for the Singer red. */
const ACCENT = '#2563eb';

/** Value of a single editable grid cell. */
type RowValue = string | number | null;

/** Today's date as YYYY-MM-DD, the format the date input and the stored record use. */
const todayISO = () => new Date().toISOString().split('T')[0];

interface RowState {
  modelNumber: string;
  itemName: string;
  cashPrice: number;
  rental: number;
  term: number;
}

const blankRow = (): RowState => ({ modelNumber: '', itemName: '', cashPrice: 0, rental: 0, term: 0 });
const initialRows = (): RowState[] => Array.from({ length: 5 }, blankRow);

export const NewSalePage: React.FC = () => {
  const { customers, searchCustomers } = useCustomers();
  const { items } = useItems();
  const { addSale, generateNextInvoiceNo } = useSales();

  const [form] = Form.useForm();
  
  // The invoice number and date are initialised straight from the sales list
  // rather than mirrored into state by an effect, so the form never renders an
  // empty or stale number on first paint. handleClearForm still refreshes them
  // after a save.
  const [invoiceNo, setInvoiceNo] = useState(() => generateNextInvoiceNo());
  const [date, setDate] = useState(() => todayISO());
  const [epfNumber, setEpfNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [institution, setInstitution] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [nic, setNic] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  const [rows, setRows] = useState<RowState[]>(initialRows());
  const [overallTerm, setOverallTerm] = useState<number | undefined>(undefined);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [printSaleData, setPrintSaleData] = useState<PrintSaleData | null>(null);

  // Printing is a browser side effect: wait until the hidden invoice is in the
  // DOM, print, then drop it again on afterprint.
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
      const rate = getTermRate(overallTerm);
      const updatedRows = [...rows];
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        modelNumber: item.modelNumber,
        itemName: item.itemName,
        cashPrice: item.cashPrice,
        rental: rate ? round2(item.cashPrice * rate) : item.rental,
        term: overallTerm || 0,
      };
      setRows(updatedRows);
    }
  };

  const handleRowChange = (rowIndex: number, field: keyof RowState, value: RowValue) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };
    setRows(updatedRows);
  };

  const handleOverallTermChange = (value: number) => {
    setOverallTerm(value);
    const rate = getTermRate(value);
    setInterestRate(rate);

    const updatedRows = rows.map(row => {
      if (row.modelNumber) {
        return { ...row, term: value, rental: round2(row.cashPrice * rate) };
      }
      return row;
    });
    setRows(updatedRows);
  };

  const handleAddItem = () => setRows(prev => [...prev, blankRow()]);

  // Removing the last remaining row just empties it, so the grid is never empty.
  const handleRemoveRow = (rowIndex: number) => {
    setRows(prev => (prev.length <= 1 ? [blankRow()] : prev.filter((_, i) => i !== rowIndex)));
  };

  const totalCashPrice = rows.reduce((sum, row) => sum + (row.cashPrice || 0), 0);
  const totalRentalMonthly = rows.reduce((sum, row) => sum + (row.rental || 0), 0);

  const interestRateLabel = interestRate ? (interestRate * 100).toFixed(3) : '';

  const handleClearForm = () => {
    form.resetFields();
    setDate(todayISO());
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

  const numberFormat = {
    formatter: (value: number | string | undefined) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
    parser: (value: string | undefined) => (value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0),
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: ACCENT, borderRadius: 8 } }}>
      {printSaleData && <PrintLayout saleData={printSaleData} />}

      <div className="ns-root no-print">
        <header className="ns-page-head">
          <span className="ns-page-icon" aria-hidden="true">
            <ShoppingCartOutlined />
          </span>
          <div className="ns-page-titles">
            <h1 className="ns-page-title">New Sale</h1>
            <p className="ns-page-sub">Create a new invoice and record a sale</p>
          </div>
          <span className="ns-invoice-pill">
            <FileTextOutlined aria-hidden="true" />
            Invoice No: {invoiceNo.replace(/^U\s+/, '')}
          </span>
        </header>

        <Form form={form} layout="vertical" requiredMark={false}>
          <section className="ns-card">
            <div className="ns-fields">
              <Form.Item
                label={<>Date <span className="ns-req">*</span></>}
              >
                <Input
                  size="large"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  prefix={<CalendarOutlined className="ns-icon" />}
                />
              </Form.Item>

              <Form.Item label="EPF Number">
                <Select
                  showSearch
                  size="large"
                  className="ns-full"
                  placeholder="Search EPF Number"
                  filterOption={false}
                  onSearch={async (value) => {
                    if (!value || value.length < 2) {
                      setSearchResults([]);
                      return;
                    }
                    setSearching(true);
                    const results = await searchCustomers(value);
                    setSearchResults(results);
                    setSearching(false);
                  }}
                  onChange={handleCustomerSelect}
                  value={epfNumber || undefined}
                  notFoundContent={searching ? 'Searching...' : 'Type at least 2 characters to search'}
                  options={searchResults.map(c => ({
                    value: c.epfNumber,
                    label: `${c.epfNumber} - ${c.customerName}`,
                  }))}
                />
              </Form.Item>

              <Form.Item name="customerName" label="Customer Name">
                <Input
                  size="large"
                  placeholder="Enter customer name"
                  prefix={<UserOutlined className="ns-icon" />}
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    form.setFieldsValue({ customerName: e.target.value });
                  }}
                />
              </Form.Item>

              <Form.Item name="institution" label="Institution">
                <Input
                  size="large"
                  placeholder="Enter institution name"
                  prefix={<BankOutlined className="ns-icon" />}
                  value={institution}
                  onChange={e => {
                    setInstitution(e.target.value);
                    form.setFieldsValue({ institution: e.target.value });
                  }}
                />
              </Form.Item>

              <Form.Item name="contactNumber" label="Contact Number">
                <Input
                  size="large"
                  placeholder="Enter contact number"
                  prefix={<PhoneOutlined className="ns-icon" />}
                  value={contactNumber}
                  onChange={e => {
                    setContactNumber(e.target.value);
                    form.setFieldsValue({ contactNumber: e.target.value });
                  }}
                />
              </Form.Item>

              <Form.Item name="nic" label="NIC Number (ID)">
                <Input
                  size="large"
                  placeholder="Enter NIC number"
                  prefix={<IdcardOutlined className="ns-icon" />}
                  value={nic}
                  onChange={e => {
                    setNic(e.target.value);
                    form.setFieldsValue({ nic: e.target.value });
                  }}
                />
              </Form.Item>
            </div>
          </section>

          <section className="ns-card">
            <div className="ns-section-head">
              <span className="ns-section-title">
                <ContainerOutlined className="ns-section-icon" aria-hidden="true" />
                Items
              </span>
              <Button icon={<PlusOutlined />} onClick={handleAddItem} className="ns-add">
                Add Item
              </Button>
            </div>

            <div className="ns-table-wrap">
              <table className="ns-table">
                <thead>
                  <tr>
                    <th className="ns-col-num">#</th>
                    <th className="ns-col-model">Model Number</th>
                    <th>Item Name</th>
                    <th className="ns-col-money">Cash Price (Rs)</th>
                    <th className="ns-col-money">Monthly Rental (Rs)</th>
                    <th className="ns-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      <td className="ns-col-num">{index + 1}</td>
                      <td>
                        <Select
                          showSearch
                          size="large"
                          className="ns-full"
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
                      <td>
                        <Input
                          size="large"
                          value={row.itemName}
                          onChange={(e) => handleRowChange(index, 'itemName', e.target.value)}
                          placeholder="Item details"
                          disabled={!row.modelNumber}
                        />
                      </td>
                      <td>
                        <InputNumber
                          size="large"
                          className="ns-full"
                          value={row.cashPrice}
                          min={0}
                          onChange={(value) => handleRowChange(index, 'cashPrice', value || 0)}
                          disabled={!row.modelNumber}
                          {...numberFormat}
                        />
                      </td>
                      <td>
                        <InputNumber
                          size="large"
                          className="ns-full"
                          value={row.rental}
                          min={0}
                          onChange={(value) => handleRowChange(index, 'rental', value || 0)}
                          disabled={!row.modelNumber}
                          {...numberFormat}
                        />
                      </td>
                      <td className="ns-col-actions">
                        <button
                          type="button"
                          className="ns-delete"
                          onClick={() => handleRemoveRow(index)}
                          aria-label={`Remove item ${index + 1}`}
                        >
                          <DeleteOutlined />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ns-summary">
              <Form.Item label={<>Term (Months) <span className="ns-req">*</span></>}>
                <Select
                  size="large"
                  placeholder="Select Term"
                  value={overallTerm}
                  onChange={handleOverallTermChange}
                  options={TERM_OPTIONS}
                  prefix={<CalendarOutlined className="ns-icon" />}
                />
              </Form.Item>

              <Form.Item label="Interest Rate (Nominal)">
                <Input
                  size="large"
                  readOnly
                  placeholder="Enter interest rate"
                  value={interestRateLabel}
                  prefix={<PercentageOutlined className="ns-icon" />}
                  suffix="%"
                />
              </Form.Item>

              <Form.Item label="Total Cash Price (Rs)">
                <Input
                  size="large"
                  readOnly
                  className="ns-total"
                  value={formatMoney(totalCashPrice)}
                  prefix={<DatabaseOutlined className="ns-icon" />}
                />
              </Form.Item>

              <Form.Item label="Total Monthly Rental (Rs)">
                <Input
                  size="large"
                  readOnly
                  className="ns-total ns-total-accent"
                  value={formatMoney(totalRentalMonthly)}
                  prefix={<DatabaseOutlined className="ns-icon" />}
                />
              </Form.Item>
            </div>

            <div className="ns-actions">
              <Button size="large" icon={<ClearOutlined />} onClick={handleClearForm}>
                Clear Form
              </Button>
              <Button size="large" type="primary" icon={<SaveOutlined />} onClick={handleSaveAndPrint}>
                Save &amp; Print
              </Button>
            </div>
          </section>
        </Form>
      </div>
    </ConfigProvider>
  );
};
export default NewSalePage;
