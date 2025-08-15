require('dotenv').config();
const mongoose = require('mongoose');
const Database = require('../config/database');
const { User, Branch } = require('../models');

async function createSuperAdmin() {
  try {
    console.log('🚀 SuperAdmin yaratish jarayoni boshlandi...');

    // Database connection
    await Database.connect();

    // Check if SuperAdmin already exists
    const existingSuperAdmin = await User.findOne({
      role: 'superadmin',
      email: process.env.SUPERADMIN_EMAIL
    });

    if (existingSuperAdmin) {
      console.log('⚠️ SuperAdmin allaqachon mavjud!');
      console.log(`📧 Email: ${existingSuperAdmin.email}`);
      console.log(`👤 Ism: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      return;
    }

    // Create main branch first
    let mainBranch = await Branch.findOne({ code: process.env.MAIN_BRANCH_CODE });

    if (!mainBranch) {
      console.log('🏢 Asosiy filial yaratilmoqda...');
      mainBranch = new Branch({
        name: process.env.MAIN_BRANCH_NAME || 'Oshxona Asosiy Filial',
        code: process.env.MAIN_BRANCH_CODE || 'OSH001',
        address: {
          street: process.env.COMPANY_ADDRESS || 'Toshkent shahar, Mirobod tumani',
          city: 'Toshkent',
          district: 'Mirobod',
          coordinates: {
            latitude: parseFloat(process.env.DEFAULT_RESTAURANT_LAT) || 41.2995,
            longitude: parseFloat(process.env.DEFAULT_RESTAURANT_LON) || 69.2401
          }
        },
        phone: process.env.COMPANY_PHONE || '+998 90 123 45 67',
        email: process.env.SUPERADMIN_EMAIL,
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
          minOrderAmount: parseInt(process.env.MIN_DELIVERY_AMOUNT) || 50000,
          deliveryFee: parseInt(process.env.DELIVERY_COST_PER_KM) || 15000,
          freeDeliveryAmount: parseInt(process.env.FREE_DELIVERY_AMOUNT) || 200000,
          maxDeliveryDistance: parseInt(process.env.MAX_DELIVERY_DISTANCE) || 15,
          averagePreparationTime: 30,
          acceptOnlinePayment: true,
          acceptCashPayment: true
        }
      });

      await mainBranch.save();
      console.log('✅ Asosiy filial yaratildi:', mainBranch.name);
    }

    // Create SuperAdmin
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'admin';
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'super@admin.uz';

    const superAdmin = new User({
      firstName: process.env.SUPERADMIN_NAME?.split(' ')[0] || 'Super',
      lastName: process.env.SUPERADMIN_NAME?.split(' ').slice(1).join(' ') || 'Admin',
      email: superAdminEmail,
      password: superAdminPassword,
      telegramId: parseInt(process.env.SUPERADMIN_TELEGRAM_ID) || null,
      role: 'superadmin',
      isActive: true,
      isBlocked: false
    });

    await superAdmin.save();

    console.log('🎉 SuperAdmin muvaffaqiyatli yaratildi!');
    console.log('=====================================');
    console.log(`👤 Ism: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`🔑 Parol: ${process.env.SUPERADMIN_PASSWORD}`);
    console.log(`📱 Telegram ID: ${superAdmin.telegramId || 'N/A'}`);
    console.log(`🏢 Asosiy filial: ${mainBranch.name} (${mainBranch.code})`);
    console.log('=====================================');
    console.log('🚀 Endi admin panelga kiring va boshqaring!');

  } catch (error) {
    console.error('❌ SuperAdmin yaratishda xatolik:', error);
  } finally {
    await Database.disconnect();
    process.exit(0);
  }
}

createSuperAdmin();