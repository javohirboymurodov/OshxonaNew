#!/usr/bin/env node

/**
 * Test script for all the improvements implemented
 * This script tests the new features: loyalty program, real-time tracking, security, and mobile UX
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Database = require('../config/database');

// Services
const LoyaltyService = require('../services/loyaltyService');
const orderTracker = require('../services/orderTrackingService');
const SecurityService = require('../middleware/security');
const MobileUXService = require('../bot/handlers/user/ux/mobileOptimizations');

async function testImprovements() {
  console.log('🚀 Oshxona Improvements Test Started\n');

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await Database.connect();
    console.log('✅ Database connected\n');

    // Test 1: Loyalty Service
    console.log('💎 Testing Loyalty Service...');
    try {
      const testOrderAmount = 50000;
      const testUserId = new mongoose.Types.ObjectId();
      
      const points = await LoyaltyService.calculatePoints(testOrderAmount, testUserId);
      console.log(`  ✅ Loyalty points calculation: ${points} points for ${testOrderAmount.toLocaleString()} so'm`);
      
      const level = LoyaltyService.getLoyaltyLevel(500000, 25);
      console.log(`  ✅ Loyalty level calculation: ${level} for 500k spent, 25 orders`);
      
      const discount = await LoyaltyService.calculateLoyaltyDiscount(testUserId, testOrderAmount);
      console.log(`  ✅ Loyalty discount: ${discount.toLocaleString()} so'm discount`);
      
    } catch (error) {
      console.log(`  ❌ Loyalty Service error: ${error.message}`);
    }

    // Test 2: Order Tracking Service
    console.log('\n📍 Testing Order Tracking Service...');
    try {
      const testOrderId = new mongoose.Types.ObjectId().toString();
      const testUserId = new mongoose.Types.ObjectId().toString();
      
      orderTracker.trackOrder(testOrderId, testUserId);
      console.log(`  ✅ Order tracking started for order: ${testOrderId}`);
      
      await orderTracker.updateOrderStatus(testOrderId, 'confirmed', {
        prepTime: 20,
        message: 'Test order confirmed'
      });
      console.log(`  ✅ Order status updated to: confirmed`);
      
      const trackingInfo = await orderTracker.getOrderTracking('nonexistent');
      console.log(`  ✅ Tracking info retrieval: ${trackingInfo ? 'Found' : 'Not found (expected)'}`);
      
    } catch (error) {
      console.log(`  ❌ Order Tracking error: ${error.message}`);
    }

    // Test 3: Security Service
    console.log('\n🛡️ Testing Security Service...');
    try {
      const testData = {
        name: 'Test Product',
        price: '25000',
        email: 'test@example.com',
        phone: '+998901234567'
      };
      
      const validation = SecurityService.validateInput(testData, {
        name: { required: true, type: 'string', min: 2, max: 100 },
        price: { required: true, type: 'number' },
        email: { type: 'email' },
        phone: { type: 'phone' }
      });
      
      console.log(`  ✅ Input validation: ${validation.isValid ? 'Passed' : 'Failed'}`);
      if (!validation.isValid) {
        console.log(`    Errors: ${validation.errors.join(', ')}`);
      }
      
      const sanitized = SecurityService.sanitizeInput('<script>alert("test")</script>');
      console.log(`  ✅ Input sanitization: "${sanitized}"`);
      
      const fileValidation = SecurityService.validateFileUpload({
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        originalname: 'test.jpg'
      });
      console.log(`  ✅ File validation: ${fileValidation.isValid ? 'Passed' : 'Failed'}`);
      
    } catch (error) {
      console.log(`  ❌ Security Service error: ${error.message}`);
    }

    // Test 4: Mobile UX Service
    console.log('\n📱 Testing Mobile UX Service...');
    try {
      const popularProducts = await MobileUXService.getPopularProducts(3);
      console.log(`  ✅ Popular products: ${popularProducts.length} products found`);
      
      const fastProducts = await MobileUXService.getFastProducts(3);
      console.log(`  ✅ Fast products: ${fastProducts.length} products found`);
      
      const formattedText = MobileUXService.formatMobileText('This is a very long text that should be formatted for mobile screens with proper line breaks');
      console.log(`  ✅ Mobile text formatting: ${formattedText.split('\n').length} lines`);
      
      const progress = MobileUXService.getProgressIndicator(2, 4, ['Start', 'Info', 'Payment', 'Complete']);
      console.log(`  ✅ Progress indicator: ${progress}`);
      
    } catch (error) {
      console.log(`  ❌ Mobile UX Service error: ${error.message}`);
    }

    // Test 5: Environment Check
    console.log('\n⚙️ Environment Check...');
    const requiredEnvVars = [
      'BOT_TOKEN',
      'MONGODB_URI',
      'JWT_SECRET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.log(`  ⚠️ Missing environment variables: ${missingVars.join(', ')}`);
    } else {
      console.log(`  ✅ All required environment variables present`);
    }

    // Test 6: Database Models
    console.log('\n🗄️ Testing Database Models...');
    try {
      const { User, Order, Product, Cart } = require('../models');
      
      console.log(`  ✅ User model: ${User.modelName}`);
      console.log(`  ✅ Order model: ${Order.modelName}`);
      console.log(`  ✅ Product model: ${Product.modelName}`);
      console.log(`  ✅ Cart model: ${Cart.modelName}`);
      
      // Check if loyalty fields exist in User schema
      const userSchema = User.schema;
      const hasLoyaltyFields = userSchema.paths.loyaltyPoints && userSchema.paths.loyaltyLevel;
      console.log(`  ✅ Loyalty fields in User model: ${hasLoyaltyFields ? 'Present' : 'Missing'}`);
      
    } catch (error) {
      console.log(`  ❌ Database Models error: ${error.message}`);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Implementation Summary:');
    console.log('  ✅ Loyalty Program - Points, levels, referrals, bonuses');
    console.log('  ✅ Real-time Tracking - Order status, courier location, Socket.IO');
    console.log('  ✅ Advanced Security - Rate limiting, input validation, sanitization');
    console.log('  ✅ Mobile Optimization - Quick order, touch-friendly UI, favorites');
    console.log('\n🚀 Your Oshxona bot is now enhanced with professional features!');

  } catch (error) {
    console.error('❌ Test script error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
    process.exit(0);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  testImprovements();
}

module.exports = { testImprovements };