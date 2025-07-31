const express = require('express');
const { User, Order } = require('../../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication
router.use(authenticateToken);

// ==============================================
// 🚚 COURIER MANAGEMENT (Admin only)
// ==============================================

// Get couriers for admin's branch
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query; // online, offline, available
    
    let query = { role: 'courier' };
    
    if (status === 'online') {
      query['courierInfo.isOnline'] = true;
    } else if (status === 'offline') {
      query['courierInfo.isOnline'] = false;
    } else if (status === 'available') {
      query['courierInfo.isAvailable'] = true;
      query['courierInfo.isOnline'] = true;
    }

    const couriers = await User.find(query)
      .select('firstName lastName phone courierInfo createdAt')
      .sort({ 'courierInfo.isOnline': -1, 'courierInfo.rating': -1 });

    res.json({
      success: true,
      data: { couriers }
    });

  } catch (error) {
    console.error('Get couriers error:', error);
    res.status(500).json({
      success: false,
      message: 'Haydovchilarni olishda xatolik!'
    });
  }
});

// Get courier details
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const courier = await User.findOne({ _id: id, role: 'courier' })
      .select('-password');

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Haydovchi topilmadi!'
      });
    }

    // Get courier's recent deliveries
    const recentDeliveries = await Order.find({ 
      courier: id,
      status: 'delivered'
    })
    .populate('user', 'firstName lastName')
    .sort({ deliveredAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: { 
        courier,
        recentDeliveries 
      }
    });

  } catch (error) {
    console.error('Get courier details error:', error);
    res.status(500).json({
      success: false,
      message: 'Haydovchi ma\'lumotlarini olishda xatolik!'
    });
  }
});

// Get available couriers for order assignment
router.get('/available/for-order', requireAdmin, async (req, res) => {
  try {
    const availableCouriers = await User.find({
      role: 'courier',
      'courierInfo.isOnline': true,
      'courierInfo.isAvailable': true,
      isActive: true
    })
    .select('firstName lastName phone courierInfo.vehicleType courierInfo.rating courierInfo.currentLocation')
    .sort({ 'courierInfo.rating': -1 });

    res.json({
      success: true,
      data: { couriers: availableCouriers }
    });

  } catch (error) {
    console.error('Get available couriers error:', error);
    res.status(500).json({
      success: false,
      message: 'Mavjud haydovchilarni olishda xatolik!'
    });
  }
});

// Update courier status (Admin can force offline)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const courier = await User.findOneAndUpdate(
      { _id: id, role: 'courier' },
      { isActive },
      { new: true }
    ).select('-password');

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Haydovchi topilmadi!'
      });
    }

    res.json({
      success: true,
      message: `Haydovchi ${isActive ? 'faollashtirildi' : 'faolsizlashtirildi'}!`,
      data: { courier }
    });

  } catch (error) {
    console.error('Update courier status error:', error);
    res.status(500).json({
      success: false,
      message: 'Haydovchi holatini yangilashda xatolik!'
    });
  }
});

module.exports = router;