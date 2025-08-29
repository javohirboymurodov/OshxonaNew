const { Category, Product } = require('../../models');
const Helpers = require('../../utils/helpers');

async function list(req, res) {
  try {
    const { page, limit, skip } = Helpers.getPaginationParams(req.query);
    const filter = {};
    if (req.query.search) {
      const text = String(req.query.search).trim();
      filter.$or = [
        { name: { $regex: text, $options: 'i' } },
        { nameUz: { $regex: text, $options: 'i' } },
        { nameRu: { $regex: text, $options: 'i' } },
      ];
    }
    if (req.query.isVisible !== undefined) filter.isVisible = req.query.isVisible === 'true';
    const items = await Category.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit);
    const total = await Category.countDocuments(filter);
    res.json({ success: true, data: { items, pagination: Helpers.buildPagination(total, page, limit) } });
  } catch (e) {
    console.error('Categories list error:', e);
    res.status(500).json({ success: false, message: 'Kategoriyalarni olishda xatolik' });
  }
}

async function getOne(req, res) {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Kategoriya topilmadi' });
    res.json({ success: true, data: cat });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kategoriya ma\'lumotida xatolik' });
  }
}

async function create(req, res) {
  try {
    const body = req.body || {};
    const cat = new Category(body);
    await cat.save();
    res.status(201).json({ success: true, data: cat });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kategoriya yaratishda xatolik' });
  }
}

async function update(req, res) {
  try {
    const updates = req.body || {};
    const cat = await Category.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!cat) return res.status(404).json({ success: false, message: 'Kategoriya topilmadi' });
    res.json({ success: true, data: cat });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kategoriya yangilashda xatolik' });
  }
}

async function remove(req, res) {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Kategoriya topilmadi' });
    // ixtiyoriy: bog'liq mahsulotlarni soft-hide qilish yoki ogohlantirish
    res.json({ success: true, message: 'Kategoriya o\'chirildi' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Kategoriya o\'chirishda xatolik' });
  }
}

async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Kategoriya topilmadi!' });
    category.isActive = !category.isActive;
    await category.save();
    res.json({ success: true, message: `Kategoriya ${category.isActive ? 'faollashtirildi' : 'o\'chirildi'}!`, data: category });
  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json({ success: false, message: 'Kategoriya holatini o\'zgartirishda xatolik!' });
  }
}

async function toggleVisibility(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Kategoriya topilmadi!' });
    category.isVisible = !category.isVisible;
    await category.save();
    res.json({ success: true, message: `Kategoriya ${category.isVisible ? 'ko\'rinadigan' : 'yashirildi'}!`, data: category });
  } catch (error) {
    console.error('Toggle category visibility error:', error);
    res.status(500).json({ success: false, message: 'Kategoriya ko\'rinishini o\'zgartirishda xatolik!' });
  }
}

async function reorder(req, res) {
  try {
    const { categoryIds } = req.body;
    if (!Array.isArray(categoryIds)) return res.status(400).json({ success: false, message: 'Kategoriya ID\'lari array bo\'lishi kerak!' });
    const updatePromises = categoryIds.map((categoryId, index) => Category.findByIdAndUpdate(categoryId, { sortOrder: index + 1 }));
    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Kategoriyalar tartibi yangilandi!' });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({ success: false, message: 'Kategoriyalar tartibini yangilashda xatolik!' });
  }
}

async function updateStats(req, res) {
  try {
    const { id } = req.params; const { totalProducts, totalOrders, totalViews } = req.body;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Kategoriya topilmadi!' });
    const updateData = {};
    if (totalProducts !== undefined) updateData['stats.totalProducts'] = totalProducts;
    if (totalOrders !== undefined) updateData['stats.totalOrders'] = totalOrders;
    if (totalViews !== undefined) updateData['stats.totalViews'] = totalViews;
    const updatedCategory = await Category.findByIdAndUpdate(id, { $inc: updateData }, { new: true });
    res.json({ success: true, message: 'Kategoriya statistikasi yangilandi!', data: updatedCategory });
  } catch (error) {
    console.error('Update category stats error:', error);
    res.status(500).json({ success: false, message: 'Kategoriya statistikasini yangilashda xatolik!' });
  }
}

module.exports = { list, getOne, create, update, remove, toggleStatus, toggleVisibility, reorder, updateStats };


