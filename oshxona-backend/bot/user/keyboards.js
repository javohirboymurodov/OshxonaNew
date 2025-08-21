const { Markup } = require('telegraf');

const mainMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📝 Buyurtma berish', 'start_order')],
  [Markup.button.callback('🏪 Filiallar', 'show_branches')],
  [Markup.button.callback('📱 Bog\'lanish', 'contact'), Markup.button.callback('ℹ️ Ma\'lumot', 'about')],
  [Markup.button.callback('🛒 Savat', 'show_cart'), Markup.button.callback('👤 Mening profilim', 'my_profile')],
  [Markup.button.callback('📋 Mening buyurtmalarim', 'my_orders')]
]);

function categoriesKeyboard(categories) {
  // console.log('Kategoriyalar:', categories);
  const keyboard = [];
  
  // Kategoriyalarni 2 tadan qatorga joylashtirish
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    
    row.push(Markup.button.callback(
      `${categories[i].emoji || '📂'} ${categories[i].name}`,
      `category_${categories[i].id}`
    ));
    
    if (categories[i + 1]) {
      row.push(Markup.button.callback(
        `${categories[i + 1].emoji || '📂'} ${categories[i + 1].name}`,
        `category_${categories[i + 1].id}`
      ));
    }
    
    keyboard.push(row);
  }
  
  // Orqaga tugmasi
  keyboard.push([
    Markup.button.callback('🔙 Asosiy menyu', 'back_to_main')
  ]);
  
  return Markup.inlineKeyboard(keyboard);
}

// Inline prompt to require phone number
function askPhoneInlineKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📱 Telefon raqamni ulashish', 'req_phone')]
  ]);
}

// Reply keyboard that requests contact share
function requestPhoneReplyKeyboard() {
  return {
    reply_markup: {
      keyboard: [[{ text: '📞 Telefonni ulashish', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
}

function branchesKeyboard(branches = [], page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageBranches = branches.slice(start, end);

  const rows = [];
  for (let i = 0; i < pageBranches.length; i += 2) {
    const left = pageBranches[i];
    const right = pageBranches[i + 1];
    const row = [];
    if (left) row.push(Markup.button.callback(left.name || left.title || 'Filial', `branch_${left._id}`));
    if (right) row.push(Markup.button.callback(right.name || right.title || 'Filial', `branch_${right._id}`));
    rows.push(row);
  }

  const totalPages = Math.ceil((branches.length || 0) / pageSize) || 1;
  const nav = [];
  if (page > 1) nav.push(Markup.button.callback('⬅️', `branches_page_${page - 1}`));
  nav.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
  if (page < totalPages) nav.push(Markup.button.callback('➡️', `branches_page_${page + 1}`));
  if (totalPages > 1) rows.push(nav);

  // Top actions
  rows.unshift([
    Markup.button.callback('🔙 Asosiy menu', 'back_to_main'),
    Markup.button.callback('🏠 Eng yaqin filial', 'nearest_branch')
  ]);

  return Markup.inlineKeyboard(rows);
}

function productKeyboard(product, categoryId) {
  const keyboard = [
    [
      { text: '➕ 1 ta qo\'shish', callback_data: `add_cart_${product._id}_1` },
      { text: '🛒 Savatga', callback_data: `add_to_cart_${product._id}` }
    ],
    [
      { text: '🔙 Orqaga', callback_data: `category_${categoryId}` }
    ]
  ];
  return Markup.inlineKeyboard(keyboard);
}

const orderTypeKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🚚 Yetkazib berish', 'order_type_delivery'),
    Markup.button.callback('🏃 Olib ketish', 'order_type_pickup')
  ],
  [
    Markup.button.callback('🗓️ Avvaldan buyurtma', 'order_type_dine_in')
  ],
  [
    Markup.button.callback('🔙 Orqaga', 'show_cart')
  ]
]);

const paymentMethodKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('💰 Naqd pul', 'payment_cash'),
    Markup.button.callback('💳 Plastik karta', 'payment_card')
  ],
  [
    Markup.button.callback('📱 Click', 'payment_click'),
    Markup.button.callback('📱 Payme', 'payment_payme')
  ],
  [
    Markup.button.callback('🔙 Orqaga', 'order_step_back')
  ]
]);

const backToMainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🔙 Asosiy menyu', 'back_to_main')]
]);

// Quantity selection keyboard
function quantityKeyboard(productId, quantity = 1) {
  return Markup.inlineKeyboard([
    [
      // pastga bosilganda 0 dan ham past (−1) jo'natamiz — handler bu holatda kategoriyalarga qaytaradi
      Markup.button.callback('➖', `change_qty_${productId}_${quantity - 1}`),
      Markup.button.callback(`${quantity}`, 'noop'),
      Markup.button.callback('➕', `change_qty_${productId}_${quantity + 1}`)
    ],
    [
      Markup.button.callback('🛒 Savatga', `add_cart_${productId}_${quantity}`)
    ],
    [
      Markup.button.callback('🔙 Orqaga', `product_${productId}`)
    ]
  ]);
}

