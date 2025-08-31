/**
 * Demo Token Creator - Database yo'q bo'lganda ham ishlaydi
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

function createDemoToken() {
  console.log('🎯 DEMO TOKEN YARATISH\n');

  const JWT_SECRET = process.env.JWT_SECRET || 'oshxona_jwt_secret_key_2025_development_only';

  // SuperAdmin token
  const superAdminToken = jwt.sign(
    {
      userId: '507f1f77bcf86cd799439011',
      id: '507f1f77bcf86cd799439011',
      role: 'superadmin',
      email: 'super@admin.uz',
      firstName: 'Super',
      lastName: 'Admin',
      branch: null
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Admin token
  const adminToken = jwt.sign(
    {
      userId: '507f1f77bcf86cd799439012',
      id: '507f1f77bcf86cd799439012', 
      role: 'admin',
      email: 'test@admin.uz',
      firstName: 'Test',
      lastName: 'Admin',
      branch: '507f1f77bcf86cd799439013'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('👑 SUPERADMIN TOKEN:');
  console.log('Email: super@admin.uz');
  console.log('Token:');
  console.log(superAdminToken);
  console.log('');

  console.log('👨‍💼 ADMIN TOKEN:');
  console.log('Email: test@admin.uz');
  console.log('Token:');
  console.log(adminToken);
  console.log('');

  console.log('🔧 ISHLATISH:');
  console.log('1. Browser console ga boring');
  console.log('2. localStorage.setItem("token", "TOKEN_SHU_YERGA")');
  console.log('3. location.reload()');
  console.log('4. Admin panel ochiladi!');
  console.log('');

  console.log('🧪 CURL TEST:');
  console.log(`curl -H "Authorization: Bearer ${superAdminToken}" http://localhost:5000/api/auth/me`);
}

createDemoToken();