import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, TruckOutlined, CloseCircleOutlined } from '@ant-design/icons';

export interface OrderStatsProps {
  stats: {
    pending: number;
    confirmed: number;
    ready: number;
    delivered: number;
    cancelled: number;
  };
  onSelectStatus?: (status: string) => void;
}

const OrdersStats: React.FC<OrderStatsProps> = ({ stats, onSelectStatus }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={8} lg={4}>
        <Card hoverable onClick={() => onSelectStatus && onSelectStatus('pending')} style={{ cursor: onSelectStatus ? 'pointer' : undefined }}>
          <Statistic title="Kutilayotgan" value={stats.pending} valueStyle={{ color: '#faad14' }} prefix={<ClockCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card hoverable onClick={() => onSelectStatus && onSelectStatus('confirmed')} style={{ cursor: onSelectStatus ? 'pointer' : undefined }}>
          <Statistic title="Tasdiqlangan" value={stats.confirmed} valueStyle={{ color: '#1890ff' }} prefix={<CheckCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card hoverable onClick={() => onSelectStatus && onSelectStatus('ready')} style={{ cursor: onSelectStatus ? 'pointer' : undefined }}>
          <Statistic title="Tayyor" value={stats.ready} valueStyle={{ color: '#13c2c2' }} prefix={<CheckCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card hoverable onClick={() => onSelectStatus && onSelectStatus('delivered')} style={{ cursor: onSelectStatus ? 'pointer' : undefined }}>
          <Statistic title="Yetkazilgan" value={stats.delivered} valueStyle={{ color: '#52c41a' }} prefix={<TruckOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card hoverable onClick={() => onSelectStatus && onSelectStatus('cancelled')} style={{ cursor: onSelectStatus ? 'pointer' : undefined }}>
          <Statistic title="Bekor qilingan" value={stats.cancelled} valueStyle={{ color: '#ff4d4f' }} prefix={<CloseCircleOutlined />} />
        </Card>
      </Col>
    </Row>
  );
};

export default OrdersStats;


