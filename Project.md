### OshxonaNew loyihasi haqida umumiy ma’lumot

Ushbu hujjat loyihaning hozirgi holati bo‘yicha yagona manba: arxitektura, asosiy funksiyalar, papkalar xaritasi, ishga tushirish tartibi, mavjud imkoniyatlar va ustuvor TODO ro‘yxati. Kontekst yo‘qolsa, ushbu faylni o‘qib, loyihaga tezda kirish va xavfsiz davom ettirish mumkin.

## Texnologiyalar to‘plami
- Backend: Node.js, Express, Mongoose (MongoDB), Socket.IO, Telegraf (Telegram bot)
- Admin frontend: React + Vite + TypeScript + Ant Design + @tanstack/react-query (Products sahifasida client-side pagination + inventory prefetch)
- Auth: JWT (Bearer) va rollarga asoslangan kirish nazorati (RBAC)

## Asosiy biznes funksiyalar
- Bir nechta filiallar (multi-branch) qo‘llovi: mahsulotlar, buyurtmalar, yetkazib berish zonalari va adminlar filiallarga bog‘langan
- RBAC rollari: superadmin, admin, courier, user
  - Superadmin: to‘liq boshqaruv, barcha filiallar va sozlamalar
  - Admin: biriktirilgan filial doirasida boshqaruv; Users/Settings sahifalariga kira olmaydi
  - Courier: Telegram orqali tayinlangan buyurtmalarni qabul qiladi va statuslarni yangilaydi
  - User: Telegram bot orqali buyurtma qiladi (Yetkazib berish, Olib ketish, Avvaldan buyurtma, QR orqali stol)
- Buyurtmalar: Socket.IO orqali admin panelda real-vaqt yangilanishlar; to‘liq status oqimi (assigned/on_the_way/delivered/picked_up kabilar bilan)
- Kategoriyalar/Mahsulotlar: CRUD, ko‘rinish (visibility) toggle, drag-and-drop tartiblash (rejalashtirilgan), analitika
- Yetkazib berish logikasi: eng yaqin filialni topish + DeliveryZone poligon tekshiruvi; ETA va to‘lovni hisoblash. Delivery oqimida lokatsiya reply klaviaturasi ko‘rsatiladi va yuborilgach remove_keyboard bilan yopiladi; “Eng yaqin filial” ko‘rsatish oqimidan ajratilgan.
- JSON import: eski ma’lumotlarni yangi sxemaga ko‘chirish skripti (ID mapping va enum normalizatsiya)

## Repozitoriya tuzilmasi (muhim yo‘llar)
- api/
  - routes/
    - admin.js: admin/superadmin endpointlar (dashboard, products, branches, settings)
    - products.js, categories.js, orders.js, dashboard.js, users.js
  - middleware/
    - auth.js: authenticateToken, requireAdmin; RBAC va filial cheklovlari
  - server.js: Express + Socket.IO ishga tushirish (qarang: config/socketConfig.js)
- config/
  - localUploadConfig.js: lokal fayl yuklash/saqlash (Cloudinary olib tashlangan)
- handlers/
  - user/
    - cart.js, catalog.js, order.js: Telegram bot (foydalanuvchi oqimlari). `catalog.js` da filiallar inline keyboard (pagination) va `nearest_branch` oqimi; `order.js` da delivery uchun lokatsiya klaviaturasi va radius tekshiruvi.
  - admin/ (boshlang‘ich rejada): adminga oid bot handlerlar (rejalashtirilgan)
- keyboards/
  - adminKeyboards.js, index.js: Telegram klaviaturalar
- models/
  - User.js, Product.js, Order.js, Category.js, Cart.js, PromoCode.js, Table.js, DeliveryZone.js, Review.js, Branch.js
  - index.js: modellar agregatori
