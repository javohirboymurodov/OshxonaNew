const FileService = require('../../services/fileService');
const { Product, Category, Branch } = require('../../models');
const BranchProduct = require('../../models/BranchProduct');
const Helpers = require('../../utils/helpers');

async function list(req, res) {
  try {
    const { page, limit, skip } = Helpers.getPaginationParams(req.query);
    const { category, branch, isActive, search, public: isPublic } = req.query;
    const filter = {};
    if (category) filter.categoryId = category;
    if (branch) filter.branch = branch;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameUz: { $regex: search, $options: 'i' } },
        { nameRu: { $regex: search, $options: 'i' } }
      ];
    }
    let products = await Product.find(filter)
      .populate('categoryId', 'name nameUz nameRu emoji')
      .populate('branch', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (isPublic === 'true' && branch) {
      const productIds = products.map(p => p._id);
      const bp = await BranchProduct.find({ branch, product: { $in: productIds } })
        .select('product isAvailable stock dailyLimit soldToday priceOverride');
      const map = new Map(bp.map(x => [String(x.product), x]));
      products = products
        .map(p => {
          const inv = map.get(String(p._id));
          if (!inv) return null;
          const availableByStock = inv.stock === null || inv.stock > 0;
          const availableByLimit = inv.dailyLimit === null || inv.soldToday < inv.dailyLimit;
          const isAvail = inv.isAvailable && availableByStock && availableByLimit && p.isActive;
          if (!isAvail) return null;
          const obj = p.toObject();
          if (inv.priceOverride !== null) obj.price = inv.priceOverride;
          obj.inventory = { isAvailable: inv.isAvailable, stock: inv.stock, dailyLimit: inv.dailyLimit, soldToday: inv.soldToday };
          return obj;
        })
        .filter(Boolean);
    }
    const total = isPublic === 'true' && branch ? products.length : await Product.countDocuments(filter);
    res.json({ success: true, data: { items: products, pagination: Helpers.buildPagination(total, page, limit) } });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Mahsulotlarni olishda xatolik!' });
  }
}

async function getOne(req, res) {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name nameUz nameRu emoji').populate('branch', 'name code');
    if (!product) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi!' });
    const { branch, public: isPublic } = req.query;
    if (isPublic === 'true' && branch) {
      const inv = await BranchProduct.findOne({ branch, product: product._id }).select('isAvailable stock dailyLimit soldToday priceOverride');
      if (!inv || !product.isActive) return res.status(404).json({ success: false, message: 'Mahsulot ushbu filialda mavjud emas' });
      const availableByStock = inv.stock === null || inv.stock > 0;
      const availableByLimit = inv.dailyLimit === null || inv.soldToday < inv.dailyLimit;
      if (!(inv.isAvailable && availableByStock && availableByLimit)) return res.status(404).json({ success: false, message: 'Mahsulot ushbu filialda tugagan' });
      const obj = product.toObject();
      if (inv.priceOverride !== null) obj.price = inv.priceOverride;
      obj.inventory = { isAvailable: inv.isAvailable, stock: inv.stock, dailyLimit: inv.dailyLimit, soldToday: inv.soldToday };
      return res.json({ success: true, data: obj });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Mahsulotni olishda xatolik!' });
  }
}

async function create(req, res) {
  try {
    const { name, nameUz, nameRu, description, price, categoryId, branch, ingredients, preparationTime } = req.body;
    if (!name || !price || !categoryId) return res.status(400).json({ success: false, message: 'Majburiy maydonlar: name, price, categoryId' });
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) return res.status(400).json({ success: false, message: 'Kategoriya topilmadi!' });
    let imageUrl = null; let imageFileName = null;
    if (req.file) { imageUrl = `/uploads/${req.file.filename}`; imageFileName = req.file.filename; }
    const product = new Product({
      name,
      nameUz: nameUz || name,
      nameRu: nameRu || name,
      description,
      price: parseFloat(price),
      categoryId,
      branch,
      ingredients: ingredients ? ingredients.split(',').map(i => i.trim()) : [],
      preparationTime: parseInt(preparationTime) || 15,
      image: imageUrl,
      imageFileName
    });
    await product.save();
    const populatedProduct = await Product.findById(product._id).populate('categoryId', 'name nameUz nameRu emoji').populate('branch', 'name code');
    res.status(201).json({ success: true, message: 'Mahsulot muvaffaqiyatli yaratildi!', data: populatedProduct });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Mahsulot yaratishda xatolik!' });
  }
}

async function update(req, res) {
  try {
    const productId = req.params.id;
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi!' });
    const updateData = { ...req.body };
    if (req.file) {
      if (existingProduct.imageFileName) FileService.deleteImage(existingProduct.imageFileName);
      else if (existingProduct.image) FileService.deleteImage(existingProduct.image);
      updateData.image = `/uploads/${req.file.filename}`;
      updateData.imageFileName = req.file.filename;
    }
    if (updateData.ingredients && typeof updateData.ingredients === 'string') updateData.ingredients = updateData.ingredients.split(',').map(i => i.trim());
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.preparationTime) updateData.preparationTime = parseInt(updateData.preparationTime);
    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true, runValidators: true })
      .populate('categoryId', 'name nameUz nameRu emoji')
      .populate('branch', 'name code');
    res.json({ success: true, message: 'Mahsulot muvaffaqiyatli yangilandi!', data: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Mahsulotni yangilashda xatolik!' });
  }
}

async function remove(req, res) {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi!' });
    if (product.imageFileName) FileService.deleteImage(product.imageFileName);
    else if (product.image) FileService.deleteImage(product.image);
    await Product.findByIdAndDelete(productId);
    res.json({ success: true, message: 'Mahsulot va rasm muvaffaqiyatli o\'chirildi!' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Mahsulotni o\'chirishda xatolik!' });
  }
}

module.exports = { list, getOne, create, update, remove };


