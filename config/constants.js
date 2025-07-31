// Dastur konstantalari
const CONSTANTS = {
  // Buyurtma holatlari
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    READY: 'ready',
    ON_DELIVERY: 'on_delivery',
    DELIVERED: 'delivered',
    PICKED_UP: 'picked_up',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },
  
  // Buyurtma turlari
  ORDER_TYPES: {
    DELIVERY: 'delivery',
    PICKUP: 'pickup',
    DINE_IN: 'dine_in'
  },
  
  // To'lov usullari
  PAYMENT_METHODS: {
    CASH: 'cash',
    CARD: 'card',
    CLICK: 'click',
    PAYME: 'payme',
    UZCARD: 'uzcard',
    HUMO: 'humo'
  },
  
  // To'lov holatlari
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },
  
  // Foydalanuvchi rollari
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    COURIER: 'courier',
    WAITER: 'waiter'
  },
  
  // Mahsulot holatlari
  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    OUT_OF_STOCK: 'out_of_stock',
    DISCONTINUED: 'discontinued'
  },
  
  // Limitlar
  LIMITS: {
    MAX_CART_ITEMS: 50,
    MAX_QUANTITY_PER_ITEM: 50,
    MAX_ORDER_AMOUNT: 10000000, // 10 million
    MIN_ORDER_AMOUNT: 5000, // 5000 so'm
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_ADDRESS_LENGTH: 200,
    MAX_PHONE_ADDRESSES: 10
  },
  
  // Vaqt konstantalari (millisekundlarda)
  TIME: {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000
  },
  
  // Yetkazib berish
  DELIVERY: {
    DEFAULT_RADIUS: 15, // km
    DEFAULT_FEE: 5000, // so'm
    FREE_DELIVERY_AMOUNT: 100000, // so'm
    MAX_DELIVERY_TIME: 120, // minut
    MIN_DELIVERY_TIME: 20 // minut
  },
  
  // Emoji konstantalari
  EMOJI: {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: '💡',
    LOADING: '⏳',
    CART: '🛒',
    FOOD: '🍽️',
    DELIVERY: '🚚',
    PAYMENT: '💳',
    PHONE: '📱',
    LOCATION: '📍',
    TIME: '🕐',
    MONEY: '💰',
    STAR: '⭐',
    NEW: '🆕',
    FIRE: '🔥',
    BACK: '🔙',
    HOME: '🏠',
    SEARCH: '🔍'
  },
  
  // Tillar
  LANGUAGES: {
    UZ: 'uz',
    RU: 'ru',
    EN: 'en'
  },
  
  // Xato kodlari
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    PAYMENT_ERROR: 'PAYMENT_ERROR'
  },
  
  // API endpointlar
  API_URLS: {
    CLICK_API: 'https://api.click.uz',
    PAYME_API: 'https://checkout.paycom.uz',
    YANDEX_MAPS: 'https://geocode-maps.yandex.ru',
    TELEGRAM_API: 'https://api.telegram.org'
  },
  
  // Fayl turlari
  FILE_TYPES: {
    IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    DOCUMENTS: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_DOCUMENT_SIZE: 50 * 1024 * 1024 // 50MB
  },
  
  // Cache vaqtlari (sekundlarda)
  CACHE_TTL: {
    CATEGORIES: 300, // 5 minut
    PRODUCTS: 180, // 3 minut
    USER_SESSION: 1800, // 30 minut
    DELIVERY_ZONES: 600, // 10 minut
    PROMO_CODES: 120 // 2 minut
  },
  
  // Mahsulot statistikasi
  STATS: {
    MIN_ORDERS_FOR_POPULAR: 10,
    MIN_RATING_FOR_FEATURED: 4.0,
    POPULAR_THRESHOLD_DAYS: 7
  }
};

module.exports = CONSTANTS;