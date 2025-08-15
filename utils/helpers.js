const moment = require('moment');

class Helpers {
  // Matnni formatlash
  static formatText(text, maxLength = 100) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }
  
  // Narxni formatlash
  static formatPrice(price, currency = 'so\'m') {
    if (typeof price !== 'number') {
      return '0 ' + currency;
    }
    
    return price.toLocaleString('uz-UZ') + ' ' + currency;
  }
  
  // Vaqtni formatlash
  static formatDate(date, format = 'DD.MM.YYYY HH:mm') {
    if (!date) return '';
    
    moment.locale('uz');
    return moment(date).format(format);
  }
  
  // Nisbiy vaqt (masalan: "2 soat oldin")
  static timeAgo(date) {
    if (!date) return '';
    
    moment.locale('uz');
    return moment(date).fromNow();
  }
  
  // Telefon raqamini formatlash
  static formatPhone(phone) {
    if (!phone) return '';
    
    // +998901234567 -> +998 90 123 45 67
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('998') && cleaned.length === 12) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
    }
    
    return phone;
  }
  
  // Telegram username linki
  static getTelegramLink(username) {
    if (!username) return null;
    
    return `https://t.me/${username.replace('@', '')}`;
  }
  
  // Tasodifiy ID yaratish
  static generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
  
  // Email validatsiyasi
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  // Telefon validatsiyasi
  static validatePhone(phone) {
    const re = /^\+?998[0-9]{9}$/;
    return re.test(phone.replace(/\s/g, ''));
  }
  
  // Matnni qisqartirish
  static truncate(text, length = 50, suffix = '...') {
    if (!text || text.length <= length) {
      return text || '';
    }
    
    return text.substring(0, length) + suffix;
  }
  
  // Arrayni sahifalash
  static paginate(array, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(array.length / limit);
    const items = array.slice(offset, offset + limit);
    
    return {
      items,
      totalItems: array.length,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }
  
  // Deep clone obyekt
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  // Obyektlarni birlashtirish
  static mergeObjects(...objects) {
    return Object.assign({}, ...objects);
  }
  
  // Tasodifiy element tanlash
  static randomChoice(array) {
    if (!Array.isArray(array) || array.length === 0) {
      return null;
    }
    
    return array[Math.floor(Math.random() * array.length)];
  }

  // Pagination helpers (backend)
  static getPaginationParams(query) {
    const page = Math.max(parseInt(query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  static buildPagination(total, page, limit) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  // Buyurtma status textlari
  static getOrderStatusText(status, lang = 'uz') {
    const texts = {
      uz: {
        pending: '⏳ Kutilmoqda',
        confirmed: '✅ Tasdiqlandi',
        preparing: '👨‍🍳 Tayyorlanmoqda',
        ready: '🎯 Tayyor',
        on_delivery: '🚚 Yetkazilmoqda',
        delivered: '✅ Yetkazildi',
        picked_up: '🏃 Olib ketildi',
        completed: '🎉 Yakunlandi',
        cancelled: '❌ Bekor qilindi',
        refunded: '💸 Qaytarildi'
      },
      ru: {
        pending: '⏳ Ожидает',
        confirmed: '✅ Подтвержден',
        preparing: '👨‍🍳 Готовится',
        ready: '🎯 Готов',
        on_delivery: '🚚 Доставляется',
        delivered: '✅ Доставлен',
        picked_up: '🏃 Забран',
        completed: '🎉 Завершен',
        cancelled: '❌ Отменен',
        refunded: '💸 Возвращен'
      }
    };
    
    return texts[lang]?.[status] || status;
  }
  
  // To'lov usuli nomlari
  static getPaymentMethodText(method, lang = 'uz') {
    const texts = {
      uz: {
        cash: '💰 Naqd pul',
        card: '💳 Plastik karta',
        click: '💳 Click',
        payme: '💳 Payme',
        uzcard: '💳 UzCard',
        humo: '💳 Humo'
      },
      ru: {
        cash: '💰 Наличные',
        card: '💳 Карта',
        click: '💳 Click',
        payme: '💳 Payme',
        uzcard: '💳 UzCard',
        humo: '💳 Humo'
      }
    };
    
    return texts[lang]?.[method] || method;
  }
  
  // Buyurtma turi nomlari
  static getOrderTypeText(type, lang = 'uz') {
    const texts = {
      uz: {
        delivery: '🚚 Yetkazib berish',
        pickup: '🏃 Olib ketish',
        // Dine-in: Avvaldan buyurtma (predzakaz)
        dine_in: '🗓️ Avvaldan buyurtma',
        table: '🍽️ Stoldan (QR)'
      },
      ru: {
        delivery: '🚚 Доставка',
        pickup: '🏃 Самовывоз',
        dine_in: '🗓️ Предзаказ',
        table: '🍽️ Со стола (QR)'
      }
    };
    
    return texts[lang]?.[type] || type;
  }
  
  // Emoji yaratish
  static getRandomEmoji(category = 'food') {
    const emojis = {
      food: ['🍕', '🍔', '🌮', '🍣', '🍜', '🍝', '🥘', '🍛', '🍲', '🥗'],
      drinks: ['☕', '🥤', '🧃', '🍵', '🍺', '🍷', '🥛', '🧋', '🍹', '🍸'],
      desserts: ['🍰', '🎂', '🧁', '🍪', '🍩', '🍨', '🍦', '🍭', '🍫', '🍯'],
      success: ['✅', '🎉', '👍', '💯', '🔥', '⭐', '🏆', '🎊', '🥳', '👏'],
      warning: ['⚠️', '⏰', '🚨', '📢', '🔔', '💡', '🔍', '❗', '‼️', '🚫']
    };
    
    return this.randomChoice(emojis[category] || emojis.food);
  }
  
  // Rang kodlari (Telegram HTML)
  static colors = {
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF',
    yellow: '#FFFF00',
    orange: '#FFA500',
    purple: '#800080',
    pink: '#FFC0CB',
    gray: '#808080'
  };
  
  // HTML matnni tozalash
  static stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
  
  // URL validatsiyasi
  static validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  // Base64 encode/decode
  static base64Encode(text) {
    return Buffer.from(text, 'utf8').toString('base64');
  }
  
  static base64Decode(base64) {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
}

module.exports = Helpers;