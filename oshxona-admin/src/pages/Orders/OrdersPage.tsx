// src/pages/Orders/OrdersPage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Space, Card, Row, Col, Typography, Select, DatePicker, message as antdMessage, Input, Drawer } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import OrdersStats from '@/components/Orders/OrdersStats';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const isSuper = String(((user as unknown) as { role?: string })?.role || '').toLowerCase() === 'superadmin';
  const [branch, setBranch] = useState<string>('');
  type BranchLite = { _id: string; name?: string; title?: string };

  const branchesQuery = useQuery<BranchLite[]>({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const data = await apiService.getBranches();
      if (Array.isArray(data)) return data as BranchLite[];
      const obj = data as { branches?: BranchLite[]; items?: BranchLite[] };
      const list = obj?.branches || obj?.items || [];
      return list as BranchLite[];
    },
    enabled: isSuper,
  });

  const location = useLocation();
  const branchId = (() => {
    const maybe = (user as unknown) as { branch?: { _id?: string } } | null;
    return maybe?.branch?._id || 'default';
  })();
  const token = localStorage.getItem('token') || '';
  const { newOrders, orderUpdates, connected } = useRealTimeOrders(token, branchId);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  // 🔧 Guard: filtr o'zgarganda avtomatik modal ochilmasin
  const suppressAutoOpenRef = useRef(false);
  useEffect(() => {
    suppressAutoOpenRef.current = true;
    const t = setTimeout(() => { suppressAutoOpenRef.current = false; }, 400);
    return () => clearTimeout(t);
  }, [filters, pagination.current, pagination.pageSize]);

  type OrdersListResponse = {
    orders?: Array<Order & { orderId?: string; total?: number }>;
    pagination?: { total?: number; current?: number; pageSize?: number };
    data?: { orders?: Array<Order & { orderId?: string; total?: number }>; pagination?: { total?: number; current?: number; pageSize?: number } };
  };

  const queryClient = useQueryClient();
  const ordersQueryKey = ['orders', {
    page: pagination.current,
    pageSize: pagination.pageSize,
    status: filters.status,
    orderType: filters.orderType,
    search: filters.search,
    courier: filters.courier,
    dateFrom: filters.dateRange?.[0]?.toISOString?.(),
    dateTo: filters.dateRange?.[1]?.toISOString?.(),
    branch: isSuper ? branch : undefined,
  }];

  const ordersQuery = useQuery<Order[]>({
    queryKey: ordersQueryKey,
    queryFn: async () => {
      const data: OrdersListResponse = await apiService.getOrders(pagination.current, pagination.pageSize, {
        status: filters.status || undefined,
        orderType: filters.orderType || undefined,
        search: filters.search || undefined,
        courier: filters.courier || undefined,
        ...(isSuper && branch ? { branch } : {}),
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
      setPagination((prev) => ({ ...prev, total: Number(pag.total || normalized.length || 0) }));
      return normalized;
    },
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });

  // Real-time invalidation on updates
  useEffect(() => {
    if (!orderUpdates || orderUpdates.length === 0) return;
    queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderUpdates]);

  // 🔧 FIX: Kuryer buyurtma holati real-time yangilanishi
  useEffect(() => {
    if (!orderUpdates || orderUpdates.length === 0) return;
    
    const lastUpdate = orderUpdates[0];
    if (lastUpdate && typeof lastUpdate === 'object' && 'orderId' in lastUpdate) {
      console.log('🚚 Real-time order status update:', lastUpdate);
      
      // Buyurtma ro'yxatini yangilash
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
      
      // Agar buyurtma ochiq bo'lsa, uni ham yangilash
      if (selectedOrder && selectedOrder._id === lastUpdate.orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: lastUpdate.status as string } : null);
      }
      
      // Notification ko'rsatish
      const statusText = {
        'assigned': 'Kuryer tayinlandi',
        'on_delivery': 'Buyurtma qabul qilindi',
        'delivered': 'Buyurtma yetkazildi'
      }[lastUpdate.status as string] || 'Holat o\'zgardi';
      
      antdMessage.success(`${statusText} - Buyurtma №${lastUpdate.orderId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderUpdates]);

  useEffect(() => {
    setOrders((ordersQuery.data || []) as Order[]);
    setLoading(ordersQuery.isLoading);
  }, [ordersQuery.data, ordersQuery.isLoading]);

  const statsQuery = useQuery<OrderStatsShape>({
    queryKey: ['orders-stats'],
    queryFn: async () => {
      const data = (await apiService.get(`/orders/stats${isSuper && branch ? `?branch=${encodeURIComponent(branch)}` : ''}`)) as Record<string, unknown>;
      const hasStats = data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'stats');
      const s = (hasStats ? (data as { stats: Partial<OrderStatsShape> }).stats : (data as Partial<OrderStatsShape>)) || {} as Partial<OrderStatsShape>;
      return {
        pending: Number(s?.pending) || 0,
        confirmed: Number(s?.confirmed) || 0,
        preparing: Number(s?.preparing) || 0,
        ready: Number(s?.ready) || 0,
        delivered: Number(s?.delivered) || 0,
        cancelled: Number(s?.cancelled) || 0,
      } as OrderStatsShape;
    }
  });

  useEffect(() => {
    if (statsQuery.data) setStats(statsQuery.data);
  }, [statsQuery.data]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Bell popoverdan focusOrderId kelsa: topib highlight + modalni ochish
  useEffect(() => {
    const state = location.state as { focusOrderId?: string } | null;
    if (!state?.focusOrderId) return;
    if (suppressAutoOpenRef.current) return;
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
    if (suppressAutoOpenRef.current) return;
    const order = orders.find(o => o._id === pendingFocusId || o.orderNumber === pendingFocusId);
    if (order) {
      setSelectedOrder(order);
      setDetailsVisible(true);
      setPendingFocusId(null);
    }
  }, [pendingFocusId, orders]);

  useEffect(() => {
    if (!connected) return;
    queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
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

  const showOrderDetails = async (order: TableOrder) => {
    setSelectedOrder(order as unknown as Order);
    setDetailsVisible(true);
    const ackId = (order as unknown as { _id?: string; orderNumber?: string })._id || (order as unknown as { _id?: string; orderNumber?: string }).orderNumber;
    if (ackId) {
      try { localStorage.setItem('ackOrderId', String(ackId)); } catch { /* ignore */ }
    }
    // Full details (branch, dineInInfo, history...) ni olish
    try {
      const full = await apiService.getOrderById((order as unknown as { _id: string })._id);
      if (full) {
        const merged = {
          ...(order as unknown as Record<string, unknown>),
          ...(full as Record<string, unknown>),
        } as Record<string, unknown>;
        if (!merged.orderNumber) {
          merged.orderNumber = (full as Record<string, unknown>)['orderNumber']
            || (order as unknown as Record<string, unknown>)['orderNumber']
            || (full as Record<string, unknown>)['orderId']
            || '';
        }
        setSelectedOrder(merged as unknown as Order);
      }
    } catch (e) {
      console.warn('Order details fetch failed', e);
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
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => { queryClient.invalidateQueries({ queryKey: ordersQueryKey }); queryClient.invalidateQueries({ queryKey: ['orders-stats'] }); }}>Yangilash</Button>
          </Space>
        </Col>
      </Row>

      <OrdersStats
        stats={stats}
        onSelectStatus={(s) =>
          setFilters((prev) => ({ ...prev, status: prev.status === s ? '' : s }))
        }
      />

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          {isSuper && (
            <Col xs={24} sm={8} lg={4}>
              <Select
                placeholder="Filial"
                allowClear
                value={branch || undefined}
                onChange={(v) => setBranch(v || '')}
                style={{ width: '100%' }}
                 options={(branchesQuery.data || []).map((b) => ({ value: b._id, label: b.name || b.title || b._id }))}
              />
            </Col>
          )}
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
           onChangePage={(p, ps) => setPagination({ ...pagination, current: p, pageSize: ps })}
          onShowDetails={showOrderDetails}
           onQuickStatusChange={async (order, newStatus) => {
            try {
              await apiService.updateOrderStatus(order._id, newStatus);
              messageApi.success('Holat yangilandi');
              queryClient.invalidateQueries({ queryKey: ordersQueryKey });
              queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
            } catch {
              messageApi.error('Holatni yangilashda xatolik');
            }
          }}
          onAssignCourier={openAssignCourier}
          highlightId={(location.state as { focusOrderId?: string } | null)?.focusOrderId}
        />
      </Card>

      <OrderDetailsModal
        open={detailsVisible}
        order={selectedOrder as unknown as DetailsOrder | null}
        onClose={() => setDetailsVisible(false)}
        getOrderTypeText={getOrderTypeText}
        getPaymentText={getPaymentMethodText}
        onStatusUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ordersQueryKey });
          queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
        }}
      />

      {/* Legacy modal removed */}

      <AssignCourierModal
        open={assignModalVisible}
        orderId={selectedOrder?._id || null}
        onClose={() => setAssignModalVisible(false)}
        onAssigned={() => {
          messageApi.success('Kuryer tayinlandi');
          queryClient.invalidateQueries({ queryKey: ordersQueryKey });
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

          <Button type="primary" block onClick={() => { setFiltersVisible(false); setPagination({ ...pagination, current: 1 }); queryClient.invalidateQueries({ queryKey: ordersQueryKey }); }}>
            Filtrlarni qo'llash
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default OrdersPage;