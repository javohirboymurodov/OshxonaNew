import React from 'react';
import { Card, Row, Col, Statistic, Tag, Space } from 'antd';
import { Category } from './types';

interface Props {
  categories: Category[];
}

const CategoryStats: React.FC<Props> = ({ categories }) => {
  const total = categories.length;
  const active = categories.filter(c => c.isActive).length;
  const inactive = total - active;

  return (
    <Card style={{ marginBottom: 16 }}>
      <Space size="small" wrap>
        <Tag color="blue">Jami: {total}</Tag>
        <Tag color="green">Faol: {active}</Tag>
        <Tag color="default">Nofaol: {inactive}</Tag>
      </Space>
    </Card>
  );
};

export default CategoryStats;


