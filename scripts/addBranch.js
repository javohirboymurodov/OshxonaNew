const mongoose = require('mongoose');
const Order = require('../models/Order');
const Branch = require('../models/Branch');

async function migrationAddBranchToOrders() {
  try {
    console.log('🔄 Order migration boshlandi...');
    
    // Birinchi branch'ni topish (default branch sifatida)
    const firstBranch = await Branch.findOne({ isActive: true });
    
    if (!firstBranch) {
      console.log('❌ Hech qanday aktiv branch topilmadi');
      
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
      
      // Barcha orderlarga default branch qo'shish (branch maydoni bo'lmaganlar uchun)
      const result = await Order.updateMany(
        { branch: { $exists: false } },
        { $set: { branch: defaultBranch._id } }
      );
      
      console.log(`✅ ${result.modifiedCount} ta order yangilandi`);
    } else {
      // Mavjud branch bilan yangilash
      const result = await Order.updateMany(
        { branch: { $exists: false } },
        { $set: { branch: firstBranch._id } }
      );
      
      console.log(`✅ ${result.modifiedCount} ta order yangilandi`);
    }
    
    console.log('✅ Migration muvaffaqiyatli yakunlandi');
  } catch (error) {
    console.error('❌ Migration xatoligi:', error);
  }
}

migrationAddBranchToOrders();