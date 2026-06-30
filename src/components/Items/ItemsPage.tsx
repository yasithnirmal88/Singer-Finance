import React, { useState } from 'react';
import { Form, Input, InputNumber, Button, Card, Table, Space, Popconfirm, Modal, Row, Col, message, Upload, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, ShoppingOutlined, UploadOutlined } from '@ant-design/icons';
import { useItems } from '../../hooks/useItems';
import type { Item } from '../../types';
import * as XLSX from 'xlsx';

export const ItemsPage: React.FC = () => {
  const { items, loading, addItem, deleteItem, bulkAddItems, clearAllItems } = useItems();
  const [searchText, setSearchText] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const handleAddItem = async (values: any) => {
    try {
      const exists = items.some(it => it.modelNumber.toLowerCase() === values.modelNumber.trim().toLowerCase());
      if (exists) {
        message.error('An item with this Model Number already exists.');
        return;
      }

      const newItem: Item = {
        modelNumber: values.modelNumber.trim().toUpperCase(),
        itemName: values.itemName.trim(),
        cashPrice: Number(values.cashPrice),
        rental: Number(values.rental),
      };

      await addItem(newItem);
      message.success('Item added successfully!');
      addForm.resetFields();
    } catch (error) {
      console.error(error);
      message.error('Failed to add item.');
    }
  };

  const handleEditItemClick = (item: Item) => {
    setEditingItem(item);
    editForm.setFieldsValue(item);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingItem) return;

      const updatedItem: Item = {
        modelNumber: editingItem.modelNumber, // Model Number is read-only in edit
        itemName: values.itemName.trim(),
        cashPrice: Number(values.cashPrice),
        rental: Number(values.rental),
      };

      await addItem(updatedItem); // setDoc will overwrite
      message.success('Item updated successfully!');
      setEditModalVisible(false);
      setEditingItem(null);
    } catch (error) {
      console.error(error);
      message.error('Failed to update item.');
    }
  };

  const handleDelete = async (modelNumber: string) => {
    try {
      await deleteItem(modelNumber);
      message.success('Item deleted successfully!');
    } catch (error) {
      console.error(error);
      message.error('Failed to delete item.');
    }
  };

  const handleItemUpload = async (file: File) => {
    setUploadLoading(true);
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
          setUploadLoading(false);
          return;
        }

        const mappedItems: Item[] = [];
        for (const row of jsonData) {
          const modelKey = Object.keys(row).find(k => 
            k.toLowerCase().replace(/\s+/g, '') === 'salespartno' || 
            k.toLowerCase().replace(/\s+/g, '') === 'modelnumber' || 
            k.toLowerCase() === 'model'
          );
          const nameKey = Object.keys(row).find(k => 
            k.toLowerCase().replace(/\s+/g, '') === 'salespartdescription' || 
            k.toLowerCase().replace(/\s+/g, '') === 'itemname' || 
            k.toLowerCase().replace(/\s+/g, '') === 'name' || 
            k.toLowerCase() === 'item'
          );
          const priceKey = Object.keys(row).find(k => 
            k.toLowerCase().replace(/\s+/g, '') === 'cashprice' || 
            k.toLowerCase().replace(/\s+/g, '') === 'price' || 
            k.toLowerCase().replace(/\s+/g, '') === 'discountedprice'
          );
          const rentalKey = Object.keys(row).find(k => 
            k.toLowerCase() === 'rental' || 
            k.toLowerCase().includes('rental')
          );

          if (!modelKey || !nameKey) {
            message.error('Invalid template. Item Excel must contain at least "SalesPartNo" (or "Model") and "Sales Part Description" (or "Item Name") columns.');
            setUploadLoading(false);
            return;
          }

          mappedItems.push({
            modelNumber: String(row[modelKey]).trim().toUpperCase(),
            itemName: String(row[nameKey]).trim(),
            cashPrice: priceKey ? Number(String(row[priceKey]).replace(/,/g, '')) || 0 : 0,
            rental: rentalKey ? Number(String(row[rentalKey]).replace(/,/g, '')) || 0 : 0,
          });
        }

        await bulkAddItems(mappedItems);
        message.success(`Successfully loaded ${mappedItems.length} items into the database!`);
      } catch (error) {
        console.error(error);
        message.error('Failed to parse the items data file.');
      } finally {
        setUploadLoading(false);
      }
    };

    reader.readAsBinaryString(file);
    return false;
  };

  // Filter items based on search text
  const filteredItems = items.filter(it => 
    it.modelNumber.toLowerCase().includes(searchText.toLowerCase()) ||
    it.itemName.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Model Number',
      dataIndex: 'modelNumber',
      key: 'modelNumber',
      sorter: (a: Item, b: Item) => a.modelNumber.localeCompare(b.modelNumber),
    },
    {
      title: 'Item Name',
      dataIndex: 'itemName',
      key: 'itemName',
      sorter: (a: Item, b: Item) => a.itemName.localeCompare(b.itemName),
    },
    {
      title: 'Cash Price (Rs)',
      dataIndex: 'cashPrice',
      key: 'cashPrice',
      render: (price: number) => `Rs. ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: Item, b: Item) => a.cashPrice - b.cashPrice,
    },
    {
      title: 'Default Monthly Rental (Rs)',
      dataIndex: 'rental',
      key: 'rental',
      render: (rental: number) => `Rs. ${rental.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: Item, b: Item) => a.rental - b.rental,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Item) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined className="text-singer" />} 
            onClick={() => handleEditItemClick(record)}
          />
          <Popconfirm
            title="Delete Item"
            description="Are you sure you want to delete this item?"
            onConfirm={() => handleDelete(record.modelNumber)}
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
        {/* Add Item Card */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <ShoppingOutlined className="text-singer" />
                <span>Add New Item</span>
              </Space>
            } 
            bordered={false} 
            className="shadow-sm rounded-xl"
          >
            <Form
              form={addForm}
              layout="vertical"
              onFinish={handleAddItem}
              requiredMark={false}
            >
              <Form.Item
                name="modelNumber"
                label="Model Number"
                rules={[{ required: true, message: 'Please enter model number' }]}
              >
                <Input placeholder="e.g., SIS-REF-01" className="uppercase" />
              </Form.Item>

              <Form.Item
                name="itemName"
                label="Item Name"
                rules={[{ required: true, message: 'Please enter item name' }]}
              >
                <Input placeholder="e.g., Refrigerator 250L" />
              </Form.Item>

              <Form.Item
                name="cashPrice"
                label="Cash Price (Rs)"
                rules={[
                  { required: true, message: 'Please enter cash price' },
                  { type: 'number', min: 0, message: 'Price must be positive' }
                ]}
              >
                <InputNumber 
                  placeholder="e.g., 85000" 
                  className="w-full"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                />
              </Form.Item>

              <Form.Item
                name="rental"
                label="Default Monthly Rental (Rs)"
                rules={[
                  { required: true, message: 'Please enter default rental' },
                  { type: 'number', min: 0, message: 'Rental must be positive' }
                ]}
              >
                <InputNumber 
                  placeholder="e.g., 4200" 
                  className="w-full"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                />
              </Form.Item>

              <Form.Item className="mb-0">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<PlusOutlined />} 
                  block
                  className="bg-singer hover:bg-singer-dark"
                >
                  Save Item
                </Button>
              </Form.Item>
            </Form>

            <Divider className="border-slate-200 !my-4" />

            <Upload
              beforeUpload={handleItemUpload}
              accept=".xlsx,.xls,.csv"
              showUploadList={false}
              disabled={uploadLoading}
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploadLoading}
                block
                className="border-dashed border-slate-300 text-slate-600 hover:border-singer hover:text-singer"
              >
                Upload Items from Excel
              </Button>
            </Upload>
          </Card>
        </Col>

        {/* Items Table Card */}
        <Col xs={24} lg={16}>
          <Card 
            bordered={false} 
            className="shadow-sm rounded-xl"
            title="Saved Items List"
            extra={
              <Space>
                <Input
                  placeholder="Search items..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 200 }}
                  allowClear
                />
                <Popconfirm
                  title="Remove all items?"
                  description="This will permanently delete all item records."
                  onConfirm={clearAllItems}
                  okText="Yes, Remove All"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} disabled={items.length === 0}>
                    Remove All
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Table
              dataSource={filteredItems}
              columns={columns}
              rowKey="modelNumber"
              loading={loading}
              pagination={{ pageSize: 8 }}
              className="border border-slate-100 rounded-lg overflow-hidden"
            />
          </Card>
        </Col>
      </Row>

      {/* Edit Item Modal */}
      <Modal
        title="Edit Item Details"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingItem(null);
        }}
        okText="Save Changes"
        okButtonProps={{ className: 'bg-singer hover:bg-singer-dark' }}
      >
        <Form
          form={editForm}
          layout="vertical"
          requiredMark={false}
          className="mt-4"
        >
          <Form.Item
            label="Model Number"
            className="mb-4"
          >
            <Input value={editingItem?.modelNumber} disabled className="bg-slate-50" />
          </Form.Item>

          <Form.Item
            name="itemName"
            label="Item Name"
            rules={[{ required: true, message: 'Please enter item name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="cashPrice"
            label="Cash Price (Rs)"
            rules={[
              { required: true, message: 'Please enter cash price' },
              { type: 'number', min: 0, message: 'Price must be positive' }
            ]}
          >
            <InputNumber 
              className="w-full"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
            />
          </Form.Item>

          <Form.Item
            name="rental"
            label="Default Monthly Rental (Rs)"
            rules={[
              { required: true, message: 'Please enter default rental' },
              { type: 'number', min: 0, message: 'Rental must be positive' }
            ]}
          >
            <InputNumber 
              className="w-full"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default ItemsPage;
