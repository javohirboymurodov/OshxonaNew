// scripts/addBranch.js
const mongoose = require('mongoose');
const path = require('path');

// Models ni to'g'ri import qilish
const Order = require('../models/Order');
const Branch = require('../models/Branch');

async function connectDB() {
  try {
    // MongoDB connection string - o'zingizning URI'ngizni kiriting
    const mongoURI = 'mongodb://localhost:27017/pizza_bot'; // Bu yerda o'z DB nomingizni yozing
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB ga ulanish muvaffaqiyatli');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection xatoligi:', error.message);
    return false;
  }
}

async function migrationAddBranchToOrders() {
  try {
    console.log('🔄 Branch migration boshlandi...');
    
    // MongoDB ga ulanish
    const connected = await connectDB();
    if (!connected) {
      console.log('❌ Database ga ulanib bo\'lmadi');
      return;
    }
    
    // Birinchi branch'ni topish
    console.log('🔍 Mavjud branch larni qidiryapman...');
    const firstBranch = await Branch.findOne({ isActive: true });
    
    if (!firstBranch) {
      console.log('❌ Hech qanday aktiv branch topilmadi');
      console.log('🏗️ Default branch yaratyapman...');
      
      // Default branch yaratish
      const defaultBranch = new Branch({
        name: 'Asosiy filial',
        address: {
          street: 'Amir Temur ko\'chasi',
          city: 'Toshkent'
        },
        phone: '+998901234567',
        isActive: true,
        workingHours: {
          monday: { open: '09:00', close: '22:00', isOpen: true },
          tuesday: { open: '09:00', close: '22:00', isOpen: true },
          wednesday: { open: '09:00', close: '22:00', isOpen: true },
          thursday: { open: '09:00', close: '22:00', isOpen: true },
          friday: { open: '09:00', close: '22:00', isOpen: true },
          saturday: { open: '09:00', close: '22:00', isOpen: true },
          sunday: { open: '09:00', close: '22:00', isOpen: true }
        }
      });
      
      await defaultBranch.save();
      console.log('✅ Default branch yaratildi:', defaultBranch.name);
      console.log('🆔 Branch ID:', defaultBranch._id);
      
      // Orderlarni tekshirish
      const orderCount = await Order.countDocuments();
      console.log(`📊 Jami orderlar soni: ${orderCount}`);
      
      if (orderCount > 0) {
        // Branch maydoni bo'lmagan orderlarni topish
        const ordersWithoutBranch = await Order.countDocuments({ branch: { $exists: false } });
        console.log(`🔢 Branch maydoni bo'lmagan orderlar: ${ordersWithoutBranch}`);
        
        if (ordersWithoutBranch > 0) {
          // Barcha orderlarga default branch qo'shish
          const result = await Order.updateMany(
            { branch: { $exists: false } },
            { $set: { branch: defaultBranch._id } }
          );
          
          console.log(`✅ ${result.modifiedCount} ta order yangilandi`);
        } else {
          console.log('ℹ️ Barcha orderlarda branch maydoni mavjud');
        }
      } else {
        console.log('ℹ️ Hozircha orderlar mavjud emas');
      }
      
    } else {
      console.log('✅ Mavjud branch topildi:', firstBranch.name);
      console.log('🆔 Branch ID:', firstBranch._id);
      
      // Orderlarni tekshirish va yangilash
      const orderCount = await Order.countDocuments();
      console.log(`📊 Jami orderlar soni: ${orderCount}`);
      
      if (orderCount > 0) {
        const ordersWithoutBranch = await Order.countDocuments({ branch: { $exists: false } });
        console.log(`🔢 Branch maydoni bo'lmagan orderlar: ${ordersWithoutBranch}`);
        
        if (ordersWithoutBranch > 0) {
          const result = await Order.updateMany(
            { branch: { $exists: false } },
            { $set: { branch: firstBranch._id } }
          );
          
          console.log(`✅ ${result.modifiedCount} ta order yangilandi`);
        } else {
          console.log('ℹ️ Barcha orderlarda branch maydoni mavjud');
        }
      }
    }
    
    console.log('🎉 Migration muvaffaqiyatli yakunlandi');
    
  } catch (error) {
    console.error('❌ Migration xatoligi:', error);
  } finally {
    // Connection ni yopish
    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection yopildi');
    } catch (err) {
      console.error('❌ Connection yopishda xatolik:', err.message);
    }
    process.exit(0);
  }
}

// Script ni ishga tushirish
migrationAddBranchToOrders();