// Order confirmation keyboard
const orderConfirmKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('✅ Tasdiqlash', 'confirm_order'),
    Markup.button.callback('✏️ Tahrirlash', 'edit_order')
  ],
  [
    Markup.button.callback('🔙 Savatga qaytish', 'show_cart')
  ]
]);

// Contact keyboard
const contactKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📞 Telefon', 'contact_phone'),
    Markup.button.callback('📍 Manzil', 'contact_address')
  ],
  [
    Markup.button.callback('📱 Telegram', 'contact_telegram'),
    Markup.button.callback('🌐 Website', 'contact_website')
  ],
  [
    Markup.button.callback('🔙 Asosiy menyu', 'back_to_main')
  ]
]);

function cartKeyboard(cart) {
  const keyboard = [];
  cart.items.forEach(item => {
    // Always use string id for callback_data
    const productId = typeof item.product === 'object' && item.product && item.product._id ? item.product._id.toString() : String(item.product);
    const nameText = `${item.quantity} x ${item.productName.length > 20 ? item.productName.substring(0, 17) + '...' : item.productName}`;
    keyboard.push([
      Markup.button.callback('➖', `cart_qty_${productId}_${item.quantity - 1}`),
      Markup.button.callback(nameText, 'noop'),
      Markup.button.callback('➕', `cart_qty_${productId}_${item.quantity + 1}`)
    ]);
  });
  keyboard.push([
    Markup.button.callback('📝 Buyurtma berish', 'checkout'),
    Markup.button.callback('🗑️ Savatni tozalash', 'clear_cart')
  ]);
  keyboard.push([
    Markup.button.callback('🍽️ Davom qilish', 'show_categories'),
    Markup.button.callback('🔙 Asosiy menyu', 'back_to_main')
  ]);
  return Markup.inlineKeyboard(keyboard);
}

function arrivalTimeKeyboard() {
  // Minimal variant as required: 30m, 1h, 1.5h, 2h
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('30 daqiqa', 'arrival_time_30'),
      Markup.button.callback('1 soat', 'arrival_time_1_hour')
    ],
    [
      Markup.button.callback('1 soat 30 daqiqa', 'arrival_time_1_hour_30'),
      Markup.button.callback('2 soat', 'arrival_time_2_hours')
    ],
    [
      Markup.button.callback('🔙 Orqaga', 'order_step_back')
    ]
  ]);
}

function myOrdersKeyboard(orders, page = 1, pageSize = 8) {
  const Helpers = require('../../utils/helpers');
  const totalPages = Math.ceil(orders.length / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageOrders = orders.slice(start, end);

  console.log('orders.length:', orders.length, 'page:', page, 'start:', start, 'end:', end, 'pageOrders.length:', pageOrders.length);

  const keyboard = pageOrders.map(order => [
    Markup.button.callback(
      `${Helpers.formatDate(order.createdAt, 'DD.MM.YYYY')} | ${Helpers.getOrderStatusText(order.status, 'uz')}`,
      `order_detail_${order._id}`
    )
  ]);

  // Pagination
  const pagination = [];
  if (page > 1) pagination.push(Markup.button.callback('⬅️', `orders_page_${page - 1}`));
  pagination.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
  if (page < totalPages) pagination.push(Markup.button.callback('➡️', `orders_page_${page + 1}`));
  if (pagination.length > 1) keyboard.push(pagination);

  // Add 'Orqaga' button as the last row
  keyboard.push([Markup.button.callback('🔙 Orqaga', 'back_to_main')]);

  return Markup.inlineKeyboard(keyboard);
}

function backToMyOrdersKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [ { text: '🔙 Orqaga', callback_data: 'back_to_my_orders' } ]
      ]
    }
  };
}

// 🔧 FIX: Baholash keyboardi
function ratingKeyboard(orderId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⭐', callback_data: `rate_${orderId}_1` },
          { text: '⭐⭐', callback_data: `rate_${orderId}_2` },
          { text: '⭐⭐⭐', callback_data: `rate_${orderId}_3` },
          { text: '⭐⭐⭐⭐', callback_data: `rate_${orderId}_4` },
          { text: '⭐⭐⭐⭐⭐', callback_data: `rate_${orderId}_5` }
        ],
        [
          { text: '🔙 Orqaga', callback_data: 'back_to_main' }
        ]
      ]
    }
  };
}

module.exports = {
  mainMenuKeyboard,
  categoriesKeyboard,
  branchesKeyboard,
  productKeyboard,
  orderTypeKeyboard,
  paymentMethodKeyboard,
  backToMainKeyboard,
  quantityKeyboard,
  orderConfirmKeyboard,
  contactKeyboard,
  cartKeyboard,
  arrivalTimeKeyboard,
  myOrdersKeyboard,
  backToMyOrdersKeyboard,
  askPhoneInlineKeyboard,
  requestPhoneReplyKeyboard,
  ratingKeyboard
};