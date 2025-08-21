# 🍽️ Oshxona - Professional Restaurant Ordering System

Professional restaurant ordering Telegram bot with advanced features, admin panel, and user webapp.

## 📁 Project Structure

```
OshxonaNew/
├── oshxona-backend/          # Backend + Telegram Bot (Render.com)
│   ├── api/                  # Express API server
│   ├── bot/                  # Telegram bot handlers
│   ├── config/               # Configuration files
│   ├── models/               # Mongoose models
│   ├── services/             # Business logic services
│   ├── utils/                # Utility functions
│   └── scripts/              # Database scripts
├── oshxona-admin/            # Admin Panel (Vercel)
│   └── src/                  # React + TypeScript admin interface
├── apps/
│   └── user-webapp/          # User WebApp (Vercel)
│       └── src/              # React + TypeScript user interface
└── docs/                     # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- MongoDB
- Telegram Bot Token

### Local Development

1. **Clone repository:**
   ```bash
   git clone <your-repo-url>
   cd OshxonaNew
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd oshxona-backend
   npm install
   
   # Admin Panel
   cd ../oshxona-admin
   npm install
   
   # User WebApp
   cd ../apps/user-webapp
   npm install
   ```

3. **Environment variables:**
   ```bash
   # Copy and configure
   cp env.production.example .env
   ```

4. **Start services:**
   ```bash
   # Backend + Bot
   cd oshxona-backend
   npm run dev:all
   
   # Admin Panel (new terminal)
   cd oshxona-admin
   npm run dev
   
   # User WebApp (new terminal)
   cd apps/user-webapp
   npm run dev
   ```

## 🌐 Deployment

### Backend (Render.com)
- **Repository:** `oshxona-backend/` directory
- **Build Command:** `npm install`
- **Start Command:** `npm run api`
- **Environment Variables:** Set in Render dashboard

### Frontend (Vercel)
- **Admin Panel:** `oshxona-admin/` directory
- **User WebApp:** `apps/user-webapp/` directory
- **Deploy Command:** `vercel --prod`

## 🔧 Available Scripts

### Backend
```bash
cd oshxona-backend
npm run dev          # Development mode
npm run api          # API server only
npm run test         # Run tests
npm run db:seed      # Seed database
```

### Frontend
```bash
# Admin Panel
cd oshxona-admin
npm run dev          # Development
npm run build        # Production build

# User WebApp
cd apps/user-webapp
npm run dev          # Development
npm run build        # Production build
```

## 📱 Features

- **Telegram Bot:** Order management, cart, payments
- **Admin Panel:** Orders, products, users, analytics
- **User WebApp:** Interactive catalog, cart management
- **Real-time Updates:** Socket.IO integration
- **Multi-branch Support:** Branch-specific management
- **Promo System:** Discounts and promotions
- **Payment Integration:** Multiple payment methods

## 🛠️ Technology Stack

- **Backend:** Node.js, Express, Mongoose, Socket.IO
- **Bot Framework:** Telegraf
- **Database:** MongoDB
- **Frontend:** React, TypeScript, Vite
- **UI Components:** Ant Design, Material-UI
- **Deployment:** Render.com (Backend), Vercel (Frontend)

## 📚 Documentation

- [API Documentation](./docs/api-examples.js)
- [Project Overview](./Project.md)
- [Deployment Guide](./deploy.sh)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.