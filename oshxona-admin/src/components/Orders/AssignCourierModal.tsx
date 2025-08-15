import React, { useEffect, useState } from 'react';
import { Modal, List, Avatar, Button, Typography, Tag, Tooltip } from 'antd';
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
  const [assignedCourierId, setAssignedCourierId] = useState<string | null>(null);

  const loadCouriers = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAvailableCouriersForOrder();
      const raw: Courier[] = data?.couriers || [];
      // Ko'rinmasin: hozirda boshqa buyurtma bajarayotgan (isAvailable=false) kuryerlar.
      // Lekin ayni buyurtmaga tayinlangan kuryerni ko'rsatishda davom etamiz (highlight uchun).
      setCouriers(
        raw.filter((c) => {
          if (assignedCourierId && c._id === assignedCourierId) return true;
          return Boolean(c?.courierInfo?.isAvailable);
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadCouriers();
  }, [open]);

  useEffect(() => {
    // Try to detect assigned courier from current row selection via global store would be ideal.
    // Lightweight approach: fetch order details to know assigned courier id
    (async () => {
      if (!open || !orderId) return;
      try {
        const data = await apiService.get(`/orders/${encodeURIComponent(orderId)}`) as any;
        const ord = (data?.order || data?.data?.order || {}) as any;
        const cid = ord?.deliveryInfo?.courier?._id || null;
        setAssignedCourierId(cid);
      } catch { setAssignedCourierId(null); }
    })();
  }, [open, orderId]);

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
    <Modal title="Kuryer tayinlash / o'zgartirish" open={open} onCancel={onClose} footer={null}>
      <List
        loading={loading}
        dataSource={couriers}
        renderItem={(c) => (
              <List.Item
            actions={[
                  <Tooltip key="btn" title="Tayinlash yoki o'zgartirish">
                    <Button type="primary" onClick={() => assign(c._id)} disabled={!orderId}>Saqlash</Button>
                  </Tooltip>,
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar style={assignedCourierId === c._id ? { backgroundColor: '#52c41a' } : {}}>{assignedCourierId === c._id ? '✓' : (c.firstName || 'K')[0]}</Avatar>}
              title={
                <>
                  {c.firstName} {c.lastName}{' '}
                  {c.courierInfo?.isOnline ? <Tag color="green">Online</Tag> : <Tag>Offline</Tag>}
                  {c.courierInfo?.isAvailable ? <Tag color="blue">Mavjud</Tag> : <Tag color="orange">Band</Tag>}
                  {assignedCourierId === c._id && <Tag color="green">Tayinlangan</Tag>}
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


