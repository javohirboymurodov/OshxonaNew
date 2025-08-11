import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { TeamOutlined, CheckCircleOutlined, CloseCircleOutlined, UserOutlined, TruckOutlined, CalendarOutlined } from '@ant-design/icons';

export interface UserStatsProps {
  stats: {
    total: number;
    active: number;
    blocked: number;
    admins: number;
    couriers: number;
    newThisMonth: number;
  };
}

const UsersStats: React.FC<UserStatsProps> = ({ stats }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={8} lg={4}>
        <Card><Statistic title="Jami" value={stats.total} valueStyle={{ color: '#1890ff' }} prefix={<TeamOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card><Statistic title="Faol" value={stats.active} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card><Statistic title="Bloklangan" value={stats.blocked} valueStyle={{ color: '#ff4d4f' }} prefix={<CloseCircleOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card><Statistic title="Adminlar" value={stats.admins} valueStyle={{ color: '#722ed1' }} prefix={<UserOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card><Statistic title="Kuryerlar" value={stats.couriers} valueStyle={{ color: '#13c2c2' }} prefix={<TruckOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card><Statistic title="Yangi (oy)" value={stats.newThisMonth} valueStyle={{ color: '#faad14' }} prefix={<CalendarOutlined />} /></Card>
      </Col>
    </Row>
  );
};

export default UsersStats;