- oshxona-admin/
  - src/
    - App.tsx: QueryClientProvider va AntD App provider bilan router o‘rab olingan
    - router/AppRouter.tsx: marshrutlar + RBAC guardlar
    - pages/
      - Dashboard/DashboardPage.tsx: faqat superadmin; filial filtri va sana oraliqlari, byType pyesa
      - Orders/OrdersPage.tsx: ro‘yxat + tafsilotlar modal + status yangilash + filial filtri
      - Products/index.tsx: filial filtri, React Query, client-side pagination + inventory prefetch (branch bo‘yicha)
      - Categories/CategoriesPage.tsx: React Query; visibility toggle; qidiruv/filtr; tartiblash (rejalashtirilgan)
      - Users/UsersPage.tsx: admin/kuryer/user CRUD (faqat superadmin)
      - Settings/SettingsPage.tsx: ilova/filial sozlamalari (faqat superadmin)
    - components/
      - Orders/OrdersTable.tsx, Orders/OrderDetailsModal.tsx
      - Users/UserFormModal.tsx, Users/UsersStats.tsx, Users/UsersTable.tsx
      - Settings/BranchModal.tsx
    - hooks/
      - useSocket.tsx, useProducts.ts, useCategories.ts
    - services/api.ts: API mijozi
- scripts/
  - import_json.js: eski JSON → yangi Mongo sxema importeri
- services/
  - fileService.js: lokal fayl operatsiyalari
- index.js: Telegram bot kirish nuqtasi (modullashtirish davom etmoqda)

Eslatma: avvalgi Docker fayllari va user-frontend bu tarmoqqa kiritilmagan; lokal rivojlantirish nishon qilingan.

## Backend imkoniyatlari (API asosiylari)
- Autentifikatsiya middleware: `authenticateToken` (JWT) va `requireAdmin`
  - `requireAdmin`: adminlarda filial biriktirilgan bo‘lishi shart; superadmin cheklovdan ozod
- Users (`/api/admin/users`)
  - GET /: paginatsiya + qidiruv; admin — o‘z filiali + barcha oddiy userlar; superadmin — barchasi
  - GET /stats: jami, faol, bloklangan, adminlar, kuryerlar, joriy oyda yangilar; admin uchun filial bo‘yicha
  - POST /: user yaratish (admin uchun majburiy: email/parol/branchId)
  - PUT /:id: userni yangilash; parol kiritilsa serverda xavfsiz xeshlanadi; `branchId` alias qo‘llanadi
  - PATCH /:id/(block|unblock|toggle-status), DELETE /:id
- Products (`/api/admin/products`)
  - GET: superadmin — filial bo‘yicha filtr; admin — avtomatik holda o‘z filialiga skoplangan
  - POST/PUT/DELETE: filial egaligi tekshiriladi; admin faqat o‘z filialidagi mahsulotlarni boshqaradi
- Orders (`/api/orders`)
  - GET /: ro‘yxat; filial filtri; qidiruv; kuryer filtri (assigned/unassigned)
  - GET /stats: status/orderType bo‘yicha sonlar; filialga skoplangan
  - GET /:id: bitta buyurtma; filial guard; `branch` ma’lumoti `name/title/address` bilan populate qilinadi
  - PATCH /:id/status: status o‘tishlari; eski buyurtmalarga branch biriktirish; `assigned` oqimi yangilandi
  - PATCH /:id/assign-courier:
    - Tayinlanganda status avtomatik `on_delivery` ga o‘tadi (delivery oqimi)
    - Xuddi o‘sha kuryerni qayta tayinlash bloklanadi (409). Boshqa kuryerga o‘zgartirish mumkin
    - Kuryerga Telegram xabar (inline tugmalar) + Yandex link
    - Foydalanuvchiga ham “buyurtmangiz yo‘lda” xabari yuboriladi (kuryer FIO, telefon, ETA)
- Branches
  - Superadmin: `/api/superadmin/branches` to‘liq CRUD
  - Admin: `/api/admin/branches` — faqat o‘z filial(lar)i
- Dashboard
  - `/api/dashboard/stats?dateFrom=...&dateTo=...&branch=...` (range + filial; admin — avtomatik skop)
  - `byStatus` bilan birga `byType`, `byHour`, `byBranch`, `categoryShare`, `courierPerformance` ham qaytaradi
  - `/api/dashboard/chart-data?startDate=...&endDate=...&type=revenue&branch=...`

