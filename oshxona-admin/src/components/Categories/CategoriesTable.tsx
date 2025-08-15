import React from 'react';
import { Table, Switch, Button, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, AppstoreOutlined, ShoppingCartOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Category } from './types';

interface Props {
  loading?: boolean;
  data: Category[];
  onToggleStatus: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onReorder?: (ids: string[]) => void;
  isSuper?: boolean;
}

const CategoriesTable: React.FC<Props> = ({ loading, data, onToggleStatus, onToggleVisibility, onEdit, onDelete, onReorder, isSuper }) => {
  // Optional: simple up/down buttons for reorder
  const columns: ColumnsType<Category> = [
    { title: "Nom (O'zbek)", dataIndex: 'nameUz', key: 'nameUz' },
    { title: 'Nom (Rus)', dataIndex: 'nameRu', key: 'nameRu' },
    { title: 'Nom (Ingliz)', dataIndex: 'nameEn', key: 'nameEn' },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: Category) => (
        <Switch checked={isActive} onChange={() => onToggleStatus(record._id)} checkedChildren="Faol" unCheckedChildren="Nofaol" />
      )
    },
    {
      title: "Ko'rinish",
      dataIndex: 'isVisible',
      key: 'isVisible',
      render: (isVisible: boolean | undefined, record: Category) => (
        <Switch checked={isVisible ?? true} onChange={() => onToggleVisibility(record._id)} checkedChildren="Ochiq" unCheckedChildren="Yashirin" />
      )
    },
    {
      title: 'Tartib',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      sorter: (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
      width: 90
    },
    ...(isSuper ? [{
      title: 'Amallar',
      key: 'actions',
      width: 160,
      render: (_: any, record: Category) => (
        <Space>
          <Tooltip title="Tahrirlash">
            <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} />
          </Tooltip>
          <Tooltip title="O'chirish">
            <Button icon={<DeleteOutlined />} danger size="small" onClick={() => onDelete(record._id)} />
          </Tooltip>
          {onReorder && (
            <>
              <Tooltip title="Yuqoriga">
                <Button size="small" onClick={() => {
                  const idx = data.findIndex(c => c._id === record._id);
                  if (idx > 0) {
                    const arr = [...data];
                    const [item] = arr.splice(idx, 1);
                    arr.splice(idx - 1, 0, item);
                    onReorder(arr.map(c => c._id));
                  }
                }}>↑</Button>
              </Tooltip>
              <Tooltip title="Pastga">
                <Button size="small" onClick={() => {
                  const idx = data.findIndex(c => c._id === record._id);
                  if (idx < data.length - 1) {
                    const arr = [...data];
                    const [item] = arr.splice(idx, 1);
                    arr.splice(idx + 1, 0, item);
                    onReorder(arr.map(c => c._id));
                  }
                }}>↓</Button>
              </Tooltip>
            </>
          )}
        </Space>
      )
    }] : []),
    {
      title: 'Statistika',
      key: 'stats',
      width: 220,
      render: (_, record) => {
        const s = record.stats || record.currentStats || {};
        const itemStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4 };
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
            <Tooltip title="Mahsulotlar">
              <span style={itemStyle}><AppstoreOutlined /> {s.totalProducts ?? 0}</span>
            </Tooltip>
            <Tooltip title="Buyurtmalar">
              <span style={itemStyle}><ShoppingCartOutlined /> {s.totalOrders ?? 0}</span>
            </Tooltip>
            <Tooltip title="Ko'rishlar">
              <span style={itemStyle}><EyeOutlined /> {s.totalViews ?? 0}</span>
            </Tooltip>
          </div>
        );
      }
    }
  ];

  return (
    <Table
      rowKey="_id"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }}
      scroll={{ x: 'max-content' }}
    />
  );
};

export default CategoriesTable;


