import React from 'react';
import { Table, Tag, Badge, Space, Button, Typography, Dropdown } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { OrderStatus } from '@/utils/orderStatus';
import { EyeOutlined, ClockCircleOutlined, TruckOutlined, ShopOutlined } from '@ant-design/icons';
import { getStatusConfig } from '../../utils/orderStatus';

const { Text } = Typography;

export interface OrderItem {
  product: { _id: string; name: string; price: number; image?: string };
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  _id: string;
  orderId: string;
  user?: { _id: string; firstName?: string; lastName?: string; telegramId?: number; phone?: string } | null;
  customerInfo?: { name?: string; phone?: string } | null;
  items: OrderItem[];
  totalAmount?: number;
  total?: number;
  courier?: { firstName?: string; lastName?: string; phone?: string } | null;
  deliveryInfo?: { 
    address?: string;
    courier?: { firstName?: string; lastName?: string; phone?: string } | null;
  } | null;
  status: OrderStatus;
  orderType: 'delivery' | 'pickup' | 'dine_in' | 'table';
  paymentMethod: 'cash' | 'card' | 'online' | string;
  deliveryAddress?: string;
  deliveryMeta?: { distanceKm?: number | null; etaMinutes?: number | null; deliveryFee?: number | null };
  createdAt: string;
  updatedAt: string;
}

interface OrdersTableProps {
  data: Order[];
  loading: boolean;
  pagination: { current: number; pageSize: number; total: number };
  onChangePage: (page: number, pageSize: number) => void;
  onShowDetails: (order: Order) => void;
  onAssignCourier?: (order: Order) => void;
  onQuickStatusChange?: (order: Order, newStatus: string) => void;
  highlightId?: string;
}

// Status config moved to utils/orderStatus.ts - using centralized config

const getOrderTypeConfig = (type: string) => {
  const configs = {
    delivery: { color: 'blue', text: 'Yetkazib berish', icon: <TruckOutlined /> },
    pickup: { color: 'green', text: 'Olib ketish', icon: <ShopOutlined /> },
    dine_in: { color: 'purple', text: 'Avvaldan buyurtma', icon: <ClockCircleOutlined /> },
    table: { color: 'magenta', text: 'Stoldan (QR)', icon: <ClockCircleOutlined /> },
  } as const;
  return (configs as Record<string, { color: string; text: string; icon: React.ReactNode }>)[type] || configs.delivery;
};

const getPaymentMethodText = (method: string) => {
  const texts = { cash: 'Naqd', card: 'Karta', online: 'Online' } as const;
  return (texts as Record<string, string>)[method] || method;
};

