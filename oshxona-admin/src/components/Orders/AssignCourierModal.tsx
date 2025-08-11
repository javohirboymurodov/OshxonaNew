import React, { useEffect, useState } from 'react';
import { Modal, List, Avatar, Button, Typography, Tag } from 'antd';
import apiService from '@/services/api';

const { Text } = Typography;

interface Courier {
  _id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  courierInfo?: {
    isOnline?: boolean;
    isAvailable?: boolean;
    vehicleType?: string;
    rating?: number;
  };
}

interface Props {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
  onAssigned?: () => void;
}

const AssignCourierModal: React.FC<Props> = ({ open, orderId, onClose, onAssigned }) => {
  const [loading, setLoading] = useState(false);
  const [couriers, setCouriers] = useState<Courier[]>([]);

  const loadCouriers = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAvailableCouriersForOrder();
      setCouriers(data?.couriers || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadCouriers();
  }, [open]);

  const assign = async (courierId: string) => {
    if (!orderId) return;
    setLoading(true);
    try {
      await apiService.assignCourier(orderId, courierId);
      onAssigned?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Kuryer tayinlash" open={open} onCancel={onClose} footer={null}>
      <List
        loading={loading}
        dataSource={couriers}
        renderItem={(c) => (
          <List.Item
            actions={[
              <Button key="assign" type="primary" onClick={() => assign(c._id)} disabled={!orderId}>Tayinlash</Button>,
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar>{(c.firstName || 'K')[0]}</Avatar>}
              title={
                <>
                  {c.firstName} {c.lastName}{' '}
                  {c.courierInfo?.isOnline ? <Tag color="green">Online</Tag> : <Tag>Offline</Tag>}
                  {c.courierInfo?.isAvailable ? <Tag color="blue">Mavjud</Tag> : <Tag color="orange">Band</Tag>}
                </>
              }
              description={<Text type="secondary">{c.phone || ''} {c.courierInfo?.vehicleType ? ` • ${c.courierInfo.vehicleType}` : ''}</Text>}
            />
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default AssignCourierModal;


