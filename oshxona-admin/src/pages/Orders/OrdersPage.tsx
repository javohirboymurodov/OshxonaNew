// src/pages/Orders/OrdersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Card, Row, Col, Typography, Select, DatePicker, message as antdMessage, Input, Drawer } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import OrdersStats from '@/components/Orders/OrdersStats';
import OrdersTable, { type Order as TableOrder } from '@/components/Orders/OrdersTable';
import OrderDetailsModal, { type Order as DetailsOrder } from '@/components/Orders/OrderDetailsModal';
import AssignCourierModal from '@/components/Orders/AssignCourierModal';
import { useAuth } from '@/hooks/useAuth';
import { useRealTimeOrders } from '@/hooks/useSocket';
import apiService from '@/services/api';
import { useLocation } from 'react-router-dom';
import '@/pages/Orders/orders-highlight.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

type Order = TableOrder & Partial<DetailsOrder>;

interface OrderStatsShape {
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
}

const defaultStats: OrderStatsShape = {
  pending: 0,
  confirmed: 0,
  preparing: 0,
  ready: 0,
  delivered: 0,
  cancelled: 0,
};

const OrdersPage: React.FC = () => {
  const [messageApi, contextHolder] = antdMessage.useMessage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [stats, setStats] = useState<OrderStatsShape>(defaultStats);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });

  interface Filters {
    search: string;
    status: string;
    orderType: string;
    paymentMethod: string;
    dateRange: [Dayjs | null, Dayjs | null] | null;
    courier?: 'assigned' | 'unassigned' | '';
  }
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    orderType: '',
    paymentMethod: '',
    dateRange: null as [Dayjs | null, Dayjs | null] | null,
    courier: ''
  });

  const { user } = useAuth();
  const location = useLocation();
  const branchId = (() => {
    const maybe = (user as unknown) as { branch?: { _id?: string } } | null;
    return maybe?.branch?._id || 'default';
  })();
  const token = localStorage.getItem('token') || '';
  const { newOrders, orderUpdates, connected } = useRealTimeOrders(token, branchId);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  type OrdersListResponse = {
    orders?: Array<Order & { orderId?: string; total?: number }>;
    pagination?: { total?: number; current?: number; pageSize?: number };
    data?: { orders?: Array<Order & { orderId?: string; total?: number }>; pagination?: { total?: number; current?: number; pageSize?: number } };
  };

  const fetchOrders = async (page = 1, pageSize = 15) => {
    setLoading(true);
    try {
      const data: OrdersListResponse = await apiService.getOrders(page, pageSize, {
        status: filters.status || undefined,
        orderType: filters.orderType || undefined,
        search: filters.search || undefined,
        courier: filters.courier || undefined,
        ...(filters.dateRange && filters.dateRange[0] && filters.dateRange[1]
          ? {
              dateFrom: dayjs(filters.dateRange[0]).toDate().toISOString(),
              dateTo: dayjs(filters.dateRange[1]).toDate().toISOString(),
            }
          : {}),
      });

      const rawOrders: Array<Order & { orderId?: string; total?: number; orderNumber?: string; totalAmount?: number }> = (data?.orders || data?.data?.orders || []) as Array<Order & { orderId?: string; total?: number; orderNumber?: string; totalAmount?: number }>;
      const normalized: Order[] = rawOrders.map((o) => ({
        ...o,
        orderNumber: o.orderNumber || o.orderId || '',
        totalAmount: o.totalAmount ?? o.total,
      }));
      const pag = data?.pagination || data?.data?.pagination || {};

      setOrders(normalized);
      setPagination({ current: page, pageSize, total: Number(pag.total || normalized.length || 0) });
    } catch (error) {
      console.error('Error fetching orders:', error);
      messageApi.error('Buyurtmalarni yuklashda xatolik!');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderStats = async () => {
    try {
      const data = (await apiService.getOrderStats()) as { stats?: Partial<OrderStatsShape> } | Partial<OrderStatsShape> | undefined;
      let s: Partial<OrderStatsShape> = {};
      if (data && typeof data === 'object' && 'stats' in (data as Record<string, unknown>)) {
        s = ((data as { stats?: Partial<OrderStatsShape> }).stats) ?? {};
      } else {
        s = (data as Partial<OrderStatsShape>) ?? {};
      }
      setStats({
        pending: Number(s.pending) || 0,
        confirmed: Number(s.confirmed) || 0,
        preparing: Number(s.preparing) || 0,
        ready: Number(s.ready) || 0,
        delivered: Number(s.delivered) || 0,
        cancelled: Number(s.cancelled) || 0,
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
      setStats(defaultStats);
    }
  };

  useEffect(() => {
    fetchOrders(1, pagination.pageSize);
    fetchOrderStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Bell popoverdan focusOrderId kelsa: topib highlight + modalni ochish
  useEffect(() => {
    const state = location.state as { focusOrderId?: string } | null;
    if (!state?.focusOrderId) return;
    const order = orders.find(o => o._id === state.focusOrderId || o.orderNumber === state.focusOrderId);
    if (order) {
      setSelectedOrder(order);
      setDetailsVisible(true);
      // highlight uchun qisqa scroll/hilite class qo'shish mumkin — hozir modal ochish yetarli
    }
    // location.state ni tozalash uchun tarixni almashtirish (optional)
    window.history.replaceState({}, document.title);
  }, [location.state, orders]);

  // Real-time dine_in_arrived kelganda avtomatik ochish uchun fokus ID ni tayyorlab qo'yamiz
  useEffect(() => {
    if (!orderUpdates || orderUpdates.length === 0) return;
    const last = orderUpdates[0] as unknown as { event?: string; orderId?: string };
    if (last && last.event === 'dine_in_arrived' && last.orderId) {
      const id = String(last.orderId);
      setPendingFocusId(id);
      try { localStorage.setItem('ackOrderId', id); } catch { /* ignore */ }
    }
  }, [orderUpdates]);

  // Fokus ID bo'lsa va ro'yxat yangilangan bo'lsa, moddalni ochamiz
  useEffect(() => {
    if (!pendingFocusId || orders.length === 0) return;
    const order = orders.find(o => o._id === pendingFocusId || o.orderNumber === pendingFocusId);
    if (order) {
      setSelectedOrder(order);
      setDetailsVisible(true);
      setPendingFocusId(null);
    }
  }, [pendingFocusId, orders]);

  useEffect(() => {
    if (!connected) return;
    fetchOrders(pagination.current, pagination.pageSize);
    fetchOrderStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOrders, orderUpdates, connected]);

  const getPaymentMethodText = useMemo(
    () => (method: string) => {
      const texts = { cash: 'Naqd', card: 'Karta', online: 'Online' } as const;
      return (texts as Record<string, string>)[method] || method;
    },
    []
  );
  const getOrderTypeText = useMemo(
    () => (type: string) => ({ delivery: 'Yetkazib berish', pickup: 'Olib ketish', dine_in: 'Avvaldan buyurtma', table: 'Stoldan (QR)' } as Record<string, string>)[type] || type,
    []
  );

  const showOrderDetails = (order: TableOrder) => {
    setSelectedOrder(order as unknown as Order);
    setDetailsVisible(true);
    // Belldagi notificationni kamaytirish uchun localStorage orqali ack yuboramiz
    const ackId = (order as unknown as { _id?: string; orderNumber?: string })._id || (order as unknown as { _id?: string; orderNumber?: string }).orderNumber;
    if (ackId) {
      try { localStorage.setItem('ackOrderId', String(ackId)); } catch { /* ignore */ }
    }
  };

  // Bell popoverdan kirilganda newOrders ichidagi eng so'nggi buyurtmani ochish
  useEffect(() => {
    if (!connected || !detailsVisible) return;
  }, [connected, detailsVisible]);

  // Deprecated: full-screen status update modal removed in favor of quick actions

  const openAssignCourier = (order: TableOrder) => {
    setSelectedOrder(order as unknown as Order);
    setAssignModalVisible(true);
  };

  // quick status change handles update inline; legacy handler removed

  return (
    <div>
      {contextHolder}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Buyurtmalar Boshqaruvi</Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<FilterOutlined />} onClick={() => setFiltersVisible(true)}>Filtrlar</Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => { fetchOrders(pagination.current, pagination.pageSize); fetchOrderStats(); }}>Yangilash</Button>
          </Space>
        </Col>
      </Row>

      <OrdersStats stats={stats} />

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
              <Option value="dine_in">Avvaldan buyurtma</Option>
              <Option value="table">Stoldan (QR)</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Select
              placeholder="Kuryer"
              allowClear
              value={filters.courier || undefined}
              onChange={(value) => setFilters({ ...filters, courier: (value || '') as Filters['courier'] })}
              style={{ width: '100%' }}
              options={[
                { value: 'assigned', label: 'Tayinlangan' },
                { value: 'unassigned', label: 'Tayinlanmagan' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <OrdersTable
          data={orders}
          loading={loading}
          pagination={pagination}
          onChangePage={(p, ps) => fetchOrders(p, ps)}
          onShowDetails={showOrderDetails}
          onQuickStatusChange={async (order, newStatus) => {
            try {
              await apiService.updateOrderStatus(order._id, newStatus);
              messageApi.success('Holat yangilandi');
              fetchOrders(pagination.current, pagination.pageSize);
              fetchOrderStats();
            } catch {
              messageApi.error('Holatni yangilashda xatolik');
            }
          }}
          onAssignCourier={openAssignCourier}
          highlightId={(location.state as { focusOrderId?: string } | null)?.focusOrderId}
        />
      </Card>

      <OrderDetailsModal open={detailsVisible} order={selectedOrder as unknown as DetailsOrder | null} onClose={() => setDetailsVisible(false)} getOrderTypeText={getOrderTypeText} getPaymentText={getPaymentMethodText} />

      {/* Legacy modal removed */}

      <AssignCourierModal
        open={assignModalVisible}
        orderId={selectedOrder?._id || null}
        onClose={() => setAssignModalVisible(false)}
        onAssigned={() => {
          messageApi.success('Kuryer tayinlandi');
          fetchOrders(pagination.current, pagination.pageSize);
        }}
      />

      <Drawer title="Qo'shimcha filtrlar" placement="right" onClose={() => setFiltersVisible(false)} open={filtersVisible} width={400}>
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

          <Button type="primary" block onClick={() => { setFiltersVisible(false); fetchOrders(1, pagination.pageSize); }}>
            Filtrlarni qo'llash
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default OrdersPage;