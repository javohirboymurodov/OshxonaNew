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
    currentLocation?: {
      latitude?: number;
      longitude?: number;
      updatedAt?: string | Date;
    };
  };
}

interface AvailableCouriersResponse {
  couriers: Courier[];
  fallback?: boolean;
}

interface OrderMinimal {
  deliveryInfo?: { courier?: { _id?: string } };
}

interface GetOrderResponse {
  order?: OrderMinimal;
  data?: { order?: OrderMinimal };
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

  const staleMs = 5 * 60 * 1000; // 5 minutes

  const isFresh = (c: Courier): boolean => {
    const ts = c?.courierInfo?.currentLocation?.updatedAt
      ? new Date(c.courierInfo.currentLocation.updatedAt).getTime()
      : 0;
    return ts > 0 && Date.now() - ts <= staleMs;
  };

  const loadCouriers = async () => {
    setLoading(true);
    try {
      const data = (await apiService.getAvailableCouriersForOrder()) as unknown as AvailableCouriersResponse;
      const raw: Courier[] = Array.isArray(data?.couriers) ? data.couriers : [];
      const fallback: boolean = Boolean(data?.fallback);

      const list: Courier[] = fallback ? raw : raw;

      // Enrich with online (fresh) couriers even if isAvailable=false
      try {
        const online = (await apiService.getCouriers('online')) as { couriers?: Courier[] } | Courier[];
        const onlineList: Courier[] = Array.isArray((online as { couriers?: Courier[] }).couriers)
          ? (online as { couriers?: Courier[] }).couriers as Courier[]
          : (online as Courier[]);
        const freshOnline = onlineList.filter((c) => isFresh(c));
        const existingIds = new Set(list.map((c) => c._id));
        freshOnline.forEach((c) => { if (!existingIds.has(c._id)) list.push(c); });
      } catch { /* ignore */ }

      // Keep assigned courier in the list even if filtered elsewhere
      if (assignedCourierId && !list.some((c) => c._id === assignedCourierId)) {
        try {
          const allOnline = (await apiService.getCouriers('online')) as { couriers?: Courier[] } | Courier[];
          const all = Array.isArray((allOnline as { couriers?: Courier[] }).couriers)
            ? (allOnline as { couriers?: Courier[] }).couriers as Courier[]
            : (allOnline as Courier[]);
          const found = all.find((c: Courier) => c._id === assignedCourierId);
          if (found) list.push(found);
        } catch { /* ignore */ }
      }

      // Sort: Available first, then fresh, then online others
      list.sort((a, b) => {
        const aAvail = a.courierInfo?.isAvailable ? 1 : 0;
        const bAvail = b.courierInfo?.isAvailable ? 1 : 0;
        if (aAvail !== bAvail) return bAvail - aAvail;
        const aFresh = isFresh(a) ? 1 : 0;
        const bFresh = isFresh(b) ? 1 : 0;
        if (aFresh !== bFresh) return bFresh - aFresh;
        const aOnline = a.courierInfo?.isOnline ? 1 : 0;
        const bOnline = b.courierInfo?.isOnline ? 1 : 0;
        return bOnline - aOnline;
      });

      setCouriers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadCouriers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    // Try to detect assigned courier from current row selection via global store would be ideal.
    // Lightweight approach: fetch order details to know assigned courier id
    (async () => {
      if (!open || !orderId) return;
      try {
        const data = (await apiService.get(`/admin/orders/${encodeURIComponent(orderId)}`)) as unknown as GetOrderResponse;
        const ord = (data?.order || data?.data?.order) as OrderMinimal | undefined;
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
                  {!isFresh(c) && <Tag color="red">Stale</Tag>}
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


