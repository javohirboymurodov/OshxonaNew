// src/pages/Orders/OrdersPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Card,
  Row,
  Col,
  Typography,
  Select,
  DatePicker,
  Statistic,
  Timeline,
  Descriptions,
  message,
  Input,
  Drawer,
  Avatar,
  List,
  Popconfirm,
  Badge
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TruckOutlined,
  ShopOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface OrderItem {
  product: {
    _id: string;
    name: string;
    price: number;
    image?: string;
  };
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    telegramId?: number;
    phone?: string;
  };
  branch: {
    _id: string;
    name: string;
    address: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  orderType: 'delivery' | 'pickup' | 'dine_in';
  paymentMethod: 'cash' | 'card' | 'online';
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
  averageOrderValue: number;
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [statusUpdateVisible, setStatusUpdateVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [stats, setStats] = useState<OrderStats>({
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    orderType: '',
    paymentMethod: '',
    dateRange: null as any,
  });

  // Fetch orders
  const fetchOrders = async (page = 1, pageSize = 15) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.orderType && { orderType: filters.orderType }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
        ...(filters.dateRange && {
          startDate: filters.dateRange[0].toISOString(),
          endDate: filters.dateRange[1].toISOString(),
        }),
      });

      const response = await fetch(`/api/admin/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setPagination({
          current: page,
          pageSize,
          total: data.total || 0,
        });
      } else {
        message.error('Buyurtmalarni yuklashda xatolik!');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Buyurtmalarni yuklashda xatolik!');
      
      // Mock data for demo
      const mockOrders: Order[] = [
        {
          _id: '1',
          orderNumber: 'ORD-001',
          user: {
            _id: '1',
            firstName: 'Alisher',
            lastName: 'Karimov',
            telegramId: 123456789,
            phone: '+998901234567'
          },
          branch: {
            _id: '1',
            name: 'Toshkent filiali',
            address: 'Toshkent shahar, Amir Temur ko\'chasi'
          },
          items: [
            {
              product: { _id: '1', name: 'Osh', price: 25000 },
              quantity: 2,
              price: 25000,
              total: 50000
            },
            {
              product: { _id: '2', name: 'Manti', price: 12000 },
              quantity: 1,
              price: 12000,
              total: 12000
            }
          ],
          totalAmount: 62000,
          status: 'preparing',
          orderType: 'delivery',
          paymentMethod: 'cash',
          deliveryAddress: 'Toshkent, Yunusobod tumani',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: '2',
          orderNumber: 'ORD-002',
          user: {
            _id: '2',
            firstName: 'Malika',
            lastName: 'Tosheva',
            telegramId: 987654321,
            phone: '+998909876543'
          },
          branch: {
            _id: '1',
            name: 'Toshkent filiali',
            address: 'Toshkent shahar, Amir Temur ko\'chasi'
          },
          items: [
            {
              product: { _id: '3', name: 'Lag\'mon', price: 22000 },
              quantity: 1,
              price: 22000,
              total: 22000
            }
          ],
          totalAmount: 22000,
          status: 'delivered',
          orderType: 'pickup',
          paymentMethod: 'card',
          createdAt: dayjs().subtract(1, 'hour').toISOString(),
          updatedAt: dayjs().subtract(30, 'minutes').toISOString()
        }
      ];
      setOrders(mockOrders);
      setPagination({
        current: 1,
        pageSize: 15,
        total: mockOrders.length,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch order stats
  const fetchOrderStats = async () => {
    try {
      const response = await fetch('/api/admin/orders/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        // Mock stats
        setStats({
          pending: 8,
          confirmed: 15,
          preparing: 12,
          ready: 6,
          delivered: 180,
          cancelled: 5,
          totalRevenue: 5640000,
          averageOrderValue: 45600
        });
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
      // Mock stats
      setStats({
        pending: 8,
        confirmed: 15,
        preparing: 12,
        ready: 6,
        delivered: 180,
        cancelled: 5,
        totalRevenue: 5640000,
        averageOrderValue: 45600
      });
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchOrderStats();
  }, [filters]);

  // Status configurations
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { color: 'orange', text: 'Kutilmoqda', icon: <ClockCircleOutlined /> },
      confirmed: { color: 'blue', text: 'Tasdiqlangan', icon: <CheckCircleOutlined /> },
      preparing: { color: 'purple', text: 'Tayyorlanmoqda', icon: <ClockCircleOutlined /> },
      ready: { color: 'cyan', text: 'Tayyor', icon: <CheckCircleOutlined /> },
      delivered: { color: 'green', text: 'Yetkazilgan', icon: <TruckOutlined /> },
      cancelled: { color: 'red', text: 'Bekor qilingan', icon: <CloseCircleOutlined /> },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const getOrderTypeConfig = (type: string) => {
    const configs = {
      delivery: { color: 'blue', text: 'Yetkazib berish', icon: <TruckOutlined /> },
      pickup: { color: 'green', text: 'Olib ketish', icon: <ShopOutlined /> },
      dine_in: { color: 'purple', text: 'Zalda iste\'mol', icon: <UserOutlined /> },
    };
    return configs[type as keyof typeof configs] || configs.delivery;
  };

  const getPaymentMethodText = (method: string) => {
    const texts = { cash: 'Naqd', card: 'Karta', online: 'Online' };
    return texts[method as keyof typeof texts] || method;
  };

  // Table columns
  const columns: ColumnsType<Order> = [
    {
      title: 'Buyurtma raqami',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => (
        <Text strong style={{ color: '#1890ff' }}>{text}</Text>
      ),
    },
    {
      title: 'Mijoz',
      key: 'customer',
      render: (record: Order) => (
        <div>
          <div>{record.user.firstName} {record.user.lastName}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.user.phone || 'Telefon yo\'q'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Turi',
      dataIndex: 'orderType',
      key: 'orderType',
      render: (type: string) => {
        const config = getOrderTypeConfig(type);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: 'Holat',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Badge dot color={config.color}>
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
          </Badge>
        );
      },
    },
    {
      title: 'Summa',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <Text strong>{amount.toLocaleString()} so'm</Text>
      ),
    },
    {
      title: 'To\'lov',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => {
        const colors = { cash: 'green', card: 'blue', online: 'purple' };
        return (
          <Tag color={colors[method as keyof typeof colors]}>
            {getPaymentMethodText(method)}
          </Tag>
        );
      },
    },
    {
      title: 'Sana',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('DD.MM.YYYY')}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(date).format('HH:mm')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 120,
      render: (_: any, record: Order) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showOrderDetails(record)}
          />
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => updateOrderStatus(record)}
            disabled={record.status === 'delivered' || record.status === 'cancelled'}
          />
        </Space>
      ),
    },
  ];

  // Handlers
  const showOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsVisible(true);
  };

  const updateOrderStatus = (order: Order) => {
    setSelectedOrder(order);
    setStatusUpdateVisible(true);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        message.success('Buyurtma holati yangilandi!');
        setStatusUpdateVisible(false);
        fetchOrders(pagination.current, pagination.pageSize);
        fetchOrderStats();
      } else {
        message.error('Holatni yangilashda xatolik!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      message.error('Holatni yangilashda xatolik!');
    }
  };

  const getNextStatuses = (currentStatus: string) => {
    const statusFlow = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivered'],
      delivered: [],
      cancelled: []
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || [];
  };

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Buyurtmalar Boshqaruvi</Title>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFiltersVisible(true)}
            >
              Filtrlar
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchOrders(pagination.current, pagination.pageSize);
                fetchOrderStats();
              }}
            >
              Yangilash
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Kutilayotgan"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Tasdiqlangan"
              value={stats.confirmed}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Tayyorlanmoqda"
              value={stats.preparing}
              valueStyle={{ color: '#722ed1' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Tayyor"
              value={stats.ready}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Yetkazilgan"
              value={stats.delivered}
              valueStyle={{ color: '#52c41a' }}
              prefix={<TruckOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Bekor qilingan"
              value={stats.cancelled}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} lg={6}>
            <Search
              placeholder="Buyurtma raqami yoki mijoz ismi..."
              allowClear
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Select
              placeholder="Holat"
              allowClear
              value={filters.status || undefined}
              onChange={(value) => setFilters({ ...filters, status: value || '' })}
              style={{ width: '100%' }}
            >
              <Option value="pending">Kutilmoqda</Option>
              <Option value="confirmed">Tasdiqlangan</Option>
              <Option value="preparing">Tayyorlanmoqda</Option>
              <Option value="ready">Tayyor</Option>
              <Option value="delivered">Yetkazilgan</Option>
              <Option value="cancelled">Bekor qilingan</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Select
              placeholder="Tur"
              allowClear
              value={filters.orderType || undefined}
              onChange={(value) => setFilters({ ...filters, orderType: value || '' })}
              style={{ width: '100%' }}
            >
              <Option value="delivery">Yetkazib berish</Option>
              <Option value="pickup">Olib ketish</Option>
              <Option value="dine_in">Zalda iste'mol</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} ta buyurtma`,
          }}
          onChange={(paginationConfig) => {
            fetchOrders(paginationConfig.current, paginationConfig.pageSize);
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* Order Details Modal */}
      <Modal
        title={`Buyurtma tafsilotlari - ${selectedOrder?.orderNumber}`}
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Row gutter={24}>
              <Col span={12}>
                <Card title="Mijoz ma'lumotlari" size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Ism">
                      {selectedOrder.user.firstName} {selectedOrder.user.lastName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Telefon">
                      <PhoneOutlined /> {selectedOrder.user.phone || 'Ko\'rsatilmagan'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Telegram">
                      @{selectedOrder.user.telegramId}
                    </Descriptions.Item>
                    {selectedOrder.deliveryAddress && (
                      <Descriptions.Item label="Manzil">
                        <EnvironmentOutlined /> {selectedOrder.deliveryAddress}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Buyurtma ma'lumotlari" size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Raqam">
                      {selectedOrder.orderNumber}
                    </Descriptions.Item>
                    <Descriptions.Item label="Turi">
                      {getOrderTypeConfig(selectedOrder.orderType).text}
                    </Descriptions.Item>
                    <Descriptions.Item label="To'lov">
                      {getPaymentMethodText(selectedOrder.paymentMethod)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Jami summa">
                      <Text strong>{selectedOrder.totalAmount.toLocaleString()} so'm</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Yaratilgan">
                      {dayjs(selectedOrder.createdAt).format('DD.MM.YYYY HH:mm')}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>

            <Card title="Buyurtma tarkibi" style={{ marginTop: 16 }}>
              <Table
                dataSource={selectedOrder.items}
                columns={[
                  {
                    title: 'Mahsulot',
                    dataIndex: ['product', 'name'],
                    key: 'product',
                  },
                  {
                    title: 'Miqdor',
                    dataIndex: 'quantity',
                    key: 'quantity',
                  },
                  {
                    title: 'Narx',
                    dataIndex: 'price',
                    key: 'price',
                    render: (price: number) => `${price.toLocaleString()} so'm`,
                  },
                  {
                    title: 'Jami',
                    dataIndex: 'total',
                    key: 'total',
                    render: (total: number) => (
                      <Text strong>{total.toLocaleString()} so'm</Text>
                    ),
                  },
                ]}
                pagination={false}
                size="small"
              />
            </Card>

            {/* Status History */}
            <Card title="Holat tarixi" style={{ marginTop: 16 }}>
              <Timeline>
                <Timeline.Item color="green">
                  <div>
                    <div>Buyurtma yaratildi</div>
                    <Text type="secondary">
                      {dayjs(selectedOrder.createdAt).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  </div>
                </Timeline.Item>
                {selectedOrder.status !== 'pending' && (
                  <Timeline.Item color="blue">
                    <div>
                      <div>Holat: {getStatusConfig(selectedOrder.status).text}</div>
                      <Text type="secondary">
                        {dayjs(selectedOrder.updatedAt).format('DD.MM.YYYY HH:mm')}
                      </Text>
                    </div>
                  </Timeline.Item>
                )}
              </Timeline>
            </Card>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal
        title="Buyurtma holatini yangilash"
        open={statusUpdateVisible}
        onCancel={() => setStatusUpdateVisible(false)}
        footer={null}
      >
        {selectedOrder && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text>Joriy holat: </Text>
              <Tag color={getStatusConfig(selectedOrder.status).color}>
                {getStatusConfig(selectedOrder.status).text}
              </Tag>
            </div>
            
            <div>
              <Text strong>Yangi holatni tanlang:</Text>
              <div style={{ marginTop: 12 }}>
                {getNextStatuses(selectedOrder.status).map(status => (
                  <Button
                    key={status}
                    type="primary"
                    style={{ marginRight: 8, marginBottom: 8 }}
                    onClick={() => handleStatusUpdate(status)}
                  >
                    {getStatusConfig(status).text}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Advanced Filters Drawer */}
      <Drawer
        title="Qo'shimcha filtrlar"
        placement="right"
        onClose={() => setFiltersVisible(false)}
        open={filtersVisible}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Sana oralig'i:</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            />
          </div>
          
          <div>
            <Text strong>To'lov usuli:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="To'lov usuli"
              allowClear
              value={filters.paymentMethod || undefined}
              onChange={(value) => setFilters({ ...filters, paymentMethod: value || '' })}
            >
              <Option value="cash">Naqd</Option>
              <Option value="card">Karta</Option>
              <Option value="online">Online</Option>
            </Select>
          </div>

          <Button
            type="primary"
            block
            onClick={() => {
              setFiltersVisible(false);
              fetchOrders();
            }}
          >
            Filtrlarni qo'llash
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default OrdersPage;