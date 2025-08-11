import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, InputNumber, Input, message, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { TableItem } from './types';
import apiService from '@/services/api';

const TablesManager: React.FC = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TableItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [branches, setBranches] = useState<Array<{ _id: string; name: string }>>([]);

  const fetchTables = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const data = await apiService.getTables({ page, limit: pageSize }) as unknown as { items?: TableItem[]; pagination?: { total?: number; page?: number; pageSize?: number } };
      const list: TableItem[] = (data?.items ?? []);
      const pag = (data?.pagination ?? { total: list.length, page, pageSize });
      setItems(list);
      setPagination({ page: Number(pag.page || page), pageSize: Number(pag.pageSize || pageSize), total: Number(pag.total || list.length || 0) });
    } catch (e) {
      console.error('fetchTables error', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const b = await apiService.getBranches() as unknown as { branches?: Array<{ _id: string; name: string }>; items?: Array<{ _id: string; name: string }> } | Array<{ _id: string; name: string }>;
        const list = Array.isArray(b) ? b : (b?.branches || b?.items || []);
        setBranches(list);
      } catch {
        // ignore
      }
      await fetchTables(1, pagination.pageSize);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      await apiService.createTable({ number: values.number, capacity: values.capacity, location: values.location, branch: values.branch });
      messageApi.success('Stol yaratildi');
      form.resetFields();
      fetchTables(1, pagination.pageSize);
    } catch {
      // validation yoki api xatolik
    }
  };

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      await apiService.deleteTable(id);
      messageApi.success('Stol o\'chirildi');
      fetchTables(pagination.page, pagination.pageSize);
    } catch {
      messageApi.error('Stolni o\'chirishda xatolik');
    }
  }, [messageApi, pagination.page, pagination.pageSize]);

  const columns: ColumnsType<TableItem> = useMemo(() => ([
    { title: 'Raqam', dataIndex: 'number', key: 'number', width: 100 },
    { title: 'Filial', key: 'branch', render: (r: TableItem) => {
      const br = branches.find(b => b._id === String((r as unknown as { branch?: string }).branch));
      return br?.name || String((r as unknown as { branch?: string }).branch || '-');
    } },
    { title: 'Joy (ixtiyoriy)', dataIndex: 'location', key: 'location' },
    { title: 'Sig\'im', dataIndex: 'capacity', key: 'capacity', width: 100, render: (c?: number) => c != null ? c : '-' },
    { title: 'Faol', dataIndex: 'isActive', key: 'isActive', width: 90, render: (v?: boolean) => v ? 'Ha' : 'Yo\'q' },
    {
      title: 'Amallar', key: 'actions', width: 220, render: (_: unknown, record: TableItem) => (
        <Space>
          <Button icon={<FilePdfOutlined />} onClick={() => window.open(apiService.getTableQrPdfUrl(record._id), '_blank')}>QR PDF</Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => {
            modal.confirm({
              title: "Stolni o'chirish",
              content: 'O\'chirishni tasdiqlaysizmi?',
              onOk: () => handleDelete(record._id)
            });
          }} />
        </Space>
      )
    }
  ]), [branches, handleDelete, modal]);

  return (
    <Card title="Stollar" extra={<Button icon={<ReloadOutlined />} onClick={() => fetchTables(pagination.page, pagination.pageSize)}>Yangilash</Button>}>
      {contextHolder}
      {modalContextHolder}
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item name="branch" label="Filial" rules={[{ required: true, message: 'Filialni tanlang' }]}> 
          <Select style={{ minWidth: 200 }} placeholder="Filial" options={branches.map(b => ({ value: b._id, label: b.name }))} />
        </Form.Item>
        <Form.Item name="number" label="Raqam" rules={[{ required: true, message: 'Stol raqamini kiriting' }]}> 
          <InputNumber min={1} />
        </Form.Item>
        <Form.Item name="capacity" label="Sig\'im">
          <InputNumber min={1} />
        </Form.Item>
        <Form.Item name="location" label="Joy">
          <Input placeholder="Masalan: 2-qavat oyna tomon" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Qo\'shish</Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: (p, ps) => fetchTables(p, ps) }}
      />
    </Card>
  );
};

export default TablesManager;


