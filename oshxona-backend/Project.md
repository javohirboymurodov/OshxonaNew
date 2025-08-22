# OshxonaNew - Oshxona Boshqaruv Tizimi

## 🎯 Loyiha Maqsadi
Oshxona uchun to'liq boshqaruv tizimi: Telegram bot orqali mijozlar buyurtma beradi, admin panel orqali boshqariladi, kuryerlar real-time lokatsiya bilan ishlaydi.

## 🏗️ Arxitektura
- **Monorepo** strukturasi: `oshxona-backend/`, `oshxona-admin/`, `apps/user-webapp/`
- **Backend**: Node.js + Express + MongoDB + Socket.IO + Telegraf
- **Admin Panel**: React + TypeScript + Ant Design + Vite
- **User WebApp**: React + TypeScript + Vite (Telegram WebApp)
- **Deployment**: Render.com (backend), Vercel (frontend)

## 🚀 Asosiy Xususiyatlar

### 1. Telegram Bot (User)
- **Buyurtma turlari**: Yetkazib berish, Olib ketish, Avvaldan buyurtma, QR stol
- **Buyurtma oqimi**: Lokatsiya/filial → Vaqt → Mahsulotlar → Savat → To'lov
- **WebApp integratsiya**: Katalog va savat boshqaruvi
- **Telefon raqam gating**: Faqat telefon ulangandan keyin buyurtma

### 2. Admin Panel
- **Multi-branch**: Filiallar bo'yicha boshqaruv
- **RBAC**: Superadmin, Admin, Courier rollari
- **Real-time**: Socket.IO bilan buyurtmalar va kuryer lokatsiyasi
- **Dashboard**: Statistikalar, grafiklar, filial filtri

### 3. Kuryer Tizimi
- **Live location**: Real-time lokatsiya yangilanishi
- **Buyurtma boshqaruvi**: Qabul qilish, yo'lda, yetkazdim
- **Telegram integratsiya**: Bot orqali boshqaruv

### 4. Promo/Aksiyalar
- **Chegirma turlari**: Foiz yoki summa
- **Vaqt chegarasi**: Boshlash va tugash sanasi
- **Filial bo'yicha**: Barcha filiallarga yoki alohida
- **Avtomatik**: Vaqt o'tganda promo o'chadi

## 📁 Fayl Tuzilmasi

```
OshxonaNew/
├── oshxona-backend/          # Backend + Telegram Bot
│   ├── api/                  # Express API
│   │   ├── routes/           # API marshrutlari
│   │   ├── controllers/      # Business logic
│   │   ├── middleware/       # Auth, validation
│   │   └── server.js         # Express server
│   ├── bot/                  # Telegram bot
│   │   ├── user/             # User handlers
│   │   ├── courier/          # Courier handlers
│   │   └── handlers/         # Common handlers
│   ├── models/               # MongoDB models
│   ├── config/               # Database, Socket
│   └── index.js              # Main entry point
├── oshxona-admin/            # Admin Panel
│   ├── src/
│   │   ├── pages/            # Sahifalar
│   │   ├── components/       # UI komponentlar
│   │   ├── hooks/            # Custom hooks
│   │   └── services/         # API services
│   └── vercel.json           # Vercel config
└── apps/user-webapp/         # User WebApp
    ├── src/
    │   └── webapp/           # Telegram WebApp
    └── vercel.json           # Vercel config
```

## 🔧 Texnik Xususiyatlar

### Backend
- **Database**: MongoDB + Mongoose
- **Real-time**: Socket.IO
- **Bot**: Telegraf framework
- **Auth**: JWT + RBAC
- **File upload**: Local storage
- **CORS**: Dynamic origin support

### Frontend
- **Admin**: React 18 + TypeScript + Ant Design
- **User WebApp**: React + TypeScript + Vite
- **State**: React Query + Context
- **Styling**: CSS Modules + Ant Design
- **Build**: Vite

### Deployment
- **Backend**: Render.com (free tier)
- **Frontend**: Vercel
- **Database**: MongoDB Atlas
- **Cron jobs**: cron-job.org (keep-alive)

