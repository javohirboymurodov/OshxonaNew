### OshxonaNew loyihasi haqida umumiy ma’lumot (2025-08 yangilanish)

Ushbu hujjat loyihaning hozirgi holati bo‘yicha yagona manba: arxitektura, asosiy funksiyalar, papkalar xaritasi, ishga tushirish tartibi, mavjud imkoniyatlar va ustuvor TODO ro‘yxati. Kontekst yo‘qolsa, ushbu faylni o‘qib, loyihaga tezda kirish va xavfsiz davom ettirish mumkin.

## Texnologiyalar to‘plami
- Backend: Node.js, Express, Mongoose (MongoDB), Socket.IO, Telegraf (Telegram bot)
- Admin frontend: React + Vite + TypeScript + Ant Design + @tanstack/react-query (Products sahifasida client-side pagination + inventory prefetch). Dev rejimda Vite proxy `/api` ga yo'naltirilgan, `src/services/api.ts` default `baseURL` sifatida `/api` dan foydalanadi.
- Auth: JWT (Bearer) va rollarga asoslangan kirish nazorati (RBAC)

## Asosiy biznes funksiyalar
- Bir nechta filiallar (multi-branch) qo‘llovi: mahsulotlar, buyurtmalar, yetkazib berish zonalari va adminlar filiallarga bog‘langan
- RBAC rollari: superadmin, admin, courier, user
  - Superadmin: to‘liq boshqaruv, barcha filiallar va sozlamalar
  - Admin: biriktirilgan filial doirasida boshqaruv; Users/Settings sahifalariga kira olmaydi
  - Courier: Telegram orqali tayinlangan buyurtmalarni qabul qiladi va statuslarni yangilaydi
  - User: Telegram bot orqali buyurtma qiladi (Yetkazib berish, Olib ketish, Avvaldan buyurtma, QR orqali stol)
- Buyurtmalar: Socket.IO orqali admin panelda real-vaqt yangilanishlar; to‘liq status oqimi (assigned/on_the_way/delivered/picked_up kabilar bilan)
- Kategoriyalar/Mahsulotlar: CRUD, global mahsulot holati (`Product.isActive`), drag-and-drop tartiblash (rejalashtirilgan), analitika
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
- bot/
  - botManager.js: modullarni ulash
  - user/: `/start` va menyu, callbacks, profil. Qat’iy telefon raqami gating (telefon bo‘lmaguncha boshqa amallar bloklanadi).
  - courier/: buyurtmalar boshqaruvi, online/offline, live location oqimi, callbacks.
  - handlers/: umumiy message handlerlar (text/contact/location) va user/courier oqimlari uchun yordamchilar.
- handlers/
  - admin/, user/: tarixiy/helper fayllar (asosiy bot kodi `bot/` ostida to‘plangan)
- keyboards/
  - adminKeyboards.js: Telegram admin klaviaturalari
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

