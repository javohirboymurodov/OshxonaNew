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
}

interface Props {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  getOrderTypeText: (t: string) => string;
  getPaymentText: (t: string) => string;
}

const OrderDetailsModal: React.FC<Props> = ({ open, order, onClose, getOrderTypeText, getPaymentText }) => {
  if (!order) return null;
  const fullName = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || order.customerInfo?.name || '-';
  const phone = order.user?.phone || order.customerInfo?.phone || "Ko'rsatilmagan";
  const [messageApi] = antdMessage.useMessage ? antdMessage.useMessage() : [antdMessage];

  const getStatusConfig = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: 'Kutilmoqda' },
      confirmed: { color: 'blue', text: 'Tasdiqlangan' },
      preparing: { color: 'purple', text: 'Tayyorlanmoqda' },
      ready: { color: 'cyan', text: 'Tayyor' },
      delivered: { color: 'green', text: 'Yetkazilgan' },
      cancelled: { color: 'red', text: 'Bekor qilingan' }
    };
    return map[status] || { color: 'default', text: status };
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    const flow: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivered'],
      delivered: [],
      cancelled: []
    };
    return flow[currentStatus] || [];
  };

  const updateStatus = async (s: string) => {
    try {
      const { default: apiService } = await import('@/services/api');
      await apiService.updateOrderStatus(order._id, s);
      messageApi.success('Holat yangilandi');
      onClose();
    } catch {
      messageApi.error('Holatni yangilashda xatolik');
    }
  };

  return (
    <Modal title={`Buyurtma tafsilotlari - ${order.orderNumber}`} open={open} onCancel={onClose} footer={null} width={800}>
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
            <Space>
              <Tag color={getStatusConfig(String((order as unknown as { status?: string }).status || 'pending')).color}>{getStatusConfig(String((order as unknown as { status?: string }).status || 'pending')).text}</Tag>
              {getNextStatuses(String((order as unknown as { status?: string }).status || 'pending')).map((s) => (
                <Button key={s} size="small" type="primary" onClick={() => updateStatus(s)}>{getStatusConfig(s).text}</Button>
              ))}
            </Space>
          }>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Raqam">{order.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Turi">{getOrderTypeText(order.orderType)}</Descriptions.Item>
              <Descriptions.Item label="To'lov">{getPaymentText(order.paymentMethod)}</Descriptions.Item>
              {order.orderType === 'dine_in' && (
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
          dataSource={order.items}
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
          rowKey={(r) => r.product?._id || r.productName || Math.random().toString()}
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
            rowKey={(_r, i) => String(i)}
          />
        </Card>
      )}
    </Modal>
  );
};

export default OrderDetailsModal;


