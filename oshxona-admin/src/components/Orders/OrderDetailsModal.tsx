import React from 'react';
import { Modal, Row, Col, Card, Descriptions, Typography, Table, Space, Button, Tag, message as antdMessage } from 'antd';
import dayjs from 'dayjs';
import { PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface OrderItem {
  product?: { _id: string; name: string; price?: number } | null;
  productName?: string;
  quantity: number;
  price: number;
  total?: number;
  totalPrice?: number;
}
export interface Order {
  _id: string;
  orderNumber: string;
  status?: string;
  user?: { firstName?: string; lastName?: string; phone?: string; telegramId?: number } | null;
  customerInfo?: { name?: string; phone?: string } | null;
  items: OrderItem[];
  totalAmount?: number; total?: number;
  orderType: string; paymentMethod: string;
  deliveryAddress?: string;
  deliveryInfo?: { address?: string; location?: { latitude: number; longitude: number }; estimatedTime?: string | Date };
  deliveryMeta?: { distanceKm?: number | null; etaMinutes?: number | null; deliveryFee?: number | null; preparationMinutes?: number | null; isFreeDelivery?: boolean };
  statusHistory?: Array<{ status: string; timestamp?: string | Date; message?: string; note?: string; updatedBy?: string }>;
  createdAt: string; updatedAt: string;
  dineInInfo?: { arrivalTime?: number | string; tableNumber?: string } | null;
  branch?: { name?: string; title?: string; address?: string } | string | null;
}

interface Props {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  getOrderTypeText: (t: string) => string;
  getPaymentText: (t: string) => string;
  onStatusUpdated?: (newStatus: string) => void;
}

const OrderDetailsModal: React.FC<Props> = ({ open, order, onClose, getOrderTypeText, getPaymentText, onStatusUpdated }) => {
  if (!order) return null;
  const fullName = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || order.customerInfo?.name || '-';
  const phone = order.user?.phone || order.customerInfo?.phone || "Ko'rsatilmagan";
  // AntD message konteksti (React 19 bilan to'g'ri)
  const [messageApi, contextHolder] = antdMessage.useMessage();

  const getStatusConfig = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: 'Kutilmoqda' },
      confirmed: { color: 'blue', text: 'Tasdiqlangan' },
      preparing: { color: 'purple', text: 'Tayyorlanmoqda' },
      ready: { color: 'cyan', text: 'Tayyor' },
      on_delivery: { color: 'geekblue', text: 'Yetkazilmoqda' },
      picked_up: { color: 'green', text: 'Olib ketildi' },
      delivered: { color: 'green', text: 'Yetkazilgan' },
      cancelled: { color: 'red', text: 'Bekor qilingan' }
    };
    return map[status] || { color: 'default', text: status };
  };

  const getNextStatuses = (currentStatus: string, orderType?: string): string[] => {
    const common: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['ready', 'cancelled'],
      ready: [],
      cancelled: [],
      delivered: [],
      picked_up: [],
      on_delivery: []
    };
    if (orderType === 'delivery') {
      const flow = { ...common, ready: ['on_delivery'], on_delivery: ['delivered'] } as Record<string, string[]>;
      return flow[currentStatus] || [];
    }
    if (orderType === 'pickup') {
      const flow = { ...common, ready: ['picked_up'] } as Record<string, string[]>;
      return flow[currentStatus] || [];
    }
    // dine_in va table: tayyor → delivered
    const flow = { ...common, ready: ['delivered'] } as Record<string, string[]>;
    return flow[currentStatus] || [];
  };

  const updateStatus = async (s: string) => {
    try {
      const { default: apiService } = await import('@/services/api');
      await apiService.updateOrderStatus(order._id, s);
      messageApi.success('Holat yangilandi');
      if (onStatusUpdated) onStatusUpdated(s);
      onClose();
    } catch {
      messageApi.error('Holatni yangilashda xatolik');
    }
  };

  const displayOrderNumber = String((order as unknown as { orderNumber?: string; orderId?: string }).orderNumber || (order as unknown as { orderNumber?: string; orderId?: string }).orderId || '');

  const resolvedItems: OrderItem[] = (() => {
    const anyOrder = order as unknown as Record<string, any>;
    const raw = anyOrder.items || anyOrder.orderItems || anyOrder.products || [];
    return (raw as any[]).map((it) => ({
      product: it.product || undefined,
      productName: it.productName || it.name || it.title || it.product?.name,
      quantity: Number(it.quantity ?? it.qty ?? 0),
      price: Number(it.price ?? it.unitPrice ?? it.product?.price ?? 0),
      total: Number(it.total ?? it.totalPrice ?? (Number(it.price ?? 0) * Number(it.quantity ?? 0))),
    }));
  })();

  return (
    <Modal title={`Buyurtma tafsilotlari - ${displayOrderNumber || '-'}`} open={open} onCancel={onClose} footer={null} width={800}>
      {contextHolder}
      <Row gutter={24}>
        <Col span={12}>
          <Card title="Mijoz ma'lumotlari" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Ism">{fullName}</Descriptions.Item>
              <Descriptions.Item label="Telefon"><PhoneOutlined /> {phone}</Descriptions.Item>
              {(order.deliveryAddress || order.deliveryInfo?.address) && (
                <Descriptions.Item label="Manzil"><EnvironmentOutlined /> {order.deliveryAddress || order.deliveryInfo?.address}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Buyurtma ma'lumotlari" size="small" extra={
            <Space size={[8,8]} wrap>
              <Tag color={getStatusConfig(String(order.status || 'pending')).color}>{getStatusConfig(String(order.status || 'pending')).text}</Tag>
              {getNextStatuses(String(order.status || 'pending'), order.orderType).map((s) => (
                <Button key={s} size="small" type="primary" onClick={() => updateStatus(s)}>{getStatusConfig(s).text}</Button>
              ))}
            </Space>
          }>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Raqam">{order.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Turi">{getOrderTypeText(order.orderType)}</Descriptions.Item>
              <Descriptions.Item label="To'lov">{getPaymentText(order.paymentMethod)}</Descriptions.Item>
              {order.branch && (
                <Descriptions.Item label="Filial">
                  {typeof order.branch === 'string' ? order.branch : (order.branch?.name || order.branch?.title || '-')}
                </Descriptions.Item>
              )}
              {(order.orderType === 'dine_in' || order.orderType === 'table') && (
                <>
                  {order.dineInInfo?.arrivalTime != null && (
                    <Descriptions.Item label="Kutilayotgan kelish">{String(order.dineInInfo.arrivalTime)} daqiqa</Descriptions.Item>
                  )}
                  {order.dineInInfo?.tableNumber && (
                    <Descriptions.Item label="Stol">🪑 {String(order.dineInInfo.tableNumber)}</Descriptions.Item>
                  )}
                </>
              )}
              {(() => {
                const total = Number(order.totalAmount ?? order.total ?? 0);
                const delivery = Number(order.deliveryMeta?.deliveryFee ?? 0);
                const subtotal = total > 0 ? Math.max(total - delivery, 0) : undefined;
                return (
                  <>
                    {typeof subtotal === 'number' && (
                      <Descriptions.Item label="Yig'indi">{subtotal.toLocaleString()} so'm</Descriptions.Item>
                    )}
                    {delivery > 0 && (
                      <Descriptions.Item label="Yetkazish">{delivery.toLocaleString()} so'm</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Jami summa"><Text strong>{total.toLocaleString()} so'm</Text></Descriptions.Item>
                  </>
                );
              })()}
              <Descriptions.Item label="Yaratilgan">{dayjs(order.createdAt).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
              {order.deliveryInfo?.estimatedTime && (
                <Descriptions.Item label="Taxminiy yetkazish">{dayjs(order.deliveryInfo.estimatedTime).format('HH:mm')}</Descriptions.Item>
              )}
              {order.orderType === 'delivery' && (
                <>
                  {order.deliveryMeta?.distanceKm != null && (
                    <Descriptions.Item label="Masofa">{order.deliveryMeta.distanceKm} km</Descriptions.Item>
                  )}
                  {order.deliveryMeta?.etaMinutes != null && (
                    <Descriptions.Item label="ETA">{order.deliveryMeta.etaMinutes} daqiqa</Descriptions.Item>
                  )}
                  {order.deliveryMeta?.deliveryFee != null && (
                    <Descriptions.Item label="Yetkazish narxi">{Number(order.deliveryMeta.deliveryFee).toLocaleString()} so'm {order.deliveryMeta.isFreeDelivery ? '(bepul)' : ''}</Descriptions.Item>
                  )}
                </>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="Buyurtma tarkibi" style={{ marginTop: 16 }}>
        <Table
          dataSource={resolvedItems}
          columns={[
            {
              title: 'Mahsulot',
              key: 'product',
              render: (r: OrderItem) => r.product?.name || r.productName || '-',
            },
            { title: 'Miqdor', dataIndex: 'quantity', key: 'quantity' },
            {
              title: 'Narx',
              dataIndex: 'price',
              key: 'price',
              render: (p: number) => `${Number(p || 0).toLocaleString()} so'm`,
            },
            {
              title: 'Jami',
              key: 'total',
              render: (r: OrderItem) => {
                const lineTotal = r.total ?? r.totalPrice ?? (r.price || 0) * (r.quantity || 0);
                return <Text strong>{Number(lineTotal || 0).toLocaleString()} so'm</Text>;
              },
            },
          ]}
          rowKey={(r) => String(r.product?._id || r.productName || `${r.price}-${r.quantity}`)}
          pagination={false}
          size="small"
        />
      </Card>

      {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
        <Card title="Holat tarixi" style={{ marginTop: 16 }}>
          <Table
            size="small"
            pagination={false}
            dataSource={[...order.statusHistory].sort((a, b) => {
              const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return tb - ta;
            })}
            columns={[
              {
                title: 'Vaqt',
                key: 'time',
                render: (r: { timestamp?: string | Date }) => r.timestamp ? dayjs(r.timestamp).format('DD.MM.YYYY HH:mm') : '-',
              },
              {
                title: 'Holat',
                dataIndex: 'status',
                key: 'status',
                render: (s: string) => {
                  const map: Record<string, string> = {
                    pending: 'Kutilmoqda',
                    confirmed: 'Tasdiqlangan',
                    preparing: 'Tayyorlanmoqda',
                    ready: 'Tayyor',
                    on_delivery: 'Yetkazilmoqda',
                    delivered: 'Yetkazilgan',
                    picked_up: 'Olib ketildi',
                    completed: 'Yakunlangan',
                    cancelled: 'Bekor qilingan'
                  };
                  return map[s] || s;
                }
              },
              {
                title: 'Izoh',
                key: 'message',
                render: (r: { message?: string; note?: string }) => r.message || r.note || '-',
              }
            ]}
            rowKey={(r: { timestamp?: string | Date; status?: string }) => {
              const t = r.timestamp ? new Date(r.timestamp).getTime() : 0;
              return String(`${t}-${r.status || ''}`);
            }}
          />
        </Card>
      )}
    </Modal>
  );
};

export default OrderDetailsModal;