## Middlewares
- `middlewares/auth.js`: JWT tekshiruvi, `requireAdmin` va RBAC; admin uchun filial skopi majburiy, superadmin bundan ozod
- `middlewares/rateLimit.js`: oddiy throttling (doimiy qo'llash rejalashtirilgan)
- `middlewares/session.js`: sessiya boshqaruvi uchun helper (bot uchun Telegraf `session()` ishlatiladi)

## API marshrutlari
- `api/routes/auth.js`: `/api/auth/*` (login, me)
- `api/routes/admin.js`: admin asosi; products/branches/settings kabi bo'limlar uchun delegatsiya
- `api/routes/products.js`, `api/routes/categories.js`, `api/routes/orders.js`, `api/routes/dashboard.js`, `api/routes/users.js`, `api/routes/superadmin.js`, `api/routes/tables.js`
- `api/controllers/adminController.js`: products/category/orders/inventory uchun asosiy handlerlar

### Birlashtirilgan server (index.js)
- Bosqichlar: (1) MongoDB ulanishi → (2) API Server (`startAPIServer(PORT)`) → (3) Dev rejimida webhook tozalash → (4) `bot.launch()`
- Graceful shutdown: SIGINT/SIGTERM/usizlangan promise’larda bot to‘xtatiladi
- Kuryer monitoringi: `COURIER_STALE_MS` va `COURIER_CHECK_INTERVAL_MS` yordamida eskirgan live lokatsiyalar tekshiriladi va `SocketManager.emitCourierLocationToBranch` orqali filial xonasiga yuboriladi; kuryerga ogohlantirish xabari jo‘natiladi

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
  - Admin: `/api/admin/branches` — faat o‘z filial(lar)i
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
  - Product: global `isActive`, narx, tasvir(lar), statistikalar. Per-filial mavjudlik Product’da emas.
  - BranchProduct: per-filial mavjudlik va narx override — `isAvailable: Boolean`, `priceOverride: Number|null`. Unikal indeks: `{ product: 1, branch: 1 }`.
  - product.branch: Branch ga ref; per-filial mavjudlik BranchProduct orqali boshqariladi.
  - Category: drag-drop tartib indeksi (rejalashtirilgan)
- DeliveryZone
  - filialga bog‘langan poligonlar; eng yaqin filialga fallbackdan avval tekshiriladi

## Real-time (Socket.IO)
- `emitNewOrder`: faqat tegishli `branch:<id>` xonasiga yuboriladi (default broadcast o‘chirildi)
- Frontend: admin panel faqat o‘z filialining xonasiga ulanadi; superadmin uchun umumiy notification yo‘q
- Popover: yangi buyurtmada turi ham ko‘rinadi (🚚 Yetkazib berish / 🛍️ Olib ketish / 🍽️ Avvaldan / 🪑 Stol QR)
- `emitOrderUpdate`: status o‘zgarishlarida UI yangilanadi va audio/browser notification ko‘rsatiladi (lokatsiya yangilanishida notification yo‘q)

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
- Kirish: `index.js`; modullar `bot/` ostida.
- User oqimlari (`bot/user/*`, `bot/handlers/*`)
  - Qat’iy telefon raqami gating: telefon bo‘lmasa `/start`, tugmalar va matnlar bloklanadi. Inline “📱 Telefon raqamni ulashish” va reply “📞 Telefonni yuborish” orqali so‘raladi. Telefon ulashilgach asosiy menyu ko‘rsatiladi.
  - Kategoriyalar/mahsulotlar, savat, yakuniy tasdiqlash.
  - Turlar: yetkazib berish (lokatsiya → zona yoki eng yaqin filial), olib ketish (filial tanlash → vaqt), avvaldan (filial → kelish vaqti), QR (stol raqami → telefon/to‘lov).
- Kuryer modul: `bot/courier/*`
  - Onboarding: `/courier` → telefon yuborish → `telegramId` bog‘lash.
  - Panel: Online/Offline (birlashtirilgan oqim), Mavjud/Band, faol buyurtmalar, daromad ko‘rsatkichlari.
  - Live location: “✅ Ishni boshlash” bosilganda Telegram live location ulanishi. Statik lokatsiyalar rad etiladi yoki ogohlantiriladi; live yangilanishlar saqlanadi va filial xonasiga emit qilinadi.
  - Status tugmalari: Yo‘ldaman → `on_delivery`, Yetkazdim → `delivered`.
- Klaviaturalar: admin klaviaturalari `keyboards/adminKeyboards.js`; user/courier klaviaturalari `bot/*/keyboards.js`.

## Admin panel (React)
- Global providerlar: QueryClientProvider + AntD App (message context ogohlantirishini bartaraf etish)
- Umumiy naqshlar
  - Barcha ma’lumotlar uchun React Query; mutatsiyadan so‘ng invalidate
  - Superadmin uchun filial filtr(lar)i: Dashboard/Orders/Products (kengaytiriladi: Kategoriyalar uchun ham)
  - RBAC marshrut guardlari: Users/Settings — non-superadmin uchun yashirin; Dashboard — faqat superadmin
  - AntD Table: barqaror `rowKey` (ID), index ishlatilmaydi
  - OrderDetailsModal: `message.useMessage()`; tugmalar `Space` bilan o‘ralgan (overflow yo‘q)
 - API mijozi: `src/services/api.ts` — default `baseURL` `/api` (Vite proxy), JWT token axios interceptor orqali yuboriladi
 - Socket: `src/hooks/useSocket.tsx` — `VITE_SOCKET_URL` yoki `VITE_API_BASE_URL` dan URL hosil qiladi; `join-admin` va `join-user` eventlari
- Sahifalar
  - Dashboard (faqat superadmin): statistikalar; pie chart label turi `spider`; sana oraliqlari + filial filtri; buyurtma turlari `byType`
  - Orders: filtrlar, modal tafsilotlar, status o‘tishlari, kuryer tayinlash
  - Products: filial filtri, create/edit, client-side pagination; Inventar ustuni endi faqat `Holat` (BranchProduct.isAvailable) toggle’idan iborat. `stock/dailyLimit/soldToday` olib tashlangan.
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

- Per-filial mavjudlik (inventory) modeli joriy qilindi: `BranchProduct` (faqat `isAvailable` va ixtiyoriy `priceOverride`). `stock/dailyLimit/soldToday` olib tashlandi.
- Admin vakolatlari:
  - Mahsulot: global Holat (`isActive`) va Inventar (`isAvailable`, ixtiyoriy `priceOverride`) boshqaradi
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
  - Filial nomi (ID emas) ko‘rsatiladi (`branch.name/title` populate)
  - Mijoz manzili koordinatadan avtomatik yechiladi (reverse geocoding): Yandex mavjud bo‘lsa Yandex, aks holda Nominatim (OSM) fallback
  - Yetkazish narxi ikki marta ko‘rinish xatosi bartaraf etildi
  - Holat tarixi to‘liq ko‘rinadi (assigned → on_delivery → delivered ...). Kuryer amallaridan yozuvlar avtomatik qo‘shiladi
  - Kuryer ma’lumotlari kartasi: FIO, telefon, jami yetkazmalar, reyting
  - "Kuryer takliflari" (Tavsiya): masofa + reyting + availability + load asosida skorlangan ro‘yxat; bir klikda tayinlash (faqat kuryer tayinlanmaganida ko‘rinadi)
- "Yetkazilgan/Completed" buyurtmalarda "Kuryer" tayinlash tugmasi yashiriladi
- Filtr/sort/paginatsiya o‘zgarganda modalning o‘z-o‘zidan ochilib ketishi bartaraf etildi (auto-open faqat notificationdan kelgan fokus uchun)

### Kuryerlar live location (yangi)
- Bot (courier): “✅ Ishni boshlash”/“🛑 Ishni tugatish”, live location majburiy; statik lokatsiyada ogohlantirish
- Backend (SocketManager): `emitCourierLocationToBranch(branchId, payload)` → `branch:<id>` xonasiga `courier:location`
- Admin panel (React): `CouriersPage` (`/couriers`) — Leaflet xarita, real-time markerlar
  - Xaritada filial markerlari ham ko‘rsatiladi (binoning ikonkasi). Koordinatalar `address.coordinates` / `coordinates` / `address.location` va `lat/lon` aliaslaridan avtomatik aniqlanadi
  - Filtrlar: Barchasi/Online/Offline/Stale (5 daqiqa o‘tgan bo‘lsa Stale)
  - Ogohlantirish: lokatsiya o‘zgarishlarida notification yo‘q; notification faqat buyurtma holati o‘zgarganda

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
  - Kodli promo (`PromoService`) va vaqtli chegirmalarni boshqarish (product.originalPrice + validFrom/validUntil)
  - Buyurtma tasdiqlashda promo tekshirish/apply endpointi
- To‘lov integratsiyasi: `paymentService` bilan Click/Payme — webhooklar va statuslar
- Chegirma e’lonlari (kampaniya): vaqtli foizlik chegirmalarni boshqarish (superadmin boshqarsin, ixtiyoriy per-filial override)

### Pagination helperlar (backend)
- `utils/helpers.getPaginationParams(query)` → `{ page, limit, skip }`
- `utils/helpers.buildPagination(total, page, limit)` → `{ page, limit, total, totalPages }`
- Qo‘llangan: `products`, `categories`, `orders` route’lari

### Bot: menyular va baholash
- Reply keyboard doimiy: “🏠 Asosiy sahifa”, “📋 Mening buyurtmalarim”, “👤 Profil” — matn yuborilganda tegishli handlerlarga yo‘naltiriladi
- Inline asosiy menyu/katalog tugmalari qayta bog‘landi (Tezkor buyurtma, Filiallar, Bog‘lanish, Ma’lumot)
- Yetkazilgan buyurtmadan so‘ng mijozdan ixtiyoriy baholash (1–5 ⭐) va ixtiyoriy izoh so‘raladi; `Order.rating` va `Order.feedback` ga saqlanadi

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
- MongoDB indekslar: `Product(categoryId)`, `Product(branch)`, `Product(isActive)`, `BranchProduct(branch,product)`, `Order(branch,status,createdAt)`
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



## Tez start (dev) — yangilangan

### Backend .env namunasi
```
MONGODB_URI=mongodb://localhost:27017/oshxona
JWT_SECRET=super_secret
TELEGRAM_BOT_TOKEN=xxxx:yyyy
COURIER_STALE_MS=300000
COURIER_CHECK_INTERVAL_MS=60000
SOCKET_CORS_ORIGIN=http://localhost:3000
```

### Frontend .env (ixtiyoriy)
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Ishga tushirish
1) Backend: `npm install && npm run dev`
2) Frontend: `cd oshxona-admin && npm install && npm run dev`
3) Bot: backend bilan bir jarayonda ishga tushadi (index.js orqali). `/start` dan keyin reply + inline menyular ko‘rinadi

### API misollar (curl)

- Buyurtmalar ro‘yxati (admin):
```
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:5000/api/orders?page=1&limit=15&status=&orderType=&courier="
```

- Bitta buyurtma:
```
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:5000/api/orders/<ORDER_ID>
```

- Buyurtma holatini yangilash:
```
curl -X PATCH -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}' \
  http://localhost:5000/api/orders/<ORDER_ID>/status
```

- Kuryer tayinlash:
```
curl -X PATCH -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"courierId":"<COURIER_ID>"}' \
  http://localhost:5000/api/orders/<ORDER_ID>/assign-courier
```

- Filiallar (superadmin):
```
curl -H "Authorization: Bearer <TOKEN>" http://localhost:5000/api/superadmin/branches
```