## Ma’lumotlar modeli (highlight)
- User
  - role: user | admin | superadmin | courier
  - parol: pre-save hook orqali xeshlanadi; API orqali yangilashda ham xeshlanadi
  - branch: admin uchun majburiy
  - courierInfo: vehicleType, online/available holat
- Order
  - branch: Branch ga ref
  - orderType: delivery | pickup | dine_in (avvaldan) | table (QR)
  - status: pending → confirmed → prepared → ready → assigned → on_the_way → delivered → completed (pickup: picked_up; ~10s dan keyin auto-complete)
  - dineInInfo: `table` uchun stol raqami
- Product/Category
  - product.branch: Branch ga ref
  - category: visibility toggle; drag-drop tartib indeksi (rejalashtirilgan)
- DeliveryZone
  - filialga bog‘langan poligonlar; eng yaqin filialga fallbackdan avval tekshiriladi

## Real-time (Socket.IO)
- emitNewOrder: endi faqat tegishli `branch:<id>` xonasiga yuboriladi (default broadcast o‘chirildi)
- Frontend: admin panel faqat o‘z filialining xonasiga ulanadi; superadmin uchun umumiy notification yo‘q
- Popover: yangi buyurtmada turi ham ko‘rinadi (🚚 Yetkazish / 🛍️ Olib ketish / 🍽️ Avvaldan / 🪑 Stol QR)
- emitOrderUpdate: status o‘zgarishlarida; admin panel UIni yangilash uchun

### Socket eventlar (courier live location)
- Event: `courier:location`
  - Xona: `branch:<branchId>`
  - Payload:
    {
      "courierId": "<ObjectId>",
      "firstName": "Ali",
      "lastName": "Valiyev",
      "phone": "+99890...",
      "branchId": "<ObjectId>",
      "location": { "latitude": 41.31, "longitude": 69.24 },
      "isOnline": true,
      "isAvailable": true,
      "isStale": false,
      "updatedAt": "2025-08-15T12:34:56.000Z"
    }
  - Server: `SocketManager.emitCourierLocationToBranch(branchId, payload)` jo‘natadi
  - Frontend: `useSocket` orqali `join-admin` va `socket.on('courier:location', ...)` bilan tinglanadi

## Telegram bot (Telegraf)
- Kirish: `index.js`
- User oqimlari (`handlers/user/...`)
  - boshlang‘ich menyu, kategoriyalar/mahsulotlar, savat, miqdorlarni o‘zgartirish, yakuniy tasdiqlash
  - turlar: yetkazib berish (lokatsiya → zona yoki eng yaqin filial), olib ketish (filial tanlash → vaqt), avvaldan (filial → kelish vaqti), QR (stol raqami → telefon/to‘lov)
  - adminlar filial bo‘yicha ogohlantiriladi; superadmin — hammasi; pickup — "🛍️ Olib ketdi" tez tugma; table — stol raqami bilan
- Kuryer modul (modullashtirilgan): `bot/courier/`
  - Onboarding: superadmin kiritgan telefon raqami bilan /courier → telefon yuborish → `telegramId` bog‘lash
  - Panel: Online/Offline, Mavjud/Band, Faol buyurtmalar, Daromad (bugun/jami)
  - Profil: Reyting (faqat umumiy), bugungi/jami buyurtmalar soni, oxirgi 10 buyurtma
  - Status tugmalari: Yo‘ldaman → `on_delivery`, Yetkazdim → `delivered`
  - “Qabul qilaman” bosilganda xabar o‘chirib yuborilmaydi: buyurtma raqami, mijoz FIO/telefon va xarita linki saqlanadi; tugmalar “Yo‘ldaman” va “Yetkazdim”ga almashtiriladi
  - “Yo‘ldaman” bosilganda faqat “Yetkazdim” tugmasi qoladi; yuqoridagi ma’lumotlar (FIO/telefon/xarita) doim ko‘rinib turadi
  - `/start` bosilganda foydalanuvchi roli `courier` bo‘lsa avtomatik kuryer paneli ochiladi
