/**
 * Create Test Admin - MongoDB Memory Server bilan
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User, Branch } = require('../models');

async function createTestAdmin() {
  let mongoServer;
  
  try {
    console.log('🧪 Test admin yaratish boshlandi...\n');

    // Start MongoDB Memory Server
    console.log('🗄️ MongoDB Memory Server ishga tushirilmoqda...');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Memory Server ga ulanish muvaffaqiyatli\n');

    // Create test branch first
    console.log('🏢 Test branch yaratilmoqda...');
    const branch = await Branch.create({
      name: 'Test Branch',
      title: 'Test Branch for Development',
      address: {
        street: 'Test Street 123',
        city: 'Tashkent',
        district: 'Yunusabad',
        fullAddress: 'Test Street 123, Yunusabad, Tashkent'
      },
      phone: '+998901234567',
      location: {
        latitude: 41.2995,
        longitude: 69.2401
      },
      isActive: true,
      workingHours: {
        open: '09:00',
        close: '23:00'
      }
    });
    console.log(`✅ Test branch yaratildi: ${branch.name} (${branch._id})\n`);

    // Create test superadmin
    console.log('👑 SuperAdmin yaratilmoqda...');
    const superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      telegramId: 999999999,
      phone: '+998999999999',
      email: 'super@admin.uz',
      role: 'superadmin',
      password: 'admin123',
      isActive: true
    });
    console.log(`✅ SuperAdmin yaratildi: ${superAdmin.email}\n`);

    // Create test admin for branch
    console.log('👨‍💼 Admin yaratilmoqda...');
    const admin = await User.create({
      firstName: 'Test',
      lastName: 'Admin',
      telegramId: 888888888,
      phone: '+998888888888',
      email: 'test@admin.uz',
      role: 'admin',
      password: 'admin123',
      branch: branch._id,
      isActive: true
    });
    console.log(`✅ Admin yaratildi: ${admin.email}\n`);

    // Test login credentials
    console.log('🔑 Login ma\'lumotlari:');
    console.log('─────────────────────────');
    console.log('SuperAdmin:');
    console.log('  Email: super@admin.uz');
    console.log('  Password: admin123');
    console.log('');
    console.log('Admin:');
    console.log('  Email: test@admin.uz');
    console.log('  Password: admin123');
    console.log('─────────────────────────\n');

    // Test JWT token creation
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign(
      {
        userId: superAdmin._id,
        id: superAdmin._id,
        role: superAdmin.role,
        email: superAdmin.email
      },
      process.env.JWT_SECRET || 'oshxona_jwt_secret_key_2025_development_only',
      { expiresIn: '24h' }
    );
    
    console.log('🎯 Test JWT Token (copy to localStorage):');
    console.log('─────────────────────────');
    console.log(testToken);
    console.log('─────────────────────────\n');

    console.log('✅ Test admin setup completed!');
    console.log('💡 Endi frontend da login qilishingiz mumkin.');

  } catch (error) {
    console.error('❌ Test admin yaratishda xatolik:', error);
  } finally {
    // Cleanup
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('\n🧹 Cleanup completed');
    process.exit(0);
  }
}

// Run
createTestAdmin();