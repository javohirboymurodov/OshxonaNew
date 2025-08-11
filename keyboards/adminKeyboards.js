const { Markup } = require('telegraf');

const adminKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📦 Buyurtmalar', 'admin_orders'),
    Markup.button.callback('🍽️ Mahsulotlar', 'admin_products')
  ],
  [
    Markup.button.callback('📂 Kategoriyalar', 'admin_categories'),
    Markup.button.callback('👥 Foydalanuvchilar', 'admin_users')
  ],
  [
    Markup.button.callback('📊 Statistika', 'admin_stats'),
    Markup.button.callback('🎁 Promo kodlar', 'admin_promo')
  ],
  [
    Markup.button.callback('📢 Broadcast', 'admin_broadcast'),
    Markup.button.callback('⚙️ Sozlamalar', 'admin_settings')
  ],
  [
    Markup.button.callback('🔙 Asosiy menyu', 'back_to_main')
  ]
]);

const orderManagementKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🆕 Yangi buyurtmalar', 'orders_new'),
    Markup.button.callback('👨‍🍳 Tayyorlanayotgan', 'orders_preparing')
  ],
  [
    Markup.button.callback('✅ Tayyor', 'orders_ready'),
    Markup.button.callback('🚚 Yetkazilayotgan', 'orders_delivering')
  ],
  [
    Markup.button.callback('📋 Barcha buyurtmalar', 'orders_all'),
    Markup.button.callback('📊 Statistika', 'orders_stats')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

const productManagementKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('➕ Mahsulot qo\'shish', 'product_add'),
    Markup.button.callback('✏️ Mahsulot tahrirlash', 'product_edit')
  ],
  [
    Markup.button.callback('📂 Kategoriya tanlash', 'product_by_category'),
    Markup.button.callback('🗑️ Mahsulot o\'chirish', 'product_delete')
  ],
  [
    Markup.button.callback('📦 Barcha mahsulotlar', 'products_all'),
    Markup.button.callback('🔄 Holatni o\'zgartirish', 'product_toggle')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

// User management keyboard
const userManagementKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🔍 Qidirish', 'users_search'),
    Markup.button.callback('👥 Faol foydalanuvchilar', 'users_active')
  ],
  [
    Markup.button.callback('📊 Statistika', 'users_stats'),
    Markup.button.callback('📢 Broadcast', 'users_broadcast')
  ],
  [
    Markup.button.callback('🔒 Bloklangan', 'users_blocked'),
    Markup.button.callback('📅 Yangi foydalanuvchilar', 'users_new')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

// User details keyboard
function userDetailsKeyboard(user) {
  const isBlocked = user.isBlocked;
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📦 Buyurtmalari', `user_orders_${user._id}`),
      Markup.button.callback('📊 Statistika', `user_stats_${user._id}`)
    ],
    [
      Markup.button.callback(
        isBlocked ? '🔓 Blokdan chiqarish' : '🔒 Bloklash', 
        `toggle_block_${user._id}`
      ),
      Markup.button.callback('💬 Xabar yuborish', `message_user_${user._id}`)
    ],
    [
      Markup.button.callback('🔙 Orqaga', 'admin_users')
    ]
  ]);
}

// Order details keyboard  
function orderDetailsKeyboard(order) {
  const buttons = [];
  
  if (order.status === 'pending') {
    buttons.push([
      Markup.button.callback('✅ Tasdiqlash', `confirm_order_${order._id}`),
      Markup.button.callback('❌ Rad etish', `reject_order_${order._id}`)
    ]);
  }
  
  if (['confirmed', 'preparing'].includes(order.status)) {
    buttons.push([
      Markup.button.callback('👨‍🍳 Tayyorlash', `prepare_order_${order._id}`),
      Markup.button.callback('🎯 Tayyor', `ready_order_${order._id}`)
    ]);
  }
  
  if (order.status === 'ready' && order.orderType === 'delivery') {
    buttons.push([
      Markup.button.callback('🚚 Yetkazish', `deliver_order_${order._id}`)
    ]);
  }
  
  if (['ready', 'on_delivery'].includes(order.status)) {
    buttons.push([
      Markup.button.callback('✅ Bajarildi', `complete_order_${order._id}`)
    ]);
  }
  
  buttons.push([
    Markup.button.callback('🔄 Yangilash', `view_order_${order._id}`),
    Markup.button.callback('🔙 Orqaga', 'admin_orders')
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

const categoryManagementKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('➕ Yangi kategoriya', 'category_add'),
    Markup.button.callback('✏️ Kategoriya tahrirlash', 'category_edit')
  ],
  [
    Markup.button.callback('📋 Barcha kategoriyalar', 'categories_all'),
    Markup.button.callback('🔄 Holatni o\'zgartirish', 'category_toggle')
  ],
  [
    Markup.button.callback('📊 Statistika', 'categories_stats'),
    Markup.button.callback('🗑️ O\'chirish', 'category_delete')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

function editCategoryKeyboard(categoryId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Nomini o\'zgartirish', `change_category_name_${categoryId}`),
      Markup.button.callback('🎨 Emoji o\'zgartirish', `change_category_emoji_${categoryId}`)
    ],
    [
      Markup.button.callback('📊 Tartibini o\'zgartirish', `change_category_order_${categoryId}`),
      Markup.button.callback('👁️ Ko\'rinishini sozlash', `toggle_category_${categoryId}`)
    ],
    [
      Markup.button.callback('🗑️ O\'chirish', `delete_category_${categoryId}`),
      Markup.button.callback('🔙 Orqaga', 'admin_categories')
    ]
  ]);
}

const backToAdminKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🔙 Admin panel', 'admin_panel')]
]);

const statisticsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📅 Bugun', 'stats_today'),
    Markup.button.callback('📅 Hafta', 'stats_week')
  ],
  [
    Markup.button.callback('📅 Oy', 'stats_month'),
    Markup.button.callback('📅 Yil', 'stats_year')
  ],
  [
    Markup.button.callback('📋 PDF hisobot', 'generate_pdf'),
    Markup.button.callback('📊 Excel', 'generate_excel')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

// Broadcast management keyboard
const broadcastKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📢 Hammaga yuborish', 'broadcast_all'),
    Markup.button.callback('👥 Foydalanuvchilarga', 'broadcast_users')
  ],
  [
    Markup.button.callback('🛒 Faol mijozlarga', 'broadcast_active'),
    Markup.button.callback('📅 Yangi mijozlarga', 'broadcast_new')
  ],
  [
    Markup.button.callback('📋 Yuborilgan xabarlar', 'broadcast_history'),
    Markup.button.callback('📊 Statistika', 'broadcast_stats')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

// Settings keyboard
const settingsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🏪 Restoran ma\'lumotlari', 'settings_restaurant'),
    Markup.button.callback('⏰ Ish vaqti', 'settings_hours')
  ],
  [
    Markup.button.callback('🚚 Yetkazib berish', 'settings_delivery'),
    Markup.button.callback('💳 To\'lov usullari', 'settings_payment')
  ],
  [
    Markup.button.callback('📱 Bot sozlamalari', 'settings_bot'),
    Markup.button.callback('🔔 Bildirishnomalar', 'settings_notifications')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

// Promo codes keyboard
const promoKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('➕ Yangi promo kod', 'promo_add'),
    Markup.button.callback('✏️ Promo tahrirlash', 'promo_edit')
  ],
  [
    Markup.button.callback('📋 Barcha promolar', 'promo_all'),
    Markup.button.callback('📊 Promo statistika', 'promo_stats')
  ],
  [
    Markup.button.callback('🔄 Faollashtirish/O\'chirish', 'promo_toggle'),
    Markup.button.callback('🗑️ O\'chirish', 'promo_delete')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

// Quick action keyboards
const quickActionsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🆕 Yangi buyurtma', 'quick_new_order'),
    Markup.button.callback('📞 Qo\'ng\'iroq qilish', 'quick_call')
  ],
  [
    Markup.button.callback('📱 SMS yuborish', 'quick_sms'),
    Markup.button.callback('💬 Xabar yuborish', 'quick_message')
  ],
  [
    Markup.button.callback('🔙 Admin panel', 'admin_panel')
  ]
]);

// Export functions for product management
function productsByCategory(categoryId, products) {
  const keyboard = [];
  
  products.forEach(product => {
    keyboard.push([
      Markup.button.callback(
        `${product.isActive ? '✅' : '❌'} ${product.name} - ${product.price.toLocaleString()} so'm`,
        `admin_product_${product._id}`
      )
    ]);
  });
  
  keyboard.push([
    Markup.button.callback('➕ Mahsulot qo\'shish', `product_add_${categoryId}`),
    Markup.button.callback('🔙 Kategoriyalar', 'admin_categories')
  ]);
  
  return Markup.inlineKeyboard(keyboard);
}

function productActionsKeyboard(productId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Tahrirlash', `product_edit_${productId}`),
      Markup.button.callback('📸 Rasm o\'zgartirish', `product_image_${productId}`)
    ],
    [
      Markup.button.callback('💰 Narx o\'zgartirish', `product_price_${productId}`),
      Markup.button.callback('🔄 Faollashtirish/O\'chirish', `product_toggle_${productId}`)
    ],
    [
      Markup.button.callback('🗑️ O\'chirish', `product_delete_${productId}`),
      Markup.button.callback('🔙 Orqaga', 'admin_products')
    ]
  ]);
}

// Confirmation keyboards
function confirmDeleteKeyboard(type, id) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Ha, o\'chirish', `confirm_delete_${type}_${id}`),
      Markup.button.callback('❌ Yo\'q, bekor qilish', `cancel_delete_${type}_${id}`)
    ]
  ]);
}

module.exports = {
  // Main keyboards
  adminPanel: () => adminKeyboard,
  adminKeyboard,
  
  // Section keyboards
  orderManagement: () => orderManagementKeyboard,
  orderManagementKeyboard,
  productManagement: () => productManagementKeyboard,
  productManagementKeyboard,
  userManagement: () => userManagementKeyboard,
  categoryManagement: () => categoryManagementKeyboard,
  broadcast: () => broadcastKeyboard,
  settings: () => settingsKeyboard,
  promo: () => promoKeyboard,
  quickActions: () => quickActionsKeyboard,
  
  // Dynamic keyboards
  userDetails: userDetailsKeyboard,
  orderDetails: orderDetailsKeyboard,
  editCategory: editCategoryKeyboard,
  productsByCategory,
  productActions: productActionsKeyboard,
  confirmDelete: confirmDeleteKeyboard,
  
  // Utility keyboards
  backToAdmin: () => backToAdminKeyboard,
  backToAdminKeyboard,
  statisticsMenu: () => statisticsKeyboard,
  statisticsKeyboard,
  
  // Static keyboards
  broadcastKeyboard,
  settingsKeyboard,
  promoKeyboard,
  quickActionsKeyboard
};
