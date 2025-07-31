# 🍽️ Oshxona User Frontend

Next.js bilan yaratilgan user-friendly restoran web sahifasi.

## 🚀 Funksionallar

- Mahsulotlarni ko'rish va filter qilish
- Savatcha boshqaruvi
- Real-time buyurtma kuzatuvi
- Responsive dizayn
- Socket.IO real-time yangilanishlar

## 📦 O'rnatish

```bash
npm create next-app@latest oshxona-frontend --typescript --tailwind --eslint --app
cd oshxona-frontend
npm install socket.io-client axios dayjs antd @ant-design/icons
```

## 🔧 Konfiguratsiya

`.env.local` faylini yarating:

```env
NEXT_PUBLIC_API_URL=https://api.oshxona.uz
NEXT_PUBLIC_SOCKET_URL=https://api.oshxona.uz
NEXT_PUBLIC_APP_NAME=Oshxona
```

## 📁 Struktura

```
src/
├── app/
│   ├── page.tsx              # Asosiy sahifa (mahsulotlar)
│   ├── category/[id]/page.tsx # Kategoriya sahifasi
│   ├── product/[id]/page.tsx  # Mahsulot tafsilotlari
│   ├── cart/page.tsx          # Savatcha
│   ├── orders/page.tsx        # Buyurtmalar tarixi
│   └── track/[id]/page.tsx    # Buyurtma kuzatuvi
├── components/
│   ├── ProductCard.tsx
│   ├── CategoryList.tsx
│   ├── Cart.tsx
│   ├── OrderTracking.tsx
│   └── Layout.tsx
├── hooks/
│   ├── useSocket.ts          # Socket.IO hook
│   ├── useCart.ts            # Savatcha hook
│   └── useOrders.ts          # Buyurtmalar hook
├── services/
│   ├── api.ts                # API calls
│   └── socket.ts             # Socket.IO client
└── types/
    └── index.ts              # TypeScript types
```

## 🌐 Deployment

Vercel'da deploy qilish uchun:

```bash
npm run build
vercel --prod
```

## 📱 Socket.IO Events

### Client'dan server'ga:
- `join-user` - User tracking boshlash
- `track-order` - Buyurtma kuzatuvi

### Server'dan client'ga:
- `status-updated` - Buyurtma holati yangilandi
- `order-status-updated` - Real-time status update
- `courier-location` - Kuryer lokatsiyasi (kelajakda)
