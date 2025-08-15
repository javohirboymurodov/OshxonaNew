import React, { useEffect, useMemo, useState } from 'react';
import { Card, Tag, Space, Typography, Select, Alert } from 'antd';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/hooks/useAuth';
import useSocket from '@/hooks/useSocket';
import { apiService } from '@/services/api';

const { Text } = Typography;

type CourierMarker = {
  courierId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: { latitude: number; longitude: number } | null;
  isOnline?: boolean;
  isAvailable?: boolean;
  isStale?: boolean;
  updatedAt?: string | Date;
};

// Leaflet default icon fix (when using Vite)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const staleMs = 5 * 60 * 1000; // 5 minutes

const CouriersPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = (user as any)?.branch || (user as any)?.branchId || '';
  const token = useMemo(() => localStorage.getItem('token') || '', []);

  const { socket, connected } = useSocket({ token, branchId });

  const [markers, setMarkers] = useState<Record<string, CourierMarker>>({});
  const [filter, setFilter] = useState<'all'|'online'|'offline'|'stale'>('all');

  // Initial load: fetch current couriers list (optional locations)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiService.getCouriers();
        const next: Record<string, CourierMarker> = {};
        (data?.couriers || data || []).forEach((c: any) => {
          const loc = c?.courierInfo?.currentLocation;
          next[String(c._id)] = {
            courierId: String(c._id),
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
            location: loc && loc.latitude && loc.longitude ? { latitude: loc.latitude, longitude: loc.longitude } : null,
            isOnline: Boolean(c?.courierInfo?.isOnline),
            isAvailable: Boolean(c?.courierInfo?.isAvailable),
            updatedAt: loc?.updatedAt
          };
        });
        if (mounted) setMarkers(next);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [branchId]);

  // Realtime updates
  useEffect(() => {
    if (!socket || !connected) return;
    const onLocation = (payload: CourierMarker) => {
      setMarkers(prev => ({
        ...prev,
        [payload.courierId]: {
          ...(prev[payload.courierId] || {}),
          ...payload
        }
      }));
    };
    socket.on('courier:location', onLocation);
    return () => { socket.off('courier:location', onLocation); };
  }, [socket, connected]);

  const filtered = useMemo(() => {
    const list = Object.values(markers);
    const now = Date.now();
    return list.filter((m) => {
      const isStale = m.updatedAt ? now - new Date(m.updatedAt).getTime() > staleMs : true;
      if (filter === 'stale') return isStale;
      if (filter === 'online') return Boolean(m.isOnline) && !isStale;
      if (filter === 'offline') return !m.isOnline;
      return true;
    });
  }, [markers, filter]);

  // Map center: branch center fallback (Tashkent)
  const center: [number, number] = useMemo(() => {
    const coords = (user as any)?.branch?.address?.coordinates;
    if (coords?.latitude && coords?.longitude) return [coords.latitude, coords.longitude];
    return [41.311081, 69.240562];
  }, [user]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Haydovchilar xaritasi" extra={
        <Space>
          <Select
            size="small"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Barchasi' },
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
              { value: 'stale', label: 'Stale (>5 daqiqa)' },
            ]}
            style={{ width: 160 }}
          />
          {connected ? <Tag color="green">Socket ulandi</Tag> : <Tag>Ulanmagan</Tag>}
        </Space>
      }>
        <div style={{ height: 560, width: '100%' }}>
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {filtered.map((m) => {
              if (!m.location) return null;
              const fresh = m.updatedAt ? (Date.now() - new Date(m.updatedAt).getTime() <= staleMs) : false;
              const icon = new L.Icon({
                iconUrl: fresh ? 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png' : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: fresh ? [25, 41] : [25, 41],
                iconAnchor: [12, 41]
              });
              return (
                <Marker key={m.courierId} position={[m.location.latitude, m.location.longitude]} icon={icon}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <Text strong>{(m.firstName || '') + ' ' + (m.lastName || '')}</Text>
                      <div>{m.phone || ''}</div>
                      <div>
                        {m.isOnline ? <Tag color="green">Online</Tag> : <Tag>Offline</Tag>}
                        {m.isAvailable ? <Tag color="blue">Mavjud</Tag> : <Tag color="orange">Band</Tag>}
                        {!fresh && <Tag color="red">Stale</Tag>}
                      </div>
                      <Text type="secondary">Yangilangan: {m.updatedAt ? new Date(m.updatedAt).toLocaleTimeString() : '—'}</Text>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
        <Alert style={{ marginTop: 12 }} type="info" showIcon message="Kuryerlar lokatsiyasi avtomatik ravishda real-vaqtda yangilanadi. 5 daqiqa yangilanmasa, Stale sifatida ajratiladi." />
      </Card>
    </Space>
  );
};

export default CouriersPage;


