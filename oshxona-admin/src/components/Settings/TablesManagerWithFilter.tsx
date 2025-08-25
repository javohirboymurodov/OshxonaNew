import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, InputNumber, Input, message, Select, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, FilePdfOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { TableItem } from './types';
import apiService from '@/services/api';

const TablesManagerWithFilter: React.FC = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TableItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [branches, setBranches] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [filteredItems, setFilteredItems] = useState<TableItem[]>([]);

  const fetchTables = async (page = 1, pageSize = 20, branchFilter?: string) => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (branchFilter) {
        params.branch = branchFilter;
      }
      
      const data = await apiService.getTables(params) as unknown as { 
        items?: TableItem[]; 
        pagination?: { total?: number; page?: number; pageSize?: number } 
      };
      
      const list: TableItem[] = (data?.items ?? []);
      const pag = (data?.pagination ?? { total: list.length, page, pageSize });
      
      setItems(list);
      setPagination({ 
        page: Number(pag.page || page), 
        pageSize: Number(pag.pageSize || pageSize), 
        total: Number(pag.total || list.length || 0) 
      });
    } catch (e) {
      console.error('fetchTables error', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on selected branch
  useEffect(() => {
    if (selectedBranch) {
      const filtered = items.filter(item => item.branch?._id === selectedBranch || item.branch === selectedBranch);
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [items, selectedBranch]);

  useEffect(() => {
    const init = async () => {
      try {
        const b = await apiService.getBranches() as unknown as { 
          branches?: Array<{ _id: string; name: string }>; 
          items?: Array<{ _id: string; name: string }> 
        } | Array<{ _id: string; name: string }>;
        
        const list = Array.isArray(b) ? b : (b?.branches || b?.items || []);
        setBranches(list);
      } catch {
        // ignore
      }
      await fetchTables(1, pagination.pageSize, selectedBranch);
    };
    init();
  }, [selectedBranch]);

  const handleCreate = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      console.log('Creating table:', values);
      
      await apiService.createTable(values);
      messageApi.success('Stol muvaffaqiyatli yaratildi');
      form.resetFields();
      await fetchTables(pagination.page, pagination.pageSize, selectedBranch);
    } catch (error) {
      console.error('Create table error:', error);
      messageApi.error('Stol yaratishda xatolik');
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await apiService.deleteTable(id);
      messageApi.success('Stol o\'chirildi');
      await fetchTables(pagination.page, pagination.pageSize, selectedBranch);
    } catch (error) {
      console.error('Delete table error:', error);
      messageApi.error('Stol o\'chirishda xatolik');
    }
  };

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleRefresh = () => {
    fetchTables(pagination.page, pagination.pageSize, selectedBranch);
  };

  const columns: ColumnsType<TableItem> = [
    {
      title: 'Stol raqami',
      dataIndex: 'tableNumber',
      key: 'tableNumber',
      sorter: (a, b) => a.tableNumber - b.tableNumber,
    },
    {
      title: 'Filial',
      dataIndex: ['branch', 'name'],
      key: 'branch',
      render: (_, record) => {
        const branchName = typeof record.branch === 'object' ? record.branch?.name : 
                          branches.find(b => b._id === record.branch)?.name;
        return branchName || 'Noma\'lum';
      },
    },
    {
      title: 'QR Code',
      dataIndex: 'qrCode',
      key: 'qrCode',
      render: (qrCode) => (
        <code style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '2px 4px' }}>
          {qrCode?.substring(0, 16)}...
        </code>
      ),
    },
    {
      title: 'Holat',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <span style={{ color: isActive ? '#52c41a' : '#ff4d4f' }}>
          {isActive ? 'Faol' : 'Nofaol'}
        </span>
      ),
    },
    {
      title: 'Yaratilgan',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('uz-UZ'),
    },
    {
      title: 'Amallar',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              modal.confirm({
                title: 'Stolni o\'chirish',
                content: `${record.tableNumber}-stolni o\'chirishni tasdiqlaysizmi?`,
                onOk: () => handleDelete(record._id),
              });
            }}
          >
            O'chirish
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      {modalContextHolder}
      
      {/* Filter Section */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space>
              <FilterOutlined />
              <span>Filial filtri:</span>
              <Select
                placeholder="Barcha filiallar"
                value={selectedBranch}
                onChange={handleBranchChange}
                style={{ minWidth: 200 }}
                allowClear
              >
                {branches.map(branch => (
                  <Select.Option key={branch._id} value={branch._id}>
                    {branch.name}
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
            >
              Yangilash
            </Button>
          </Col>
          <Col xs={24} sm={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <span style={{ color: '#666' }}>
                Jami: {filteredItems.length} ta stol
                {selectedBranch && (
                  <span style={{ marginLeft: 8, color: '#1890ff' }}>
                    (filtr qo'llanilgan)
                  </span>
                )}
              </span>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              modal.info({
                title: 'Yangi stol yaratish',
                width: 500,
                content: (
                  <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                      name="tableNumber"
                      label="Stol raqami"
                      rules={[{ required: true, message: 'Stol raqamini kiriting' }]}
                    >
                      <InputNumber min={1} placeholder="Stol raqami" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="branch"
                      label="Filial"
                      rules={[{ required: true, message: 'Filialni tanlang' }]}
                    >
                      <Select placeholder="Filialni tanlang">
                        {branches.map(branch => (
                          <Select.Option key={branch._id} value={branch._id}>
                            {branch.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="description" label="Tavsif">
                      <Input.TextArea placeholder="Stol haqida qo'shimcha ma'lumot" />
                    </Form.Item>
                  </Form>
                ),
                onOk: handleCreate,
              });
            }}
          >
            Yangi stol
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: selectedBranch ? filteredItems.length : pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} / ${total} ta ${selectedBranch ? '(filtrlangan)' : ''}`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, page, pageSize }));
              if (!selectedBranch) {
                fetchTables(page, pageSize);
              }
            },
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default TablesManagerWithFilter;