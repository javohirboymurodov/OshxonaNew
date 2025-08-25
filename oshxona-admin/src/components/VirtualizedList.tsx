import React, { useMemo, useState, useEffect } from 'react';
import { List } from 'antd';
import { FixedSizeList as ReactWindowList } from 'react-window';

interface VirtualizedListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  height?: number;
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

/**
 * Virtualized list component for better performance with large datasets
 */
function VirtualizedList<T>({
  data,
  renderItem,
  itemHeight = 80,
  height = 400,
  loading = false,
  pagination
}: VirtualizedListProps<T>) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(data[index], index)}
    </div>
  );

  // Calculate visible items for performance optimization
  const visibleData = useMemo(() => {
    if (data.length < 100) {
      // For small datasets, don't virtualize
      return data;
    }
    
    const start = Math.max(0, visibleRange.start - 5);
    const end = Math.min(data.length, visibleRange.end + 5);
    return data.slice(start, end);
  }, [data, visibleRange]);

  const handleItemsRendered = ({
    visibleStartIndex,
    visibleStopIndex,
  }: {
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    setVisibleRange({
      start: visibleStartIndex,
      end: visibleStopIndex,
    });
  };

  if (data.length < 100) {
    // Use regular Ant Design List for small datasets
    return (
      <List
        loading={loading}
        dataSource={data}
        renderItem={(item, index) => (
          <List.Item>
            {renderItem(item, index)}
          </List.Item>
        )}
        pagination={pagination ? {
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: pagination.onChange,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} / ${total} ta`,
        } : false}
      />
    );
  }

  // Use react-window for large datasets
  return (
    <div>
      <ReactWindowList
        height={height}
        itemCount={data.length}
        itemSize={itemHeight}
        onItemsRendered={handleItemsRendered}
        overscanCount={5}
      >
        {Row}
      </ReactWindowList>
      
      {pagination && (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <List.Item.Meta
            description={`Jami: ${pagination.total} ta`}
          />
        </div>
      )}
    </div>
  );
}

export default VirtualizedList;