- Klaviaturalar: `keyboards/` ostida umumiy/admin klaviaturalar

## Admin panel (React)
- Global providerlar: QueryClientProvider + AntD App (message context ogohlantirishini bartaraf etish)
- Umumiy naqshlar
  - Barcha ma’lumotlar uchun React Query; mutatsiyadan so‘ng invalidate
  - Superadmin uchun filial filtr(lar)i: Dashboard/Orders/Products (kengaytiriladi: Kategoriyalar uchun ham)
  - RBAC marshrut guardlari: Users/Settings — non-superadmin uchun yashirin; Dashboard — faqat superadmin
  - AntD Table: barqaror `rowKey` (ID), index ishlatilmaydi
  - OrderDetailsModal: `message.useMessage()`; tugmalar `Space` bilan o‘ralgan (overflow yo‘q)
- Sahifalar
  - Dashboard (faqat superadmin): statistikalar; pie chart label turi `spider`; sana oraliqlari + filial filtri; buyurtma turlari `byType`
  - Orders: filtrlar, modal tafsilotlar, status o‘tishlari, kuryer tayinlash
  - Products: filial filtri, create/edit, client-side pagination; Inventar ustuni (isAvailable/stock/dailyLimit)
  - Categories: visibility toggle, qidiruv/filtr; drag-drop va analitika (o‘rtacha narx, jami savdo) rejalashtirilgan
    - Admin: CRUD cheklangan (faqat status/ko‘rinish), Statistika va Amallar ustunlari yashirilgan
    - Superadmin: CRUD + filial bo‘yicha filtrlangan statistika (buyurtmalar, ko‘rishlar)
  - Users: create/edit; Admin yaratishda Email/Parol/Branch majburiy; tahrirda parol ixtiyoriy
  - Settings: filial koordinatalari, yetkazish radiusi ko‘rsatmalari
  - Couriers: `pages/Couriers/CouriersPage.tsx` — Leaflet xarita, real-time markerlar; Filtrlar: Barchasi/Online/Offline/Stale; marker popup’larda FIO/telefon/teglar

## O‘rnatish va ishga tushirish
Talablar: Node.js 18+, MongoDB, Telegram bot tokeni

Muhit o‘zgaruvchilari (backend)
- MONGODB_URI: Mongo ulanish satri
- JWT_SECRET: JWT imzolash siri
- TELEGRAM_BOT_TOKEN: Telegraf bot tokeni
- Ixtiyoriy: SERVER_URL yoki PORT, SOCKET_CORS_ORIGIN va h.k.
 - COURIER_STALE_MS: kuryer lokatsiyasi eskirish chegarasi (ms, default 300000 — 5 daqiqa)
 - COURIER_CHECK_INTERVAL_MS: tekshiruv intervali (ms, default 60000 — 1 daqiqa)

Backendni ishga tushirish
1) npm install
2) Yuqoridagi env qiymatlarni o‘rnating (masalan, `.env` – repoda saqlanmaydi)
3) npm run dev

Admin frontendni ishga tushirish
1) cd oshxona-admin
2) npm install
3) Ixtiyoriy: `.env` yarating: `VITE_API_BASE_URL=http://localhost:5000/api`
4) npm run dev

JSON import
- JSON dump fayllarini `scripts/import_json.js` kutayotgan joyga qo‘ying (kerak bo‘lsa yo‘llarni o‘zgartiring)
- Ishga tushirish: `node scripts/import_json.js`
- Skript eski IDlarni yangilariga moslaydi, enumlarni normallashtiradi (orderType/status), va branch/product/category/table/order/cart/review bog‘lanishlarini to‘g‘ri o‘rnatadi

