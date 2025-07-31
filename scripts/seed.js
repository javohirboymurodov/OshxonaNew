require('dotenv').config();
const mongoose = require('mongoose');
const Database = require('../config/database');
const { User, Branch, Category, Product, DeliveryZone, Table } = require('../models');

const sampleCategories = [
  {
    name: 'Pizza',
    nameUz: 'Pitsa',
    nameRu: 'Пицца',
    description: 'Mazali pitsalar',
    icon: '🍕',
    sortOrder: 1,
    isActive: true
  },
  {
    name: 'Burger',
    nameUz: 'Burger',
    nameRu: 'Бургер',
    description: 'Shirin burgerlar',
    icon: '🍔',
    sortOrder: 2,
    isActive: true
  },
  {
    name: 'Drinks',
    nameUz: 'Ichimliklar',
    nameRu: 'Напитки',
    description: 'Sovuq ichimliklar',
    icon: '🥤',
    sortOrder: 3,
    isActive: true
  },
  {
    name: 'Desserts',
    nameUz: 'Shirinliklar',
    nameRu: 'Десерты',
    description: 'Shirin taomlar',
    icon: '🍰',
    sortOrder: 4,
    isActive: true
  }
];

const sampleProducts = [
  // Pizza
  {
    name: 'Margherita',
    nameUz: 'Margarita',
    nameRu: 'Маргарита',
    description: 'Pomidor, mozzarella, basilik',
    price: 85000,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
    category: 'Pizza',
    isActive: true,
    ingredients: ['Pomidor', 'Mozzarella', 'Basilik'],
    preparationTime: 15
  },
  {
    name: 'Pepperoni',
    nameUz: 'Pepperoni',
    nameRu: 'Пепперони',
    description: 'Pepperoni kolbasa, mozzarella',
    price: 95000,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
    category: 'Pizza',
    isActive: true,
    ingredients: ['Pepperoni', 'Mozzarella', 'Pomidor'],
    preparationTime: 15
  },
  // Burger
  {
    name: 'Classic Burger',
    nameUz: 'Klassik Burger',
    nameRu: 'Классический бургер',
    description: 'Mol go\'shti, salat, pomidor',
    price: 65000,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    category: 'Burger',
    isActive: true,
    ingredients: ['Mol go\'shti', 'Salat', 'Pomidor', 'Piyoz'],
    preparationTime: 10
  },
  {
    name: 'Cheese Burger',
    nameUz: 'Cheese Burger',
    nameRu: 'Чизбургер',
    description: 'Mol go\'shti, cheese, salat',
    price: 75000,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    category: 'Burger',
    isActive: true,
    ingredients: ['Mol go\'shti', 'Cheese', 'Salat', 'Pomidor'],
    preparationTime: 10
  },
  // Drinks
  {
    name: 'Coca Cola',
    nameUz: 'Koka-Kola',
    nameRu: 'Кока-Кола',
    description: 'Gazlangan ichimlik',
    price: 12000,
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
    category: 'Drinks',
    isActive: true,
    preparationTime: 1
  },
  {
    name: 'Fresh Orange Juice',
    nameUz: 'Yangi Apelsin Sharbati',
    nameRu: 'Свежий апельсиновый сок',
    description: 'Tabiiy apelsin sharbati',
    price: 18000,
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
    category: 'Drinks',
    isActive: true,
    preparationTime: 3
  }
];

const sampleTables = [
  { number: 1, capacity: 2, qrCode: 'table_001', isActive: true },
  { number: 2, capacity: 4, qrCode: 'table_002', isActive: true },
  { number: 3, capacity: 4, qrCode: 'table_003', isActive: true },
  { number: 4, capacity: 6, qrCode: 'table_004', isActive: true },
  { number: 5, capacity: 8, qrCode: 'table_005', isActive: true },
  { number: 6, capacity: 2, qrCode: 'table_006', isActive: true },
  { number: 7, capacity: 4, qrCode: 'table_007', isActive: true },
  { number: 8, capacity: 4, qrCode: 'table_008', isActive: true },
  { number: 9, capacity: 6, qrCode: 'table_009', isActive: true },
  { number: 10, capacity: 8, qrCode: 'table_010', isActive: true }
];

