/*
  Import JSON datasets from scripts/data into current Mongo models.
  Usage:
    node scripts/import_json.js

  Env:
    MONGODB_URI (optional). Defaults to mongodb://127.0.0.1:27017/pizza_bot
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load models (must be required after mongoose)
const {
  User,
  Product,
  Order,
  Category,
  Cart,
  Table,
  DeliveryZone,
  Review,
  Branch,
} = require('../models');

const DATA_DIR = path.join(__dirname, 'data');

function readJson(fileName) {
  const p = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(raw);
    // mongoexport may store as array or line-delimited
    if (Array.isArray(json)) return json;
    if (typeof json === 'object') return json.data || [];
  } catch (e) {
    console.error(`❌ JSON read error ${fileName}:`, e.message);
  }
  return [];
}

function toNumberOrNull(v) {
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function normalizeStatus(s) {
  const m = String(s || 'pending').toLowerCase();
  const allowed = [
    'pending','confirmed','preparing','ready','assigned','on_delivery','delivered','picked_up','completed','cancelled','refunded'
  ];
  if (allowed.includes(m)) return m;
  // basic mappings
  if (m === 'delivering') return 'on_delivery';
  if (m === 'pickedup' || m === 'picked-up') return 'picked_up';
  if (m === 'done' || m === 'complete' || m === 'finished') return 'completed';
  return 'pending';
}

function normalizeOrderType(t) {
  const m = String(t || '').toLowerCase();
  if (['delivery','pickup','dine_in','table'].includes(m)) return m;
  if (m === 'dine' || m === 'preorder') return 'dine_in';
  if (m === 'qr' || m === 'table_qr' || m === 'dine_in_qr') return 'table';
  return 'delivery';
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pizza_bot';
  await mongoose.connect(uri, { autoIndex: true });
  console.log('✅ Connected to MongoDB');

  // Read datasets
  const usersJson = readJson('pizza_bot.users.json');
  const branchesJson = readJson('pizza_bot.branches.json');
  const categoriesJson = readJson('pizza_bot.categories.json');
  const productsJson = readJson('pizza_bot.products.json');
  const tablesJson = readJson('pizza_bot.tables.json');
  const zonesJson = readJson('pizza_bot.deliveryzones.json');
  const ordersJson = readJson('pizza_bot.orders.json');
  const cartsJson = readJson('pizza_bot.carts.json');
  const reviewsJson = readJson('pizza_bot.reviews.json');

  // Maps from old _id (string) to new ObjectId
  const idMap = {
    user: new Map(),
    branch: new Map(),
    category: new Map(),
    product: new Map(),
    table: new Map(),
    zone: new Map(),
  };

  // 1) Branches
  console.log('🏢 Importing branches...');
  for (const b of branchesJson) {
    const doc = new Branch({
      name: b.name || b.title || 'Filial',
      address: {
        street: b.address?.street || b.street || '',
        city: b.address?.city || b.city || '',
        district: b.address?.district || b.district || '',
        coordinates: {
          latitude: toNumberOrNull(b.address?.coordinates?.latitude ?? b.latitude),
          longitude: toNumberOrNull(b.address?.coordinates?.longitude ?? b.longitude),
        },
      },
      phone: b.phone || '',
      isActive: b.isActive !== false,
      workingHours: b.workingHours || undefined,
      settings: {
        minOrderAmount: toNumberOrNull(b.settings?.minOrderAmount) ?? 0,
        deliveryFee: toNumberOrNull(b.settings?.deliveryFee) ?? 0,
        freeDeliveryAmount: toNumberOrNull(b.settings?.freeDeliveryAmount) ?? 0,
        maxDeliveryDistance: toNumberOrNull(b.settings?.maxDeliveryDistance) ?? 15,
      },
    });
    await doc.save();
    idMap.branch.set(String(b._id || b.id || doc._id), doc._id);
  }
  console.log(`   → ${idMap.branch.size} branches`);

  // 2) Users
  console.log('👥 Importing users...');
  for (const u of usersJson) {
    try {
      const role = (u.role || 'user').toLowerCase();
      const user = new User({
        firstName: u.firstName || u.name || 'User',
        lastName: u.lastName || '',
        email: u.email || undefined,
        phone: u.phone || undefined,
        telegramId: toNumberOrNull(u.telegramId) || undefined,
        role: ['superadmin','admin','courier','user'].includes(role) ? role : 'user',
        isActive: u.isActive !== false,
        isBlocked: u.isBlocked === true,
        branch: u.branch ? (idMap.branch.get(String(u.branch)) || undefined) : undefined,
        password: u.password || 'changeme123', // will be hashed by model
      });
      await user.save();
      idMap.user.set(String(u._id || u.id || user._id), user._id);
    } catch (e) {
      console.warn('   user import warn:', u.email || u.firstName, e.message);
    }
  }
  console.log(`   → ${idMap.user.size} users`);

  // 3) Categories
  console.log('📂 Importing categories...');
  for (const c of categoriesJson) {
    const cat = new Category({
      name: c.name || 'Category',
      nameUz: c.nameUz || c.name || undefined,
      nameRu: c.nameRu || undefined,
      nameEn: c.nameEn || undefined,
      emoji: c.emoji || undefined,
      description: c.description || undefined,
      sortOrder: toNumberOrNull(c.sortOrder) || 0,
      isActive: c.isActive !== false,
    });
    await cat.save();
    idMap.category.set(String(c._id || c.id || cat._id), cat._id);
  }
  console.log(`   → ${idMap.category.size} categories`);

  // 4) Products
  console.log('🍕 Importing products...');
  for (const p of productsJson) {
    try {
      const prod = new Product({
        name: p.name,
        description: p.description || undefined,
        price: toNumberOrNull(p.price) || 0,
        originalPrice: toNumberOrNull(p.originalPrice) || undefined,
        categoryId: idMap.category.get(String(p.categoryId)) || undefined,
        branch: p.branch ? (idMap.branch.get(String(p.branch)) || undefined) : undefined,
        isActive: p.isActive !== false,
        isAvailable: p.isAvailable !== false,
        image: p.image || undefined,
        tags: Array.isArray(p.tags) ? p.tags : [],
        preparationTime: toNumberOrNull(p.preparationTime) || 15,
      });
      await prod.save();
      idMap.product.set(String(p._id || p.id || prod._id), prod._id);
    } catch (e) {
      console.warn('   product import warn:', p.name, e.message);
    }
  }
  console.log(`   → ${idMap.product.size} products`);

  // 5) Tables
  console.log('🪑 Importing tables...');
  for (const t of tablesJson) {
    try {
      const branchId = t.branch ? (idMap.branch.get(String(t.branch)) || undefined) : undefined;
      const qrCode = `table_${t.number}_b_${String(branchId || '')}`;
      const table = new Table({ number: t.number, capacity: toNumberOrNull(t.capacity) || 2, location: t.location || '', branch: branchId, qrCode });
      await table.save();
      idMap.table.set(String(t._id || t.id || table._id), table._id);
    } catch (e) {
      console.warn('   table import warn:', t.number, e.message);
    }
  }
  console.log(`   → ${idMap.table.size} tables`);

  // 6) Delivery zones
  console.log('🗺️  Importing delivery zones...');
  for (const z of zonesJson) {
    try {
      const dz = new DeliveryZone({
        name: z.name || 'Zone',
        description: z.description || undefined,
        coordinates: (z.coordinates || []).map((c) => ({ latitude: toNumberOrNull(c.latitude), longitude: toNumberOrNull(c.longitude) })).filter((c) => c.latitude != null && c.longitude != null),
        deliveryFee: toNumberOrNull(z.deliveryFee) || 0,
        freeDeliveryAmount: toNumberOrNull(z.freeDeliveryAmount) || 0,
        estimatedTime: toNumberOrNull(z.estimatedTime) || 40,
        workingHours: z.workingHours || undefined,
        priority: toNumberOrNull(z.priority) || 1,
        isActive: z.isActive !== false,
        branch: z.branch ? (idMap.branch.get(String(z.branch)) || undefined) : undefined,
      });
      await dz.save();
      idMap.zone.set(String(z._id || z.id || dz._id), dz._id);
    } catch (e) {
      console.warn('   zone import warn:', z.name, e.message);
    }
  }
  console.log(`   → ${idMap.zone.size} zones`);

  // 7) Orders (best-effort mapping)
  console.log('📦 Importing orders...');
  let importedOrders = 0;
  for (const o of ordersJson) {
    try {
      const userId = o.user ? (idMap.user.get(String(o.user)) || undefined) : undefined;
      const items = Array.isArray(o.items) ? o.items.map((it) => {
        const mappedProd = idMap.product.get(String(it.product)) || null;
        return {
          product: mappedProd,
          productName: it.productName || it.name || 'Mahsulot',
          quantity: toNumberOrNull(it.quantity) || 1,
          price: toNumberOrNull(it.price) || 0,
          totalPrice: toNumberOrNull(it.totalPrice) || ((toNumberOrNull(it.price) || 0) * (toNumberOrNull(it.quantity) || 1)),
        };
      }) : [];

      const orderType = normalizeOrderType(o.orderType);
      const status = normalizeStatus(o.status);

      const deliveryInfo = o.deliveryInfo || {};
      const location = deliveryInfo.location || o.location || {};
      const locObj = (location.latitude != null && location.longitude != null)
        ? { latitude: toNumberOrNull(location.latitude), longitude: toNumberOrNull(location.longitude) }
        : undefined;

      const doc = new Order({
        orderId: String(o.orderId || o.orderNumber || 'ORD' + Date.now()),
        user: userId,
        branch: o.branch ? (idMap.branch.get(String(o.branch)) || undefined) : undefined,
        items,
        orderType,
        customerInfo: { name: o.customerInfo?.name || o.customerName || '', phone: o.customerInfo?.phone || o.phone || '' },
        subtotal: toNumberOrNull(o.subtotal) || items.reduce((s, it) => s + (it.totalPrice || 0), 0),
        deliveryFee: toNumberOrNull(o.deliveryFee) || 0,
        serviceFee: toNumberOrNull(o.serviceFee) || 0,
        discount: toNumberOrNull(o.discount) || 0,
        total: toNumberOrNull(o.total) || (toNumberOrNull(o.subtotal) || items.reduce((s, it) => s + (it.totalPrice || 0), 0)) + (toNumberOrNull(o.deliveryFee) || 0),
        paymentMethod: (o.paymentMethod || 'cash').toLowerCase(),
        paymentStatus: (o.paymentStatus || 'pending').toLowerCase(),
        status,
        deliveryInfo: orderType === 'delivery' ? { address: deliveryInfo.address || '', location: locObj } : undefined,
        dineInInfo: orderType === 'dine_in' || orderType === 'table' || orderType === 'pickup' ? { arrivalTime: String(o.dineInInfo?.arrivalTime || o.arrivalTime || '') || undefined, tableNumber: orderType === 'table' ? (o.dineInInfo?.tableNumber || o.tableNumber || undefined) : undefined } : undefined,
        createdAt: o.createdAt ? new Date(o.createdAt) : undefined,
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : undefined,
      });
      await doc.save();
      importedOrders += 1;
    } catch (e) {
      console.warn('   order import warn:', o.orderId || o.orderNumber, e.message);
    }
  }
  console.log(`   → ${importedOrders} orders`);

  // 8) Carts (optional best-effort)
  if (cartsJson.length) {
    console.log('🛒 Importing carts (best-effort)...');
    for (const c of cartsJson) {
      try {
        const userId = c.user ? (idMap.user.get(String(c.user)) || undefined) : undefined;
        const items = (c.items || []).map((it) => ({
          product: idMap.product.get(String(it.product)) || undefined,
          productName: it.productName || 'Mahsulot',
          quantity: toNumberOrNull(it.quantity) || 1,
          price: toNumberOrNull(it.price) || 0,
          totalPrice: toNumberOrNull(it.totalPrice) || 0,
        }));
        const cart = new Cart({ user: userId, items, isActive: Boolean(c.isActive !== false), total: toNumberOrNull(c.total) || items.reduce((s, it) => s + (it.totalPrice || 0), 0) });
        await cart.save();
      } catch (e) {
        console.warn('   cart import warn:', e.message);
      }
    }
  }

  // 9) Reviews (optional)
  if (reviewsJson.length) {
    console.log('⭐ Importing reviews (best-effort)...');
    for (const r of reviewsJson) {
      try {
        const review = new Review({
          user: r.user ? (idMap.user.get(String(r.user)) || undefined) : undefined,
          product: r.product ? (idMap.product.get(String(r.product)) || undefined) : undefined,
          rating: toNumberOrNull(r.rating) || 5,
          comment: r.comment || '',
        });
        await review.save();
      } catch (e) {
        console.warn('   review import warn:', e.message);
      }
    }
  }

  // Summary
  console.log('✅ Import finished');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});


