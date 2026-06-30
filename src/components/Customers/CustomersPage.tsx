import React, { useState } from 'react';
import { Form, Input, Button, Card, Table, Space, Popconfirm, Modal, Row, Col, message, Upload, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, UserOutlined, UploadOutlined } from '@ant-design/icons';
import { useCustomers } from '../../hooks/useCustomers';
import type { Customer } from '../../types';
import * as XLSX from 'xlsx';

export const CustomersPage: React.FC = () => {
  const { customers, loading, addCustomer, deleteCustomer, bulkAddCustomers, clearAllCustomers } = useCustomers();
  const [custLoading, setCustLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

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

  const handleAddCustomer = async (values: any) => {
    try {
      const exists = customers.some(c => c.epfNumber.toLowerCase() === values.epfNumber.trim().toLowerCase());
      if (exists) {
        message.error('A customer with this EPF Number already exists.');
        return;
      }
      
      const newCustomer: Customer = {
        epfNumber: values.epfNumber.trim(),
        institution: values.institution.trim(),
        customerName: values.customerName.trim(),
        contactNumber: values.contactNumber.trim(),
        nic: (values.nic || '').trim(),
      };
      
      await addCustomer(newCustomer);
      message.success('Customer added successfully!');
      addForm.resetFields();
    } catch (error) {
      console.error(error);
      message.error('Failed to add customer.');
    }
  };

  const handleEditCustomerClick = (customer: Customer) => {
    setEditingCustomer(customer);
    editForm.setFieldsValue(customer);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingCustomer) return;

      const updatedCustomer: Customer = {
        epfNumber: editingCustomer.epfNumber, // EPF Number is read-only in edit
        institution: values.institution.trim(),
        customerName: values.customerName.trim(),
        contactNumber: values.contactNumber.trim(),
        nic: (values.nic || '').trim(),
      };

      await addCustomer(updatedCustomer); // setDoc will overwrite
      message.success('Customer updated successfully!');
      setEditModalVisible(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error(error);
      message.error('Failed to update customer.');
    }
  };

  const handleDelete = async (epfNumber: string) => {
    try {
      await deleteCustomer(epfNumber);
      message.success('Customer deleted successfully!');
    } catch (error) {
      console.error(error);
      message.error('Failed to delete customer.');
    }
  };

  // Filter customers based on search text
  const filteredCustomers = customers.filter(c => 
    c.epfNumber.toLowerCase().includes(searchText.toLowerCase()) ||
    c.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
    c.institution.toLowerCase().includes(searchText.toLowerCase()) ||
    c.contactNumber.includes(searchText)
  );

  const columns = [
    {
      title: 'EPF Number',
      dataIndex: 'epfNumber',
      key: 'epfNumber',
      sorter: (a: Customer, b: Customer) => a.epfNumber.localeCompare(b.epfNumber),
    },
    {
      title: 'Customer Name',
      dataIndex: 'customerName',
      key: 'customerName',
      sorter: (a: Customer, b: Customer) => a.customerName.localeCompare(b.customerName),
    },
    {
      title: 'Institution',
      dataIndex: 'institution',
      key: 'institution',
      sorter: (a: Customer, b: Customer) => a.institution.localeCompare(b.institution),
    },
    {
      title: 'Contact Number',
      dataIndex: 'contactNumber',
      key: 'contactNumber',
    },
    {
      title: 'NIC (ID)',
      dataIndex: 'nic',
      key: 'nic',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Customer) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined className="text-singer" />} 
            onClick={() => handleEditCustomerClick(record)}
          />
          <Popconfirm
            title="Delete Customer"
            description="Are you sure you want to delete this customer?"
            onConfirm={() => handleDelete(record.epfNumber)}
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
      <Row gutter={[24, 24]}>
        {/* Add Customer Card */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <UserOutlined className="text-singer" />
                <span>Add New Customer</span>
              </Space>
            } 
            bordered={false} 
            className="shadow-sm rounded-xl"
          >
            <Form
              form={addForm}
              layout="vertical"
              onFinish={handleAddCustomer}
              requiredMark={false}
            >
              <Form.Item
                name="epfNumber"
                label="EPF Number"
                rules={[{ required: true, message: 'Please enter EPF number' }]}
              >
                <Input placeholder="e.g., EPF-12345" />
              </Form.Item>

              <Form.Item
                name="customerName"
                label="Customer Name"
                rules={[{ required: true, message: 'Please enter customer name' }]}
              >
                <Input placeholder="e.g., John Doe" />
              </Form.Item>

              <Form.Item
                name="institution"
                label="Institution"
                rules={[{ required: true, message: 'Please enter institution' }]}
              >
                <Input placeholder="e.g., Ministry of Health" />
              </Form.Item>

              <Form.Item
                name="contactNumber"
                label="Contact Number"
                rules={[
                  { required: true, message: 'Please enter contact number' },
                  { pattern: /^[0-9+\-\s()]{7,15}$/, message: 'Please enter a valid phone number' }
                ]}
              >
                <Input placeholder="e.g., 0771234567" />
              </Form.Item>

              <Form.Item
                name="nic"
                label="NIC Number (ID)"
              >
                <Input placeholder="e.g., 717470427V" />
              </Form.Item>

              <Form.Item className="mb-0">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<PlusOutlined />} 
                  block
                  className="bg-singer hover:bg-singer-dark"
                >
                  Save Customer
                </Button>
              </Form.Item>
            </Form>

            <Divider className="border-slate-200 !my-4" />

            <Upload
              beforeUpload={handleCustomerUpload}
              accept=".xlsx,.xls,.csv"
              showUploadList={false}
              disabled={custLoading}
            >
              <Button
                icon={<UploadOutlined />}
                loading={custLoading}
                block
                className="border-dashed border-slate-300 text-slate-600 hover:border-singer hover:text-singer"
              >
                Upload Customers from Excel
              </Button>
            </Upload>
          </Card>
        </Col>

        {/* Customers Table Card */}
        <Col xs={24} lg={16}>
          <Card 
            bordered={false} 
            className="shadow-sm rounded-xl"
            title="Saved Customers List"
            extra={
              <Space>
                <Input
                  placeholder="Search customers..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 200 }}
                  allowClear
                />
                <Popconfirm
                  title="Remove all customers?"
                  description="This will permanently delete all customer records."
                  onConfirm={clearAllCustomers}
                  okText="Yes, Remove All"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} disabled={customers.length === 0}>
                    Remove All
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Table
              dataSource={filteredCustomers}
              columns={columns}
              rowKey="epfNumber"
              loading={loading}
              pagination={{ pageSize: 8 }}
              className="border border-slate-100 rounded-lg overflow-hidden"
            />
          </Card>
        </Col>
      </Row>

      {/* Edit Customer Modal */}
      <Modal
        title="Edit Customer Details"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingCustomer(null);
        }}
        okText="Save Changes"
        okButtonProps={{ className: 'bg-blue-600 hover:bg-blue-500' }}
      >
        <Form
          form={editForm}
          layout="vertical"
          requiredMark={false}
          className="mt-4"
        >
          <Form.Item
            label="EPF Number"
            className="mb-4"
          >
            <Input value={editingCustomer?.epfNumber} disabled className="bg-slate-50" />
          </Form.Item>

          <Form.Item
            name="customerName"
            label="Customer Name"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="institution"
            label="Institution"
            rules={[{ required: true, message: 'Please enter institution' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="contactNumber"
            label="Contact Number"
            rules={[
              { required: true, message: 'Please enter contact number' },
              { pattern: /^[0-9+\-\s()]{7,15}$/, message: 'Please enter a valid phone number' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="nic"
            label="NIC Number (ID)"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default CustomersPage;
