import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, Tag, Space, Typography, Select, Alert, Button } from 'antd';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/hooks/useAuth';

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

type BranchMarker = {
  branchId: string;
  name: string;
  address: string;
  coordinates: { latitude: number; longitude: number };
  isActive: boolean;
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

  // const { socket, connected } = useSocket(); // Moved to MainLayout

  const [markers, setMarkers] = useState<Record<string, CourierMarker>>({});
  const [branches, setBranches] = useState<BranchMarker[]>([]);
  const [filter, setFilter] = useState<'all'|'online'|'offline'|'stale'>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔧 YANGI: Kuryer ma'lumotlarini yangilash funksiyasi
  const refreshCouriers = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // 🔧 YANGI: Backend'dan real-time yangilash
      try {
        await apiService.refreshCourierLocations();
      } catch (e) {
        console.warn('Backend refresh failed, falling back to direct API:', e);
      }
      
      // Fallback: to'g'ridan-to'g'ri API dan olish
      const courierData = await apiService.getCouriers();
      const next: Record<string, CourierMarker> = {};
      (courierData?.couriers || courierData || []).forEach((c: any) => {
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
      setMarkers(next);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Error refreshing couriers:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load: fetch current couriers list and branches
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch couriers
        const courierData = await apiService.getCouriers();
        const next: Record<string, CourierMarker> = {};
        (courierData?.couriers || courierData || []).forEach((c: any) => {
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
        if (mounted) {
          setMarkers(next);
          setLastUpdate(new Date());
        }

        // Fetch branches
        const branchData = await apiService.getBranches();
        const list = branchData?.branches || branchData?.items || branchData || [];
        const branchMarkers: BranchMarker[] = list
          .map((b: any) => {
            const coordsSrc = b?.address?.coordinates || b?.coordinates || b?.address?.location || null;
            const lat = Number(coordsSrc?.latitude ?? coordsSrc?.lat);
            const lon = Number(coordsSrc?.longitude ?? coordsSrc?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            const addr = b?.address?.street || b?.address?.text || b?.address?.addressLine || '';
            const city = b?.address?.city || b?.address?.region || '';
            return {
              branchId: String(b._id),
              name: b.name,
              address: [addr, city].filter(Boolean).join(', '),
              coordinates: { latitude: lat, longitude: lon },
              isActive: Boolean(b.isActive)
            } as BranchMarker;
          })
          .filter(Boolean) as BranchMarker[];
        if (mounted) setBranches(branchMarkers);
      } catch (e) {
        console.error('Error fetching data:', e);
      }
    })();
    return () => { mounted = false; };
  }, [branchId]);

  // 🔧 YANGI: Auto-refresh interval (30 soniyada)
  useEffect(() => {
    const interval = setInterval(() => {
      if (connected) {
        refreshCouriers();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshCouriers]); // removed connected dependency

  // Realtime updates via Socket.IO - handled in MainLayout
  // useEffect(() => {
  //   if (!socket || !connected) return;
  //   const onLocation = (payload: CourierMarker) => {
  //     setMarkers(prev => ({
  //       ...prev,
  //       [payload.courierId]: {
  //         ...(prev[payload.courierId] || {}),
  //         ...payload
  //       }
  //     }));
  //     setLastUpdate(new Date());
  //   };
  //   socket.on('courier:location', onLocation);
  //   return () => { socket.off('courier:location', onLocation); };
  // }, [socket, connected]);

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
          <Button 
            size="small" 
            onClick={refreshCouriers} 
            loading={isRefreshing}
            type="primary"
          >
            🔄 Yangilash
          </Button>
          <Tag color="green">Real-time updates</Tag>
        </Space>
      }>
        <div style={{ height: 560, width: '100%' }}>
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {/* Branch markers (tooltip with branch name) */}
            {branches.map((branch) => (
              <Marker 
                key={branch.branchId} 
                position={[branch.coordinates.latitude, branch.coordinates.longitude]}
                icon={new L.Icon({
                  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1046/1046784.png', // Building icon
                  iconSize: [32, 32],
                  iconAnchor: [16, 32],
                  popupAnchor: [0, -32]
                })}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <Text strong>{branch.name}</Text>
                    <div>{branch.address}</div>
                    <Tag color={branch.isActive ? 'green' : 'red'}>
                      {branch.isActive ? 'Faol' : 'Nofaol'}
                    </Tag>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Courier markers */}
            {filtered.map((m) => {
              if (!m.location) return null;
              const fresh = m.updatedAt ? (Date.now() - new Date(m.updatedAt).getTime() <= staleMs) : false;
              const icon = new L.Icon({
                iconUrl: fresh ? 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png' : 'https://cdn-icons-png.flaticon.com/512/3774/3774279.png', // Car icons
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: fresh ? [32, 32] : [28, 28],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
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
        <Alert style={{ marginTop: 12 }} type="info" showIcon message={
          <div>
            <div>Kuryerlar lokatsiyasi avtomatik ravishda real-vaqtda yangilanadi.</div>
            <div>Oxirgi yangilanish: {lastUpdate.toLocaleTimeString()}</div>
            <div>Auto-refresh: 30 soniyada | 5 daqiqa yangilanmasa, Stale sifatida ajratiladi.</div>
          </div>
        } />
      </Card>
    </Space>
  );
};

export default CouriersPage;


