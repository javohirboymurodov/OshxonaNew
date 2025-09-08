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
  static async assignCourier(orderId) {
    try {
      // Bu yerda kuryer tizimi bo'lishi kerak
      // Hozircha sodda implementation
      const couriers = [
        { name: 'Alisher', phone: '+998901234567', telegramId: 123456789 },
        { name: 'Bobur', phone: '+998901234568', telegramId: 123456790 },
        { name: 'Dilshod', phone: '+998901234569', telegramId: 123456791 }
      ];
      
      // Tasodifiy kuryer tanlash (real loyihada algoritm bo'lishi kerak)
      const courier = couriers[Math.floor(Math.random() * couriers.length)];
      
      const order = await Order.findById(orderId);
      if (order) {
        order.deliveryInfo.courier = courier;
        await order.save();
        
        return courier;
      }
      
      return null;
    } catch (error) {
      console.error('Courier assignment error:', error);
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
        preparing: '👨‍🍳 Buyurtmangiz tayyorlanmoqda',
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