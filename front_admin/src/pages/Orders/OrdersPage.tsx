// src/pages/Orders/OrdersPage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Space, Card, Row, Col, Typography, Select, DatePicker, message as antdMessage, Input, Drawer } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import OrdersStats from '@/components/Orders/OrdersStats';

import OrdersTable, { type Order as TableOrder } from '@/components/Orders/OrdersTable';
import OrderDetailsModal, { type Order as DetailsOrder } from '@/components/Orders/OrderDetailsModal';
import AssignCourierModal from '@/components/Orders/AssignCourierModal';
import { useAuth } from '@/hooks/useAuth';
// import { useSocket } from '@/hooks/useSocket'; // Moved to MainLayout
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchOrders, setSelectedOrder, updateOrderStatus, setPagination, fetchOrderStats } from '@/store/slices/ordersSlice';
import apiService from '@/services/api';
import { useLocation } from 'react-router-dom';
import '@/pages/Orders/orders-highlight.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

type Order = TableOrder & Partial<DetailsOrder>;

// OrderStatsShape is now defined in Redux slice

const OrdersPage: React.FC = () => {
  const [messageApi, contextHolder] = antdMessage.useMessage();
  const dispatch = useAppDispatch();
  
  // Redux state
  const { orders, selectedOrder, loading, error, pagination, stats, statsLoading } = useAppSelector(state => state.orders);
  
  // Local UI state
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<TableOrder | null>(null);
  // stats is now in Redux state

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
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Load branches for superadmin
  useEffect(() => {
    if (!isSuper) return;
    
    const loadBranches = async () => {
      setBranchesLoading(true);
      try {
        const data = await apiService.getBranches();
        if (Array.isArray(data)) {
          setBranches(data as BranchLite[]);
        } else {
          const obj = data as { branches?: BranchLite[]; items?: BranchLite[] };
          const list = obj?.branches || obj?.items || [];
          setBranches(list as BranchLite[]);
        }
      } catch (error) {
        console.error('Failed to load branches:', error);
        messageApi.error('Failed to load branches');
      } finally {
        setBranchesLoading(false);
      }
    };

    loadBranches();
  }, [isSuper, messageApi]);

  const location = useLocation();
  // const branchId = (() => {
  //   const maybe = (user as unknown) as { branch?: { _id?: string } } | null;
  //   return maybe?.branch?._id || 'default';
  // })();
  // const token = localStorage.getItem('token') || '';
  // const { connected } = useSocket(); // Moved to MainLayout
  
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  // 🔧 Guard: filtr o'zgarganda avtomatik modal ochilmasin
  const suppressAutoOpenRef = useRef(false);
  useEffect(() => {
    suppressAutoOpenRef.current = true;
    const t = setTimeout(() => { suppressAutoOpenRef.current = false; }, 400);
    return () => clearTimeout(t);
  }, [filters, pagination.current, pagination.pageSize]);

  // Load orders when component mounts or filters change
  useEffect(() => {
    dispatch(fetchOrders({
      page: pagination.current,
      limit: pagination.pageSize,
      status: filters.status,
      orderType: filters.orderType,
    }));
  }, [dispatch, pagination.current, pagination.pageSize, filters.status, filters.orderType]);

  // Show error messages
  useEffect(() => {
    if (error) {
      messageApi.error(error);
    }
  }, [error, messageApi]);

  // Load order statistics
  useEffect(() => {
    dispatch(fetchOrderStats());
  }, [dispatch]);

  // Refresh data when filters change
  useEffect(() => {
    dispatch(fetchOrders({
      page: pagination.current,
      limit: pagination.pageSize,
      status: filters.status,
      orderType: filters.orderType,
    }));
  }, [dispatch, filters, pagination.current, pagination.pageSize]);

  // Bell popoverdan focusOrderId kelsa: topib highlight + modalni ochish
  useEffect(() => {
    const state = location.state as { focusOrderId?: string } | null;
    if (!state?.focusOrderId) return;
    if (suppressAutoOpenRef.current) return;
    const order = orders.find(o => o._id === state.focusOrderId || o.orderNumber === state.focusOrderId);
    if (order) {
      dispatch(setSelectedOrder(order));
      setDetailsVisible(true);
      // highlight uchun qisqa scroll/hilite class qo'shish mumkin — hozir modal ochish yetarli
    }
    // location.state ni tozalash uchun tarixni almashtirish (optional)
    window.history.replaceState({}, document.title);
  }, [location.state, orders]);

  // Customer arrival handling is now done through Socket.io events in useSocket hook

  // Watch for selectedOrder changes from Redux (e.g. from notification clicks)
  useEffect(() => {
    if (selectedOrder) {
      setDetailsVisible(true);
    } else {
      setDetailsVisible(false);
    }
  }, [selectedOrder]);

  // Fokus ID bo'lsa va ro'yxat yangilangan bo'lsa, moddalni ochamiz
  useEffect(() => {
    if (!pendingFocusId || orders.length === 0) return;
    if (suppressAutoOpenRef.current) return;
    const order = orders.find(o => o._id === pendingFocusId || o.orderNumber === pendingFocusId);
    if (order) {
      dispatch(setSelectedOrder(order));
      setDetailsVisible(true);
      setPendingFocusId(null);
    }
  }, [pendingFocusId, orders]);

  // Refresh data when socket reconnects - handled in MainLayout
  // useEffect(() => {
  //   if (connected) {
  //     dispatch(fetchOrders({
  //       page: pagination.current,
  //       limit: pagination.pageSize,
  //       status: filters.status,
  //       orderType: filters.orderType,
  //     }));
  //   }
  // }, [connected, dispatch, pagination.current, pagination.pageSize, filters.status, filters.orderType]);

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
    console.log('👁️ showOrderDetails chaqirildi:', order.orderId);
    dispatch(setSelectedOrder(order as unknown as Order));
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
        dispatch(setSelectedOrder(merged as unknown as Order));
      }
    } catch (e) {
      console.warn('Order details fetch failed', e);
    }
  };

  // Bell popoverdan kirilganda newOrders ichidagi eng so'nggi buyurtmani ochish - handled in MainLayout
  // useEffect(() => {
  //   if (!connected || !detailsVisible) return;
  // }, [connected, detailsVisible]);

  // Deprecated: full-screen status update modal removed in favor of quick actions

  const openAssignCourier = (order: TableOrder) => {
    // Don't set selectedOrder - it triggers OrderDetailsModal via useEffect
    // dispatch(setSelectedOrder(order as unknown as Order));
    setAssignModalVisible(true);
    setSelectedOrderForAssign(order); // Use local state instead
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
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => { 
              dispatch(fetchOrders({
                page: pagination.current,
                limit: pagination.pageSize,
                status: filters.status,
                orderType: filters.orderType,
              }));
            }}>Yangilash</Button>
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
                 options={branches.map((b) => ({ value: b._id, label: b.name || b.title || b._id }))}
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
           onChangePage={(p, ps) => dispatch(setPagination({ current: p, pageSize: ps }))}
          onShowDetails={showOrderDetails}
           onQuickStatusChange={async (order, newStatus) => {
            try {
              await dispatch(updateOrderStatus({ orderId: order._id, status: newStatus })).unwrap();
              messageApi.success('Holat yangilandi');
              // Stats yangilash
              dispatch(fetchOrderStats());
            } catch (error) {
              console.error('Status update failed:', error);
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
        onClose={() => {
          setDetailsVisible(false);
          dispatch(setSelectedOrder(null)); // Clear selectedOrder to prevent auto-reopening
        }}
        getOrderTypeText={getOrderTypeText}
        getPaymentText={getPaymentMethodText}
        onStatusUpdated={() => {
          dispatch(fetchOrders({
            page: pagination.current,
            limit: pagination.pageSize,
            status: filters.status,
            orderType: filters.orderType,
          }));
        }}
      />

      {/* Legacy modal removed */}

      <AssignCourierModal
        open={assignModalVisible}
        orderId={selectedOrderForAssign?._id || null}
        onClose={() => {
          setAssignModalVisible(false);
          setSelectedOrderForAssign(null);
        }}
        onAssigned={() => {
          messageApi.success('Kuryer tayinlandi');
          dispatch(fetchOrders({
            page: pagination.current,
            limit: pagination.pageSize,
            status: filters.status,
            orderType: filters.orderType,
          }));
          setAssignModalVisible(false);
          setSelectedOrderForAssign(null);
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

          <Button type="primary" block onClick={() => { 
            setFiltersVisible(false); 
            dispatch(setPagination({ current: 1 }));
            dispatch(fetchOrders({
              page: 1,
              limit: pagination.pageSize,
              status: filters.status,
              orderType: filters.orderType,
            }));
          }}>
            Filtrlarni qo'llash
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default OrdersPage;