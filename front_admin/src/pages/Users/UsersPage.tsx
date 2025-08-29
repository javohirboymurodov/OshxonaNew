// src/pages/Users/UsersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Card, Row, Col, Typography, Select, DatePicker, message, Input, Drawer } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, ReloadOutlined, CrownOutlined, TeamOutlined, TruckOutlined, UserOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

import UsersStats from '@/components/Users/UsersStats';
import UsersTable, { User as TableUser } from '@/components/Users/UsersTable';
import UserDetailsModal from '@/components/Users/UserDetailsModal';
import UserFormModal from '@/components/Users/UserFormModal';
import apiService from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

type User = TableUser;

interface UserStatsShape {
  total: number;
  active: number;
  blocked: number;
  admins: number;
  couriers: number;
  newThisMonth: number;
}

const defaultStats: UserStatsShape = {
  total: 0,
  active: 0,
  blocked: 0,
  admins: 0,
  couriers: 0,
  newThisMonth: 0,
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const [stats, setStats] = useState<UserStatsShape>(defaultStats);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    dateRange: null as [Dayjs | null, Dayjs | null] | null,
  });

  const roleText = useMemo(
    () => (role: string) => {
      const map: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
        superadmin: { color: 'gold', text: 'Super Admin', icon: <CrownOutlined /> },
        admin: { color: 'red', text: 'Admin', icon: <UserOutlined /> },
        courier: { color: 'blue', text: 'Kuryer', icon: <TruckOutlined /> },
        user: { color: 'green', text: 'Foydalanuvchi', icon: <TeamOutlined /> },
      };
      return map[role] || map.user;
    },
    []
  );

  type UsersListResponse = {
    users?: User[];
    items?: User[];
    pagination?: { total?: number; current?: number; pageSize?: number };
    data?: { users?: User[]; pagination?: { total?: number; current?: number; pageSize?: number } };
  };

  const queryClient = useQueryClient();
  const usersKey = ['users', {
    page: pagination.current,
    pageSize: pagination.pageSize,
    search: filters.search,
    role: filters.role,
    status: filters.status,
    startDate: filters.dateRange?.[0]?.toISOString?.(),
    endDate: filters.dateRange?.[1]?.toISOString?.(),
  }];

  const usersQuery = useQuery({
    queryKey: usersKey,
    queryFn: async () => {
      const payload: UsersListResponse = await apiService.getUsers(pagination.current, pagination.pageSize, {
        search: filters.search || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        ...(filters.dateRange && filters.dateRange[0] && filters.dateRange[1]
          ? {
              startDate: dayjs(filters.dateRange[0]).toDate().toISOString(),
              endDate: dayjs(filters.dateRange[1]).toDate().toISOString(),
            }
          : {}),
      });
      const list: User[] = (payload?.users || payload?.data?.users || payload?.items || []) ?? [];
      const pag = payload?.pagination || payload?.data?.pagination || {};
      setPagination((prev) => ({ ...prev, total: Number(pag?.total || list.length || 0) }));
      return list;
    },
    keepPreviousData: true,
  });

  useEffect(() => {
    setUsers(usersQuery.data || []);
    setLoading(usersQuery.isLoading);
  }, [usersQuery.data, usersQuery.isLoading]);

  type UserStatsApi = { stats?: Partial<UserStatsShape> } | Partial<UserStatsShape> | undefined;

  const statsQuery = useQuery({
    queryKey: ['users-stats'],
    queryFn: async () => {
      const data: UserStatsApi = await apiService.getUserStats();
      const maybeWithStats = (data || {}) as { stats?: Partial<UserStatsShape> };
      const s: Partial<UserStatsShape> = maybeWithStats.stats ?? ((data || {}) as Partial<UserStatsShape>);
      return {
          total: Number(s.total) || 0,
          active: Number(s.active) || 0,
          blocked: Number(s.blocked) || 0,
          admins: Number(s.admins) || 0,
          couriers: Number(s.couriers) || 0,
          newThisMonth: Number(s.newThisMonth) || 0,
      } as UserStatsShape;
    }
  });

  useEffect(() => { if (statsQuery.data) setStats(statsQuery.data); }, [statsQuery.data]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: usersKey });
    queryClient.invalidateQueries({ queryKey: ['users-stats'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const showUserDetails = (user: User) => {
    setSelectedUser(user);
    setDetailsVisible(true);
  };

  const editUser = (user: User) => {
    // Map to form-friendly initial values (ensure branchId is prefilled for admin)
    const mapped: any = {
      ...user,
      role: user.role,
      branchId: (user as any)?.branch?._id || (user as any)?.branch || undefined,
    };
    setSelectedUser(mapped);
    setEditVisible(true);
  };

  const toggleUserBlock = async (user: User) => {
    try {
      if (user.isBlocked) {
        await apiService.unblockUser(user._id);
        message.success('Foydalanuvchi blokdan chiqarildi!');
      } else {
        await apiService.blockUser(user._id);
        message.success('Foydalanuvchi bloklandi!');
      }
      queryClient.invalidateQueries({ queryKey: usersKey });
      queryClient.invalidateQueries({ queryKey: ['users-stats'] });
    } catch (error) {
      console.error('Error toggling user block:', error);
      message.error('Amal bajarilmadi!');
    }
  };

  const handleCreateUser = async (values: Record<string, unknown>) => {
    try {
      await apiService.createUser(values);
        message.success('Foydalanuvchi yaratildi!');
        setCreateVisible(false);
        queryClient.invalidateQueries({ queryKey: usersKey });
        queryClient.invalidateQueries({ queryKey: ['users-stats'] });
    } catch (error) {
      console.error('Error creating user:', error);
      message.error('Foydalanuvchi yaratishda xatolik!');
    }
  };

  const handleUpdateUser = async (values: Record<string, unknown>) => {
    if (!selectedUser) return;
    try {
      await apiService.updateUser(selectedUser._id, values);
        message.success('Foydalanuvchi yangilandi!');
        setEditVisible(false);
        queryClient.invalidateQueries({ queryKey: usersKey });
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
            <Button icon={<FilterOutlined />} onClick={() => setFiltersVisible(true)}>Filtrlar</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>Yangi admin/kuryer</Button>
            <Button icon={<ReloadOutlined />} onClick={() => { queryClient.invalidateQueries({ queryKey: usersKey }); queryClient.invalidateQueries({ queryKey: ['users-stats'] }); }}>Yangilash</Button>
          </Space>
        </Col>
      </Row>

      <UsersStats stats={stats} />

      {/* Quick Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} lg={6}>
            <Search
              placeholder="Ism, email yoki telefon..."
              allowClear
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              enterButton={<SearchOutlined />}
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

      <Card>
        <UsersTable
          data={users}
          loading={loading}
          pagination={pagination}
          onChangePage={(p, ps) => setPagination({ ...pagination, current: p, pageSize: ps })}
          onShowDetails={showUserDetails}
          onEdit={editUser}
          onToggleBlock={toggleUserBlock}
        />
      </Card>

      {/* Details */}
      <UserDetailsModal open={detailsVisible} user={selectedUser} onClose={() => setDetailsVisible(false)} roleText={roleText} />

      {/* Create */}
      <UserFormModal
        open={createVisible}
        isEdit={false}
        onCancel={() => setCreateVisible(false)}
        onSubmit={handleCreateUser}
      />

      {/* Edit */}
      <UserFormModal
        open={editVisible}
        isEdit={true}
        initialValues={selectedUser || undefined}
        onCancel={() => setEditVisible(false)}
        onSubmit={handleUpdateUser}
      />

      {/* Advanced Filters Drawer */}
      <Drawer title="Qo'shimcha filtrlar" placement="right" onClose={() => setFiltersVisible(false)} open={filtersVisible} width={400}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>Ro'yxatdan o'tgan sana:</Typography.Text>
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            />
          </div>

          <Button type="primary" block onClick={() => { setFiltersVisible(false); fetchUsers(1, pagination.pageSize); }}>
            Filtrlarni qo'llash
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default UsersPage;