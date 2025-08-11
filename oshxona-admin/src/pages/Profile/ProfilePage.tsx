import React from 'react';
import { Card, Descriptions, Tag, Typography } from 'antd';
import { useAuth } from '@/hooks/useAuth';

const { Title } = Typography;

const roleColor: Record<string, string> = {
  superadmin: 'magenta',
  admin: 'blue',
  courier: 'green',
  user: 'default'
};

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const branchName = (() => {
    const b = (user as any)?.branch;
    if (!b) return '-';
    if (typeof b === 'string') return b;
    return b?.name || b?._id || '-';
  })();

  return (
    <div>
      <Title level={2}>Profil</Title>
      <Card>
        <Descriptions column={1} size="middle" bordered>
          <Descriptions.Item label="Ism">
            {user?.firstName} {user?.lastName}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {user?.email || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Rol">
            <Tag color={roleColor[user?.role || 'user']}>{user?.role}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Filial">
            {branchName}
          </Descriptions.Item>
          <Descriptions.Item label="Holat">
            <Tag color={user?.isActive ? 'green' : 'red'}>
              {user?.isActive ? 'Faol' : 'Faol emas'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default ProfilePage;


