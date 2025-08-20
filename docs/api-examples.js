// API Documentation Examples
// Bu fayl Swagger uchun example API endpoints va responses ni o'z ichiga oladi

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 🔐 Admin/Superadmin login
 *     description: Telegram orqali admin yoki superadmin login qilish
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - telegramId
 *               - password
 *             properties:
 *               telegramId:
 *                 type: number
 *                 example: 123456789
 *                 description: Telegram ID
 *               password:
 *                 type: string
 *                 example: "admin123"
 *                 description: Admin parol
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Noto'g'ri login ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: 📊 Dashboard statistikalari
 *     description: Asosiy dashboard statistikalarini olish
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistika ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                       example: 1250
 *                     totalOrders:
 *                       type: number
 *                       example: 3450
 *                     totalRevenue:
 *                       type: number
 *                       example: 25000000
 *                     activeProducts:
 *                       type: number
 *                       example: 45
 *                     newOrdersToday:
 *                       type: number
 *                       example: 28
 *                     revenueToday:
 *                       type: number
 *                       example: 750000
 */

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: 🍽️ Mahsulotlar ro'yxati
 *     description: Barcha mahsulotlarni olish (pagination bilan)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Sahifa raqami
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Sahifadagi elementlar soni
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Kategoriya ID orqali filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Mahsulot nomi bo'yicha qidiruv
 *     responses:
 *       200:
 *         description: Mahsulotlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                       example: 1
 *                     limit:
 *                       type: number
 *                       example: 10
 *                     total:
 *                       type: number
 *                       example: 45
 *                     totalPages:
 *                       type: number
 *                       example: 5
 */

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: ➕ Yangi mahsulot qo'shish
 *     description: Yangi mahsulot yaratish
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Margarita Pizza"
 *               description:
 *                 type: string
 *                 example: "Classic Margarita pizza with fresh basil"
 *               price:
 *                 type: number
 *                 example: 35000
 *               category:
 *                 type: string
 *                 example: "60d5f484f1d2c6b1f8c8e8a3"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Mahsulot rasmi
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               isVisible:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Mahsulot muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *                   example: "Mahsulot muvaffaqiyatli yaratildi"
 */

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: 🔍 Mahsulot tafsilotlari
 *     description: ID bo'yicha mahsulot ma'lumotlarini olish
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mahsulot ID
 *     responses:
 *       200:
 *         description: Mahsulot ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Mahsulot topilmadi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: 📋 Buyurtmalar ro'yxati
 *     description: Barcha buyurtmalarni olish (filter va pagination bilan)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, confirmed, preparing, ready, delivering, completed, cancelled]
 *         description: Buyurtma holati bo'yicha filter
 *       - in: query
 *         name: orderType
 *         schema:
 *           type: string
 *           enum: [delivery, pickup, dine_in]
 *         description: Buyurtma turi bo'yicha filter
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *         description: Filial ID bo'yicha filter
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Boshlanish sanasi (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Tugash sanasi (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Buyurtmalar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                       example: 1
 *                     limit:
 *                       type: number
 *                       example: 20
 *                     total:
 *                       type: number
 *                       example: 150
 *                     totalPages:
 *                       type: number
 *                       example: 8
 */

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: 🔄 Buyurtma holatini o'zgartirish
 *     description: Buyurtma holatini yangilash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Buyurtma ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, confirmed, preparing, ready, delivering, completed, cancelled]
 *                 example: "confirmed"
 *               note:
 *                 type: string
 *                 example: "Buyurtma tasdiqlandi"
 *     responses:
 *       200:
 *         description: Buyurtma holati yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Buyurtma holati yangilandi"
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: 📂 Kategoriyalar ro'yxati
 *     description: Barcha kategoriyalarni olish
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kategoriyalar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: 👥 Foydalanuvchilar ro'yxati
 *     description: Barcha foydalanuvchilarni olish (pagination bilan)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 50
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, courier, superadmin]
 *         description: Role bo'yicha filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Ism yoki username bo'yicha qidiruv
 *     responses:
 *       200:
 *         description: Foydalanuvchilar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                       example: 1
 *                     limit:
 *                       type: number
 *                       example: 50
 *                     total:
 *                       type: number
 *                       example: 1250
 *                     totalPages:
 *                       type: number
 *                       example: 25
 */

/**
 * @swagger
 * /branches:
 *   get:
 *     tags: [Branches]
 *     summary: 🏢 Filiallar ro'yxati
 *     description: Barcha filiallarni olish
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Filiallar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Branch'
 */

/**
 * @swagger
 * /couriers:
 *   get:
 *     tags: [Couriers]
 *     summary: 🚚 Kuryer ro'yxati
 *     description: Barcha kuryerlarni olish
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kuryerlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           isOnline:
 *                             type: boolean
 *                             example: true
 *                           currentDeliveries:
 *                             type: number
 *                             example: 2
 */