const OrdersTable: React.FC<OrdersTableProps> = ({ data, loading, pagination, onChangePage, onShowDetails, onAssignCourier, onQuickStatusChange, highlightId }) => {
  const getNextStatuses = (currentStatus: string, orderType?: string): string[] => {
    const common: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['ready', 'cancelled'],
      ready: [],
      cancelled: [],
      delivered: [],
      completed: [],
      assigned: [],
      picked_up: [],
      on_delivery: []
    };
    if (orderType === 'delivery') {
      const flow = { 
        ...common, 
        ready: ['assigned'], 
        assigned: ['on_delivery', 'cancelled'],
        on_delivery: ['delivered'],
        delivered: ['completed']
      } as Record<string, string[]>;
      return flow[currentStatus] || [];
    }
    if (orderType === 'pickup') {
      const flow = { 
        ...common, 
        ready: ['picked_up'],
        picked_up: ['completed']
      } as Record<string, string[]>;
      return flow[currentStatus] || [];
    }
    // dine_in (predzakaz) va table (QR): tayyor → delivered
    const flow = { 
      ...common, 
      ready: ['delivered'],
      delivered: ['completed']
    } as Record<string, string[]>;
    return flow[currentStatus] || [];
  };
  const columns: ColumnsType<Order> = [
    {
      title: 'Buyurtma raqami',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text: string) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>,
    },
    {
      title: 'Yetkazish',
      key: 'delivery',
      render: (record: Order) => {
        if (record.orderType === 'delivery') {
          // Yetkazib berish uchun
          const d = record.deliveryMeta;
          if (d) {
            const parts: string[] = [];
            if (d.distanceKm != null) parts.push(`${d.distanceKm} km`);
            if (d.etaMinutes != null) parts.push(`${d.etaMinutes} min`);
            if (d.deliveryFee != null) parts.push(`${Number(d.deliveryFee).toLocaleString()} so'm`);
            if (parts.length > 0) return parts.join(' • ');
          }
          // Yetkazib berish uchun delivery info bor bo'lsa
          if (record.deliveryInfo?.address) {
            const addr = record.deliveryInfo.address;
            const isUrl = /^https?:\/\//i.test(addr);
            if (isUrl) {
              return (
                <a href={addr} target="_blank" rel="noreferrer">
                  📍 Xarita
                </a>
              );
            }
            return `📍 ${addr}`;
          }
          return 'Yetkazib berish';
        }
        
        if (record.orderType === 'pickup') {
          return '🏪 Olib ketish';
        }
        
        if (record.orderType === 'dine_in') {
          return '🍽️ Restoranda';
        }
        
        if (record.orderType === 'table') {
          return '📱 QR buyurtma';
        }
        
        return '-';
      }
    },
    {
      title: 'Mijoz',
      key: 'customer',
      render: (record: Order) => {
        const fullName = [record.user?.firstName, record.user?.lastName].filter(Boolean).join(' ') || record.customerInfo?.name || '-';
        const phone = record.user?.phone || record.customerInfo?.phone || "Telefon yo'q";
        return (
          <div>
            <div>{fullName}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{phone}</Text>
          </div>
        );
      },
    },
    {
      title: 'Turi',
      dataIndex: 'orderType',
      key: 'orderType',
      render: (type: string) => {
        const config = getOrderTypeConfig(type);
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
    },
    {
      title: 'Holat',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => {
        const config = getStatusConfig(status);
        return (
          <Badge dot color={config.color}>
            <Tag color={config.color}>
              {config.icon} {config.text}
            </Tag>
          </Badge>
        );
      },
    },
    {
      title: 'Summa',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (_: unknown, record: Order) => <Text strong>{Number(record.totalAmount ?? record.total ?? 0).toLocaleString()} so'm</Text>,
    },
    {
      title: "To'lov",
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => {
        const colors: Record<string, string> = { cash: 'green', card: 'blue', online: 'purple' };
        return <Tag color={colors[method] || 'default'}>{getPaymentMethodText(method)}</Tag>;
      },
    },
    {
      title: 'Kuryer',
      key: 'courier',
      render: (record: Order) => {
        const c = record.courier || record.deliveryInfo?.courier;
        return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '-';
      },
      responsive: ['md']
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Order) => {
        const next = getNextStatuses(record.status, record.orderType);
        const menuItems = next.map((s) => ({ key: s, label: getStatusConfig(s as OrderStatus).text }));
        return (
          <Space size="small">
            <Button 
              type="link" 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails(record);
              }}
            />
            {onQuickStatusChange && next.length > 0 && (
              <Dropdown
                menu={{ items: menuItems, onClick: ({ key }) => onQuickStatusChange(record, String(key)) }}
                placement="bottom"
              >
                <Button type="link" size="small">Holat</Button>
              </Dropdown>
            )}
            {record.orderType === 'delivery' && !['delivered', 'completed', 'cancelled'].includes(record.status) && onAssignCourier && (
              <Button 
                type="link" 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignCourier(record);
                }}
              >
                Kuryer
              </Button>
            )}
            {/* Kuryer tayinlandi - faqat ko'rsatish uchun */}
            {record.orderType === 'delivery' && record.status === 'assigned' && record.deliveryInfo?.courier && (
              <Button type="link" size="small" style={{ color: 'green' }} disabled>
                ✅ Kuryer: {record.deliveryInfo.courier.firstName}
              </Button>
            )}
            {/* Yo'lda - faqat ko'rsatish uchun */}
            {record.orderType === 'delivery' && record.status === 'on_delivery' && (
              <Button type="link" size="small" style={{ color: 'blue' }} disabled>
                🚗 Yo'lda
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="_id"
      rowClassName={(record) => (highlightId && record._id === highlightId ? 'row-highlight' : '')}
      loading={loading}
      pagination={{ 
        ...pagination, 
        showSizeChanger: true, 
        showQuickJumper: true, 
        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} ta buyurtma`,
        // Pagination muammosini hal qilish uchun
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total
      }}
      onChange={(p) => onChangePage(p.current!, p.pageSize!)}
      scroll={{ x: 'max-content' }}
      size="middle"
    />
  );
};

export default OrdersTable;


