import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, TruckOutlined, CloseCircleOutlined } from '@ant-design/icons';

export interface OrderStatsProps {
  stats: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    delivered: number;
    cancelled: number;
  };
}

const OrdersStats: React.FC<OrderStatsProps> = ({ stats }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic title="Kutilayotgan" value={stats.pending} valueStyle={{ color: '#faad14' }} prefix={<ClockCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic title="Tasdiqlangan" value={stats.confirmed} valueStyle={{ color: '#1890ff' }} prefix={<CheckCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic title="Tayyorlanmoqda" value={stats.preparing} valueStyle={{ color: '#722ed1' }} prefix={<ClockCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic title="Tayyor" value={stats.ready} valueStyle={{ color: '#13c2c2' }} prefix={<CheckCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic title="Yetkazilgan" value={stats.delivered} valueStyle={{ color: '#52c41a' }} prefix={<TruckOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic title="Bekor qilingan" value={stats.cancelled} valueStyle={{ color: '#ff4d4f' }} prefix={<CloseCircleOutlined />} />
        </Card>
      </Col>
    </Row>
  );
};

export default OrdersStats;


