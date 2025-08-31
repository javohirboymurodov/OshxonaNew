const { Category } = require('../../../models');

/**
 * Admin Category Controller
 * Admin kategoriya operatsiyalari
 */

/**
 * Kategoriyalar ro'yxatini olish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getCategories(req, res) {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: { 
        items: categories, 
        categories 
      } 
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kategoriyalarni olishda xatolik!' 
    });
  }
}

/**
 * Yangi kategoriya yaratish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function createCategory(req, res) {
  try {
    const categoryData = { ...req.body };
    const category = new Category(categoryData);
    await category.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Kategoriya muvaffaqiyatli yaratildi!', 
      data: category 
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kategoriya yaratishda xatolik!' 
    });
  }
}

/**
 * Kategoriyani yangilash
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body, { 
      new: true, 
      runValidators: true 
    });
    
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kategoriya topilmadi!' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Kategoriya muvaffaqiyatli yangilandi!', 
      data: category 
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kategoriya yangilashda xatolik!' 
    });
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory
};