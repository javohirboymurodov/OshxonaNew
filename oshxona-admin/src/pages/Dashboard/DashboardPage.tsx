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
  List,
  Avatar,
  Spin,
  Alert,
  DatePicker,
  Select,
  message as antdMessage
} from 'antd';
import {
  ArrowUpOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
  ShopOutlined,
  ReloadOutlined,
  TruckOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Line, Pie, Column, Bar } from '@ant-design/plots';
import apiService from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRealTimeOrders } from '@/hooks/useSocket';
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
    byType?: {
      delivery?: number;
      pickup?: number;
      dine_in?: number;
      table?: number;
    };
    byHour?: Array<{ hour: number; count: number; revenue: number }>;
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
  meta?: {
    categories?: number;
    branches?: number;
    avgDeliveryEtaMinutes?: number | null;
  };
  byBranch?: Array<{ branchId: string; name: string; orders: number; revenue: number }>;
  courierPerformance?: Array<{ courierId: string; name: string; avgMinutes: number; orders: number }>;
  categoryShare?: Array<{ categoryId: string; name: string; quantity: number; revenue: number; percent: number }>;
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
  const [chartData, setChartData] = useState<Array<{ date: string; value: number }>>([]);
  const [pieData, setPieData] = useState<Array<{ type: string; value: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const { user } = useAuth();
  const isSuper = String((user as { role?: string } | null | undefined)?.role || '').toLowerCase() === 'superadmin';
  const [branch, setBranch] = useState<string>('');
  const branchesQuery = useQuery<{ _id: string; name?: string; title?: string }[]>({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const data = await apiService.getBranches();
      if (Array.isArray(data)) return data as { _id: string; name?: string; title?: string }[];
      return (data?.branches || data?.items || []) as { _id: string; name?: string; title?: string }[];
    },
    enabled: isSuper,
  });
  const token = localStorage.getItem('token') || '';
  const branchId = ((user as { branch?: { _id?: string } } | null | undefined)?.branch?._id) || 'default';
  const { newOrders, connected } = useRealTimeOrders(token, branchId);

  const [messageApi, contextHolder] = antdMessage.useMessage();

  const queryClient = useQueryClient();
  const rangeKey = {
    from: dateRange[0]?.toDate()?.toISOString?.(),
    to: dateRange[1]?.toDate()?.toISOString?.(),
  } as const;
  
  const dashQuery = useQuery({
    queryKey: ['dashboard', rangeKey, isSuper ? branch : 'admin-branch'],
    queryFn: async () => {
      const statsResponse = await apiService.getDashboardStats(isSuper && branch ? { branch } : undefined);

      const startOfDay = dayjs().startOf('day').toDate().toISOString();
      const endOfDay = dayjs().endOf('day').toDate().toISOString();
      type RawOrder = {
        _id?: unknown;
        orderId?: unknown;
        orderNumber?: unknown;
        user?: { firstName?: unknown; lastName?: unknown };
        customerInfo?: { name?: unknown };
        totalAmount?: unknown;
        total?: unknown;
        status?: unknown;
        orderType?: unknown;
        createdAt?: unknown;
      };
      const ordersUrl = `/orders?page=1&limit=20&dateFrom=${encodeURIComponent(startOfDay)}&dateTo=${encodeURIComponent(endOfDay)}${isSuper && branch ? `&branch=${encodeURIComponent(branch)}` : ''}`;
      const ordersData = await apiService.get<{ orders?: RawOrder[]; data?: { orders?: RawOrder[] } }>(ordersUrl);
      const rawOrders: RawOrder[] = (ordersData?.orders || ordersData?.data?.orders || []) as RawOrder[];
      const activeStatuses = new Set(['pending','confirmed','preparing','ready','on_delivery']);
      const ordersResponse: RecentOrder[] = rawOrders
        .filter((o) => activeStatuses.has(String(o.status)))
        .slice(0, 10)
        .map((o) => ({
          _id: String(o._id ?? ''),
          orderNumber: String((o.orderId ?? o.orderNumber ?? '')),
          user: { firstName: String(o.user?.firstName ?? o.customerInfo?.name ?? 'Mijoz'), lastName: String(o.user?.lastName ?? '') },
          totalAmount: Number(o.totalAmount ?? o.total ?? 0),
          status: String(o.status ?? ''),
          orderType: String(o.orderType ?? ''),
          createdAt: String(o.createdAt ?? new Date().toISOString())
        }));

      const chartResponse = await apiService.get<{ date: string; value: number }[]>(`/dashboard/chart-data?startDate=${encodeURIComponent(rangeKey.from || '')}&endDate=${encodeURIComponent(rangeKey.to || '')}&type=revenue${isSuper && branch ? `&branch=${encodeURIComponent(branch)}` : ''}`);

      // Buyurtma turlari diagrammasi (tanlangan oraliq bo'yicha)
      const pieChartData: Array<{ type: string; value: number }> = [
        { type: 'Yetkazib berish', value: statsResponse.orders.byType?.delivery || 0 },
        { type: 'Olib ketish', value: statsResponse.orders.byType?.pickup || 0 },
        { type: "Avvaldan buyurtma", value: statsResponse.orders.byType?.dine_in || 0 },
        { type: 'Stol (QR)', value: statsResponse.orders.byType?.table || 0 },
      ];

      return { statsResponse, ordersResponse, chartResponse, pieChartData };
    },
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Dashboard stats
      const statsResponse = await apiService.getDashboardStats();
      
      // Bugungi faol buyurtmalar (delivered/cancelled emas)
      const startOfDay = dayjs().startOf('day').toDate().toISOString();
      const endOfDay = dayjs().endOf('day').toDate().toISOString();
      type RawOrder = {
        _id?: unknown;
        orderId?: unknown;
        orderNumber?: unknown;
        user?: { firstName?: unknown; lastName?: unknown };
        customerInfo?: { name?: unknown };
        totalAmount?: unknown;
        total?: unknown;
        status?: unknown;
        orderType?: unknown;
        createdAt?: unknown;
      };
      const ordersData = await apiService.get<{ orders?: RawOrder[]; data?: { orders?: RawOrder[] } }>(`/orders?page=1&limit=20&dateFrom=${encodeURIComponent(startOfDay)}&dateTo=${encodeURIComponent(endOfDay)}`);
      const rawOrders: RawOrder[] = (ordersData?.orders || ordersData?.data?.orders || []) as RawOrder[];
      const activeStatuses = new Set(['pending','confirmed','preparing','ready','on_delivery']);
      const ordersResponse: RecentOrder[] = rawOrders
        .filter((o) => activeStatuses.has(String(o.status)))
        .slice(0, 10)
        .map((o) => ({
          _id: String(o._id ?? ''),
          orderNumber: String((o.orderId ?? o.orderNumber ?? '')),
          user: { firstName: String(o.user?.firstName ?? o.customerInfo?.name ?? 'Mijoz'), lastName: String(o.user?.lastName ?? '') },
          totalAmount: Number(o.totalAmount ?? o.total ?? 0),
          status: String(o.status ?? ''),
          orderType: String(o.orderType ?? ''),
          createdAt: String(o.createdAt ?? new Date().toISOString())
        }));

      // Chart data (revenue trend)
      const chartResponse = await apiService.get<{ date: string; value: number }[]>(`/dashboard/chart-data?startDate=${encodeURIComponent(dateRange[0].toISOString())}&endDate=${encodeURIComponent(dateRange[1].toISOString())}&type=revenue`);

      setStats(statsResponse);
      setRecentOrders(ordersResponse);
      setChartData(chartResponse);

      // Pie chart data for order types
      const pieChartData: Array<{ type: string; value: number }> = [
        { type: 'Yetkazib berish', value: statsResponse.orders.byStatus.delivered },
        { type: 'Olib ketish', value: Math.floor(statsResponse.orders.byStatus.delivered * 0.3) },
        { type: 'Zalda iste\'mol', value: Math.floor(statsResponse.orders.byStatus.delivered * 0.2) },
      ];
      setPieData(pieChartData);

    } catch (err) {
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
    setLoading(dashQuery.isLoading);
    if (dashQuery.isError) setError('Dashboard ma\'lumotlarini yuklashda xatolik yuz berdi');
    if (dashQuery.data) {
      setStats(dashQuery.data.statsResponse);
      setRecentOrders(dashQuery.data.ordersResponse);
      setChartData(dashQuery.data.chartResponse);
      setPieData(dashQuery.data.pieChartData);
    }
  }, [dashQuery.isLoading, dashQuery.isError, dashQuery.data]);

  useEffect(() => {
    if (!connected) return;
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [connected, newOrders, queryClient]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'orange',
      confirmed: 'blue',
      preparing: 'purple',
      ready: 'cyan',
      on_delivery: 'geekblue',
      delivered: 'green',
      picked_up: 'green',
      completed: 'green',
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
      on_delivery: 'Yetkazilmoqda',
      delivered: 'Yetkazilgan',
      picked_up: 'Olib ketildi',
      completed: 'Yakunlangan',
      cancelled: 'Bekor qilingan'
    };
    return texts[status] || status;
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
      title: 'Amal',
      key: 'action',
      render: (record: RecentOrder) => {
        const next = getNextStatuses(record.status);
        return (
          <Space size="small">
            {next.map((s) => (
              <Button
                key={s}
                size="small"
                type="primary"
                onClick={async () => {
                  try {
                    await apiService.updateOrderStatus(record._id, s);
                    messageApi.success('Holat yangilandi');
                    fetchDashboardData();
                  } catch {
                    messageApi.error('Holatni yangilashda xatolik');
                  }
                }}
              >
                {getStatusText(s)}
              </Button>
            ))}
          </Space>
        );
      }
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
    meta: {
      value: {
        alias: 'Daromad',
        formatter: (v: number) => `${(v || 0).toLocaleString()} so'm`,
      }
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${Number(v).toLocaleString()}`
      }
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
    legend: {
      position: 'left',
      layout: 'vertical',
      flipPage: false,
    },
    tooltip: {
      formatter: (datum: { type: string; value: number }) => ({
        name: datum.type,
        value: String(datum.value),
      })
    },
    // Spider label ba'zi versiyalarda qo'llab-quvvatlanmaydi, xatoni oldini olish uchun o'chirdik
    label: false as const,
  };

  // Orders by hour (Column)
  const ordersByHourConfig = {
    data: (stats?.orders.byHour || []).map((d) => ({ hour: `${d.hour}:00`, count: d.count })),
    xField: 'hour',
    yField: 'count',
    columnWidthRatio: 0.6,
    // 'middle' pozitsiyasi hamma buildlarda mavjud emas; xatoni oldini olish uchun oddiy labelni o'chiramiz
    label: false as const,
    xAxis: { label: { formatter: (v: string) => v.padStart(5, '0') } },
  };

  // Branch segmentation (Bar)
  const [branchMetric, setBranchMetric] = useState<'revenue' | 'orders'>('revenue');
  const branchBarConfig = {
    data: (stats?.byBranch || []).map((b) => ({ name: b.name || 'Filial', value: branchMetric === 'revenue' ? b.revenue : b.orders })),
    xField: 'value',
    yField: 'name',
    seriesField: 'name',
    legend: false as const,
    xAxis: {
      label: { formatter: (v: string) => Number(v).toLocaleString() },
    },
    tooltip: {
      formatter: (d: { name: string; value: number }) => ({ name: d.name, value: branchMetric === 'revenue' ? `${d.value.toLocaleString()} so'm` : `${d.value.toLocaleString()} ta` }),
    },
  };

  // Category share (Pie)
  const [categoryMetric, setCategoryMetric] = useState<'revenue' | 'quantity'>('revenue');
  const categoryPieData = (stats?.categoryShare || []).map((c) => ({ type: c.name || 'Kategoriya', value: categoryMetric === 'revenue' ? (c.revenue || 0) : (c.quantity || 0) }));
  const categoryPieConfig = {
    data: categoryPieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    legend: { position: 'bottom' as const },
    // Spider labelni o'chirdik – ba'zi versiyalarda komponent yo'q
    label: false as const,
  };

  const courierColumns = [
    { title: 'Kuryer', dataIndex: 'name', key: 'name' },
    { title: 'Buyurtmalar', dataIndex: 'orders', key: 'orders', render: (v: number) => v?.toLocaleString?.() || 0 },
    { title: 'O‘rtacha daqiqa', dataIndex: 'avgMinutes', key: 'avgMinutes', render: (v: number) => `${v?.toFixed?.(1) || 0}` },
    { title: 'Median', dataIndex: 'medianMinutes', key: 'medianMinutes', render: (v: number) => `${v?.toFixed?.(1) || 0}` },
    { title: 'Min', dataIndex: 'minMinutes', key: 'minMinutes', render: (v: number) => `${v ?? 0}` },
    { title: 'Max', dataIndex: 'maxMinutes', key: 'maxMinutes', render: (v: number) => `${v ?? 0}` },
  ];

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
      {contextHolder}
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Dashboard
              {connected && newOrders.length > 0 && (
                <span style={{
                  background: '#ff4d4f',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '0 8px',
                  fontSize: 12,
                  lineHeight: '20px',
                  display: 'inline-block'
                }}>
                  +{newOrders.length} yangi
                </span>
              )}
            </Title>
            <Text type="secondary">
              Xush kelibsiz, {user?.firstName} {user?.lastName}! 👋
            </Text>
          </Col>
          <Col>
            <Space>
              {isSuper && (
                <Select
                  placeholder="Filial"
                  allowClear
                  style={{ width: 220 }}
                  value={branch || undefined}
                  onChange={(v) => setBranch(v || '')}
                  options={(branchesQuery.data || []).map((b) => ({ value: b._id, label: b.name || b.title || 'Filial' }))}
                />
              )}
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]);
                }}
                format="DD.MM.YYYY"
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  // invalidate + fresh fetch with range filters
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                  fetchDashboardData();
                }}
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

      {/* Hourly and Branch segmentation */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Soat bo‘yicha buyurtmalar">
            {(stats?.orders.byHour || []).length > 0 ? (
              <Column {...ordersByHourConfig} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Ma'lumot yo'q</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Filiallar" extra={
            <Space size="small">
              <Button size="small" type={branchMetric==='revenue'?'primary':'default'} onClick={() => setBranchMetric('revenue')}>Daromad</Button>
              <Button size="small" type={branchMetric==='orders'?'primary':'default'} onClick={() => setBranchMetric('orders')}>Buyurtma</Button>
            </Space>
          }>
            {(stats?.byBranch || []).length > 0 ? (
              <Bar {...branchBarConfig} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Ma'lumot yo'q</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Couriers and Category share */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Kuryerlar reytingi (o‘rtacha daqiqa pastdan yuqoriga)">
            <Table
              dataSource={(stats?.courierPerformance || []).slice(0, 10)}
              columns={courierColumns}
              rowKey={(r) => r.courierId}
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Kategoriya ulushi" extra={
            <Space size="small">
              <Button size="small" type={categoryMetric==='revenue'?'primary':'default'} onClick={() => setCategoryMetric('revenue')}>Daromad</Button>
              <Button size="small" type={categoryMetric==='quantity'?'primary':'default'} onClick={() => setCategoryMetric('quantity')}>Soni</Button>
            </Space>
          }>
            {(categoryPieData || []).length > 0 ? (
              <Pie {...categoryPieConfig} />
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