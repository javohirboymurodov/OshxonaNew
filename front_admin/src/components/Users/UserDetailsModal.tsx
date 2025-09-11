import React from 'react';
import { Modal, Card, Row, Col, Avatar, Typography, Space, Tag, Badge, Descriptions, Statistic } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export interface UserDetails {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  telegramId?: number;
  role: string;
  isActive: boolean;
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
  lastSeen?: string;
  loyaltyPoints?: number;
  referrals?: { totalReferrals?: number } | null;
}

interface Props {
  open: boolean;
  user: UserDetails | null;
  onClose: () => void;
  roleText: (role: string) => { text: string; color: string; icon: React.ReactNode };
}

const UserDetailsModal: React.FC<Props> = ({ open, user, onClose, roleText }) => {
  if (!user) return null;
  const roleCfg = roleText(user.role);

  return (
    <Modal title="Foydalanuvchi tafsilotlari" open={open} onCancel={onClose} footer={null} width={600}>
      <Card>
        <Row gutter={16}>
          <Col span={6}>
            <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </Avatar>
          </Col>
          <Col span={18}>
            <Title level={4}>{user.firstName} {user.lastName}</Title>
            <Space>
              {roleCfg.icon}
              <Tag color={roleCfg.color}>{roleCfg.text}</Tag>
              <Badge status={user.isActive ? 'success' : 'default'} text={user.isActive ? 'Faol' : 'Nofaol'} />
              {user.isBlocked && (<Badge status="error" text="Bloklangan" />)}
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="Aloqa ma'lumotlari" style={{ marginTop: 16 }}>
        <Descriptions column={1}>
          {user.email && (<Descriptions.Item label={<><MailOutlined /> Email</>}>{user.email}</Descriptions.Item>)}
          {user.phone && (<Descriptions.Item label={<><PhoneOutlined /> Telefon</>}>{user.phone}</Descriptions.Item>)}
          {user.telegramId && (<Descriptions.Item label="Telegram ID">@{user.telegramId}</Descriptions.Item>)}
        </Descriptions>
      </Card>

      <Card title="Statistika" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}><Statistic title="Jami buyurtmalar" value={user.totalOrders || 0} /></Col>
          <Col span={12}><Statistic title="Jami xarajatlar" value={Number(user.totalSpent || 0)} suffix="so'm" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}><Statistic title="Loyalty balllar" value={Number(user.loyaltyPoints || 0)} /></Col>
          <Col span={12}><Statistic title="Referrallar" value={Number(user.referrals?.totalReferrals || 0)} /></Col>
        </Row>
      </Card>
    </Modal>
  );
};

export default UserDetailsModal;


