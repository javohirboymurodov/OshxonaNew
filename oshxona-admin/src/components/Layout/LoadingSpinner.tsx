// src/components/LoadingSpinner.tsx
import React from 'react';
import { Spin, Typography } from 'antd';

const { Text } = Typography;

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'default' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'Yuklanmoqda...', 
  size = 'large' 
}) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        gap: 16
      }}
    >
      <Spin size={size} />
      <Text type="secondary">{text}</Text>
    </div>
  );
};

export default LoadingSpinner;