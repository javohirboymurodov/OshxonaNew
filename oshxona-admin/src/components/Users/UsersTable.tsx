import React from 'react';
import { Table, Space, Tag, Avatar, Badge, Tooltip, Typography, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  telegramId?: number;
  role: 'superadmin' | 'admin' | 'courier' | 'user';
  isActive: boolean;
  isBlocked: boolean;
  lastSeen?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface UsersTableProps {
  data: User[];
  loading: boolean;
  pagination: { current: number; pageSize: number; total: number };
  onChangePage: (p: number, ps: number) => void;
  onShowDetails: (u: User) => void;
  onEdit: (u: User) => void;
  onToggleBlock: (u: User) => void;
}

const getRoleConfig = (role: string) => {
  const configs = {
    superadmin: { color: 'gold', text: 'Super Admin', icon: <UserOutlined /> },
    admin: { color: 'red', text: 'Admin', icon: <UserOutlined /> },
    courier: { color: 'blue', text: 'Kuryer', icon: <UserOutlined /> },
    user: { color: 'green', text: 'Foydalanuvchi', icon: <UserOutlined /> },
  } as const;
  return (configs as any)[role] || (configs as any).user;
};

const UsersTable: React.FC<UsersTableProps> = ({ data, loading, pagination, onChangePage, onShowDetails, onEdit, onToggleBlock }) => {
  const columns: ColumnsType<User> = [
    {
      title: 'Foydalanuvchi',
      key: 'user',
      render: (record: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: record.isActive ? '#1890ff' : '#d9d9d9', color: record.isActive ? 'white' : '#999' }}>
            {record.firstName?.[0]}{record.lastName?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.firstName} {record.lastName}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.email || record.phone || (record.telegramId ? `@${record.telegramId}` : '')}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const cfg = getRoleConfig(role);
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>;
      },
    },
    {
      title: 'Holat',
      key: 'status',
      render: (record: User) => (
        <Space direction="vertical" size={2}>
          <Badge status={record.isActive ? 'success' : 'default'} text={record.isActive ? 'Faol' : 'Nofaol'} />
          {record.isBlocked && (<Badge status="error" text="Bloklangan" />)}
        </Space>
      ),
    },
    {
      title: 'Buyurtmalar',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      render: (count: number, record: User) => (
        <div>
          <div style={{ fontWeight: 500 }}>{Number(count || 0)} ta</div>
          {record.totalSpent > 0 && (<div style={{ fontSize: '12px', color: '#8c8c8c' }}>{Number(record.totalSpent || 0).toLocaleString()} so'm</div>)}
        </div>
      ),
    },
    {
      title: 'Oxirgi faollik',
      dataIndex: 'lastSeen',
      key: 'lastSeen',
      render: (date: string) => (
        <Tooltip title={date}><Text type="secondary">{date ? new Date(date).toLocaleString('uz-UZ') : '-'}</Text></Tooltip>
      ),
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 150,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onShowDetails(record)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          <Button type="link" size="small" danger={!record.isBlocked} icon={record.isBlocked ? <CheckCircleOutlined /> : <CloseCircleOutlined />} onClick={() => onToggleBlock(record)} />
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="_id"
      loading={loading}
      pagination={{ ...pagination, showSizeChanger: true, showQuickJumper: true, showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} ta foydalanuvchi` }}
      onChange={(p) => onChangePage(p.current!, p.pageSize!)}
      scroll={{ x: 1000 }}
      size="middle"
    />
  );
};

export default UsersTable;


