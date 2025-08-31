const { User, Cart, Branch } = require('../../../../../models');
const DeliveryService = require('../../../../../services/deliveryService');
const BaseHandler = require('../../../../../utils/BaseHandler');

/**
 * Location Handlers Module
 * Joylashuv operatsiyalari moduli
 */

class LocationHandlers extends BaseHandler {
  /**
   * Joylashuvni qayta ishlash (delivery uchun)
   * @param {Object} ctx - Telegraf context
   * @param {number} latitude - latitude
   * @param {number} longitude - longitude
   */
  static async processLocation(ctx, latitude, longitude) {
    return BaseHandler.safeExecute(async () => {
      console.log('=== processLocation ===');
      console.log('Lat:', latitude, 'Lon:', longitude);

      try {
        // Find nearest branch and check delivery zones
        const result = await DeliveryService.resolveBranchForLocation({ latitude, longitude });
        
        ctx.session.orderData = ctx.session.orderData || {};
        ctx.session.orderData.location = { latitude, longitude };
        
        if (result?.branchId) {
          ctx.session.orderData.branch = result.branchId;
          console.log('✅ Branch found:', result.branchId);
        } else {
          console.log('⚠️ No specific branch found, using default');
        }
        
        // Generate Google Maps link from coordinates
        const googleMapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        ctx.session.orderData.address = result?.address || googleMapsLink;

        console.log('=== Location processed successfully ===');
        
        // Check if user has items in cart
        const telegramId = ctx.from.id;
        const user = await User.findOne({ telegramId });
        let cart = null;
        
        if (user) {
          cart = await Cart.findOne({ user: user._id, isActive: true });
        }

        // If cart has items, ask for address notes then proceed to payment
        if (cart && cart.items && cart.items.length > 0) {
          console.log('✅ Cart has items, asking for address notes');
          await ctx.reply('🎯 **Joylashuv qabul qilindi!**\n\n📝 Qo\'shimcha ma\'lumot kiriting (Nechanchi qavat, xonadon raqami va h.k.):', {
            parse_mode: 'Markdown',
            reply_markup: {
              remove_keyboard: true,
              inline_keyboard: [
                [{ text: '⏭️ O\'tkazib yuborish', callback_data: 'skip_address_notes' }],
                [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
              ]
            }
          });
          ctx.session.waitingFor = 'address_notes';
          return;
        }

        // If no items in cart, show product selection options
        await ctx.reply('🎯 **Joylashuv qabul qilindi!**\n\nEndi mahsulotlarni tanlang:', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Tezkor buyurtma', callback_data: 'quick_order' }],
              [{ text: '📋 Katalog', callback_data: 'show_catalog' }],
              [{ text: '🎉 Aksiyalar', callback_data: 'show_promotions' }],
              [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
            ]
          }
        });
        
      } catch (serviceError) {
        console.error('❌ DeliveryService error:', serviceError);
        
        // Fallback: Save location without service
        ctx.session.orderData = ctx.session.orderData || {};
        ctx.session.orderData.location = { latitude, longitude };
        // Generate Google Maps link from coordinates  
        const googleMapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        ctx.session.orderData.address = googleMapsLink;
        
        // Check if user has items in cart for fallback case too
        const telegramId = ctx.from.id;
        const user = await User.findOne({ telegramId });
        let cart = null;
        
        if (user) {
          cart = await Cart.findOne({ user: user._id, isActive: true });
        }

        // If cart has items, ask for address notes then proceed to payment
        if (cart && cart.items && cart.items.length > 0) {
          console.log('✅ Cart has items (fallback), asking for address notes');
          await ctx.reply('✅ **Joylashuv qabul qilindi!**\n\n📝 Qo\'shimcha ma\'lumot kiriting (Nechanchi qavat, xonadon raqami va h.k.):', {
            parse_mode: 'Markdown',
            reply_markup: {
              remove_keyboard: true,
              inline_keyboard: [
                [{ text: '⏭️ O\'tkazib yuborish', callback_data: 'skip_address_notes' }],
                [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
              ]
            }
          });
          ctx.session.waitingFor = 'address_notes';
          return;
        }

        // If no items, show product selection
        await ctx.reply('✅ **Joylashuv qabul qilindi!**\n\nEndi mahsulotlarni tanlang:', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Tezkor buyurtma', callback_data: 'quick_order' }],
              [{ text: '📋 Katalog', callback_data: 'show_catalog' }],
              [{ text: '🎉 Aksiyalar', callback_data: 'show_promotions' }],
              [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
            ]
          }
        });
      }
    }, ctx, '❌ Joylashuvni qayta ishlashda xatolik!');
  }

  /**
   * Eng yaqin filialni topish
   * @param {number} lat - latitude
   * @param {number} lon - longitude
   * @returns {Object} - filial va masofa
   */
  static async findNearestBranch(lat, lon) {
    try {
      const branches = await Branch.find({ isActive: true });
      
      let best = null;
      let bestDist = Infinity;
      
      for (const branch of branches) {
        const branchLat = branch.address?.coordinates?.latitude;
        const branchLon = branch.address?.coordinates?.longitude;
        
        if (branchLat && branchLon) {
          const dist = LocationHandlers.calculateDistance(lat, lon, branchLat, branchLon);
          if (dist < bestDist) {
            bestDist = dist;
            best = branch;
          }
        }
      }
      
      return { branch: best, distance: bestDist };
    } catch (error) {
      console.error('Find nearest branch error:', error);
      return null;
    }
  }

  /**
   * Masofa hisoblash (Haversine formula)
   * @param {number} lat1 - 1-koordinata latitude
   * @param {number} lon1 - 1-koordinata longitude
   * @param {number} lat2 - 2-koordinata latitude
   * @param {number} lon2 - 2-koordinata longitude
   * @returns {number} - masofa (km)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = LocationHandlers.deg2rad(lat2 - lat1);
    const dLon = LocationHandlers.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(LocationHandlers.deg2rad(lat1)) * Math.cos(LocationHandlers.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Darajani radianga aylantirish
   * @param {number} deg - daraja
   * @returns {number} - radian
   */
  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }
}

module.exports = LocationHandlers;