const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const PDFService = require('../../services/pdfService');

const { authenticateToken, requireAdmin } = require('../../middlewares/apiAuth');
const { Table } = require('../../models');

// Allow token via query (?token=...) for direct PDF link downloads
router.use((req, _res, next) => {
  if (!req.headers.authorization && req.query && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

// Auth for all table routes
router.use(authenticateToken, requireAdmin);

// GET /api/tables
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const query = {};
    // Admin o'z filialini ko'radi, superadmin hammasini
    if (req.user.role !== 'superadmin' && req.user.branch) {
      query.branch = req.user.branch;
    }
    if (search) {
      const num = Number(search);
      if (!Number.isNaN(num)) query.number = num;
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Table.find(query).sort({ number: 1 }).skip(skip).limit(Number(limit)),
      Table.countDocuments(query)
    ]);
    res.json({ success: true, data: { items, pagination: { total, page: Number(page), pageSize: Number(limit) } } });
  } catch (e) {
    console.error('tables list error:', e);
    res.status(500).json({ success: false, message: 'Stollarni yuklashda xatolik' });
  }
});

// POST /api/tables
router.post('/', async (req, res) => {
  try {
    const { number, capacity = 2, location = '', branch } = req.body || {};
    if (!number) return res.status(400).json({ success: false, message: 'Stol raqami kerak' });
    const branchId = branch || req.user?.branch;
    if (!branchId && req.user.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Filial talab qilinadi' });
    }
    const exists = await Table.findOne({ number, ...(branchId ? { branch: branchId } : {}) });
    if (exists) return res.status(409).json({ success: false, message: 'Bu stol raqami allaqachon mavjud' });
    const qrCode = `table_${number}_b_${String(branchId)}`;
    const table = new Table({ number, capacity, location, branch: branchId, qrCode });
    await table.save();
    res.json({ success: true, data: table });
  } catch (e) {
    console.error('tables create error:', e);
    res.status(500).json({ success: false, message: 'Stol yaratishda xatolik' });
  }
});

// PATCH /api/tables/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { capacity, location, isActive } = req.body || {};
    const updates = {};
    if (capacity != null) updates.capacity = capacity;
    if (location != null) updates.location = location;
    if (isActive != null) updates.isActive = isActive;
    const table = await Table.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi' });
    res.json({ success: true, data: table });
  } catch (e) {
    console.error('tables update error:', e);
    res.status(500).json({ success: false, message: 'Stolni yangilashda xatolik' });
  }
});

// DELETE /api/tables/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const table = await Table.findByIdAndDelete(id);
    if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi' });
    res.json({ success: true, message: 'O\'chirildi' });
  } catch (e) {
    console.error('tables delete error:', e);
    res.status(500).json({ success: false, message: 'Stolni o\'chirishda xatolik' });
  }
});

// GET /api/tables/:id/qr-pdf
router.get('/:id/qr-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const table = await Table.findById(id);
    if (!table) return res.status(404).json({ success: false, message: 'Stol topilmadi' });

    const botUsername = process.env.BOT_USERNAME || 'your_bot';
    // Branchga bog'lash: table + branch kombinatsiyasi
    const startPayload = `table_${table.number}_b_${String(table.branch)}`;
    const link = `https://t.me/${botUsername}?start=${encodeURIComponent(startPayload)}`;

    const qrPngBuffer = await QRCode.toBuffer(link, { width: 600, margin: 1 });
    const pdf = await PDFService.generateTableQrPdf({ tableNumber: table.number, link, qrPngBuffer });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${pdf.filename}`);
    return res.end(pdf.buffer);
  } catch (e) {
    console.error('tables qr-pdf error:', e);
    res.status(500).json({ success: false, message: 'QR PDF yaratishda xatolik' });
  }
});

module.exports = router;


