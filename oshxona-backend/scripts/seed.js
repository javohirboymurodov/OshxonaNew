require('dotenv').config();
const mongoose = require('mongoose');
const { Category, Product, Branch } = require('../models');
const database = require('../config/database');

async function seedDatabase() {
  try {
    console.log('🌱 Database seed jarayoni boshlandi...');

    // Database'ga ulanish
    await database.connect();

    // 1. Mavjud ma'lumotlarni tozalash
    console.log("🧹 Mavjud ma'lumotlarni tozalash...");
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Branch.deleteMany({});

    // 2. Filiallar yaratish - ko'p filial
    console.log('🏢 Filiallar yaratilmoqda...');
    await Branch.deleteMany({}); // Avval tozalash
    
    const branchesData = [
      {
        name: 'Asosiy filial',
        address: {
          street: 'Amir Temur ko\'chasi, 42',
          city: 'Toshkent',
          district: 'Yunusobod tumani',
          coordinates: {
            latitude: 41.2995,
            longitude: 69.2401
          }
        },
        phone: '+998911234568',
        isActive: true,
        workingHours: {
          monday: { open: '09:00', close: '23:00', isOpen: true },
          tuesday: { open: '09:00', close: '23:00', isOpen: true },
          wednesday: { open: '09:00', close: '23:00', isOpen: true },
          thursday: { open: '09:00', close: '23:00', isOpen: true },
          friday: { open: '09:00', close: '23:00', isOpen: true },
          saturday: { open: '09:00', close: '23:00', isOpen: true },
          sunday: { open: '10:00', close: '22:00', isOpen: true }
        },
        settings: {
          minOrderAmount: 50000,
          deliveryFee: 15000,
          freeDeliveryAmount: 200000,
          maxDeliveryDistance: 15
        }
      },
      {
        name: 'Chilonzor filiali',
        address: {
          street: 'Bunyodkor ko\'chasi, 25',
          city: 'Toshkent',
          district: 'Chilonzor tumani',
          coordinates: {
            latitude: 41.2856,
            longitude: 69.2034
          }
        },
        phone: '+998911234569',
        isActive: true,
        workingHours: {
          monday: { open: '08:00', close: '22:00', isOpen: true },
          tuesday: { open: '08:00', close: '22:00', isOpen: true },
          wednesday: { open: '08:00', close: '22:00', isOpen: true },
          thursday: { open: '08:00', close: '22:00', isOpen: true },
          friday: { open: '08:00', close: '22:00', isOpen: true },
          saturday: { open: '09:00', close: '23:00', isOpen: true },
          sunday: { open: '09:00', close: '23:00', isOpen: true }
        },
        settings: {
          minOrderAmount: 40000,
          deliveryFee: 12000,
          freeDeliveryAmount: 150000,
          maxDeliveryDistance: 12
        }
      },
      {
        name: 'Sergeli filiali',
        address: {
          street: 'Sergeli ko\'chasi, 78',
          city: 'Toshkent',
          district: 'Sergeli tumani',
          coordinates: {
            latitude: 41.2045,
            longitude: 69.2223
          }
        },
        phone: '+998911234570',
        isActive: true,
        workingHours: {
          monday: { open: '10:00', close: '21:00', isOpen: true },
          tuesday: { open: '10:00', close: '21:00', isOpen: true },
          wednesday: { open: '10:00', close: '21:00', isOpen: true },
          thursday: { open: '10:00', close: '21:00', isOpen: true },
          friday: { open: '10:00', close: '22:00', isOpen: true },
          saturday: { open: '10:00', close: '22:00', isOpen: true },
          sunday: { open: '11:00', close: '21:00', isOpen: true }
        },
        settings: {
          minOrderAmount: 45000,
          deliveryFee: 18000,
          freeDeliveryAmount: 180000,
          maxDeliveryDistance: 10
        }
      },
      {
        name: 'Bektemir filiali',
        address: {
          street: 'Bektemir ko\'chasi, 156',
          city: 'Toshkent',
          district: 'Bektemir tumani',
          coordinates: {
            latitude: 41.1967,
            longitude: 69.3342
          }
        },
        phone: '+998911234571',
        isActive: false, // Hozircha yopiq
        workingHours: {
          monday: { open: '09:00', close: '20:00', isOpen: false },
          tuesday: { open: '09:00', close: '20:00', isOpen: false },
          wednesday: { open: '09:00', close: '20:00', isOpen: false },
          thursday: { open: '09:00', close: '20:00', isOpen: false },
          friday: { open: '09:00', close: '20:00', isOpen: false },
          saturday: { open: '09:00', close: '20:00', isOpen: false },
          sunday: { open: '09:00', close: '20:00', isOpen: false }
        },
        settings: {
          minOrderAmount: 50000,
          deliveryFee: 20000,
          freeDeliveryAmount: 250000,
          maxDeliveryDistance: 8
        }
      }
    ];

    const branches = [];
    for (const branchData of branchesData) {
      const branch = await Branch.create(branchData);
      branches.push(branch);
      console.log(`✅ Filial yaratildi: ${branch.name} (${branch.isActive ? 'Faol' : 'Nofaol'})`);
    }

    // Asosiy filialni olish (mahsulotlar uchun)
    const mainBranch = branches.find(b => b.name === 'Asosiy filial');

    // 3. Kategoriyalar yaratish - nameUz qo'shilgan
    console.log('📂 Kategoriyalar yaratilmoqda...');
    const categoriesData = [
      { 
        name: 'Pizza', 
        nameUz: 'Pitsa',
        nameRu: 'Пицца', 
        nameEn: 'Pizza', 
        emoji: '🍕', 
        description: 'Mazali pitsalar',
        sortOrder: 1,
        stats: {
          totalProducts: 1,
          activeProducts: 2,
          totalOrders: 5,
          totalViews: 10,
          totalRevenue: 0,
          popularityScore: 0
        }
      },
      { 
        name: 'Burger', 
        nameUz: 'Burger', // <--- BU MAYDON QO'SHILDI
        nameRu: 'Бургер', 
        nameEn: 'Burger', 
        emoji: '🍔', 
        description: 'Yangi burgerlar',
        sortOrder: 2,
        stats: {
          totalProducts: 0,
          activeProducts: 0,
          totalOrders: 0,
          totalViews: 0,
          totalRevenue: 0,
          popularityScore: 0
        }
      },
      { 
        name: 'Ichimliklar', 
        nameUz: 'Ichimliklar', // <--- BU MAYDON QO'SHILDI
        nameRu: 'Напитки', 
        nameEn: 'Drinks', 
        emoji: '🥤', 
        description: 'Sovuq ichimliklar',
        sortOrder: 3,
        stats: {
          totalProducts: 0,
          activeProducts: 0,
          totalOrders: 0,
          totalViews: 0,
          totalRevenue: 0,
          popularityScore: 0
        }
      },
      { 
        name: 'Desertlar', 
        nameUz: 'Desertlar', // <--- BU MAYDON QO'SHILDI
        nameRu: 'Десерты', 
        nameEn: 'Desserts', 
        emoji: '🍰', 
        description: 'Shirin desertlar',
        sortOrder: 4,
        stats: {
          totalProducts: 0,
          activeProducts: 0,
          totalOrders: 0,
          totalViews: 0,
          totalRevenue: 0,
          popularityScore: 0
        }
      }
    ];

    const categories = [];
    for (const catData of categoriesData) {
      const category = await Category.create(catData);
      categories.push(category);
      console.log('✅ Kategoriya yaratildi:', category.name);
    }

    // 4. Mahsulotlar yaratish
    console.log('🍕 Mahsulotlar yaratilmoqda...');

    const pizzaCat = categories.find(c => c.name === 'Pizza');
    const burgerCat = categories.find(c => c.name === 'Burger');
    const drinksCat = categories.find(c => c.name === 'Ichimliklar');
    const dessertsCat = categories.find(c => c.name === 'Desertlar');

    const productsData = [
      {
        name: 'Pepperoni Pizza',
        description: 'Mazali pepperoni va pishloq bilan',
        price: 55000,
        categoryId: pizzaCat._id,
      },
      {
        name: 'Cheeseburger',
        description: 'Mazali go\'sht va pishloq bilan',
        price: 35000,
        categoryId: burgerCat._id,
      },
      {
        name: 'Coca Cola',
        description: 'Sovuq gazli ichimlik',
        price: 10000,
        categoryId: drinksCat._id,
      },
      {
        name: 'Tiramisu',
        description: 'Italiyancha mashhur desert',
        price: 25000,
        categoryId: dessertsCat._id,
      }
    ];

    for (const prodData of productsData) {
      const product = await Product.create(prodData);
      console.log('✅ Mahsulot yaratildi:', product.name);
    }

    console.log('🌱 Seed jarayoni muvaffaqiyatli tugadi!');
    console.log(`📊 Yaratildi: ${branches.length} filial, ${categories.length} kategoriya, ${productsData.length} mahsulot`);
    
    // Database connectionni yopish
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed jarayonida xatolik:', error);
    await database.disconnect();
    process.exit(1);
  }
}

// Seed jarayonini ishga tushirish
seedDatabase();