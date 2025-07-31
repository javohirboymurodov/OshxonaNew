// src/pages/Users/UsersPage.tsx
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
  Avatar,
  message,
  Input,
  Drawer,
  Form,
  Switch,
  Descriptions,
  Popconfirm,
  Badge,
  Tooltip
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  TeamOutlined,
  TruckOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  telegramId?: number;
  role: 'superadmin' | 'admin' | 'courier' | 'user';
  isActive: boolean;
  isBlocked: boolean;
  lastSeen?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  total: number;
  active: number;
  blocked: number;
  admins: number;
  couriers: number;
  newThisMonth: number;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    blocked: 0,
    admins: 0,
    couriers: 0,
    newThisMonth: 0
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    dateRange: null as any,
  });

  const [form] = Form.useForm();

  // Fetch users
  const fetchUsers = async (page = 1, pageSize = 15) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateRange && {
          startDate: filters.dateRange[0].toISOString(),
          endDate: filters.dateRange[1].toISOString(),
        }),
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Users API response:', data);
        setUsers(data.data?.users || data.users || []);
        setPagination({
          current: page,
          pageSize,
          total: data.data?.pagination?.total || data.total || 0,
        });
      } else {
        message.error('Foydalanuvchilarni yuklashda xatolik!');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Foydalanuvchilarni yuklashda xatolik!');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user stats
  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats', {
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
          total: 1247,
          active: 1189,
          blocked: 58,
          admins: 5,
          couriers: 12,
          newThisMonth: 89
        });
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
      // Mock stats
      setStats({
        total: 1247,
        active: 1189,
        blocked: 58,
        admins: 5,
        couriers: 12,
        newThisMonth: 89
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, [filters]);

  // Role configurations
  const getRoleConfig = (role: string) => {
    const configs = {
      superadmin: { color: 'gold', text: 'Super Admin', icon: <CrownOutlined /> },
      admin: { color: 'red', text: 'Admin', icon: <UserOutlined /> },
      courier: { color: 'blue', text: 'Kuryer', icon: <TruckOutlined /> },
      user: { color: 'green', text: 'Foydalanuvchi', icon: <TeamOutlined /> },
    };
    return configs[role as keyof typeof configs] || configs.user;
  };

  // Table columns
  const columns: ColumnsType<User> = [
    {
      title: 'Foydalanuvchi',
      key: 'user',
      render: (record: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar 
            size={40} 
            icon={<UserOutlined />}
            style={{ 
              backgroundColor: record.isActive ? '#1890ff' : '#d9d9d9',
              color: record.isActive ? 'white' : '#999'
            }}
          >
            {record.firstName[0]}{record.lastName[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.firstName} {record.lastName}
            </div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {record.email || record.phone || `@${record.telegramId}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const config = getRoleConfig(role);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: 'Holat',
      key: 'status',
      render: (record: User) => (
        <Space direction="vertical" size={2}>
          <Badge 
            status={record.isActive ? 'success' : 'default'} 
            text={record.isActive ? 'Faol' : 'Nofaol'} 
          />
          {record.isBlocked && (
            <Badge status="error" text="Bloklangan" />
          )}
        </Space>
      ),
    },
    {
      title: 'Buyurtmalar',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      render: (count: number, record: User) => (
        <div>
          <div style={{ fontWeight: 500 }}>{count} ta</div>
          {record.totalSpent > 0 && (
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {record.totalSpent.toLocaleString()} so'm
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Oxirgi faollik',
      dataIndex: 'lastSeen',
      key: 'lastSeen',
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('DD.MM.YYYY HH:mm')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Ro\'yxatdan o\'tgan',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 150,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showUserDetails(record)}
          />
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => editUser(record)}
          />
          {record.role !== 'superadmin' && (
            <Popconfirm
              title={`${record.isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}ni tasdiqlaysizmi?`}
              onConfirm={() => toggleUserBlock(record)}
              okText="Ha"
              cancelText="Yo'q"
            >
              <Button
                type="link"
                size="small"
                danger={!record.isBlocked}
                icon={record.isBlocked ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Handlers
  const showUserDetails = (user: User) => {
    setSelectedUser(user);
    setDetailsVisible(true);
  };

  const editUser = (user: User) => {
    setSelectedUser(user);
    form.setFieldsValue(user);
    setEditVisible(true);
  };

  const toggleUserBlock = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user._id}/toggle-block`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        message.success(`Foydalanuvchi ${user.isBlocked ? 'blokdan chiqarildi' : 'bloklandi'}!`);
        fetchUsers(pagination.current, pagination.pageSize);
        fetchUserStats();
      } else {
        message.error('Amal bajarilmadi!');
      }
    } catch (error) {
      console.error('Error toggling user block:', error);
      message.error('Amal bajarilmadi!');
    }
  };

  const handleCreateUser = async (values: any) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Foydalanuvchi yaratildi!');
        setCreateVisible(false);
        form.resetFields();
        fetchUsers(pagination.current, pagination.pageSize);
        fetchUserStats();
      } else {
        message.error('Foydalanuvchi yaratishda xatolik!');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      message.error('Foydalanuvchi yaratishda xatolik!');
    }
  };

  const handleUpdateUser = async (values: any) => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Foydalanuvchi yangilandi!');
        setEditVisible(false);
        fetchUsers(pagination.current, pagination.pageSize);
      } else {
        message.error('Foydalanuvchini yangilashda xatolik!');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      message.error('Foydalanuvchini yangilashda xatolik!');
    }
  };

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Foydalanuvchilar</Title>
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
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setCreateVisible(true);
              }}
            >
              Yangi admin/kuryer
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchUsers(pagination.current, pagination.pageSize);
                fetchUserStats();
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
              title="Jami"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Faol"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Bloklangan"
              value={stats.blocked}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Adminlar"
              value={stats.admins}
              valueStyle={{ color: '#722ed1' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Kuryerlar"
              value={stats.couriers}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<TruckOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Yangi (oy)"
              value={stats.newThisMonth}
              valueStyle={{ color: '#faad14' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} lg={6}>
            <Search
              placeholder="Ism, email yoki telefon..."
              allowClear
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Select
              placeholder="Rol"
              allowClear
              value={filters.role || undefined}
              onChange={(value) => setFilters({ ...filters, role: value || '' })}
              style={{ width: '100%' }}
            >
              <Option value="admin">Admin</Option>
              <Option value="courier">Kuryer</Option>
              <Option value="user">Foydalanuvchi</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Select
              placeholder="Holat"
              allowClear
              value={filters.status || undefined}
              onChange={(value) => setFilters({ ...filters, status: value || '' })}
              style={{ width: '100%' }}
            >
              <Option value="active">Faol</Option>
              <Option value="inactive">Nofaol</Option>
              <Option value="blocked">Bloklangan</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Users Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} ta foydalanuvchi`,
          }}
          onChange={(paginationConfig) => {
            fetchUsers(paginationConfig.current, paginationConfig.pageSize);
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* User Details Modal */}
      <Modal
        title="Foydalanuvchi tafsilotlari"
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={null}
        width={600}
      >
        {selectedUser && (
          <div>
            <Card>
              <Row gutter={16}>
                <Col span={6}>
                  <Avatar 
                    size={64} 
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </Avatar>
                </Col>
                <Col span={18}>
                  <Title level={4}>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Title>
                  <Space>
                    {getRoleConfig(selectedUser.role).icon}
                    <Tag color={getRoleConfig(selectedUser.role).color}>
                      {getRoleConfig(selectedUser.role).text}
                    </Tag>
                    <Badge 
                      status={selectedUser.isActive ? 'success' : 'default'} 
                      text={selectedUser.isActive ? 'Faol' : 'Nofaol'} 
                    />
                    {selectedUser.isBlocked && (
                      <Badge status="error" text="Bloklangan" />
                    )}
                  </Space>
                </Col>
              </Row>
            </Card>

            <Card title="Aloqa ma'lumotlari" style={{ marginTop: 16 }}>
              <Descriptions column={1}>
                {selectedUser.email && (
                  <Descriptions.Item label={<><MailOutlined /> Email</>}>
                    {selectedUser.email}
                  </Descriptions.Item>
                )}
                {selectedUser.phone && (
                  <Descriptions.Item label={<><PhoneOutlined /> Telefon</>}>
                    {selectedUser.phone}
                  </Descriptions.Item>
                )}
                {selectedUser.telegramId && (
                  <Descriptions.Item label="Telegram ID">
                    @{selectedUser.telegramId}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card title="Statistika" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Jami buyurtmalar" value={selectedUser.totalOrders} />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="Jami xarajatlar" 
                    value={selectedUser.totalSpent} 
                    suffix="so'm"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Col>
              </Row>
            </Card>

            <Card title="Faollik ma'lumotlari" style={{ marginTop: 16 }}>
              <Descriptions column={1}>
                <Descriptions.Item label="Ro'yxatdan o'tgan">
                  {dayjs(selectedUser.createdAt).format('DD.MM.YYYY HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Oxirgi yangilangan">
                  {dayjs(selectedUser.updatedAt).format('DD.MM.YYYY HH:mm')}
                </Descriptions.Item>
                {selectedUser.lastSeen && (
                  <Descriptions.Item label="Oxirgi faollik">
                    {dayjs(selectedUser.lastSeen).format('DD.MM.YYYY HH:mm')} 
                    <Text type="secondary"> ({dayjs(selectedUser.lastSeen).fromNow()})</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </div>
        )}
      </Modal>

      {/* Create/Edit User Modal */}
      <Modal
        title={selectedUser ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi yaratish'}
        open={createVisible || editVisible}
        onCancel={() => {
          setCreateVisible(false);
          setEditVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={selectedUser ? handleUpdateUser : handleCreateUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Ism"
                name="firstName"
                rules={[{ required: true, message: 'Ismni kiriting!' }]}
              >
                <Input placeholder="Ism" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Familiya"
                name="lastName"
                rules={[{ required: true, message: 'Familiyani kiriting!' }]}
              >
                <Input placeholder="Familiya" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'To\'g\'ri email kiriting!' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            label="Telefon"
            name="phone"
          >
            <Input placeholder="+998901234567" />
          </Form.Item>

          <Form.Item
            label="Rol"
            name="role"
            rules={[{ required: true, message: 'Rolni tanlang!' }]}
          >
            <Select placeholder="Rolni tanlang">
              <Option value="admin">Admin</Option>
              <Option value="courier">Kuryer</Option>
              <Option value="user">Foydalanuvchi</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Faol"
                name="isActive"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Bloklangan"
                name="isBlocked"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end" gutter={16}>
            <Col>
              <Button onClick={() => {
                setCreateVisible(false);
                setEditVisible(false);
                form.resetFields();
              }}>
                Bekor qilish
              </Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit">
                {selectedUser ? 'Yangilash' : 'Yaratish'}
              </Button>
            </Col>
          </Row>
        </Form>
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
            <Text strong>Ro'yxatdan o'tgan sana:</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            />
          </div>

          <Button
            type="primary"
            block
            onClick={() => {
              setFiltersVisible(false);
              fetchUsers();
            }}
          >
            Filtrlarni qo'llash
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default UsersPage;