## Qo‘lda sinov (manual)
- Olib ketish: bot → Olib ketish → filial → kelish vaqti → to‘lov → buyurtma yaratiladi; admin ready → picked_up; ~10 soniyada auto-complete
- Yetkazib berish: bot → lokatsiya → DeliveryZone ichida bo‘lsa shu filial, aks holda radiusdagi eng yaqin filial → to‘lov/vaqt → buyurtma → kuryer tayinlash
- QR (stol): bot → QR → stol raqami → menyuni chetlab → telefon/to‘lov → buyurtma; admin ogohlantirishida stol raqami ko‘rinadi
- Admin panel: superadmin uchun filial filtrlari (Dashboard/Orders/Products); admin uchun Users/Settings yashirin
 - Kuryer live location: kuryer → “✅ Ishni boshlash” → Telegram’da live location ulashish → `/couriers` sahifasida marker real-time ko‘rinadi; 5 daqiqada yangilanmasa Stale; “🛑 Ishni tugatish” bilan offline

## Ma’lum muammolar va TODO (ustuvor)
1) Botni modullashtirish
   - `index.js` → `bot/user.js`, `bot/profile.js`, `bot/courier.js`, `bot/admin.js`; `index.js` dan ulash
   - admin/kuryer handlerlarini `handlers/user` dan alohida modullarga ko‘chirish; action regexlarini moslashtirish
2) Kategoriyalar va analitika
   - Drag-and-drop tartiblashni doimiy `orderIndex` bilan saqlash
   - Analitika: kategoriya bo‘yicha jami savdo, ko‘rishlar, mashhurlik
   - Qaror: Statistika asosan Dashboard’da konsolidatsiya qilinadi; Kategoriyalar sahifasida faqat superadmin uchun filial filtri bilan ko‘rsatish (admin uchun yashirish)
3) Tezkor buyurtma (quick order)
   - “Mashhur” (so‘nggi N kunda buyurtma soni) va “Tez tayyorlanadigan” (past `prepTime`) mezonlari; endpointlar va UI
4) React 19 mosligi
   - AntD ogohlantirishlarini bartaraf etish; `App` provider qo‘llanilishi; kutubxonalarni yangilash yoki React 18ga pinlash
5) Xodimlar uchun autentifikatsiya
   - Admin/kuryer telefon orqali login (ixtiyoriy) yoki admin uchun email/parolni saqlash; `/auth` yo‘llarini va siyosatlarni moslashtirish
6) Bildirishnomalar
   - Socket.IO namespace/xonalarini tekshirish; barcha tegishli adminlarga yetib borishini ta’minlash; reconnectlarni boshqarish
7) Ma’lumotlar izchilligi
   - Kategoriya bo‘yicha mahsulotlar soni/ko‘rishlar backend agregatsiya + frontend ko‘rsatishda aniq bo‘lishi
8) Docker (ixtiyoriy)
   - Dockerfile va docker-compose ni qayta kiritish; env templating; zaxira nusxalar

## Yangi qarorlar va reja (2025-08)

- Per-filial mavjudlik (inventory) modeli joriy qilindi: `BranchProduct` (isAvailable, stock, dailyLimit, soldToday, priceOverride)
- Admin vakolatlari:
  - Mahsulot: faqat Holat (active) va Inventar (isAvailable/stock/dailyLimit/priceOverride) boshqaradi
  - Kategoriya: CRUD faqat superadmin. Admin uchun status/ko‘rinish almashtirishga ruxsat (zarurat bo‘lsa to‘liq yashirish mumkin)
- Kategoriya statistikasi:
  - Asosiy analitika Dashboard’da konsolidatsiya qilinadi (filial filtrli)
  - Kategoriyalar sahifasida statistikani faqat superadmin uchun (filial filtri bilan) ko‘rsatish, admin uchun yashirish
- Dashboard: faqat superadminlar uchun; adminlar uchun asosiy ish sahifasi — Orders

### So‘nggi o‘zgarishlar (2025-08)
- Notifikatsiya oqimi qat’iy filialga bog‘landi: `branch:default` broadcast olib tashlandi
- Admin popoverida buyurtma turi ko‘rsatiladi (emoji bilan)
- Telegram xabarlari: faqat buyurtmaning shu filiali adminlariga yuboriladi (superadminga yuborilmaydi)
- `pdfService.generateTableQrPdf` joriy qilindi va `tables.js` undan foydalanadi (temp faylsiz stream)
- Mahsulot rasmlarini boshqarish `fileService` orqali: `products.js` update/delete o‘zgarishlari
- Orders API controllerlarga ajratildi: `api/controllers/ordersController.js`; `api/routes/orders.js` soddalashtirildi
- Bot: adminlarga bildirish modulga ko‘chirildi `handlers/user/order/notify.js`

