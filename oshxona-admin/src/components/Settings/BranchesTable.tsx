import React from 'react';
import { Card, Button, Table, Space, Typography, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Branch } from './types';

const { Text } = Typography;

interface Props {
  branches: Branch[];
  columns?: ColumnsType<Branch>;
  onClickNew: () => void;
  onEdit: (b: Branch) => void;
  onDelete: (id: string) => void;
}

const BranchesTable: React.FC<Props> = ({ branches, columns, onClickNew, onEdit, onDelete }) => {
  const defaultColumns: ColumnsType<Branch> = [
    { title: 'Filial nomi', dataIndex: 'name', key: 'name' },
    {
      title: 'Manzil',
      key: 'address',
      render: (record: Branch) => {
        const addr: any = (record as any).address;
        if (!addr) return '-';
        if (typeof addr === 'string') return addr;
        const parts = [addr.street, addr.city, addr.district].filter(Boolean);
        return parts.length ? parts.join(', ') : '-';
      },
    },
    { title: 'Telefon', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Ish vaqti',
      key: 'workingHours',
      render: (record: Branch) => {
        const wh: any = (record as any).workingHours;
        if (!wh) return '-';
        if (typeof wh.start === 'string' && typeof wh.end === 'string') {
          return `${wh.start} - ${wh.end}`;
        }
        // fallback: try monday schedule if exists
        if (wh.monday?.open && wh.monday?.close) {
          return `${wh.monday.open} - ${wh.monday.close}`;
        }
        return '-';
      },
    },
    {
      title: 'Yetkazib berish',
      key: 'delivery',
      render: (record: Branch) => {
        const settings: any = (record as any).settings || {};
        const radius = (record as any).deliveryRadius ?? settings.maxDeliveryDistance;
        const fee = (record as any).deliveryFee ?? settings.deliveryFee;
        return (
          <div>
            <div>{typeof radius === 'number' ? `${radius} km` : '-'}</div>
            <Text type="secondary">{typeof fee === 'number' ? `${fee.toLocaleString()} so'm` : '-'}</Text>
          </div>
        );
      },
    },
    {
      title: 'Amallar',
      key: 'actions',
      render: (_: unknown, record: Branch) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              Modal.confirm({
                title: "Filialni o'chirish",
                content: "Bu filialni o'chirishni tasdiqlaysizmi?",
                onOk: () => onDelete(record._id),
              })
            }
          />
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Filiallar"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={onClickNew}>
          Yangi filial
        </Button>
      }
    >
      <Table columns={columns || defaultColumns} dataSource={branches} rowKey="_id" pagination={false} />
    </Card>
  );
};

export default BranchesTable;


