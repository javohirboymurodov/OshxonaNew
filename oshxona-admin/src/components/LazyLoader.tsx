import React, { Suspense } from 'react';
import { Spin } from 'antd';

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '200px',
    width: '100%',
    gap: '12px'
  }}>
    <Spin size="large" />
    <div style={{ color: '#666', fontSize: '14px' }}>Yuklanmoqda...</div>
  </div>
);

const LazyLoader: React.FC<LazyLoaderProps> = ({ 
  children, 
  fallback = <DefaultFallback /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

export default LazyLoader;