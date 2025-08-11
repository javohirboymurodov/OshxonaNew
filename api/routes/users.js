const express = require('express');
const { User } = require('../../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

// Get users with pagination + search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 15, role, search } = req.query;
    const branchId = req.user.branch;

    let query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Admin faqat o'z filialidagi foydalanuvchilarni ko'rishi
    if (req.user.role === 'admin') {
      query.$or = [
        { branch: branchId },
        { role: 'user' } // Barcha oddiy userlar
      ];
    }

    // Live search: firstName, lastName, email, phone, telegramId
    if (search && String(search).trim().length > 0) {
      const text = String(search).trim();
      const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const numericId = /^\d+$/.test(text) ? Number(text) : null;
      query.$and = (query.$and || []).concat([{
        $or: [
          { firstName: { $regex: regex } },
          { lastName: { $regex: regex } },
          { email: { $regex: regex } },
          { phone: { $regex: regex } },
          ...(numericId !== null ? [{ telegramId: numericId }] : [])
        ]
      }]);
    }

    const users = await User.find(query)
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchilarni olishda xatolik!'
    });
  }
});

// Create user (admin/courier/user)
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role = 'user',
      password,
      branchId,
      courierInfo
    } = req.body;

    if (!firstName || String(firstName).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Ism kiritilishi shart!' });
    }

    const data = {
      firstName: String(firstName).trim(),
      lastName: lastName ? String(lastName).trim() : undefined,
      email: email ? String(email).toLowerCase().trim() : undefined,
      phone,
      role,
      password,
      branch: role === 'admin' ? (branchId || req.user.branch) : undefined,
    };

    // Courier specific
    if (role === 'courier') {
      const vehicleType = courierInfo?.vehicleType || 'bike'; // default: bike
      data.courierInfo = {
        vehicleType,
        isOnline: false,
        isAvailable: true,
      };
    }

    // Admin specific
    if (role === 'admin' && !data.branch) {
      return res.status(400).json({ success: false, message: 'Admin uchun filial (branch) majburiy!' });
    }

    const user = new User(data);
    await user.save();

    const created = await User.findById(user._id).select('-password');
    res.status(201).json({ success: true, message: 'Foydalanuvchi yaratildi', data: { user: created } });
  } catch (error) {
    console.error('Create user error:', error);
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email yoki Telegram ID allaqachon mavjud!' });
    }
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Ma\'lumotlarda xatolik', errors: Object.values(error.errors).map((e) => e.message) });
    }
    res.status(500).json({ success: false, message: 'Foydalanuvchi yaratishda xatolik!' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    if (update.email) update.email = String(update.email).toLowerCase().trim();
    if (update.firstName) update.firstName = String(update.firstName).trim();
    if (update.lastName) update.lastName = String(update.lastName).trim();

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    res.json({ success: true, message: 'Foydalanuvchi yangilandi', data: { user } });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Foydalanuvchini yangilashda xatolik!' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    res.json({ success: true, message: 'Foydalanuvchi o\'chirildi' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Foydalanuvchini o\'chirishda xatolik!' });
  }
});

// Toggle active
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `Foydalanuvchi ${user.isActive ? 'faollashtirildi' : 'faolsizlashtirildi'}` });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ success: false, message: 'Holatni o\'zgartirishda xatolik!' });
  }
});

// Block / Unblock
router.patch('/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isBlocked: true }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    res.json({ success: true, message: 'Foydalanuvchi bloklandi' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Bloklashda xatolik!' });
  }
});

router.patch('/:id/unblock', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isBlocked: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    res.json({ success: true, message: 'Foydalanuvchi blokdan chiqarildi' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ success: false, message: 'Blokdan chiqarishda xatolik!' });
  }
});

// Get user stats
router.get('/stats', async (req, res) => {
  try {
    const branchId = req.user.branch;
    
    let query = {};
    if (req.user.role === 'admin') {
      query.$or = [
        { branch: branchId },
        { role: 'user' }
      ];
    }

    const [
      total,
      active,
      blocked,
      admins,
      couriers,
      thisMonth
    ] = await Promise.all([
      User.countDocuments(query),
      User.countDocuments({ ...query, isActive: true }),
      User.countDocuments({ ...query, isBlocked: true }),
      User.countDocuments({ ...query, role: 'admin' }),
      User.countDocuments({ ...query, role: 'courier' }),
      User.countDocuments({
        ...query,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          total,
          active,
          blocked,
          admins,
          couriers,
          newThisMonth: thisMonth
        }
      }
    });

  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik!'
    });
  }
});

module.exports = router;