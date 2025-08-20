// Common Page Header Component - Header takrorlanishi uchun
import React from 'react';
import { Typography, Button, Space, Breadcrumb } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: React.ReactNode;
  onAdd?: () => void;
  onRefresh?: () => void;
  addText?: string;
  showAdd?: boolean;
  showRefresh?: boolean;
  loading?: boolean;
  extra?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  onAdd,
  onRefresh,
  addText = "Qo'shish",
  showAdd = true,
  showRefresh = true,
  loading = false,
  extra
}) => {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Breadcrumb */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb style={{ marginBottom: 16 }}>
          {breadcrumbs.map((crumb, index) => (
            <Breadcrumb.Item key={index}>
              {crumb.path ? (
                <a href={crumb.path}>{crumb.label}</a>
              ) : (
                crumb.label
              )}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      )}

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 16
      }}>
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: description ? 8 : 0 }}>
            {title}
          </Title>
          {description && (
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {description}
            </Typography.Text>
          )}
        </div>

        <Space>
          {extra}
          {actions}
          {showRefresh && onRefresh && (
            <Button 
              icon={<ReloadOutlined />} 
              onClick={onRefresh}
              loading={loading}
            >
              Yangilash
            </Button>
          )}
          {showAdd && onAdd && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={onAdd}
            >
              {addText}
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default PageHeader;
