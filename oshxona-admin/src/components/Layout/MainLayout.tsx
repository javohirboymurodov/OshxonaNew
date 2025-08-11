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
import { useRealTimeOrders } from '@/hooks/useSocket';
import { useNavigate as useNav } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user } = useAuth();
  const token = localStorage.getItem('token') || '';
  const branchId = (user as any)?.branch?._id || 'default';
  const { newOrders } = useRealTimeOrders(token, branchId);
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

  const visibleOrders = useMemo(() => {
    return newOrders.filter((o: any) => {
      const id = String(o.id || o.orderId || '');
      return id && !dismissedIds.has(id);
    });
  }, [newOrders, dismissedIds]);
  
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
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
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Foydalanuvchilar',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Sozlamalar',
    },
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

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // Logout logic
      localStorage.removeItem('token');
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

      <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 200 }}>
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
                    renderItem={(item: any) => (
                      <List.Item
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const id = String(item.id || item.orderId || '');
                          if (id) {
                            setDismissedIds((prev) => new Set(prev).add(id));
                          }
                          setNotifOpen(false);
                          go('/orders', { state: { focusOrderId: id } });
                        }}
                      >
                        <List.Item.Meta
                          title={<span>№ {item.orderId || item.orderNumber}</span>}
                          description={<span>{item.customer?.name || 'Mijoz'} • {(item.total || 0).toLocaleString()} so'm</span>}
                        />
                      </List.Item>
                    )}
                  />
                  <div style={{ textAlign: 'right', padding: '4px 8px' }}>
                    <Button type="link" size="small" onClick={() => go('/orders')}>Barchasini ko\'rish</Button>
                  </div>
                </div>
              )}
            >
              <Badge count={visibleOrders.length} overflowCount={99} offset={[0, 4]}>
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
            margin: '16px',
            padding: '16px',
            background: colorBgContainer,
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;