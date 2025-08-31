# OshxonaNew - Professional Restaurant Management System

## 🎯 Loyiha Maqsadi
Oshxona uchun to'liq professional boshqaruv tizimi: Telegram bot orqali mijozlar buyurtma beradi, admin panel orqali boshqariladi, kuryerlar real-time lokatsiya bilan ishlaydi.

## 🏗️ Dasturning Qismlari

### 1. **Backend System (Node.js + Express + MongoDB)**
- **API Server**: RESTful API endpoints bilan barcha operatsiyalar
- **Telegram Bot Engine**: User va courier uchun bot interfeysi
- **Database Management**: MongoDB Atlas bilan ma'lumotlar saqlash
- **Real-time Communication**: Socket.IO bilan jonli yangilanishlar
- **Security Layer**: JWT authentication, rate limiting, input validation
- **File Management**: Rasm va hujjatlar yuklash/saqlash
- **Background Services**: Caching, logging, monitoring

### 2. **Admin Panel (React + TypeScript + Redux)**
- **Dashboard Interface**: Statistikalar, grafiklar, real-time metrics
- **Order Management System**: Buyurtmalarni ko'rish, boshqarish, status yangilash
- **Product Management**: Mahsulot CRUD, kategoriya boshqaruvi, promo tizimi
- **User Management**: Foydalanuvchilar, rollar, permissions boshqaruvi
- **Courier Control Panel**: Kuryerlar ro'yxati, lokatsiya tracking, assignment
- **Branch Operations**: Filial ma'lumotlari, settings, inventory
- **Analytics Dashboard**: Hisobotlar, trends, performance metrics
- **Real-time Notifications**: Socket.IO bilan jonli xabarlar

### 3. **User WebApp (Telegram WebApp)**
- **Interactive Catalog**: Mahsulotlar katalogi bilan interaktiv tajriba
- **Smart Shopping Cart**: Savat boshqaruvi, quantity control
- **Order Placement**: To'liq buyurtma berish jarayoni
- **Payment Interface**: To'lov usullari va processing
- **User Profile**: Shaxsiy ma'lumotlar va buyurtmalar tarixi
- **Telegram Integration**: Bot bilan seamless integratsiya

### 4. **Courier Mobile System**
- **Telegram Bot Interface**: Kuryer uchun maxsus bot interfeysi
- **Order Queue**: Buyurtmalar navbati va qabul qilish
- **GPS Tracking**: Real-time lokatsiya ulashish
- **Delivery Management**: Yetkazish jarayoni boshqaruvi
- **Earnings Tracker**: Daromad va statistika ko'rish
- **Shift Management**: Ish vaqti boshqaruvi

## 👥 Rollar va Ularning To'liq Imkoniyatlari

### 🍽️ **User (Mijoz) - Telegram Bot orqali**

#### **Buyurtma Berish Imkoniyatlari:**
- **Delivery (Yetkazib berish)**:
  - GPS lokatsiya yuborish yoki manzil kiritish
  - Eng yaqin filialni avtomatik aniqlash
  - Yetkazish vaqtini tanlash
  - Manzil izohlarini qo'shish
  - Yetkazish narxini ko'rish
- **Pickup (Olib ketish)**:
  - Filial tanlash
  - Tayyorlash vaqtini ko'rish
  - Olib ketish vaqtini belgilash
- **Dine-in (Restoranda ovqatlanish)**:
  - Stol raqamini kiritish
  - Kelish vaqtini belgilash
  - Restoranga kelganini tasdiqlash
- **QR Table (QR kod orqali)**:
  - Stol QR kodini skanerlash
  - Avtomatik stol ma'lumotlari
  - Darhol buyurtma boshlash

#### **Mahsulot va Katalog:**
- **Kategoriyalar ko'rish**: Barcha kategoriyalar ro'yxati
- **Mahsulot qidirish**: Nom bo'yicha qidirish
- **Mahsulot tafsilotlari**: Rasm, tavsif, narx, tarkib
- **Sevimlilar tizimi**: 
  - Mahsulotni sevimlilarga qo'shish/olib tashlash
  - Sevimli mahsulotlar ro'yxati
  - Sevimlilardan tezkor buyurtma
- **Promo ko'rish**: Chegirmalar va aksiyalarni ko'rish

