const { DeliveryZone, Order, Branch } = require('../models');
const geoService = require('./geoService');

class DeliveryService {
  // Yetkazib berish zonasini aniqlash
  static async findDeliveryZone(latitude, longitude) {
    try {
      const zones = await DeliveryZone.find({ isActive: true })
        .sort({ priority: -1 });
      
      for (const zone of zones) {
        // Model method names: isPointInZone(), isWorkingNow()
        const isInside = typeof zone.isPointInZone === 'function'
          ? zone.isPointInZone(latitude, longitude)
          : false;
        const isWorking = typeof zone.isWorkingNow === 'function'
          ? zone.isWorkingNow()
          : true;
        if (isInside && isWorking) {
          return zone;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Delivery zone find error:', error);
      return null;
    }
  }
  
  // Yetkazib berish vaqtini hisoblash
  // restaurantLocation: { lat: number, lon: number } ixtiyoriy.
  static async calculateDeliveryTime(userLocation, orderItems = [], restaurantLocation) {
    try {
      const origin = {
        lat: restaurantLocation?.lat ?? parseFloat(process.env.DEFAULT_RESTAURANT_LAT),
        lon: restaurantLocation?.lon ?? parseFloat(process.env.DEFAULT_RESTAURANT_LON)
      };
      
      // Masofani hisoblash
      const distance = geoService.calculateDistance(
        origin.lat,
        origin.lon,
        userLocation.latitude,
        userLocation.longitude
      );
      
      // Tayyorlash vaqti (eng uzoq mahsulot asosida)
      const preparationTime = orderItems.reduce((maxTime, item) => {
        return Math.max(maxTime, item.product?.preparationTime || 15);
      }, 15);
      
      // Yetkazib berish vaqti (5 km/soat tezlik)
      const deliveryTime = Math.ceil(distance / 5 * 60); // minutes
      
      // Trafik koeffitsienti (soat asosida)
      const hour = new Date().getHours();
      let trafficMultiplier = 1;
      
      if ((hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20)) {
        trafficMultiplier = 1.3; // Rush hours
      }
      
      const totalTime = Math.ceil((preparationTime + deliveryTime) * trafficMultiplier);
      
      return {
        preparationTime,
        deliveryTime: Math.ceil(deliveryTime * trafficMultiplier),
        totalTime,
        distance: Math.round(distance * 100) / 100
      };
      
    } catch (error) {
      console.error('Delivery time calculation error:', error);
      return {
        preparationTime: 20,
        deliveryTime: 30,
        totalTime: 50,
        distance: 0
      };
    }
  }
  
  // Yetkazib berish narxini hisoblash
  static async calculateDeliveryFee(userLocation, orderAmount = 0) {
    try {
      const zone = await this.findDeliveryZone(
        userLocation.latitude,
        userLocation.longitude
      );
      
      if (!zone) {
        return {
          fee: 0,
          isFreeDelivery: false,
          message: 'Yetkazib berish zonasi topilmadi'
        };
      }
      
      // Bepul yetkazib berish tekshiruvi
      if (orderAmount >= zone.freeDeliveryAmount) {
        return {
          fee: 0,
          isFreeDelivery: true,
          message: `${zone.freeDeliveryAmount.toLocaleString()} so'm dan yuqori buyurtmalar uchun bepul yetkazib berish`
        };
      }
      
      return {
        fee: zone.deliveryFee,
        isFreeDelivery: false,
        message: `Yetkazib berish: ${zone.deliveryFee.toLocaleString()} so'm`
      };
      
    } catch (error) {
      console.error('Delivery fee calculation error:', error);
      return {
        fee: 5000,
        isFreeDelivery: false,
        message: 'Standart yetkazib berish narxi'
      };
    }
  }

  // Zona topilsa, zone.branch asosida filialni qaytaradi; bo'lmasa eng yaqin filial
  static async resolveBranchForLocation(userLocation) {
    // 1) Try zone first
    const zone = await this.findDeliveryZone(userLocation.latitude, userLocation.longitude);
    if (zone && zone.branch) {
      return { branchId: String(zone.branch), source: 'zone', zone };
    }
    // 2) Fallback: nearest branch
    const branches = await Branch.find({ isActive: true });
    let best = null;
    let bestDist = Infinity;
    
    // Agar hech qanday filial topilmasa, mock filial qo'shamiz
    if (branches.length === 0) {
      console.log('⚠️ No branches found, using mock branch');
      return { 
        branchId: 'mock_branch_1', 
        source: 'mock', 
        distanceKm: 0,
        address: 'Mock Branch Address'
      };
    }
    
    for (const b of branches) {
      const bl = b.address?.coordinates?.latitude;
      const bo = b.address?.coordinates?.longitude;
      if (typeof bl === 'number' && typeof bo === 'number') {
        const d = geoService.calculateDistance(bl, bo, userLocation.latitude, userLocation.longitude);
        if (d < bestDist) {
          bestDist = d;
          best = b;
        }
      } else {
        // Agar coordinates yo'q bo'lsa, default koordinatalar ishlatamiz
        console.log(`⚠️ Branch ${b.name} has no coordinates, using default`);
        const defaultLat = 41.2995; // Toshkent koordinatalari
        const defaultLon = 69.2401;
        const d = geoService.calculateDistance(defaultLat, defaultLon, userLocation.latitude, userLocation.longitude);
        if (d < bestDist) {
          bestDist = d;
          best = b;
        }
      }
    }
    
    console.log('🔍 Branch resolution result:', {
      totalBranches: branches.length,
      bestBranch: best ? { id: best._id, name: best.name, distance: bestDist } : null,
      userLocation
    });
    return best ? { branchId: String(best._id), source: 'radius', distanceKm: bestDist } : { branchId: null, source: 'none' };
  }
  
  // Kuryer tayinlash
  static async assignCourier(orderId, branchId = null) {
    try {
      console.log('🚚 assignCourier called for order:', orderId, 'branch:', branchId);
      
      const { User, Order } = require('../models');
      
      // Buyurtmani topamiz
      const order = await Order.findById(orderId).populate('branch');
      if (!order) {
        console.log('❌ Order not found:', orderId);
        return null;
      }
      
      // Filial belgilash
      const targetBranch = branchId || order.branch?._id || order.branch;
      if (!targetBranch) {
        console.log('❌ No branch specified for courier assignment');
        return null;
      }
      
      // Online va available kuryerlarni topamiz
      const availableCouriers = await User.find({
        role: 'courier',
        branch: targetBranch,
        'courierInfo.isOnline': true,
        'courierInfo.isAvailable': true
      }).select('_id firstName lastName phone telegramId courierInfo');
      
      console.log('📋 Available couriers found:', availableCouriers.length);
      console.log('📋 Couriers details:', availableCouriers.map(c => ({
        id: c._id,
        name: c.firstName,
        telegramId: c.telegramId,
        branch: c.branch,
        isOnline: c.courierInfo?.isOnline,
        isAvailable: c.courierInfo?.isAvailable
      })));
      
      if (availableCouriers.length === 0) {
        console.log('❌ No available couriers for branch:', targetBranch);
        return null;
      }
      
      // Eng kam yukga ega kuryerni tanlaymiz (oddiy algoritm)
      let bestCourier = availableCouriers[0];
      let minOrders = Number.MAX_SAFE_INTEGER;
      
      for (const courier of availableCouriers) {
        const activeOrders = await Order.countDocuments({
          'deliveryInfo.courier': courier._id,
          status: { $in: ['assigned', 'on_delivery'] }
        });
        
        if (activeOrders < minOrders) {
          minOrders = activeOrders;
          bestCourier = courier;
        }
      }
      
      console.log('🎯 Best courier selected:', bestCourier.firstName, 'with', minOrders, 'active orders');
      
      // Buyurtmaga kuryerni tayinlaymiz
      order.deliveryInfo = order.deliveryInfo || {};
      order.deliveryInfo.courier = bestCourier._id;
      order.status = 'assigned';
      
      // Status history
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'assigned',
        timestamp: new Date(),
        note: `Kuryer tayinlandi: ${bestCourier.firstName} ${bestCourier.lastName}`
      });
      
      await order.save();
      
      // Kuryerga telegram orqali xabar yuboramiz
      try {
        const bot = global.botInstance;
        console.log('🔍 Bot instance status:', {
          hasBotInstance: !!bot,
          courierTelegramId: bestCourier.telegramId,
          courierName: bestCourier.firstName
        });
        
        if (bot && bestCourier.telegramId) {
          const message = `🚚 **Yangi buyurtma tayinlandi!**\n\n` +
            `📋 **Buyurtma №:** ${order.orderId}\n` +
            `💰 **Jami:** ${order.total.toLocaleString()} so'm\n` +
            `📍 **Manzil:** ${order.deliveryInfo?.address || 'Kiritilmagan'}\n` +
            `📞 **Mijoz:** ${order.customerInfo?.phone || 'N/A'}\n\n` +
            `Buyurtmani qabul qilish uchun "Yo'ldaman" tugmasini bosing.`;
          
          await bot.telegram.sendMessage(bestCourier.telegramId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚗 Yo\'ldaman', callback_data: `courier_on_way_${orderId}` }],
                [{ text: '❌ Rad etish', callback_data: `courier_reject_${orderId}` }]
              ]
            }
          });
          
          console.log('✅ Telegram notification sent to courier:', bestCourier.telegramId);
        }
      } catch (notifyError) {
        console.error('Courier telegram notification error:', notifyError);
      }
      
      return {
        _id: bestCourier._id,
        firstName: bestCourier.firstName,
        lastName: bestCourier.lastName,
        phone: bestCourier.phone,
        telegramId: bestCourier.telegramId
      };
      
    } catch (error) {
      console.error('❌ Courier assignment error:', error);
      return null;
    }
  }
  
  // Buyurtma holatini yangilash
  static async updateOrderStatus(orderId, status, note = '') {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Buyurtma topilmadi');
      }
      
      await order.updateStatus(status, note, 'delivery_service');
      
      // Mijozga xabar yuborish
      await this.notifyCustomer(order, status);
      
      return order;
    } catch (error) {
      console.error('Order status update error:', error);
      throw error;
    }
  }
  
  // Mijozga xabar yuborish
  static async notifyCustomer(order, status) {
    try {
      const statusMessages = {
        confirmed: '✅ Buyurtmangiz tasdiqlandi va tayyorlanishni boshladi',
        ready: '🎯 Buyurtmangiz tayyor! Kuryer tez orada jo\'naydi',
        on_delivery: '🚚 Buyurtmangiz yetkazib berilmoqda',
        delivered: '✅ Buyurtmangiz muvaffaqiyatli yetkazib berildi!'
      };
      
      const message = statusMessages[status];
      if (message && order.user) {
        // Bot orqali xabar yuborish (keyingi qismda implement qilamiz)
        console.log(`Notify user ${order.user}: ${message}`);
      }
    } catch (error) {
      console.error('Customer notification error:', error);
    }
  }
}

module.exports = DeliveryService;