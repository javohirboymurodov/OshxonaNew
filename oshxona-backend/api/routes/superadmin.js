const express = require('express');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const SuperAdminController = require('../controllers/superadminController');

const router = express.Router();

// Apply SuperAdmin middleware to all routes
router.use(authenticateToken);
router.use(requireSuperAdmin);

// ==============================================
// 👥 ADMIN MANAGEMENT
// ==============================================

// Get all admins
router.get('/admins', SuperAdminController.listAdmins);

// Create new admin
router.post('/admins', SuperAdminController.createAdmin);

// Update admin
router.put('/admins/:id', SuperAdminController.updateAdmin);

// Delete admin
router.delete('/admins/:id', SuperAdminController.deleteAdmin);

// ==============================================
// 🏢 BRANCH MANAGEMENT
// ==============================================

// Get all branches
router.get('/branches', SuperAdminController.listBranches);

// Create new branch
router.post('/branches', SuperAdminController.createBranch);

// Update branch
router.put('/branches/:id', SuperAdminController.updateBranch);

// ==============================================
// 📊 SUPERADMIN DASHBOARD
// ==============================================

// Dashboard stats
router.get('/dashboard', SuperAdminController.getDashboard);

module.exports = router;