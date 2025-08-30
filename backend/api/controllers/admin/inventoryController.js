const { Product } = require('../../../models');
const BranchProduct = require('../../../models/BranchProduct');

/**
 * Admin Inventory Controller
 * Admin inventar operatsiyalari
 */

/**
 * Inventarni yangilash (Branch-Product state)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateInventory(req, res) {
  try {
    const { branchId, productId } = req.params;
    const { isAvailable, priceOverride } = req.body;
    
    if (req.user.role === 'admin' && String(req.user.branch) !== String(branchId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Ushbu filial uchun ruxsat yo\'q' 
      });
    }
    
    const product = await Product.findById(productId).select('_id isActive');
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mahsulot topilmadi' 
      });
    }
    
    const update = {};
    if (isAvailable !== undefined) update.isAvailable = !!isAvailable;
    if (priceOverride !== undefined) {
      update.priceOverride = priceOverride === null ? null : Number(priceOverride);
    }
    
    const inv = await BranchProduct.findOneAndUpdate(
      { branch: branchId, product: productId }, 
      { 
        $set: update, 
        $setOnInsert: { branch: branchId, product: productId } 
      }, 
      { new: true, upsert: true }
    );
    
    res.json({ 
      success: true, 
      message: 'Inventar yangilandi', 
      data: inv 
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Inventarni yangilashda xatolik' 
    });
  }
}

/**
 * Inventar ma'lumotlarini olish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getInventory(req, res) {
  try {
    const { branchId } = req.params;
    const productIdsParam = req.query.productIds;
    
    if (req.user.role === 'admin' && String(req.user.branch) !== String(branchId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Ushbu filial uchun ruxsat yo\'q' 
      });
    }
    
    const filter = { branch: branchId };
    
    if (productIdsParam) {
      let ids = [];
      if (Array.isArray(productIdsParam)) {
        ids = productIdsParam;
      } else if (typeof productIdsParam === 'string') {
        ids = productIdsParam.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (ids.length > 0) filter.product = { $in: ids };
    }
    
    const list = await BranchProduct.find(filter)
      .select('product isAvailable priceOverride');
    
    res.json({ 
      success: true, 
      data: { items: list } 
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Inventarni olishda xatolik' 
    });
  }
}

module.exports = {
  updateInventory,
  getInventory
};