### Dashboard kengaytmalari (2025-08)
- Backend:
  - `dashboardController.stats`: soat kesimi (`orders.byHour`), filial segmentatsiyasi (`byBranch`), kuryer performance (`courierPerformance`: avg/median/min/max), kategoriya ulushi (`categoryShare`)
  - Kuryer analytics: `GET /api/couriers/heatmap`, `GET /api/couriers/zones`, `GET /api/couriers/suggest/:id` (assignment scoring)
- Frontend:
  - Dashboard sahifasi: filial Daromad/Buyurtma toggle, Kategoriya Daromad/Soni toggle, Kuryer jadvali (avg/median/min/max), Soat bo‘yicha column chart

### Orders (Admin panel) yangilanishlari (2025-08)
- Tayinlangan kuryer ro‘yxatda ajralib turadi (yashil avatar + ✓ va "Tayinlangan" teg)
- Buyurtma tafsilotlari modalida:
  - Filial nomi (id emas) ko‘rsatiladi (branch populate)
  - Kuryer ma’lumotlari kartasi: FIO, telefon, jami yetkazmalar, reyting
  - "Kuryer takliflari" (Tavsiya): masofa + reyting + availability + load asosida skorlangan ro‘yxat; bir klikda tayinlash
  - "Kuryer takliflari" paneli faqat kuryer tayinlanmaganida ko‘rinadi; tayinlangach avtomatik yashirinadi
- Kuryer tayinlash modalida band (isAvailable=false) kuryerlar ko‘rsatilmaydi; lekin allaqachon tayinlangan kuryer highlight bilan ro‘yxatda qoladi

### Kuryerlar live location (yangi)
- Bot (courier):
  - “✅ Ishni boshlash” va “🛑 Ishni tugatish” tugmalari qo‘shildi. Online bo‘lganda kuryerga live location ulashish ko‘rsatmasi chiqadi.
  - Oddiy va live lokatsiyalar qabul qilinadi (`location` va `edited_message`).
  - Har lokatsiya yangilanishida filial xonasiga Socket.IO orqali event yuboriladi: `courier:location`.
- Backend (SocketManager):
  - `emitCourierLocationToBranch(branchId, payload)` → `branch:<id>` xonasiga `courier:location` emit qiladi.
- Admin panel (React):
  - Yangi sahifa: `CouriersPage` (`/couriers`). Leaflet xarita bilan kuryer markerlari.
  - Socket subscribe: `courier:location` eventi orqali markerlar real-vaqtda yangilanadi.
  - Filtrlar: Barchasi/Online/Offline/Stale. Stale — 5 daqiqa davomida lokatsiya yangilanmagan kuryer.
  - Marker popup: FIO, telefon, Online/Available teglar, yangilangan vaqt.

### Reja: Materialized snapshots va Background jobs
- Redis kiritmasdan ham arxitektura tayyorlanadi: BullMQ yordamida kechayu-kunduz (nightly/hourly) agregatsiyalarni oldindan hisoblash
- `/dashboard/*` endpointlari uchun qisqa TTL kesh (prod’da Redis bilan) rejalashtirilgan

### Smoke testlar
- `npm run smoke` quyidagilarni qamrab oladi:
  - Admin: dashboard, branches, products, orders, orders/stats, categories, tables
  - Superadmin: admins, branches, dashboard
  - Dashboard: analytics/sales, analytics/orders, chart-data, stats
  - Couriers: list, available/for-order, heatmap, zones

### Kelgusi ishlar
- Bot handlerlarini parchlash: `flow.js`, `dineIn.js`, `pickup.js`, `delivery.js`, `finalize.js`, `notify.js`
- Boshqa route’larni ham controllerlarga ko‘chirish (`productsController`, `categoriesController`, ...)
- Promo tizimi: superadmin uchun promo/kampaniya endpointlari va UI
  - Kodli promo (`PromoService`) va vaqtli chegirmalar (product.originalPrice + validFrom/validUntil)
  - Buyurtma tasdiqlashda promo tekshirish/apply endpointi
