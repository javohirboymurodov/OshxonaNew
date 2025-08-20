// Common Search and Filter Component - Filter takrorlanishi uchun
import React from 'react';
import { Input, Select, Space, Card, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Option } = Select;

interface FilterOption {
  label: string;
  value: string | number;
}

interface SearchAndFilterProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    key: string;
    label: string;
    value: any;
    options: FilterOption[];
    onChange: (value: any) => void;
    placeholder?: string;
    allowClear?: boolean;
    style?: React.CSSProperties;
  }>;
  extra?: React.ReactNode;
  compact?: boolean;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Qidirish...",
  filters = [],
  extra,
  compact = false
}) => {
  const content = (
    <Row gutter={[16, 16]} align="middle">
      {/* Search Input */}
      {onSearchChange && (
        <Col xs={24} sm={12} md={8} lg={6}>
          <Input
            prefix={<SearchOutlined />}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
          />
        </Col>
      )}

      {/* Filters */}
      {filters.map((filter) => (
        <Col key={filter.key} xs={24} sm={12} md={8} lg={6}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: '#666' }}>{filter.label}:</label>
            <Select
              placeholder={filter.placeholder || `${filter.label} tanlang`}
              value={filter.value}
              onChange={filter.onChange}
              allowClear={filter.allowClear}
              style={{ width: '100%', ...filter.style }}
            >
              {filter.options.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </div>
        </Col>
      ))}

      {/* Extra Content */}
      {extra && (
        <Col xs={24} sm={12} md={8} lg={6}>
          {extra}
        </Col>
      )}
    </Row>
  );

  if (compact) {
    return <div style={{ marginBottom: 16 }}>{content}</div>;
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      {content}
    </Card>
  );
};

export default SearchAndFilter;