#### **Xarid Savati:**
- **Mahsulot qo'shish**: Savatga qo'shish va miqdor tanlash
- **Miqdor o'zgartirish**: + va - tugmalari bilan
- **Mahsulot olib tashlash**: Savatdan individual olib tashlash
- **Savat tozalash**: Barcha mahsulotlarni olib tashlash
- **Jami summa**: Real-time hisoblash
- **Savat ko'rish**: Tafsilotli savat ro'yxati

#### **To'lov va Yakunlash:**
- **To'lov usullari**: Naqd, karta, online to'lov
- **Buyurtma tasdiqlash**: Final confirmation
- **Kvitansiya olish**: PDF kvitansiya
- **Tracking code**: Buyurtmani kuzatish uchun kod

#### **Buyurtma Kuzatuvi:**
- **Real-time status**: Buyurtma holatini jonli kuzatish
- **Kuryer lokatsiyasi**: Kuryer qayerda ekanini ko'rish
- **Vaqt baholash**: Taxminiy yetkazish vaqti
- **Xabarlar**: SMS va bot orqali bildirishnomalar

#### **Profil va Tarixi:**
- **Shaxsiy ma'lumotlar**: Ism, telefon, manzillar
- **Buyurtmalar tarixi**: Barcha o'tmish buyurtmalar
- **Sevimli manzillar**: Tez-tez ishlatadigan manzillar
- **Loyalty points**: Sadoqat balli tizimi (agar mavjud bo'lsa)

### 👨‍💼 **Admin (Filial Administratori) - Web Panel orqali**

#### **Buyurtmalar Boshqaruvi:**
- **Buyurtmalar ro'yxati**: 
  - Real-time yangilanuvchi ro'yxat
  - Filtr va qidiruv (status, sana, mijoz)
  - Pagination bilan ko'rish
  - Export qilish (Excel, PDF)
- **Buyurtma tafsilotlari**:
  - To'liq buyurtma ma'lumotlari
  - Mijoz kontakt ma'lumotlari
  - Mahsulotlar ro'yxati va narxlar
  - Yetkazish/pickup ma'lumotlari
- **Status boshqaruvi**:
  - Buyurtma holatini o'zgartirish
  - Tayyorlash vaqtini belgilash
  - Mijozga avtomatik xabar yuborish
  - Status tarixi ko'rish
- **Kuryer tayinlash**:
  - Mavjud kuryerlar ro'yxati
  - Avtomatik eng yaqin kuryer tanlash
  - Manual kuryer tayinlash
  - Kuryer performance ko'rish

#### **Mahsulot Boshqaruvi:**
- **Mahsulot CRUD**:
  - Yangi mahsulot qo'shish
  - Mavjud mahsulotlarni tahrirlash
  - Mahsulot o'chirish
  - Mahsulot holatini o'zgartirish (faol/nofaol)
- **Rasm boshqaruvi**:
  - Ko'p rasmli mahsulotlar
  - Rasm yuklash va o'chirish
  - Rasm tartibini o'zgartirish
- **Narx boshqaruvi**:
  - Narxlarni yangilash
  - Bulk narx o'zgartirish
  - Narx tarixi
- **Inventory control**:
  - Mahsulot mavjudligini boshqarish
  - Zaxira miqdori (agar kerak bo'lsa)
  - Low stock alerts

#### **Promo va Aksiyalar:**
- **Chegirma yaratish**:
  - Foiz yoki summa chegirma
  - Vaqt chegarasi belgilash
  - Mahsulot yoki kategoriya bo'yicha
- **Promo boshqaruvi**:
  - Faol promolarni ko'rish
  - Promo to'xtatish/boshlash
  - Promo statistikasi
- **Bulk promo**:
  - Ko'p mahsulotga bir vaqtda promo
  - Kategoriya bo'yicha promo

#### **Kategoriya Boshqaruvi:**
- **Kategoriya CRUD**: Yaratish, tahrirlash, o'chirish
- **Tartib o'zgartirish**: Drag & drop bilan tartib
- **Kategoriya holati**: Faol/nofaol qilish
- **Mahsulotlar soni**: Har kategoriyada nechta mahsulot

#### **Statistika va Analytics:**
- **Kunlik statistika**: Bugungi buyurtmalar, daromad, mijozlar
- **Haftalik/oylik hisobotlar**: Trend tahlili
- **Eng mashhur mahsulotlar**: Top selling items
- **Mijoz analytics**: Yangi vs qaytgan mijozlar
- **Performance metrics**: Average order time, success rate

### 👑 **SuperAdmin (Tizim Administratori) - Kengaytirilgan Imkoniyatlar**

#### **Multi-branch Boshqaruvi:**
- **Filiallar ro'yxati**: Barcha filiallarni ko'rish va boshqarish
- **Filial yaratish/tahrirlash**: Yangi filial qo'shish, mavjudini o'zgartirish
- **Filial statistikasi**: Har bir filial bo'yicha alohida hisobotlar
- **Cross-branch analytics**: Filiallar orasida taqqoslash
- **Global settings**: Barcha filiallarga ta'sir qiluvchi sozlamalar

#### **User va Role Management:**
- **Admin yaratish**: Yangi admin userlar qo'shish
- **Role assignment**: Rollarni tayinlash va o'zgartirish
- **Permission control**: Har bir rol uchun ruxsatlar
- **User activity**: Foydalanuvchi faolligi monitoring
- **Account management**: Account block/unblock, status control

#### **Tizim Boshqaruvi:**
- **Global promo**: Barcha filiallarga promo qo'llash
- **System settings**: Umumiy tizim sozlamalari
- **Database management**: Ma'lumotlar bazasi operatsiyalari
- **Backup control**: Zaxira nusxalash boshqaruvi
- **Performance monitoring**: Tizim performance ko'rish

#### **Advanced Analytics:**
- **Cross-branch reporting**: Barcha filiallar bo'yicha hisobotlar
- **Revenue analytics**: Daromad tahlili va forecasting
- **Customer behavior**: Mijoz xatti-harakatlari tahlili
- **Operational efficiency**: Operatsion samaradorlik metrics
- **Growth tracking**: O'sish ko'rsatkichlari

### 🚚 **Courier (Kuryer) - Telegram Bot orqali**

#### **Buyurtma Operatsiyalari:**
- **Buyurtma qabul qilish**: Yangi buyurtmalarni ko'rish va qabul qilish
- **Buyurtma tafsilotlari**: 
  - Mijoz ma'lumotlari va telefon
  - Yetkazish manzili va izohlar
  - Mahsulotlar ro'yxati
  - To'lov usuli va summa
- **Status yangilash**:
  - "Olib ketdim" - buyurtmani olganimda
  - "Yo'lda" - yetkazish jarayonida
  - "Yetkazdim" - muvaffaqiyatli yetkazganimda
  - "Bekor qildim" - sabab ko'rsatish bilan

#### **Lokatsiya va Navigation:**
- **GPS tracking**: Real-time lokatsiya ulashish
- **Route guidance**: Manzilga yo'l ko'rsatish
- **Distance calculation**: Masofa hisoblash
- **ETA updates**: Taxminiy yetish vaqti

#### **Ish Vaqti Boshqaruvi:**
- **Shift control**: Ish vaqtini boshlash/tugatish
- **Online/Offline**: Mavjudlik holatini o'zgartirish
- **Break management**: Tanaffus vaqtlari
- **Schedule viewing**: Ish jadvali ko'rish

#### **Daromad va Statistika:**
- **Kunlik daromad**: Bugungi daromadni ko'rish
- **Yetkazilgan buyurtmalar**: Muvaffaqiyatli buyurtmalar soni
- **Performance rating**: Mijoz baholari va feedback
- **Monthly earnings**: Oylik daromad hisoboti

## 🛠️ Texnik Imkoniyatlar va Funksiyalar

### 📊 **Database Operations (MongoDB Atlas)**
- **User Management**: 
  - User registration va authentication
  - Profile management va preferences
  - Role-based access control
  - Activity logging va audit trail
- **Order Processing**:
  - Order lifecycle management
  - Status history tracking
  - Payment processing integration
  - Delivery coordination
- **Product Catalog**:
  - Product information management
  - Category hierarchy
  - Inventory tracking
  - Price management va promotions
- **Analytics Data**:
  - Sales metrics calculation
  - Customer behavior analysis
  - Performance tracking
  - Business intelligence data

### 🔄 **Real-time Features (Socket.IO)**
- **Live Order Updates**: 
  - Yangi buyurtma kelganda darhol notification
  - Status o'zgarishi barcha interfeyslarda sinxron
  - Mijozga avtomatik status xabarlari
- **Courier Tracking**:
  - GPS lokatsiya real-time yangilanishi
  - Admin panelda kuryer harakati ko'rish
  - Mijozga kuryer lokatsiyasi ulashish
- **Admin Notifications**:
  - Yangi buyurtma sound notification
  - Critical alerts (payment issues, cancellations)
  - System status updates
- **Multi-device Sync**:
  - Bir qurilmada qilingan o'zgarish boshqalarida ko'rinishi
  - Session management across devices

### 🔐 **Security va Authentication**
- **JWT Token System**:
  - 24 soatlik token expiry
  - Automatic token refresh
  - Secure token storage
  - Token validation va cleanup
- **Role-based Access Control (RBAC)**:
  - User, Admin, SuperAdmin, Courier rollari
  - Permission-based endpoint access
  - Route protection
- **API Security**:
  - Rate limiting (different limits for different roles)
  - Input validation va sanitization
  - CORS protection
  - XSS va injection prevention
- **Data Protection**:
  - Password hashing (bcrypt)
  - Sensitive data encryption
  - Secure file upload
  - Data anonymization

### 📱 **Mobile Optimization**
- **Telegram WebApp Integration**:
  - Native-like experience in Telegram
  - Touch-optimized interface
  - Responsive design
- **Bot Interface Optimization**:
  - Smart keyboard layouts
  - Quick action buttons
  - Context-aware responses
  - Minimal tap navigation
- **Performance Features**:
  - Image optimization
  - Lazy loading
  - Caching strategies
  - Offline capability (basic)

## 🚀 Asosiy Funksional Modullar

### 🛒 **Buyurtma Tizimi (Order Management)**
- **Order Creation Flow**:
  - Multi-step order wizard
  - Validation at each step
  - Order summary va confirmation
  - Payment processing integration
- **Order Processing**:
  - Kitchen notification system
  - Preparation time tracking
  - Quality control checkpoints
  - Customer communication
- **Order Fulfillment**:
  - Courier assignment algorithms
  - Route optimization
  - Delivery tracking
  - Completion confirmation
- **Order Analytics**:
  - Order volume tracking
  - Average order value
  - Completion time metrics
  - Customer satisfaction scores

### 📦 **Mahsulot Boshqaruvi (Product Management)**
- **Product Information System**:
  - Detailed product descriptions
  - Multi-image support
  - Nutritional information
  - Allergen warnings
- **Inventory Management**:
  - Stock level tracking
  - Automatic low-stock alerts
  - Supplier management integration
  - Waste tracking
- **Pricing Engine**:
  - Dynamic pricing support
  - Bulk pricing operations
  - Promotional pricing
  - Currency handling
- **Category Management**:
  - Hierarchical category structure
  - Category-based permissions
  - Seasonal category management
  - Category analytics

### 👥 **Foydalanuvchi Boshqaruvi (User Management)**
- **Registration System**:
  - Telegram-based registration
  - Phone number verification
  - Profile completion wizard
  - Terms acceptance
- **Profile Management**:
  - Personal information updates
  - Delivery address management
  - Payment method storage
  - Communication preferences
- **Customer Support**:
  - In-app messaging
  - Issue reporting
  - FAQ system
  - Feedback collection
- **Loyalty Program** (if implemented):
  - Points accumulation
  - Reward redemption
  - Tier management
  - Special offers

### 🚚 **Yetkazib Berish Tizimi (Delivery System)**
- **Delivery Zone Management**:
  - Geographic zone definition
  - Delivery fee calculation
  - Zone-based courier assignment
  - Coverage area optimization
- **Route Optimization**:
  - Multiple delivery batching
  - Traffic-aware routing
  - Time window management
  - Fuel efficiency optimization
- **Courier Coordination**:
  - Automatic assignment algorithms
  - Manual override capabilities
  - Performance tracking
  - Incentive management
- **Customer Communication**:
  - Delivery notifications
  - ETA updates
  - Delivery confirmation
  - Feedback collection

### 📊 **Analytics va Hisobotlar (Analytics & Reporting)**
- **Sales Analytics**:
  - Revenue tracking va trends
  - Product performance analysis
  - Category sales comparison
  - Seasonal trend analysis
- **Operational Metrics**:
  - Order processing times
  - Delivery performance
  - Customer satisfaction scores
  - Staff productivity metrics
- **Customer Analytics**:
  - Customer acquisition tracking
  - Retention rate analysis
  - Lifetime value calculation
  - Behavior pattern analysis
- **Business Intelligence**:
  - Predictive analytics
  - Demand forecasting
  - Profitability analysis
  - Market trend insights

### 🔧 **Tizim Boshqaruvi (System Administration)**
- **Configuration Management**:
  - System-wide settings
  - Feature toggles
  - Environment configuration
  - Integration settings
- **Monitoring va Alerting**:
  - System health monitoring
  - Performance alerting
  - Error tracking
  - Uptime monitoring
- **Backup va Recovery**:
  - Automated backup systems
  - Data recovery procedures
  - Disaster recovery planning
  - Data integrity checks
- **Security Management**:
  - Access log monitoring
  - Security incident response
  - Compliance reporting
  - Audit trail maintenance

## 🌐 **Integration Imkoniyatlari**

### **Telegram Platform Integration**
- **Bot API**: To'liq Telegram Bot API support
- **WebApp API**: Telegram WebApp integration
- **Payment API**: Telegram Payments (agar kerak bo'lsa)
- **File API**: Media va document sharing

### **External Service Integration**
- **Payment Gateways**: Multiple payment provider support
- **SMS Services**: SMS notification integration
- **Email Services**: Email reporting va notifications
- **Geolocation Services**: Maps va location services
- **Cloud Storage**: File storage va CDN integration

### **Business System Integration**
- **POS Integration**: Point of sale system integration
- **Accounting Software**: Financial system integration
- **CRM Integration**: Customer relationship management
- **Inventory Systems**: Stock management integration

## 📈 **Scalability va Performance**

### **Performance Optimization**
- **Caching Strategies**:
  - User data caching (5 minute TTL)
  - Product catalog caching
  - Query result caching
  - Session caching
- **Database Optimization**:
  - Optimized queries with lean()
  - Proper indexing strategy
  - Connection pooling
  - Query performance monitoring
- **API Optimization**:
  - Response compression
  - Conditional logging
  - Rate limiting optimization
  - Payload optimization

### **Monitoring va Alerting**
- **Health Monitoring**:
  - API endpoint health checks
  - Database connection monitoring
  - Bot response time tracking
  - Error rate monitoring
- **Performance Tracking**:
  - Response time metrics
  - Throughput measurement
  - Resource utilization
  - User experience metrics
- **Business Monitoring**:
  - Order volume tracking
  - Revenue monitoring
  - Customer satisfaction tracking
  - Operational efficiency metrics

## 🔧 Texnik Xususiyatlar

### Backend (Enhanced)
- **Database**: MongoDB Atlas + Mongoose (optimized queries)
- **Real-time**: Socket.IO with room-based updates
- **Bot Framework**: Telegraf with performance optimizations
- **Auth**: JWT + RBAC + Auto-refresh + Fallback mechanism
- **File upload**: Local storage with security validation
- **CORS**: Dynamic origin support for Vercel deployments
- **Performance**: User caching, lean queries, conditional logging
- **Security**: Rate limiting, input validation, XSS protection
- **Testing**: Jest + MongoDB Memory Server + Test helpers

### Frontend (Enhanced)
- **Admin**: React 18 + TypeScript + Ant Design + Redux Toolkit
- **User WebApp**: React + TypeScript + Vite
- **State**: Redux Toolkit + React Query + Socket.io integration
- **Real-time**: Socket.io client with Redux integration
- **Auth**: Auto token refresh + Complete logout + Token validation
- **Styling**: CSS Modules + Ant Design
- **Build**: Vite with optimization
- **Performance**: Lazy loading, optimized API calls

### Deployment (Production Ready)
- **Backend**: Render.com with MongoDB Atlas
- **Frontend**: Vercel with environment-specific configs
- **Database**: MongoDB Atlas with performance indexes
- **Monitoring**: Request logging, error tracking, performance metrics
- **Security**: Rate limiting, CORS, helmet security headers

## 📊 Ma'lumotlar Modeli

### User (Enhanced)
```javascript
{
  role: 'user' | 'admin' | 'superadmin' | 'courier',
  branch: ObjectId,        // Admin uchun majburiy
  telegramId: Number,      // Bot bilan bog'lash
  email: String,           // Admin/SuperAdmin uchun (login)
  password: String,        // Admin/SuperAdmin uchun (hashed)
  firstName: String,       // JWT da ishlatiladi
  lastName: String,        // JWT da ishlatiladi
  phone: String,           // Telefon raqam
  isActive: Boolean,       // Account status
  favorites: [ObjectId],   // Sevimli mahsulotlar
  addresses: [{            // Saqlangan manzillar
    name: String,
    address: String,
    location: { latitude: Number, longitude: Number }
  }],
  courierInfo: {           // Courier uchun
    vehicleType: String,
    isOnline: Boolean,
    isAvailable: Boolean,
    currentLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date
    }
  }
}
```

### Order (Enhanced)
```javascript
{
  orderId: String,         // Unique order identifier
  orderNumber: String,     // Human-readable order number
  orderType: 'delivery' | 'pickup' | 'dine_in' | 'table',
  status: 'pending' | 'confirmed' | 'assigned' | 'preparing' | 'ready' | 'on_delivery' | 'delivered' | 'cancelled',
  branch: ObjectId,
  user: ObjectId,
  items: [{
    product: ObjectId,
    quantity: Number,
    price: Number,
    total: Number,
    notes: String         // Maxsus talablar
  }],
  totalAmount: Number,
  statusHistory: [{
    status: String,
    message: String,
    timestamp: Date,
    updatedBy: ObjectId
  }],
  customerInfo: {
    name: String,
    phone: String
  },
  deliveryInfo: {
    address: String,
    location: { latitude: Number, longitude: Number },
    instructions: String,
    courier: ObjectId,
    estimatedTime: Number,
    deliveryFee: Number
  },
  dineInInfo: {
    tableNumber: String,
    arrivalTime: String,
    customerArrived: Boolean,
    specialRequests: String
  },
  paymentInfo: {
    method: String,
    status: String,
    amount: Number,
    transactionId: String
  }
}
```

### Product
```javascript
{
  name: String,
  description: String,
  price: Number,
  categoryId: ObjectId,
  branch: ObjectId,
  isActive: Boolean,
  isAvailable: Boolean,
  images: [String],
  ingredients: [String],    // Tarkib
  allergens: [String],      // Allergenlar
  nutritionInfo: {          // Ozuqa qiymati
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  preparationTime: Number,  // Tayyorlash vaqti (daqiqa)
  tags: [String]           // Qidiruv uchun teglar
}
```

### Branch (Enhanced)
```javascript
{
  name: String,
  title: String,
  address: {
    street: String,
    city: String,
    district: String,
    fullAddress: String
  },
  phone: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  workingHours: {
    open: String,
    close: String,
    breaks: [{
      start: String,
      end: String
    }]
  },
  deliveryZones: [{
    name: String,
    polygon: [[Number]],    // Coordinate pairs
    deliveryFee: Number,
    minOrder: Number
  }],
  isActive: Boolean,
  settings: {
    acceptsOrders: Boolean,
    maxOrdersPerHour: Number,
    averagePreparationTime: Number
  }
}
```

## 🚀 API Endpoints va Funksiyalar

### Authentication
- `POST /api/auth/login` - Admin/SuperAdmin kirish (email + password)
- `GET /api/auth/me` - Hozirgi foydalanuvchi ma'lumotlari
- `POST /api/auth/refresh` - Token yangilash
- `POST /api/auth/logout` - Tizimdan chiqish

### Public (User WebApp uchun)
- `GET /api/public/branches` - Filiallar ro'yxati
- `GET /api/public/categories` - Kategoriyalar
- `GET /api/public/products` - Mahsulotlar (promo bilan)

### Admin Operations
- `GET /api/admin/orders` - Buyurtmalar ro'yxati (filter, search, pagination)
- `PATCH /api/admin/orders/:id/status` - Buyurtma holatini yangilash
- `PATCH /api/admin/orders/:id/assign-courier` - Kuryer tayinlash
- `GET /api/admin/products` - Mahsulotlar boshqaruvi
- `POST /api/admin/products` - Yangi mahsulot qo'shish
- `PUT /api/admin/products/:id` - Mahsulot yangilash
- `DELETE /api/admin/products/:id` - Mahsulot o'chirish
- `GET /api/admin/categories` - Kategoriyalar boshqaruvi
- `POST /api/admin/categories` - Yangi kategoriya
- `GET /api/admin/users` - Foydalanuvchilar ro'yxati
- `GET /api/admin/dashboard` - Dashboard statistika

### SuperAdmin Operations
- `GET /api/superadmin/branches` - Filiallar boshqaruvi
- `POST /api/superadmin/branches` - Yangi filial yaratish
- `POST /api/superadmin/users` - Yangi admin yaratish
- `GET /api/dashboard/stats` - Global statistikalar
- `POST /api/admin/products/:id/promo-all-branches` - Global promo

### Courier Operations
- `GET /api/couriers` - Kuryerlar ro'yxati
- `POST /api/couriers/location/update` - Lokatsiya yangilash
- `GET /api/couriers/available/for-order` - Mavjud kuryerlar

## 🔄 Real-time Events (Socket.IO)

### Order Events
- `new-order` - Yangi buyurtma kelganda
- `order-updated` - Buyurtma yangilanishi
- `order-status-update` - Status o'zgarishi
- `courier-assigned` - Kuryer tayinlanishi
- `customer-arrived` - Mijoz kelganini tasdiqlash

### Courier Events
- `courier:location` - Kuryer lokatsiya yangilanishi
- `courier:online` - Kuryer online bo'lishi
- `courier:offline` - Kuryer offline bo'lishi

### Admin Events
- `join-admin` - Admin real-time room'ga qo'shilish
- `admin-notification` - Admin uchun xabarlar
- `system-alert` - Tizim ogohlantirishlari

## 🎨 UI Komponentlar va Interfeys

### Admin Panel Components
- **LoginPage**: Email/password bilan kirish
- **DashboardPage**: Statistikalar va grafiklar (SuperAdmin)
- **OrdersPage**: Buyurtmalar boshqaruvi va real-time updates
- **ProductsPage**: Mahsulot CRUD va promo boshqaruvi
- **CategoriesPage**: Kategoriya management
- **CouriersPage**: Kuryer xaritasi va tracking
- **UsersPage**: User management (SuperAdmin)
- **SettingsPage**: Tizim sozlamalari

### User WebApp Components
- **CatalogView**: Mahsulotlar katalogi
- **ProductDetail**: Mahsulot tafsilotlari
- **CartView**: Xarid savati
- **CheckoutFlow**: Buyurtma berish jarayoni
- **OrderTracking**: Buyurtma kuzatuvi

### Bot Interface Elements
- **Main Menu**: Asosiy menyu tugmalari
- **Category Navigation**: Kategoriya navigatsiya
- **Product Cards**: Mahsulot kartalari
- **Cart Summary**: Savat xulosasi
- **Order Confirmation**: Buyurtma tasdiqlash

## 🚀 Ishga Tushirish

### Local Development
```bash
# Backend
cd backend
npm install
npm run dev          # Bot + API server

# Admin Panel
cd front_admin
npm install
npm run dev

# User WebApp
cd userfront
npm install
npm run dev
```

### Environment Variables
```bash
# Backend (.env)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/oshxona
JWT_SECRET=your_super_secret_jwt_key
TELEGRAM_BOT_TOKEN=your_bot_token
PORT=5000

# Admin Panel (.env)
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# User WebApp (.env)
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=Oshxona
```

## 📞 Yordam va Qo'llab-quvvatlash

### Development
1. **API Documentation**: `/api/docs` endpoint orqali
2. **Health Checks**: `/health` va `/api/health` endpoints
3. **Database Status**: `/api/db/status` endpoint
4. **Error Logging**: Console va file logging

### Production Deployment
1. **Backend**: Render.com deployment ready
2. **Frontend**: Vercel deployment configured
3. **Database**: MongoDB Atlas production setup
4. **Monitoring**: Health checks va error tracking

## 🎉 Loyiha Xulosa

OshxonaNew - bu zamonaviy restaurant management platform bo'lib, to'liq funksional ecosystem taqdim etadi. Telegram bot, web admin panel, real-time tracking va comprehensive analytics bilan jihozlangan professional tizim.

**Loyiha production deployment uchun tayyor va professional development standards ga javob beradi.**

---

**Hujjat Versiyasi**: 8.0  
**Oxirgi Yangilanish**: 31 Avgust, 2025  
**Maqsad**: Loyiha imkoniyatlari va funksiyalari  
**Keyingi Ko'rib Chiqish**: 30 Sentabr, 2025