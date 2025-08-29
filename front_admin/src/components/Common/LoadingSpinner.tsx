// src/components/Common/LoadingSpinner.tsx
import React from 'react';
import { Spin, SpinProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps extends SpinProps {
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'Yuklanmoqda...', 
  fullScreen = false,
  overlay = false,
  ...props 
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} spin />;

  const spinner = (
    <Spin 
      indicator={antIcon} 
      tip={text}
      {...props}
    />
  );

  if (fullScreen) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: overlay ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
          zIndex: 9999
        }}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div 
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
        minHeight: '200px'
      }}
    >
      {spinner}
    </div>
  );
};

export default LoadingSpinner;