## 📊 Ma'lumotlar Modeli

### User
```javascript
{
  role: 'user' | 'admin' | 'superadmin' | 'courier',
  branch: ObjectId,        // Admin uchun majburiy
  telegramId: Number,      // Bot bilan bog'lash
  courierInfo: {           // Courier uchun
    vehicleType: String,
    isOnline: Boolean,
    isAvailable: Boolean
  }
}
```

### Order
```javascript
{
  orderType: 'delivery' | 'pickup' | 'dine_in' | 'table',
  status: 'pending' | 'confirmed' | 'ready' | 'on_delivery' | 'delivered' | 'picked_up' | 'completed',
  branch: ObjectId,
  user: ObjectId,
  items: [OrderItem],
  totalAmount: Number,
  deliveryInfo: {
    address: String,
    location: { latitude, longitude },
    courier: ObjectId
  }
}
```

### Product
```javascript
{
  name: String,
  price: Number,
  category: ObjectId,
  branch: ObjectId,
  isActive: Boolean,        // Global holat
  images: [String]
}
```

### BranchProduct (Inventory)
```javascript
{
  product: ObjectId,
  branch: ObjectId,
  isAvailable: Boolean,     // Filial bo'yicha mavjudlik
  priceOverride: Number,    // Ixtiyoriy narx override
  // Promo maydonlari
  discountType: 'percent' | 'amount',
  discountValue: Number,
  promoStart: Date,
  promoEnd: Date,
  isPromoActive: Boolean
}
```

## 🚀 API Endpoints

### Public (User WebApp)
- `GET /api/public/branches` - Filiallar ro'yxati
- `GET /api/public/categories` - Kategoriyalar
- `GET /api/public/products` - Mahsulotlar (promo bilan)

### Admin
- `GET /api/admin/orders` - Buyurtmalar ro'yxati
- `PATCH /api/admin/orders/:id/status` - Status yangilash
- `PATCH /api/admin/orders/:id/assign-courier` - Kuryer tayinlash
- `GET /api/admin/products` - Mahsulotlar
- `PATCH /api/admin/branches/:branchId/products/:productId/promo` - Promo qo'shish

### Superadmin
- `POST /api/admin/products/:productId/promo-all-branches` - Barcha filiallarga promo
- `GET /api/superadmin/branches` - Filiallar boshqaruvi
- `GET /api/dashboard/stats` - Umumiy statistikalar

## 🔄 Real-time Events (Socket.IO)

### Buyurtmalar
- `new-order` → `branch:<branchId>` xonasiga
- `order-updated` → Buyurtma yangilanishi
- `order-status-updated` → Status o'zgarishi

### Kuryer Lokatsiya
- `courier:location` → `branch:<branchId>` xonasiga
- Payload: `{ courierId, firstName, lastName, location, isOnline, isAvailable }`

## 🎨 UI Komponentlar

### Admin Panel
- **DashboardPage**: Statistikalar, grafiklar, filial filtri
- **OrdersPage**: Buyurtmalar ro'yxati, filtrlar, status yangilash
- **ProductsPage**: Mahsulotlar boshqaruvi, promo modal
- **CouriersPage**: Kuryerlar xaritasi, real-time lokatsiya

### User WebApp
- **App**: Kategoriyalar, mahsulotlar, savat
- **Responsive**: Mobile-first design
- **Telegram**: WebApp integratsiya

## 🚀 Ishga Tushirish

### Local Development
```bash
# Backend
cd oshxona-backend
npm install
npm run dev

# Admin Panel
cd oshxona-admin
npm install
npm run dev

# User WebApp
cd apps/user-webapp
npm install
npm run dev
```

### Environment Variables
```bash
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/oshxona
JWT_SECRET=your_secret
TELEGRAM_BOT_TOKEN=your_bot_token
COURIER_STALE_MS=300000
COURIER_CHECK_INTERVAL_MS=60000

# Admin Panel (.env)
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# User WebApp (.env)
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=Oshxona
```

