// src/components/Common/EmptyState.tsx
import React from 'react';
import { Empty, Button, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

interface EmptyStateProps {
  title?: string;
  description?: string;
  image?: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
    type?: 'primary' | 'default';
  };
  secondaryAction?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  size?: 'small' | 'default' | 'large';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  image,
  action,
  secondaryAction,
  size = 'default'
}) => {
  const getImageSize = () => {
    switch (size) {
      case 'small':
        return { width: 60, height: 60 };
      case 'large':
        return { width: 120, height: 120 };
      default:
        return { width: 80, height: 80 };
    }
  };

  const renderActions = () => {
    if (!action && !secondaryAction) return null;

    return (
      <Space>
        {action && (
          <Button
            type={action.type || 'primary'}
            icon={action.icon || <PlusOutlined />}
            onClick={action.onClick}
          >
            {action.text}
          </Button>
        )}
        {secondaryAction && (
          <Button
            icon={secondaryAction.icon || <ReloadOutlined />}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.text}
          </Button>
        )}
      </Space>
    );
  };

  return (
    <div style={{ 
      padding: size === 'small' ? '20px' : '40px 20px',
      textAlign: 'center' 
    }}>
      <Empty
        image={image}
        imageStyle={getImageSize()}
        description={
          <div>
            {title && (
              <div style={{ 
                fontSize: size === 'large' ? 18 : 16,
                fontWeight: 500,
                marginBottom: 8,
                color: '#262626'
              }}>
                {title}
              </div>
            )}
            {description && (
              <div style={{ 
                color: '#8c8c8c',
                fontSize: size === 'small' ? 12 : 14
              }}>
                {description}
              </div>
            )}
          </div>
        }
      >
        {renderActions()}
      </Empty>
    </div>
  );
};

// Predefined empty states
export const EmptyStates = {
  NoOrders: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      title="Buyurtmalar topilmadi"
      description="Hali hech qanday buyurtma yo'q yoki filtr shartlariga mos keluvchi buyurtmalar mavjud emas"
      {...props}
    />
  ),

  NoProducts: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      title="Mahsulotlar topilmadi"
      description="Bu kategoriyada mahsulotlar yo'q yoki qidiruv natijasida hech narsa topilmadi"
      action={{
        text: 'Mahsulot qo\'shish',
        onClick: () => {},
        ...props.action
      }}
      {...props}
    />
  ),

  NoCouriers: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      title="Kuryerlar topilmadi"
      description="Hozirda faol kuryerlar yo'q yoki ular offline holatda"
      {...props}
    />
  ),

  NoData: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      title="Ma'lumotlar topilmadi"
      description="So'ralgan ma'lumotlar mavjud emas"
      secondaryAction={{
        text: 'Yangilash',
        onClick: () => window.location.reload(),
        ...props.secondaryAction
      }}
      {...props}
    />
  ),

  NetworkError: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      title="Tarmoq xatosi"
      description="Internet aloqasini tekshiring va qayta urinib ko'ring"
      action={{
        text: 'Qayta urinish',
        onClick: () => window.location.reload(),
        type: 'primary',
        ...props.action
      }}
      {...props}
    />
  ),

  ServerError: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      title="Server xatosi"
      description="Serverda muammo yuz berdi. Keyinroq qayta urinib ko'ring"
      action={{
        text: 'Qayta urinish',
        onClick: () => window.location.reload(),
        ...props.action
      }}
      {...props}
    />
  ),

  AccessDenied: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      title="Kirish rad etildi"
      description="Bu sahifani ko'rish uchun sizda ruxsat yo'q"
      action={{
        text: 'Bosh sahifa',
        onClick: () => window.location.href = '/',
        ...props.action
      }}
      {...props}
    />
  )
};

export default EmptyState;