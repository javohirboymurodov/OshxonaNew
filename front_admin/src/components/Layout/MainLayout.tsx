// src/components/Layout/MainLayout.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Drawer,
  Button,
  Avatar,
  Dropdown,
  Space,
  Badge,
  theme,
  List,
  Typography
} from 'antd';
import {
  MenuOutlined,
  DashboardOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  ContainerOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { dismissNewOrder, clearArrival } from '@/store/slices/ordersSlice';
import { useNavigate as useNav } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user } = useAuth();
  type UserShape = { role?: string; branch?: { _id?: string } } | null | undefined;
  const castUser = (user as unknown) as UserShape;
  const isSuper = String(castUser?.role || '').toLowerCase() === 'superadmin';
  // branchId is handled inside useSocket hook
  useSocket();
  const dispatch = useAppDispatch();
  const { newOrders, arrivals } = useAppSelector(state => state.orders);
  const go = useNav();
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Listen external ack (e.g., order opened from table)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ackOrderId' && e.newValue) {
        setDismissedIds((prev) => new Set(prev).add(e.newValue!));
        localStorage.removeItem('ackOrderId');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  type NewOrderLite = { id?: string; orderId?: string };
  const visibleOrders = useMemo(() => {
    return (newOrders as NewOrderLite[]).filter((o) => {
      const id = String(o.id || o.orderId || '');
      return id && !dismissedIds.has(id);
    });
  }, [newOrders, dismissedIds]);
  
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // isSuper already computed above
  const baseMenu = [
    ...(isSuper ? [{ key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' }] : []),
    {
      key: '/products',
      icon: <ShopOutlined />,
      label: 'Mahsulotlar',
    },
    {
      key: '/categories',
      icon: <ContainerOutlined />,
      label: 'Kategoriyalar',
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: 'Buyurtmalar',
    }
  ];
  const menuItems = isSuper
    ? [
        ...baseMenu,
        { key: '/couriers', icon: <UserOutlined />, label: 'Haydovchilar' },
        { key: '/users', icon: <UserOutlined />, label: 'Foydalanuvchilar' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Sozlamalar' },
      ]
    : [
        ...baseMenu,
        { key: '/couriers', icon: <UserOutlined />, label: 'Haydovchilar' }
      ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profil',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Chiqish',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const { logout } = useAuth();
  
  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // Use proper logout from auth context
      logout();
      navigate('/login');
    } else {
      navigate(`/${key}`);
    }
  };

  const SideMenu = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ height: '100%', borderRight: 0 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div className="p-4 text-center">
            <h2 className="text-white text-lg font-bold">
              {collapsed ? 'O' : 'Oshxona'}
            </h2>
          </div>
          {SideMenu}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title="Oshxona Admin"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
        >
          {SideMenu}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 220 }}>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            position: 'sticky',
            top: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Space>
            {isMobile ? (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
              />
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuOutlined /> : <MenuOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
            )}
          </Space>

          <Space>
            <Dropdown
              placement="bottomRight"
              trigger={["click"]}
              open={notifOpen}
              onOpenChange={(open) => setNotifOpen(open)}
              popupRender={() => (
                <div style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 8, padding: 8, width: 360 }}>
                  <Typography.Text strong style={{ padding: '0 8px' }}>Yangi buyurtmalar</Typography.Text>
                  <List
                    locale={{ emptyText: 'Hozircha yangi buyurtma yo\'q' }}
                    dataSource={visibleOrders.slice(0, 10)}
                    renderItem={(item: { _id?: string; id?: string; orderId?: string; orderType?: string; customer?: { name?: string }; customerInfo?: { name?: string }; total?: number }) => (
                      <List.Item
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const orderId = String(item._id || item.id || item.orderId || '');
                          if (orderId) {
                            // Dismiss notification
                            dispatch(dismissNewOrder(orderId));
                            setDismissedIds((prev) => new Set(prev).add(orderId));
                          }
                          setNotifOpen(false);
                          // Har doim state bilan navigate — hatto shu sahifada turgan bo'lsak ham
                          // state har safar ts bilan yangilanadi va OrdersPage effect'i ishlaydi
                          go('/orders', { state: { focusOrderId: orderId, ts: Date.now() } });
                        }}
                      >
                          <List.Item.Meta
                            title={<span>№ {item.orderId || ''}</span>}
                            description={
                              <span>
                                {(item.orderType === 'delivery' && '🚚 Yetkazish')
                                  || (item.orderType === 'pickup' && '🛍️ Olib ketish')
                                  || (item.orderType === 'dine_in' && '🍽️ Avvaldan buyurtma')
                                  || (item.orderType === 'table' && '🪑 Stol (QR)')
                                  || ''}
                                {(item.customer?.name || item.customerInfo?.name) ? ` • ${item.customer?.name || item.customerInfo?.name}` : ''}
                                {' • '}{(item.total || 0).toLocaleString()} so'm
                              </span>
                            }
                          />
                      </List.Item>
                    )}
                  />
                  {arrivals.length > 0 && (
                    <>
                      <div style={{ padding: '8px 8px 0', color: '#999', fontSize: 12 }}>Keldi (dine-in / stol):</div>
                      <List
                        dataSource={arrivals.slice(0, 10)}
                        renderItem={(a: { orderId: string; orderNumber?: string; tableNumber?: string; customerName?: string; total?: number }) => (
                          <List.Item
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              const id = String(a.orderId || a.orderNumber || '');
                              if (id) {
                                dispatch(clearArrival(id));
                              }
                              setNotifOpen(false);
                              go('/orders', { state: { focusOrderId: id, ts: Date.now() } });
                            }}
                          >
                            <List.Item.Meta
                              title={<span>№ {a.orderNumber || a.orderId}</span>}
                              description={<span>🪑 Stol: {a.tableNumber || '-'} • {a.customerName || 'Mijoz'} • {(a.total || 0).toLocaleString()} so'm</span>}
                            />
                          </List.Item>
                        )}
                      />
                    </>
                  )}
                  <div style={{ textAlign: 'right', padding: '4px 8px' }}>
                    <Button type="link" size="small" onClick={() => go('/orders')}>Barchasini ko\'rish</Button>
                  </div>
                </div>
              )}
            >
              <Badge count={visibleOrders.length + (arrivals?.length || 0)} overflowCount={99} offset={[0, 4]}>
                <Button type="text" icon={<BellOutlined />} />
              </Badge>
            </Dropdown>
            
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                {!isMobile && <span>{user?.firstName || ''} {user?.lastName || ''}</span>}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: '16px 24px',
            padding: '24px',
            background: colorBgContainer,
            borderRadius: 8,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;