## 🔧 So'nggi O'zgarishlar (2025-08)

### ✅ Hal qilingan muammolar
1. **Order Status Mapping**: Frontend va backend orasida `completed`, `picked_up`, `on_delivery` statuslari to'g'ri ishlaydi
2. **Promo Tizimi**: Mahsulotlarga chegirma qo'shish, vaqt chegarasi, filial bo'yicha
3. **Monorepo Restructuring**: Backend, admin, user-webapp alohida papkalarga ajratildi
4. **Deployment**: Render.com (backend), Vercel (frontend) uchun tayyorlandi
5. **CORS**: Vercel domenlari uchun CORS sozlandi
6. **Database Ready Check**: API endpointlarda database ulanish tekshiriladi
7. **Webhook**: Telegram webhook to'g'ri ishlaydi

### 🎯 Yangi Xususiyatlar
1. **Promo Modal**: Admin panelda promo boshqaruvi
2. **Status History**: Buyurtma holat o'zgarishlari tarixi
3. **Real-time Updates**: Socket.IO bilan buyurtmalar va kuryer lokatsiyasi
4. **Branch Filtering**: Superadmin uchun filial bo'yicha filtrlash
5. **Telegram WebApp**: User uchun interaktiv katalog

### 🔄 Bot O'zgarishlari
1. **Order Flow**: Buyurtma turlari → Lokatsiya/Filial → Vaqt → Mahsulotlar
2. **Status Logic**: Avtomatik status o'tishlari (picked_up → completed)
3. **User Session**: Telegram ID bilan user ma'lumotlari saqlanadi
4. **Location Handling**: Yandex va Nominatim fallback

## 📋 Keyingi Ishlar

### 🚀 Ustuvor
1. **Promo Testing**: Promo tizimini to'liq test qilish
2. **Order Status**: Barcha status o'tishlarini tekshirish
3. **Real-time**: Socket.IO eventlarini test qilish
4. **Deployment**: Vercel'da admin va user-webapp deploy qilish

### 🔧 Texnik
1. **Error Handling**: Backend xatolarni yaxshilash
2. **Logging**: Comprehensive logging tizimi
3. **Testing**: Unit va integration testlar
4. **Performance**: Database query optimizatsiya

### 🎨 UI/UX
1. **Responsive**: Barcha qurilmalarda to'g'ri ishlash
2. **Loading States**: Skeleton va spinner'lar
3. **Notifications**: Toast va push notification'lar
4. **Accessibility**: Screen reader va keyboard navigation

## 🧪 Test Qilish

### Manual Testing
1. **Telegram Bot**: `/start` → Buyurtma turi → Lokatsiya → Mahsulotlar → Savat
2. **Admin Panel**: Login → Dashboard → Orders → Status yangilash
3. **Promo**: Mahsulot → Promo qo'shish → Vaqt chegarasi
4. **Real-time**: Kuryer lokatsiya, buyurtma yangilanishi

### API Testing
```bash
# Buyurtma holatini yangilash
curl -X PATCH \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}' \
  http://localhost:5000/api/orders/<ORDER_ID>/status

# Promo qo'shish
curl -X PATCH \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"discountType":"percent","discountValue":20,"promoStart":"2025-08-22","promoEnd":"2025-08-25"}' \
  http://localhost:5000/api/admin/branches/<BRANCH_ID>/products/<PRODUCT_ID>/promo
```

## 📞 Yordam

Agar muammo bo'lsa:
1. **Console logs**: Browser va terminal loglarini tekshiring
2. **Network**: API so'rovlarini tekshiring
3. **Database**: MongoDB connection va ma'lumotlarni tekshiring
4. **Environment**: .env fayllarini tekshiring

## 🎉 Natija

OshxonaNew - bu to'liq funksional oshxona boshqaruv tizimi bo'lib, Telegram bot, admin panel va real-time monitoring bilan jihozlangan. Loyiha production deployment uchun tayyor va keyingi rivojlantirish uchun barqaror asosga ega.

