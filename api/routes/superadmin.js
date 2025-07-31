const express = require('express');
const { User } = require('../../models');
const { Branch } = require('../../models');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply SuperAdmin middleware to all routes
router.use(authenticateToken);
router.use(requireSuperAdmin);

// ==============================================
// 👥 ADMIN MANAGEMENT
// ==============================================

// Get all admins
router.get('/admins', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const admins = await User.find({ 
      role: 'admin',
      isActive: true 
    })
    .populate('branch', 'name address')
    .select('-password')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

    const total = await User.countDocuments({ role: 'admin', isActive: true });

    res.json({
      success: true,
      data: {
        admins,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Adminlarni olishda xatolik!'
    });
  }
});

// Create new admin
router.post('/admins', async (req, res) => {
  try {
    const { firstName, lastName, email, password, branchId } = req.body;

    // Validation
    if (!firstName || !email || !password || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'Barcha majburiy maydonlarni to\'ldiring!'
      });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email allaqachon ishlatilmoqda!'
      });
    }

    // Check if branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(400).json({
        success: false,
        message: 'Filial topilmadi!'
      });
    }

    // Create admin
    const admin = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save middleware
      role: 'admin',
      branch: branchId,
      isActive: true
    });

    await admin.save();

    // Return admin without password
    const adminData = await User.findById(admin._id)
      .populate('branch', 'name address')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'Admin muvaffaqiyatli yaratildi!',
      data: { admin: adminData }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin yaratishda xatolik!'
    });
  }
});

// Update admin
router.put('/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, branchId, isActive } = req.body;

    const admin = await User.findById(id);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({
        success: false,
        message: 'Admin topilmadi!'
      });
    }

    // Update fields
    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;
    if (email) admin.email = email.toLowerCase();
    if (branchId) admin.branch = branchId;
    if (typeof isActive === 'boolean') admin.isActive = isActive;

    await admin.save();

    const updatedAdmin = await User.findById(id)
      .populate('branch', 'name address')
      .select('-password');

    res.json({
      success: true,
      message: 'Admin muvaffaqiyatli yangilandi!',
      data: { admin: updatedAdmin }
    });

  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin yangilashda xatolik!'
    });
  }
});

// Delete admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findById(id);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({
        success: false,
        message: 'Admin topilmadi!'
      });
    }

    // Soft delete
    admin.isActive = false;
    await admin.save();

    res.json({
      success: true,
      message: 'Admin muvaffaqiyatli o\'chirildi!'
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin o\'chirishda xatolik!'
    });
  }
});

// ==============================================
// 🏢 BRANCH MANAGEMENT
// ==============================================

// Get all branches
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { branches }
    });

  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Filiallarni olishda xatolik!'
    });
  }
});

// Create new branch
router.post('/branches', async (req, res) => {
  try {
    const { name, address, phone, workingHours, settings } = req.body;

    if (!name || !address || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Barcha majburiy maydonlarni to\'ldiring!'
      });
    }

    const branch = new Branch({
      name,
      address,
      phone,
      workingHours,
      settings,
      isActive: true
    });

    await branch.save();

    res.status(201).json({
      success: true,
      message: 'Filial muvaffaqiyatli yaratildi!',
      data: { branch }
    });

  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Filial yaratishda xatolik!'
    });
  }
});

// Update branch
router.put('/branches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const branch = await Branch.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Filial topilmadi!'
      });
    }

    res.json({
      success: true,
      message: 'Filial muvaffaqiyatli yangilandi!',
      data: { branch }
    });

  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Filial yangilashda xatolik!'
    });
  }
});

// ==============================================
// 📊 SUPERADMIN DASHBOARD
// ==============================================

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalBranches,
      totalAdmins,
      totalUsers,
      totalCouriers,
      activeBranches,
      activeAdmins
    ] = await Promise.all([
      Branch.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'courier' }),
      Branch.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalBranches,
          totalAdmins,
          totalUsers,
          totalCouriers,
          activeBranches,
          activeAdmins
        }
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard ma\'lumotlarini olishda xatolik!'
    });
  }
});

module.exports = router;