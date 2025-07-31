// src/pages/Dashboard/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Button,
  Table,
  Tag,
  Progress,
  List,
  Avatar,
  Spin,
  Alert,
  Select,
  DatePicker
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
  ShopOutlined,
  EyeOutlined,
  ReloadOutlined,
  TruckOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/plots';
import apiService from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface DashboardStats {
  orders: {
    total: number;
    today: number;
    growth: number;
    byStatus: {
      pending: number;
      confirmed: number;
      preparing: number;
      ready: number;
      delivered: number;
      cancelled: number;
    };
  };
  revenue: {
    total: number;
    today: number;
    growth: number;
    average: number;
  };
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  products: {
    total: number;
    active: number;
    lowStock: number;
    popular: Array<{
      product: { name: string; image?: string };
      orderCount: number;
      revenue: number;
    }>;
  };
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  user: { firstName: string; lastName: string };
  totalAmount: number;
  status: string;
  orderType: string;
  createdAt: string;
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<any>([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const { user } = useAuth();

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Dashboard stats
      const statsResponse = await apiService.get<DashboardStats>('/dashboard/stats', {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString()
      });
      
      // Recent orders
      const ordersResponse = await apiService.get<{ items: RecentOrder[] }>('/orders', {
        limit: 10,
        sort: '-createdAt'
      });

      // Chart data (revenue trend)
      const chartResponse = await apiService.get('/dashboard/chart-data', {
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
        type: 'revenue'
      });

      setStats(statsResponse);
      setRecentOrders(ordersResponse.items);
      setChartData(chartResponse);

      // Pie chart data for order types
      const pieChartData = [
        { type: 'Yetkazib berish', value: statsResponse.orders.byStatus.delivered },
        { type: 'Olib ketish', value: Math.floor(statsResponse.orders.byStatus.delivered * 0.3) },
        { type: 'Zalda iste\'mol', value: Math.floor(statsResponse.orders.byStatus.delivered * 0.2) },
      ];
      setPieData(pieChartData);

    } catch (err: any) {
      setError('Dashboard ma\'lumotlarini yuklashda xatolik yuz berdi');
      console.error('Dashboard error:', err);
      
      // Fallback mock data
      setStats({
        orders: {
          total: 1247,
          today: 23,
          growth: 12.5,
          byStatus: {
            pending: 8,
            confirmed: 15,
            preparing: 12,
            ready: 6,
            delivered: 1180,
            cancelled: 26
          }
        },
        revenue: {
          total: 15670000,
          today: 2340000,
          growth: 8.2,
          average: 125600
        },
        users: {
          total: 432,
          active: 234,
          new: 23,
          growth: 15.3
        },
        products: {
          total: 156,
          active: 142,
          lowStock: 8,
          popular: [
            { product: { name: 'Osh' }, orderCount: 156, revenue: 1560000 },
            { product: { name: 'Manti' }, orderCount: 134, revenue: 1206000 },
            { product: { name: 'Lag\'mon' }, orderCount: 98, revenue: 882000 }
          ]
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'orange',
      confirmed: 'blue',
      preparing: 'purple',
      ready: 'cyan',
      delivered: 'green',
      cancelled: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      pending: 'Kutilmoqda',
      confirmed: 'Tasdiqlangan',
      preparing: 'Tayyorlanmoqda',
      ready: 'Tayyor',
      delivered: 'Yetkazilgan',
      cancelled: 'Bekor qilingan'
    };
    return texts[status] || status;
  };

  const orderColumns = [
    {
      title: 'Raqam',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Mijoz',
      key: 'user',  
      render: (record: RecentOrder) => (
        <Text>{record.user.firstName} {record.user.lastName}</Text>
      )
    },
    {
      title: 'Summa',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <Text strong>{amount.toLocaleString()} so'm</Text>
      )
    },
    {
      title: 'Holat',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Vaqt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('HH:mm')
    }
  ];

  const lineConfig = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    smooth: true,
    point: {
      size: 3,
      shape: 'circle',
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: 'Daromad',
          value: `${datum.value?.toLocaleString()} so'm`,
        };
      },
    },
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
  };

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Dashboard yuklanmoqda...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Dashboard</Title>
            <Text type="secondary">
              Xush kelibsiz, {user?.firstName} {user?.lastName}! 👋
            </Text>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="DD.MM.YYYY"
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchDashboardData}
                loading={loading}
              >
                Yangilash
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Main Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Jami Buyurtmalar"
              value={stats?.orders.total}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#3f8600' }}
              suffix={
                <span style={{ fontSize: '14px', color: '#3f8600' }}>
                  <ArrowUpOutlined /> {stats?.orders.growth.toFixed(1)}%
                </span>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Bugun: {stats?.orders.today}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Jami Daromad"
              value={stats?.revenue.total}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#cf1322' }}
              suffix="so'm"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Bugun: {stats?.revenue.today.toLocaleString()} so'm
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Foydalanuvchilar"
              value={stats?.users.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix={
                <span style={{ fontSize: '14px', color: '#1890ff' }}>
                  <ArrowUpOutlined /> {stats?.users.growth.toFixed(1)}%
                </span>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Faol: {stats?.users.active}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Mahsulotlar"
              value={stats?.products.total}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Faol: {stats?.products.active}</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Order Status Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small">
            <Statistic
              title={<Text style={{ fontSize: '12px' }}>Kutilmoqda</Text>}
              value={stats?.orders.byStatus.pending}
              valueStyle={{ color: '#faad14', fontSize: '20px' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>  
          <Card size="small">
            <Statistic
              title={<Text style={{ fontSize: '12px' }}>Tasdiqlangan</Text>}
              value={stats?.orders.byStatus.confirmed}
              valueStyle={{ color: '#1890ff', fontSize: '20px' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small">
            <Statistic
              title={<Text style={{ fontSize: '12px' }}>Tayyorlanmoqda</Text>}
              value={stats?.orders.byStatus.preparing}
              valueStyle={{ color: '#722ed1', fontSize: '20px' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small">
            <Statistic
              title={<Text style={{ fontSize: '12px' }}>Tayyor</Text>}
              value={stats?.orders.byStatus.ready}
              valueStyle={{ color: '#13c2c2', fontSize: '20px' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small">
            <Statistic
              title={<Text style={{ fontSize: '12px' }}>Yetkazilgan</Text>}
              value={stats?.orders.byStatus.delivered}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              prefix={<TruckOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small">
            <Statistic
              title={<Text style={{ fontSize: '12px' }}>Bekor qilingan</Text>}
              value={stats?.orders.byStatus.cancelled}
              valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Daromad tendensiyasi" extra={<Button type="link">Batafsil</Button>}>
            {chartData.length > 0 ? (
              <Line {...lineConfig} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Ma'lumot yo'q</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Buyurtma turlari">
            {pieData.length > 0 ? (
              <Pie {...pieConfig} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Ma'lumot yo'q</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent Orders and Popular Products */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            title="So'nggi Buyurtmalar" 
            extra={<Button type="link" href="/orders">Barchasini ko'rish</Button>}
          >
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              rowKey="_id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Mashhur mahsulotlar">
            <List
              dataSource={stats?.products.popular || []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={item.product.image || '/placeholder-food.jpg'} 
                        size="small"
                      />
                    }
                    title={item.product.name}
                    description={`${item.orderCount} buyurtma • ${item.revenue.toLocaleString()} so'm`}
                  />
                </List.Item>
              )}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;