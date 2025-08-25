import React, { Suspense } from 'react';
import { Spin } from 'antd';

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '200px',
    width: '100%'
  }}>
    <Spin size="large" tip="Yuklanmoqda..." />
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