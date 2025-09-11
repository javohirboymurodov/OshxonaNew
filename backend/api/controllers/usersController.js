const { User } = require('../../models');
const bcrypt = require('bcryptjs');

async function list(req, res) {
  try {
    const { page = 1, limit = 15, role, search } = req.query;
    const branchId = req.user.branch;
    const query = {};
    if (role && role !== 'all') query.role = role;
    if (req.user.role === 'admin') {
      query.$or = [{ branch: branchId }, { role: 'user' }];
    }
    if (search && String(search).trim().length > 0) {
      const text = String(search).trim();
      const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const numericId = /^\d+$/.test(text) ? Number(text) : null;
      query.$and = (query.$and || []).concat([{ $or: [ { firstName: { $regex: regex } }, { lastName: { $regex: regex } }, { email: { $regex: regex } }, { phone: { $regex: regex } }, ...(numericId !== null ? [{ telegramId: numericId }] : []) ] }]);
    }
    const users = await User.find(query)
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');
    const total = await User.countDocuments(query);
    // Map lastOrderDate for UI (from stats.lastOrderDate if present)
    const enriched = users.map(u => {
      const obj = u.toObject();
      obj.lastOrderDate = obj.stats?.lastOrderDate || null;
      obj.totalOrders = obj.stats?.totalOrders ?? obj.totalOrders ?? 0;
      obj.totalSpent = obj.stats?.totalSpent ?? obj.totalSpent ?? 0;
      return obj;
    });

    res.json({ success: true, data: { users: enriched, pagination: { current: parseInt(page), pageSize: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
  } catch (e) { res.status(500).json({ success: false, message: 'Foydalanuvchilarni olishda xatolik!' }); }
}

async function create(req, res) {
  try {
    const { firstName, lastName, email, phone, role = 'user', password, branchId, courierInfo } = req.body;
    if (!firstName || String(firstName).trim().length === 0) return res.status(400).json({ success: false, message: 'Ism kiritilishi shart!' });
    const data = { firstName: String(firstName).trim(), lastName: lastName ? String(lastName).trim() : undefined, email: email ? String(email).toLowerCase().trim() : undefined, phone, role, password, branch: role === 'admin' ? branchId : undefined };
    if (role === 'courier') { const vehicleType = courierInfo?.vehicleType || 'bike'; data.courierInfo = { vehicleType, isOnline: false, isAvailable: true }; }
    if (role === 'admin') {
      if (!email || !password) return res.status(400).json({ success: false, message: 'Admin uchun email va parol majburiy!' });
      if (!branchId) return res.status(400).json({ success: false, message: 'Admin uchun filial (branch) majburiy!' });
      try { const { Branch } = require('../../models'); const exists = await Branch.findById(branchId).select('_id'); if (!exists) return res.status(400).json({ success: false, message: 'Berilgan filial topilmadi!' }); } catch {}
    }
    const user = new User(data); await user.save();
    const created = await User.findById(user._id).select('-password');
    res.status(201).json({ success: true, message: 'Foydalanuvchi yaratildi', data: { user: created } });
  } catch (error) {
    if (error?.code === 11000) return res.status(400).json({ success: false, message: 'Email yoki Telegram ID allaqachon mavjud!' });
    if (error?.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Ma\'lumotlarda xatolik', errors: Object.values(error.errors).map((e) => e.message) });
    res.status(500).json({ success: false, message: 'Foydalanuvchi yaratishda xatolik!' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    if (update.email) update.email = String(update.email).toLowerCase().trim();
    if (update.firstName) update.firstName = String(update.firstName).trim();
    if (update.lastName) update.lastName = String(update.lastName).trim();
    if (update.branchId && !update.branch) { update.branch = update.branchId; delete update.branchId; }
    if (update.password2) delete update.password2;
    if (update.password && String(update.password).trim().length > 0) update.password = await bcrypt.hash(String(update.password).trim(), 12);
    else delete update.password;
    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' });
    res.json({ success: true, message: 'Foydalanuvchi yangilandi', data: { user } });
  } catch (e) { res.status(500).json({ success: false, message: 'Foydalanuvchini yangilashda xatolik!' }); }
}

async function remove(req, res) {
  try { const { id } = req.params; const user = await User.findByIdAndDelete(id); if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); res.json({ success: true, message: 'Foydalanuvchi o\'chirildi' }); } catch (e) { res.status(500).json({ success: false, message: 'Foydalanuvchini o\'chirishda xatolik!' }); }
}

async function toggleStatus(req, res) {
  try { const { id } = req.params; const user = await User.findById(id); if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); user.isActive = !user.isActive; await user.save(); res.json({ success: true, message: `Foydalanuvchi ${user.isActive ? 'faollashtirildi' : 'faolsizlashtirildi'}` }); } catch (e) { res.status(500).json({ success: false, message: 'Holatni o\'zgartirishda xatolik!' }); }
}

async function block(req, res) {
  try { const { id } = req.params; const user = await User.findByIdAndUpdate(id, { isBlocked: true }, { new: true }); if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); res.json({ success: true, message: 'Foydalanuvchi bloklandi' }); } catch (e) { res.status(500).json({ success: false, message: 'Bloklashda xatolik!' }); }
}

async function unblock(req, res) {
  try { const { id } = req.params; const user = await User.findByIdAndUpdate(id, { isBlocked: false }, { new: true }); if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi!' }); res.json({ success: true, message: 'Foydalanuvchi blokdan chiqarildi' }); } catch (e) { res.status(500).json({ success: false, message: 'Blokdan chiqarishda xatolik!' }); }
}

async function stats(req, res) {
  try {
    const branchId = req.user.branch; const query = {};
    if (req.user.role === 'admin') query.$or = [{ branch: branchId }, { role: 'user' }];
    const [ total, active, blocked, admins, couriers, thisMonth ] = await Promise.all([
      User.countDocuments(query),
      User.countDocuments({ ...query, isActive: true }),
      User.countDocuments({ ...query, isBlocked: true }),
      User.countDocuments({ ...query, role: 'admin' }),
      User.countDocuments({ ...query, role: 'courier' }),
      User.countDocuments({ ...query, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } })
    ]);
    res.json({ success: true, data: { stats: { total, active, blocked, admins, couriers, newThisMonth: thisMonth } } });
  } catch (e) { res.status(500).json({ success: false, message: 'Statistikani olishda xatolik!' }); }
}

module.exports = { list, create, update, remove, toggleStatus, block, unblock, stats };


