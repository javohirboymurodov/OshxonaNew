# Oshxonabot - Professional Restaurant Management System

## 🚀 QUICK START

### 1. Install Dependencies

```bash
# Main project
npm install

# Admin panel
cd oshxona-admin
npm install

# User frontend
cd ../user-frontend
npm install
```

### 2. Environment Setup

Create `.env` file in the root directory:

```env
# Bot Configuration
BOT_TOKEN=your_bot_token_here
ADMIN_CHAT_ID=your_admin_chat_id

# Database
MONGODB_URI=mongodb://localhost:27017/oshxonabot
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/oshxonabot

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Cloudinary (for image storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key  
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Server Configuration
PORT=5000
API_PORT=5001
ADMIN_PORT=3000
USER_PORT=3001

# Socket.IO
SOCKET_URL=http://localhost:5000

# Cache Configuration
CACHE_TTL=300000
CACHE_CLEANUP_INTERVAL=600000

# Development
NODE_ENV=development
```

### 3. Run Development Servers

```bash
# Run all servers concurrently
npm run dev:full

# Or run individually:
npm run dev        # Bot server (port 5000)
npm run api        # API server (port 5001)  
npm run admin:dev  # Admin panel (port 3000)
npm run user:dev   # User frontend (port 3001)
npm run smoke      # API smoke tests (requires ADMIN_TOKEN, SUPERADMIN_TOKEN)
```

### 4. Access Applications

- **Telegram Bot**: Search for your bot in Telegram
- **Admin Panel**: http://localhost:3000
- **User Frontend**: http://localhost:3001
- **API Documentation**: http://localhost:5001/api-docs

## 🛠 TECHNOLOGY STACK

### Backend
- **Node.js + Express.js** - REST API server
- **Socket.IO 4.7.5** - Real-time communication
- **MongoDB + Mongoose** - Database
- **Cloudinary** - Media storage
- **Memory Cache** - Fast caching system
- **JWT** - Authentication
- **Telegraf** - Telegram Bot framework

### Admin Panel  
- **React 18 + TypeScript** - Frontend framework
- **Antd (Ant Design)** - UI components
- **Socket.IO Client** - Real-time connection
- **Vite** - Build tool

### User Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time features
- **React Query** - State management

## 📋 FEATURES

### ✅ COMPLETED
- 🤖 **Telegram Bot** - Complete user interaction
- 📊 **Admin Panel** - Order management, real-time notifications
- 🛒 **Product Management** - CRUD operations with image upload
- 💳 **Order Processing** - Full order lifecycle management
- ⚡ **Real-time Updates** - Socket.IO integration
- ☁️ **Cloud Storage** - Cloudinary integration
- 🚀 **Performance** - Memory caching system
- 📱 **Mobile Responsive** - All interfaces optimized

### 🔄 IN PROGRESS  
- 🌐 **User Web Interface** - Next.js frontend
- 📈 **Analytics Dashboard** - Advanced reporting (orders by hour, branch segmentation, courier performance, category share)
- 🔔 **Push Notifications** - Web push support

### ⏳ PLANNED
- 📱 **Mobile Apps** - React Native
- 🎯 **Marketing Tools** - Campaign management
- 🔐 **Advanced Security** - 2FA, rate limiting
- 🌍 **Multi-language** - i18n support

## 🏗 PROJECT STRUCTURE

```
oshxonabot1/
├── 📁 api/                 # REST API server
├── 📁 config/             # Configuration files
├── 📁 handlers/           # Telegram bot handlers  
├── 📁 models/             # Database models
├── 📁 services/           # Business logic
├── 📁 oshxona-admin/      # Admin panel (React)
├── 📁 user-frontend/      # User interface (Next.js)
├── 📁 scripts/            # Utility scripts
├── index.js               # Main bot server
└── package.json           # Dependencies
```

## 🐳 DOCKER DEPLOYMENT

```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 OPTIMIZATION & ROADMAP

### ⚡ Real-time Communication
- Socket.IO integration for live order updates  
- Real-time admin notifications
- Live order status tracking
- Instant messaging between users and admins

### ☁️ Cloud Integration
- Cloudinary for image storage and optimization
- Automatic image resizing and compression
- CDN delivery for fast loading
- Secure file uploads with validation

### 🚀 Performance Optimization
- Memory-based caching system (Redis alternative)
- Database query optimization
- Lazy loading and code splitting
- Image optimization and WebP support
- Materialized snapshots for heavy analytics (background jobs)
- Short-term caching (15–60s) for dashboard endpoints

### 🧭 Planned Enhancements
- Introduce Redis for caching dashboard stats and charts
- Add BullMQ for background aggregation jobs
- Courier module improvements (availability map, zones, assignment scoring)

### 🔐 Security Features
- JWT-based authentication
- Rate limiting and DDoS protection
- Input validation and sanitization
- CORS and security headers

## 📄 LICENSE

This project is licensed under the MIT License.

---

**Made with ❤️ by Oshxonabot Team** | **Status**: 🔄 Active Development | **Progress**: 70% Complete