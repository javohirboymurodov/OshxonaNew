const { Branch } = require('../../../models');

/**
 * Admin Branch Controller
 * Admin filial operatsiyalari
 */

/**
 * Filiallar ro'yxatini olish (Admin/SuperAdmin uchun)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getBranches(req, res) {
  try {
    let branches;
    
    if (req.user.role === 'superadmin') {
      // SuperAdmin barcha filiallarni ko'radi
      branches = await Branch.find({}).sort({ createdAt: -1 });
    } else {
      // Oddiy admin faqat o'z filialini ko'radi
      if (!req.user.branch) {
        return res.json({ 
          success: true, 
          data: { branches: [] } 
        });
      }
      
      const b = await Branch.findById(req.user.branch);
      branches = b ? [b] : [];
    }
    
    res.json({ 
      success: true, 
      data: { branches } 
    });
  } catch (error) {
    console.error('Get admin branches error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Filiallarni olishda xatolik!' 
    });
  }
}

module.exports = {
  getBranches
};