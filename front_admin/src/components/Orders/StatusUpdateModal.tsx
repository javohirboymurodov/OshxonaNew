import React from 'react';
import { Modal, Typography, Tag, Button } from 'antd';

const { Text } = Typography;

export interface Order { _id: string; status: string }

interface Props {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdate: (status: string) => void;
}

const getStatusConfig = (status: string) => {
  const configs = {
    pending: { color: 'orange', text: 'Kutilmoqda' },
    confirmed: { color: 'blue', text: 'Tasdiqlangan' },
    preparing: { color: 'purple', text: 'Tayyorlanmoqda' },
    ready: { color: 'cyan', text: 'Tayyor' },
    delivered: { color: 'green', text: 'Yetkazilgan' },
    cancelled: { color: 'red', text: 'Bekor qilingan' },
  } as const;
  return (configs as any)[status] || (configs as any).pending;
};

const getNextStatuses = (currentStatus: string) => {
  const statusFlow: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['delivered'],
    delivered: [],
    cancelled: []
  };
  return statusFlow[currentStatus] || [];
};

const StatusUpdateModal: React.FC<Props> = ({ open, order, onClose, onUpdate }) => {
  if (!order) return null;
  const cfg = getStatusConfig(order.status);
  const next = getNextStatuses(order.status);
  return (
    <Modal title="Buyurtma holatini yangilash" open={open} onCancel={onClose} footer={null}>
      <div style={{ marginBottom: 16 }}>
        <Text>Joriy holat: </Text>
        <Tag color={cfg.color}>{cfg.text}</Tag>
      </div>
      <div>
        <Text strong>Yangi holatni tanlang:</Text>
        <div style={{ marginTop: 12 }}>
          {next.map((s) => (
            <Button key={s} type="primary" style={{ marginRight: 8, marginBottom: 8 }} onClick={() => onUpdate(s)}>
              {getStatusConfig(s).text}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default StatusUpdateModal;