async function seedDatabase() {
  try {
    console.log('🌱 Database seed jarayoni boshlandi...');
    
    // Database connection
    await Database.connect();

    // Get main branch
    const mainBranch = await Branch.findOne({ code: process.env.MAIN_BRANCH_CODE });
    
    if (!mainBranch) {
      throw new Error('❌ Asosiy filial topilmadi! Avval SuperAdmin yarating.');
    }

    console.log(`🏢 Filial: ${mainBranch.name}`);

    // Clear existing data (optional)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('🗑️ Mavjud ma\'lumotlar tozalanmoqda...');
      await Category.deleteMany({ branch: mainBranch._id });
      await Product.deleteMany({ branch: mainBranch._id });
      await Table.deleteMany({ branch: mainBranch._id });
      console.log('✅ Eski ma\'lumotlar tozalandi');
    }

    // Seed Categories
    console.log('📂 Kategoriyalar yaratilmoqda...');
    const createdCategories = [];
    
    for (const categoryData of sampleCategories) {
      const existingCategory = await Category.findOne({ 
        name: categoryData.name, 
        branch: mainBranch._id 
      });

      if (!existingCategory) {
        const category = new Category({
          ...categoryData,
          branch: mainBranch._id
        });
        await category.save();
        createdCategories.push(category);
        console.log(`✅ Kategoriya yaratildi: ${category.name}`);
      } else {
        createdCategories.push(existingCategory);
        console.log(`⚠️ Kategoriya mavjud: ${existingCategory.name}`);
      }
    }

    // Seed Products
    console.log('🍕 Mahsulotlar yaratilmoqda...');
    let createdProductsCount = 0;

    for (const productData of sampleProducts) {
      const category = createdCategories.find(cat => cat.name === productData.category);
      
      if (!category) {
        console.log(`❌ Kategoriya topilmadi: ${productData.category}`);
        continue;
      }

      const existingProduct = await Product.findOne({ 
        name: productData.name, 
        branch: mainBranch._id 
      });

      if (!existingProduct) {
        const product = new Product({
          ...productData,
          category: category._id,
          branch: mainBranch._id
        });
        await product.save();
        createdProductsCount++;
        console.log(`✅ Mahsulot yaratildi: ${product.name} - ${product.price.toLocaleString()} so'm`);
      } else {
        console.log(`⚠️ Mahsulot mavjud: ${existingProduct.name}`);
      }
    }

    // Seed Tables
    console.log('🪑 Stollar yaratilmoqda...');
    let createdTablesCount = 0;

    for (const tableData of sampleTables) {
      const existingTable = await Table.findOne({ 
        number: tableData.number, 
        branch: mainBranch._id 
      });

      if (!existingTable) {
        const table = new Table({
          ...tableData,
          branch: mainBranch._id
        });
        await table.save();
        createdTablesCount++;
        console.log(`✅ Stol yaratildi: #${table.number} (${table.capacity} kishi)`);
      } else {
        console.log(`⚠️ Stol mavjud: #${existingTable.number}`);
      }
    }

    console.log('\n🎉 Seed jarayoni muvaffaqiyatli tugadi!');
    console.log('=====================================');
    console.log(`📂 Kategoriyalar: ${createdCategories.length}`);
    console.log(`🍕 Mahsulotlar: ${createdProductsCount} yangi yaratildi`);
    console.log(`🪑 Stollar: ${createdTablesCount} yangi yaratildi`);
    console.log(`🏢 Filial: ${mainBranch.name}`);
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Seed jarayonida xatolik:', error);
  } finally {
    await Database.disconnect();
    process.exit(0);
  }
}

seedDatabase();