- To‘lov integratsiyasi: `paymentService` bilan Click/Payme — webhooklar va statuslar
- Chegirma e’lonlari (kampaniya): vaqtli foizlik chegirmalarni boshqarish (superadmin boshqarsin, ixtiyoriy per-filial override)

### Pagination helperlar (backend)
- `utils/helpers.getPaginationParams(query)` → `{ page, limit, skip }`
- `utils/helpers.buildPagination(total, page, limit)` → `{ page, limit, total, totalPages }`
- Qo‘llangan: `products`, `categories`, `orders` route’lari

### Bot: filiallar inline keyboard va “Eng yaqin filial”
- Asosiy menyuda: filiallar ro‘yxati inline keyboard (pagination bilan)
- “🏠 Eng yaqin filial” tugmasi: geolokatsiya so‘rab, `resolveBranchForLocation` orqali aniqlash
- Filial tugmasi bosilganda: filial nomi, manzil, ish vaqti, Yandex xarita linki (map deep-link), “Menuga qaytish”
- QR yoki pickup oqimlarida tanlangan/aniqlangan filial sessiyaga yoziladi va product list shu filial bo‘yicha chiqadi

### Kategoriya Status vs Ko‘rinish (Visibility) siyosati
- Tavsiya:
  - Status (faol/nofaol) – global (superadmin boshqaradi). Kategoriyani o‘chirishga yaqin semantika
  - Ko‘rinish (visible/hidden) – global (UI’da yashirish), per-filialga ehtiyoj bo‘lsa alohida `BranchCategory` bilan keyin joriy etiladi
  - Per-filial boshqaruv mahsulot darajasida qoladi (inventory), bu operatsion jihatdan osonroq

## Performance/Scalability reja
- MongoDB indekslar: `Product(categoryId)`, `Product(branch)`, `BranchProduct(branch,product)`, `Order(branch,status,createdAt)`
- So‘rovlar: faqat kerakli maydonlarni `select` qilish, pagination, agregatsiyalarni limit bilan
- Kesh: tez-tez o‘qiladigan public ro‘yxatlar (kategoriyalar, product list) uchun qisqa muddatli in-memory kesh (dev); prod’da Redis (rejalashtirilgan)
- Socket hodisalari: xonalar bo‘yicha (`branch:<id>`) emit; keraksiz broadcast yo‘q
- Frontend: React Query caching + placeholderData; memoization; virtualized lists kerak bo‘lsa qo‘shiladi
- Rasm/aktivlar: `uploads/` uchun CDN/front-proxy yoki gzip+cache-control; img lazy-load
- Batch operatsiyalar: inventar bulk endpointlari (rejalashtirilgan) va queue (cron) – `soldToday` reset, statistikani nightly precompute
- Monitoring: loglar, slow query profilleri, Node heap/CPU kuzatuvi

## Xavfsizlik eslatmalari
- Parollar bcrypt bilan xeshlanadi; update paytida `password` bo‘sh bo‘lsa e’tiborga olinmaydi
- Adminlar uchun filial cheklovi middleware va query darajasida nazorat qilinadi; superadmin cheklovdan ozod
- Admin panel so‘rovlarida JWT token axios interceptor orqali biriktiriladi

## Konvensiyalar
- Admin paneldagi barcha fetchlar uchun React Query; mutatsiyalardan so‘ng invalidate
- `rowKey` uchun doim barqaror ID ishlating; indexdan foydalanmang
- Lokal xabarlar uchun `message.useMessage()`; globalda `AntApp` provider
- Superadmin bo‘lsa, filial filtrlarini queryga qo‘shish; adminlar serverda avtomatik skoplangan

Agar darhol ishni davom ettirish kerak bo‘lsa, yuqoridagi TODO bo‘limidagi punktlardan boshlang va Repozitoriya tuzilmasi hamda Admin panel bo‘limlarida ko‘rsatilgan fayllar bilan ishlang.


