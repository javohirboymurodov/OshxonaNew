const express = require('express');
const { authenticateToken, requireAdmin } = require('../../middlewares/apiAuth');
const UsersController = require('../controllers/usersController');

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

// Get users with pagination + search
router.get('/', UsersController.list);

// Create user (admin/courier/user)
router.post('/', UsersController.create);

// Update user
router.put('/:id', UsersController.update);

// Delete user
router.delete('/:id', UsersController.remove);

// Toggle active
router.patch('/:id/toggle-status', UsersController.toggleStatus);

// Block / Unblock
router.patch('/:id/block', UsersController.block);

router.patch('/:id/unblock', UsersController.unblock);

// Get user stats
router.get('/stats', UsersController.stats);

module.exports = router;