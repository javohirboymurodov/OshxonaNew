# OshxonaNew - Professional Restaurant Management System

## 🚀 QUICK START

### 1. Install Dependencies

```bash
# Main project
npm install

# Admin panel
cd oshxona-admin
npm install
```

### 2. Environment Setup

Create `.env` in the root directory:

```env
# Core
TELEGRAM_BOT_TOKEN=your_bot_token_here
JWT_SECRET=your_super_secret_jwt_key_here
MONGODB_URI=mongodb://localhost:27017/oshxona

# Server
PORT=5000
SOCKET_CORS_ORIGIN=http://localhost:3000

# Courier live location
COURIER_STALE_MS=300000
COURIER_CHECK_INTERVAL_MS=60000
```

Admin (optional) `.env` in `oshxona-admin/`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run Development Servers

```bash
# Backend + Bot
npm run dev        # http://localhost:5000

# Admin panel
npm run admin:dev  # http://localhost:3000
```

### 4. Access Applications
- Admin Panel: http://localhost:3000
- API: http://localhost:5000/api
- Telegram Bot: open your bot in Telegram

---

## 🛠 TECHNOLOGY STACK

### Backend
- Node.js + Express.js (REST API)
- Socket.IO 4.x (real-time)
- MongoDB + Mongoose
- Telegraf (Telegram bot)
- JWT (authentication)

### Admin Panel
- React 18 + TypeScript
- Ant Design (UI)
- React Query + Socket.IO client
- Vite

### User Frontend (optional)
- Next.js (external repo; not required)

---

## 📋 FEATURES

### ✅ COMPLETED
- 🤖 Telegram Bot (ordering flows)
- 📊 Admin Panel: orders, real-time updates, couriers map + branch markers
- 🛒 Product Management (CRUD)
- 💳 Order lifecycle (assigned → on_delivery → delivered)
- ⚡ Real-time updates (status notifications)

### 🔄 IN PROGRESS
- 📈 Analytics (orders by hour, branch segmentation, courier performance, category share)

### ⏳ PLANNED
- 🔔 Web push notifications
- 📱 Mobile apps

---

## ☁️ DEPLOYMENT

### Render.com (Backend + Bot)
1. Create Web Service from this repo
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Environment Variables:
   - `TELEGRAM_BOT_TOKEN`, `MONGODB_URI`, `JWT_SECRET`
   - `PORT` (use Render provided `$PORT`)
   - `SOCKET_CORS_ORIGIN=https://your-admin.vercel.app`
5. (Optional) Health Check path: `/api/health`

Notes:
- Keep a single Web Service for API + Bot. Admin will be deployed on Vercel.

### Vercel (Admin Panel)
1. Project root: `oshxona-admin/`
2. Env vars:
   - `VITE_API_BASE_URL=https://your-render-service.onrender.com/api`
   - `VITE_SOCKET_URL=https://your-render-service.onrender.com`
3. Build Command: `npm install && npm run build`
4. Output Directory: `dist`

Troubleshooting:
- CORS: set `SOCKET_CORS_ORIGIN` (Render) to your Vercel domain
- Check `TELEGRAM_BOT_TOKEN` and `MONGODB_URI` values

---

## 🧭 ROADMAP (short)
- Branch-scoped analytics and dashboards
- Courier assignment scoring + availability heatmap
- Background jobs (BullMQ) for heavy aggregations

---

## 🔐 SECURITY
- JWT auth, rate limiting, validation, CORS, security headers

## 📄 LICENSE
MIT

## 🚀 Yangi Xususiyatlar

### 📱 User WebApp (Telegram Interactive Catalog)
- **Loyiha**: `apps/user-webapp/` - Telegram WebApp uchun interaktiv katalog
- **Texnologiyalar**: React + Vite + TypeScript
- **Xususiyatlar**:
  - Kategoriyalar bo'yicha filtrlash
  - Filial tanlash
  - Savat boshqaruvi
  - Telegram bot bilan integratsiya
  - `sendData` orqali savat ma'lumotlarini yuborish

### 🎯 Promo/Aksiyalar Tizimi
- **Model**: `BranchProduct` ga promo maydonlari qo'shildi
  - `discountType`: 'percent' | 'amount'
  - `discountValue`: chegirma qiymati
  - `promoStart/promoEnd`: vaqt chegarasi
  - `isPromoActive`: promo holati
- **Admin Panel**: 
  - Har bir mahsulot uchun promo modal
  - Promo filtri va statistikasi
  - Vaqt chegarasi bilan chegirma
- **API**: `PATCH /admin/branches/:branchId/products/:productId/promo`
- **Bot**: WebApp'dan kelgan savat ma'lumotlarini qabul qilish

## 🏗️ Loyiha Tuzilishi

```
OshxonaNew/
├── api/                    # Backend API (Node.js + Express)
├── bot/                    # Telegram bot (Telegraf)
├── oshxona-admin/          # Admin panel (React + Ant Design)
├── apps/
│   └── user-webapp/        # User WebApp (React + Vite)
├── models/                 # MongoDB schemas
├── services/               # Business logic
└── utils/                  # Utility functions
```