// src/components/Common/SkeletonLoader.tsx
import React from 'react';
import { Skeleton, Card, Space } from 'antd';

interface SkeletonLoaderProps {
  type?: 'table' | 'card' | 'list' | 'stats' | 'form' | 'dashboard';
  rows?: number;
  avatar?: boolean;
  title?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  rows = 3,
  avatar = false,
  title = true,
  loading = true,
  children
}) => {
  if (!loading && children) {
    return <>{children}</>;
  }

  const renderTableSkeleton = () => (
    <div>
      <Skeleton.Input style={{ width: 200, marginBottom: 16 }} active />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={{ marginBottom: 16 }}>
          <Skeleton active paragraph={{ rows: 1 }} />
        </div>
      ))}
    </div>
  );

  const renderCardSkeleton = () => (
    <Card>
      <Skeleton
        avatar={avatar}
        title={title}
        paragraph={{ rows }}
        active
      />
    </Card>
  );

  const renderListSkeleton = () => (
    <div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={{ marginBottom: 16, padding: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}>
          <Skeleton
            avatar={avatar}
            title={title}
            paragraph={{ rows: 1 }}
            active
          />
        </div>
      ))}
    </div>
  );

  const renderStatsSkeleton = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} style={{ textAlign: 'center' }}>
          <Skeleton.Button style={{ width: 60, height: 60, marginBottom: 16 }} active />
          <Skeleton.Input style={{ width: 100, marginBottom: 8 }} active />
          <Skeleton.Input style={{ width: 80 }} active />
        </Card>
      ))}
    </div>
  );

  const renderFormSkeleton = () => (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index}>
            <Skeleton.Input style={{ width: 120, marginBottom: 8 }} active />
            <Skeleton.Input style={{ width: '100%', height: 32 }} active />
          </div>
        ))}
        <Skeleton.Button style={{ width: 100, height: 32 }} active />
      </Space>
    </Card>
  );

  const renderDashboardSkeleton = () => (
    <div>
      {/* Stats cards */}
      <div style={{ marginBottom: 24 }}>
        {renderStatsSkeleton()}
      </div>
      
      {/* Charts section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <Card>
          <Skeleton.Input style={{ width: 200, marginBottom: 16 }} active />
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
        <Card>
          <Skeleton.Input style={{ width: 150, marginBottom: 16 }} active />
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </div>

      {/* Recent activities */}
      <Card>
        <Skeleton.Input style={{ width: 180, marginBottom: 16 }} active />
        {renderListSkeleton()}
      </Card>
    </div>
  );

  switch (type) {
    case 'table':
      return renderTableSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'stats':
      return renderStatsSkeleton();
    case 'form':
      return renderFormSkeleton();
    case 'dashboard':
      return renderDashboardSkeleton();
    default:
      return renderCardSkeleton();
  }
};

export default SkeletonLoader;